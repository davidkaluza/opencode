import './StockCard.css';

export default function StockCard({ stock, news, onRemove }) {
  const isPositive = parseFloat(stock.change) >= 0;
  const hasError = stock.error;
  const isLoading = stock.marketState === 'LOADING';

  return (
    <div className={`stock-card ${hasError ? 'error' : ''}`}>
      <button className="delete-btn" onClick={onRemove}>Entfernen</button>
      <div className="stock-card-content">
        <div className="stock-header">
          <div className="stock-symbol">{stock.symbol}</div>
          <div className="stock-market-state">{stock.marketState}</div>
        </div>

        <div className="stock-name">{stock.name}</div>

        <div className="stock-price-row">
          <span className="stock-price">
            {isLoading ? <span className="price-placeholder">&mdash;</span> : `${stock.price} ${stock.currency}`}
          </span>
          <span className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
            {isLoading ? (
              <span className="price-placeholder">&mdash;</span>
            ) : (
              <>{isPositive ? '+' : ''}{stock.change} ({stock.changePercent}%)</>
            )}
          </span>
        </div>

        {hasError ? (
          <div className="stock-error">Daten nicht verfügbar</div>
        ) : (
          <div className="stock-news">
            <h4>Nachrichten</h4>
            {news && news.length > 0 ? (
              <ul className="news-list">
                {news.map((article, idx) => (
                  <li key={idx} className="news-item">
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                      {article.title}
                    </a>
                    <span className="news-source">
                      {article.source?.name} • {new Date(article.publishedAt).toLocaleDateString('de-DE')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-news">Keine Nachrichten verfügbar</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
