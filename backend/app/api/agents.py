from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import User, AgentTask, TaskStatus
from app.utils.auth import get_current_user
from app.services.agent_service import AgentOrchestrator

router = APIRouter(prefix="/api/agents", tags=["AI Agents"])
orchestrator = AgentOrchestrator()


AGENT_TYPES = {
    "data": {
        "name": "Data Agent",
        "description": "Processes, cleans, and transforms data. Handles data quality and preparation.",
        "icon": "🗄️",
        "capabilities": ["data_cleaning", "feature_engineering", "data_profiling", "transformation"]
    },
    "research": {
        "name": "Research Agent",
        "description": "Researches market trends, competitors, and business intelligence.",
        "icon": "🔍",
        "capabilities": ["web_research", "trend_analysis", "competitive_intelligence", "market_research"]
    },
    "finance": {
        "name": "Finance Agent",
        "description": "Analyzes revenue, costs, cash flow, and financial performance.",
        "icon": "💰",
        "capabilities": ["revenue_analysis", "cost_breakdown", "risk_assessment", "financial_forecasting"]
    },
    "marketing": {
        "name": "Marketing Agent",
        "description": "Analyzes campaigns, generates content, and identifies customer segments.",
        "icon": "📢",
        "capabilities": ["campaign_analysis", "content_generation", "segmentation", "ab_testing"]
    },
    "report": {
        "name": "Report Agent",
        "description": "Automatically generates comprehensive business reports and presentations.",
        "icon": "📊",
        "capabilities": ["report_generation", "data_storytelling", "visualization_suggestions", "executive_summary"]
    },
    "orchestrator": {
        "name": "Orchestrator Agent",
        "description": "Coordinates multiple agents to complete complex multi-step goals.",
        "icon": "🎯",
        "capabilities": ["task_planning", "agent_coordination", "goal_decomposition", "result_synthesis"]
    }
}


class RunAgentRequest(BaseModel):
    agent_type: str
    goal: str
    data_source_ids: Optional[List[str]] = []
    context: Optional[dict] = {}


class MultiAgentRequest(BaseModel):
    goal: str
    agents: Optional[List[str]] = None  # None = auto-select
    data_source_ids: Optional[List[str]] = []
    max_steps: int = 10


# ── Agent Info ─────────────────────────────────────────────────
@router.get("/types")
def list_agent_types():
    """Get available agent types and their capabilities"""
    return AGENT_TYPES


# ── Run Single Agent ──────────────────────────────────────────
@router.post("/run")
async def run_agent(
    req: RunAgentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run a single AI agent with a specific goal"""
    if req.agent_type not in AGENT_TYPES and req.agent_type != "orchestrator":
        raise HTTPException(400, f"Unknown agent type: {req.agent_type}")

    task = AgentTask(
        agent_type=req.agent_type,
        goal=req.goal,
        status=TaskStatus.pending,
        data_source_ids=req.data_source_ids,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    background_tasks.add_task(_run_agent_background, task.id, req, db)
    return {"task_id": task.id, "status": "pending", "agent": AGENT_TYPES.get(req.agent_type, {}).get("name")}


# ── Multi-Agent Orchestration ─────────────────────────────────
@router.post("/orchestrate")
async def orchestrate_agents(
    req: MultiAgentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run multiple agents collaborating on a complex goal"""
    task = AgentTask(
        agent_type="orchestrator",
        goal=req.goal,
        status=TaskStatus.pending,
        data_source_ids=req.data_source_ids,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    background_tasks.add_task(_run_orchestration_background, task.id, req, db)
    return {"task_id": task.id, "status": "pending", "message": "Multi-agent orchestration started"}


# ── Task Status ────────────────────────────────────────────────
@router.get("/tasks/{task_id}")
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Poll agent task status and results"""
    task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if task.created_by != current_user.id and current_user.role not in ["admin"]:
        raise HTTPException(403, "Access denied")
    return _task_dict(task)


@router.get("/tasks")
def list_tasks(
    status: Optional[str] = None,
    agent_type: Optional[str] = None,
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all agent tasks"""
    q = db.query(AgentTask).filter(AgentTask.created_by == current_user.id)
    if status:
        q = q.filter(AgentTask.status == status)
    if agent_type:
        q = q.filter(AgentTask.agent_type == agent_type)
    tasks = q.order_by(AgentTask.created_at.desc()).offset(skip).limit(limit).all()
    return [_task_dict(t) for t in tasks]


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(AgentTask).filter(AgentTask.id == task_id, AgentTask.created_by == current_user.id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


# ── Helpers ───────────────────────────────────────────────────
def _task_dict(t: AgentTask) -> dict:
    return {
        "id": t.id,
        "agent_type": t.agent_type,
        "agent_name": AGENT_TYPES.get(t.agent_type, {}).get("name", t.agent_type),
        "goal": t.goal,
        "status": t.status,
        "steps": t.steps,
        "final_output": t.final_output,
        "data_source_ids": t.data_source_ids,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
    }


async def _run_agent_background(task_id: str, req: RunAgentRequest, db):
    task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
    if not task:
        return
    try:
        task.status = TaskStatus.running
        task.steps = []
        db.commit()

        result = await orchestrator.run_single_agent(
            agent_type=req.agent_type,
            goal=req.goal,
            data_source_ids=req.data_source_ids,
            context=req.context,
        )
        task.status = TaskStatus.completed
        task.steps = result.get("steps", [])
        task.final_output = result.get("output", "")
        task.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        task.status = TaskStatus.failed
        task.final_output = f"Error: {str(e)}"
        db.commit()


async def _run_orchestration_background(task_id: str, req: MultiAgentRequest, db):
    task = db.query(AgentTask).filter(AgentTask.id == task_id).first()
    if not task:
        return
    try:
        task.status = TaskStatus.running
        task.steps = []
        db.commit()

        result = await orchestrator.orchestrate(
            goal=req.goal,
            agents=req.agents,
            data_source_ids=req.data_source_ids,
            max_steps=req.max_steps,
        )
        task.status = TaskStatus.completed
        task.steps = result.get("steps", [])
        task.final_output = result.get("output", "")
        task.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        task.status = TaskStatus.failed
        task.final_output = f"Orchestration error: {str(e)}"
        db.commit()
