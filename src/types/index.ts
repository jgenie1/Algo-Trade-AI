/**
 * @fileOverview Types TypeScript centraux pour AlgoTrade AI
 * Garantit un typage strict et exhaustif sur l'ensemble de l'application
 */

export interface Position {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  sl?: number;
  tp?: number;
  timestamp: number;
  botId?: string;
  botName?: string;
  txHash?: string;
  mint?: string;
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW' | string;
  bondingCurveProgress?: number;
  replyCount?: number;
  highestPrice?: number;
  highestPnlPct?: number;
  dcaCount?: number;
  mode?: 'DEMO' | 'REAL';
  pnl?: number;
  pnlPercent?: number;
}

export interface ClosedPosition {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  leverage: number;
  profit: number;
  pnl?: number;
  timestamp: number;
  closeTimestamp?: number;
  closedAt?: number;
  status?: string;
  wasBot?: boolean;
  botId?: string;
  botName?: string;
  buyTxHash?: string;
  sellTxHash?: string;
  mode?: 'DEMO' | 'REAL';
}

export interface BotInstance {
  id: string;
  name?: string;
  pair: string;
  strategy: string;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';
  pnl?: number;
  netProfit?: number;
  pnlPercent?: number;
  capital: number;
  tradesCount?: number;
  totalTrades?: number;
  winningTrades?: number;
  winRate?: number;
  aiModel?: string;
  mode: 'DEMO' | 'REAL';
  stopLossPct?: number;
  takeProfitPct?: number;
  trailingStopPct?: number;
  leverage?: number;
  pumpMode?: string;
  priorityFee?: number;
  maxDca?: number;
  subWallet?: number;
  consecutiveLosses?: number;
  selectivityMultiplier?: number;
  autoVolume?: boolean;
  timeframe?: string;
  customRules?: string;
  riskProfile?: string;
  createdAt?: number;
}

export interface BotLearning {
  id: string;
  botId: string;
  pair: string;
  type: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW' | string;
  bondingCurveProgress?: number;
  replyCount?: number;
  lossAmount?: number;
  profitAmount?: number;
  gainAmount?: number;
  txHash?: string;
  mode?: 'DEMO' | 'REAL';
  timestamp: number;
  learningEffect: string;
}

export interface BotLog {
  id: string;
  botId: string;
  botName: string;
  message: string;
  type: 'info' | 'trade' | 'error' | 'success';
  timestamp: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'SWAP' | 'TRANSFER' | 'FEE' | 'BOT_PROFIT' | 'TRADE';
  amount: number;
  currency: 'USD' | 'SOL' | 'EVM' | 'USDC' | 'USDT' | string;
  timestamp: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  txHash?: string;
  address?: string;
  fee?: number;
  notes?: string;
  description?: string;
}

export interface SubWallet {
  publicKey: string;
  privateKey: string;
  balance: number | null;
}

export interface CexKeyEntry {
  exchange: 'binance' | 'bybit' | 'kucoin' | 'okx' | string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  label?: string;
  status?: 'active' | 'inactive';
}

export interface NotificationSettings {
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
  customWebhookEnabled: boolean;
  customWebhookUrl: string;
  notifyOnTrade: boolean;
  notifyOnStopLoss: boolean;
  notifyOnVaultDeposit: boolean;
}

export interface AppState {
  tradeMode: 'DEMO' | 'REAL';
  balance: number;
  reserveVault?: number;
  reserveVaultSol?: number;
  positions: Position[];
  closedPositions: ClosedPosition[];
  bots: BotInstance[];
  transactions?: Transaction[];
  botLearnings?: BotLearning[];
  botLogs?: BotLog[];
  cexKeys?: CexKeyEntry[] | null;
  notificationSettings?: NotificationSettings | null;
}

export interface AppContextType {
  tradingMode: 'DEMO' | 'REAL';
  setTradingMode: React.Dispatch<React.SetStateAction<'DEMO' | 'REAL'>>;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  reserveVault: number;
  setReserveVault: React.Dispatch<React.SetStateAction<number>>;
  reserveVaultSol: number;
  setReserveVaultSol: React.Dispatch<React.SetStateAction<number>>;
  activePositions: Position[];
  setActivePositions: React.Dispatch<React.SetStateAction<Position[]>>;
  closedPositions: ClosedPosition[];
  setClosedPositions: React.Dispatch<React.SetStateAction<ClosedPosition[]>>;
  bots: BotInstance[];
  setBots: React.Dispatch<React.SetStateAction<BotInstance[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  botLearnings: BotLearning[];
  setBotLearnings: React.Dispatch<React.SetStateAction<BotLearning[]>>;
  botLogs: BotLog[];
  setBotLogs: React.Dispatch<React.SetStateAction<BotLog[]>>;
  resetDemoData: () => void;
  isLoading: boolean;
  userId?: string;
}
