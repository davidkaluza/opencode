# Stock Dashboard

Zwei Dienste: FastAPI-Backend (yfinance) + Vite/React/Tailwind-Frontend.

## Befehle

```bash
backend> python main.py                   # Port 8000
frontend> npm install && npm run dev      # Port 5173
```

`start.bat` startet beide (Windows). Docker: `docker compose up --build`.

## API (`localhost:8000`)

| Endpunkt | Notiz |
|---|---|
| `GET /price/{symbol}` | Kurs, Änderung, Name, Währung |
| `GET /stats/{symbol}` | Performance % (1d/1wk/1mo/6mo/1y/5y) |
| `GET /history/{symbol}?period=1mo` | OHLC-Schlusskurse + Daten |
| `GET /news/{symbol}` | Top-5-News |

Alle nutzen `yfinance` – kein Cache, keine DB, keine Rate-Limits.

## Symbol-Auflösung (`main.py:71-90`)

WKN via `WKN_MAP` (~50 Einträge). 6-stellige unbekannte WKNs bekommen `.DE`-Suffix. Alles andere wird direkt an yfinance durchgereicht.

## Backend

Single-File `backend/main.py`. Kein Package, keine Router, kein Config-Management. Abhängigkeiten: `fastapi`, `uvicorn`, `yfinance`, `pandas`.

## Frontend

- **State**: localStorage `accounts`/`activeAccountId`/`viewMode`. Auto-Refresh alle 60s.
- **API-Base** hartkodiert in `App.jsx:8` (`http://localhost:8000`).
- **Kein `vite.config.js`** — reine Vite-Standards.
- **Deps**: React 18, recharts, lucide-react, axios, Tailwind 3.
- **Tailwind**: custom colors `background/surface:#33312B`, `accent:#C09537`, `muted:#888888`; Font-Sizes `xs-mono`/`sm-mono`/`title-mono`/`table-mono`.
- **Schrift**: JetBrains Mono (Google Fonts, über `index.html` geladen).
- **Scripts**: nur `dev`/`build`/`preview` — keine Tests, Lint oder Typecheck.
- **Card-Sortierung**: Name/Preis/Wert/Rendite/Tage – clientseitig sortiert.
- **Print-CSS**: Nur `#print-area` (TableView), A4-Hochformat. Bestimmte Spalten ausgeblendet.

## Toter Code

`NewsPanel.jsx` existiert, wird nirgends importiert.

## CSV-Export/Import

Semikolon (`;`), UTF-8-BOM, Spalten `TICKER;NAME;ANZAHL;KAUFKURS;DATUM`. Import erkennt `;` oder `,` automatisch.
