'use server';

export interface Candle {
  time: number; // timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const pairTickerMap: { [key: string]: string } = {
  'EUR/USD': 'EURUSD=X',
  'FX:EURUSD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'FX:GBPUSD': 'GBPUSD=X',
  'USD/JPY': 'JPY=X',
  'FX:USDJPY': 'JPY=X',
  'AUD/USD': 'AUDUSD=X',
  'FX:AUDUSD': 'AUDUSD=X',
  'USD/CAD': 'CAD=X',
  'FX:USDCAD': 'CAD=X',
  'USD/CHF': 'CHF=X',
  'FX:USDCHF': 'CHF=X',
  'BNB': 'BNB-USD',
  'BTC': 'BTC-USD',
  'ETH': 'ETH-USD',
  'LINK': 'LINK-USD',
  'GOLD': 'GC=F',
  'SOL': 'SOL-USD',
  'SOL-USD': 'SOL-USD',
};

const timeframeMap: { [key: string]: { interval: string; range: string } } = {
  '1': { interval: '1m', range: '1d' },
  '5': { interval: '5m', range: '1d' },
  '15': { interval: '15m', range: '1d' },
  '60': { interval: '60m', range: '1d' },
  '240': { interval: '1h', range: '5d' }, // Yahoo doesn't have 4h, fetch 1h and we aggregate or use 1h
  'D': { interval: '1d', range: '1mo' },
};

export async function fetchLiveMarketData(pairName: string, timeframe: string): Promise<Candle[]> {
  const ticker = pairTickerMap[pairName] || 'EURUSD=X';
  const tfConfig = timeframeMap[timeframe] || { interval: '15m', range: '1d' };
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${tfConfig.interval}&range=${tfConfig.range}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error("No data found in Yahoo Finance response");
    }
    
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || timestamps.length === 0) {
      throw new Error("Empty market data fields");
    }
    
    const { open = [], high = [], low = [], close = [], volume = [] } = quote;
    const candles: Candle[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      // Clean up nulls
      if (
        open[i] !== null && 
        high[i] !== null && 
        low[i] !== null && 
        close[i] !== null
      ) {
        candles.push({
          time: timestamps[i],
          open: open[i],
          high: high[i],
          low: low[i],
          close: close[i],
          volume: volume[i] || 0
        });
      }
    }
    
    // For 4h timeframe, we aggregate 1h candles
    if (timeframe === '240') {
      const aggregated: Candle[] = [];
      for (let i = 0; i < candles.length; i += 4) {
        const chunk = candles.slice(i, i + 4);
        if (chunk.length > 0) {
          const highVal = Math.max(...chunk.map(c => c.high));
          const lowVal = Math.min(...chunk.map(c => c.low));
          const volumeSum = chunk.reduce((sum, c) => sum + c.volume, 0);
          aggregated.push({
            time: chunk[0].time,
            open: chunk[0].open,
            high: highVal,
            low: lowVal,
            close: chunk[chunk.length - 1].close,
            volume: volumeSum
          });
        }
      }
      return aggregated.slice(-30); // Limit to last 30 candles for chart clarity
    }
    
    return candles.slice(-30); // Limit to last 30 candles for visual clarity
  } catch (error: any) {
    console.error(`Error in fetchLiveMarketData for ${pairName}:`, error.message);
    // Return mock fallback candles in case API fails
    return generateFallbackCandles(pairName);
  }
}

function generateFallbackCandles(pairName: string): Candle[] {
  const candles: Candle[] = [];
  let basePrice = 1.0850;
  if (pairName.includes('JPY')) basePrice = 158.20;
  if (pairName.includes('BTC')) basePrice = 64500.00;
  if (pairName.includes('ETH')) basePrice = 3450.00;
  if (pairName.includes('BNB')) basePrice = 582.45;
  if (pairName.includes('GOLD')) basePrice = 2415.00;
  
  let currentPrice = basePrice;
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = 0; i < 30; i++) {
    // Inject standard random walk volatility to simulate market noise
    const noise = (Math.random() - 0.5) * 0.015; // 1.5% volatility noise
    const wave = Math.sin(i * 0.4) * 0.005;
    const change = (wave + noise) * basePrice;
    
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.abs(change) * (0.1 + Math.random() * 0.5);
    const low = Math.min(open, close) - Math.abs(change) * (0.1 + Math.random() * 0.5);
    
    candles.push({
      time: now - (30 - i) * 900,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 8000) + 2000
    });
    currentPrice = close;
  }
  return candles;
}
