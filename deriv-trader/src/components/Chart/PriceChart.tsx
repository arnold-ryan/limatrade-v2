import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import { useStore } from '../../store';
import { send } from '../../services/websocket';
import styles from './PriceChart.module.css';

export default function PriceChart() {
  const { activeSymbol, ticks, wsConnected } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dataRef = useRef<LineData[]>([]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#8b949e',
      },
      grid: {
        vertLines: { color: '#1e2738' },
        horzLines: { color: '#1e2738' },
      },
      crosshair: {
        vertLine: { color: '#2a3345', width: 1, style: 2 },
        horzLine: { color: '#2a3345', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#2a3345',
      },
      timeScale: {
        borderColor: '#2a3345',
        timeVisible: true,
        secondsVisible: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addLineSeries({
      color: '#118e1c',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: true,
      priceLineVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    dataRef.current = [];

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Load history when symbol changes
  useEffect(() => {
    if (!wsConnected || !seriesRef.current) return;

    dataRef.current = [];
    seriesRef.current.setData([]);

    send({
      ticks_history: activeSymbol,
      adjust_start_time: 1,
      count: 300,
      end: 'latest',
      start: 1,
      style: 'ticks',
    }).then((resp) => {
      const history = resp.history as { times: number[]; prices: number[] } | undefined;
      if (!history || !seriesRef.current) return;

      const data: LineData[] = history.times.map((t, i) => ({
        time: t as Time,
        value: history.prices[i],
      }));

      dataRef.current = data;
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }).catch(() => {});
  }, [activeSymbol, wsConnected]);

  // Append live ticks
  useEffect(() => {
    const tick = ticks.get(activeSymbol);
    if (!tick || !seriesRef.current) return;

    const point: LineData = { time: tick.epoch as Time, value: tick.quote };
    const last = dataRef.current[dataRef.current.length - 1];

    if (!last || tick.epoch > (last.time as number)) {
      dataRef.current.push(point);
      seriesRef.current.update(point);
    }
  }, [ticks, activeSymbol]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.chartHeader}>
        <span className={styles.symbolName}>
          {activeSymbol.replace('frx', '').replace('cry', '').replace('R_', 'Volatility ').replace('1HZ', '').replace('V', ' (1s)')}
        </span>
        {ticks.get(activeSymbol) && (
          <span className={`text-mono ${styles.livePrice}`}>
            {ticks.get(activeSymbol)!.quote.toFixed(
              activeSymbol.startsWith('frx') ? 5 : activeSymbol.startsWith('cry') ? 2 : 2
            )}
          </span>
        )}
      </div>
      <div ref={containerRef} className={styles.chart} />
    </div>
  );
}
