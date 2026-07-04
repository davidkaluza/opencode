import os
import sys
import logging
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).parent))

from config import DB_DIR, DEFAULT_MODEL, EMBEDDING_MODEL, WATCH_DIR
from vector_store import VectorStore
from rag_engine import RAGEngine, OllamaConnection
from document_processor import DocumentProcessor
from file_watcher import FolderWatcher, scan_folder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@st.cache_resource
def get_vector_store():
    return VectorStore()


@st.cache_resource
def get_rag_engine():
    return RAGEngine(get_vector_store(), EMBEDDING_MODEL)


def init_session_state():
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "vector_store" not in st.session_state:
        st.session_state.vector_store = get_vector_store()
    if "rag_engine" not in st.session_state:
        st.session_state.rag_engine = get_rag_engine()
    if "watcher" not in st.session_state:
        st.session_state.watcher = FolderWatcher(DocumentProcessor())
    if "ollama_available" not in st.session_state:
        st.session_state.ollama_available = OllamaConnection.is_available()
    if "indexing_status" not in st.session_state:
        st.session_state.indexing_status = None


def get_ollama_models() -> list[str]:
    models = OllamaConnection.list_models()
    return [m.get("name", m.get("model", "")) for m in models if m.get("name") or m.get("model")]


def add_folder(path: str, progress_callback=None):
    try:
        st.session_state.watcher.add_folder(path)
        files = scan_folder(path, DocumentProcessor())

        if not files:
            return {"success": True, "indexed": 0, "failed": 0}

        results = st.session_state.rag_engine.index_files_parallel(
            files,
            progress_callback=progress_callback
        )

        indexed = sum(1 for r in results if r.get("success"))
        failed = sum(1 for r in results if not r.get("success") and r.get("error") != "unchanged")

        return {"success": True, "indexed": indexed, "failed": failed}

    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    st.set_page_config(page_title="Dokumenten-Agent", page_icon="📄")
    st.title("📄 Dokumenten-Analyse-Agent")

    init_session_state()

    with st.sidebar:
        st.header("Einstellungen")

        if not st.session_state.ollama_available:
            st.error("Ollama nicht verfügbar. Bitte starten Sie Ollama.")
            return

        available_models = get_ollama_models()
        if not available_models:
            st.warning("Keine Modelle gefunden. Laden Sie ein Modell herunter.")
            return

        selected_model = st.selectbox("Modell:", available_models, index=0)

        with st.expander("Ordner überwachen"):
            folder_input = st.text_input("Pfad:", placeholder="C:\\Dokumente")
            if st.button("Hinzufügen", type="primary"):
                if folder_input:
                    progress_bar = st.progress(0)
                    status_text = st.empty()

                    def progress(current, total, file_path):
                        progress_bar.progress(current / total)
                        status_text.text(f"Indexiere: {Path(file_path).name}")

                    result = add_folder(folder_input, progress_callback=progress)
                    progress_bar.empty()
                    status_text.empty()

                    if result.get("success"):
                        st.success(f"Indexiert: {result.get('indexed', 0)} Dateien")
                        if result.get("failed", 0) > 0:
                            st.warning(f"Fehlgeschlagen: {result.get('failed')}")
                    else:
                        st.error(f"Fehler: {result.get('error', 'Unbekannt')}")

            watched = st.session_state.watcher.get_watched_folders()
            if watched:
                st.write("Überwachte Ordner:")
                for fw in watched:
                    st.text(f"📁 {fw}")

        st.divider()

        with st.expander("Datenbank-Status"):
            doc_count = st.session_state.vector_store.get_document_count()
            st.metric("Dokumente in DB", doc_count)

            if st.button("DB neu initialisieren"):
                st.session_state.vector_store.clear()
                st.success("Datenbank gelöscht")

        st.divider()

        if st.button("Chat leeren"):
            st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Stellen Sie eine Frage zu Ihren Dokumenten..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            response_container = st.empty()
            full_response = ""

            for chunk in st.session_state.rag_engine.generate_response(prompt, selected_model):
                full_response += chunk
                response_container.markdown(full_response + "▌")

            response_container.markdown(full_response)
            st.session_state.messages.append({"role": "assistant", "content": full_response})


if __name__ == "__main__":
    main()