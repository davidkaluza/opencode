import yfinance as yf
from fastapi import FastAPI, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(title="WKN Dashboard")
app.mount("/static", StaticFiles(directory="static"), name="static")

def isin_check_digit(nsin):
    digits = []
    for c in nsin:
        if c.isdigit():
            digits.append(int(c))
        else:
            val = ord(c) - 55
            digits.append(val // 10)
            digits.append(val % 10)
    digits.reverse()
    total = 0
    for i, d in enumerate(digits):
        if (i + 1) % 2 == 1:
            d *= 2
            if d >= 10:
                d = (d // 10) + (d % 10)
        total += d
    return (10 - total % 10) % 10

def get_price(info):
    price = info.get("currentPrice") or info.get("regularMarketPrice")
    currency = info.get("currency")
    price_eur = None
    if price and currency and currency != "EUR":
        try:
            fx = yf.Ticker(f"{currency}EUR=X")
            fx_info = fx.info or {}
            fx_rate = fx_info.get("regularMarketPrice") or fx_info.get("currentPrice")
            if fx_rate and fx_rate > 0:
                price_eur = round(price / fx_rate, 2)
        except:
            pass
    return price, currency, price_eur

@app.get("/")
async def root():
    return FileResponse("static/index.html")

@app.get("/api/search")
async def search(wkn: str = Query(..., description="WKN, ISIN oder Ticker")):
    q = wkn.strip().upper()
    result = {"query": q, "ticker": None, "name": None, "price": None,
              "currency": None, "price_eur": None, "error": None}

    isin = None
    if len(q) == 12:
        isin = q
    elif len(q) == 6 and q.isalnum() and q[0].isdigit():
        isin = f"DE000{q}{isin_check_digit(f'DE000{q}')}"

    if isin:
        try:
            ticker = yf.Ticker(isin)
            info = ticker.info or {}
            if info.get("symbol"):
                result["ticker"] = info["symbol"]
                result["name"] = info.get("shortName") or info.get("longName")
                price, currency, price_eur = get_price(info)
                result["price"] = price
                result["currency"] = currency
                result["price_eur"] = price_eur
                return result
        except:
            pass

    try:
        ticker = yf.Ticker(q)
        info = ticker.info or {}
        if info.get("symbol"):
            result["ticker"] = info["symbol"]
            result["name"] = info.get("shortName") or info.get("longName")
            price, currency, price_eur = get_price(info)
            result["price"] = price
            result["currency"] = currency
            result["price_eur"] = price_eur
            return result
    except:
        pass

    result["error"] = "Keine Daten gefunden"
    if len(q) == 6 and q.isalnum() and not q[0].isdigit():
        result["error"] += " – Alphanumerische WKN (z.B. ETF) wird nicht unterstützt. Bitte ISIN oder Ticker eingeben."

    return result

@app.get("/api/lookup")
async def lookup(ticker: str = Query(..., description="Yahoo Ticker")):
    try:
        t = yf.Ticker(ticker.upper())
        info = t.info or {}
        if info.get("symbol"):
            price, currency, price_eur = get_price(info)
            return {"ticker": info["symbol"], "name": info.get("shortName") or info.get("longName"),
                    "price": price, "currency": currency, "price_eur": price_eur}
    except:
        pass
    return {"error": "Ticker nicht gefunden"}

@app.get("/api/search-name")
async def search_name(name: str = Query(..., description="Name zum Suchen")):
    try:
        s = yf.Search(name)
        quotes = s.quotes if hasattr(s, "quotes") and s.quotes else []
        results = [{"symbol": q.get("symbol"), "name": q.get("shortname") or q.get("longname"),
                     "exchange": q.get("exchange")} for q in quotes[:10]]
        return {"results": results}
    except:
        return {"results": []}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
