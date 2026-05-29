# WKN Dashboard Specification

## Project Overview
- **Type**: Node.js Web Application (Windows)
- **Purpose**: Query WKNs (Wertpapierkennnummern) via OpenFIGI API and return instrument data
- **Target Users**: Financial analysts, investors

## Functionality

### Core Features
1. **Single WKN Query**: Input field to query individual WKN
2. **CSV Upload**: Upload CSV file with multiple WKNs
3. **OpenFIGI Integration**: Server-side API calls to https://api.openfigi.com/v3/mapping
4. **Data Export**: Download results as CSV

### Data Fields
- WKN (Wertpapierkennnummer)
- Name (Instrument name)
- US_Ticker (US exchange ticker)
- DE_Ticker (German exchange ticker)
- EUR_Ticker (European exchange ticker)

### API Integration
- Endpoint: POST https://api.openfigi.com/v3/mapping
- Authentication: API Key in header (user provides their own key)
- Request format: Array of {idType: "ID_WERTPAPIER", idValue: "WKN"}

## UI/UX

### Layout
- Single page with header, input sections, results table
- Clean, professional financial dashboard look
- Responsive design

### Visual Design
- Colors: Dark theme (#1a1a2e, #16213e), accent blue (#0f3460), highlight (#e94560)
- Font: Inter or system sans-serif
- Cards with subtle shadows

### Components
- Header with app title
- API Key input (persisted in sessionStorage)
- Single WKN query input + button
- CSV upload drop zone + button
- Results table (sortable)
- Export CSV button

## Acceptance Criteria
1. Single WKN query returns correct data fields
2. CSV upload processes multiple WKNs
3. Results displayed in table
4. CSV export works with all fields
5. API errors handled gracefully