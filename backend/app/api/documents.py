from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import User, DataSource
from app.utils.auth import get_current_user
from app.services.rag_service import RAGService
from app.services.nlp_service import NLPService
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/documents", tags=["Document Intelligence"])
rag_service = RAGService()
nlp_service = NLPService()
llm_service = LLMService()


class SummarizeRequest(BaseModel):
    source_id: str
    max_length: int = 500
    focus: Optional[str] = None     # specific topic to focus on


class CompareRequest(BaseModel):
    source_ids: List[str]
    comparison_aspect: Optional[str] = None


class ExtractRequest(BaseModel):
    source_id: str
    extract_type: str               # key_info|dates|people|clauses|action_items


class QARequest(BaseModel):
    source_id: str
    question: str


@router.post("/summarize")
async def summarize_document(
    req: SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Summarize a document using AI"""
    ds = db.query(DataSource).filter(DataSource.id == req.source_id).first()
    if not ds:
        raise HTTPException(404, "Document not found")

    # Retrieve document content via RAG
    retrieval = await rag_service.retrieve(
        req.focus or "summary overview main points",
        doc_ids=[req.source_id],
        top_k=10,
    )

    if not retrieval["chunks"]:
        raise HTTPException(400, "Document not indexed. Please re-upload with indexing enabled.")

    context = "\n\n".join(c["text"] for c in retrieval["chunks"])

    focus_str = f"\nFocus particularly on: {req.focus}" if req.focus else ""

    prompt = f"""You are a document analysis expert. Summarize the following document content.
{focus_str}

Document: {ds.name}
Content:
{context[:3000]}

Provide:
1. **Executive Summary** (2-3 sentences)
2. **Key Points** (5-7 bullet points)
3. **Important Details** (specific facts, numbers, dates)
4. **Conclusion/Takeaways**"""

    response = await llm_service.complete(prompt, max_tokens=800)
    return {
        "document": ds.name,
        "summary": response["content"],
        "chunks_analyzed": len(retrieval["chunks"]),
    }


@router.post("/qa")
async def document_qa(
    req: QARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Answer questions from a specific document"""
    ds = db.query(DataSource).filter(DataSource.id == req.source_id).first()
    if not ds:
        raise HTTPException(404, "Document not found")

    retrieval = await rag_service.retrieve(req.question, doc_ids=[req.source_id], top_k=5)

    if not retrieval["chunks"]:
        raise HTTPException(400, "Document not indexed for search")

    context = "\n\n".join(f"[Excerpt {i+1}]: {c['text']}" for i, c in enumerate(retrieval["chunks"]))

    system = f"""You are a document Q&A expert. Answer questions based strictly on the provided document content.
If the answer is not in the document, say so clearly.
Always cite which excerpt supports your answer."""

    response = await llm_service.chat(
        system_prompt=system,
        messages=[{"role": "user", "content": f"Document: {ds.name}\n\nRelevant excerpts:\n{context}\n\nQuestion: {req.question}"}],
    )

    return {
        "question": req.question,
        "answer": response["content"],
        "sources": [{"text": c["text"][:200], "score": c["score"]} for c in retrieval["chunks"]],
    }


@router.post("/extract")
async def extract_information(
    req: ExtractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract specific information from a document"""
    ds = db.query(DataSource).filter(DataSource.id == req.source_id).first()
    if not ds:
        raise HTTPException(404, "Document not found")

    extract_queries = {
        "key_info": "key information important facts main points",
        "dates": "dates deadlines timelines schedules milestones",
        "people": "people names roles responsibilities contacts",
        "clauses": "clauses terms conditions obligations requirements",
        "action_items": "action items tasks to-do next steps responsibilities",
    }

    query = extract_queries.get(req.extract_type, req.extract_type)
    retrieval = await rag_service.retrieve(query, doc_ids=[req.source_id], top_k=8)

    if not retrieval["chunks"]:
        return {"extract_type": req.extract_type, "extracted": [], "raw_context": ""}

    context = "\n\n".join(c["text"] for c in retrieval["chunks"])

    prompts = {
        "key_info": "Extract and list the KEY INFORMATION and important facts from this document. Format as bullet points.",
        "dates": "Extract ALL dates, deadlines, and timelines. For each, describe what event/milestone it refers to.",
        "people": "Extract all mentioned PEOPLE, their names, roles, and responsibilities. Format as a table.",
        "clauses": "Extract the key CLAUSES, TERMS, and CONDITIONS. Highlight critical obligations.",
        "action_items": "Extract all ACTION ITEMS and NEXT STEPS. For each: What | Who (if mentioned) | When (if mentioned).",
    }

    prompt_text = prompts.get(req.extract_type, f"Extract {req.extract_type} from the document.")

    response = await llm_service.complete(
        f"{prompt_text}\n\nDocument: {ds.name}\n\nContent:\n{context[:3000]}",
        max_tokens=800,
    )

    return {
        "document": ds.name,
        "extract_type": req.extract_type,
        "extracted_content": response["content"],
        "chunks_analyzed": len(retrieval["chunks"]),
    }


@router.post("/compare")
async def compare_documents(
    req: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare multiple documents"""
    if len(req.source_ids) < 2:
        raise HTTPException(400, "At least 2 documents required for comparison")
    if len(req.source_ids) > 5:
        raise HTTPException(400, "Maximum 5 documents for comparison")

    docs = []
    for sid in req.source_ids:
        ds = db.query(DataSource).filter(DataSource.id == sid).first()
        if not ds:
            continue
        aspect = req.comparison_aspect or "main content themes key points"
        retrieval = await rag_service.retrieve(aspect, doc_ids=[sid], top_k=3)
        excerpt = "\n".join(c["text"] for c in retrieval["chunks"]) if retrieval["chunks"] else "Not indexed"
        docs.append({"name": ds.name, "excerpt": excerpt[:600]})

    if not docs:
        raise HTTPException(400, "No valid documents found")

    doc_context = "\n\n".join(f"### Document: {d['name']}\n{d['excerpt']}" for d in docs)
    aspect_str = f"Focus comparison on: {req.comparison_aspect}" if req.comparison_aspect else ""

    prompt = f"""Compare the following documents in detail.
{aspect_str}

{doc_context}

Provide a structured comparison:
1. **Overview** of each document
2. **Similarities** (common themes, points, approaches)
3. **Key Differences** (highlight important distinctions)
4. **Summary Table** (| Aspect | Doc 1 | Doc 2 | ...)
5. **Recommendation** (which to prefer for what purpose)"""

    response = await llm_service.complete(prompt, max_tokens=1200)

    return {
        "documents": [d["name"] for d in docs],
        "comparison": response["content"],
        "aspect": req.comparison_aspect,
    }


# ── Meeting Intelligence ──────────────────────────────────────
meeting_router = APIRouter(prefix="/api/meetings", tags=["Meeting Intelligence"])


class TranscriptAnalysisRequest(BaseModel):
    transcript: str
    meeting_title: Optional[str] = None


@meeting_router.post("/analyze")
async def analyze_meeting_transcript(
    req: TranscriptAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """Analyze a meeting transcript - summarize, extract action items, key decisions"""
    prompt = f"""Analyze this meeting transcript and provide:

Meeting: {req.meeting_title or 'Business Meeting'}

Transcript:
{req.transcript[:4000]}

Please extract and format:

## 📋 Meeting Summary
(2-3 sentence overview)

## ✅ Action Items
(List each: Action | Owner | Deadline if mentioned)

## 🔑 Key Decisions Made
(List important decisions)

## 💬 Key Discussion Points
(Main topics discussed)

## 📌 Follow-up Required
(Items needing follow-up)

## 🎯 Next Steps
(Concrete next steps)"""

    response = await llm_service.complete(prompt, max_tokens=1200)

    # Also run NLP
    sentiment = await nlp_service.sentiment(req.transcript[:1000])
    keywords = await nlp_service.extract_keywords(req.transcript, top_k=10)

    return {
        "analysis": response["content"],
        "sentiment": sentiment,
        "keywords": keywords["keywords"],
        "word_count": len(req.transcript.split()),
    }


@meeting_router.post("/generate-followup")
async def generate_followup_email(
    meeting_summary: str,
    action_items: str,
    recipient_name: Optional[str] = "Team",
    current_user: User = Depends(get_current_user)
):
    """Generate a follow-up email from meeting notes"""
    prompt = f"""Write a professional follow-up email for:

Meeting Summary: {meeting_summary}
Action Items: {action_items}
Recipient: {recipient_name}

Write a concise, professional email with:
- Subject line
- Greeting
- Brief recap
- Clear action items with owners
- Next meeting/steps
- Professional closing"""

    response = await llm_service.complete(prompt, max_tokens=600)
    return {"email": response["content"]}
