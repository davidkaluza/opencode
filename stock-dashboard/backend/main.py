from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from typing import List, Dict, Any

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# WKN to Ticker mapping for common German stocks
WKN_MAP = {
    "723610": "SAP.DE",
    "716460": "BAS.DE",
    "840100": "BAYN.DE",
    "DATX01": "DAI.DE",
    "A1EWWW": "BMW.DE",
    "A1ML7J": "VNA.DE",
    "A1JWVX": "DBK.DE",
    "A1RFDG": "DBK.DE",
    "510700": "ALV.DE",
    "A0D9PT": "SIE.DE",
    "A0JL6D": "VOD.DE",
    "A1ML7Q": "DTE.DE",
    "A2AAJ2": "ADS.DE",
    "A1RFMY": "EOAN.DE",
    "A1RX8Y": "MUV2.DE",
    "A2E4L4": "DEQ.DE",
    "A0XYHG": "FME.DE",
    "A1M93W": "FRE.DE",
    "A0F5UF": "LXS.DE",
    "A1R0LA": "TKA.DE",
    "A1E8S2": "RWE.DE",
    "A0M4V6": "EVK.DE",
    "A1XBS4": "HEI.DE",
    "A2DAJ0": "SDF.DE",
    "A0MSAG": "SZU.DE",
    "A1C8B9": "SZU.DE",
    "A0D9PU": "HNR1.DE",
    "A0L1N0": "KSP.DE",
    "A2E4E9": "PBB.DE",
    "A1X7XQ": "MTX.DE",
    "A2E4L0": "AIXA.DE",
    "A1R0BA": "G1A.DE",
    "A1X3GW": "S92.DE",
    "A1RRLE": "NUE.DE",
    "A0L1QQ": "F3R1.DE",
    "A2GS5D": "SHL.DE",
    "A0L1H0": "LHA.DE",
    "A2NBH8": "ZAL.DE",
    "A0Z2Y5": "SAX.DE",
    "A1DAHH": "AT1.DE",
    "A0M8LR": "B4B.DE",
    "A0WMPJ": "WDI.DE",
    "A1JNV1": "KCO.DE",
    "A0L1K4": "LEO.DE",
    "A1E8SW": "TTF.DE",
    "A0F5CH": "SRT3.DE",
    "A1R1A3": "M3V.DE",
    "A2NBHH": "BVB.DE",
    "A1YDDM": "COK.DE",
    "A0D9R4": "A6T.DE",
}

def resolve_symbol(symbol: str) -> str:
    """
    Resolve WKN to ticker symbol.
    If it's already a ticker, return as is.
    If it's a 6-digit WKN, try to map to ticker.
    """
    symbol = symbol.upper().strip()
    
    # Check if it's already a ticker (contains . or is a known ticker)
    if '.' in symbol or len(symbol) <= 5:
        return symbol
    
    # If it's a 6-digit WKN, try to map it
    if symbol.isdigit() and len(symbol) == 6:
        if symbol in WKN_MAP:
            return WKN_MAP[symbol]
        # Try adding .DE suffix as fallback
        return symbol + ".DE"
    
    return symbol

@app.get("/stats/{symbol}")
async def get_stats(symbol: str):
    try:
        ticker_symbol = resolve_symbol(symbol)
        ticker = yf.Ticker(ticker_symbol)
        
        # Current price
        info = ticker.fast_info
        current_price = info.last_price
        
        # Historical periods
        periods = {
            "1d": "1d",
            "1wk": "5d",
            "1mo": "1mo",
            "6mo": "6mo",
            "1y": "1y",
            "5y": "5y"
        }
        
        stats = {}
        for label, period in periods.items():
            hist = ticker.history(period=period)
            if not hist.empty:
                start_price = hist['Close'].iloc[0]
                change_abs = round(current_price - start_price, 2)
                change_pct = round(((current_price - start_price) / start_price) * 100, 2) if start_price else 0.0
                stats[label] = {"pct": change_pct, "abs": change_abs}
            else:
                stats[label] = None

        return {
            "symbol": ticker_symbol,
            "current_price": round(current_price, 2),
            "performance": stats,
            "currency": info.currency
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching stats for {symbol}: {str(e)}")

@app.get("/price/{symbol}")
async def get_price(symbol: str):
    try:
        ticker_symbol = resolve_symbol(symbol)
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.fast_info
        
        # Use fast_info for speed
        current_price = info.last_price
        previous_close = info.previous_close
        change = current_price - previous_close
        change_percent = (change / previous_close) * 100 if previous_close else 0
        
        # Get company name
        try:
            company_name = info.long_name if hasattr(info, 'long_name') else ticker.info.get('shortName', '')
        except:
            company_name = ''
        
        return {
            "symbol": ticker_symbol,
            "name": company_name,
            "price": round(current_price, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "currency": info.currency
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not find data for {symbol}. Please try the Ticker symbol (e.g., SAP.DE). Error: {str(e)}")

@app.get("/history/{symbol}")
async def get_history(symbol: str, period: str = "1mo"):
    try:
        ticker_symbol = resolve_symbol(symbol)
        ticker = yf.Ticker(ticker_symbol)
        
        # Valid yfinance periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
        hist = ticker.history(period=period)
        if hist.empty:
            raise HTTPException(status_code=404, detail="No history found")
            
        prices = hist['Close'].tolist()
        dates = hist.index.strftime('%Y-%m-%d').tolist() if hasattr(hist.index, 'strftime') else list(range(len(prices)))
        
        return {
            "symbol": ticker_symbol,
            "period": period,
            "prices": [round(p, 2) for p in prices],
            "dates": dates
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching history for {symbol} with period {period}: {str(e)}")

@app.get("/news/{symbol}")
async def get_news(symbol: str):
    try:
        ticker_symbol = resolve_symbol(symbol)
        ticker = yf.Ticker(ticker_symbol)
        news = ticker.news
        
        result = []
        for item in news[:5]: # Top 5 news
            result.append({
                "title": item.get("title"),
                "publisher": item.get("publisher"),
                "link": item.get("link"),
                "providerPublishTime": item.get("providerPublishTime")
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching news for {symbol}: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
