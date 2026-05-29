# Stock Tracker - Spezifikation

## 1. Projektübersicht

**Projektname:** Stock Tracker
**Typ:** Single-Page Webanwendung
**Kernfunktion:** Überwachung von Aktienkursen mit automatischer Aktualisierung und Nachrichtenaggregation
**Zielgruppe:** Privatanleger, die ihre Aktienwatchlist im Blick behalten möchten

## 2. Technologie-Stack

- **Framework:** React (Vite)
- **Styling:** CSS Modules / Vanilla CSS
- **APIs:**
  - Yahoo Finance API (kostenlose Aktienkurse)
  - News API (Aktiennachrichten)
- **Datenspeicherung:** localStorage (dauerhafte Watchlist)
- **Build-Tool:** Vite

## 3. Funktionsspezifikation

### 3.1 Watchlist-Verwaltung
- Aktien zur Watchlist hinzufügen (per Ticker-Symbol, z.B. AAPL, MSFT, TSLA)
- Aktien aus der Watchlist entfernen
- Watchlist wird in localStorage gespeichert und bleibt nach Reload erhalten
- Suchvorschläge während der Eingabe

### 3.2 Aktienkurse anzeigen
- Symbol, Name, aktueller Preis
- Prozentuale Veränderung (intra-day)
- Farbcodierung: grün = positiv, rot = negativ
- Letzte Aktualisierungszeit
- Auto-Refresh alle 60 Sekunden (konfigurierbar)

### 3.3 News/Informationen
- Aktuelle Nachrichten zur jeweiligen Aktie
- Überschrift, Quelle, Datum
- Verlinkung zum Originalartikel

### 3.4 Benutzeroberfläche
- **Header:** App-Titel, Refresh-Button, Intervall-Einstellung
- **Main Area:**
  - Watchlist-Formular (Input + Add Button)
  - Aktien-Karten (Grid-Layout)
  - News-Sektion pro Aktie
- **Responsive:** Desktop und Mobile optimiert

## 4. Datenfluss

```
User Input → Validate Ticker → Fetch from APIs → Update State → Render UI
                ↓
         Save to localStorage
```

## 5. API-Endpunkte

### Yahoo Finance (kein API-Key nötig)
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}
```

### News API
```
GET https://newsapi.org/v2/everything?q={SYMBOL}&apiKey={KEY}
```

## 6. Akzeptanzkriterien

- [ ] Aktien zur Watchlist hinzufügen möglich
- [ ] Watchlist bleibt nach Page-Reload erhalten
- [ ] Kurse zeigen aktuellen Preis und Veränderung
- [ ] Auto-Refresh funktioniert im konfigurierten Intervall
- [ ] News werden für ausgewählte Aktien angezeigt
- [ ] Responsive Design funktioniert auf Mobile/Desktop
- [ ] Fehlerbehandlung bei ungültigen Ticker-Symbolen
