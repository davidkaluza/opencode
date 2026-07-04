import logging
import concurrent.futures
from typing import Generator, Callable

import ollama
import requests

from config import EMBEDDING_MODEL
from document_processor import DocumentProcessor
from vector_store import VectorStore

logger = logging.getLogger(__name__)


class OllamaConnection:
    @staticmethod
    def is_available() -> bool:
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=2)
            return response.status_code == 200
        except Exception:
            return False

    @staticmethod
    def list_models() -> list[dict]:
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get("models", [])
            return []
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    @staticmethod
    def pull_model(model: str) -> Generator[str, None, None]:
        try:
            with requests.post("http://localhost:11434/api/pull", json={"name": model}, stream=True) as r:
                for line in r.iter_lines():
                    if line:
                        try:
                            data = line.decode()
                            yield data
                        except Exception:
                            continue
        except Exception as e:
            yield f'{{"error": "{str(e)}"}}'


class RAGEngine:
    def __init__(self, vector_store: VectorStore, embedding_model: str = EMBEDDING_MODEL, max_workers: int = 4):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.processor = DocumentProcessor()
        self.max_workers = max_workers

    def get_embedding(self, text: str) -> list[float]:
        response = ollama.embeddings(model=self.embedding_model, prompt=text)
        return response.get("embedding", [])

    def get_batch_embeddings(self, texts: list[str], progress_callback: Callable[[int, int], None] = None) -> list[list[float]]:
        all_embeddings = []
        batch_size = 32

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = ollama.embeddings(model=self.embedding_model, prompt=batch)
                if isinstance(response, dict) and "embedding" in response:
                    all_embeddings.append(response["embedding"])
                else:
                    for text in batch:
                        emb_response = ollama.embeddings(model=self.embedding_model, prompt=text)
                        all_embeddings.append(emb_response.get("embedding", []))
            except Exception as e:
                logger.warning(f"Batch embedding failed, falling back to individual: {e}")
                for text in batch:
                    emb_response = ollama.embeddings(model=self.embedding_model, prompt=text)
                    all_embeddings.append(emb_response.get("embedding", []))

            if progress_callback:
                progress_callback(min(i + batch_size, len(texts)), len(texts))

        return all_embeddings

    def search_relevant_chunks(self, query: str, top_k: int = 5) -> list[dict]:
        query_embedding = self.get_embedding(query)
        return self.vector_store.similarity_search(query_embedding, top_k=top_k)

    def generate_response(self, query: str, model: str, stream: bool = True):
        relevant_chunks = self.search_relevant_chunks(query, top_k=5)

        if not relevant_chunks:
            yield "Ich konnte keine relevanten Informationen in den Dokumenten finden."
            return

        context = "\n\n---\n\n".join([
            f"[Quelle: {hit['metadata'].get('source', 'unbekannt')}]\n{hit['content']}"
            for hit in relevant_chunks
        ])

        prompt = f"""Du beantwortest Fragen basierend auf den folgenden Dokument-Inhalten.
Beziehe dich nur auf Informationen aus den bereitgestellten Dokumenten.
Wenn die Frage nicht beantwortet werden kann, sage das ehrlich.

=== KONTEXT ===
{context}

=== FRAGE ===
{query}

=== ANTWORT ==="""

        try:
            if stream:
                response = ollama.generate(
                    model=model,
                    prompt=prompt,
                    stream=True
                )
                for chunk in response:
                    if chunk.get("response"):
                        yield chunk["response"]
            else:
                response = ollama.generate(model=model, prompt=prompt, stream=False)
                yield response.get("response", "")
        except Exception as e:
            logger.error(f"Generation error: {e}")
            yield f"Fehler bei der Generierung: {str(e)}"

    def index_file(self, file_path, progress_callback: Callable[[int, int, str], None] = None) -> dict:
        result = {"success": False, "chunks": 0, "error": None, "pages": 0, "ocr_pages": 0}
        try:
            proc_result = self.processor.process_file(file_path)

            if not proc_result.success:
                result["error"] = proc_result.error or "processing_failed"
                return result

            if self.vector_store.has_file(str(file_path), proc_result.file_hash):
                logger.info(f"File unchanged: {file_path}")
                result["success"] = False
                result["error"] = "unchanged"
                return result

            if not proc_result.chunks:
                result["error"] = "no_content"
                return result

            self.vector_store.remove_document(str(file_path))

            def progress(current, total):
                if progress_callback:
                    progress_callback(current, total, str(file_path))

            embeddings = self.get_batch_embeddings(proc_result.chunks, progress_callback)

            self.vector_store.add_document(str(file_path), proc_result.file_hash, proc_result.chunks, embeddings)
            logger.info(f"Indexed {len(proc_result.chunks)} chunks from {file_path}")
            result["success"] = True
            result["chunks"] = len(proc_result.chunks)
            result["pages"] = proc_result.pages_processed
            result["ocr_pages"] = proc_result.ocr_pages

        except Exception as e:
            logger.error(f"Indexing error for {file_path}: {e}")
            result["error"] = str(e)

        return result

    def index_files_parallel(self, file_paths: list, progress_callback: Callable[[int, int, str], None] = None) -> list[dict]:
        results = []
        completed = 0
        total = len(file_paths)

        def index_with_progress(fp):
            return self.index_file(fp, lambda c, t, f: progress_callback(completed + c, total, f))

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(index_with_progress, fp): fp for fp in file_paths}
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                results.append(result)
                completed += 1
                if progress_callback:
                    progress_callback(completed, total, str(futures[future]))

        return results