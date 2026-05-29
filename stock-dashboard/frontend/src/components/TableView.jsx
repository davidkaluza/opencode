import React from 'react';
import { Trash2 } from 'lucide-react';

const TableView = ({ stocks, stockData, statsData, purchasePrices, shareQuantities, onUpdatePurchasePrice, onUpdateShareQuantity, onRemove }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs-mono border-collapse">
        <thead>
          <tr className="border-b border-accent text-muted uppercase">
            <th className="text-left p-2 font-normal">Ticker</th>
            <th className="text-left p-2 font-normal">Name</th>
            <th className="text-right p-2 font-normal">Preis</th>
            <th className="text-right p-2 font-normal">Änd.</th>
            <th className="text-right p-2 font-normal">1D</th>
            <th className="text-right p-2 font-normal">1W</th>
            <th className="text-right p-2 font-normal">1M</th>
            <th className="text-right p-2 font-normal">6M</th>
            <th className="text-right p-2 font-normal">1Y</th>
            <th className="text-right p-2 font-normal">5Y</th>
            <th className="text-center p-2 font-normal">Anzahl</th>
            <th className="text-center p-2 font-normal">Kaufkurs</th>
            <th className="text-right p-2 font-normal">Wert</th>
            <th className="text-right p-2 font-normal">G/V</th>
            <th className="w-8 p-2"></th>
          </tr>
        </thead>
        <tbody>
          {stocks.length === 0 && (
            <tr>
              <td colSpan={15} className="text-center p-10 text-muted border-b border-accent">
                WATCHLIST EMPTY. ADD SYMBOLS ABOVE.
              </td>
            </tr>
          )}
          {stocks.map(symbol => {
            const data = stockData[symbol];
            const stats = statsData[symbol]?.performance || {};
            const price = data?.price || 0;
            const change = data?.change || 0;
            const changePct = data?.change_percent || 0;
            const isPositive = change >= 0;
            const qty = shareQuantities[symbol] || 0;
            const buyPrice = purchasePrices[symbol] || 0;
            const buyValue = buyPrice * qty;
            const currentValue = price * qty;
            const pl = currentValue - buyValue;
            const plPct = buyPrice > 0 ? ((price - buyPrice) / buyPrice) * 100 : 0;

            const normPerf = (v) => {
              if (v === null || v === undefined) return { pct: null, abs: null };
              if (typeof v === 'number') return { pct: v, abs: null };
              return { pct: v.pct ?? 0, abs: v.abs ?? null };
            };

            const formatPct = (v) => {
              const n = normPerf(v);
              if (n.pct === null) return '-';
              const pctStr = `${n.pct >= 0 ? '+' : ''}${n.pct.toFixed(2)}%`;
              if (n.abs !== null) {
                return `${pctStr} (${n.abs >= 0 ? '+' : ''}${n.abs.toFixed(2)})`;
              }
              return pctStr;
            };

            const pctClass = (v) => {
              const n = normPerf(v);
              if (n.pct === null) return 'text-muted';
              return n.pct >= 0 ? 'text-green-500' : 'text-red-500';
            };

            return (
              <tr key={symbol} className="border-b border-accent hover:bg-surface/50 transition-colors">
                <td className="p-2 font-bold">{symbol}</td>
                <td className="p-2 text-muted max-w-[200px] truncate">{data?.name || 'N/A'}</td>
                <td className="p-2 text-right font-bold">{typeof price === 'number' ? price.toFixed(2) : '...'}</td>
                <td className={`p-2 text-right ${pctClass(change)}`}>
                  {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
                </td>
                <td className={`p-2 text-right ${pctClass(stats['1d'])}`}>{formatPct(stats['1d'])}</td>
                <td className={`p-2 text-right ${pctClass(stats['1wk'])}`}>{formatPct(stats['1wk'])}</td>
                <td className={`p-2 text-right ${pctClass(stats['1mo'])}`}>{formatPct(stats['1mo'])}</td>
                <td className={`p-2 text-right ${pctClass(stats['6mo'])}`}>{formatPct(stats['6mo'])}</td>
                <td className={`p-2 text-right ${pctClass(stats['1y'])}`}>{formatPct(stats['1y'])}</td>
                <td className={`p-2 text-right ${pctClass(stats['5y'])}`}>{formatPct(stats['5y'])}</td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    value={qty || ''}
                    onChange={(e) => onUpdateShareQuantity(symbol, e.target.value)}
                    placeholder="0"
                    className="bg-background border border-accent text-xs-mono p-1 w-16 text-center focus:outline-none focus:border-muted transition-colors"
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    value={buyPrice || ''}
                    onChange={(e) => onUpdatePurchasePrice(symbol, e.target.value)}
                    placeholder="0.00"
                    className="bg-background border border-accent text-xs-mono p-1 w-20 text-center focus:outline-none focus:border-muted transition-colors"
                  />
                </td>
                <td className={`p-2 text-right ${pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentValue.toFixed(2)}
                </td>
                <td className={`p-2 text-right ${pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({pl >= 0 ? '+' : ''}{plPct.toFixed(2)}%)
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => onRemove(symbol)}
                    className="text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
