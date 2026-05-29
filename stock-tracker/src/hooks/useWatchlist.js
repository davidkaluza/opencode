const STORAGE_KEY = 'stock-tracker-watchlist';

export function getWatchlist() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWatchlist(stocks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
}

export function addToWatchlist(symbol) {
  const watchlist = getWatchlist();
  const upperSymbol = symbol.toUpperCase().trim();
  if (!upperSymbol) return watchlist;
  if (watchlist.find(s => s.symbol === upperSymbol)) return watchlist;
  const newWatchlist = [...watchlist, { symbol: upperSymbol, addedAt: Date.now() }];
  saveWatchlist(newWatchlist);
  return newWatchlist;
}

export function removeFromWatchlist(symbol) {
  const watchlist = getWatchlist().filter(s => s.symbol !== symbol);
  saveWatchlist(watchlist);
  return watchlist;
}
