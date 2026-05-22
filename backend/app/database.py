from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True, # Recommended for PostgreSQL
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from app.models import (
        User, DataSource, ChatSession, ChatMessage,
        MLModel, NLPTask, AgentTask, Report,
        KPIMetric, ActivityLog, Alert
    )
    Base.metadata.create_all(bind=engine)
