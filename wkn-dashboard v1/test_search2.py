import requests, json
r = requests.get("https://query1.finance.yahoo.com/v1/finance/search",
                 params={"q": "A3E1JS", "quotesCount": 10},
                 timeout=10,
                 headers={"User-Agent": "Mozilla/5.0"})
data = r.json()
print("Keys:", list(data.keys()))
print("Count:", data.get("count"))
quotes = data.get("quotes")
print("Quotes type:", type(quotes))
print("Quotes:", json.dumps(quotes, indent=2)[:2000] if quotes else "None/empty")

# Also check other keys
for k in data:
    if k != "quotes":
        print(f"{k}: {json.dumps(data[k], indent=2)[:500]}")
