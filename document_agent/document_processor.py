import hashlib
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

import fitz
from PIL import Image

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

from config import CHUNK_SIZE, CHUNK_OVERLAP

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    success: bool
    file_hash: str
    text: str
    chunks: list[str]
    error: Optional[str] = None
    pages_processed: int = 0
    ocr_pages: int = 0


class DocumentProcessor:
    def __init__(self):
        self.reader = None
        if EASYOCR_AVAILABLE:
            try:
                self.reader = easyocr.Reader(["en", "de"], gpu=False)
            except Exception as e:
                logger.warning(f"EasyOCR initialization failed: {e}")

    def compute_file_hash(self, file_path: Path) -> str:
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            h.update(f.read())
        return h.hexdigest()

    def extract_text_from_pdf(self, pdf_path: Path) -> tuple[str, int, int]:
        text_parts = []
        pages_processed = 0
        ocr_pages = 0
        doc = fitz.open(str(pdf_path))

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            pages_processed += 1

            if text.strip():
                text_parts.append(f"--- Seite {page_num + 1} ---\n{text}")
            elif self.reader:
                pix = page.get_pixmap(dpi=150)
                img_path = pdf_path.with_suffix(".tmp.png")
                pix.save(str(img_path))

                try:
                    results = self.reader.readtext(str(img_path))
                    ocr_text = " ".join([r[1] for r in results])
                    if ocr_text.strip():
                        text_parts.append(f"--- Seite {page_num + 1} (OCR) ---\n{ocr_text}")
                        ocr_pages += 1
                except Exception as e:
                    logger.warning(f"OCR failed for page {page_num}: {e}")
                finally:
                    if img_path.exists():
                        img_path.unlink()

        doc.close()
        return "\n".join(text_parts), pages_processed, ocr_pages

    def extract_text_from_txt(self, txt_path: Path) -> tuple[str, int, int]:
        encodings = ["utf-8", "latin-1", "cp1252"]
        for enc in encodings:
            try:
                text = txt_path.read_text(encoding=enc)
                return text, 1, 0
            except UnicodeDecodeError:
                continue
        return txt_path.read_text(encoding="utf-8", errors="ignore"), 1, 0

    def extract_text(self, file_path: Path) -> tuple[str, int, int]:
        ext = file_path.suffix.lower()
        if ext == ".pdf":
            return self.extract_text_from_pdf(file_path)
        elif ext in {".txt", ".py"}:
            return self.extract_text_from_txt(file_path)
        return "", 0, 0

    def chunk_text(self, text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
        if not text.strip():
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size
            chunk = text[start:end]

            if start > 0:
                overlap_start = max(0, start - overlap)
                overlap_text = text[overlap_start:start]
                chunk = overlap_text + chunk

            chunks.append(chunk.strip())
            start += chunk_size - overlap

        return [c for c in chunks if c] or [text[:chunk_size]]

    def process_file(self, file_path: Path) -> ProcessingResult:
        try:
            file_hash = self.compute_file_hash(file_path)
            text, pages_processed, ocr_pages = self.extract_text(file_path)

            if not text.strip():
                return ProcessingResult(
                    success=False,
                    file_hash=file_hash,
                    text="",
                    chunks=[],
                    error="no_content",
                    pages_processed=pages_processed,
                    ocr_pages=ocr_pages
                )

            chunks = self.chunk_text(text)

            return ProcessingResult(
                success=True,
                file_hash=file_hash,
                text=text,
                chunks=chunks,
                pages_processed=pages_processed,
                ocr_pages=ocr_pages
            )

        except Exception as e:
            logger.error(f"Processing error for {file_path}: {e}")
            return ProcessingResult(
                success=False,
                file_hash="",
                text="",
                chunks=[],
                error=str(e)
            )