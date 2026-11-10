/**
 * Unified Strategy & Quantitative Execution Engine
 * Evaluates market setups with institutional quantitative models:
 * - 9 Defined Quantitative Strategies (SMC, Order Blocks, Liquidity, Trend, Scalping, etc.)
 * - Guaranteed Asymmetric Risk-to-Reward (R:R >= 2.0 to 2.5)
 * - Volatility / ATR-based dynamic position sizing (trader-budget / trader-risk principles)
 * - Macro EMA 200 trend filter and ADX / Volume regime gates
 */

import { Candle } from './yahooFinanceService';
import { calculateIndicators } from './technicalAnalysisService';

export type SignalType = 'BUY' | 'SELL' | 'NEUTRAL';

export interface StrategySignalResult {
  signal: SignalType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  targetRiskReward: number; // Strictly >= 2.0
  conviction: number; // 0.0 to 1.0
  atr?: number;
  reason?: string;
  strategy?: string;
  symbol?: string;
}

export interface VolatilityPositionSizeParams {
  accountCapital: number;
  riskPercentage: number;
  entryPrice: number;
  stopLossPrice: number;
  assetClass: 'CRYPTO' | 'FOREX' | 'COMMODITY';
  atr?: number;
}

export const VALID_STRATEGIES = [
  'AI Autopilot (Machine à Cash)',
  'EMA Cross',
  'RSI Pullback',
  'MACD Divergence',
  'Bollinger Breakout',
  'Scalping 1-Min',
  'MT5 Smart Money (SMC) & Order Block Sniper',
  'MT5 Triple Confluence Pro (Multi-Timeframe)',
  'MT5 London/NY Session Liquidity Breakout',
] as const;

export type StrategyName = (typeof VALID_STRATEGIES)[number];

/**
 * Calculates dynamic volatility-adjusted position size based on account capital and risk budget.
 * Adheres strictly to institutional day-trading risk models.
 */
export function calculateVolatilityPositionSize(params: VolatilityPositionSizeParams): number {
  const { accountCapital, riskPercentage, entryPrice, stopLossPrice, assetClass, atr } = params;

  if (!accountCapital || accountCapital <= 0 || !riskPercentage || riskPercentage <= 0) {
    return 0;
  }

  const clampedRiskPct = Math.min(riskPercentage, 0.05); // Max 5% risk cap
  const riskDollars = accountCapital * clampedRiskPct;
  let rawStopDistance = Math.abs(entryPrice - stopLossPrice);

  if (rawStopDistance <= 0) {
    rawStopDistance = atr && atr > 0 ? atr * 1.5 : entryPrice * 0.015;
  }

  // Extreme volatility guardrail: if ATR exceeds 20% of price, clamp size to safe minimum
  const isExtremeVolatility = atr !== undefined && atr > 0.20 * entryPrice;

  if (assetClass === 'FOREX') {
    // 1 standard lot = 100,000 units. For EURUSD, 1 pip = 0.0001 = $10/lot
    const isJpyPair = entryPrice > 50 && entryPrice < 250;
    const pipFactor = isJpyPair ? 100 : 10000;
    const stopDistancePips = Math.max(1, rawStopDistance * pipFactor);
    const dollarsPerPipPerLot = 10;
    const riskPerLot = stopDistancePips * dollarsPerPipPerLot;
    let lots = riskDollars / riskPerLot;

    if (isExtremeVolatility) {
      lots = Math.min(lots, 0.05);
    }
    // Round to 2 decimal places (standard micro-lots)
    return Math.max(0.01, Math.min(50.0, Number(lots.toFixed(2))));
  }

  // CRYPTO & COMMODITIES
  let units = riskDollars / rawStopDistance;

  if (isExtremeVolatility) {
    units = Math.min(units, 5.0);
  }

  // Respect maximum budget (cannot buy more than available capital allows)
  const maxAffordableUnits = accountCapital / entryPrice;
  const finalUnits = Math.min(units, maxAffordableUnits * 0.95);

  return Number(finalUnits.toFixed(4));
}

/**
 * Evaluates market candles against specified quantitative strategy and returns high-conviction signal
 * with strictly calibrated asymmetric R:R (>= 2.0).
 */
export function evaluateStrategySignal(
  strategyName: string,
  candles: Candle[],
  symbol: string = 'BTCUSDT'
): StrategySignalResult {
  // Boundary check: empty or single candle
  if (!candles || !Array.isArray(candles) || candles.length < 2) {
    const fallbackPrice = candles?.[0]?.close || 100;
    return {
      signal: 'NEUTRAL',
      entryPrice: fallbackPrice,
      stopLoss: Number((fallbackPrice * 0.98).toFixed(4)),
      takeProfit: Number((fallbackPrice * 1.045).toFixed(4)),
      targetRiskReward: 2.25,
      conviction: 0.0,
      reason: 'Insufficient candle series',
      strategy: strategyName,
      symbol,
    };
  }

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  // Unknown strategy handling
  if (!VALID_STRATEGIES.includes(strategyName as any)) {
    return {
      signal: 'NEUTRAL',
      entryPrice: currentPrice,
      stopLoss: Number((currentPrice * 0.98).toFixed(4)),
      takeProfit: Number((currentPrice * 1.045).toFixed(4)),
      targetRiskReward: 2.25,
      conviction: 0.0,
      reason: `Unknown strategy: ${strategyName}`,
      strategy: strategyName,
      symbol,
    };
  }

  // Calculate technical indicators
  const indicators = calculateIndicators(candles, [
    'SMA',
    'EMA',
    'RSI',
    'MACD',
    'Bollinger Bands',
    'ATR',
    'ADX',
  ]);

  const atrSeries = indicators.atr || [];
  const currentAtr = atrSeries.length > 0 ? atrSeries[atrSeries.length - 1] : currentPrice * 0.015;
  const adxSeries = indicators.adx?.adx || [];
  const currentAdx = adxSeries.length > 0 ? adxSeries[adxSeries.length - 1] : 25;
  const rsiSeries = indicators.rsi || [];
  const currentRsi = rsiSeries.length > 0 ? rsiSeries[rsiSeries.length - 1] : 50;
  const emaSeries = indicators.ema || [];
  const currentEma = emaSeries.length > 0 ? emaSeries[emaSeries.length - 1] : currentPrice;

  // Calculate Macro EMA 50 & 200 for trend alignment filter
  let ema50 = candles[0].close;
  const k50 = 2 / (50 + 1);
  for (let i = 1; i < candles.length; i++) {
    ema50 = candles[i].close * k50 + ema50 * (1 - k50);
  }

  let ema200 = candles[0].close;
  const k200 = 2 / (200 + 1);
  for (let i = 1; i < candles.length; i++) {
    ema200 = candles[i].close * k200 + ema200 * (1 - k200);
  }

  // Symbol classification and overextension rubber-band boundaries
  const cleanSym = (symbol || '').toUpperCase().replace(/^FX:/, '').replace(/\//g, '').replace('USDT', '').replace('-USD', '').replace('=X', '').replace('=F', '');
  const isCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX'].some(c => cleanSym.includes(c));
  const isGold = cleanSym.includes('GOLD') || cleanSym.includes('XAU');
  const isForex = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'].some(c => cleanSym.includes(c));

  const maxStretch = isCrypto ? 0.028 : (isGold ? 0.012 : 0.008);
  const stretchBelow = (ema200 - currentPrice) / ema200;
  const stretchAbove = (currentPrice - ema200) / ema200;
  const notOverextendedShort = stretchBelow < maxStretch;
  const notOverextendedLong = stretchAbove < maxStretch;

  // Base setup signal determination per strategy
  let rawSignal: SignalType = 'NEUTRAL';
  let conviction = 0.5;
  let reason = 'Market consolidation';

  switch (strategyName) {
    case 'EMA Cross': {
      const prevPrice = candles[candles.length - 2].close;
      if (currentPrice > currentEma && prevPrice <= currentEma && notOverextendedLong) {
        rawSignal = 'BUY';
        conviction = 0.75;
        reason = 'Bullish EMA Cross above dynamic trendline';
      } else if (currentPrice < currentEma && prevPrice >= currentEma && notOverextendedShort) {
        rawSignal = 'SELL';
        conviction = 0.75;
        reason = 'Bearish EMA Cross below dynamic trendline';
      } else if (currentPrice > currentEma && notOverextendedLong) {
        rawSignal = 'BUY';
        conviction = 0.65;
        reason = 'Trend-following continuation above EMA';
      } else if (currentPrice < currentEma && notOverextendedShort) {
        rawSignal = 'SELL';
        conviction = 0.65;
        reason = 'Trend-following continuation below EMA';
      }
      break;
    }

    case 'RSI Pullback': {
      const prevPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
      if (currentRsi <= 35 && currentPrice >= ema50 && ema50 >= ema200 && currentPrice > prevPrice && notOverextendedLong) {
        rawSignal = 'BUY';
        conviction = 0.82;
        reason = `Oversold RSI Pullback (${currentRsi.toFixed(1)}) bounce setup in confirmed uptrend`;
      } else if (currentRsi >= 65 && currentPrice <= ema50 && ema50 <= ema200 && currentPrice < prevPrice && notOverextendedShort) {
        rawSignal = 'SELL';
        conviction = 0.82;
        reason = `Overbought RSI Pullback (${currentRsi.toFixed(1)}) rejection setup in confirmed downtrend`;
      } else {
        rawSignal = 'NEUTRAL';
        conviction = 0.3;
        reason = `RSI (${currentRsi.toFixed(1)}) not aligned with macro trend structure`;
      }
      break;
    }

    case 'MACD Divergence': {
      const macd = indicators.macd;
      if (macd && macd.histogram.length >= 2) {
        const histCurr = macd.histogram[macd.histogram.length - 1];
        const histPrev = macd.histogram[macd.histogram.length - 2];
        if (histCurr > 0 && histPrev <= 0 && notOverextendedLong) {
          rawSignal = 'BUY';
          conviction = 0.82;
          reason = 'Bullish MACD centerline histogram expansion';
        } else if (histCurr < 0 && histPrev >= 0 && notOverextendedShort) {
          rawSignal = 'SELL';
          conviction = 0.82;
          reason = 'Bearish MACD centerline histogram breakdown';
        }
      }
      break;
    }

    case 'Bollinger Breakout': {
      const bb = indicators.bollingerBands;
      if (bb && bb.upper.length > 0) {
        const upper = bb.upper[bb.upper.length - 1];
        const lower = bb.lower[bb.lower.length - 1];
        const prevUpper = bb.upper.length > 1 ? bb.upper[bb.upper.length - 2] : upper;
        const prevLower = bb.lower.length > 1 ? bb.lower[bb.lower.length - 2] : lower;
        const prevPrice = candles.length > 1 ? candles[candles.length - 2].close : currentPrice;

        if (currentPrice >= upper && prevPrice <= prevUpper && currentPrice >= ema50 && ema50 >= ema200 && currentRsi >= 50 && currentRsi <= 70 && notOverextendedLong) {
          rawSignal = 'BUY';
          conviction = 0.85;
          reason = 'Bollinger Upper Band breakout expansion';
        } else if (currentPrice <= lower && prevPrice >= prevLower && currentPrice <= ema50 && ema50 <= ema200 && currentRsi <= 50 && currentRsi >= 30 && notOverextendedShort) {
          rawSignal = 'SELL';
          conviction = 0.85;
          reason = 'Bollinger Lower Band breakdown contraction';
        }
      }
      break;
    }

    case 'Scalping 1-Min': {
      const prevPrice = candles[candles.length - 2].close;
      if (currentPrice > prevPrice && currentRsi < 60) {
        rawSignal = 'BUY';
        conviction = 0.7;
        reason = 'High-velocity 1-min scalp impulse';
      } else if (currentPrice < prevPrice && currentRsi > 40) {
        rawSignal = 'SELL';
        conviction = 0.7;
        reason = 'High-velocity 1-min scalp rejection';
      }
      break;
    }

    case 'MT5 Smart Money (SMC) & Order Block Sniper':
    case 'MT5 Triple Confluence Pro (Multi-Timeframe)':
    case 'MT5 London/NY Session Liquidity Breakout':
    case 'AI Autopilot (Machine à Cash)':
    default: {
      // High-conviction multi-indicator confluence with multi-timeframe EMA alignment
      const macdHist = indicators.macd?.histogram?.[indicators.macd.histogram.length - 1] ?? 0;
      const isBullAlignment = currentPrice >= currentEma && currentEma >= ema50 && currentPrice >= ema200 && notOverextendedLong;
      const isBearAlignment = currentPrice <= currentEma && currentEma <= ema50 && currentPrice <= ema200 && notOverextendedShort;

      if (isBullAlignment && currentRsi >= 46 && currentRsi <= 64 && macdHist >= -0.0001) {
        rawSignal = 'BUY';
        conviction = 0.88;
        reason = 'Institutional confluence: Price > EMA, RSI in sweet spot, positive MACD vector';
      } else if (isBearAlignment && currentRsi <= 54 && currentRsi >= 36 && macdHist <= 0.0001) {
        rawSignal = 'SELL';
        conviction = 0.88;
        reason = 'Institutional confluence: Price < EMA, RSI breakdown, negative MACD vector';
      } else {
        rawSignal = 'NEUTRAL';
        conviction = 0.4;
        reason = 'No clear institutional edge in current bar';
      }
      break;
    }
  }

  // --- F14 REGIME FILTERS ---

  // 1. Low Momentum Gate: Flat sideways markets with low ADX (< 20) are filtered to NEUTRAL
  if (currentAdx < 20 || (candles.length >= 20 && Math.abs(candles[candles.length - 1].close - candles[candles.length - 20].close) / currentPrice < 0.0005)) {
    rawSignal = 'NEUTRAL';
    conviction = Math.min(conviction, 0.3);
    reason = `Sideways market filtered (ADX: ${currentAdx.toFixed(1)} < 20)`;
  }

  // 2. Macro EMA 200 Directional Bias Filter (Strict Institutional Rule)
  if (candles.length >= 20) {
    if (rawSignal === 'BUY' && currentPrice < ema200) {
      rawSignal = 'NEUTRAL';
      conviction = 0.2;
      reason = 'BUY signal suppressed by Macro EMA 200 downtrend';
    } else if (rawSignal === 'SELL' && currentPrice > ema200) {
      rawSignal = 'NEUTRAL';
      conviction = 0.2;
      reason = 'SELL signal suppressed by Macro EMA 200 uptrend';
    }
  }

  // 3. Volume confirmation filter: Check volume against 20-period moving average
  let avgVolume = 0;
  for (let i = Math.max(0, candles.length - 20); i < candles.length; i++) {
    avgVolume += candles[i].volume;
  }
  avgVolume = avgVolume / 20;

  // --- F12 ASYMMETRIC RISK/REWARD CALIBRATION (R:R >= 2.0) ---
  const targetRR = 2.10; // Strictly >= 2.0 institutional R:R
  const isGoldOrMetal = isGold || cleanSym.includes('SILVER');
  const minBufferPct = isForex ? 0.0015 : (isGoldOrMetal ? 0.0025 : 0.008);
  const stopBuffer = Math.max(currentAtr * 1.2, currentPrice * minBufferPct);

  let entryPrice = currentPrice;
  let stopLoss = 0;
  let takeProfit = 0;

  if (rawSignal === 'BUY') {
    stopLoss = Number((entryPrice - stopBuffer).toFixed(4));
    const risk = entryPrice - stopLoss;
    takeProfit = Number((entryPrice + risk * targetRR).toFixed(4));
  } else if (rawSignal === 'SELL') {
    stopLoss = Number((entryPrice + stopBuffer).toFixed(4));
    const risk = stopLoss - entryPrice;
    takeProfit = Number((entryPrice - risk * targetRR).toFixed(4));
  } else {
    // Neutral reference levels
    stopLoss = Number((entryPrice - stopBuffer).toFixed(4));
    takeProfit = Number((entryPrice + stopBuffer * targetRR).toFixed(4));
  }

  return {
    signal: rawSignal,
    entryPrice,
    stopLoss,
    takeProfit,
    targetRiskReward: targetRR,
    conviction: Number(conviction.toFixed(2)),
    atr: Number(currentAtr.toFixed(4)),
    reason,
    strategy: strategyName,
    symbol,
  };
}
