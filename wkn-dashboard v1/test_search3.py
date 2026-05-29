import yfinance as yf

for q in ['A3E1JS', 'A3E1JS.DE', 'IE000U9ODG19', '5J50', '5J50.DE']:
    s = yf.Search(q)
    quotes = s.quotes if hasattr(s, 'quotes') else []
    print(f'{q}: {len(quotes)} quotes')
    if quotes:
        for qq in quotes[:2]:
            print(f"  -> {qq.get('symbol')} {qq.get('shortname')}")
