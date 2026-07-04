# Stock Dashboard

FastAPI (yfinance) Backend + Vite/React/Tailwind Frontend. Single-file backend (`main.py`), SPA frontend with `recharts`, `lucide-react`, `axios`.

## Commands

```
cd backend && python main.py            # Port 8001 (prod: API + built frontend from dist/)
cd frontend && npm run dev              # Port 5173 (dev, API at localhost:8001)
cd frontend && npm run build            # Build dist/ for single-server production mode
start.bat                               # Both in parallel (Windows, named windows)
docker compose up                         # Single container (multi-stage build: frontend dist bundled into backend)
```

**Single-server flow**: `npm run build` → `python main.py` serves `frontend/dist/` static files alongside the API on port 8001. In dev mode (`npm run dev`) the Vite dev server proxies nothing — API calls go to `localhost:8001` directly.

## Version

Shown in the UI header as `Stock_Dashboard_v0_1_0`. Source of truth: `frontend/package.json`.

## Changelog

Changes tracked in `CHANGELOG.md` at project root.

## Quirks

| What | Where | Detail |
|---|---|---|
| NaN patching | `main.py:35-44` | Monkey-patches `JSONResponse.render` to strip NaN/Inf from yfinance/pandas output before JSON serialization |
| WKN resolution | `main.py:110-129` | WKN_MAP (~50 entries) maps German WKNs → tickers. Unknown 6-digit codes get `.DE` suffix. Else passed raw to yfinance |
| Search endpoint | `main.py:484-538` | `/search?q=...&limit=10` — three-tier fallback: WKN_MAP → yf.Search → direct ticker |
| `.old` dead files | `frontend/src/components/*.jsx.old`, `backend/main.old.py` | `.jsx.old` stale variants, `main.old.py` old backend — kept but unused. `NewsPanel.jsx` also unused |
| No `.gitignore` | root | `node_modules/`, `__pycache__/`, `dist/` are checked in |
| No `vite.config.js` | — | Vite defaults only (plugin-react, tailwind via postcss). No proxy, no alias config |
| No lint/test/typecheck | — | Only `dev`, `build`, `preview` scripts exist |
| Dockerfiles | `backend/Dockerfile`, `frontend/Dockerfile` | Backend: python:3.11-slim (uvicorn). Frontend: node:20 build → nginx serve stage |
| Font/Colors | `index.html:10`, `index.css:5-10` | JetBrains Mono from Google Fonts. Colors defined via CSS custom properties (`--bg-background`, `--bg-surface`, `--clr-accent`, `--clr-muted`) |

## API (`localhost:8001`)

| Endpoint | Notes |
|---|---|
| `GET /price/{symbol}` | Price, change, name, currency via `fast_info` |
| `GET /stats/{symbol}` | Performance % 1d/1wk/1mo/6mo/1y/5y |
| `GET /history/{symbol}` | OHLC prices. Query: `?period=1mo` or `?start=YYYY-MM-DD` |
| `GET /news/{symbol}` | Top 5 news items |
| `GET /detail/{symbol}` | Fundamentals (PE, div, beta, 52w range, sector) + analyst targets |
| `GET /search?q=...&limit=10` | Search stocks by name/ticker/WKN. Returns `symbol, name, exchange, type` |

## Frontend state

All persisted to `localStorage`:
- `accounts` — array of depots, each with: `watchlist[]`, `purchasePrices{}`, `shareQuantities{}`, `purchaseDates{}`, `oldShares[]`, `insiderBuys[]`
- `activeTab` — account ID or `'insider'` (which tab is active)
- `insiderLookbackDays` — global lookback (1–365) for insider G/V calculation
- `stockData`, `statsData`, `historyData` — cached API responses
- `viewMode` (`"cards"` | `"table"`), `colorSettings`

Auto-refresh every 60s (fetches data for all watchlist + insider buy symbols). API base URL: `import.meta.env.DEV ? 'http://localhost:8001' : ''` (same-origin in prod).

Card view has sortable columns (name/price/value/rendite/days). Table view has A4 print support via CSS `@media print`.

Insider buys tab shows entries from all depots with a global lookback (1–365 days via +/- buttons). G/V calculated from purchase date + N days forward; returns 0 if not enough history.

## CSV import/export

Semicolon (`;`) delimiter, UTF-8 BOM. Columns: `DEPOT;TICKER;NAME;ANZAHL;KAUFKURS;DATUM`. Import auto-detects `;` or `,`.
