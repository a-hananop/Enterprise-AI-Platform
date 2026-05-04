from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import User, DataSource, NLPTask, TaskStatus
from app.utils.auth import get_current_user
from app.services.nlp_service import NLPService

router = APIRouter(prefix="/api/nlp", tags=["NLP"])
nlp_service = NLPService()


class TextAnalysisRequest(BaseModel):
    text: str
    tasks: List[str] = ["sentiment"]   # sentiment|ner|keywords|summary|classify


class DatasetNLPRequest(BaseModel):
    data_source_id: str
    text_column: str
    tasks: List[str] = ["sentiment"]
    output_column_prefix: str = "ai_"


class ClassifyRequest(BaseModel):
    text: str
    labels: List[str]                   # Zero-shot classification labels
    multi_label: bool = False


class SimilarityRequest(BaseModel):
    text1: str
    text2: str


# ── Single Text Analysis ──────────────────────────────────────
@router.post("/analyze")
async def analyze_text(
    req: TextAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyze text with multiple NLP tasks"""
    results = {}

    if "sentiment" in req.tasks:
        results["sentiment"] = await nlp_service.sentiment(req.text)

    if "ner" in req.tasks:
        results["entities"] = await nlp_service.ner(req.text)

    if "keywords" in req.tasks:
        results["keywords"] = await nlp_service.extract_keywords(req.text)

    if "summary" in req.tasks:
        results["summary"] = await nlp_service.summarize(req.text)

    if "classify" in req.tasks:
        results["classification"] = await nlp_service.classify_topic(req.text)

    return {"text": req.text[:200] + "..." if len(req.text) > 200 else req.text, "results": results}


@router.post("/sentiment")
async def analyze_sentiment(texts: List[str], current_user: User = Depends(get_current_user)):
    """Batch sentiment analysis"""
    results = []
    for text in texts[:100]:  # Limit batch size
        results.append(await nlp_service.sentiment(text))
    return {"results": results}


@router.post("/ner")
async def extract_entities(text: str, current_user: User = Depends(get_current_user)):
    """Named Entity Recognition"""
    return await nlp_service.ner(text)


@router.post("/summarize")
async def summarize_text(
    text: str,
    max_length: int = 150,
    min_length: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Summarize long text"""
    return await nlp_service.summarize(text, max_length=max_length, min_length=min_length)


@router.post("/classify")
async def zero_shot_classify(req: ClassifyRequest, current_user: User = Depends(get_current_user)):
    """Zero-shot text classification"""
    return await nlp_service.zero_shot_classify(req.text, req.labels, req.multi_label)


@router.post("/keywords")
async def extract_keywords(text: str, top_k: int = 10, current_user: User = Depends(get_current_user)):
    """Extract keywords and key phrases"""
    return await nlp_service.extract_keywords(text, top_k=top_k)


@router.post("/similarity")
async def text_similarity(req: SimilarityRequest, current_user: User = Depends(get_current_user)):
    """Compute semantic similarity between two texts"""
    score = await nlp_service.semantic_similarity(req.text1, req.text2)
    return {"similarity_score": score, "interpretation": _interpret_similarity(score)}


@router.post("/email-analysis")
async def analyze_email(
    subject: str,
    body: str,
    current_user: User = Depends(get_current_user)
):
    """Analyze email intent, sentiment, and priority"""
    full_text = f"Subject: {subject}\n\n{body}"
    sentiment = await nlp_service.sentiment(full_text)
    intent = await nlp_service.zero_shot_classify(
        full_text,
        labels=["complaint", "inquiry", "order", "support", "feedback", "urgent", "spam"],
        multi_label=True
    )
    entities = await nlp_service.ner(full_text)
    keywords = await nlp_service.extract_keywords(full_text, top_k=5)
    summary = await nlp_service.summarize(body, max_length=100, min_length=30)

    priority = "high" if intent.get("scores", {}).get("urgent", 0) > 0.7 else \
               "medium" if sentiment.get("label") == "negative" else "normal"

    return {
        "sentiment": sentiment,
        "intent": intent,
        "entities": entities,
        "keywords": keywords,
        "summary": summary,
        "priority": priority,
    }


# ── Dataset NLP ───────────────────────────────────────────────
@router.post("/dataset-analyze")
async def analyze_dataset_column(
    req: DatasetNLPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run NLP on a dataset column"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    task = NLPTask(
        task_type=",".join(req.tasks),
        data_source_id=req.data_source_id,
        target_column=req.text_column,
        status=TaskStatus.pending,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    background_tasks.add_task(
        _run_dataset_nlp, task.id, ds.file_path, str(ds.source_type),
        req.text_column, req.tasks, db
    )
    return {"task_id": task.id, "status": "pending"}


@router.get("/tasks/{task_id}")
def get_nlp_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(NLPTask).filter(NLPTask.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return {
        "id": task.id,
        "task_type": task.task_type,
        "status": task.status,
        "result": task.result,
        "error_message": task.error_message,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


def _interpret_similarity(score: float) -> str:
    if score > 0.9: return "Nearly identical"
    if score > 0.7: return "Very similar"
    if score > 0.5: return "Moderately similar"
    if score > 0.3: return "Somewhat similar"
    return "Very different"


async def _run_dataset_nlp(task_id, file_path, source_type, text_col, tasks, db):
    task = db.query(NLPTask).filter(NLPTask.id == task_id).first()
    if not task:
        return
    try:
        task.status = TaskStatus.running
        db.commit()
        result = await nlp_service.analyze_dataset_column(file_path, source_type, text_col, tasks)
        task.status = TaskStatus.completed
        task.result = result
        db.commit()
    except Exception as e:
        task.status = TaskStatus.failed
        task.error_message = str(e)
        db.commit()
