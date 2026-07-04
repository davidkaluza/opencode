import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DB_DIR = DATA_DIR / "chroma_db"
WATCH_DIR = DATA_DIR / "documents"

WATCHED_EXTENSIONS = {".pdf", ".txt", ".py"}
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
EMBEDDING_MODEL = "nomic-embed-text"
DEFAULT_MODEL = "llama3"

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(WATCH_DIR, exist_ok=True)
os.makedirs(DATA_DIR / "watched_folders", exist_ok=True)