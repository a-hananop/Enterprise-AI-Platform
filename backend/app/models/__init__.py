"""
All database models for the Enterprise AI Platform
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────
class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    analyst = "analyst"
    viewer = "viewer"


class DataSourceType(str, enum.Enum):
    csv = "csv"
    excel = "excel"
    json = "json"
    pdf = "pdf"
    docx = "docx"
    txt = "txt"
    api = "api"
    database = "database"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ModelType(str, enum.Enum):
    classification = "classification"
    regression = "regression"
    clustering = "clustering"
    forecasting = "forecasting"
    anomaly = "anomaly"


# ─────────────────────────────────────────
# USER MODEL
# ─────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.analyst)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    data_sources = relationship("DataSource", back_populates="owner")
    chat_sessions = relationship("ChatSession", back_populates="user")
    ml_models = relationship("MLModel", back_populates="created_by_user")
    activity_logs = relationship("ActivityLog", back_populates="user")


# ─────────────────────────────────────────
# DATA SOURCE MODEL
# ─────────────────────────────────────────
class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(Enum(DataSourceType), nullable=False)
    file_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    columns_info = Column(JSON, nullable=True)       # [{name, dtype, nulls, uniques}]
    preview_data = Column(JSON, nullable=True)        # First 5 rows
    is_indexed = Column(Boolean, default=False)        # Indexed in vector DB
    vector_ids = Column(JSON, nullable=True)           # ChromaDB chunk IDs
    tags = Column(JSON, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="data_sources")


# ─────────────────────────────────────────
# CHAT SESSION & MESSAGES
# ─────────────────────────────────────────
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"))
    data_source_ids = Column(JSON, nullable=True)   # List of attached data sources
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)  # [{doc_name, chunk, score}]
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


# ─────────────────────────────────────────
# ML MODEL
# ─────────────────────────────────────────
class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    model_type = Column(Enum(ModelType), nullable=False)
    algorithm = Column(String, nullable=True)          # e.g. RandomForest, XGBoost
    target_column = Column(String, nullable=True)
    feature_columns = Column(JSON, nullable=True)
    data_source_id = Column(String, ForeignKey("data_sources.id"), nullable=True)
    model_path = Column(String, nullable=True)         # Saved model file path
    status = Column(Enum(TaskStatus), default=TaskStatus.pending)
    metrics = Column(JSON, nullable=True)              # accuracy, rmse, etc.
    feature_importance = Column(JSON, nullable=True)   # {feature: importance}
    hyperparameters = Column(JSON, nullable=True)
    training_duration = Column(Float, nullable=True)   # seconds
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    created_by_user = relationship("User", back_populates="ml_models")


# ─────────────────────────────────────────
# NLP TASK
# ─────────────────────────────────────────
class NLPTask(Base):
    __tablename__ = "nlp_tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    task_type = Column(String, nullable=False)   # sentiment|ner|classification|summary|keywords
    input_text = Column(Text, nullable=True)
    data_source_id = Column(String, ForeignKey("data_sources.id"), nullable=True)
    target_column = Column(String, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.pending)
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────
# AGENT TASK
# ─────────────────────────────────────────
class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    agent_type = Column(String, nullable=False)  # data|research|finance|marketing|report
    goal = Column(Text, nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.pending)
    steps = Column(JSON, nullable=True)          # [{step, action, result, timestamp}]
    final_output = Column(Text, nullable=True)
    data_source_ids = Column(JSON, nullable=True)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


# ─────────────────────────────────────────
# GENERATED REPORT
# ─────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    report_type = Column(String, nullable=True)       # business|sales|marketing|risk
    content = Column(Text, nullable=True)              # Markdown content
    data_sources = Column(JSON, nullable=True)
    file_path = Column(String, nullable=True)
    schedule = Column(String, nullable=True)           # cron expression
    is_scheduled = Column(Boolean, default=False)
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())


# ─────────────────────────────────────────
# KPI / METRIC TRACKING
# ─────────────────────────────────────────
class KPIMetric(Base):
    __tablename__ = "kpi_metrics"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)          # sales|finance|marketing|ops
    value = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    target_value = Column(Float, nullable=True)
    change_percent = Column(Float, nullable=True)
    trend = Column(String, nullable=True)             # up|down|stable
    data_source_id = Column(String, ForeignKey("data_sources.id"), nullable=True)
    recorded_at = Column(DateTime, server_default=func.now())
    created_by = Column(String, ForeignKey("users.id"))


# ─────────────────────────────────────────
# ACTIVITY LOG
# ─────────────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)            # upload_data|run_model|chat|export
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="activity_logs")


# ─────────────────────────────────────────
# ALERT / NOTIFICATION
# ─────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(String, nullable=True)     # anomaly|threshold|forecast|system
    severity = Column(String, default="info")      # info|warning|critical
    is_read = Column(Boolean, default=False)
    metric_name = Column(String, nullable=True)
    metric_value = Column(Float, nullable=True)
    threshold_value = Column(Float, nullable=True)
    user_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
