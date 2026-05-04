from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.database import get_db
from app.models import User, DataSource, KPIMetric, Report, Alert
from app.utils.auth import get_current_user
from app.services.analytics_service import AnalyticsService
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/analytics", tags=["Analytics & BI"])
analytics_service = AnalyticsService()
llm_service = LLMService()


class KPICreateRequest(BaseModel):
    name: str
    category: Optional[str] = None
    value: float
    unit: Optional[str] = None
    target_value: Optional[float] = None
    data_source_id: Optional[str] = None


class ReportRequest(BaseModel):
    title: str
    report_type: str = "business"       # business|sales|marketing|risk|custom
    data_source_ids: Optional[List[str]] = []
    include_sections: Optional[List[str]] = None
    schedule: Optional[str] = None      # cron or null


class WhatIfRequest(BaseModel):
    data_source_id: str
    base_scenario: Dict[str, Any]
    variables: List[Dict[str, Any]]     # [{name, values: [v1, v2, ...]}]
    target_metric: str


# ── Dashboard Overview ────────────────────────────────────────
@router.get("/dashboard")
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated dashboard metrics"""
    from app.models import MLModel, ChatSession, NLPTask, AgentTask

    total_sources = db.query(DataSource).filter(DataSource.owner_id == current_user.id).count()
    total_models = db.query(MLModel).filter(MLModel.created_by == current_user.id).count()
    total_chats = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).count()

    kpis = db.query(KPIMetric).filter(KPIMetric.created_by == current_user.id).order_by(
        KPIMetric.recorded_at.desc()).limit(10).all()

    alerts = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_read == False).order_by(
        Alert.created_at.desc()).limit(5).all()

    recent_sources = db.query(DataSource).filter(
        DataSource.owner_id == current_user.id
    ).order_by(DataSource.created_at.desc()).limit(5).all()

    return {
        "overview": {
            "total_data_sources": total_sources,
            "total_ml_models": total_models,
            "total_chat_sessions": total_chats,
            "unread_alerts": db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_read == False).count(),
        },
        "kpis": [_kpi_dict(k) for k in kpis],
        "alerts": [_alert_dict(a) for a in alerts],
        "recent_sources": [{"id": s.id, "name": s.name, "type": s.source_type, "created_at": s.created_at.isoformat() if s.created_at else None} for s in recent_sources],
    }


# ── KPI Management ─────────────────────────────────────────────
@router.get("/kpis")
def list_kpis(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(KPIMetric).filter(KPIMetric.created_by == current_user.id)
    if category:
        q = q.filter(KPIMetric.category == category)
    return [_kpi_dict(k) for k in q.order_by(KPIMetric.recorded_at.desc()).all()]


@router.post("/kpis")
def create_kpi(
    req: KPICreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    kpi = KPIMetric(**req.dict(), created_by=current_user.id)
    db.add(kpi)
    db.commit()
    db.refresh(kpi)
    return _kpi_dict(kpi)


@router.post("/kpis/from-dataset")
async def extract_kpis_from_dataset(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-extract KPIs from a dataset using AI"""
    ds = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    kpis = await analytics_service.extract_kpis(ds.file_path, str(ds.source_type))

    saved = []
    for k in kpis:
        kpi = KPIMetric(
            name=k["name"],
            category=k.get("category"),
            value=k.get("value", 0),
            unit=k.get("unit"),
            change_percent=k.get("change_percent"),
            trend=k.get("trend"),
            data_source_id=data_source_id,
            created_by=current_user.id,
        )
        db.add(kpi)
        saved.append(k)
    db.commit()
    return {"extracted": len(saved), "kpis": saved}


# ── Trend Analysis ────────────────────────────────────────────
@router.post("/trend-analysis")
async def trend_analysis(
    data_source_id: str,
    date_column: str,
    value_columns: List[str],
    granularity: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze trends over time"""
    ds = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")
    return await analytics_service.trend_analysis(ds.file_path, str(ds.source_type), date_column, value_columns, granularity)


@router.post("/comparative-analysis")
async def comparative_analysis(
    data_source_id: str,
    group_column: str,
    value_columns: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compare performance across groups/segments"""
    ds = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")
    return await analytics_service.comparative_analysis(ds.file_path, str(ds.source_type), group_column, value_columns)


# ── Report Generation ──────────────────────────────────────────
@router.post("/reports/generate")
async def generate_report(
    req: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an AI-written business report"""
    # Gather data context
    data_contexts = []
    for ds_id in req.data_source_ids:
        ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
        if ds:
            stats = await analytics_service.quick_stats(ds.file_path, str(ds.source_type))
            data_contexts.append({"name": ds.name, "stats": stats})

    kpis = db.query(KPIMetric).filter(KPIMetric.created_by == current_user.id).order_by(
        KPIMetric.recorded_at.desc()).limit(10).all()

    prompt = f"""Generate a comprehensive {req.report_type} report titled "{req.title}".

Available Data:
{_format_data_for_report(data_contexts, kpis)}

Generate a professional report with:
1. Executive Summary
2. Key Findings  
3. Performance Analysis
4. Trends & Insights
5. Risk Assessment
6. Recommendations
7. Conclusion

Use markdown formatting. Be specific with numbers and percentages where available."""

    response = await llm_service.complete(prompt, max_tokens=2000)

    report = Report(
        title=req.title,
        report_type=req.report_type,
        content=response["content"],
        data_sources=req.data_source_ids,
        schedule=req.schedule,
        is_scheduled=bool(req.schedule),
        created_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {"report_id": report.id, "title": report.title, "content": response["content"]}


@router.get("/reports")
def list_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(Report).filter(Report.created_by == current_user.id).order_by(Report.created_at.desc()).all()
    return [{"id": r.id, "title": r.title, "report_type": r.report_type, "created_at": r.created_at.isoformat() if r.created_at else None} for r in reports]


@router.get("/reports/{report_id}")
def get_report(report_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    return {"id": r.id, "title": r.title, "content": r.content, "report_type": r.report_type, "created_at": r.created_at.isoformat() if r.created_at else None}


# ── What-If Analysis ──────────────────────────────────────────
@router.post("/what-if")
async def what_if_analysis(
    req: WhatIfRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Scenario simulation - what-if analysis"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    result = await analytics_service.what_if_simulation(
        ds.file_path, str(ds.source_type),
        req.base_scenario, req.variables, req.target_metric
    )
    return result


# ── Alerts ────────────────────────────────────────────────────
@router.get("/alerts")
def get_alerts(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Alert).filter(Alert.user_id == current_user.id)
    if unread_only:
        q = q.filter(Alert.is_read == False)
    return [_alert_dict(a) for a in q.order_by(Alert.created_at.desc()).limit(50).all()]


@router.put("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if a:
        a.is_read = True
        db.commit()
    return {"message": "Marked as read"}


# ── Helpers ───────────────────────────────────────────────────
def _kpi_dict(k: KPIMetric) -> dict:
    return {
        "id": k.id, "name": k.name, "category": k.category,
        "value": k.value, "unit": k.unit, "target_value": k.target_value,
        "change_percent": k.change_percent, "trend": k.trend,
        "recorded_at": k.recorded_at.isoformat() if k.recorded_at else None,
    }


def _alert_dict(a: Alert) -> dict:
    return {
        "id": a.id, "title": a.title, "message": a.message,
        "alert_type": a.alert_type, "severity": a.severity, "is_read": a.is_read,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _format_data_for_report(data_contexts: list, kpis: list) -> str:
    lines = []
    for ctx in data_contexts:
        lines.append(f"\nDataset: {ctx['name']}")
        if ctx.get("stats"):
            for k, v in ctx["stats"].items():
                lines.append(f"  {k}: {v}")
    if kpis:
        lines.append("\nKPI Metrics:")
        for k in kpis:
            lines.append(f"  {k.name}: {k.value} {k.unit or ''} (trend: {k.trend or 'stable'})")
    return "\n".join(lines) if lines else "No data available"
