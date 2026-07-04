import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import StockCard from './components/StockCard';
import AddStock from './components/AddStock';
import TableView from './components/TableView';
import StockDetail from './components/StockDetail';
import Settings from './components/Settings';
import InsiderBuys from './components/InsiderBuys';
import { LayoutGrid, Table, Download, Upload, Printer, Plus, Trash2, Pencil, Settings as SettingsIcon, ArrowUp, ArrowDown, ArrowLeftRight, Copy, X } from 'lucide-react';

const APP_VERSION = '0.1.0';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8001' : '';

const App = () => {
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('accounts');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length ? parsed.map(a => ({ ...a, purchaseDates: a.purchaseDates || {}, oldShares: a.oldShares || [], insiderBuys: a.insiderBuys || [] })) : [{ id: 'default', name: 'Depot 1', watchlist: [], purchasePrices: {}, shareQuantities: {}, purchaseDates: {}, oldShares: [], insiderBuys: [] }];
    }
    const oldWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const oldPrices = JSON.parse(localStorage.getItem('purchasePrices') || '{}');
    const oldQtys = JSON.parse(localStorage.getItem('shareQuantities') || '{}');
    return [{ id: 'default', name: 'Depot 1', watchlist: oldWatchlist, purchasePrices: oldPrices, shareQuantities: oldQtys, purchaseDates: {}, oldShares: [], insiderBuys: [] }];
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || localStorage.getItem('activeAccountId') || 'default';
  });
  const [insiderLookbackDays, setInsiderLookbackDays] = useState(() => {
    const saved = localStorage.getItem('insiderLookbackDays');
    return saved ? parseInt(saved, 10) : 10;
  });
  const isInsiderTab = activeTab === 'insider';
  const activeAccountId = isInsiderTab ? null : activeTab;
  const [stockData, setStockData] = useState(() => {
    const saved = localStorage.getItem('stockData');
    return saved ? JSON.parse(saved) : {};
  });
  const [statsData, setStatsData] = useState(() => {
    const saved = localStorage.getItem('statsData');
    return saved ? JSON.parse(saved) : {};
  });
  const [historyData, setHistoryData] = useState(() => {
    const saved = localStorage.getItem('historyData');
    return saved ? JSON.parse(saved) : {};
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('viewMode') || 'cards';
  });
  const [detailSymbol, setDetailSymbol] = useState(null);
  const [moveCopySymbol, setMoveCopySymbol] = useState(null);
  const [moveCopyAction, setMoveCopyAction] = useState('move');
  const [showSettings, setShowSettings] = useState(false);
  const [colorSettings, setColorSettings] = useState(() => {
    const saved = localStorage.getItem('colorSettings');
    return saved ? JSON.parse(saved) : { background: '#33312B', surface: '#33312B', accent: '#C09537', muted: '#888888' };
  });
  const [cardSortKey, setCardSortKey] = useState('name');
  const [cardSortDir, setCardSortDir] = useState('asc');

  const activeAccount = useMemo(() => {
    if (!activeAccountId) return null;
    return accounts.find(a => a.id === activeAccountId) || accounts[0];
  }, [accounts, activeAccountId]);

  const allInsiderBuys = useMemo(() => {
    const result = [];
    accounts.forEach(a => {
      if (a.insiderBuys) {
        a.insiderBuys.forEach(b => result.push({ ...b, depotName: a.name }));
      }
    });
    return result.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  }, [accounts]);

  const allWatchlistSymbols = useMemo(() => {
    const set = new Set();
    accounts.forEach(a => a.watchlist?.forEach(s => set.add(s)));
    accounts.forEach(a => a.insiderBuys?.forEach(b => set.add(b.symbol)));
    return [...set];
  }, [accounts]);

  const stocks = (activeAccount?.watchlist) || [];
  const oldShares = (activeAccount?.oldShares) || [];
  const purchasePrices = (activeAccount?.purchasePrices) || {};
  const shareQuantities = (activeAccount?.shareQuantities) || {};
  const purchaseDates = (activeAccount?.purchaseDates) || {};

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
    localStorage.setItem('activeTab', activeTab);
    localStorage.setItem('viewMode', viewMode);
    localStorage.setItem('colorSettings', JSON.stringify(colorSettings));
    localStorage.setItem('insiderLookbackDays', String(insiderLookbackDays));
  }, [accounts, activeTab, viewMode, purchaseDates, colorSettings, insiderLookbackDays]);

  useEffect(() => { localStorage.setItem('stockData', JSON.stringify(stockData)); }, [stockData]);
  useEffect(() => { localStorage.setItem('statsData', JSON.stringify(statsData)); }, [statsData]);
  useEffect(() => { localStorage.setItem('historyData', JSON.stringify(historyData)); }, [historyData]);

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
    if (allWatchlistSymbols.length === 0) return;

    const fetchPriceStats = async () => {
      for (const symbol of allWatchlistSymbols) {
        try {
          const [priceRes, statsRes] = await Promise.all([
            axios.get(`${API_BASE}/price/${symbol}`),
            axios.get(`${API_BASE}/stats/${symbol}`),
          ]);
          setStockData(prev => ({ ...prev, [symbol]: priceRes.data }));
          setStatsData(prev => ({ ...prev, [symbol]: statsRes.data }));
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
        }
      }
    };

    const fetchAll = async () => {
      for (const symbol of allWatchlistSymbols) {
        try {
          const [priceRes, histRes, statsRes] = await Promise.all([
            axios.get(`${API_BASE}/price/${symbol}`),
            axios.get(`${API_BASE}/history/${symbol}`),
            axios.get(`${API_BASE}/stats/${symbol}`),
          ]);
          setStockData(prev => ({ ...prev, [symbol]: priceRes.data }));
          setHistoryData(prev => {
            if (prev[symbol] !== undefined) return prev;
            return { ...prev, [symbol]: histRes.data.prices.map((p, i) => ({ price: p, date: histRes.data.dates[i] })) };
          });
          setStatsData(prev => ({ ...prev, [symbol]: statsRes.data }));
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
        }
      }
    };

    fetchAll();
    const interval = setInterval(fetchPriceStats, 60000);
    return () => clearInterval(interval);
  }, [allWatchlistSymbols]);

  const addStock = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/price/${symbol}`);
      const today = new Date().toISOString().split('T')[0];
      setAccounts(prev => prev.map(a =>
        a.id === activeAccountId && !a.watchlist.includes(symbol)
          ? {
              ...a,
              watchlist: [...a.watchlist, symbol],
              purchasePrices: { ...a.purchasePrices, [symbol]: res.data.price },
              shareQuantities: { ...a.shareQuantities, [symbol]: 1 },
              purchaseDates: { ...a.purchaseDates, [symbol]: today },
            }
          : a
      ));
    } catch (e) {
      setError(`Could not find ${symbol}. Try a different symbol or Ticker (e.g. SAP.DE).`);
    } finally {
      setLoading(false);
    }
  };

  const removeStock = (symbol) => {
    setAccounts(prev => prev.map(a => {
      if (a.id !== activeAccountId) return a;
      const data = stockData[symbol];
      return {
        ...a,
        watchlist: a.watchlist.filter(s => s !== symbol),
        oldShares: [
          ...a.oldShares,
          {
            id: symbol + '-' + Date.now(),
            symbol,
            name: data?.name || symbol,
            qty: a.shareQuantities[symbol] || 0,
            buyPrice: a.purchasePrices[symbol] || 0,
            buyDate: a.purchaseDates[symbol] || '',
            lastPrice: data?.price || 0,
            removedAt: new Date().toISOString(),
          }
        ]
      };
    }));
  };

  const restoreOldShare = (entry) => {
    setAccounts(prev => prev.map(a => {
      if (a.id !== activeAccountId) return a;
      if (a.watchlist.includes(entry.symbol)) return a;
      return {
        ...a,
        watchlist: [...a.watchlist, entry.symbol],
        shareQuantities: { ...a.shareQuantities, [entry.symbol]: entry.qty },
        purchasePrices: { ...a.purchasePrices, [entry.symbol]: entry.buyPrice },
        purchaseDates: { ...a.purchaseDates, [entry.symbol]: entry.buyDate },
        oldShares: a.oldShares.filter(o => o.id !== entry.id),
      };
    }));
  };

  const deleteOldShare = (id) => {
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId
        ? { ...a, oldShares: a.oldShares.filter(o => o.id !== id) }
        : a
    ));
  };

  const handleMoveStock = useCallback((symbol, targetAccountId) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === activeAccountId) {
        return {
          ...a,
          watchlist: a.watchlist.filter(s => s !== symbol),
          shareQuantities: { ...a.shareQuantities, [symbol]: undefined },
          purchasePrices: { ...a.purchasePrices, [symbol]: undefined },
          purchaseDates: { ...a.purchaseDates, [symbol]: undefined },
        };
      }
      if (a.id === targetAccountId) {
        return {
          ...a,
          watchlist: [...a.watchlist, symbol],
          shareQuantities: { ...a.shareQuantities, [symbol]: accounts.find(acc => acc.id === activeAccountId)?.shareQuantities?.[symbol] || 1 },
          purchasePrices: { ...a.purchasePrices, [symbol]: accounts.find(acc => acc.id === activeAccountId)?.purchasePrices?.[symbol] || 0 },
          purchaseDates: { ...a.purchaseDates, [symbol]: accounts.find(acc => acc.id === activeAccountId)?.purchaseDates?.[symbol] || '' },
        };
      }
      return a;
    }));
    setMoveCopySymbol(null);
  }, [activeAccountId, accounts]);

  const handleCopyStock = useCallback((symbol, targetAccountId) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === targetAccountId && !a.watchlist.includes(symbol)) {
        return {
          ...a,
          watchlist: [...a.watchlist, symbol],
          shareQuantities: { ...a.shareQuantities, [symbol]: accounts.find(acc => acc.id === activeAccountId)?.shareQuantities?.[symbol] || 1 },
          purchasePrices: { ...a.purchasePrices, [symbol]: accounts.find(acc => acc.id === activeAccountId)?.purchasePrices?.[symbol] || 0 },
          purchaseDates: { ...a.purchaseDates, [symbol]: accounts.find(acc => acc.id === activeAccountId)?.purchaseDates?.[symbol] || '' },
        };
      }
      return a;
    }));
    setMoveCopySymbol(null);
  }, [activeAccountId, accounts]);

  const handleAddInsiderBuy = useCallback((symbol) => {
    const data = stockData[symbol];
    const today = new Date().toISOString().split('T')[0];
    setAccounts(prev => prev.map(a => {
      if (a.id !== activeAccountId) return a;
      const existing = a.insiderBuys.find(b => b.symbol === symbol);
      if (existing) return a;
      return {
        ...a,
        insiderBuys: [...a.insiderBuys, {
          id: 'ins_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          symbol,
          name: data?.name || symbol,
          buyPrice: a.purchasePrices?.[symbol] || data?.price || 0,
          shareQuantity: a.shareQuantities?.[symbol] || 1,
          buyDate: a.purchaseDates?.[symbol] || today,
          lookbackDays: 10,
        }],
      };
    }));
  }, [activeAccountId, stockData]);

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
    setAccounts(prev => [...prev, { id, name, watchlist: [], purchasePrices: {}, shareQuantities: {}, purchaseDates: {}, oldShares: [] }]);
    setActiveTab(id);
  };

  const renameAccount = () => {
    if (!activeAccount) return;
    const name = window.prompt('Depot umbenennen:', activeAccount.name);
    if (!name || name === activeAccount.name) return;
    setAccounts(prev => prev.map(a =>
      a.id === activeAccountId ? { ...a, name } : a
    ));
  };

  const deleteAccount = () => {
    if (!activeAccount || accounts.length < 2) return;
    if (!window.confirm(`Depot "${activeAccount.name}" löschen?`)) return;
    const remaining = accounts.filter(a => a.id !== activeAccountId);
    setAccounts(remaining);
    setActiveTab(remaining[0]?.id || 'default');
  };

  const handleExport = () => {
    const headers = ['DEPOT', 'TICKER', 'NAME', 'ANZAHL', 'KAUFKURS', 'DATUM'];
    const rows = [];
    for (const acc of accounts) {
      for (const s of acc.watchlist) {
        const data = stockData[s];
        rows.push([
          acc.name,
          s,
          (data?.name || '').includes(';') ? `"${data?.name || ''}"` : (data?.name || ''),
          acc.shareQuantities?.[s] || 0,
          acc.purchasePrices?.[s] || 0,
          acc.purchaseDates?.[s] || ''
        ]);
      }
    }
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
      const header = lines[0].toUpperCase();
      const hasDepot = header.startsWith('DEPOT');
      const dataLines = header.includes('TICKER') ? lines.slice(1) : lines;

      const depotEntries = {};
      for (const line of dataLines) {
        const delim = line.includes(';') ? ';' : ',';
        const parts = line.split(delim);
        const off = hasDepot ? 1 : 0;
        if (parts.length >= 4 + off) {
          const depotName = hasDepot ? parts[0].trim() : (accounts.find(a => a.id === activeAccountId)?.name || 'Depot 1');
          const ticker = parts[off].trim().toUpperCase();
          const qty = parseInt(parts[2 + off].trim()) || 0;
          const price = parseFloat(parts[3 + off].trim().replace(',', '.')) || 0;
          const date = parts[4 + off] ? parts[4 + off].trim() : '';
          if (!ticker) continue;
          if (!depotEntries[depotName]) depotEntries[depotName] = { watchlist: [], purchasePrices: {}, shareQuantities: {}, purchaseDates: {} };
          if (!depotEntries[depotName].watchlist.includes(ticker)) depotEntries[depotName].watchlist.push(ticker);
          if (qty > 0) depotEntries[depotName].shareQuantities[ticker] = qty;
          if (price > 0) depotEntries[depotName].purchasePrices[ticker] = price;
          if (date) depotEntries[depotName].purchaseDates[ticker] = date;
        }
      }

      setAccounts(prev => {
        const updated = [...prev];
        for (const [depotName, entries] of Object.entries(depotEntries)) {
          const existing = updated.find(a => a.name === depotName);
          if (existing) {
            const idx = updated.indexOf(existing);
            updated[idx] = {
              ...existing,
              watchlist: [...new Set([...existing.watchlist, ...entries.watchlist])],
              purchasePrices: { ...existing.purchasePrices, ...entries.purchasePrices },
              shareQuantities: { ...existing.shareQuantities, ...entries.shareQuantities },
              purchaseDates: { ...existing.purchaseDates, ...entries.purchaseDates },
            };
          } else {
            updated.push({
              id: 'acc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              name: depotName,
              watchlist: entries.watchlist,
              purchasePrices: entries.purchasePrices,
              shareQuantities: entries.shareQuantities,
              purchaseDates: entries.purchaseDates,
              oldShares: [],
            });
          }
        }
        return updated;
      });
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
          <h1 className="text-2xl font-bold tracking-tighter uppercase">Stock_Dashboard_{APP_VERSION.replace(/\./g, '_')}</h1>
        </div>
        {!isInsiderTab && (
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
        )}
      </header>

      <div className="flex items-center gap-1 border border-accent rounded p-1 mb-4 overflow-x-auto">
        {accounts.map(a => (
          <button
            key={a.id}
            onClick={() => setActiveTab(a.id)}
            className={`text-xs-mono px-3 py-1.5 uppercase transition-colors whitespace-nowrap ${activeTab === a.id ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
          >
            {a.name}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('insider')}
          className={`text-xs-mono px-3 py-1.5 uppercase transition-colors whitespace-nowrap ${isInsiderTab ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}
        >
          Insiderkäufe
        </button>
        <div className="flex items-center gap-1 ml-auto border-l border-accent pl-2">
          <button onClick={addAccount} className="text-muted hover:text-white transition-colors" title="Neues Depot">
            <Plus size={14} />
          </button>
          {!isInsiderTab && activeAccount && (
            <>
              <button onClick={renameAccount} className="text-muted hover:text-white transition-colors" title="Umbenennen">
                <Pencil size={12} />
              </button>
              {accounts.length > 1 && (
                <button onClick={deleteAccount} className="text-muted hover:text-red-500 transition-colors" title="Depot löschen">
                  <Trash2 size={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isInsiderTab ? (
        <InsiderBuys
          insiderBuys={allInsiderBuys}
          stockData={stockData}
          historyData={historyData}
          lookbackDays={insiderLookbackDays}
          onLookbackChange={setInsiderLookbackDays}
          onRemove={(id) => {
            setAccounts(prev => prev.map(a => ({
              ...a,
              insiderBuys: (a.insiderBuys || []).filter(b => b.id !== id),
            })));
          }}
          onUpdate={(id, field, value) => {
            setAccounts(prev => prev.map(a => ({
              ...a,
              insiderBuys: (a.insiderBuys || []).map(b => b.id === id ? { ...b, [field]: value } : b),
            })));
          }}
        />
      ) : (
        <>
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
              onMoveCopy={setMoveCopySymbol}
              onAddInsiderBuy={handleAddInsiderBuy}
              accounts={accounts}
              activeAccountId={activeAccountId}
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
            onMoveCopy={setMoveCopySymbol}
            onAddInsiderBuy={handleAddInsiderBuy}
            accounts={accounts}
            activeAccountId={activeAccountId}
          />
        </div>
      )}

      {moveCopySymbol && accounts.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70" onClick={() => setMoveCopySymbol(null)}>
          <div className="bg-surface border border-accent w-full max-w-[400px] mx-4 p-6 relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-title-mono font-bold uppercase">{moveCopySymbol} verschieben/kopieren</h2>
              <button onClick={() => setMoveCopySymbol(null)} className="text-muted hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2">
              {accounts.filter(a => a.id !== activeAccountId).map(target => (
                <div key={target.id} className="border border-accent p-3 flex items-center justify-between">
                  <span className="text-xs-mono">{target.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMoveStock(moveCopySymbol, target.id)}
                      className="text-xs-mono px-2 py-1 border border-accent text-muted hover:text-white hover:border-muted transition-colors flex items-center gap-1"
                    >
                      <ArrowLeftRight size={12} /> Verschieben
                    </button>
                    <button
                      onClick={() => handleCopyStock(moveCopySymbol, target.id)}
                      className="text-xs-mono px-2 py-1 border border-accent text-muted hover:text-white hover:border-muted transition-colors flex items-center gap-1"
                    >
                      <Copy size={12} /> Kopieren
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {oldShares.length > 0 && (
        <details className="mt-8 border border-accent">
          <summary className="text-xs-mono text-muted uppercase p-2 cursor-pointer hover:text-white transition-colors select-none">
            Alte Positionen ({oldShares.length})
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-table-mono border-collapse">
              <thead>
                <tr className="border-b border-accent text-muted uppercase">
                  <th className="text-left p-2 font-normal">Symbol</th>
                  <th className="text-left p-2 font-normal">Name</th>
                  <th className="text-center p-2 font-normal">Anzahl</th>
                  <th className="text-center p-2 font-normal">Kaufkurs</th>
                  <th className="text-center p-2 font-normal">Kaufdatum</th>
                  <th className="text-right p-2 font-normal">Letzter Kurs</th>
                  <th className="text-right p-2 font-normal">Entfernt am</th>
                  <th className="w-16 p-2"></th>
                </tr>
              </thead>
              <tbody>
                {oldShares.map(entry => (
                  <tr key={entry.id} className="border-b border-accent">
                    <td className="p-2 font-bold">{entry.symbol}</td>
                    <td className="p-2 text-muted">{entry.name}</td>
                    <td className="p-2 text-center">{entry.qty || '-'}</td>
                    <td className="p-2 text-center">{entry.buyPrice || '-'}</td>
                    <td className="p-2 text-center">{entry.buyDate || '-'}</td>
                    <td className="p-2 text-right">{entry.lastPrice || '-'}</td>
                    <td className="p-2 text-right text-muted text-[0.72rem]">
                      {entry.removedAt ? new Date(entry.removedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => restoreOldShare(entry)}
                        className="text-muted hover:text-green-500 transition-colors mr-2"
                        title="Reaktivieren"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => deleteOldShare(entry.id)}
                        className="text-muted hover:text-red-500 transition-colors"
                        title="Endgültig löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      </>
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
