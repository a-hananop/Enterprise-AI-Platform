"""
RAG Service - Document indexing and semantic retrieval
Uses: Supabase (pgvector) via vecs + sentence-transformers
"""
import os
import uuid
from typing import List, Dict, Optional
from app.config import settings

try:
    import vecs
    VECS_AVAILABLE = True
except ImportError:
    VECS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False


class RAGService:
    def __init__(self):
        self.client = None
        self.collection = None
        self.encoder = None
        self._initialized = False

    def _ensure_init(self):
        if self._initialized:
            return
        try:
            if VECS_AVAILABLE:
                # Initialize vecs client with PostgreSQL connection
                self.client = vecs.create_client(settings.DATABASE_URL)
                # Create or get the collection. MiniLM-L6-v2 uses 384 dimensions.
                self.collection = self.client.get_or_create_collection(
                    name=settings.VECS_COLLECTION_NAME,
                    dimension=384
                )
            if ST_AVAILABLE:
                self.encoder = SentenceTransformer(settings.EMBEDDING_MODEL)
            self._initialized = True
        except Exception as e:
            print(f"RAG init error: {e}")
            self._initialized = True

    async def index_document(self, file_path: str, source_type: str, doc_id: str) -> List[str]:
        """Extract text, chunk, embed and store in Supabase (pgvector)"""
        self._ensure_init()
        if not self.collection or not self.encoder:
            return []

        # Extract text
        text = await self._extract_text(file_path, source_type)
        if not text:
            return []

        # Chunk text
        chunks = self._chunk_text(text, chunk_size=500, overlap=50)

        # Create embeddings and store
        chunk_ids = []
        batch_size = 50
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            ids = [f"{doc_id}_{i+j}" for j, _ in enumerate(batch)]
            embeddings = self.encoder.encode(batch).tolist()
            
            records = []
            for j, chunk_text in enumerate(batch):
                records.append((
                    ids[j],
                    embeddings[j],
                    {"text": chunk_text, "doc_id": doc_id, "chunk_index": i+j, "source": os.path.basename(file_path)}
                ))
            
            # Upsert into vecs collection
            self.collection.upsert(records=records)
            chunk_ids.extend(ids)

        return chunk_ids

    async def retrieve(self, query: str, doc_ids: Optional[List[str]] = None, top_k: int = 5) -> Dict:
        """Retrieve relevant chunks for a query"""
        self._ensure_init()
        if not self.collection or not self.encoder:
            return {"chunks": [], "query": query}

        try:
            query_embedding = self.encoder.encode([query]).tolist()[0]
            filters = {"doc_id": {"$in": doc_ids}} if doc_ids else None

            # vecs returns list of tuples: (id, distance, metadata) when include_value and include_metadata are True
            results = self.collection.query(
                data=query_embedding,
                limit=top_k,
                filters=filters,
                include_value=True,
                include_metadata=True,
            )

            chunks = []
            for res in results:
                # Handle varying tuple unpack depending on vecs version behavior
                if len(res) == 3:
                    chunk_id, dist, meta = res
                else:
                    chunk_id, dist, meta = res[0], 1.0, {} # Fallback
                
                chunks.append({
                    "text": meta.get("text", ""),
                    "source": meta.get("source", "unknown"),
                    "doc_id": meta.get("doc_id"),
                    "chunk_index": meta.get("chunk_index", 0),
                    "score": round(1 - dist, 4), # Convert distance to similarity score
                })

            return {"chunks": chunks, "query": query}
        except Exception as e:
            print(f"RAG retrieval error: {e}")
            return {"chunks": [], "query": query}

    def delete_document(self, doc_id: str):
        """Remove a document's chunks from the vector store"""
        self._ensure_init()
        if not self.collection:
            return
        try:
            self.collection.delete(filters={"doc_id": {"$eq": doc_id}})
        except Exception as e:
            print(f"Delete error: {e}")

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        step = chunk_size - overlap
        for i in range(0, len(words), step):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        return chunks

    async def _extract_text(self, file_path: str, source_type: str) -> str:
        """Extract text content from various file types"""
        try:
            if source_type in ["pdf"]:
                return self._extract_pdf(file_path)
            elif source_type in ["docx"]:
                return self._extract_docx(file_path)
            elif source_type in ["txt"]:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            elif source_type in ["csv", "excel", "json"]:
                return self._extract_tabular(file_path, source_type)
        except Exception as e:
            print(f"Text extraction error: {e}")
        return ""

    def _extract_pdf(self, file_path: str) -> str:
        try:
            import pdfplumber
            text = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text.append(t)
            return "\n".join(text)
        except Exception:
            try:
                import PyPDF2
                with open(file_path, "rb") as f:
                    reader = PyPDF2.PdfReader(f)
                    return "\n".join(p.extract_text() or "" for p in reader.pages)
            except Exception:
                return ""

    def _extract_docx(self, file_path: str) -> str:
        try:
            from docx import Document
            doc = Document(file_path)
            return "\n".join(p.text for p in doc.paragraphs if p.text)
        except Exception:
            return ""

    def _extract_tabular(self, file_path: str, source_type: str) -> str:
        try:
            import pandas as pd
            if source_type == "csv":
                df = pd.read_csv(file_path)
            elif source_type == "excel":
                df = pd.read_excel(file_path)
            elif source_type == "json":
                df = pd.read_json(file_path)
            else:
                return ""
            return df.to_string(index=False, max_rows=200)
        except Exception:
            return ""

    def get_stats(self) -> Dict:
        """Get vector store statistics"""
        self._ensure_init()
        if not self.collection:
            return {"total_chunks": 0, "available": False}
        try:
            # vecs collection count is unfortunately not exposed via a simple .count() or len()
            # but we can try to return available status
            return {"total_chunks": "N/A", "available": True}
        except Exception:
            return {"total_chunks": 0, "available": False}
