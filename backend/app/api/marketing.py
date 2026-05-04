"""
Marketing Intelligence API
Customer segmentation, campaign analysis, AI content generation
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.models import User, DataSource
from app.utils.auth import get_current_user
from app.services.llm_service import LLMService
from app.services.ml_service import MLService

router = APIRouter(prefix="/api/marketing", tags=["Marketing Intelligence"])
llm_service = LLMService()
ml_service = MLService()


class ContentRequest(BaseModel):
    content_type: str          # email|social|ad|blog|landing_page
    topic: str
    tone: str = "professional" # professional|friendly|urgent|persuasive|casual
    target_audience: Optional[str] = None
    key_points: Optional[List[str]] = []
    brand_name: Optional[str] = None
    word_count: int = 200


class CampaignAnalysisRequest(BaseModel):
    data_source_id: str
    metrics_columns: List[str]  # clicks, conversions, revenue, etc.
    campaign_column: Optional[str] = None


class SegmentationRequest(BaseModel):
    data_source_id: str
    feature_columns: List[str]
    n_segments: int = 4


class AdCopyRequest(BaseModel):
    product_name: str
    product_description: str
    target_audience: str
    platform: str = "google"   # google|facebook|instagram|linkedin
    campaign_goal: str = "conversions"  # awareness|clicks|conversions|engagement


# ── Content Generation ─────────────────────────────────────────
@router.post("/generate-content")
async def generate_content(
    req: ContentRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate marketing content using AI"""
    type_prompts = {
        "email": f"Write a marketing email",
        "social": f"Write a social media post",
        "ad": f"Write an advertisement",
        "blog": f"Write a blog post introduction",
        "landing_page": f"Write landing page copy",
    }

    base = type_prompts.get(req.content_type, "Write marketing content")
    key_pts = "\n".join(f"- {p}" for p in req.key_points) if req.key_points else ""

    prompt = f"""{base} for the following:

Topic: {req.topic}
Tone: {req.tone}
Target Audience: {req.target_audience or 'General business professionals'}
Brand: {req.brand_name or 'Our Company'}
Target Word Count: ~{req.word_count} words
{f'Key Points to Include:{chr(10)}{key_pts}' if key_pts else ''}

Requirements:
- Engaging {req.tone} tone
- Clear call-to-action
- Focus on benefits, not just features
- Optimized for {req.content_type}
- Compelling subject line (for email) or headline

Generate the content now:"""

    response = await llm_service.complete(prompt, max_tokens=800)
    return {
        "content_type": req.content_type,
        "topic": req.topic,
        "generated_content": response["content"],
        "word_count_estimate": len(response["content"].split()),
    }


@router.post("/ad-copy")
async def generate_ad_copy(
    req: AdCopyRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate optimized ad copy for different platforms"""
    platform_limits = {
        "google": {"headline": 30, "description": 90},
        "facebook": {"headline": 40, "description": 125},
        "instagram": {"caption": 150},
        "linkedin": {"headline": 50, "description": 150},
    }
    limits = platform_limits.get(req.platform, {"headline": 40, "description": 100})

    prompt = f"""Generate optimized {req.platform.title()} ad copy:

Product: {req.product_name}
Description: {req.product_description}
Target Audience: {req.target_audience}
Campaign Goal: {req.campaign_goal}
Character Limits: {limits}

Generate 3 variations with:
1. Headline (max {limits.get('headline', 40)} chars)
2. Description/Body (max {limits.get('description', limits.get('caption', 100))} chars)
3. Call-to-Action button text

Format each variation as:
**Variation 1:**
Headline: ...
Body: ...
CTA: ...

Make them compelling, specific, and benefit-focused."""

    response = await llm_service.complete(prompt, max_tokens=600)
    return {
        "platform": req.platform,
        "product": req.product_name,
        "ad_variations": response["content"],
        "character_limits": limits,
    }


@router.post("/email-campaign")
async def generate_email_campaign(
    campaign_name: str,
    goal: str,
    target_segment: str,
    product_service: str,
    current_user: User = Depends(get_current_user)
):
    """Generate a complete email campaign sequence"""
    prompt = f"""Create a 3-email drip campaign:

Campaign: {campaign_name}
Goal: {goal}
Target: {target_segment}
Product/Service: {product_service}

Generate 3 emails in sequence:

**Email 1 - Awareness (Day 1)**
Subject: ...
Body: ... (150 words)
CTA: ...

**Email 2 - Consideration (Day 3)**
Subject: ...
Body: ... (200 words)
CTA: ...

**Email 3 - Decision/Conversion (Day 7)**
Subject: ...
Body: ... (150 words, urgency)
CTA: ...

Make each email feel personal, valuable, and natural in the sequence."""

    response = await llm_service.complete(prompt, max_tokens=1200)
    return {
        "campaign_name": campaign_name,
        "goal": goal,
        "target": target_segment,
        "email_sequence": response["content"],
        "emails_count": 3,
    }


@router.post("/campaign-analysis")
async def analyze_campaign(
    req: CampaignAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Analyze marketing campaign performance"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    import pandas as pd
    import numpy as np

    try:
        if ds.source_type == "csv":
            df = pd.read_csv(ds.file_path)
        elif ds.source_type == "excel":
            df = pd.read_excel(ds.file_path)
        elif ds.source_type == "json":
            df = pd.read_json(ds.file_path)
        else:
            raise HTTPException(400, "Unsupported file type for campaign analysis")
    except Exception as e:
        raise HTTPException(400, f"File read error: {str(e)}")

    available = [c for c in req.metrics_columns if c in df.columns]
    if not available:
        raise HTTPException(400, "None of the specified metric columns found")

    summary = {}
    for col in available:
        col_data = df[col].dropna()
        if pd.api.types.is_numeric_dtype(col_data):
            summary[col] = {
                "total": round(float(col_data.sum()), 2),
                "mean": round(float(col_data.mean()), 2),
                "max": round(float(col_data.max()), 2),
                "min": round(float(col_data.min()), 2),
            }

    # Campaign breakdown if column specified
    campaign_breakdown = {}
    if req.campaign_column and req.campaign_column in df.columns:
        for camp, group in df.groupby(req.campaign_column):
            camp_metrics = {}
            for col in available:
                if pd.api.types.is_numeric_dtype(group[col]):
                    camp_metrics[col] = round(float(group[col].sum()), 2)
            campaign_breakdown[str(camp)] = camp_metrics

    # AI insights
    context = f"Campaign metrics summary: {summary}\nCampaign breakdown: {campaign_breakdown}"
    insights = await llm_service.generate_insights({"metrics": summary, "campaigns": campaign_breakdown})

    return {
        "metrics_summary": summary,
        "campaign_breakdown": campaign_breakdown,
        "top_campaign": max(campaign_breakdown.items(),
                           key=lambda x: sum(x[1].values()) if x[1] else 0)[0] if campaign_breakdown else None,
        "ai_insights": insights,
    }


@router.post("/customer-segmentation")
async def segment_customers(
    req: SegmentationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Segment customers using ML clustering"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    result = await ml_service.cluster(
        ds.file_path, str(ds.source_type),
        req.feature_columns, req.n_segments
    )

    # Generate segment descriptions with AI
    segment_descriptions = []
    for seg in result.get("clusters", []):
        centroid = seg.get("centroid", {})
        centroid_str = ", ".join(f"{k}: {v}" for k, v in centroid.items())
        desc = await llm_service.complete(
            f"In 1 sentence, describe this customer segment based on: {centroid_str}",
            max_tokens=80
        )
        segment_descriptions.append({
            **seg,
            "description": desc["content"].strip(),
        })

    return {
        "n_segments": result["n_clusters"],
        "columns_used": result["columns_used"],
        "segments": segment_descriptions,
    }


@router.post("/trend-suggestions")
async def suggest_marketing_trends(
    industry: str,
    current_challenges: Optional[str] = None,
    target_audience: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered marketing trend suggestions"""
    prompt = f"""You are a marketing strategy expert. Suggest 5 current marketing trends for:

Industry: {industry}
Current Challenges: {current_challenges or 'Not specified'}
Target Audience: {target_audience or 'General consumers/businesses'}

For each trend provide:
1. **Trend Name**: Short name
2. **Description**: What it is (2-3 sentences)
3. **Why It Matters**: Specific relevance to this industry
4. **How to Implement**: 3 actionable steps
5. **Expected Impact**: High/Medium/Low + reasoning

Focus on trends that are actionable today with measurable ROI."""

    response = await llm_service.complete(prompt, max_tokens=1200)
    return {
        "industry": industry,
        "trends": response["content"],
        "generated_for": {
            "industry": industry,
            "audience": target_audience,
            "challenges": current_challenges,
        },
    }
