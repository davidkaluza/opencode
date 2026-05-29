import requests
try:
    r = requests.get("https://query1.finance.yahoo.com/v1/finance/search",
                     params={"q": "A3E1JS", "quotesCount": 10},
                     timeout=10,
                     headers={"User-Agent": "Mozilla/5.0"})
    data = r.json()
    print("Status:", r.status_code)
    print("Count:", data.get("count", 0))
    for q in data.get("quotes", []):
        sym = q.get("symbol")
        nm = q.get("shortname")
        ex = q.get("exchange")
        print(f"  {sym} - {nm} ({ex})")
except Exception as e:
    print(f"Error: {e}")
