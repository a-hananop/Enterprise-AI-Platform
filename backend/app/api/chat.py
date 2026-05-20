from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json

from app.database import get_db
from app.models import User, ChatSession, ChatMessage, DataSource
from app.utils.auth import get_current_user
from app.services.rag_service import RAGService
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])
rag_service = RAGService()
llm_service = LLMService()


@router.get("/status")
def llm_status():
    """Check whether an LLM provider is configured and ready."""
    llm_service._ensure_clients()
    return {
        "configured": llm_service.is_configured,
        "groq": llm_service.groq_client is not None,
        "gemini": llm_service.gemini_client is not None,
    }


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    data_source_ids: Optional[List[str]] = []
    use_rag: bool = True
    temperature: float = 0.3


class NewSessionRequest(BaseModel):
    title: Optional[str] = None
    data_source_ids: Optional[List[str]] = []


# ── Session Management ────────────────────────────────────────
@router.post("/sessions")
def create_session(
    req: NewSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = ChatSession(
        title=req.title or "New Conversation",
        user_id=current_user.id,
        data_source_ids=req.data_source_ids
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_dict(session, [])


@router.get("/sessions")
def list_sessions(
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = (db.query(ChatSession)
                .filter(ChatSession.user_id == current_user.id)
                .order_by(ChatSession.updated_at.desc())
                .offset(skip).limit(limit).all())
    return [_session_dict(s, s.messages[-1:] if s.messages else []) for s in sessions]


@router.get("/sessions/{session_id}/messages")
def get_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = _get_session(session_id, db, current_user)
    return {
        "session": _session_dict(session, []),
        "messages": [_msg_dict(m) for m in session.messages]
    }


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = _get_session(session_id, db, current_user)
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}


# ── Main Chat ──────────────────────────────────────────────────
@router.post("/message")
async def send_message(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send message to AI with optional RAG context"""
    # Get or create session
    if req.session_id:
        session = _get_session(req.session_id, db, current_user)
    else:
        session = ChatSession(
            title=req.message[:50],
            user_id=current_user.id,
            data_source_ids=req.data_source_ids
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Build conversation history
    history = [{"role": m.role, "content": m.content} for m in session.messages[-10:]]

    sources = []
    context_text = ""

    # RAG retrieval
    if req.use_rag and (req.data_source_ids or session.data_source_ids):
        ds_ids = req.data_source_ids or session.data_source_ids or []
        retrieval = await rag_service.retrieve(req.message, ds_ids, top_k=5)
        if retrieval["chunks"]:
            context_text = "\n\n".join(
                f"[Source: {c['source']}]\n{c['text']}" for c in retrieval["chunks"]
            )
            sources = [{"source": c["source"], "score": c["score"]} for c in retrieval["chunks"]]

    # Build prompt
    system_prompt = _build_system_prompt(context_text)

    # Call LLM
    response = await llm_service.chat(
        system_prompt=system_prompt,
        messages=history + [{"role": "user", "content": req.message}],
        temperature=req.temperature,
    )

    ai_reply = response["content"]
    tokens_used = response.get("tokens", 0)

    # Save messages
    user_msg = ChatMessage(session_id=session.id, role="user", content=req.message)
    ai_msg = ChatMessage(
        session_id=session.id, role="assistant",
        content=ai_reply, sources=sources, tokens_used=tokens_used
    )
    db.add_all([user_msg, ai_msg])

    # Update session title if first message
    if len(session.messages) == 0:
        session.title = req.message[:60]
    db.commit()

    return {
        "session_id": session.id,
        "message": ai_reply,
        "sources": sources,
        "tokens_used": tokens_used,
    }


@router.post("/stream-message")
async def stream_message(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream message response from AI"""
    from fastapi.responses import StreamingResponse
    
    # Get or create session
    if req.session_id:
        session = _get_session(req.session_id, db, current_user)
    else:
        session = ChatSession(
            title=req.message[:50],
            user_id=current_user.id,
            data_source_ids=req.data_source_ids
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Build conversation history
    history = [{"role": m.role, "content": m.content} for m in session.messages[-10:]]

    context_text = ""
    sources = []

    # RAG retrieval
    if req.use_rag and (req.data_source_ids or session.data_source_ids):
        ds_ids = req.data_source_ids or session.data_source_ids or []
        retrieval = await rag_service.retrieve(req.message, ds_ids, top_k=5)
        if retrieval["chunks"]:
            context_text = "\n\n".join(
                f"[Source: {c['source']}]\n{c['text']}" for c in retrieval["chunks"]
            )
            sources = [{"source": c["source"], "score": c["score"]} for c in retrieval["chunks"]]

    # Build prompt
    system_prompt = _build_system_prompt(context_text)

    async def event_generator():
        full_response = ""
        # First send sources if any
        if sources:
            yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"
        
        # Then stream tokens
        async for token in llm_service.stream_chat(
            system_prompt=system_prompt,
            messages=history + [{"role": "user", "content": req.message}],
            temperature=req.temperature,
        ):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        
        # Finally, save to DB and send session info
        user_msg = ChatMessage(session_id=session.id, role="user", content=req.message)
        ai_msg = ChatMessage(
            session_id=session.id, role="assistant",
            content=full_response, sources=sources
        )
        db.add_all([user_msg, ai_msg])
        db.commit()
        
        yield f"data: {json.dumps({'type': 'done', 'session_id': session.id})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Quick Analysis ─────────────────────────────────────────────
@router.post("/analyze-data/{source_id}")
async def analyze_dataset(
    source_id: str,
    question: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ask AI to analyze a specific dataset"""
    ds = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    # Build context from dataset metadata
    context = f"""
Dataset: {ds.name}
Rows: {ds.row_count}, Columns: {ds.column_count}
Columns: {json.dumps(ds.columns_info, indent=2) if ds.columns_info else 'N/A'}
Sample Data: {json.dumps(ds.preview_data, indent=2) if ds.preview_data else 'N/A'}
"""
    system_prompt = f"""You are an expert data analyst. Analyze the following dataset and answer questions.
    
Dataset Context:
{context}

Provide clear, actionable insights. Use numbers and percentages where relevant."""

    response = await llm_service.chat(
        system_prompt=system_prompt,
        messages=[{"role": "user", "content": question}],
    )
    return {"answer": response["content"], "dataset": ds.name}


# ── Helpers ────────────────────────────────────────────────────
def _build_system_prompt(context: str) -> str:
    base = """You are an Enterprise AI Business Copilot. You help business professionals make data-driven decisions.

Your capabilities:
- Analyze business data and documents
- Answer questions based on company data
- Provide insights, predictions, and recommendations
- Generate reports and summaries

Always:
- Be precise and cite specific numbers/data when available
- Provide actionable recommendations
- Explain complex concepts in simple terms
- Structure responses clearly with headers when appropriate
"""
    if context:
        base += f"\n\nRelevant context from company documents/data:\n{context}\n\nUse this context to answer the question accurately."
    return base


def _get_session(session_id: str, db: Session, user: User) -> ChatSession:
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    if s.user_id != user.id:
        raise HTTPException(403, "Access denied")
    return s


def _session_dict(s: ChatSession, recent_msgs: list) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "data_source_ids": s.data_source_ids,
        "message_count": len(s.messages) if s.messages else 0,
        "last_message": _msg_dict(recent_msgs[-1]) if recent_msgs else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _msg_dict(m: ChatMessage) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "sources": m.sources,
        "tokens_used": m.tokens_used,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }
