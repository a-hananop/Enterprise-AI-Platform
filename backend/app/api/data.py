import os
import json
import uuid
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, DataSource, DataSourceType, ActivityLog
from app.utils.auth import get_current_user
from app.services.data_service import DataService
from app.services.rag_service import RAGService
from app.config import settings

router = APIRouter(prefix="/api/data", tags=["Data Management"])
data_service = DataService()
rag_service = RAGService()


@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    index_for_rag: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a dataset or document file"""
    ext = file.filename.split(".")[-1].lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(400, f"File type .{ext} not allowed")

    file_size = 0
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        file_size = len(content)

    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(400, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    # Parse file info
    source_type = _get_source_type(ext)
    metadata = await data_service.extract_metadata(file_path, source_type)

    ds = DataSource(
        name=name or file.filename,
        description=description,
        source_type=source_type,
        file_path=file_path,
        file_size=file_size,
        row_count=metadata.get("row_count"),
        column_count=metadata.get("column_count"),
        columns_info=metadata.get("columns_info"),
        preview_data=metadata.get("preview_data"),
        tags=json.loads(tags) if tags else [],
        owner_id=current_user.id,
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    # Index for RAG in background
    if index_for_rag and source_type in [DataSourceType.pdf, DataSourceType.docx, DataSourceType.txt]:
        background_tasks.add_task(_index_document, ds.id, file_path, source_type, db)

    # Log
    db.add(ActivityLog(user_id=current_user.id, action="upload_data",
                       resource_type="data_source", resource_id=ds.id,
                       details={"filename": file.filename, "size": file_size}))
    db.commit()

    return {"message": "File uploaded successfully", "data_source": _ds_dict(ds)}


@router.get("/sources")
def list_sources(
    source_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all data sources (admin/manager see all, others see their own)"""
    if current_user.role in ["admin", "manager"]:
        q = db.query(DataSource)
    else:
        q = db.query(DataSource).filter(DataSource.owner_id == current_user.id)
    if source_type:
        q = q.filter(DataSource.source_type == source_type)
    sources = q.order_by(DataSource.created_at.desc()).offset(skip).limit(limit).all()
    total = q.count()
    return {"total": total, "sources": [_ds_dict(s) for s in sources]}


@router.get("/sources/{source_id}")
def get_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get data source details"""
    ds = _get_ds(source_id, db, current_user)
    return _ds_dict(ds)


@router.get("/sources/{source_id}/preview")
async def preview_data(
    source_id: str,
    rows: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview data source contents"""
    ds = _get_ds(source_id, db, current_user)
    data = await data_service.preview(ds.file_path, ds.source_type, rows)
    return {"data": data, "columns": ds.columns_info}


@router.get("/sources/{source_id}/stats")
async def data_stats(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistical summary of a dataset"""
    ds = _get_ds(source_id, db, current_user)
    if ds.source_type not in [DataSourceType.csv, DataSourceType.excel, DataSourceType.json]:
        raise HTTPException(400, "Stats only available for tabular data")
    stats = await data_service.compute_stats(ds.file_path, ds.source_type)
    return stats


@router.post("/sources/{source_id}/clean")
async def clean_data(
    source_id: str,
    operations: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply data cleaning operations"""
    ds = _get_ds(source_id, db, current_user)
    result = await data_service.clean_data(ds.file_path, ds.source_type, operations)
    return result


@router.delete("/sources/{source_id}")
def delete_source(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a data source"""
    ds = _get_ds(source_id, db, current_user)
    if ds.file_path and os.path.exists(ds.file_path):
        os.remove(ds.file_path)
    # Remove from vector store
    if ds.is_indexed:
        try:
            rag_service.delete_document(source_id)
        except Exception:
            pass
    db.delete(ds)
    db.commit()
    return {"message": "Data source deleted"}


@router.get("/storage/stats")
def storage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get storage statistics"""
    sources = db.query(DataSource).filter(DataSource.owner_id == current_user.id).all()
    total_size = sum(s.file_size or 0 for s in sources)
    by_type = {}
    for s in sources:
        t = s.source_type
        by_type[t] = by_type.get(t, {"count": 0, "size": 0})
        by_type[t]["count"] += 1
        by_type[t]["size"] += s.file_size or 0
    return {
        "total_files": len(sources),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_type": by_type,
    }


# ── Helpers ──────────────────────────────────────────────────
def _get_ds(source_id: str, db: Session, user: User) -> DataSource:
    ds = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not ds:
        raise HTTPException(404, "Data source not found")
    if ds.owner_id != user.id and user.role not in ["admin", "manager"]:
        raise HTTPException(403, "Access denied")
    return ds


def _get_source_type(ext: str) -> DataSourceType:
    mapping = {
        "csv": DataSourceType.csv,
        "xlsx": DataSourceType.excel,
        "xls": DataSourceType.excel,
        "json": DataSourceType.json,
        "pdf": DataSourceType.pdf,
        "docx": DataSourceType.docx,
        "txt": DataSourceType.txt,
    }
    return mapping.get(ext, DataSourceType.txt)


def _ds_dict(ds: DataSource) -> dict:
    return {
        "id": ds.id,
        "name": ds.name,
        "description": ds.description,
        "source_type": ds.source_type,
        "file_size": ds.file_size,
        "row_count": ds.row_count,
        "column_count": ds.column_count,
        "columns_info": ds.columns_info,
        "preview_data": ds.preview_data,
        "is_indexed": ds.is_indexed,
        "tags": ds.tags,
        "created_at": ds.created_at.isoformat() if ds.created_at else None,
        "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
    }


async def _index_document(ds_id: str, file_path: str, source_type: str, db_session_factory=None):
    """Background task: index document for RAG"""
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        rag = RAGService()
        source_str = source_type.value if hasattr(source_type, 'value') else str(source_type)
        if source_str.startswith("DataSourceType."):
            source_str = source_str.replace("DataSourceType.", "")

        # Resolve absolute path in case a relative path was stored
        abs_file_path = file_path
        if not os.path.isabs(file_path):
            abs_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), file_path)

        if not os.path.exists(abs_file_path):
            print(f"RAG indexing error: file not found at {abs_file_path}")
            return

        chunks = await rag.index_document(abs_file_path, source_str, ds_id)
        ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
        if ds:
            ds.is_indexed = len(chunks) > 0
            ds.vector_ids = chunks
            db.commit()
            print(f"RAG indexed {len(chunks)} chunks for doc {ds_id}")
    except Exception as e:
        print(f"RAG indexing error: {e}")
    finally:
        if 'db' in locals():
            db.close()
