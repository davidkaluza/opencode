import React, { useMemo } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

const LOOKBACK_MIN = 1;
const LOOKBACK_MAX = 365;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatNumber = (value, digits = 2) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : '—';
};

const formatSigned = (value, digits = 2, suffix = '') => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num >= 0 ? '+' : ''}${num.toFixed(digits)}${suffix}`;
};

const calcGVAfterDays = (history, buyDate, lookbackDays, buyPrice) => {
  if (!Array.isArray(history) || history.length === 0 || !buyDate || !buyPrice) return null;

  const buy = new Date(buyDate);
  if (isNaN(buy.getTime())) return null;

  const target = new Date(buy);
  target.setDate(target.getDate() + lookbackDays);

  if (target > new Date()) return null;

  const targetMs = target.getTime();
  let closest = null;
  let closestDiff = Infinity;

  for (const entry of history) {
    if (!entry.date) continue;
    const d = new Date(entry.date);
    if (isNaN(d.getTime())) continue;
    const diff = Math.abs(d.getTime() - targetMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = entry;
    }
  }

  if (!closest) return null;
  const priceAtDate = toNumber(closest.price);
  if (priceAtDate <= 0) return null;

  const abs = priceAtDate - buyPrice;
  const pct = (abs / buyPrice) * 100;
  return { abs, pct };
};

const InsiderBuys = ({
  insiderBuys = [],
  stockData = {},
  historyData = {},
  lookbackDays = 10,
  onLookbackChange,
  onRemove,
  onUpdate,
}) => {
  const sorted = useMemo(() => {
    return [...insiderBuys].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  }, [insiderBuys]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 p-3 border border-accent">
        <span className="text-xs-mono text-muted uppercase">Rückblick (Tage)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLookbackChange?.(Math.max(LOOKBACK_MIN, lookbackDays - 1))}
            className="text-muted hover:text-white transition-colors border border-accent p-1"
          >
            <Minus size={14} />
          </button>
          <span className="text-title-mono font-bold w-10 text-center">{lookbackDays}</span>
          <button
            onClick={() => onLookbackChange?.(Math.min(LOOKBACK_MAX, lookbackDays + 1))}
            className="text-muted hover:text-white transition-colors border border-accent p-1"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs-mono text-muted ml-2">G/V ab Kaufdatum + N Tage, 0 wenn nicht genug Historie</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center p-10 border border-dashed border-accent text-muted text-xs-mono">
          Keine Insiderkäufe. Füge Aktien über das Stern-Symbol hinzu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-table-mono border-collapse">
            <thead>
              <tr className="border-b border-accent text-muted uppercase">
                <th className="text-left p-2 font-normal">Symbol</th>
                <th className="text-left p-2 font-normal">Name</th>
                <th className="text-center p-2 font-normal">Anz.</th>
                <th className="text-center p-2 font-normal">Kaufkurs</th>
                <th className="text-center p-2 font-normal">Datum</th>
                <th className="text-right p-2 font-normal">Kurs</th>
                <th className="text-right p-2 font-normal">G/V aktuell</th>
                <th className="text-right p-2 font-normal">G/V nach {lookbackDays}T</th>
                <th className="w-12 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => {
                const symbol = entry.symbol || '';
                const curPrice = toNumber(stockData?.[symbol]?.price);
                const buyPrice = toNumber(entry.buyPrice);
                const qty = toNumber(entry.shareQuantity);
                const buyValue = buyPrice * qty;
                const curValue = curPrice * qty;
                const plAbs = curValue - buyValue;
                const plPct = buyPrice > 0 ? ((curPrice - buyPrice) / buyPrice) * 100 : null;
                const isPlPositive = plAbs >= 0;

                const gvAfter = calcGVAfterDays(historyData?.[symbol], entry.buyDate, lookbackDays, buyPrice);
                const isAfterPositive = gvAfter !== null && gvAfter.abs >= 0;

                return (
                  <tr key={entry.id} className="border-b border-accent">
                    <td className="p-2 font-bold">{symbol}</td>
                    <td className="p-2 text-muted max-w-[200px] truncate">{entry.name || '—'}</td>
                    <td className="p-2 text-center">{formatNumber(qty, 0)}</td>
                    <td className="p-2 text-center">{formatNumber(buyPrice)}</td>
                    <td className="p-2 text-center text-[0.72rem]">{entry.buyDate || '—'}</td>
                    <td className="p-2 text-right">{formatNumber(curPrice)}</td>
                    <td className={`p-2 text-right ${isPlPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {formatSigned(plAbs)} ({plPct !== null ? formatSigned(plPct, 2, '%') : '—'})
                    </td>
                    <td className={`p-2 text-right ${isAfterPositive ? 'text-green-500' : gvAfter === null ? 'text-muted' : 'text-red-500'}`}>
                      {gvAfter !== null
                        ? `${formatSigned(gvAfter.abs)} (${formatSigned(gvAfter.pct, 2, '%')})`
                        : '0,00'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onRemove?.(entry.id)}
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
      )}
    </div>
  );
};

export default InsiderBuys;
