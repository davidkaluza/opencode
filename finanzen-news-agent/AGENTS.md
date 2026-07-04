# AGENTS.md — finanzen-news-agent

## Quick start

```powershell
pip install -r requirements.txt
python main.py          # polling loop (interval from config.json)
python main.py --once   # single run
```

## Architecture

- `main.py` — entrypoint, loop logic, dedup (titles only)
- `scraper.py` — fetches RSS feeds via `feedparser`, filters by keyword, returns `[{title, url}]`
- `notifier.py` — sends HTML email via SMTP (Gmail default)
- `config.json` — RSS URLs, keywords, email/SMTP credentials (committed)
- `last_news.json` — tracks seen article titles (persisted, committed)

Run flow: `main.py` -> `scraper.get_news()` -> compare with `last_news.json` titles -> `notifier.send_email()` for new ones -> save `last_news.json`

## Conventions

- **Language**: German (all output, variable names, comments)
- **Config-driven**: everything in `config.json` (no `.env` used despite `python-dotenv` in requirements)
- **Secrets**: Gmail app password lives in `config.json` (already committed)
- **Dedup**: title-based via `last_news.json`; no hash, no ID, no date comparison

## Quirks

- `feedparser` is the only third-party library actually used; `requests`, `beautifulsoup4`, and `python-dotenv` are declared in `requirements.txt` but **not imported anywhere**
- No `.gitignore` — `__pycache__/`, `last_news.json` are tracked
- No tests, no linting/typecheck config — only command is `python main.py [--once]`
- Python 3.12 (inferred from `__pycache__`)
- Keywords filter: title must be >20 chars AND match any keyword (case-insensitive)
- Topics limited to first 20 entries per feed
