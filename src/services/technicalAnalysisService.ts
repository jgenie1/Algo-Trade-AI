import { Candle } from './yahooFinanceService';

export interface IndicatorResults {
  sma?: number[]; // matching length of input candles
  ema?: number[];
  rsi?: number[];
  macd?: {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  };
  bollingerBands?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  volumeProfile?: {
    bins: { min: number; max: number; volume: number }[];
    poc: number; // Point of Control price
  };
  patterns?: { index: number; name: string }[];
}

export function calculateIndicators(candles: Candle[], activeIndicators: string[]): IndicatorResults {
  const result: IndicatorResults = {};
  if (!candles || !Array.isArray(candles) || candles.length === 0) return result;
  
  const closes = candles.map(c => c.close);
  const len = candles.length;

  // 1. SMA (20 periods default)
  if (activeIndicators.includes('SMA')) {
    const period = 20;
    const sma: number[] = [];
    for (let i = 0; i < len; i++) {
      if (i < period - 1) {
        sma.push(closes[i]); // fallback
      } else {
        const sum = closes.slice(i - period + 1, i + 1).reduce((s, c) => s + c, 0);
        sma.push(sum / period);
      }
    }
    result.sma = sma;
  }

  // 2. EMA (20 periods default)
  if (activeIndicators.includes('EMA')) {
    const period = 20;
    const ema: number[] = [];
    const k = 2 / (period + 1);
    let lastEma = closes[0];
    ema.push(lastEma);
    
    for (let i = 1; i < len; i++) {
      lastEma = closes[i] * k + lastEma * (1 - k);
      ema.push(lastEma);
    }
    result.ema = ema;
  }

  // 3. RSI (14 periods)
  if (activeIndicators.includes('RSI')) {
    const period = 14;
    const rsi: number[] = [];
    
    let avgGain = 0;
    let avgLoss = 0;
    
    // First RSI
    for (let i = 1; i <= period && i < len; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    for (let i = 0; i < len; i++) {
      if (i < period) {
        rsi.push(50); // baseline
      } else {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
        
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsiVal = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
        rsi.push(rsiVal);
      }
    }
    result.rsi = rsi;
  }

  // 4. MACD (12, 26, 9)
  if (activeIndicators.includes('MACD')) {
    const macdLine: number[] = [];
    const signalLine: number[] = [];
    const histogram: number[] = [];

    const ema12 = calculateEMAValues(closes, 12);
    const ema26 = calculateEMAValues(closes, 26);

    for (let i = 0; i < len; i++) {
      macdLine.push(ema12[i] - ema26[i]);
    }

    const signalEMA = calculateEMAValues(macdLine, 9);
    for (let i = 0; i < len; i++) {
      signalLine.push(signalEMA[i]);
      histogram.push(macdLine[i] - signalEMA[i]);
    }

    result.macd = { macdLine, signalLine, histogram };
  }

  // 5. Bollinger Bands (20, 2)
  if (activeIndicators.includes('Bollinger Bands')) {
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];
    const period = 20;

    for (let i = 0; i < len; i++) {
      if (i < period - 1) {
        upper.push(closes[i] * 1.02);
        middle.push(closes[i]);
        lower.push(closes[i] * 0.98);
      } else {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = slice.reduce((s, c) => s + c, 0) / period;
        const variance = slice.reduce((v, c) => v + Math.pow(c - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        upper.push(mean + 2 * stdDev);
        middle.push(mean);
        lower.push(mean - 2 * stdDev);
      }
    }
    result.bollingerBands = { upper, middle, lower };
  }

  // 6. Volume Profile (POC)
  if (activeIndicators.includes('Volume Profile (POC)')) {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const range = maxPrice - minPrice;
    
    const numBins = 10;
    const binSize = range / numBins;
    const bins = Array.from({ length: numBins }, (_, i) => ({
      min: minPrice + i * binSize,
      max: minPrice + (i + 1) * binSize,
      volume: 0
    }));

    // Distribute candle volumes to bins they overlap with
    candles.forEach(c => {
      const cVolume = c.volume;
      const cMin = Math.min(c.open, c.close);
      const cMax = Math.max(c.open, c.close);
      
      let matchedBins = 0;
      bins.forEach(bin => {
        if (cMin <= bin.max && cMax >= bin.min) {
          matchedBins++;
        }
      });

      if (matchedBins > 0) {
        bins.forEach(bin => {
          if (cMin <= bin.max && cMax >= bin.min) {
            bin.volume += cVolume / matchedBins;
          }
        });
      }
    });

    let maxVol = 0;
    let poc = minPrice + range / 2;
    bins.forEach(bin => {
      if (bin.volume > maxVol) {
        maxVol = bin.volume;
        poc = (bin.min + bin.max) / 2;
      }
    });

    result.volumeProfile = { bins, poc };
  }

  // 7. Candlestick Patterns
  if (activeIndicators.includes('Candlestick Patterns')) {
    const patterns: { index: number; name: string }[] = [];
    for (let i = 1; i < len; i++) {
      const c = candles[i];
      const prev = candles[i - 1];
      
      const bodySize = Math.abs(c.open - c.close);
      const totalSize = c.high - c.low;
      const upperShadow = c.high - Math.max(c.open, c.close);
      const lowerShadow = Math.min(c.open, c.close) - c.low;

      // Doji
      if (totalSize > 0 && bodySize / totalSize < 0.1) {
        patterns.push({ index: i, name: 'Doji' });
        continue;
      }

      // Hammer (Bullish Hammer at bottom)
      if (bodySize > 0 && lowerShadow > 2 * bodySize && upperShadow / bodySize < 0.2) {
        patterns.push({ index: i, name: 'Marteau' });
        continue;
      }

      // Engulfing
      const prevBodySize = Math.abs(prev.open - prev.close);
      const isBullishEngulfing = c.close > c.open && prev.close < prev.open && c.open <= prev.close && c.close >= prev.open;
      const isBearishEngulfing = c.close < c.open && prev.close > prev.open && c.open >= prev.close && c.close <= prev.open;
      
      if (isBullishEngulfing && bodySize > prevBodySize) {
        patterns.push({ index: i, name: 'Avalement Haussier' });
      } else if (isBearishEngulfing && bodySize > prevBodySize) {
        patterns.push({ index: i, name: 'Avalement Baissier' });
      }
    }
    result.patterns = patterns;
  }

  return result;
}

function calculateEMAValues(values: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let lastEma = values[0];
  ema.push(lastEma);
  
  for (let i = 1; i < values.length; i++) {
    lastEma = values[i] * k + lastEma * (1 - k);
    ema.push(lastEma);
  }
  return ema;
}
