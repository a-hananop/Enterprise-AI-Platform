"""
Generative AI API - Standalone AI generation features
Data storytelling, strategy recommendations, scenario simulation
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models import User, DataSource
from app.utils.auth import get_current_user
from app.services.llm_service import LLMService
from app.services.data_service import DataService

router = APIRouter(prefix="/api/genai", tags=["Generative AI"])
llm_service = LLMService()
data_service = DataService()


class DataStoryRequest(BaseModel):
    data_source_id: str
    audience: str = "executives"   # executives|analysts|general
    focus: Optional[str] = None
    include_recommendations: bool = True


class StrategyRequest(BaseModel):
    business_context: str
    current_metrics: Optional[Dict[str, Any]] = {}
    challenges: Optional[List[str]] = []
    goals: Optional[List[str]] = []
    time_horizon: str = "quarterly"  # monthly|quarterly|annual


class InsightRequest(BaseModel):
    data_source_id: str
    question: Optional[str] = None


class PresentationRequest(BaseModel):
    title: str
    data_source_id: Optional[str] = None
    sections: List[str] = ["overview", "findings", "recommendations"]
    audience: str = "executives"
    slides_count: int = 8


# ── Data Storytelling ─────────────────────────────────────────
@router.post("/data-story")
async def generate_data_story(
    req: DataStoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Turn raw data into a compelling narrative story"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    # Get data context
    stats = await data_service.compute_stats(ds.file_path, str(ds.source_type)) if ds.source_type in ["csv", "excel", "json"] else {}

    audience_map = {
        "executives": "C-level executives who need big picture insights and strategic implications",
        "analysts": "data analysts who appreciate technical depth and statistical nuance",
        "general": "non-technical business stakeholders who need clear, jargon-free insights",
    }

    prompt = f"""You are a data storytelling expert. Transform this data into a compelling narrative.

Dataset: {ds.name}
Audience: {audience_map.get(req.audience, req.audience)}
Focus: {req.focus or 'Overall business performance and key insights'}

Data Statistics:
{str(stats)[:2000] if stats else 'Dataset metadata available'}

Create an engaging data story with:

## 📖 The Story: {ds.name}

**Opening Hook** (1-2 sentences that grab attention)

**The Data Context** (What this data represents, why it matters)

**Key Discoveries** (3-5 compelling findings with specific numbers)
- Each finding should tell a mini-story

**The Surprising Insight** (One unexpected or counterintuitive finding)

**What This Means** (Business implications)

{'**Strategic Recommendations** (3 data-driven actions to take)' if req.include_recommendations else ''}

**Conclusion** (Memorable closing takeaway)

Use vivid language, specific numbers, and make the data come alive."""

    response = await llm_service.complete(prompt, max_tokens=1200)
    return {
        "dataset": ds.name,
        "audience": req.audience,
        "story": response["content"],
    }


# ── Strategy Recommendations ──────────────────────────────────
@router.post("/strategy-recommendations")
async def generate_strategy(
    req: StrategyRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered strategic business recommendations"""
    metrics_str = "\n".join(f"  - {k}: {v}" for k, v in req.current_metrics.items()) if req.current_metrics else "  Not provided"
    challenges_str = "\n".join(f"  - {c}" for c in req.challenges) if req.challenges else "  Not specified"
    goals_str = "\n".join(f"  - {g}" for g in req.goals) if req.goals else "  Not specified"

    prompt = f"""You are a strategic business consultant. Generate comprehensive recommendations.

Business Context: {req.business_context}
Time Horizon: {req.time_horizon}

Current Metrics:
{metrics_str}

Key Challenges:
{challenges_str}

Business Goals:
{goals_str}

Generate a strategic recommendation report:

## 🎯 Strategic Recommendations

### Executive Summary
(2-3 sentences summarizing the strategic situation)

### Strategic Priority 1: [Name]
- **What**: Clear description
- **Why**: Data-backed rationale
- **How**: 3-4 implementation steps
- **Expected Impact**: Quantified outcome
- **Timeline**: {req.time_horizon} milestone
- **Risk Level**: Low/Medium/High

### Strategic Priority 2: [Name]
[Same format]

### Strategic Priority 3: [Name]
[Same format]

### Quick Wins (This Week)
(3 immediate actions with impact)

### Risk Mitigation
(Top 2 risks and how to address them)

### Success Metrics
(How to measure progress against these recommendations)

Be specific, actionable, and data-driven throughout."""

    response = await llm_service.complete(prompt, max_tokens=1500)
    return {
        "time_horizon": req.time_horizon,
        "recommendations": response["content"],
        "context": req.business_context[:200],
    }


# ── AI Insights from Data ─────────────────────────────────────
@router.post("/insights")
async def generate_insights_from_data(
    req: InsightRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI insights from a dataset"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    # Get statistics
    stats = {}
    if str(ds.source_type) in ["csv", "excel", "json"]:
        try:
            stats = await data_service.compute_stats(ds.file_path, str(ds.source_type))
        except Exception:
            pass

    data_summary = {
        "name": ds.name,
        "type": str(ds.source_type),
        "rows": ds.row_count,
        "columns": ds.column_count,
        "column_info": ds.columns_info,
        "statistics": stats,
    }

    insights = await llm_service.generate_insights(data_summary)

    recommendations = []
    if req.question:
        answer_prompt = f"""Based on this dataset ({ds.name}):
Rows: {ds.row_count}, Columns: {ds.column_count}
Column types: {', '.join(c['name'] + '(' + c['dtype'] + ')' for c in (ds.columns_info or [])[:10])}

Question: {req.question}

Provide a specific, data-informed answer."""
        ans = await llm_service.complete(answer_prompt, max_tokens=500)
        recommendations = [ans["content"]]

    return {
        "dataset": ds.name,
        "insights": insights,
        "question_answer": recommendations[0] if recommendations else None,
    }


# ── Presentation Generator ─────────────────────────────────────
@router.post("/presentation")
async def generate_presentation_outline(
    req: PresentationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a presentation outline with slide content"""
    data_context = ""
    if req.data_source_id:
        ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
        if ds:
            data_context = f"\nDataset available: {ds.name} ({ds.row_count} rows, {ds.column_count} columns)"

    sections_str = ", ".join(req.sections)

    prompt = f"""Create a {req.slides_count}-slide presentation outline:

Title: {req.title}
Audience: {req.audience}
Sections to cover: {sections_str}
{data_context}

Generate a detailed slide-by-slide outline:

**Slide 1: Title Slide**
- Title: {req.title}
- Subtitle: [Compelling subtitle]
- Presenter note: [Opening hook]

**Slide 2: Agenda**
[List slides/sections]

[Continue for each section, following this format:]

**Slide N: [Section Title]**
- Key Point 1: [specific content]
- Key Point 2: [specific content]
- Visual suggestion: [chart/graph/image type]
- Talking points: [2-3 key talking points]
- Data highlight: [specific number or finding if applicable]

Ensure the presentation tells a coherent story from problem → insight → recommendation → call to action.
Make each slide focused, visual-friendly, and audience-appropriate."""

    response = await llm_service.complete(prompt, max_tokens=1500)
    return {
        "title": req.title,
        "slides_count": req.slides_count,
        "audience": req.audience,
        "outline": response["content"],
        "sections": req.sections,
    }


# ── Email Generator ────────────────────────────────────────────
@router.post("/generate-email")
async def generate_business_email(
    purpose: str,
    recipient_role: str,
    key_message: str,
    sender_name: Optional[str] = None,
    tone: str = "professional",
    current_user: User = Depends(get_current_user)
):
    """Generate a professional business email"""
    prompt = f"""Write a professional business email:

Purpose: {purpose}
Recipient Role: {recipient_role}
Key Message: {key_message}
Sender: {sender_name or 'Business Professional'}
Tone: {tone}

Write a complete email with:
Subject: [Compelling subject line]

[Email body - appropriate length for purpose]
- Clear opening
- Main message with supporting points
- Specific, appropriate call-to-action
- Professional closing

Keep it concise, clear, and action-oriented."""

    response = await llm_service.complete(prompt, max_tokens=500)
    return {
        "purpose": purpose,
        "recipient": recipient_role,
        "email": response["content"],
    }


# ── What-if Scenario Narrative ─────────────────────────────────
@router.post("/scenario-narrative")
async def generate_scenario_narrative(
    scenario_name: str,
    base_assumptions: Dict[str, Any],
    changed_variables: Dict[str, Any],
    business_context: str,
    current_user: User = Depends(get_current_user)
):
    """Generate a narrative explanation of a business scenario"""
    base_str = "\n".join(f"  {k}: {v}" for k, v in base_assumptions.items())
    changed_str = "\n".join(f"  {k}: {v}" for k, v in changed_variables.items())

    prompt = f"""Explain this business scenario in a compelling narrative:

Scenario: {scenario_name}
Business Context: {business_context}

Base Assumptions:
{base_str}

Changed Variables:
{changed_str}

Write a narrative that:
1. Explains what this scenario means in plain language
2. Describes the chain of cause-and-effect
3. Quantifies the potential impact where possible
4. Highlights risks and opportunities
5. Recommends whether to pursue this scenario

Use clear business language, avoid jargon, and make it compelling."""

    response = await llm_service.complete(prompt, max_tokens=700)
    return {
        "scenario": scenario_name,
        "narrative": response["content"],
        "variables_changed": list(changed_variables.keys()),
    }
