import { useState, useEffect, useCallback, useRef } from 'react';

const YAHOO_BASE = '/api/yahoo/v8/finance/chart';
const NEWS_API_BASE = '/api/news/v2/everything';
const NEWS_API_KEY = 'demo';

export function useStockData(symbols, refreshInterval = 60000) {
  const [stocks, setStocks] = useState({});
  const [news, setNews] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasDataRef = useRef(false);

  const fetchStockData = useCallback(async (showLoading = false) => {
    if (!symbols.length) return;

    if (showLoading || !hasDataRef.current) setLoading(true);
    setError(null);

    try {
      const stockResults = {};
      const newsResults = {};

      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            // Fetch stock data from Yahoo Finance
            const response = await fetch(`${YAHOO_BASE}/${symbol}?interval=1d&range=5d`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const result = data?.chart?.result?.[0];

            if (result) {
              const meta = result.meta;
              const price = meta.regularMarketPrice;
              const prevClose = meta.chartPreviousClose || price;
              const change = price - prevClose;
              const changePercent = prevClose ? ((change / prevClose) * 100).toFixed(2) : '0.00';

              stockResults[symbol] = {
                symbol: meta.symbol || symbol,
                name: meta.shortName || meta.symbol || symbol,
                price: price?.toFixed(2) || '0.00',
                change: change?.toFixed(2) || '0.00',
                changePercent,
                currency: meta.currency || 'USD',
                marketState: meta.marketState || (meta.currentTradingPeriod ? 'REGULAR' : 'CLOSED'),
              };
            } else {
              stockResults[symbol] = {
                symbol,
                name: symbol,
                price: '0.00',
                change: '0.00',
                changePercent: '0.00',
                currency: 'USD',
                marketState: 'UNKNOWN',
                error: 'No data available'
              };
            }

            // Fetch news from News API
            try {
              const newsResponse = await fetch(
                `${NEWS_API_BASE}?q=${encodeURIComponent(symbol)}&apiKey=${NEWS_API_KEY}&pageSize=3&sortBy=publishedAt`
              );
              if (newsResponse.ok) {
                const newsData = await newsResponse.json();
                newsResults[symbol] = newsData.articles?.slice(0, 3) || [];
              }
            } catch {
              newsResults[symbol] = [];
            }
          } catch (err) {
            console.error(`Error fetching ${symbol}:`, err);
            stockResults[symbol] = {
              symbol,
              name: symbol,
              price: '0.00',
              change: '0.00',
              changePercent: '0.00',
              currency: 'USD',
              marketState: 'ERROR',
              error: err.message
            };
            newsResults[symbol] = [];
          }
        })
      );

      hasDataRef.current = true;
      setStocks(prev => ({ ...prev, ...stockResults }));
      setNews(prev => ({ ...prev, ...newsResults }));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchStockData(true);
  }, [fetchStockData]);

  useEffect(() => {
    if (!symbols.length) return;

    const interval = setInterval(() => fetchStockData(), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStockData, refreshInterval, symbols.length]);

  const refresh = useCallback(() => fetchStockData(true), [fetchStockData]);

  return { stocks, news, loading, error, lastUpdated, refresh };
}
