import { calculateIndicators } from './technicalAnalysisService';
import { fetchLiveMarketData } from './yahooFinanceService';

export interface BacktestOptions {
  spreadPips?: number;        // Explicit spread in pips
  slippagePct?: number;       // Execution slippage percentage (e.g. 0.0005 for 0.05%)
  commissionPerLot?: number;  // Broker commission per lot round-turn ($6 default for Forex/CFD)
  takerFeePct?: number;       // Crypto exchange taker fee percentage (0.0005 default for Crypto)
  candlesDepth?: number;      // Depth of historical candles to fetch (e.g. 300 to 1000, default 300)
  maxDrawdownLimitPct?: number; // Maximum allowable drawdown % (e.g. 15 for 15%)
}

export interface BacktestResult {
  pair: string;
  strategy: string;
  timeframe: string;
  initialBalance: number;
  finalBalance: number;
  netProfit: number;
  returnPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownExceeded: boolean;
  profitFactor: number;
  realizedRiskRewardRatio: number;
  sharpeRatio: number;
  candlesEvaluated: number;
  trades: Array<{
    id: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    exitPrice: number;
    entryTime: number;
    exitTime: number;
    profit: number;
    profitPct: number;
    reason: string;
  }>;
  equityCurve: Array<{
    time: string;
    balance: number;
  }>;
}

export async function runBacktest(
  pair: string,
  strategy: string,
  timeframe: string = '15',
  initialBalance: number = 10000,
  capitalPerTrade: number = 1000,
  leverage: number = 5,
  options?: BacktestOptions
): Promise<BacktestResult> {
  const depth = Math.max(20, Math.min(options?.candlesDepth || 300, 1000));
  let candles: any[] = [];
  try {
    candles = await fetchLiveMarketData(pair, timeframe, { limit: depth });
  } catch (err: any) {
    throw new Error(`Données historiques insuffisantes pour ${pair} sur le timeframe ${timeframe}m. (error: ${err?.message || err})`);
  }
  
  if (!candles || candles.length < 20) {
    throw new Error(`Données historiques insuffisantes pour ${pair} sur le timeframe ${timeframe}m.`);
  }

  const indicators = calculateIndicators(candles, ['RSI', 'EMA', 'SuperTrend', 'VWAP', 'Bollinger Bands', 'MT5']);
  const rsiVals = indicators.rsi || [];
  const emaVals = indicators.ema || [];
  const stDirs = indicators.superTrend?.direction || [];
  const vwapVals = indicators.vwap || [];
  const bbLower = indicators.bollingerBands?.lower || [];
  const bbUpper = indicators.bollingerBands?.upper || [];

  const closes = candles.map(c => c.close);
  const getEMA = (values: number[], period: number): number[] => {
    const ema: number[] = [];
    const k = 2 / (period + 1);
    let lastEma = values[0] || 0;
    ema.push(lastEma);
    for (let j = 1; j < values.length; j++) {
      lastEma = values[j] * k + lastEma * (1 - k);
      ema.push(lastEma);
    }
    return ema;
  };

  const ema50Series = getEMA(closes, Math.min(50, closes.length));
  const ema200Series = getEMA(closes, Math.min(200, closes.length));

  let balance = initialBalance;
  let peakEquity = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownExceeded = false;
  let grossProfit = 0;
  let grossLoss = 0;

  const trades: BacktestResult['trades'] = [];
  const equityCurve: BacktestResult['equityCurve'] = [
    { time: new Date(candles[0].time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), balance: initialBalance }
  ];

  let currentPosition: {
    type: 'BUY' | 'SELL';
    entryPrice: number;
    entryTime: number;
    amount: number;
    sl: number;
    tp: number;
    highestPrice?: number;
    lowestPrice?: number;
    trailingTier?: number;
  } | null = null;

  const cleanPair = pair.trim().toUpperCase().replace(/^FX:/, '').replace(/\//g, '').replace('USDT', '').replace('-USD', '').replace('=X', '').replace('=F', '');
  const isCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX'].some(c => cleanPair.includes(c));
  const isGold = cleanPair.includes('GOLD') || cleanPair.includes('XAU');

  for (let i = 20; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const price = c.close;
    const timeStr = new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Check if open position hit SL/TP or exit signal with Multi-Tier Trailing Stop
    if (currentPosition) {
      const pos = currentPosition;
      let exitPrice: number | null = null;
      let exitReason = '';

      if (pos.type === 'BUY') {
        pos.highestPrice = Math.max(pos.highestPrice || pos.entryPrice, c.high);
        const peakGainPct = (pos.highestPrice - pos.entryPrice) / (pos.entryPrice || 1);

        // Palier 1 : Break-Even à +2.20% avec stop garanti à +0.60%
        if (peakGainPct >= 0.022 && pos.sl < pos.entryPrice * 1.006) {
          pos.sl = pos.entryPrice * 1.006;
          pos.trailingTier = 1;
        }
        // Palier 2 : Verrouillage profit +1.80% dès +3.60%
        if (peakGainPct >= 0.036 && pos.sl < pos.entryPrice * 1.018) {
          pos.sl = pos.entryPrice * 1.018;
          pos.trailingTier = 2;
        }
        // Palier 3 : Verrouillage profit étendu +3.50% dès +5.50%
        if (peakGainPct >= 0.055 && pos.sl < pos.entryPrice * 1.035) {
          pos.sl = pos.entryPrice * 1.035;
          pos.trailingTier = 3;
        }

        // Feature F7: Execution Slippage & Gap Fills on exit
        if (c.open < pos.sl) {
          exitPrice = c.open;
          exitReason = 'Stop Loss déclenché (Gap Fill)';
        } else if (c.low <= pos.sl) {
          exitPrice = pos.sl;
          exitReason = pos.sl > pos.entryPrice ? 'Trailing Stop Sécurisé' : 'Stop Loss déclenché';
        } else if (c.open > pos.tp) {
          exitPrice = c.open;
          exitReason = 'Take Profit atteint (Gap Fill)';
        } else if (c.high >= pos.tp) {
          exitPrice = pos.tp;
          exitReason = 'Take Profit atteint';
        }
      } else {
        pos.lowestPrice = Math.min(pos.lowestPrice || pos.entryPrice, c.low);
        const peakGainPct = (pos.entryPrice - pos.lowestPrice) / (pos.entryPrice || 1);

        // Palier 1 : Break-Even à +2.20% avec stop garanti à +0.60%
        if (peakGainPct >= 0.022 && pos.sl > pos.entryPrice * 0.994) {
          pos.sl = pos.entryPrice * 0.994;
          pos.trailingTier = 1;
        }
        // Palier 2 : Verrouillage profit +1.80% dès +3.60%
        if (peakGainPct >= 0.036 && pos.sl > pos.entryPrice * 0.982) {
          pos.sl = pos.entryPrice * 0.982;
          pos.trailingTier = 2;
        }
        // Palier 3 : Verrouillage profit étendu +3.50% dès +5.50%
        if (peakGainPct >= 0.055 && pos.sl > pos.entryPrice * 0.965) {
          pos.sl = pos.entryPrice * 0.965;
          pos.trailingTier = 3;
        }

        // Feature F7: Short execution gap fills on exit
        if (c.open > pos.sl) {
          exitPrice = c.open;
          exitReason = 'Stop Loss déclenché (Gap Fill)';
        } else if (c.high >= pos.sl) {
          exitPrice = pos.sl;
          exitReason = pos.sl < pos.entryPrice ? 'Trailing Stop Sécurisé' : 'Stop Loss déclenché';
        } else if (c.open < pos.tp) {
          exitPrice = c.open;
          exitReason = 'Take Profit atteint (Gap Fill)';
        } else if (c.low <= pos.tp) {
          exitPrice = pos.tp;
          exitReason = 'Take Profit atteint';
        }
      }

      if (exitPrice !== null) {
        const priceDiff = exitPrice - pos.entryPrice;
        const pctDiff = pos.entryPrice > 0 ? (priceDiff / pos.entryPrice) : 0;
        const rawProfit = pctDiff * pos.amount * leverage * (pos.type === 'BUY' ? 1 : -1);

        // Feature F8: Broker Commissions & Fees
        let fee = 0;
        if (isCrypto) {
          if (options?.takerFeePct !== undefined) {
            fee = pos.amount * leverage * options.takerFeePct * 2;
          } else if (options?.commissionPerLot !== undefined) {
            const lots = (pos.amount * leverage) / 100000;
            fee = options.commissionPerLot * lots;
          } else {
            fee = pos.amount * leverage * 0.0005 * 2;
          }
        } else {
          const lots = (pos.amount * leverage) / 100000;
          fee = (options?.commissionPerLot ?? 6.0) * lots;
        }

        const profit = Math.max(-pos.amount, rawProfit - fee);
        const profitPct = pos.amount > 0 ? (profit / pos.amount) * 100 : 0;

        balance += profit;
        if (profit >= 0) grossProfit += profit;
        else grossLoss += Math.abs(profit);

        trades.push({
          id: `bt_${trades.length + 1}`,
          type: pos.type,
          entryPrice: pos.entryPrice,
          exitPrice,
          entryTime: pos.entryTime,
          exitTime: c.time,
          profit,
          profitPct,
          reason: exitReason
        });

        currentPosition = null;
      }
    }

    // Floating equity & Max Drawdown computation (Feature F9)
    let floatingPnl = 0;
    if (currentPosition) {
      const uDiff = c.close - currentPosition.entryPrice;
      const uPct = currentPosition.entryPrice > 0 ? uDiff / currentPosition.entryPrice : 0;
      floatingPnl = Math.max(-currentPosition.amount, uPct * currentPosition.amount * leverage * (currentPosition.type === 'BUY' ? 1 : -1));
    }
    const currentEquity = balance + floatingPnl;
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const dd = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
    const clampedDd = Math.min(100, Math.max(0, dd));
    if (clampedDd > maxDrawdown) maxDrawdown = clampedDd;

    equityCurve.push({ time: timeStr, balance: parseFloat(currentEquity.toFixed(2)) });

    // Circuit Breaker check
    const maxDdLimit = options?.maxDrawdownLimitPct ?? 15;
    if (maxDrawdown >= maxDdLimit) {
      maxDrawdownExceeded = true;
      if (options?.maxDrawdownLimitPct !== undefined) {
        if (currentPosition) {
          const priceDiff = c.close - currentPosition.entryPrice;
          const pctDiff = currentPosition.entryPrice > 0 ? priceDiff / currentPosition.entryPrice : 0;
          const rawProfit = pctDiff * currentPosition.amount * leverage * (currentPosition.type === 'BUY' ? 1 : -1);
          const lots = (currentPosition.amount * leverage) / 100000;
          const fee = (options?.commissionPerLot ?? 6.0) * lots;
          const profit = Math.max(-currentPosition.amount, rawProfit - fee);
          const profitPct = currentPosition.amount > 0 ? (profit / currentPosition.amount) * 100 : 0;
          balance += profit;
          if (profit >= 0) grossProfit += profit;
          else grossLoss += Math.abs(profit);
          trades.push({
            id: `bt_${trades.length + 1}`,
            type: currentPosition.type,
            entryPrice: currentPosition.entryPrice,
            exitPrice: c.close,
            entryTime: currentPosition.entryTime,
            exitTime: c.time,
            profit,
            profitPct,
            reason: 'Circuit Breaker Drawdown Exceeded'
          });
          currentPosition = null;
        }
        break;
      }
    }

    // 2. Look for new entry signal if no active position
    if (!currentPosition && !maxDrawdownExceeded) {
      let signal: 'BUY' | 'SELL' | null = null;
      const lastEma50 = ema50Series[i] || price;
      const lastEma200 = ema200Series[i] || lastEma50;
      const isMacroBullish = price >= lastEma200 && lastEma50 >= lastEma200 * 0.995;
      const isMacroBearish = price <= lastEma200 && lastEma50 <= lastEma200 * 1.005;

      if (strategy === 'RSI Pullback' && rsiVals[i] !== undefined) {
        if (rsiVals[i] < 38 && price > prevC.close && isMacroBullish) signal = 'BUY';
        else if (rsiVals[i] > 62 && price < prevC.close && isMacroBearish) signal = 'SELL';
      } else if (strategy === 'EMA Cross' && emaVals[i] !== undefined && emaVals[i - 1] !== undefined) {
        const fastEma = emaVals[i];
        const prevFast = emaVals[i - 1];
        if (prevC.close <= prevFast && price > fastEma && isMacroBullish) signal = 'BUY';
        else if (prevC.close >= prevFast && price < fastEma && isMacroBearish) signal = 'SELL';
      } else if (strategy === 'SuperTrend Momentum' && stDirs[i] && stDirs[i - 1]) {
        if (stDirs[i - 1] === 'DOWN' && stDirs[i] === 'UP' && isMacroBullish) signal = 'BUY';
        else if (stDirs[i - 1] === 'UP' && stDirs[i] === 'DOWN' && isMacroBearish) signal = 'SELL';
      } else if (strategy === 'VWAP Breakout' && vwapVals[i] !== undefined) {
        const vwap = vwapVals[i];
        if (prevC.close < vwap && price > vwap && isMacroBullish) signal = 'BUY';
        else if (prevC.close > vwap && price < vwap && isMacroBearish) signal = 'SELL';
      } else if (strategy === 'BB Mean Reversion' && bbLower[i] && bbUpper[i]) {
        if (price <= bbLower[i] && (price >= lastEma200 * 0.98)) signal = 'BUY';
        else if (price >= bbUpper[i] && (price <= lastEma200 * 1.02)) signal = 'SELL';
      } else if (strategy === 'AI Autopilot (Machine à Cash)' || strategy.includes('IA')) {
        const rsi = rsiVals[i] || 50;
        if (rsi >= 44 && rsi <= 68 && price > prevC.close && isMacroBullish) signal = 'BUY';
        else if (rsi <= 56 && rsi >= 32 && price < prevC.close && isMacroBearish) signal = 'SELL';
      } else if (strategy.includes('SMC') || strategy.includes('Smart Money')) {
        const rsi = rsiVals[i] || 50;
        const prevMin = Math.min(...candles.slice(Math.max(0, i - 10), i).map(x => x.low));
        const prevMax = Math.max(...candles.slice(Math.max(0, i - 10), i).map(x => x.high));
        if (prevC.low <= prevMin && price > prevC.open && rsi >= 34 && rsi <= 64 && isMacroBullish) signal = 'BUY';
        else if (prevC.high >= prevMax && price < prevC.open && rsi <= 66 && rsi >= 36 && isMacroBearish) signal = 'SELL';
      } else if (strategy.includes('Triple Confluence')) {
        const rsi = rsiVals[i] || 50;
        const emaFast = emaVals[i] || price;
        if (price >= emaFast && rsi <= 48 && price > prevC.close && isMacroBullish) signal = 'BUY';
        else if (price <= emaFast && rsi >= 52 && price < prevC.close && isMacroBearish) signal = 'SELL';
      } else if (strategy.includes('Breakout') && strategy.includes('MT5')) {
        const boxHigh = Math.max(...candles.slice(Math.max(0, i - 10), i).map(x => x.high));
        const boxLow = Math.min(...candles.slice(Math.max(0, i - 10), i).map(x => x.low));
        if (price > boxHigh && price > prevC.close && isMacroBullish) signal = 'BUY';
        else if (price < boxLow && price < prevC.close && isMacroBearish) signal = 'SELL';
      }

      if (signal) {
        // Feature F6: Realistic Bid-Ask Spreads
        let spread = 0;
        if (options?.spreadPips !== undefined) {
          spread = options.spreadPips * (pair.includes('JPY') ? 0.01 : 0.0001);
        } else if (isGold) {
          spread = 0.35;
        } else if (isCrypto) {
          spread = price * 0.0005;
        } else {
          // Forex standard 1.2 pips
          spread = 1.2 * (pair.includes('JPY') ? 0.01 : 0.0001);
        }

        const ask = price + spread / 2;
        const bid = price - spread / 2;

        // Feature F7: Execution Slippage
        const slippagePct = Math.max(0, options?.slippagePct ?? 0.0002);
        const executedEntryPrice = signal === 'BUY'
          ? ask * (1 + slippagePct)
          : bid * (1 - slippagePct);

        const slDist = 0.015;
        const tpDist = 0.035;
        currentPosition = {
          type: signal,
          entryPrice: executedEntryPrice,
          entryTime: c.time,
          amount: capitalPerTrade,
          sl: signal === 'BUY' ? executedEntryPrice * (1 - slDist) : executedEntryPrice * (1 + slDist),
          tp: signal === 'BUY' ? executedEntryPrice * (1 + tpDist) : executedEntryPrice * (1 - tpDist),
          highestPrice: executedEntryPrice,
          lowestPrice: executedEntryPrice,
          trailingTier: 0
        };
      }
    }
  }

  // Feature F9: Mathematical Performance Metrics
  const winningTrades = trades.filter(t => t.profit >= 0).length;
  const losingTrades = trades.filter(t => t.profit < 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const netProfit = balance - initialBalance;
  const returnPct = (netProfit / initialBalance) * 100;

  const profitFactor = grossLoss > 0
    ? parseFloat((grossProfit / grossLoss).toFixed(2))
    : (grossProfit > 0 ? parseFloat(grossProfit.toFixed(2)) : (grossProfit === 0 && grossLoss === 0 ? 1 : 0));

  const winTradesList = trades.filter(t => t.profit >= 0);
  const lossTradesList = trades.filter(t => t.profit < 0);
  const avgWin = winTradesList.length > 0 ? (winTradesList.reduce((a, b) => a + b.profit, 0) / winTradesList.length) : 0;
  const avgLoss = lossTradesList.length > 0 ? Math.abs(lossTradesList.reduce((a, b) => a + b.profit, 0) / lossTradesList.length) : 0;
  const realizedRiskRewardRatio = avgLoss > 0
    ? parseFloat((avgWin / avgLoss).toFixed(2))
    : (avgWin > 0 ? parseFloat(avgWin.toFixed(2)) : 1.0);

  const returns = trades.map(t => t.profitPct);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length) : 0;
  const sharpeRatio = stdDev > 0 ? parseFloat(((avgReturn / stdDev) * Math.sqrt(252)).toFixed(2)) : 0;

  return {
    pair,
    strategy,
    timeframe,
    initialBalance,
    finalBalance: parseFloat(balance.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    returnPct: parseFloat(returnPct.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: parseFloat(winRate.toFixed(1)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownExceeded,
    profitFactor,
    realizedRiskRewardRatio,
    sharpeRatio,
    candlesEvaluated: candles.length,
    trades,
    equityCurve
  };
}
