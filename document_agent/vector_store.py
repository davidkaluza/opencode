import json
import logging
from pathlib import Path

import chromadb
from chromadb.config import Settings

from config import DB_DIR, EMBEDDING_MODEL

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, persist_directory: str = str(DB_DIR)):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
        self.meta_file = Path(persist_directory) / "file_metadata.json"
        self.file_metadata = self._load_metadata()

    def _load_metadata(self) -> dict:
        if self.meta_file.exists():
            try:
                return json.loads(self.meta_file.read_text())
            except Exception:
                return {}
        return {}

    def _save_metadata(self):
        self.meta_file.write_text(json.dumps(self.file_metadata, indent=2))

    def get_file_hash(self, file_path: str) -> str | None:
        return self.file_metadata.get(str(file_path, "unknown"))

    def has_file(self, file_path: str, file_hash: str) -> bool:
        return self.file_metadata.get(str(file_path)) == file_hash

    def add_document(self, file_path: str, file_hash: str, chunks: list[str], embeddings: list[list[float]]):
        doc_id = str(file_path)
        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=[{"source": file_path, "chunk_index": i} for i in range(len(chunks))]
        )
        self.file_metadata[str(file_path)] = file_hash
        self._save_metadata()

    def remove_document(self, file_path: str):
        doc_id = str(file_path)
        result = self.collection.get(where={"source": file_path})
        if result and result.get("ids"):
            self.collection.delete(ids=result["ids"])
        if str(file_path) in self.file_metadata:
            del self.file_metadata[str(file_path)]
            self._save_metadata()

    def similarity_search(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        result = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        hits = []
        if result and result.get("documents"):
            for i in range(len(result["documents"][0])):
                hits.append({
                    "content": result["documents"][0][i],
                    "metadata": result["metadatas"][0][i] if result.get("metadatas") else {},
                    "distance": result["distances"][0][i] if result.get("distances") else 0
                })
        return hits

    def get_document_count(self) -> int:
        return self.collection.count()

    def clear(self):
        self.client.delete_collection("documents")
        self.collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
        self.file_metadata = {}
        if self.meta_file.exists():
            self.meta_file.unlink()