import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StockCard from './components/StockCard';
import AddStock from './components/AddStock';
import TableView from './components/TableView';
import { LayoutGrid, Table, Download, Upload } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const App = () => {
  const [stocks, setStocks] = useState(() => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [purchasePrices, setPurchasePrices] = useState(() => {
    const saved = localStorage.getItem('purchasePrices');
    return saved ? JSON.parse(saved) : {};
  });
  const [shareQuantities, setShareQuantities] = useState(() => {
    const saved = localStorage.getItem('shareQuantities');
    return saved ? JSON.parse(saved) : {};
  });
  const [stockData, setStockData] = useState({});
  const [statsData, setStatsData] = useState({});
  const [historyData, setHistoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('viewMode') || 'cards';
  });

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(stocks));
    localStorage.setItem('purchasePrices', JSON.stringify(purchasePrices));
    localStorage.setItem('shareQuantities', JSON.stringify(shareQuantities));
    localStorage.setItem('viewMode', viewMode);
  }, [stocks, purchasePrices, shareQuantities, viewMode]);

  const fetchData = async () => {
    const newData = {};
    const newHist = {};
    const newStats = {};
    
    for (const symbol of stocks) {
      try {
        const priceRes = await axios.get(`${API_BASE}/price/${symbol}`);
        const histRes = await axios.get(`${API_BASE}/history/${symbol}`);
        const statsRes = await axios.get(`${API_BASE}/stats/${symbol}`);
        newData[symbol] = priceRes.data;
        newHist[symbol] = histRes.data.prices.map((p, i) => ({ price: p, date: histRes.data.dates[i] }));
        newStats[symbol] = statsRes.data;
      } catch (e) {
        console.error(`Error fetching ${symbol}:`, e);
      }
    }
    setStockData(newData);
    setHistoryData(newHist);
    setStatsData(newStats);
  };

  const fetchSpecificHistory = async (symbol, period) => {
    try {
      const res = await axios.get(`${API_BASE}/history/${symbol}?period=${period}`);
      setHistoryData(prev => ({
        ...prev,
        [symbol]: res.data.prices.map((p, i) => ({ price: p, date: res.data.dates[i] }))
      }));
    } catch (e) {
      console.error(`Error fetching history for ${symbol} with period ${period}:`, e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [stocks]);

  const addStock = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      // Verify if stock exists
      await axios.get(`${API_BASE}/price/${symbol}`);
      if (!stocks.includes(symbol)) {
        setStocks([...stocks, symbol]);
      }
    } catch (e) {
      setError(`Could not find ${symbol}. Try a different symbol or Ticker (e.g. SAP.DE).`);
    } finally {
      setLoading(false);
    }
  };

  const removeStock = (symbol) => {
    setStocks(stocks.filter(s => s !== symbol));
  };

  const handleExport = () => {
    const headers = ['TICKER', 'NAME', 'ANZAHL', 'KAUFKURS'];
    const rows = stocks.map(s => {
      const data = stockData[s];
      return [
        s,
        (data?.name || '').includes(';') ? `"${data?.name || ''}"` : (data?.name || ''),
        shareQuantities[s] || 0,
        purchasePrices[s] || 0
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
      const newStocks = [...stocks];
      const newPrices = { ...purchasePrices };
      const newQtys = { ...shareQuantities };
      for (const line of dataLines) {
        const delim = line.includes(';') ? ';' : ',';
        const parts = line.split(delim);
        if (parts.length >= 4) {
          const ticker = parts[0].trim().toUpperCase();
          const qty = parseInt(parts[2].trim()) || 0;
          const price = parseFloat(parts[3].trim().replace(',', '.')) || 0;
          if (ticker && !newStocks.includes(ticker)) {
            newStocks.push(ticker);
          }
          if (qty > 0) newQtys[ticker] = qty;
          if (price > 0) newPrices[ticker] = price;
        }
      }
      setStocks(newStocks);
      setPurchasePrices(newPrices);
      setShareQuantities(newQtys);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const updatePurchasePrice = (symbol, price) => {
    setPurchasePrices(prev => ({
      ...prev,
      [symbol]: parseFloat(price) || 0
    }));
  };

  const updateShareQuantity = (symbol, qty) => {
    setShareQuantities(prev => ({
      ...prev,
      [symbol]: parseInt(qty) || 0
    }));
  };

  const portfolioSummary = React.useMemo(() => {
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
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase">Stock_Dashboard_v1</h1>
          <p className="text-xs-mono text-muted">Industrial Market Monitor // Status: Online</p>
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
        <label className="text-muted hover:text-white p-2 transition-colors border border-accent rounded cursor-pointer" title="Import CSV">
          <Upload size={16} />
          <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
        </label>
      </div>
      {error && <p className="text-red-500 text-xs-mono mb-4">{error}</p>}
      {loading && <p className="text-muted text-xs-mono mb-4 animate-pulse">Verifying symbol...</p>}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1">
          {stocks.length === 0 && (
            <div className="col-span-full text-center p-10 border border-dashed border-accent text-muted text-xs-mono">
              WATCHLIST EMPTY. ADD SYMBOLS ABOVE.
            </div>
          )}
          {stocks.map(symbol => (
            <StockCard
              key={symbol}
              stock={stockData[symbol] || { symbol, price: '...', change: 0, change_percent: 0, currency: '...' }}
              history={historyData[symbol] || []}
              stats={statsData[symbol] || { performance: {} }}
              purchasePrice={purchasePrices[symbol] || 0}
              shareQuantity={shareQuantities[symbol] || 0}
              onUpdatePurchasePrice={updatePurchasePrice}
              onUpdateShareQuantity={updateShareQuantity}
              onRemove={removeStock}
              onPeriodChange={(s, p) => fetchSpecificHistory(s, p)}
            />
          ))}
        </div>
      ) : (
        <TableView
          stocks={stocks}
          stockData={stockData}
          statsData={statsData}
          purchasePrices={purchasePrices}
          shareQuantities={shareQuantities}
          onUpdatePurchasePrice={updatePurchasePrice}
          onUpdateShareQuantity={updateShareQuantity}
          onRemove={removeStock}
        />
      )}
    </div>
  );
};

export default App;
