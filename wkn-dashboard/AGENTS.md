# AGENTS.md — WKN Dashboard

## Quick start
```powershell
npm install
npm start        # starts on http://localhost:3000
```

## Structure
- `server.js` — Express app entrypoint, single-file backend. Port 3000.
- `public/index.html` — Vanilla JS SPA (no framework). All frontend logic inline.
- `uploads/` — multer temp file directory (gitignored, created at runtime).
- `SPEC.md` — full product spec; consult before making feature changes.

## API endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/query` | Single/batch WKN lookup (JSON body: `{wkns: string[], apiKey: string}`) |
| POST | `/api/upload` | CSV file upload with WKNs (multipart: `file`, `apiKey`) |
| GET | `/api/export` | CSV download (`?data=<json-encoded-results>`) |

## Testing
No test framework or linting is configured. Tests must be created from scratch.

## Known quirks
- OpenFIGI API key is user-provided; stored in `sessionStorage` on the frontend.
- CSV upload splits on `[\r\n,]+` — supports comma-separated or newline-separated WKNs.
- `multer` 1.x is deprecated (noted in lockfile). Upgrade if adding file handling.
- The `uploads/` dir is cleaned up per-request (temp files deleted after processing).
