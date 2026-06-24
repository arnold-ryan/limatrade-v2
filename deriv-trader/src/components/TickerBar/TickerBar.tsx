import { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { subscribeTicks } from '../../services/websocket';
import { WSMessage } from '../../services/websocket';
import styles from './TickerBar.module.css';

const TICKER_SYMBOLS = [
  { symbol: 'R_100', label: 'Volatility 100' },
  { symbol: 'R_75',  label: 'Volatility 75' },
  { symbol: 'R_50',  label: 'Volatility 50' },
  { symbol: 'R_25',  label: 'Volatility 25' },
  { symbol: 'R_10',  label: 'Volatility 10' },
  { symbol: '1HZ100V', label: 'Vol 100 (1s)' },
  { symbol: 'frxEURUSD', label: 'EUR/USD' },
  { symbol: 'frxGBPUSD', label: 'GBP/USD' },
  { symbol: 'frxUSDJPY', label: 'USD/JPY' },
  { symbol: 'cryBTCUSD', label: 'BTC/USD' },
];

export default function TickerBar() {
  const { ticks, updateTick, activeSymbol, setActiveSymbol, wsConnected } = useStore();
  const unsubsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!wsConnected) return;

    // Cleanup previous subs
    unsubsRef.current.forEach(fn => fn());
    unsubsRef.current = [];

    // Subscribe to all ticker symbols
    TICKER_SYMBOLS.forEach(({ symbol }) => {
      const unsub = subscribeTicks(symbol, (data: WSMessage) => {
        updateTick(symbol, data);
      });
      unsubsRef.current.push(unsub);
    });

    return () => {
      unsubsRef.current.forEach(fn => fn());
      unsubsRef.current = [];
    };
  }, [wsConnected, updateTick]);

  return (
    <div className={styles.bar}>
      <div className={styles.scrollContainer}>
        {TICKER_SYMBOLS.map(({ symbol, label }) => {
          const tick = ticks.get(symbol);
          const isUp = tick?.quote != null && tick?.prevQuote != null && tick.quote > tick.prevQuote;
          const isDown = tick?.quote != null && tick?.prevQuote != null && tick.quote < tick.prevQuote;
          const isActive = symbol === activeSymbol;

          return (
            <button
              key={symbol}
              className={`${styles.ticker} ${isActive ? styles.activeTicker : ''} ${isUp ? styles.tickerUp : ''} ${isDown ? styles.tickerDown : ''}`}
              onClick={() => setActiveSymbol(symbol)}
            >
              <span className={styles.tickerLabel}>{label}</span>
              <span className={`${styles.tickerPrice} text-mono`}>
                {tick?.quote != null
                  ? tick.quote.toFixed(symbol.startsWith('frx') ? 5 : symbol.startsWith('cry') ? 2 : 2)
                  : '—'}
              </span>
              {tick && tick.prevQuote != null && (
                <span className={isUp ? styles.arrow : isDown ? styles.arrowDown : styles.arrowFlat}>
                  {isUp ? '▲' : isDown ? '▼' : '—'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
