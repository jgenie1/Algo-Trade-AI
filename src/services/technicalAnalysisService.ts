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
  superTrend?: {
    superTrend: number[];
    direction: ('UP' | 'DOWN')[];
  };
  vwap?: number[];
  atr?: number[];
  adx?: {
    adx: number[];
    plusDI: number[];
    minusDI: number[];
  };
  volumeProfile?: {
    bins: { min: number; max: number; volume: number }[];
    poc: number; // Point of Control price
  };
  patterns?: { index: number; name: string }[];
  keltnerChannels?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  stochRSI?: {
    k: number[];
    d: number[];
  };
  fairValueGaps?: {
    type: 'BULLISH' | 'BEARISH';
    startIndex: number;
    top: number;
    bottom: number;
  }[];
  orderBlocks?: {
    type: 'BULLISH' | 'BEARISH';
    index: number;
    high: number;
    low: number;
  }[];
}

export function calculateIndicators(candles: Candle[], activeIndicators: string[]): IndicatorResults {
  const result: IndicatorResults = {};
  const closes = candles.map(c => c.close);
  const len = candles.length;

  if (len === 0) return result;

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

  // 6. SuperTrend (10 period ATR, 3 multiplier)
  if (activeIndicators.includes('SuperTrend')) {
    const superTrendArr: number[] = [];
    const directionArr: ('UP' | 'DOWN')[] = [];
    const period = 10;
    const multiplier = 3;

    let prevUpperBand = 0;
    let prevLowerBand = 0;
    let prevDir: 'UP' | 'DOWN' = 'UP';

    for (let i = 0; i < len; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const close = candles[i].close;
      const hl2 = (high + low) / 2;

      // Calculate True Range
      let tr = high - low;
      if (i > 0) {
        const prevClose = candles[i - 1].close;
        tr = Math.max(tr, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      // Simple ATR estimation
      let atr = tr;
      if (i >= period - 1) {
        let sumTr = tr;
        for (let j = i - period + 1; j < i; j++) {
          const cHigh = candles[j].high;
          const cLow = candles[j].low;
          const pClose = j > 0 ? candles[j - 1].close : candles[j].open;
          sumTr += Math.max(cHigh - cLow, Math.abs(cHigh - pClose), Math.abs(cLow - pClose));
        }
        atr = sumTr / period;
      }

      let basicUpper = hl2 + multiplier * atr;
      let basicLower = hl2 - multiplier * atr;

      let finalUpper = (i > 0 && basicUpper < prevUpperBand) || (i > 0 && candles[i - 1].close > prevUpperBand) ? basicUpper : (i > 0 ? prevUpperBand : basicUpper);
      let finalLower = (i > 0 && basicLower > prevLowerBand) || (i > 0 && candles[i - 1].close < prevLowerBand) ? basicLower : (i > 0 ? prevLowerBand : basicLower);

      let currentDir: 'UP' | 'DOWN' = prevDir;
      if (i > 0) {
        if (prevDir === 'UP' && close < finalLower) {
          currentDir = 'DOWN';
        } else if (prevDir === 'DOWN' && close > finalUpper) {
          currentDir = 'UP';
        }
      }

      const currentST = currentDir === 'UP' ? finalLower : finalUpper;

      prevUpperBand = finalUpper;
      prevLowerBand = finalLower;
      prevDir = currentDir;

      superTrendArr.push(currentST);
      directionArr.push(currentDir);
    }

    result.superTrend = { superTrend: superTrendArr, direction: directionArr };
  }

  // 7. VWAP (Volume Weighted Average Price)
  if (activeIndicators.includes('VWAP')) {
    const vwap: number[] = [];
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (let i = 0; i < len; i++) {
      const c = candles[i];
      const typicalPrice = (c.high + c.low + c.close) / 3;
      const vol = c.volume || 1;

      cumulativeTPV += typicalPrice * vol;
      cumulativeVolume += vol;

      vwap.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice);
    }
    result.vwap = vwap;
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

  // 8. ATR (14 periods, Wilder's RMA)
  if (activeIndicators.includes('ATR') || activeIndicators.includes('ADX') || activeIndicators.includes('Keltner Channels') || activeIndicators.includes('MT5') || activeIndicators.includes('SMC')) {
    const period = 14;
    const trArr: number[] = [];
    const atrArr: number[] = [];

    for (let i = 0; i < len; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = i > 0 ? candles[i - 1].close : candles[i].open;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trArr.push(tr);

      if (i === 0) {
        atrArr.push(tr);
      } else if (i < period) {
        const sum = trArr.slice(0, i + 1).reduce((s, v) => s + v, 0);
        atrArr.push(sum / (i + 1));
      } else {
        atrArr.push((atrArr[i - 1] * (period - 1) + tr) / period);
      }
    }

    if (activeIndicators.includes('ATR')) {
      result.atr = atrArr;
    }

    // 9. ADX (14 periods, Average Directional Index + +DI / -DI)
    if (activeIndicators.includes('ADX')) {
      const plusDI: number[] = [];
      const minusDI: number[] = [];
      const dxArr: number[] = [];
      const adxArr: number[] = [];

      let smoothedPlusDM = 0;
      let smoothedMinusDM = 0;
      let smoothedTR = 0;

      for (let i = 0; i < len; i++) {
        if (i === 0) {
          plusDI.push(0);
          minusDI.push(0);
          dxArr.push(0);
          adxArr.push(15);
          smoothedTR = trArr[0];
          continue;
        }

        const upMove = candles[i].high - candles[i - 1].high;
        const downMove = candles[i - 1].low - candles[i].low;
        const pDM = (upMove > downMove && upMove > 0) ? upMove : 0;
        const mDM = (downMove > upMove && downMove > 0) ? downMove : 0;

        if (i < period) {
          smoothedPlusDM += pDM;
          smoothedMinusDM += mDM;
          smoothedTR += trArr[i];
        } else {
          smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + pDM;
          smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + mDM;
          smoothedTR = smoothedTR - (smoothedTR / period) + trArr[i];
        }

        const pDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
        const mDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
        plusDI.push(pDI);
        minusDI.push(mDI);

        const diSum = pDI + mDI;
        const dx = diSum > 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
        dxArr.push(dx);

        if (i < period) {
          const avgDx = dxArr.slice(1, i + 1).reduce((s, v) => s + v, 0) / i;
          adxArr.push(avgDx || 15);
        } else {
          adxArr.push(((adxArr[i - 1] * (period - 1)) + dx) / period);
        }
      }

      result.adx = { adx: adxArr, plusDI, minusDI };
    }

    // 10. Keltner Channels (MT5 Volatility Envelope)
    if (activeIndicators.includes('Keltner Channels') || activeIndicators.includes('MT5')) {
      const middle = calculateEMAValues(closes, 20);
      const upper = [];
      const lower = [];
      for (let i = 0; i < len; i++) {
        const a = (atrArr && atrArr[i]) ? atrArr[i] : (trArr && trArr[i] ? trArr[i] : closes[i] * 0.015);
        upper.push(middle[i] + 2 * a);
        lower.push(middle[i] - 2 * a);
      }
      result.keltnerChannels = { upper, middle, lower };
    }

    // 11. Smart Money Concepts: Fair Value Gaps (FVG) & Order Blocks (OB)
    if (activeIndicators.includes('FVG') || activeIndicators.includes('Order Blocks') || activeIndicators.includes('SMC') || activeIndicators.includes('MT5')) {
      const fvgs: { type: 'BULLISH' | 'BEARISH'; startIndex: number; top: number; bottom: number }[] = [];
      const obs: { type: 'BULLISH' | 'BEARISH'; index: number; high: number; low: number }[] = [];

      for (let i = 2; i < len; i++) {
        const c1 = candles[i - 2];
        const c2 = candles[i - 1];
        const c3 = candles[i];

        if (c2.close > c2.open && c3.low > c1.high) {
          fvgs.push({
            type: 'BULLISH',
            startIndex: i - 1,
            top: c3.low,
            bottom: c1.high
          });
        } else if (c2.close < c2.open && c3.high < c1.low) {
          fvgs.push({
            type: 'BEARISH',
            startIndex: i - 1,
            top: c1.low,
            bottom: c3.high
          });
        }
      }

      for (let i = 2; i < len; i++) {
        const currentC = candles[i];
        const prevC = candles[i - 1];
        const candleRange = Math.abs(currentC.close - currentC.open);
        const avgAtr = atrArr[i] || closes[i] * 0.01;

        if (prevC.close < prevC.open && currentC.close > currentC.open && candleRange > avgAtr * 1.2 && currentC.close > prevC.high) {
          obs.push({
            type: 'BULLISH',
            index: i - 1,
            high: prevC.high,
            low: prevC.low
          });
        } else if (prevC.close > prevC.open && currentC.close < currentC.open && candleRange > avgAtr * 1.2 && currentC.close < prevC.low) {
          obs.push({
            type: 'BEARISH',
            index: i - 1,
            high: prevC.high,
            low: prevC.low
          });
        }
      }

      result.fairValueGaps = fvgs;
      result.orderBlocks = obs;
    }
  }

  // 12. Stochastic RSI (MT5 Sniper Timing Oscillator)
  if (activeIndicators.includes('StochRSI') || activeIndicators.includes('Stochastic RSI') || activeIndicators.includes('MT5')) {
    const period = 14;
    const rsiSeries = result.rsi || [];
    const rawStoch = [];

    for (let i = 0; i < len; i++) {
      if (i < period || rsiSeries.length <= i) {
        rawStoch.push(50);
      } else {
        const slice = rsiSeries.slice(i - period + 1, i + 1);
        const minRsi = Math.min(...slice);
        const maxRsi = Math.max(...slice);
        const diff = maxRsi - minRsi;
        rawStoch.push(diff > 0 ? ((rsiSeries[i] - minRsi) / diff) * 100 : 50);
      }
    }

    const smoothedK = [];
    for (let i = 0; i < len; i++) {
      if (i < 2) smoothedK.push(rawStoch[i]);
      else smoothedK.push((rawStoch[i] + rawStoch[i - 1] + rawStoch[i - 2]) / 3);
    }
    const smoothedD = [];
    for (let i = 0; i < len; i++) {
      if (i < 2) smoothedD.push(smoothedK[i]);
      else smoothedD.push((smoothedK[i] + smoothedK[i - 1] + smoothedK[i - 2]) / 3);
    }
    result.stochRSI = { k: smoothedK, d: smoothedD };
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
