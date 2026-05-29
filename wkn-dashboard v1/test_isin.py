import yfinance as yf
import requests

t = yf.Ticker("IE000U9ODG19")
info = t.info or {}
sn = info.get("shortName")
pr = info.get("currentPrice")
cu = info.get("currency")
sy = info.get("symbol")
print(f"IE000U9ODG19: {sy} - {sn} - {pr} {cu}")

r = requests.get("https://query1.finance.yahoo.com/v1/finance/search",
    params={"q": "iShares Global Aerospace", "quotesCount": 10},
    timeout=10, headers={"User-Agent": "Mozilla/5.0"})
data = r.json()
quotes = data.get("quotes") or []
print(f"\nSearch quotes: {len(quotes)}")
for q in quotes:
    sym = q.get("symbol")
    nm = q.get("shortname")
    ex = q.get("exchange")
    print(f"  {sym} - {nm} ({ex})")
