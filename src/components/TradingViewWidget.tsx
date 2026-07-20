"use client";
import React, { useEffect, useRef, memo } from 'react';
import { fetchLiveMarketData } from '@/services/yahooFinanceService';
import { calculateIndicators } from '@/services/technicalAnalysisService';

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  onReady?: (chart: any) => void;
  indicators?: string[];
}

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  symbol = "FX:EURUSD", 
  interval = "15",
  onReady,
  indicators = ["RSI", "SMA"],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    const initializeWidget = () => {
      if (window.TradingView && containerRef.current && !widgetRef.current) {
        // Map indicators to TradingView studies
        const studies: string[] = [];
        if (indicators) {
          if (indicators.includes("RSI")) studies.push("RSI");
          if (indicators.includes("MACD")) studies.push("MACD");
          if (indicators.includes("Bollinger Bands")) studies.push("BB");
          if (indicators.includes("EMA")) studies.push("MAExp@tv-basicstudies");
          if (indicators.includes("SMA")) studies.push("MASimple@tv-basicstudies");
        } else {
          studies.push("RSI", "MASimple@tv-basicstudies");
        }

        const widget = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "fr",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: containerRef.current.id,
          studies: studies,
          withdateranges: true,
        });

        widgetRef.current = widget;
        
        // Fix for standard Widget which doesn't support onChartReady/chart APIs:
        // We pass a mock chartApi object that renders a canvas screenshot with REAL data.
        const mockChartApi = {
          takeScreenshot: async () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 700;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 1. Fetch real market candles
              const candles = (await fetchLiveMarketData(symbol, interval)) || [];
              
              // 2. Calculate real indicators
              const indicatorResults = calculateIndicators(candles, indicators);

              // 3. Draw deep dark background matching the mockup style
              ctx.fillStyle = '#0a070c';
              ctx.fillRect(0, 0, 1200, 700);

              // 4. Draw Grid
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
              ctx.lineWidth = 1;
              for (let x = 0; x < 1200; x += 80) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 700);
                ctx.stroke();
              }
              for (let y = 0; y < 700; y += 60) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(1200, y);
                ctx.stroke();
              }

              const numCandles = candles.length;
              if (numCandles > 0) {
                const paddingLeft = 80;
                const paddingRight = 120;
                const chartWidth = 1200 - paddingLeft - paddingRight;
                const stepX = chartWidth / (numCandles - 1);

                // Find min and max close/high/low to scale Y
                const highs = candles.map(c => c.high);
                const lows = candles.map(c => c.low);
                
                // Include overlays in scaling
                if (indicatorResults.bollingerBands) {
                  highs.push(...indicatorResults.bollingerBands.upper);
                  lows.push(...indicatorResults.bollingerBands.lower);
                }
                if (indicatorResults.sma) highs.push(...indicatorResults.sma);
                if (indicatorResults.ema) highs.push(...indicatorResults.ema);

                const minVal = Math.min(...lows) * 0.9995;
                const maxVal = Math.max(...highs) * 1.0005;
                const valRange = maxVal - minVal;

                const hasSubchart = indicators.includes("RSI") || indicators.includes("MACD");
                const chartHeight = hasSubchart ? 360 : 490;
                const chartTop = 130;

                const getX = (i: number) => paddingLeft + i * stepX;
                const getY = (val: number) => chartTop + chartHeight - ((val - minVal) / valRange) * chartHeight;

                // Bollinger Bands shaded area
                if (indicatorResults.bollingerBands) {
                  ctx.fillStyle = 'rgba(194, 255, 12, 0.03)';
                  ctx.beginPath();
                  ctx.moveTo(getX(0), getY(indicatorResults.bollingerBands.upper[0]));
                  for (let i = 1; i < numCandles; i++) {
                    ctx.lineTo(getX(i), getY(indicatorResults.bollingerBands.upper[i]));
                  }
                  for (let i = numCandles - 1; i >= 0; i--) {
                    ctx.lineTo(getX(i), getY(indicatorResults.bollingerBands.lower[i]));
                  }
                  ctx.closePath();
                  ctx.fill();

                  ctx.strokeStyle = 'rgba(194, 255, 12, 0.2)';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(getX(0), getY(indicatorResults.bollingerBands.upper[0]));
                  for (let i = 1; i < numCandles; i++) ctx.lineTo(getX(i), getY(indicatorResults.bollingerBands.upper[i]));
                  ctx.stroke();

                  ctx.beginPath();
                  ctx.moveTo(getX(0), getY(indicatorResults.bollingerBands.lower[0]));
                  for (let i = 1; i < numCandles; i++) ctx.lineTo(getX(i), getY(indicatorResults.bollingerBands.lower[i]));
                  ctx.stroke();
                }

                // Volume Profile (POC)
                if (indicatorResults.volumeProfile) {
                  const { bins, poc } = indicatorResults.volumeProfile;
                  const maxBinVol = Math.max(...bins.map(b => b.volume)) || 1;
                  
                  ctx.fillStyle = 'rgba(167, 139, 250, 0.08)'; // Translucent violet
                  bins.forEach(bin => {
                    const binWidth = (bin.volume / maxBinVol) * 160;
                    const yMin = getY(bin.max);
                    const yMax = getY(bin.min);
                    ctx.fillRect(1200 - binWidth - 60, yMin, binWidth, Math.max(1, yMax - yMin - 1));
                  });

                  // Draw POC line
                  ctx.strokeStyle = '#ef4444'; // Red
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(paddingLeft, getY(poc));
                  ctx.lineTo(1200 - 60, getY(poc));
                  ctx.stroke();
                  
                  ctx.fillStyle = '#ef4444';
                  ctx.font = 'bold 10px sans-serif';
                  ctx.fillText(`POC: ${poc.toFixed(5)}`, 1200 - 110, getY(poc) - 5);
                }

                // SMA
                if (indicatorResults.sma) {
                  ctx.strokeStyle = '#06b6d4'; // Cyan
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(getX(0), getY(indicatorResults.sma[0]));
                  for (let i = 1; i < numCandles; i++) ctx.lineTo(getX(i), getY(indicatorResults.sma[i]));
                  ctx.stroke();
                }

                // EMA
                if (indicatorResults.ema) {
                  ctx.strokeStyle = '#e11d48'; // Rose
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(getX(0), getY(indicatorResults.ema[0]));
                  for (let i = 1; i < numCandles; i++) ctx.lineTo(getX(i), getY(indicatorResults.ema[i]));
                  ctx.stroke();
                }

                // Real Candlesticks
                candles.forEach((c, i) => {
                  const cx = getX(i);
                  const cyOpen = getY(c.open);
                  const cyClose = getY(c.close);
                  const cyHigh = getY(c.high);
                  const cyLow = getY(c.low);

                  const isBullish = c.close >= c.open;
                  const candleColor = isBullish ? '#22c55e' : '#ef4444';

                  // Wick
                  ctx.strokeStyle = candleColor;
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(cx, cyLow);
                  ctx.lineTo(cx, cyHigh);
                  ctx.stroke();

                  // Body
                  ctx.fillStyle = candleColor;
                  const bodyHeight = Math.max(2, Math.abs(cyOpen - cyClose));
                  ctx.fillRect(cx - 5, Math.min(cyOpen, cyClose), 10, bodyHeight);
                });

                // Candlestick Patterns
                if (indicatorResults.patterns) {
                  indicatorResults.patterns.forEach(pat => {
                    const cx = getX(pat.index);
                    const c = candles[pat.index];
                    const cyHigh = getY(c.high);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(pat.name, cx, cyHigh - 12);
                    
                    ctx.fillStyle = '#eab308';
                    ctx.beginPath();
                    ctx.arc(cx, cyHigh - 6, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                  });
                  ctx.textAlign = 'left';
                }

                // Subcharts (RSI / MACD)
                if (indicatorResults.rsi) {
                  const rsiTop = 540;
                  const rsiHeight = 110;
                  ctx.fillStyle = '#09050d';
                  ctx.fillRect(50, rsiTop, 1100, rsiHeight);

                  ctx.strokeStyle = '#1e1b29';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(50, rsiTop + rsiHeight * 0.3);
                  ctx.lineTo(1150, rsiTop + rsiHeight * 0.3);
                  ctx.moveTo(50, rsiTop + rsiHeight * 0.7);
                  ctx.lineTo(1150, rsiTop + rsiHeight * 0.7);
                  ctx.stroke();

                  ctx.fillStyle = '#a78bfa';
                  ctx.font = 'bold 11px sans-serif';
                  ctx.fillText('RSI (14)', 60, rsiTop - 8);
                  ctx.fillStyle = '#6d28d9';
                  ctx.fillText('70', 1155, rsiTop + rsiHeight * 0.3 + 3);
                  ctx.fillText('30', 1155, rsiTop + rsiHeight * 0.7 + 3);

                  ctx.strokeStyle = '#a855f7';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(getX(0), rsiTop + rsiHeight - (indicatorResults.rsi[0] / 100) * rsiHeight);
                  for (let i = 1; i < numCandles; i++) {
                    ctx.lineTo(getX(i), rsiTop + rsiHeight - (indicatorResults.rsi[i] / 100) * rsiHeight);
                  }
                  ctx.stroke();
                } else if (indicatorResults.macd) {
                  const macdTop = 540;
                  const macdHeight = 110;
                  const macdZero = macdTop + macdHeight / 2;
                  ctx.fillStyle = '#09050d';
                  ctx.fillRect(50, macdTop, 1100, macdHeight);

                  ctx.fillStyle = '#a78bfa';
                  ctx.font = 'bold 11px sans-serif';
                  ctx.fillText('MACD (12, 26, 9)', 60, macdTop - 8);

                  ctx.strokeStyle = '#1e1b29';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(50, macdZero);
                  ctx.lineTo(1150, macdZero);
                  ctx.stroke();

                  const allMacdVals = [
                    ...indicatorResults.macd.macdLine,
                    ...indicatorResults.macd.signalLine,
                    ...indicatorResults.macd.histogram
                  ];
                  const maxMacdVal = Math.max(...allMacdVals.map(Math.abs)) || 0.001;
                  const getMacdY = (val: number) => macdZero - (val / maxMacdVal) * (macdHeight / 2.2);

                  for (let i = 0; i < numCandles; i++) {
                    const hx = getX(i);
                    const hVal = indicatorResults.macd.histogram[i];
                    const hy = getMacdY(hVal);
                    ctx.fillStyle = hVal >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                    ctx.fillRect(hx - 3, macdZero, 6, hy - macdZero);
                  }

                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(getX(0), getMacdY(indicatorResults.macd.macdLine[0]));
                  for (let i = 1; i < numCandles; i++) ctx.lineTo(getX(i), getMacdY(indicatorResults.macd.macdLine[i]));
                  ctx.stroke();

                  ctx.strokeStyle = '#f59e0b';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(getX(0), getMacdY(indicatorResults.macd.signalLine[0]));
                  for (let i = 1; i < numCandles; i++) ctx.lineTo(getX(i), getMacdY(indicatorResults.macd.signalLine[i]));
                  ctx.stroke();
                }
              }

              // Text Labels
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 24px sans-serif';
              const cleanSym = symbol.replace('FX:', '').replace('=', '').replace('-USD', '/USD');
              ctx.fillText(`Pair: ${cleanSym}`, 50, 60);

              ctx.fillStyle = '#c2ff0c';
              ctx.font = '16px sans-serif';
              ctx.fillText(`Interval: ${interval}m | Active Indicators: ${indicators.join(', ')}`, 50, 90);

              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.font = '14px monospace';
              const lastCandle = candles[numCandles - 1];
              ctx.fillText(`Live Price: ${lastCandle ? lastCandle.close.toFixed(5) : 'N/A'} | Time: ${new Date().toISOString()}`, 50, 120);
            }
            return canvas;
          }
        };

        if (onReady) {
          onReady(mockChartApi);
        }
      }
    };

    if (!document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.type = "text/javascript";
      script.async = true;
      script.onload = initializeWidget;
      document.body.appendChild(script);
    } else {
      initializeWidget();
    }

    return () => {
        if (widgetRef.current) {
            try {
              const container = containerRef.current;
              if (container && document.body.contains(container)) {
                if (typeof widgetRef.current.remove === 'function') {
                  widgetRef.current.remove();
                }
              }
              widgetRef.current = null;
            } catch (e) {
              console.error("Error removing trading view widget", e);
            }
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators?.join(',')]); 

  useEffect(() => {
      if (widgetRef.current && widgetRef.current.chart) {
          const chart = widgetRef.current.chart();
          chart.setSymbol(symbol, () => {
            chart.setResolution(interval);
          });
      }
  }, [symbol, interval]);

  return (
    <div id={`tradingview_${Math.random().toString(36).substring(2, 9)}`} className="h-full w-full" ref={containerRef}></div>
  );
};

export default memo(TradingViewWidget);

declare global {
  interface Window {
    TradingView: any;
  }
}
