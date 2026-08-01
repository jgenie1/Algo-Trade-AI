import { fetchLiveMarketData, type Candle } from './yahooFinanceService';
import { calculateIndicators } from './technicalAnalysisService';

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
  profitFactor: number;
  sharpeRatio: number;
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
  leverage: number = 5
): Promise<BacktestResult> {
  const candles = await fetchLiveMarketData(pair, timeframe);
  
  if (!candles || candles.length < 20) {
    throw new Error(`Données historiques insuffisantes pour ${pair} sur le timeframe ${timeframe}m.`);
  }

  const indicators = calculateIndicators(candles, ['RSI', 'EMA', 'SuperTrend', 'VWAP', 'Bollinger Bands']);
  const closes = candles.map(c => c.close);
  const rsiVals = indicators.rsi || [];
  const emaVals = indicators.ema || [];
  const stDirs = indicators.superTrend?.direction || [];
  const vwapVals = indicators.vwap || [];
  const bbLower = indicators.bollingerBands?.lower || [];
  const bbUpper = indicators.bollingerBands?.upper || [];

  let balance = initialBalance;
  let peakBalance = initialBalance;
  let maxDrawdown = 0;
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
  } | null = null;

  for (let i = 20; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const price = c.close;
    const timeStr = new Date(c.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Check if open position hit SL/TP or exit signal
    if (currentPosition) {
      const pos = currentPosition;
      let exitPrice: number | null = null;
      let exitReason = '';

      if (pos.type === 'BUY') {
        if (c.low <= pos.sl) {
          exitPrice = pos.sl;
          exitReason = 'Stop Loss déclenché';
        } else if (c.high >= pos.tp) {
          exitPrice = pos.tp;
          exitReason = 'Take Profit atteint';
        }
      } else {
        if (c.high >= pos.sl) {
          exitPrice = pos.sl;
          exitReason = 'Stop Loss déclenché';
        } else if (c.low <= pos.tp) {
          exitPrice = pos.tp;
          exitReason = 'Take Profit atteint';
        }
      }

      if (exitPrice !== null) {
        const priceDiff = exitPrice - pos.entryPrice;
        const pctDiff = pos.entryPrice > 0 ? (priceDiff / pos.entryPrice) : 0;
        const rawProfit = pctDiff * pos.amount * leverage * (pos.type === 'BUY' ? 1 : -1);
        const profit = Math.max(-pos.amount, rawProfit);
        const profitPct = (profit / pos.amount) * 100;

        balance += profit;
        if (profit >= 0) grossProfit += profit;
        else grossLoss += Math.abs(profit);

        if (balance > peakBalance) peakBalance = balance;
        const dd = ((peakBalance - balance) / peakBalance) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

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

    // 2. Look for new entry signal if no active position
    if (!currentPosition) {
      let signal: 'BUY' | 'SELL' | null = null;

      if (strategy === 'RSI Pullback' && rsiVals[i] !== undefined) {
        if (rsiVals[i] < 38 && price > prevC.close) signal = 'BUY';
        else if (rsiVals[i] > 62 && price < prevC.close) signal = 'SELL';
      } else if (strategy === 'EMA Cross' && emaVals[i] !== undefined && emaVals[i - 1] !== undefined) {
        const fastEma = emaVals[i];
        const prevFast = emaVals[i - 1];
        if (prevFast <= prevC.close && fastEma > price) signal = 'BUY';
        else if (prevFast >= prevC.close && fastEma < price) signal = 'SELL';
      } else if (strategy === 'SuperTrend Momentum' && stDirs[i] && stDirs[i - 1]) {
        if (stDirs[i - 1] === 'DOWN' && stDirs[i] === 'UP') signal = 'BUY';
        else if (stDirs[i - 1] === 'UP' && stDirs[i] === 'DOWN') signal = 'SELL';
      } else if (strategy === 'VWAP Breakout' && vwapVals[i] !== undefined) {
        const vwap = vwapVals[i];
        if (prevC.close < vwap && price > vwap) signal = 'BUY';
        else if (prevC.close > vwap && price < vwap) signal = 'SELL';
      } else if (strategy === 'BB Mean Reversion' && bbLower[i] && bbUpper[i]) {
        if (price <= bbLower[i]) signal = 'BUY';
        else if (price >= bbUpper[i]) signal = 'SELL';
      } else if (strategy === 'AI Autopilot (Machine à Cash)' || strategy.includes('IA')) {
        const rsi = rsiVals[i] || 50;
        if (rsi < 42 && price > prevC.close) signal = 'BUY';
        else if (rsi > 58 && price < prevC.close) signal = 'SELL';
      }

      if (signal) {
        const slDist = 0.015;
        const tpDist = 0.035;
        currentPosition = {
          type: signal,
          entryPrice: price,
          entryTime: c.time,
          amount: capitalPerTrade,
          sl: signal === 'BUY' ? price * (1 - slDist) : price * (1 + slDist),
          tp: signal === 'BUY' ? price * (1 + tpDist) : price * (1 - tpDist)
        };
      }
    }

    equityCurve.push({ time: timeStr, balance: parseFloat(balance.toFixed(2)) });
  }

  const winningTrades = trades.filter(t => t.profit >= 0).length;
  const losingTrades = trades.filter(t => t.profit < 0).length;
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const netProfit = balance - initialBalance;
  const returnPct = (netProfit / initialBalance) * 100;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 1;
  const returns = trades.map(t => t.profitPct);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / returns.length) : 1;
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

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
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    trades,
    equityCurve
  };
}
