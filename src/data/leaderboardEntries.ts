export interface LeaderboardEntry {
  rank: number;
  name: string;
  creator: string;
  strategy: string;
  strategyCategory: string;
  defaultPair: string;
  pnl: string;
  monthlyPnlVal: number;
  winRate: string;
  winRateVal: number;
  drawdown: string;
  riskLevel: 'FAIBLE' | 'MODÉRÉ' | 'ÉLEVÉ';
  followers: number;
  aiModel: string;
  timeframe: '24H' | '7D' | '30D' | 'ALL';
  stopLossPct: number;
  takeProfitPct: number;
  pumpMode?: 'PRECOCE' | 'MOMENTUM' | 'RAYDIUM';
}

export const DEMO_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "AlphaQuant Forex IA",
    creator: "QuantAI Labs",
    strategy: "AI Autopilot (Machine à Cash)",
    strategyCategory: "AI Autopilot (Machine à Cash)",
    defaultPair: "FX:EURUSD",
    pnl: "+342.15 %",
    monthlyPnlVal: 342.15,
    winRate: "84.2%",
    winRateVal: 84.2,
    drawdown: "3.5%",
    riskLevel: "MODÉRÉ",
    followers: 1420,
    aiModel: "Gemini 2.5 Flash",
    timeframe: "30D",
    stopLossPct: 2.5,
    takeProfitPct: 8.0
  },
  {
    rank: 2,
    name: "DeepMind FX Scanner",
    creator: "DeepMind Algo",
    strategy: "AI Autopilot (Machine à Cash)",
    strategyCategory: "AI Autopilot (Machine à Cash)",
    defaultPair: "FX:GBPUSD",
    pnl: "+210.84 %",
    monthlyPnlVal: 210.84,
    winRate: "76.4%",
    winRateVal: 76.4,
    drawdown: "4.1%",
    riskLevel: "MODÉRÉ",
    followers: 980,
    aiModel: "Gemini 2.5 Pro",
    timeframe: "30D",
    stopLossPct: 3.0,
    takeProfitPct: 9.0
  },
  {
    rank: 3,
    name: "RSI Pullback Bot v3",
    creator: "SafeYield",
    strategy: "RSI Pullback Reversal",
    strategyCategory: "RSI Pullback",
    defaultPair: "FX:EURUSD",
    pnl: "+150.32 %",
    monthlyPnlVal: 150.32,
    winRate: "89.1%",
    winRateVal: 89.1,
    drawdown: "1.2%",
    riskLevel: "FAIBLE",
    followers: 650,
    aiModel: "Moteur RSI-ATR Quant",
    timeframe: "30D",
    stopLossPct: 1.5,
    takeProfitPct: 4.5
  },
  {
    rank: 4,
    name: "Gold Cross Trend Rider",
    creator: "TrendMaster",
    strategy: "EMA Golden Cross Trend",
    strategyCategory: "EMA Cross",
    defaultPair: "GOLD",
    pnl: "+98.42 %",
    monthlyPnlVal: 98.42,
    winRate: "68.3%",
    winRateVal: 68.3,
    drawdown: "5.8%",
    riskLevel: "MODÉRÉ",
    followers: 310,
    aiModel: "Indicateur EMA-Cross 20/50",
    timeframe: "30D",
    stopLossPct: 3.5,
    takeProfitPct: 10.0
  }
];

export const REAL_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Solana Sniper God",
    creator: "SolDev Alpha",
    strategy: "Solana Sniper (Ultra-Précoce)",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:$WIF",
    pnl: "+1,480.95 %",
    monthlyPnlVal: 1480.95,
    winRate: "83.1%",
    winRateVal: 83.1,
    drawdown: "12.4%",
    riskLevel: "ÉLEVÉ",
    followers: 3410,
    aiModel: "DeepSeek R1 Quant",
    timeframe: "30D",
    stopLossPct: 15.0,
    takeProfitPct: 80.0,
    pumpMode: "PRECOCE"
  },
  {
    rank: 2,
    name: "PumpFun Alpha Snip",
    creator: "PumpSeeker",
    strategy: "Solana Sniper (Momentum)",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:$BONK",
    pnl: "+845.30 %",
    monthlyPnlVal: 845.30,
    winRate: "76.4%",
    winRateVal: 76.4,
    drawdown: "9.2%",
    riskLevel: "MODÉRÉ",
    followers: 1980,
    aiModel: "Gemini 2.5 Flash",
    timeframe: "30D",
    stopLossPct: 12.0,
    takeProfitPct: 60.0,
    pumpMode: "MOMENTUM"
  },
  {
    rank: 3,
    name: "Raydium Frontrunner",
    creator: "RaydiumLabs",
    strategy: "Raydium Migration Frontrun",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:RAYDIUM",
    pnl: "+310.42 %",
    monthlyPnlVal: 310.42,
    winRate: "91.0%",
    winRateVal: 91.0,
    drawdown: "2.5%",
    riskLevel: "FAIBLE",
    followers: 1150,
    aiModel: "Raydium Curve Watcher",
    timeframe: "30D",
    stopLossPct: 8.0,
    takeProfitPct: 40.0,
    pumpMode: "RAYDIUM"
  },
  {
    rank: 4,
    name: "MemeCoin Momentum V2",
    creator: "MemeQuant",
    strategy: "Solana Sniper (Momentum)",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:$TRUMP",
    pnl: "+125.80 %",
    monthlyPnlVal: 125.80,
    winRate: "64.2%",
    winRateVal: 64.2,
    drawdown: "7.8%",
    riskLevel: "MODÉRÉ",
    followers: 420,
    aiModel: "Analyse Sentiment IA",
    timeframe: "30D",
    stopLossPct: 10.0,
    takeProfitPct: 50.0,
    pumpMode: "MOMENTUM"
  }
];
