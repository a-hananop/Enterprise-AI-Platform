"""
Fraud & Risk Detection API
Anomaly detection, fraud scoring, risk assessment, alerts
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import numpy as np

from app.database import get_db
from app.models import User, DataSource, Alert
from app.utils.auth import get_current_user
from app.services.ml_service import MLService
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/risk", tags=["Fraud & Risk Detection"])
ml_service = MLService()
llm_service = LLMService()


class AnomalyRequest(BaseModel):
    data_source_id: str
    columns: Optional[List[str]] = None
    contamination: float = 0.05   # Expected fraud rate (5% default)
    sensitivity: str = "medium"    # low|medium|high


class RiskScoringRequest(BaseModel):
    data_source_id: str
    feature_columns: List[str]
    high_risk_threshold: float = 0.8
    medium_risk_threshold: float = 0.5


class TransactionMonitorRequest(BaseModel):
    transactions: List[Dict[str, Any]]
    flag_rules: Optional[Dict[str, Any]] = {}


# ── Anomaly Detection ──────────────────────────────────────────
@router.post("/anomaly-detection")
async def detect_anomalies(
    req: AnomalyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect anomalies and potential fraud in dataset"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")
    if str(ds.source_type) not in ["csv", "excel", "json"]:
        raise HTTPException(400, "Anomaly detection requires tabular data (CSV, Excel, JSON)")

    # Adjust contamination based on sensitivity
    sensitivity_map = {"low": 0.02, "medium": 0.05, "high": 0.10}
    contamination = sensitivity_map.get(req.sensitivity, req.contamination)

    result = await ml_service.detect_anomalies(
        ds.file_path, str(ds.source_type),
        req.columns, contamination
    )

    # Create alert if anomalies found
    if result.get("anomalies_found", 0) > 0:
        severity = "critical" if result["anomaly_rate"] > 10 else "warning"
        alert = Alert(
            title=f"Anomalies Detected in {ds.name}",
            message=f"Found {result['anomalies_found']} anomalies ({result['anomaly_rate']}% rate) in dataset '{ds.name}'",
            alert_type="anomaly",
            severity=severity,
            metric_name="anomaly_rate",
            metric_value=result["anomaly_rate"],
            user_id=current_user.id,
        )
        db.add(alert)
        db.commit()

    # AI explanation
    if result.get("anomalies_found", 0) > 0:
        explanation = await llm_service.complete(
            f"""Explain these anomaly detection results for a business user:
- Dataset: {ds.name}
- Total records: {result['total_records']}
- Anomalies found: {result['anomalies_found']} ({result['anomaly_rate']}%)
- Columns analyzed: {result['columns_analyzed']}
- Sensitivity: {req.sensitivity}

Provide: 1) What this means, 2) Likely causes, 3) Recommended actions (3 bullet points)""",
            max_tokens=300
        )
        result["ai_explanation"] = explanation["content"]

    return result


# ── Risk Scoring ───────────────────────────────────────────────
@router.post("/risk-scoring")
async def score_risk(
    req: RiskScoringRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Score records by risk level using ML"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    import pandas as pd
    from sklearn.preprocessing import MinMaxScaler

    try:
        if str(ds.source_type) == "csv":
            df = pd.read_csv(ds.file_path)
        elif str(ds.source_type) == "excel":
            df = pd.read_excel(ds.file_path)
        else:
            df = pd.read_json(ds.file_path)
    except Exception as e:
        raise HTTPException(400, f"File read error: {str(e)}")

    available_cols = [c for c in req.feature_columns if c in df.columns]
    if not available_cols:
        raise HTTPException(400, "None of the specified feature columns found")

    X = df[available_cols].select_dtypes(include=[np.number]).fillna(0)
    if X.empty:
        raise HTTPException(400, "No numeric columns available for risk scoring")

    # Normalize and compute composite risk score
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    risk_scores = X_scaled.mean(axis=1)

    df["risk_score"] = risk_scores
    df["risk_level"] = df["risk_score"].apply(
        lambda s: "high" if s >= req.high_risk_threshold
        else "medium" if s >= req.medium_risk_threshold
        else "low"
    )

    risk_summary = df["risk_level"].value_counts().to_dict()
    high_risk_records = df[df["risk_level"] == "high"].head(20)

    return {
        "total_records": len(df),
        "risk_distribution": risk_summary,
        "high_risk_count": risk_summary.get("high", 0),
        "medium_risk_count": risk_summary.get("medium", 0),
        "low_risk_count": risk_summary.get("low", 0),
        "high_risk_percentage": round(risk_summary.get("high", 0) / len(df) * 100, 2),
        "top_high_risk_records": high_risk_records[available_cols + ["risk_score", "risk_level"]].to_dict("records"),
        "columns_used": available_cols,
        "thresholds": {
            "high": req.high_risk_threshold,
            "medium": req.medium_risk_threshold,
        },
    }


# ── Transaction Monitoring ─────────────────────────────────────
@router.post("/transaction-monitor")
async def monitor_transactions(
    req: TransactionMonitorRequest,
    current_user: User = Depends(get_current_user)
):
    """Monitor transactions for fraud patterns using rule-based + AI"""
    flagged = []
    clean = []

    # Built-in fraud rules
    default_rules = {
        "high_amount_threshold": 10000,
        "velocity_limit": 5,  # max transactions per hour
        "unusual_hours": [0, 1, 2, 3, 4, 5],  # midnight to 5am
    }
    rules = {**default_rules, **req.flag_rules}

    for txn in req.transactions:
        flags = []
        risk_score = 0

        # Rule: High amount
        amount = txn.get("amount", txn.get("value", 0))
        if isinstance(amount, (int, float)) and amount > rules["high_amount_threshold"]:
            flags.append(f"High amount: ${amount:,.2f}")
            risk_score += 40

        # Rule: Round number (often fraudulent)
        if isinstance(amount, (int, float)) and amount > 0 and amount % 1000 == 0:
            flags.append("Suspicious round number amount")
            risk_score += 15

        # Rule: Unusual hour
        hour = txn.get("hour", txn.get("transaction_hour", -1))
        if hour in rules["unusual_hours"]:
            flags.append(f"Unusual hour: {hour}:00")
            risk_score += 25

        # Rule: Custom flags from request
        for field, threshold in req.flag_rules.items():
            if field in txn and isinstance(threshold, (int, float)):
                if isinstance(txn[field], (int, float)) and txn[field] > threshold:
                    flags.append(f"{field} exceeds threshold ({txn[field]} > {threshold})")
                    risk_score += 20

        txn_result = {
            **txn,
            "risk_score": min(risk_score, 100),
            "risk_level": "high" if risk_score >= 60 else "medium" if risk_score >= 30 else "low",
            "flags": flags,
            "is_flagged": len(flags) > 0,
        }

        if flags:
            flagged.append(txn_result)
        else:
            clean.append(txn_result)

    return {
        "total_transactions": len(req.transactions),
        "flagged_count": len(flagged),
        "clean_count": len(clean),
        "fraud_rate": round(len(flagged) / len(req.transactions) * 100, 2) if req.transactions else 0,
        "flagged_transactions": flagged,
        "rules_applied": list(rules.keys()),
    }


# ── Risk Report ────────────────────────────────────────────────
@router.post("/risk-report")
async def generate_risk_report(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate comprehensive risk assessment report"""
    ds = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    prompt = f"""Generate a comprehensive Risk Assessment Report for:

Dataset: {ds.name}
Records: {ds.row_count or 'Unknown'}
Columns: {ds.column_count or 'Unknown'}
Column Info: {str(ds.columns_info)[:500] if ds.columns_info else 'Not available'}

Create a structured risk report:

## 🔴 Risk Assessment Report: {ds.name}

### Executive Summary
[2-3 sentences on overall risk posture]

### Risk Categories Identified
1. **Data Quality Risks**: Missing values, outliers, inconsistencies
2. **Operational Risks**: Process gaps, compliance concerns
3. **Business Risks**: Revenue impact, customer risk

### Risk Matrix
| Risk | Likelihood | Impact | Priority |
|------|-----------|--------|----------|
| [Risk 1] | High/Med/Low | High/Med/Low | 1-5 |
[Add 4-5 rows]

### Top Risk Findings
[3-5 specific findings with supporting evidence]

### Recommended Mitigations
[For each risk: specific, actionable mitigation]

### Risk Monitoring Plan
[Key metrics and thresholds to watch]

### Conclusion
[Overall risk rating: Low/Moderate/High/Critical + justification]"""

    response = await llm_service.complete(prompt, max_tokens=1200)
    return {
        "dataset": ds.name,
        "risk_report": response["content"],
    }
