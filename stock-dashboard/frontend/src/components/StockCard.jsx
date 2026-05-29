import React, { useState, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { Trash2 } from 'lucide-react';

const StockCard = ({ stock, history, stats, purchasePrice, shareQuantity, onUpdatePurchasePrice, onUpdateShareQuantity, onRemove, onPeriodChange }) => {
  const [period, setPeriod] = useState('1mo');
  const isPositive = stock.change >= 0;
  const currentPrice = stock.price;
  const qty = shareQuantity || 0;
  const buyValue = purchasePrice * qty;
  const currentValue = currentPrice * qty;
  const profitLoss = currentValue - buyValue;
  const hasProfit = profitLoss >= 0;

  const chartDomain = useMemo(() => {
    if (!history || history.length === 0) return { min: 0, max: 100 };
    const prices = history.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.05;
    return {
      min: min - padding,
      max: max + padding
    };
  }, [history]);

  const currentValueClass = hasProfit ? 'text-green-500' : 'text-red-500';

  const periods = [
    { label: '1D', value: '1d' },
    { label: '1W', value: '5d' },
    { label: '1M', value: '1mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '5Y', value: '5y' },
  ];

  const handlePeriodChange = (val) => {
    setPeriod(val);
    onPeriodChange(stock.symbol, val);
  };

  // Calculate profit since purchase
  const profitSincePurchase = purchasePrice > 0 
    ? ((currentPrice - purchasePrice) / purchasePrice) * 100 
    : null;
  const isProfitPct = profitSincePurchase >= 0;

  const PerformanceBadge = ({ label, value }) => {
    const pct = value !== null && typeof value === 'object' ? (value.pct ?? 0) : (value ?? 0);
    const abs = value !== null && typeof value === 'object' ? value.abs : null;
    return (
      <div className="flex flex-col items-center justify-center border-r border-accent last:border-r-0 px-2">
        <span className="text-[0.6rem] text-muted uppercase">{label}</span>
        <span className={`text-xs-mono ${pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {pct > 0 ? '+' : ''}{pct}%
        </span>
        {abs !== null && abs !== undefined && (
          <span className={`text-[0.5rem] ${abs >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {abs >= 0 ? '+' : ''}{abs.toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-surface border border-accent p-4 flex flex-col gap-4 hover:border-muted transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm-mono font-bold uppercase">{stock.symbol} <span className="text-muted">({stock.name || 'N/A'})</span></h3>
          <p className="text-xs-mono text-muted">{stock.currency}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(stock.symbol); }}
          className="text-muted hover:text-red-500 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">{stock.price}</span>
        <span className={`text-xs-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{stock.change} ({stock.change_percent}%)
        </span>
      </div>

      <div className="grid grid-cols-6 gap-0 border-y border-accent py-2">
        <PerformanceBadge label="Day" value={stats.performance['1d']} />
        <PerformanceBadge label="Week" value={stats.performance['1wk']} />
        <PerformanceBadge label="1M" value={stats.performance['1mo']} />
        <PerformanceBadge label="6M" value={stats.performance['6mo']} />
        <PerformanceBadge label="Year" value={stats.performance['1y']} />
        <PerformanceBadge label="5Year" value={stats.performance['5y']} />
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[0.6rem] text-muted uppercase">Qty</span>
          <input 
            type="number" 
            value={shareQuantity || ''}
            onChange={(e) => { e.stopPropagation(); onUpdateShareQuantity(stock.symbol, e.target.value); }}
            placeholder="0"
            className="bg-background border border-accent text-xs-mono p-1 focus:outline-none focus:border-muted transition-colors w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[0.6rem] text-muted uppercase">Buy Price</span>
          <input 
            type="number" 
            value={purchasePrice || ''}
            onChange={(e) => { e.stopPropagation(); onUpdatePurchasePrice(stock.symbol, e.target.value); }}
            placeholder="0.00"
            className="bg-background border border-accent text-xs-mono p-1 focus:outline-none focus:border-muted transition-colors w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs-mono">
        <span className="text-muted">Buy: {buyValue.toFixed(2)} / <span className={currentValueClass}>Curr: {currentValue.toFixed(2)}</span></span>
        {profitSincePurchase !== null && (
          <span className={`${isProfitPct ? 'text-green-500' : 'text-red-500'}`}>
            {isProfitPct ? '+' : ''}{profitSincePurchase.toFixed(2)}% ({hasProfit ? '+' : ''}{profitLoss.toFixed(2)})
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          {periods.map(p => (
            <button 
              key={p.value}
              onClick={(e) => { e.stopPropagation(); handlePeriodChange(p.value); }}
              className={`text-[0.6rem] px-1 py-0.5 border border-accent transition-colors ${period === p.value ? 'bg-accent text-white' : 'text-muted hover:border-muted'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} key={`${stock.symbol}-${period}-${history.length}`}>
              <XAxis 
                dataKey="date"
                tick={{ fill: '#888', fontSize: '0.5rem' }}
                tickFormatter={(v) => v ? v.slice(5) : ''}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                domain={[chartDomain.min, chartDomain.max]} 
                orientation="left"
                tick={{ fill: '#888', fontSize: '0.5rem' }}
                tickFormatter={(v) => v.toFixed(2)}
                width={45}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', fontSize: '0.6rem' }}
                labelStyle={{ color: '#888' }}
                formatter={(value) => [value.toFixed(2), 'Price']}
                labelFormatter={(label) => label || ''}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={isPositive ? '#22c55e' : '#ef4444'} 
                strokeWidth={1.5} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StockCard;
