import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import StockCard from './components/StockCard';
import AddStock from './components/AddStock';
import TableView from './components/TableView';
import StockDetail from './components/StockDetail';
import Settings from './components/Settings';
import { LayoutGrid, Table, Download, Upload, Printer, Plus, Trash2, Pencil, Settings as SettingsIcon, ArrowUp, ArrowDown } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const App = () => {
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('accounts');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length ? parsed.map(a => ({ ...a, purchaseDates: a.purchaseDates || {} })) : [{ id: 'default', name: 'Depot 1', watchlist: [], purchasePrices: {}, shareQuantities: {}, purchaseDates: {} }];
    }
    const oldWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const oldPrices = JSON.parse(localStorage.getItem('purchasePrices') || '{}');
    const oldQtys = JSON.parse(localStorage.getItem('shareQuantities') || '{}');
    return [{ id: 'default', name: 'Depot 1', watchlist: oldWatchlist, purchasePrices: oldPrices, shareQuantities: oldQtys, purchaseDates: {} }];
  });
  const [activeAccountId, setActiveAccountId] = useState(() => {
    return localStorage.getItem('activeAccountId') || 'default';
  });
  const [stockData, setStockData] = useState({});
  const [statsData, setStatsData] = useState({});
  const [historyData, setHistoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('viewMode') || 'cards';
  });
  const [detailSymbol, setDetailSymbol] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState(() => {
    const saved = localStorage.getItem('colorSettings');
    return saved ? JSON.parse(saved) : { background: '#33312B', surface: '#33312B', accent: '#C09537', muted: '#888888' };
  });
  const [cardSortKey, setCardSortKey] = useState('name');
  const [cardSortDir, setCardSortDir] = useState('asc');

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0];
  }, [accounts, activeAccountId]);

  const stocks = activeAccount?.watchlist || [];
  const purchasePrices = activeAccount?.purchasePrices || {};
  const shareQuantities = activeAccount?.shareQuantities || {};
  const purchaseDates = activeAccount?.purchaseDates || {};

  const handleCardSort = (key) => {
    if (cardSortKey === key) {
      setCardSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCardSortKey(key);
      setCardSortDir('asc');
    }
  };

  const sortedStocks = useMemo(() => {
    return [...stocks].sort((a, b) => {
      const dataA = stockData[a];
      const dataB = stockData[b];
      const priceA = dataA?.price || 0;
      const priceB = dataB?.price || 0;
      const qtyA = shareQuantities[a] || 0;
      const qtyB = shareQuantities[b] || 0;
      const buyA = purchasePrices[a] || 0;
      const buyB = purchasePrices[b] || 0;
      const dateA = purchaseDates[a] || '';
      const dateB = purchaseDates[b] || '';
      const daysA = dateA ? Math.floor((new Date() - new Date(dateA)) / (1000 * 60 * 60 * 24)) : 0;
      const daysB = dateB ? Math.floor((new Date() - new Date(dateB)) / (1000 * 60 * 60 * 24)) : 0;

      let va, vb;
      switch (cardSortKey) {
        case 'name':
          va = dataA?.name || a; vb = dataB?.name || b;
          break;
        case 'price':
          va = priceA; vb = priceB;
          break;
        case 'value':
          va = priceA * qtyA; vb = priceB * qtyB;
          break;
        case 'rendite':
          va = buyA > 0 && daysA > 0 ? (Math.pow(priceA / buyA, 365 / daysA) - 1) * 100 : (cardSortDir === 'asc' ? Infinity : -Infinity);
          vb = buyB > 0 && daysB > 0 ? (Math.pow(priceB / buyB, 365 / daysB) - 1) * 100 : (cardSortDir === 'asc' ? Infinity : -Infinity);
          break;
        case 'days':
          va = dateA ? daysA : (cardSortDir === 'asc' ? Infinity : -Infinity);
          vb = dateB ? daysB : (cardSortDir === 'asc' ? Infinity : -Infinity);
          break;
        default:
          va = dataA?.name || a; vb = dataB?.name || b;
      }

      if (typeof va === 'string') {
        return cardSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return cardSortDir === 'asc' ? va - vb : vb - va;
    });
  }, [stocks, stockData, cardSortKey, cardSortDir, purchasePrices, shareQuantities, purchaseDates]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-background', colorSettings.background);
    root.style.setProperty('--bg-surface', colorSettings.surface);
    root.style.setProperty('--clr-accent', colorSettings.accent);
    root.style.setProperty('--clr-muted', colorSettings.muted);
  }, [colorSettings]);

  useEffect(() => {
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('activeAccountId', activeAccountId);
    localStorage.setItem('viewMode', viewMode);
    localStorage.setItem('colorSettings', JSON.stringify(colorSettings));
  }, [accounts, activeAccountId, viewMode, purchaseDates, colorSettings]);

  const fetchData = async () => {
    for (const symbol of stocks) {
      try {
        const [priceRes, histRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/price/${symbol}`),
          axios.get(`${API_BASE}/history/${symbol}`),
          axios.get(`${API_BASE}/stats/${symbol}`),
        ]);
        setStockData(prev => ({ ...prev, [symbol]: priceRes.data }));
        setHistoryData(prev => ({ ...prev, [symbol]: histRes.data.prices.map((p, i) => ({ price: p, date: histRes.data.dates[i] })) }));
        setStatsData(prev => ({ ...prev, [symbol]: statsRes.data }));
      } catch (e) {
        console.error(`Error fetching ${symbol}:`, e);
      }
    }
  };

  const fetchSpecificHistory = async (symbol, period, startDate) => {
    try {
      const params = startDate ? `?start=${startDate}` : `?period=${period}`;
      const res = await axios.get(`${API_BASE}/history/${symbol}${params}`);
      setHistoryData(prev => ({
        ...prev,
        [symbol]: res.data.prices.map((p, i) => ({ price: p, date: res.data.dates[i] }))
      }));
    } catch (e) {
      console.error(`Error fetching history for ${symbol}:`, e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [stocks]);

  const addStock = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      await axios.get(`${API_BASE}/price/${symbol}`);
      setAccounts(prev => prev.map(a =>
        a.id === activeAccountId && !a.watchlist.includes(symbol)
          ? { ...a, watchlist: [...a.watchlist, symbol] }
          : a
      ));
    } catch (e) {
      setError(`Could not find ${symbol}. Try a different symbol or Ticker (e.g. SAP.DE).`);
    } finally {
      setLoading(false);
    }
  };

  const removeStock = (symbol) => {
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId
        ? { ...a, watchlist: a.watchlist.filter(s => s !== symbol) }
        : a
    ));
  };

  const updatePurchasePrice = (symbol, price) => {
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId
        ? { ...a, purchasePrices: { ...a.purchasePrices, [symbol]: parseFloat(price) || 0 } }
        : a
    ));
  };

  const updateShareQuantity = (symbol, qty) => {
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId
        ? { ...a, shareQuantities: { ...a.shareQuantities, [symbol]: parseInt(qty) || 0 } }
        : a
    ));
  };

  const updatePurchaseDate = (symbol, date) => {
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId
        ? { ...a, purchaseDates: { ...a.purchaseDates, [symbol]: date || '' } }
        : a
    ));
  };

  const addAccount = () => {
    const name = window.prompt('Neues Depot anlegen:\nName:', `Depot ${accounts.length + 1}`);
    if (!name) return;
    const id = 'acc_' + Date.now();
    setAccounts(prev => [...prev, { id, name, watchlist: [], purchasePrices: {}, shareQuantities: {}, purchaseDates: {} }]);
    setActiveAccountId(id);
  };

  const renameAccount = () => {
    const name = window.prompt('Depot umbenennen:', activeAccount.name);
    if (!name || name === activeAccount.name) return;
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId ? { ...a, name } : a
    ));
  };

  const deleteAccount = () => {
    if (accounts.length < 2) return;
    if (!window.confirm(`Depot "${activeAccount.name}" löschen?`)) return;
    const remaining = accounts.filter(a => a.id !== activeAccountId);
    setAccounts(remaining);
    setActiveAccountId(remaining[0]?.id || 'default');
  };

  const handleExport = () => {
    const headers = ['TICKER', 'NAME', 'ANZAHL', 'KAUFKURS', 'DATUM'];
    const rows = stocks.map(s => {
      const data = stockData[s];
      return [
        s,
        (data?.name || '').includes(';') ? `"${data?.name || ''}"` : (data?.name || ''),
        shareQuantities[s] || 0,
        purchasePrices[s] || 0,
        purchaseDates[s] || ''
      ];
    });
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return;
      const dataLines = lines[0].toUpperCase().includes('TICKER') ? lines.slice(1) : lines;
      const newWatchlist = [...stocks];
      const newPrices = { ...purchasePrices };
      const newQtys = { ...shareQuantities };
      const newDates = { ...purchaseDates };
      for (const line of dataLines) {
        const delim = line.includes(';') ? ';' : ',';
        const parts = line.split(delim);
        if (parts.length >= 4) {
          const ticker = parts[0].trim().toUpperCase();
          const qty = parseInt(parts[2].trim()) || 0;
          const price = parseFloat(parts[3].trim().replace(',', '.')) || 0;
          const date = parts[4] ? parts[4].trim() : '';
          if (ticker && !newWatchlist.includes(ticker)) {
            newWatchlist.push(ticker);
          }
          if (qty > 0) newQtys[ticker] = qty;
          if (price > 0) newPrices[ticker] = price;
          if (date) newDates[ticker] = date;
        }
      }
      setAccounts(prev => prev.map(a =>
        a.id === activeAccountId
          ? { ...a, watchlist: newWatchlist, purchasePrices: newPrices, shareQuantities: newQtys, purchaseDates: newDates }
          : a
      ));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const portfolioSummary = useMemo(() => {
    let totalBuy = 0;
    let totalCurrent = 0;
    for (const symbol of stocks) {
      const price = stockData[symbol]?.price || 0;
      const qty = shareQuantities[symbol] || 0;
      const buyPrice = purchasePrices[symbol] || 0;
      totalBuy += buyPrice * qty;
      totalCurrent += price * qty;
    }
    const pl = totalCurrent - totalBuy;
    const plPct = totalBuy > 0 ? (pl / totalBuy) * 100 : 0;
    return { totalBuy, totalCurrent, pl, plPct };
  }, [stocks, stockData, purchasePrices, shareQuantities]);

  return (
    <div className="w-full px-4 py-4 md:px-6 md:py-6">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-end">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tighter uppercase">Stock_Dashboard_v1</h1>
          <div className="flex items-center gap-1 border border-red-500 rounded px-2 py-1">
            <select
              value={activeAccountId}
              onChange={(e) => setActiveAccountId(e.target.value)}
              className="bg-transparent text-[1rem] text-white uppercase outline-none cursor-pointer appearance-none"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id} className="bg-background">{a.name}</option>
              ))}
            </select>
            <button onClick={renameAccount} className="text-muted hover:text-white transition-colors" title="Umbenennen">
              <Pencil size={12} />
            </button>
            <button onClick={addAccount} className="text-muted hover:text-white transition-colors" title="Neues Depot">
              <Plus size={12} />
            </button>
            {accounts.length > 1 && (
              <button onClick={deleteAccount} className="text-muted hover:text-red-500 transition-colors" title="Depot löschen">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs-mono text-muted mb-1">
            {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
          </div>
          <div className="text-sm-mono">
            <span className="text-muted">Port:</span>{' '}
            <span className={portfolioSummary.pl >= 0 ? 'text-green-500' : 'text-red-500'}>
              {portfolioSummary.totalCurrent.toFixed(2)}{' '}
              ({portfolioSummary.pl >= 0 ? '+' : ''}{portfolioSummary.pl.toFixed(2)}/{portfolioSummary.plPct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex border border-accent rounded">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
            title="Kartenansicht"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
            title="Tabellenansicht"
          >
            <Table size={16} />
          </button>
        </div>
        <AddStock onAdd={addStock} className="flex-1" />
        <button
          onClick={handleExport}
          className="text-muted hover:text-white p-2 transition-colors border border-accent rounded"
          title="Export CSV"
        >
          <Download size={16} />
        </button>
        {viewMode === 'table' && (
          <button
            onClick={() => window.print()}
            className="text-muted hover:text-white p-2 transition-colors border border-accent rounded no-print"
            title="Drucken (A4)"
          >
            <Printer size={16} />
          </button>
        )}
        <label className="text-muted hover:text-white p-2 transition-colors border border-accent rounded cursor-pointer" title="Import CSV">
          <Upload size={16} />
          <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
        </label>
        <button
          onClick={() => setShowSettings(true)}
          className="text-muted hover:text-white p-2 transition-colors border border-accent rounded"
          title="Einstellungen"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
      {error && <p className="text-red-500 text-xs-mono mb-4">{error}</p>}
      {loading && <p className="text-muted text-xs-mono mb-4 animate-pulse">Verifying symbol...</p>}

      {viewMode === 'cards' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'name', label: 'Name' },
            { key: 'price', label: 'Kurs' },
            { key: 'value', label: 'Wert' },
            { key: 'rendite', label: 'Rendite' },
            { key: 'days', label: 'Tage' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => handleCardSort(opt.key)}
              className={`text-xs-mono px-2 py-1 border rounded transition-colors ${cardSortKey === opt.key ? 'bg-accent text-white border-accent' : 'text-muted border-accent hover:text-white hover:border-muted'}`}
            >
              {opt.label}
              {cardSortKey === opt.key && (
                cardSortDir === 'asc' ? <ArrowUp size={10} className="inline ml-1" /> : <ArrowDown size={10} className="inline ml-1" />
              )}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
          {stocks.length === 0 && (
            <div className="col-span-full text-center p-10 border border-dashed border-accent text-muted text-xs-mono">
              WATCHLIST EMPTY. ADD SYMBOLS ABOVE.
            </div>
          )}
          {sortedStocks.map(symbol => (
            <StockCard
              key={symbol}
              stock={stockData[symbol] || { symbol, price: '...', change: 0, change_percent: 0, currency: '...' }}
              history={historyData[symbol] || []}
              stats={statsData[symbol] || { performance: {} }}
              purchasePrice={purchasePrices[symbol] || 0}
              shareQuantity={shareQuantities[symbol] || 0}
              purchaseDate={purchaseDates[symbol] || ''}
              onUpdatePurchasePrice={updatePurchasePrice}
              onUpdateShareQuantity={updateShareQuantity}
              onUpdatePurchaseDate={updatePurchaseDate}
              onRemove={removeStock}
              onPeriodChange={(s, p, d) => fetchSpecificHistory(s, p, d)}
              onShowDetail={setDetailSymbol}
            />
          ))}
        </div>
      ) : (
        <div id="print-area">
          <TableView
            stocks={sortedStocks}
            stockData={stockData}
            statsData={statsData}
            purchasePrices={purchasePrices}
            shareQuantities={shareQuantities}
            purchaseDates={purchaseDates}
            onUpdatePurchasePrice={updatePurchasePrice}
            onUpdateShareQuantity={updateShareQuantity}
            onUpdatePurchaseDate={updatePurchaseDate}
            onRemove={removeStock}
            onShowDetail={setDetailSymbol}
          />
        </div>
      )}

      {showSettings && (
        <Settings
          colors={colorSettings}
          onChange={setColorSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {detailSymbol && (
        <StockDetail
          symbol={detailSymbol}
          stockData={stockData}
          historyData={historyData}
          statsData={statsData}
          purchasePrice={purchasePrices[detailSymbol] || 0}
          shareQuantity={shareQuantities[detailSymbol] || 0}
          purchaseDate={purchaseDates[detailSymbol] || ''}
          onUpdatePurchasePrice={updatePurchasePrice}
          onUpdateShareQuantity={updateShareQuantity}
          onUpdatePurchaseDate={updatePurchaseDate}
          onClose={() => setDetailSymbol(null)}
        />
      )}
    </div>
  );
};

export default App;
