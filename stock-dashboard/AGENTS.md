# Stock Dashboard

Two-service app: FastAPI backend (yfinance) + Vite/React/Tailwind frontend.

## Dev quick start

```bash
# Backend (port 8000)
cd backend; pip install -r requirements.txt; python main.py

# Frontend (port 5173) — separate terminal
cd frontend; npm install; npm run dev
```

`start.bat` launches both with one click (Windows).

## Architecture

```
stock-dashboard/
  backend/main.py     — FastAPI, port 8000
  frontend/src/       — Vite + React 18 + Tailwind, dev 5173 / prod 80 (nginx)
  docker-compose.yml  — both services
```

No `vite.config.js` — uses Vite defaults. API base is hardcoded `localhost:8000` in `App.jsx:6-8` (same for dev & prod; `NODE_ENV` check is dead code). In Docker, frontend nginx serves `dist/` and still proxies to `localhost:8000`.

## API endpoints (localhost:8000)

| Endpoint | Notes |
|---|---|
| `GET /price/{symbol}` | current price, change, name, currency |
| `GET /stats/{symbol}` | perf % for 1d, 1wk, 1y, 5y |
| `GET /history/{symbol}?period=1mo` | OHLC close + dates |
| `GET /news/{symbol}` | top 5 news items |

`symbol` accepts yahoo tickers (`.DE` suffix) or German 6-digit WKN — mapped via `WKN_MAP` in `main.py:18-69`. Unknown WKNs get `.DE` fallback (`resolve_symbol` at `main.py:71-90`).

## Frontend quirks

- **No tests, no lint config, no typecheck.** Only `dev`/`build`/`preview` scripts.
- LocalStorage-based state: watchlist, purchase prices, share quantities. Survives refresh.
- Auto-refetches all data every 60s (`App.jsx:71`).
- Tailwind custom theme: `bg-[#0a0a0a]`, `surface:[#121212]`, `accent:[#333]`, `muted:[#888]`. Custom font sizes `xs-mono`/`sm-mono`.
- Recharts for sparklines; `lucide-react` for icons.
- `NewsPanel.jsx` component exists but is **not wired into any view** — dead code.
- CSS: `@tailwind` directives + custom JetBrains Mono font + styled scrollbar.

## Backend quirks

- CORS wide open (`allow_origins=["*"]`).
- yfinance for all market data. No env vars, no config.
- `WKN_MAP` in `main.py:18-69` maps ~50 German WKNs to tickers.
- No database, no caching.

## Docker

```bash
docker compose up --build   # backend:8000, frontend:80
```

## No CI, no linter, no tests

None configured. No `.github`, `.vscode`, pre-commit, or lint scripts.
