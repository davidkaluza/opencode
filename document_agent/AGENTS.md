# Development Commands

## Run App
```bash
cd document_agent
pip install -r requirements.txt
ollama serve
streamlit run app.py
```

## Test
```bash
python -c "from document_processor import DocumentProcessor; print('OK')"
```

## Lint (if available)
```bash
ruff check document_agent/
```