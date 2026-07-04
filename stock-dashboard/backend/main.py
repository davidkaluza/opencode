import json
import numpy as np
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import JSONResponse
import yfinance as yf
import pandas as pd
from typing import List, Dict, Any


def clean_nans(obj):
    if isinstance(obj, dict):
        return {k: clean_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nans(v) for v in obj]
    elif isinstance(obj, (np.floating,)):
        v = float(obj)
        return None if (np.isnan(v) or np.isinf(v)) else v
    elif isinstance(obj, float):
        return None if (np.isnan(obj) or np.isinf(obj)) else obj
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, (np.ndarray,)):
        return clean_nans(obj.tolist())
    return obj


original_render = JSONResponse.render


def json_safe_render(self, content):
    content = clean_nans(content)
    return json.dumps(
        content,
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


JSONResponse.render = json_safe_render

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
            "1d": "2d",
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
                if start_price and abs((current_price - start_price) / start_price) < 100:
                    change_pct = round(((current_price - start_price) / start_price) * 100, 2)
                    stats[label] = {"pct": change_pct, "abs": change_abs}
                else:
                    stats[label] = None
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
async def get_history(symbol: str, period: str = "1mo", start: str = None):
    try:
        ticker_symbol = resolve_symbol(symbol)
        ticker = yf.Ticker(ticker_symbol)
        
        if start:
            hist = ticker.history(start=start)
        else:
            hist = ticker.history(period=period)
        if hist.empty:
            raise HTTPException(status_code=404, detail="No history found")
            
        closes = hist['Close']
        valid = [
            (d.strftime('%Y-%m-%d'), round(float(p), 2))
            for d, p in zip(hist.index, closes)
            if pd.notna(p)
        ] if hasattr(hist.index, 'strftime') else [
            (str(i), round(float(p), 2))
            for i, p in enumerate(closes)
            if pd.notna(p)
        ]
        prices = [v[1] for v in valid]
        dates = [v[0] for v in valid]

        return {
            "symbol": ticker_symbol,
            "period": period,
            "start": start,
            "prices": prices,
            "dates": dates
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching history for {symbol}: {str(e)}")

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

@app.get("/detail/{symbol}")
async def get_detail(symbol: str):
    try:
        ticker_symbol = resolve_symbol(symbol)
        ticker = yf.Ticker(ticker_symbol)

        fi = ticker.fast_info
        info = {}

        try:
            info = ticker.info
        except Exception:
            pass

        analyst = {}
        try:
            pt = ticker.analyst_price_target or ticker.analyst_price_targets or {}
            analyst["priceTargets"] = {
                "current": pt.get("current"),
                "mean": pt.get("mean"),
                "median": pt.get("median"),
                "high": pt.get("high"),
                "low": pt.get("low"),
            }
        except Exception:
            pass

        try:
            rs = ticker.recommendations_summary
            if rs is not None and not rs.empty:
                analyst["recommendations"] = {
                    k: int(v) for k, v in rs.iloc[0].to_dict().items()
                }
        except Exception:
            pass

        try:
            ee = ticker.earnings_estimate
            if ee is not None and not ee.empty:
                analyst["earningsEstimate"] = []
                for idx, row in ee.iterrows():
                    analyst["earningsEstimate"].append({
                        "period": str(idx),
                        "avg": round(row.get("avg", 0), 2) if pd.notna(row.get("avg")) else None,
                        "low": round(row.get("low", 0), 2) if pd.notna(row.get("low")) else None,
                        "high": round(row.get("high", 0), 2) if pd.notna(row.get("high")) else None,
                    })
        except Exception:
            pass

        try:
            re = ticker.revenue_estimate
            if re is not None and not re.empty:
                analyst["revenueEstimate"] = []
                for idx, row in re.iterrows():
                    analyst["revenueEstimate"].append({
                        "period": str(idx),
                        "avg": round(row.get("avg", 0), 2) if pd.notna(row.get("avg")) else None,
                        "low": round(row.get("low", 0), 2) if pd.notna(row.get("low")) else None,
                        "high": round(row.get("high", 0), 2) if pd.notna(row.get("high")) else None,
                    })
        except Exception:
            pass

        try:
            ge = ticker.growth_estimates
            if ge is not None and not ge.empty:
                analyst["growthEstimates"] = {}
                for idx, row in ge.iterrows():
                    val = None
                    for c in ge.columns:
                        if pd.notna(row[c]):
                            val = round(row[c], 2)
                            break
                    analyst["growthEstimates"][str(idx)] = val
        except Exception:
            pass

        def g(v, fallback=None):
            return v if v is not None else fallback

        return {
            "symbol": ticker_symbol,
            "name": g(info.get("longName"), info.get("shortName", "")),
            "currency": g(getattr(fi, "currency", None), info.get("currency", "")),
            "price": g(getattr(fi, "last_price", None), info.get("currentPrice", 0)),
            "previousClose": g(getattr(fi, "previous_close", None), info.get("previousClose")),
            "marketCap": g(getattr(fi, "market_cap", None), info.get("marketCap")),
            "peRatio": g(getattr(fi, "trailing_pe", None), info.get("trailingPE")),
            "forwardPE": g(getattr(fi, "forward_pe", None), info.get("forwardPE")),
            "dividendYield": g(getattr(fi, "dividend_yield", None), info.get("dividendYield")),
            "dividendRate": g(getattr(fi, "dividend_rate", None), info.get("dividendRate")),
            "beta": g(getattr(fi, "beta", None), info.get("beta")),
            "high52w": g(getattr(fi, "year_high", None), info.get("fiftyTwoWeekHigh")),
            "low52w": g(getattr(fi, "year_low", None), info.get("fiftyTwoWeekLow")),
            "avgVolume": g(getattr(fi, "average_volume", None), info.get("averageVolume")),
            "volume": g(getattr(fi, "volume", None), info.get("volume")),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "employees": info.get("fullTimeEmployees"),
            "website": info.get("website"),
            "country": info.get("country"),
            "exchange": info.get("exchange"),
            "analyst": analyst,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching detail for {symbol}: {str(e)}")


def normalize_search_result(item: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Normalize yfinance search result objects to a small, stable frontend shape.
    """
    if not isinstance(item, dict):
        return None

    symbol = item.get("symbol") or item.get("ticker")
    if not symbol:
        return None

    name = (
        item.get("shortname")
        or item.get("longname")
        or item.get("name")
        or item.get("displayName")
        or ""
    )

    exchange = (
        item.get("exchange")
        or item.get("exchDisp")
        or item.get("exchangeName")
        or ""
    )

    quote_type = item.get("quoteType") or item.get("typeDisp") or item.get("type") or ""

    return {
        "symbol": str(symbol).upper(),
        "name": name,
        "exchange": exchange,
        "type": quote_type,
    }


def dedupe_search_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    unique = []

    for item in results:
        symbol = item.get("symbol")
        exchange = item.get("exchange") or ""
        key = (symbol, exchange)

        if not symbol or key in seen:
            continue

        seen.add(key)
        unique.append(item)

    return unique


def search_with_yfinance(query: str, limit: int) -> List[Dict[str, Any]]:
    """
    Use yfinance's Search API when available.
    The yfinance API has changed across versions, so this function is intentionally defensive.
    """
    results = []

    try:
        search = yf.Search(query, max_results=limit)
        quotes = getattr(search, "quotes", None) or []
        for item in quotes:
            normalized = normalize_search_result(item)
            if normalized:
                results.append(normalized)
    except Exception:
        pass

    return results


def search_with_query_module(query: str, limit: int) -> List[Dict[str, Any]]:
    """
    Fallback for yfinance versions that expose yahoo.query.search instead of yf.Search.
    """
    results = []

    try:
        from yfinance import query as yf_query

        response = yf_query.search(query)
        quotes = response.get("quotes", []) if isinstance(response, dict) else []

        for item in quotes[:limit]:
            normalized = normalize_search_result(item)
            if normalized:
                results.append(normalized)
    except Exception:
        pass

    return results


def search_with_wkn_map(query: str, limit: int) -> List[Dict[str, Any]]:
    q = query.upper().strip()
    results = []

    for wkn, ticker in WKN_MAP.items():
        if q in wkn or q in ticker.upper():
            results.append({
                "symbol": ticker,
                "name": f"WKN {wkn}",
                "exchange": "Germany",
                "type": "Equity",
            })

        if len(results) >= limit:
            break

    return results


@app.get("/search")
async def search_stocks(q: str, limit: int = 10):
    """
    Search stocks by company name, ticker or WKN.

    Frontend response shape:
    [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "exchange": "NASDAQ",
        "type": "EQUITY"
      }
    ]
    """
    query = q.strip()

    if len(query) < 2:
        return []

    safe_limit = max(1, min(limit, 20))
    upper_query = query.upper()

    results: List[Dict[str, Any]] = []

    # Exact WKN match first, so German WKN input remains fast and deterministic.
    if upper_query in WKN_MAP:
        results.append({
            "symbol": WKN_MAP[upper_query],
            "name": f"WKN {upper_query}",
            "exchange": "Germany",
            "type": "Equity",
        })

    # Local WKN/ticker fallback.
    results.extend(search_with_wkn_map(query, safe_limit))

    # yfinance company/ticker search.
    results.extend(search_with_yfinance(query, safe_limit))

    # Compatibility fallback for older/newer yfinance variants.
    if len(results) < safe_limit:
        results.extend(search_with_query_module(query, safe_limit))

    # Last fallback: allow direct ticker entry when no remote search result is found.
    direct_symbol = resolve_symbol(upper_query)
    if direct_symbol and not any(item.get("symbol") == direct_symbol for item in results):
        results.append({
            "symbol": direct_symbol,
            "name": "Direkte Eingabe",
            "exchange": "",
            "type": "Ticker",
        })

    return dedupe_search_results(results)[:safe_limit]

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
