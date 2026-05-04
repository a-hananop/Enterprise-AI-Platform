from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models import User, MLModel, DataSource, ModelType, TaskStatus
from app.utils.auth import get_current_user
from app.services.ml_service import MLService

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])
ml_service = MLService()


class TrainRequest(BaseModel):
    name: str
    description: Optional[str] = None
    model_type: ModelType
    data_source_id: str
    target_column: str
    feature_columns: Optional[List[str]] = None   # None = auto-select
    algorithm: Optional[str] = "auto"             # auto|random_forest|xgboost|linear
    hyperparameters: Optional[Dict[str, Any]] = {}
    test_size: float = 0.2


class PredictRequest(BaseModel):
    data: List[Dict[str, Any]]                    # Rows to predict


class ForecastRequest(BaseModel):
    data_source_id: str
    date_column: str
    value_column: str
    periods: int = 30                             # Periods to forecast
    frequency: str = "D"                          # D=daily, W=weekly, M=monthly


# ── Train Model ───────────────────────────────────────────────
@router.post("/train")
async def train_model(
    req: TrainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Train an ML model on uploaded data"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")
    if not ds.file_path:
        raise HTTPException(400, "No file associated with data source")

    ml_model = MLModel(
        name=req.name,
        description=req.description,
        model_type=req.model_type,
        algorithm=req.algorithm,
        target_column=req.target_column,
        feature_columns=req.feature_columns,
        data_source_id=req.data_source_id,
        hyperparameters=req.hyperparameters,
        status=TaskStatus.pending,
        created_by=current_user.id,
    )
    db.add(ml_model)
    db.commit()
    db.refresh(ml_model)

    background_tasks.add_task(
        _train_background, ml_model.id, ds.file_path, req, db
    )
    return {"message": "Training started", "model_id": ml_model.id, "status": "pending"}


@router.get("/models")
def list_models(
    model_type: Optional[str] = None,
    skip: int = 0, limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all trained models"""
    q = db.query(MLModel).filter(MLModel.created_by == current_user.id)
    if model_type:
        q = q.filter(MLModel.model_type == model_type)
    models = q.order_by(MLModel.created_at.desc()).offset(skip).limit(limit).all()
    return [_model_dict(m) for m in models]


@router.get("/models/{model_id}")
def get_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get model details and metrics"""
    m = _get_model(model_id, db, current_user)
    return _model_dict(m)


@router.post("/models/{model_id}/predict")
async def predict(
    model_id: str,
    req: PredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Make predictions using a trained model"""
    m = _get_model(model_id, db, current_user)
    if m.status != TaskStatus.completed:
        raise HTTPException(400, "Model is not ready yet")

    result = await ml_service.predict(m.model_path, m.model_type, req.data)
    return {
        "model": m.name,
        "predictions": result["predictions"],
        "confidence": result.get("confidence"),
        "explanation": result.get("explanation"),
    }


@router.post("/forecast")
async def forecast_time_series(
    req: ForecastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Forecast time series data using Prophet"""
    ds = db.query(DataSource).filter(DataSource.id == req.data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    result = await ml_service.forecast(
        file_path=ds.file_path,
        source_type=str(ds.source_type),
        date_col=req.date_column,
        value_col=req.value_column,
        periods=req.periods,
        frequency=req.frequency,
    )
    return result


@router.post("/anomaly-detection")
async def detect_anomalies(
    data_source_id: str,
    columns: Optional[List[str]] = None,
    contamination: float = 0.05,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect anomalies / fraud patterns in data"""
    ds = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    result = await ml_service.detect_anomalies(ds.file_path, str(ds.source_type), columns, contamination)
    return result


@router.post("/clustering")
async def run_clustering(
    data_source_id: str,
    columns: List[str],
    n_clusters: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Customer/data segmentation with K-Means"""
    ds = db.query(DataSource).filter(DataSource.id == data_source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")

    result = await ml_service.cluster(ds.file_path, str(ds.source_type), columns, n_clusters)
    return result


@router.delete("/models/{model_id}")
def delete_model(
    model_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = _get_model(model_id, db, current_user)
    import os
    if m.model_path and os.path.exists(m.model_path):
        os.remove(m.model_path)
    db.delete(m)
    db.commit()
    return {"message": "Model deleted"}


# ── Helpers ───────────────────────────────────────────────────
def _get_model(model_id: str, db: Session, user: User) -> MLModel:
    m = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not m:
        raise HTTPException(404, "Model not found")
    if m.created_by != user.id and user.role not in ["admin", "manager"]:
        raise HTTPException(403, "Access denied")
    return m


def _model_dict(m: MLModel) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "description": m.description,
        "model_type": m.model_type,
        "algorithm": m.algorithm,
        "target_column": m.target_column,
        "feature_columns": m.feature_columns,
        "status": m.status,
        "metrics": m.metrics,
        "feature_importance": m.feature_importance,
        "hyperparameters": m.hyperparameters,
        "training_duration": m.training_duration,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


async def _train_background(model_id: str, file_path: str, req: TrainRequest, db: Session):
    """Run model training in background"""
    m = db.query(MLModel).filter(MLModel.id == model_id).first()
    if not m:
        return
    try:
        m.status = TaskStatus.running
        db.commit()

        result = await ml_service.train(
            file_path=file_path,
            model_type=req.model_type,
            target_column=req.target_column,
            feature_columns=req.feature_columns,
            algorithm=req.algorithm,
            hyperparameters=req.hyperparameters,
            test_size=req.test_size,
            model_id=model_id,
        )
        m.status = TaskStatus.completed
        m.metrics = result["metrics"]
        m.feature_importance = result.get("feature_importance")
        m.model_path = result["model_path"]
        m.training_duration = result.get("duration")
        m.feature_columns = result.get("features_used", req.feature_columns)
        db.commit()
    except Exception as e:
        m.status = TaskStatus.failed
        db.commit()
        print(f"Training error: {e}")
