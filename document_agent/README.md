# Dokumenten-Agent

## Projektstruktur

```
document_agent/
├── app.py                 # Streamlit Chat-UI
├── config.py              # Konfiguration
├── document_processor.py # PDF/TXT Extraktion (inkl. OCR)
├── vector_store.py        # ChromaDB Handler
├── file_watcher.py        # Ordner-Überwachung
├── rag_engine.py          # RAG-Logik + Ollama Interface
└── requirements.txt
```

## Features

- Ordnerüberwachung für neue PDF/TXT Dateien
- OCR für gescannte Dokumente (EasyOCR)
- Vektorbasierte Suche mit ChromaDB
- RAG mit Ollama (lokal)
- Streamlit Chat-UI

## Starten

```bash
cd document_agent
pip install -r requirements.txt
ollama serve
streamlit run app.py
```

## Anforderungen

- Ollama muss lokal laufen (localhost:11434)
- Modelle müssen via `ollama pull` heruntergeladen werden