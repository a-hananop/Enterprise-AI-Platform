from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Enterprise AI Decision Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production-32chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = "sqlite:///./data/enterprise_ai.db"

    # AI APIs (Free Tiers)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash" # Options: gemini-1.5-flash, gemini-1.5-pro
    HF_TOKEN: str = ""

    # Vector DB
    CHROMA_PERSIST_DIR: str = "./data/vectors"
    CHROMA_COLLECTION_NAME: str = "enterprise_docs"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # NLP Models
    SENTIMENT_MODEL: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    NER_MODEL: str = "dslim/bert-base-NER"
    SUMMARIZATION_MODEL: str = "facebook/bart-large-cnn"
    CLASSIFICATION_MODEL: str = "facebook/bart-large-mnli"

    # Files
    UPLOAD_DIR: str = "./data/uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = "csv,xlsx,json,pdf,docx,txt,mp3,wav"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [e.strip() for e in self.ALLOWED_EXTENSIONS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs("./data/models", exist_ok=True)
os.makedirs("./data", exist_ok=True)
