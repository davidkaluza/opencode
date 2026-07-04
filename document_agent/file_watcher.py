import logging
import threading
from pathlib import Path

from watchdog.events import FileSystemEventHandler, FileSystemEvent
from watchdog.observers import Observer

from config import WATCHED_EXTENSIONS, WATCH_DIR
from document_processor import DocumentProcessor

logger = logging.getLogger(__name__)


class DocumentHandler(FileSystemEventHandler):
    def __init__(self, processor: DocumentProcessor, index_callback=None):
        super().__init__()
        self.processor = processor
        self.index_callback = index_callback
        self._processing = set()

    def _is_valid_file(self, path: str) -> bool:
        return Path(path).suffix.lower() in WATCHED_EXTENSIONS

    def _process_file(self, file_path: Path):
        if str(file_path) in self._processing:
            return
        self._processing.add(str(file_path))
        try:
            if self.index_callback:
                self.index_callback(file_path)
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
        finally:
            self._processing.discard(str(file_path))

    def on_created(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._is_valid_file(event.src_path):
            logger.info(f"New file detected: {event.src_path}")
            self._process_file(Path(event.src_path))

    def on_modified(self, event: FileSystemEvent):
        if event.is_directory:
            return
        if self._is_valid_file(event.src_path):
            logger.info(f"Modified file detected: {event.src_path}")
            self._process_file(Path(event.src_path))


class FolderWatcher:
    def __init__(self, processor: DocumentProcessor, index_callback=None):
        self.processor = processor
        self.index_callback = index_callback
        self.observer = None
        self.watched_paths = set()

    def add_folder(self, folder_path: str):
        path = Path(folder_path).resolve()
        if not path.exists():
            raise ValueError(f"Folder does not exist: {folder_path}")
        if not path.is_dir():
            raise ValueError(f"Path is not a directory: {folder_path}")

        if self.observer is None:
            self.observer = Observer()
            self.observer.start()

        handler = DocumentHandler(self.processor, self.index_callback)
        self.observer.schedule(handler, str(path), recursive=False)
        self.watched_paths.add(str(path))
        logger.info(f"Watching folder: {path}")

    def remove_folder(self, folder_path: str):
        path = Path(folder_path).resolve()
        self.watched_paths.discard(str(path))
        logger.info(f"Stopped watching: {path}")

    def stop(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()
            self.observer = None

    def get_watched_folders(self) -> list[str]:
        return list(self.watched_paths)


def scan_folder(folder_path: str, processor: DocumentProcessor, index_callback=None) -> list[Path]:
    found_files = []
    for ext in WATCHED_EXTENSIONS:
        found_files.extend(Path(folder_path).rglob(f"*{ext}"))
    return found_files