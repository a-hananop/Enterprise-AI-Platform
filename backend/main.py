"""
Enterprise AI Decision Intelligence Platform — Main Application
"""
import os
import sys
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from loguru import logger

from app.config import settings
from app.database import create_tables

from app.api.auth      import router as auth_router
from app.api.data      import router as data_router
from app.api.chat      import router as chat_router
from app.api.ml        import router as ml_router
from app.api.nlp       import router as nlp_router
from app.api.analytics import router as analytics_router
from app.api.agents    import router as agents_router
from app.api.documents import router as documents_router, meeting_router
from app.api.marketing import router as marketing_router
from app.api.genai     import router as genai_router
from app.api.risk      import router as risk_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    create_tables()
    _seed_demo_users()
    logger.info("✅ Database ready")
    logger.info(f"🤖 Groq  : {'✅ Connected' if settings.GROQ_API_KEY else '⚠️  Add GROQ_API_KEY to .env'}")
    logger.info(f"📖 Docs  : http://localhost:8000/docs")
    logger.info("─" * 50)
    yield
    logger.info("👋 Server stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        ms = round((time.time() - start) * 1000, 1)
        if request.url.path.startswith("/api"):
            logger.debug(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
        return response

    for r in [
        auth_router, data_router, chat_router, ml_router, nlp_router,
        analytics_router, agents_router, documents_router, meeting_router,
        marketing_router, genai_router, risk_router,
    ]:
        app.include_router(r)

    @app.get("/api/health", tags=["System"])
    def health():
        return {"status": "healthy", "version": settings.APP_VERSION, "groq_configured": bool(settings.GROQ_API_KEY)}

    @app.get("/api/system/info", tags=["System"])
    def system_info():
        return {
            "platform": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "capabilities": {
                "data_management": True, "ai_chat_rag": True, "machine_learning": True,
                "nlp": True, "analytics_bi": True, "ai_agents": True,
                "document_intelligence": True, "meeting_intelligence": True,
                "generative_ai": bool(settings.GROQ_API_KEY or settings.GEMINI_API_KEY),
            },
            "free_apis_used": {
                "groq": "LLM inference — 14,400 req/day free",
                "chromadb": "Vector DB — local, unlimited",
                "sentence_transformers": "Embeddings — local, free",
                "huggingface": "NLP models — local, free",
                "scikit_learn": "ML — local, free",
            },
        }

    @app.exception_handler(Exception)
    async def global_error(request: Request, exc: Exception):
        logger.error(f"Error on {request.url.path}: {exc}")
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    return app


def _seed_demo_users():
    """
    Creates or force-updates demo users using bcrypt directly.
    Runs every startup to repair any corrupted hashes.
    """
    import bcrypt
    from app.database import SessionLocal
    from app.models import User, UserRole

    demo_users = [
        {"email": "admin@enterprise-ai.com",   "username": "admin",   "password": "admin123",   "full_name": "Platform Admin",   "role": UserRole.admin   },
        {"email": "manager@enterprise-ai.com", "username": "manager", "password": "manager123", "full_name": "Business Manager", "role": UserRole.manager },
        {"email": "analyst@enterprise-ai.com", "username": "analyst", "password": "analyst123", "full_name": "Data Analyst",     "role": UserRole.analyst },
        {"email": "viewer@enterprise-ai.com",  "username": "viewer",  "password": "viewer123",  "full_name": "Report Viewer",    "role": UserRole.viewer  },
    ]

    db = SessionLocal()
    try:
        for u in demo_users:
            # Hash using bcrypt directly — no passlib involved
            pw_bytes = u["password"].encode("utf-8")
            hashed   = bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")

            # Quick self-check before saving
            if not bcrypt.checkpw(pw_bytes, hashed.encode("utf-8")):
                logger.error(f"Hash self-check failed for {u['email']} — skipping")
                continue

            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                existing.hashed_password = hashed
                existing.is_active = True
            else:
                db.add(User(
                    email=u["email"],
                    username=u["username"],
                    hashed_password=hashed,
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True,
                ))

        db.commit()
        logger.info("✅ Demo accounts ready:")
        logger.info("   admin@enterprise-ai.com   / admin123   (Admin)")
        logger.info("   manager@enterprise-ai.com / manager123 (Manager)")
        logger.info("   analyst@enterprise-ai.com / analyst123 (Analyst)")
        logger.info("   viewer@enterprise-ai.com  / viewer123  (Viewer)")

    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


app = create_app()

if __name__ == "__main__":
    import uvicorn

    # On Windows, reload mode starts a child process and Ctrl+C can print a noisy
    # CancelledError/KeyboardInterrupt traceback during an otherwise clean shutdown.
    # Keep direct `python main.py` runs quiet unless reload is explicitly requested.
    reload_enabled = os.getenv("UVICORN_RELOAD", "").lower() in {"1", "true", "yes", "on"}

    if sys.platform.startswith("win") and reload_enabled:
        logger.warning("Windows reload mode may print noisy shutdown tracebacks on Ctrl+C.")

    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=reload_enabled,
            log_level="warning",
        )
    except KeyboardInterrupt:
        logger.info("Shutdown interrupted by user")
