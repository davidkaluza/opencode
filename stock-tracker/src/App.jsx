import { useState, useEffect } from 'react';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from './hooks/useWatchlist';
import { useStockData } from './hooks/useStockData';
import StockCard from './components/StockCard';
import './App.css';

const INTERVAL_OPTIONS = [
  { value: 30000, label: '30 Sekunden' },
  { value: 60000, label: '1 Minute' },
  { value: 120000, label: '2 Minuten' },
  { value: 300000, label: '5 Minuten' },
];

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const symbols = watchlist.map(s => s.symbol);
  const { stocks, news, loading, error, lastUpdated, refresh } = useStockData(symbols, refreshInterval);

  const handleAddStock = (e) => {
    e.preventDefault();
    setInputError('');

    const symbol = inputValue.trim().toUpperCase();
    if (!symbol) {
      setInputError('Bitte ein Symbol eingeben');
      return;
    }

    if (!/^[A-Z0-9.^-]{1,10}$/.test(symbol)) {
      setInputError('Ungültiges Symbol-Format');
      return;
    }

    if (watchlist.find(s => s.symbol === symbol)) {
      setInputError('Symbol bereits in der Watchlist');
      return;
    }

    const newWatchlist = addToWatchlist(symbol);
    setWatchlist(newWatchlist);
    setInputValue('');
  };

  const handleRemoveStock = (symbol) => {
    const newWatchlist = removeFromWatchlist(symbol);
    setWatchlist(newWatchlist);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Stock Tracker</h1>
        <div className="header-controls">
          <select
            className="interval-select"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            {INTERVAL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className="refresh-btn" onClick={refresh}>Aktualisieren</button>
          {lastUpdated && (
            <span className="last-updated">
              Zuletzt: {lastUpdated.toLocaleTimeString('de-DE')}
            </span>
          )}
        </div>
      </header>

      <form className="add-stock-form" onSubmit={handleAddStock}>
        <input
          type="text"
          placeholder="Symbol eingeben (z.B. AAPL, MSFT, TSLA)"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setInputError('');
          }}
        />
        <button type="submit">Hinzufügen</button>
      </form>

      {inputError && <div className="error-message">{inputError}</div>}
      {error && <div className="error-message">Fehler: {error}</div>}

      <div className="watchlist-info">
        <span>{watchlist.length} Aktie{watchlist.length !== 1 ? 'n' : ''} in der Watchlist</span>
      </div>

      {watchlist.length === 0 ? (
        <div className="watchlist-empty">
          <p>Deine Watchlist ist leer.</p>
          <p>Füge oben ein Aktien-Symbol hinzu, um zu beginnen.</p>
        </div>
      ) : (
        <div className="stock-grid">
          {watchlist.map(({ symbol }) => (
            <div key={symbol}>
              <StockCard
                stock={stocks[symbol] || { symbol, name: symbol, price: '0.00', change: '0.00', changePercent: '0.00', currency: 'USD', marketState: 'LOADING' }}
                news={news[symbol] || []}
                onRemove={() => handleRemoveStock(symbol)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
