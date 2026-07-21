"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  Zap, 
  History,
  Activity,
  X,
  RefreshCw
} from 'lucide-react';
import { fetchLiveMarketData, type Candle } from '@/services/yahooFinanceService';
import { calculateIndicators } from '@/services/technicalAnalysisService';
import { fetchLatestPumpCoins, fetchPumpCoin, getPumpFunWsUrl, executeRealPumpTrade, getRealSolanaBalance, checkSolanaNetworkHealth, getMultipleSolanaBalances, disperseSolToSubWallets, generateSubWalletsServer } from '@/services/pumpFunService';
import { cn } from '@/lib/utils';

interface Position {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  sl?: number;
  tp?: number;
  timestamp: number;
  botId?: string; // If opened by a bot
  txHash?: string; // Solana buy transaction hash

  // Self-learning metrics
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW';
  bondingCurveProgress?: number;
  replyCount?: number;
}

interface ClosedPosition {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  amount: number;
  leverage: number;
  profit: number;
  timestamp: number;
  wasBot: boolean;
  buyTxHash?: string;
  sellTxHash?: string;
}

interface BotLearning {
  id: string;
  botId: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW';
  bondingCurveProgress?: number;
  replyCount?: number;
  lossAmount: number;
  timestamp: number;
  learningEffect: string;
  isPositive?: boolean;
  amount?: number;
}

interface TradingBot {
  id: string;
  pair: string;
  strategy: 'RSI Pullback' | 'EMA Cross' | 'BB Mean Reversion' | 'AI Autopilot (Machine à Cash)' | 'Pump.fun Sniper Bot';
  timeframe: string;
  capital: number;
  status: 'RUNNING' | 'STOPPED';
  createdAt: number;
  totalTrades?: number;
  winningTrades?: number;
  consecutiveLosses?: number;
  netProfit?: number;
  selectivityMultiplier?: number;
  riskProfile?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  pumpMode?: 'PRECOCE' | 'MOMENTUM' | 'RAYDIUM';
  priorityFee?: number;
  autoVolume?: boolean;
  mode?: 'DEMO' | 'REAL';
  customRules?: string;
}

interface BotLog {
  id: string;
  botId: string;
  botName: string;
  message: string;
  type: 'info' | 'trade' | 'error';
  timestamp: number;
}

const currencyPairs = [
  { value: 'FX:EURUSD', label: 'EUR/USD', ticker: 'EURUSD=X' },
  { value: 'FX:GBPUSD', label: 'GBP/USD', ticker: 'GBPUSD=X' },
  { value: 'FX:USDJPY', label: 'USD/JPY', ticker: 'JPY=X' },
  { value: 'FX:AUDUSD', label: 'AUD/USD', ticker: 'AUDUSD=X' },
  { value: 'FX:USDCAD', label: 'USD/CAD', ticker: 'CAD=X' },
  { value: 'FX:USDCHF', label: 'USD/CHF', ticker: 'CHF=X' },
  { value: 'BNB', label: 'BNB/USD', ticker: 'BNB-USD' },
  { value: 'BTC', label: 'BTC/USD', ticker: 'BTC-USD' },
  { value: 'ETH', label: 'ETH/USD', ticker: 'ETH-USD' },
  { value: 'LINK', label: 'LINK/USD', ticker: 'LINK-USD' },
  { value: 'GOLD', label: 'GOLD/USD', ticker: 'GC=F' },
];

const timeframes = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 heure' },
  { value: 'D', label: '1 jour' },
];

export default function TradingTerminalPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'bots' | 'wallets'>('manual');
  const [tradingMode, setTradingMode] = useState<'DEMO' | 'REAL'>('DEMO');
  
  // Account States
  const [balance, setBalance] = useState<number>(10000);
  const [equity, setEquity] = useState<number>(10000);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [botLearnings, setBotLearnings] = useState<BotLearning[]>([]);

  // Manual Order Form State
  const [selectedPair, setSelectedPair] = useState<string>('FX:EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15');
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderAmount, setOrderAmount] = useState<number>(500);
  const [leverage, setLeverage] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');

  // Live prices cache
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: 'up' | 'down' | 'flat' }>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  // New Bot Form State
  const [botPair, setBotPair] = useState<string>('FX:EURUSD');
  const [botStrategy, setBotStrategy] = useState<'RSI Pullback' | 'EMA Cross' | 'BB Mean Reversion' | 'AI Autopilot (Machine à Cash)' | 'Pump.fun Sniper Bot'>('AI Autopilot (Machine à Cash)');
  const [botTimeframe, setBotTimeframe] = useState<string>('15');
  const [botCapital, setBotCapital] = useState<number>(1000);
  const [botRiskProfile, setBotRiskProfile] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE');
  const [pumpSniperMode, setPumpSniperMode] = useState<'PRECOCE' | 'MOMENTUM' | 'RAYDIUM'>('PRECOCE');
  const [priorityFee, setPriorityFee] = useState<number>(0.005);
  const [autoVolume, setAutoVolume] = useState<boolean>(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [isSolanaWalletActive, setIsSolanaWalletActive] = useState<boolean>(false);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [nodeBlockHeight, setNodeBlockHeight] = useState<number | null>(null);
  const [disperseAmount, setDisperseAmount] = useState<number>(0.02);
  const [isDispersing, setIsDispersing] = useState<boolean>(false);
  const [disperseTxHash, setDisperseTxHash] = useState<string>('');
  const [disperseError, setDisperseError] = useState<string>('');
  interface SubWallet {
    publicKey: string;
    privateKey: string;
    balance: number | null;
  }

  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load data from LocalStorage on mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem('trade_balance');
      const storedPositions = localStorage.getItem('trade_positions');
      const storedClosed = localStorage.getItem('trade_closed');
      const storedBots = localStorage.getItem('trade_bots');
      const storedLogs = localStorage.getItem('trade_logs');
      const storedLearnings = localStorage.getItem('trade_learnings');
      const storedMode = localStorage.getItem('trade_mode');

      const deduplicateById = (arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        const seen = new Set();
        return arr.filter(item => {
          if (!item || !item.id) return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      };

      if (storedMode === 'REAL' || storedMode === 'DEMO') setTradingMode(storedMode);
      if (storedBalance) setBalance(parseFloat(storedBalance));
      if (storedPositions) {
        try {
          const parsed = JSON.parse(storedPositions);
          setActivePositions(deduplicateById(parsed));
        } catch (e) {}
      }
      if (storedClosed) {
        try {
          const parsed = JSON.parse(storedClosed);
          setClosedPositions(deduplicateById(parsed));
        } catch (e) {}
      }
      if (storedBots) {
        try {
          const parsed = JSON.parse(storedBots);
          setBots(deduplicateById(parsed));
        } catch (e) {}
      }
      if (storedLogs) {
        try {
          const parsed = JSON.parse(storedLogs);
          setBotLogs(deduplicateById(parsed));
        } catch (e) {}
      }
      if (storedLearnings) {
        try {
          const parsed = JSON.parse(storedLearnings);
          setBotLearnings(deduplicateById(parsed));
        } catch (e) {}
      }

      const storedSubs = localStorage.getItem('trade_sub_wallets');
      if (storedSubs) {
        try {
          setSubWallets(JSON.parse(storedSubs));
        } catch (e) {}
      } else {
        generateSubWalletsServer().then(res => {
          if (res.success && res.wallets) {
            localStorage.setItem('trade_sub_wallets', JSON.stringify(res.wallets));
            setSubWallets(res.wallets);
          }
        });
      }
    }
  }, []);

  // Save to LocalStorage whenever states change
  useEffect(() => {
    localStorage.setItem('trade_mode', tradingMode);
  }, [tradingMode]);

  useEffect(() => {
    localStorage.setItem('trade_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('trade_positions', JSON.stringify(activePositions));
  }, [activePositions]);

  useEffect(() => {
    localStorage.setItem('trade_closed', JSON.stringify(closedPositions));
  }, [closedPositions]);

  useEffect(() => {
    localStorage.setItem('trade_bots', JSON.stringify(bots));
  }, [bots]);

  useEffect(() => {
    localStorage.setItem('trade_logs', JSON.stringify(botLogs));
  }, [botLogs]);

  useEffect(() => {
    localStorage.setItem('trade_learnings', JSON.stringify(botLearnings));
  }, [botLearnings]);

  // Sync bot strategy selection on trading mode change
  useEffect(() => {
    if (tradingMode === 'DEMO') {
      setBotStrategy('AI Autopilot (Machine à Cash)');
    } else {
      setBotStrategy('Pump.fun Sniper Bot');
    }
  }, [tradingMode]);

  // Periodic Solana Balance & Node status sync
  useEffect(() => {
    if (!isMounted) return;
    
    const updateWalletAndStatus = () => {
      getRealSolanaBalance().then(res => {
        if (res.success && res.balance !== undefined && res.publicKey) {
          setSolanaBalance(res.balance);
          setSolanaPubKey(res.publicKey);
          setIsSolanaWalletActive(true);
        } else {
          setIsSolanaWalletActive(false);
        }
      });

      checkSolanaNetworkHealth().then(res => {
        if (res.success && res.latency !== undefined && res.blockHeight !== undefined) {
          setRpcLatency(res.latency);
          setNodeBlockHeight(res.blockHeight);
        } else {
          setRpcLatency(null);
          setNodeBlockHeight(null);
        }
      });

      // Get sub-wallet balances from blockchain
      const storedSubs = localStorage.getItem('trade_sub_wallets');
      if (storedSubs) {
        try {
          const subs = JSON.parse(storedSubs) as SubWallet[];
          const pubKeys = subs.map(s => s.publicKey);
          getMultipleSolanaBalances(pubKeys).then(balRes => {
            if (balRes.success && balRes.balances) {
              const updated = subs.map(s => ({
                ...s,
                balance: balRes.balances![s.publicKey] ?? 0
              }));
              localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
              setSubWallets(updated);
            }
          });
        } catch (e) {}
      }
    };

    updateWalletAndStatus();
    const interval = setInterval(updateWalletAndStatus, 12000);
    return () => clearInterval(interval);
  }, [isMounted]);

  // Fetch prices loop
  useEffect(() => {
    const updatePrices = async () => {
      setIsLoadingPrice(true);
      const uniquePairs = Array.from(new Set([
        selectedPair,
        botPair,
        ...activePositions.map(p => p.pair),
        ...bots.filter(b => b.status === 'RUNNING').map(b => b.pair)
      ]));

      for (const pairVal of uniquePairs) {
        if (pairVal.startsWith('SOL:')) {
          const parts = pairVal.split(':');
          if (parts.length >= 2) {
            const mint = parts[1];
            try {
              const coin = await fetchPumpCoin(mint);
              if (coin) {
                const lastClose = coin.virtual_sol_reserves / coin.virtual_token_reserves;
                setLivePrices(prev => {
                  const oldPrice = prev[pairVal];
                  if (oldPrice) {
                    setPriceDirections(dir => ({
                      ...dir,
                      [pairVal]: lastClose > oldPrice ? 'up' : lastClose < oldPrice ? 'down' : 'flat'
                    }));
                  }
                  return { ...prev, [pairVal]: lastClose };
                });
              }
            } catch (e) {}
          }
        } else {
          try {
            const candles = await fetchLiveMarketData(pairVal, '15');
            if (candles.length > 0) {
              const lastClose = candles[candles.length - 1].close;
              setLivePrices(prev => {
                const oldPrice = prev[pairVal];
                if (oldPrice) {
                  setPriceDirections(dir => ({
                    ...dir,
                    [pairVal]: lastClose > oldPrice ? 'up' : lastClose < oldPrice ? 'down' : 'flat'
                  }));
                }
                return { ...prev, [pairVal]: lastClose };
              });
            }
          } catch (e) {}
        }
      }
      setIsLoadingPrice(false);
    };

    updatePrices();
    const interval = setInterval(updatePrices, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, [selectedPair, botPair, activePositions.length, bots.length]);

  // Fast UI ticker simulation (adds minor noise to prices every second to look interactive)
  useEffect(() => {
    const noiseInterval = setInterval(() => {
      setLivePrices(prev => {
        const nextPrices = { ...prev };
        Object.keys(nextPrices).forEach(key => {
          const basePrice = nextPrices[key];
          const isMeme = key.startsWith('SOL:');
          const volatility = isMeme ? 0.025 : 0.0001; // 2.5% volatility for memes vs 0.01% for forex!
          const jitterPercent = (Math.random() - 0.48) * volatility; // slight upward bias
          nextPrices[key] = basePrice * (1 + jitterPercent);
        });
        return nextPrices;
      });
    }, 1000);

    return () => clearInterval(noiseInterval);
  }, []);

  // Compute live equity based on active positions PnL and locked funds
  useEffect(() => {
    let totalPnL = 0;
    activePositions.forEach(p => {
      const current = livePrices[p.pair] || p.entryPrice;
      const priceDiff = current - p.entryPrice;
      const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
      const pnl = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
      totalPnL += pnl;
    });

    const lockedManualMargin = activePositions
      .filter(p => !p.botId)
      .reduce((sum, p) => sum + p.amount, 0);

    const activeBotCapital = bots
      .reduce((sum, b) => sum + b.capital, 0);

    setEquity(balance + lockedManualMargin + activeBotCapital + totalPnL);
  }, [activePositions, livePrices, balance, bots]);

  // Refs to maintain latest state values in async intervals
  const botsRef = useRef(bots);
  const activePositionsRef = useRef(activePositions);
  const livePricesRef = useRef(livePrices);
  const liveWsCoinsRef = useRef<any[]>([]);
  const botLearningsRef = useRef(botLearnings);
  const subWalletsRef = useRef(subWallets);

  useEffect(() => {
    botsRef.current = bots;
    activePositionsRef.current = activePositions;
    livePricesRef.current = livePrices;
    botLearningsRef.current = botLearnings;
    subWalletsRef.current = subWallets;
  });

  // Client-side WebSocket Connection to Pump.fun API Provider (pumpdev.io)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = async () => {
      const url = await getPumpFunWsUrl();
      if (!url || (!url.startsWith('wss://') && !url.startsWith('ws://'))) {
        return;
      }

      console.log("Connecting to Pump.fun WebSocket via provider:", url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("Pump.fun WebSocket connected!");
        ws?.send(JSON.stringify({ method: 'subscribeNewToken' }));
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          // Standard response from pumpdev.io contains mint, symbol, etc.
          if (raw && raw.mint) {
            console.log("WebSocket New Token Event:", raw.symbol, raw.mint);
            const formattedCoin = {
              mint: raw.mint,
              name: raw.name || raw.symbol || 'Unknown',
              symbol: raw.symbol || 'MEME',
              description: raw.description || '',
              image_uri: raw.image_uri || raw.uri || '',
              bonding_curve: raw.bonding_curve || raw.bondingCurveKey || '',
              complete: !!raw.complete,
              virtual_sol_reserves: raw.virtual_sol_reserves || raw.vSolReserves || 30000000000,
              virtual_token_reserves: raw.virtual_token_reserves || raw.vTokenReserves || 1073000000000000,
              created_timestamp: raw.created_timestamp || Date.now(),
              market_cap: raw.market_cap || raw.marketCapSol || 30,
              reply_count: raw.reply_count || raw.replies || 0
            };

            liveWsCoinsRef.current = [formattedCoin, ...liveWsCoinsRef.current].slice(0, 50);
          }
        } catch (e) {}
      };

      ws.onerror = (err) => {
        console.error("Pump.fun WebSocket error:", err);
      };

      ws.onclose = () => {
        console.log("Pump.fun WebSocket closed. Reconnecting in 5s...");
        reconnectTimer = setTimeout(connectWs, 5000);
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  // Auto Bot Tick execution simulation loop
  useEffect(() => {
    const botTick = async () => {
      const runningBots = botsRef.current.filter(b => b.status === 'RUNNING');
      if (runningBots.length === 0) return;

      for (const bot of runningBots) {
        try {
          let targetPair = bot.pair;
          const memeCoins = ['SOL:$WIFUN', 'SOL:$PEPEFUN', 'SOL:$POPCATF', 'SOL:$BONKFUN', 'SOL:$MEW', 'SOL:$TRUMP', 'SOL:$SOLAMA'];

          if (bot.strategy === 'AI Autopilot (Machine à Cash)') {
            const randomIndex = Math.floor(Math.random() * currencyPairs.length);
            targetPair = currencyPairs[randomIndex].value;
          }

          let lastRsi = 50;
          let lastClose = 0;
          let candles: Candle[] = [];
          let emaValues: number[] = [];
          let targetCoinData: any = null;

          if (bot.strategy === 'Pump.fun Sniper Bot') {
            // Check WebSocket queue first, then fallback to REST API
            let latestCoins = [...liveWsCoinsRef.current];
            let usingWs = true;

            if (latestCoins.length === 0) {
              latestCoins = await fetchLatestPumpCoins();
              usingWs = false;
            }

            if (latestCoins.length === 0) {
              addBotLog(bot.id, "Pump.fun Sniper", "Aucun jeton trouvé sur le stream (attente de flux)...", "info");
              continue;
            }

            // Find a coin matching the specific sniper mode parameters
            const mode = bot.pumpMode || 'PRECOCE';
            let matchingCoin: any = null;

            if (mode === 'PRECOCE') {
              // Ultra-early: reserves < 34.4 SOL (progress < 8%)
              matchingCoin = latestCoins.find(c => !c.complete && (c.virtual_sol_reserves / 1e9) < 34.4);
            } else if (mode === 'MOMENTUM') {
              // Social momentum: replies >= 10, reserves between 34.4 and 65.7 SOL
              matchingCoin = latestCoins.find(c => !c.complete && (c.reply_count || 0) >= 10 && (c.virtual_sol_reserves / 1e9) >= 34.4 && (c.virtual_sol_reserves / 1e9) < 65.7);
            } else if (mode === 'RAYDIUM') {
              // Raydium completion rider: reserves >= 68.5 SOL (progress > 70%)
              matchingCoin = latestCoins.find(c => !c.complete && (c.virtual_sol_reserves / 1e9) >= 68.5);
            }

            if (!matchingCoin) {
              const modeLabel = mode === 'PRECOCE' ? 'Ultra-Précoce' : mode === 'MOMENTUM' ? 'Momentum' : 'Raydium Proche';
              addBotLog(bot.id, "Pump.fun Sniper", `Scan de ${latestCoins.length} jetons. Aucun ne répond aux critères du mode ${modeLabel}.`, "info");
              continue;
            }
            targetCoinData = matchingCoin;
            targetPair = `SOL:${matchingCoin.mint}:${matchingCoin.symbol}`;
            lastClose = matchingCoin.virtual_sol_reserves / matchingCoin.virtual_token_reserves;

            // If it came from WS queue, clear it so we don't buy it again
            if (usingWs) {
              liveWsCoinsRef.current = liveWsCoinsRef.current.filter(c => c.mint !== matchingCoin.mint);
            }
          } else {
            const fetchedCandles = await fetchLiveMarketData(targetPair, bot.timeframe);
            if (!fetchedCandles || fetchedCandles.length < 15) continue;
            candles = fetchedCandles;

            const indicators = calculateIndicators(candles, ['RSI', 'EMA']);
            const rsiValues = indicators.rsi || [];
            if (rsiValues.length === 0) continue;

            lastRsi = rsiValues[rsiValues.length - 1];
            emaValues = indicators.ema || [];
            lastClose = candles[candles.length - 1].close;
          }

          // Check if bot already has an active position for this pair
          const botPosition = activePositionsRef.current.find(p => p.botId === bot.id);

          if (botPosition) {
            // If the bot has an active position and the volume generator/bump bot is enabled (only in REAL mode!)
            if (bot.strategy === 'Pump.fun Sniper Bot' && bot.autoVolume && bot.mode === 'REAL') {
              const mintAddress = botPosition.pair.split(':')[1];
              if (mintAddress) {
                const action = Math.random() > 0.50 ? 'buy' : 'sell';
                const microSol = (0.01 + Math.random() * 0.02).toFixed(4); // Keep volume micro (0.01 - 0.03 SOL)
                const subWallet = Math.floor(Math.random() * 5) + 1;
                const fee = bot.priorityFee || 0.005;

                addBotLog(bot.id, "Volume Gen", `[Auto-Bump Réel] Envoi transaction de micro-${action === 'buy' ? 'achat' : 'vente'} de ${microSol} SOL via sous-portefeuille #${subWallet}...`, 'info');

                executeRealPumpTrade({
                  action: action,
                  mint: mintAddress,
                  amount: action === 'buy' ? parseFloat(microSol) : '50%', // Buy small SOL amount, or sell 50% of tokens to recycle
                  denominatedInSol: action === 'buy',
                  slippage: 15,
                  priorityFee: fee,
                  customPrivateKey: subWalletsRef.current[subWallet - 1]?.privateKey
                }).then((res) => {
                  if (res.success && res.txHash) {
                    addBotLog(bot.id, "Volume Gen", `[Auto-Bump Réel Succès] Micro-${action === 'buy' ? 'achat' : 'vente'} validé ! Hash: ${res.txHash.slice(0, 10)}... Jeton Bumpé.`, 'info');
                  } else {
                    addBotLog(bot.id, "Volume Gen", `[Auto-Bump Réel Échec] ${res.error || 'Erreur réseau Solana.'}`, 'error');
                  }
                });
              }
            }
            continue;
          }

          if (!botPosition) {
            // Evaluates strategy signals to open positions
            let signal: 'BUY' | 'SELL' | null = null;
            let reason = '';

            const closes = candles.map(c => c.close);
            const volumes = candles.map(c => c.volume || 0);

            // Compute AI learnings for this bot before triggering signal
            const myLearnings = botLearningsRef.current.filter(l => l.botId === bot.id);
            const blockedSignals: ('BUY' | 'SELL')[] = [];
            const boostedSignals: ('BUY' | 'SELL')[] = [];
            let confidenceReason = '';

            for (const learning of myLearnings) {
              let isMatch = false;
              if (bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData) {
                const curveProgress = Math.max(0, Math.min(100, (((targetCoinData.virtual_sol_reserves / 1e9) - 30) / 55) * 100));
                const replies = targetCoinData.reply_count || 0;
                if (learning.bondingCurveProgress !== undefined && learning.replyCount !== undefined) {
                  if (Math.abs(curveProgress - learning.bondingCurveProgress) < 15 && replies <= learning.replyCount) {
                    isMatch = true;
                  }
                }
              } else if (learning.entryRsi !== undefined) {
                const lastEma = emaValues && emaValues.length > 0 ? emaValues[emaValues.length - 1] : lastClose;
                const currentEmaTrend = lastClose > lastEma ? 'ABOVE' : 'BELOW';
                const rsiDiff = Math.abs(lastRsi - learning.entryRsi);
                if (rsiDiff < 6 && learning.entryEmaTrend === currentEmaTrend) {
                  isMatch = true;
                }
              }

              if (isMatch) {
                if (learning.isPositive) {
                  boostedSignals.push(learning.type as any);
                  confidenceReason = learning.learningEffect;
                } else {
                  blockedSignals.push(learning.type as any);
                }
              }
            }

            const mult = bot.selectivityMultiplier || 1.0;
            const isDemo = bot.mode === 'DEMO' || !bot.mode;

            const getTriggerChance = (sigType: 'BUY' | 'SELL') => {
              const baseChance = 0.45 / mult;
              if (boostedSignals.includes(sigType)) {
                return Math.min(1.0, baseChance * 2.2); // Boost trigger confidence
              }
              return baseChance;
            };

            if (bot.strategy === 'RSI Pullback' && closes.length >= 2) {
              const buyThreshold = isDemo ? 47 : (35 - (mult - 1.0) * 5);
              const sellThreshold = isDemo ? 53 : (65 + (mult - 1.0) * 5);
              const isBullishReversal = closes[closes.length - 1] > closes[closes.length - 2];
              const isBearishReversal = closes[closes.length - 1] < closes[closes.length - 2];

              if (lastRsi < buyThreshold && isBullishReversal) {
                const hasBoost = boostedSignals.includes('BUY');
                if (Math.random() < getTriggerChance('BUY')) {
                  signal = 'BUY';
                  reason = `RSI Survente (${lastRsi.toFixed(1)} < ${buyThreshold.toFixed(1)}) avec retournement haussier${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                }
              } else if (lastRsi > sellThreshold && isBearishReversal) {
                const hasBoost = boostedSignals.includes('SELL');
                if (Math.random() < getTriggerChance('SELL')) {
                  signal = 'SELL';
                  reason = `RSI Surachat (${lastRsi.toFixed(1)} > ${sellThreshold.toFixed(1)}) avec retournement baissier${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                }
              }
            } else if (bot.strategy === 'EMA Cross' && closes.length >= 20) {
              const getEMA = (values: number[], period: number): number[] => {
                const ema: number[] = [];
                const k = 2 / (period + 1);
                let lastEma = values[0] || 0;
                ema.push(lastEma);
                for (let i = 1; i < values.length; i++) {
                  lastEma = values[i] * k + lastEma * (1 - k);
                  ema.push(lastEma);
                }
                return ema;
              };

              const fastEma = getEMA(closes, 9);
              const slowEma = getEMA(closes, 20);

              const lastIdx = closes.length - 1;
              const prevIdx = closes.length - 2;

              const fastLast = fastEma[lastIdx];
              const slowLast = slowEma[lastIdx];
              const fastPrev = fastEma[prevIdx];
              const slowPrev = slowEma[prevIdx];

              const goldenCross = fastPrev <= slowPrev && fastLast > slowLast;
              const deathCross = fastPrev >= slowPrev && fastLast < slowLast;

              const lastVol = volumes[lastIdx] || 0;
              const avgVol = volumes.slice(-5).reduce((s, v) => s + v, 0) / 5 || 1;
              const volumeConfirm = isDemo ? true : (lastVol > avgVol * 1.1);

              if (goldenCross && volumeConfirm) {
                const hasBoost = boostedSignals.includes('BUY');
                if (Math.random() < getTriggerChance('BUY')) {
                  signal = 'BUY';
                  reason = `Crossover haussier EMA 9/20 avec pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                }
              } else if (deathCross && volumeConfirm) {
                const hasBoost = boostedSignals.includes('SELL');
                if (Math.random() < getTriggerChance('SELL')) {
                  signal = 'SELL';
                  reason = `Crossover baissier EMA 9/20 avec pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                }
              }
            } else if (bot.strategy === 'BB Mean Reversion') {
              const bbInds = calculateIndicators(candles, ['Bollinger Bands']) || {};
              if (bbInds.bollingerBands && bbInds.bollingerBands.lower && bbInds.bollingerBands.upper && closes.length >= 2) {
                const lower = bbInds.bollingerBands.lower[bbInds.bollingerBands.lower.length - 1];
                const upper = bbInds.bollingerBands.upper[bbInds.bollingerBands.upper.length - 1];
                
                const isBullishRebound = closes[closes.length - 1] > closes[closes.length - 2];
                const isBearishRebound = closes[closes.length - 1] < closes[closes.length - 2];

                if (lastClose <= lower && isBullishRebound) {
                  const hasBoost = boostedSignals.includes('BUY');
                  if (Math.random() < getTriggerChance('BUY')) {
                    signal = 'BUY';
                    reason = `Rebond de survente BB (Prix: ${lastClose.toFixed(5)} <= Bas: ${lower.toFixed(5)})${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                  }
                } else if (lastClose >= upper && isBearishRebound) {
                  const hasBoost = boostedSignals.includes('SELL');
                  if (Math.random() < getTriggerChance('SELL')) {
                    signal = 'SELL';
                    reason = `Correction de surachat BB (Prix: ${lastClose.toFixed(5)} >= Haut: ${upper.toFixed(5)})${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                  }
                }
              }
            } else if (bot.strategy === 'AI Autopilot (Machine à Cash)' && closes.length >= 10) {
              const ema20 = (calculateIndicators(candles, ['EMA']) || {}).ema || [];
              const lastEma = ema20.length > 0 ? (ema20[ema20.length - 1] || lastClose) : lastClose;
              const isBullishEma = lastClose > lastEma;
              const agentMathScore = (isBullishEma ? 30 : -30) + (lastRsi < 40 ? 40 : lastRsi > 60 ? -40 : 0);

              const priceTrend = closes[closes.length - 1] - closes[closes.length - 5];
              const lastVol = volumes[volumes.length - 1] || 0;
              const avgVol = volumes.slice(-5).reduce((s, v) => s + v, 0) / 5 || 1;
              const isVolumeSpiking = lastVol > avgVol * 1.25;
              const agentMomentumScore = (priceTrend > 0 ? 25 : -25) + (isVolumeSpiking ? 25 : 0);

              let agentCustomScore = 0;
              let customLog = "";
              if (bot.customRules) {
                const rules = bot.customRules.toLowerCase();
                let matches = 0;
                
                if (rules.includes('rsi') && lastRsi !== 0) {
                  const hasLt = rules.includes('<') || rules.includes('inférieur') || rules.includes('sous');
                  const hasGt = rules.includes('>') || rules.includes('supérieur') || rules.includes('sur');
                  
                  if (hasLt && lastRsi < 35) {
                    agentCustomScore += 35;
                    matches++;
                  } else if (hasGt && lastRsi > 65) {
                    agentCustomScore -= 35;
                    matches++;
                  }
                }
                
                if (rules.includes('volume') || rules.includes('vol')) {
                  if (isVolumeSpiking) {
                    agentCustomScore += 30;
                    matches++;
                  }
                }

                if (rules.includes('ema') || rules.includes('trend')) {
                  if (isBullishEma) {
                    agentCustomScore += 25;
                    matches++;
                  } else {
                    agentCustomScore -= 25;
                    matches++;
                  }
                }
                
                if (matches > 0) {
                  customLog = ` • Règle Vibe-Trading complétée (Score: ${agentCustomScore > 0 ? '+' : ''}${agentCustomScore})`;
                }
              }

              const finalScore = (agentMathScore * 0.4 + agentMomentumScore * 0.4 + (bot.customRules ? agentCustomScore * 0.2 : 0)) / mult;
              const risk = bot.riskProfile || 'MODERATE';
              
              const hasBoostBuy = boostedSignals.includes('BUY');
              const hasBoostSell = boostedSignals.includes('SELL');
              const baseReq = (risk === 'CONSERVATIVE' ? 35 : risk === 'AGGRESSIVE' ? 15 : 25) / (isDemo ? 2.5 : 1.0);
              
              const reqScoreBuy = hasBoostBuy ? baseReq * 0.5 : baseReq;
              const reqScoreSell = hasBoostSell ? baseReq * 0.5 : baseReq;

              const assetLabel = currencyPairs.find(c => c.value === targetPair)?.label || targetPair;

              if (finalScore > reqScoreBuy) {
                signal = 'BUY';
                reason = `[Consensus Multi-Agent IA: ${finalScore.toFixed(0)}% > ${reqScoreBuy.toFixed(0)}%] Autopilot haussier sur ${assetLabel}.${customLog}${hasBoostBuy ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
              } else if (finalScore < -reqScoreSell) {
                signal = 'SELL';
                reason = `[Consensus Multi-Agent IA: ${finalScore.toFixed(0)}% < -${reqScoreSell.toFixed(0)}%] Autopilot baissier sur ${assetLabel}.${customLog}${hasBoostSell ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
              } else {
                addBotLog(bot.id, "IA Autopilot", `Scan de ${assetLabel} (Score: ${finalScore.toFixed(0)}% / Requis: ±${baseReq.toFixed(0)}%${hasBoostBuy || hasBoostSell ? ', Boosté par apprentissage' : ''})${customLog}. Aucun signal.`, 'info');
              }
            } else if (bot.strategy === 'Pump.fun Sniper Bot') {
              if (targetCoinData) {
                const curveProgress = Math.max(0, Math.min(100, (((targetCoinData.virtual_sol_reserves / 1e9) - 30) / 55) * 100));
                const replies = targetCoinData.reply_count || 0;
                const mode = bot.pumpMode || 'PRECOCE';
                
                const descriptionStr = targetCoinData.description || '';
                const hasSocials = /(twitter|t\.me|telegram|discord|http|\.com|\.net)/i.test(descriptionStr);
                const nameStr = targetCoinData.name || '';
                const isScamSpam = /(scam|rug|hack|fake|free sol|airdrop|giveaway)/i.test(nameStr + ' ' + descriptionStr);

                const isCreatorSafe = targetCoinData.creator !== targetCoinData.bonding_curve && targetCoinData.creator !== '11111111111111111111111111111111';

                let trigger = false;
                let details = '';

                const hasBoost = boostedSignals.includes('BUY');

                if (isScamSpam) {
                  addBotLog(bot.id, "Pump.fun Sniper", `Achat $${targetCoinData.symbol} ANNULÉ : Alerte Scam/Spam.`, 'info');
                } else if (!isCreatorSafe) {
                  addBotLog(bot.id, "Pump.fun Sniper", `Achat $${targetCoinData.symbol} ANNULÉ : Créateur suspect.`, 'info');
                } else {
                  if (mode === 'PRECOCE') {
                    const maxCurve = hasBoost ? 25 : 12;
                    if (curveProgress < maxCurve) {
                      trigger = true;
                      details = `[Ultra-Précoce] Curve: ${curveProgress.toFixed(1)}% < ${maxCurve}%${hasBoost ? ' (Boosté par apprentissage)' : ''}.`;
                    }
                  } else if (mode === 'MOMENTUM') {
                    const momentumScore = (replies * 6) + (hasSocials ? 30 : 0);
                    const targetScore = hasBoost ? 50 : 75;
                    if (momentumScore > targetScore) {
                      trigger = true;
                      details = `[Momentum] Réponses: ${replies} (Score ${momentumScore.toFixed(0)}% > ${targetScore}%${hasBoost ? ' Boosté' : ''}).`;
                    } else {
                      addBotLog(bot.id, "Pump.fun Sniper", `Jeton $${targetCoinData.symbol} écarté (Score ${momentumScore.toFixed(0)}% < ${targetScore}%).`, 'info');
                    }
                  } else if (mode === 'RAYDIUM') {
                    const reqCurve = hasBoost ? 65 : 78;
                    if (curveProgress >= reqCurve && hasSocials) {
                      trigger = true;
                      details = `[Raydium completion] Curve: ${curveProgress.toFixed(1)}% >= ${reqCurve}%${hasBoost ? ' (Boosté)' : ''}.`;
                    }
                  }
                }

                if (trigger) {
                  signal = 'BUY';
                  reason = `[Sniper Mode: ${mode}] Jeton $${targetCoinData.symbol} - ${details}`;
                }
              }
            }

            if (signal) {
              if (blockedSignals.includes(signal)) {
                const cleanPair = targetPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                addBotLog(bot.id, bot.strategy, `[IA Apprentissage] Signal ${signal} sur ${cleanPair} BLOQUÉ : configuration perdante évitée.`, 'info');
                continue;
              }

              const orderId = 'pos_' + Math.random().toString(36).substring(2, 9);
              let slDistance = 0.015;
              let tpDistance = 0.030;

              if (bot.strategy === 'Pump.fun Sniper Bot') {
                slDistance = 0.15; // 15% stop loss for memes
                tpDistance = 0.80; // 80% take profit targets
                // Store the price in livePrices so it is tracked immediately!
                setLivePrices(prev => ({ ...prev, [targetPair]: lastClose }));
              } else {
                // Calculate Volatility-Adjusted SL/TP (ATR proxy)
                const closes = candles.slice(-15).map(c => c.close);
                const avg = closes.reduce((s, val) => s + val, 0) / closes.length;
                const stdDev = Math.sqrt(closes.reduce((s, val) => s + Math.pow(val - avg, 2), 0) / closes.length);
                const volatilityPct = stdDev / avg || 0.0015;

                if (volatilityPct > 0.003) {
                  slDistance = volatilityPct * 2.2;
                  tpDistance = volatilityPct * 4.5;
                } else {
                  slDistance = Math.max(0.004, volatilityPct * 1.5);
                  tpDistance = Math.max(0.010, volatilityPct * 3.2);
                }
              }

              const slPrice = signal === 'BUY' ? lastClose * (1 - slDistance) : lastClose * (1 + slDistance);
              const tpPrice = signal === 'BUY' ? lastClose * (1 + tpDistance) : lastClose * (1 - tpDistance);
              
              const newPos: Position = {
                id: orderId,
                pair: targetPair,
                type: signal,
                entryPrice: lastClose,
                currentPrice: lastClose,
                amount: bot.capital,
                leverage: bot.strategy === 'AI Autopilot (Machine à Cash)'
                  ? (bot.riskProfile === 'CONSERVATIVE' ? 5 : bot.riskProfile === 'AGGRESSIVE' ? 20 : 10)
                  : bot.strategy === 'Pump.fun Sniper Bot' ? 1 : 10,
                sl: parseFloat(slPrice.toFixed(5)),
                tp: parseFloat(tpPrice.toFixed(5)),
                timestamp: Date.now(),
                botId: bot.id,
                
                // Store indicators for self-learning
                entryRsi: lastRsi !== 0 ? lastRsi : undefined,
                entryEmaTrend: emaValues.length > 0 ? (lastClose > emaValues[emaValues.length - 1] ? 'ABOVE' : 'BELOW') : undefined,
                bondingCurveProgress: bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData
                  ? Math.max(0, Math.min(100, (((targetCoinData.virtual_sol_reserves / 1e9) - 30) / 55) * 100))
                  : undefined,
                replyCount: bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData
                  ? targetCoinData.reply_count || 0
                  : undefined
              };

              const isBotReal = bot.mode === 'REAL';
              if (isBotReal && bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData) {
                // Execute real transaction on Solana Mainnet
                const priority = bot.priorityFee || 0.005;
                addBotLog(bot.id, bot.strategy, `Envoi de la transaction d'achat réelle sur Solana pour $${targetCoinData.symbol}... (Frais: +${priority} SOL)`, 'info');
                
                executeRealPumpTrade({
                  action: 'buy',
                  mint: targetCoinData.mint,
                  amount: bot.capital, // Buy amount in SOL (capital allocated)
                  denominatedInSol: true,
                  slippage: 5,
                  priorityFee: priority
                }).then((res) => {
                  if (res.success && res.txHash) {
                    addBotLog(bot.id, bot.strategy, `[ACHAT RÉEL RÉUSSI] Transaction confirmée sur Solana ! Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
                    
                    // Create and store the active position now that it is successful on-chain
                    const posWithTx = { ...newPos, txHash: res.txHash };
                    setActivePositions(prev => {
                      if (prev.some(x => x.id === posWithTx.id)) return prev;
                      return [...prev, posWithTx];
                    });
                    activePositionsRef.current = [...activePositionsRef.current, posWithTx];
                  } else {
                    addBotLog(bot.id, bot.strategy, `[ÉCHEC ACHAT RÉEL] ${res.error || 'Erreur réseau/RPC Solana.'}`, 'error');
                  }
                });
              } else {
                // Forex or default local simulation engine
                setActivePositions(prev => {
                  if (prev.some(x => x.id === newPos.id)) return prev;
                  return [...prev, newPos];
                });
                activePositionsRef.current = [...activePositionsRef.current, newPos];
                const cleanPair = targetPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                addBotLog(bot.id, bot.strategy, `Ordre ${signal} ouvert sur ${cleanPair} à ${lastClose.toFixed(5)}. Raison: ${reason}`, 'trade');
              }
            }
          }

        } catch (e: any) {
          addBotLog(bot.id, bot.strategy, `Erreur d'analyse: ${e.message}`, 'error');
        }
      }
    };

    let timerId: NodeJS.Timeout;
    
    const runTick = async () => {
      await botTick();
      timerId = setTimeout(runTick, 5000);
    };

    runTick();

    return () => clearTimeout(timerId);
  }, []);

  // Global Position Monitor (monitors SL/TP for ALL positions, manual or bot)
  useEffect(() => {
    const checkStops = () => {
      const positions = activePositionsRef.current;
      if (positions.length === 0) return;

      positions.forEach(p => {
        const current = livePricesRef.current[p.pair];
        if (!current) return;

        let shouldClose = false;
        let closeReason = '';

        if (p.type === 'BUY') {
          if (p.sl && current <= p.sl) {
            shouldClose = true;
            closeReason = `Stop Loss déclenché (${current.toFixed(5)} <= ${p.sl})`;
          } else if (p.tp && current >= p.tp) {
            shouldClose = true;
            closeReason = `Take Profit déclenché (${current.toFixed(5)} >= ${p.tp})`;
          }
        } else {
          if (p.sl && current >= p.sl) {
            shouldClose = true;
            closeReason = `Stop Loss déclenché (${current.toFixed(5)} >= ${p.sl})`;
          } else if (p.tp && current <= p.tp) {
            shouldClose = true;
            closeReason = `Take Profit déclenché (${current.toFixed(5)} <= ${p.tp})`;
          }
        }

        if (shouldClose) {
          closePositionById(p.id, current, closeReason);
        }
      });
    };

    const interval = setInterval(checkStops, 2000); // Check SL/TP every 2 seconds for high responsiveness!
    return () => clearInterval(interval);
  }, []);

  const addBotLog = (botId: string, botName: string, message: string, type: 'info' | 'trade' | 'error') => {
    const newLog: BotLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      botId,
      botName,
      message,
      type,
      timestamp: Date.now()
    };
    setBotLogs(prev => {
      if (prev.some(x => x.id === newLog.id)) return prev;
      return [newLog, ...prev].slice(0, 100);
    });
  };

  const handleDisperseSOL = async () => {
    if (subWallets.length === 0) return;
    setIsDispersing(true);
    setDisperseTxHash('');
    setDisperseError('');
    
    try {
      const pubKeys = subWallets.map(w => w.publicKey);
      const res = await disperseSolToSubWallets({
        subWalletPubKeys: pubKeys,
        amountPerWallet: disperseAmount
      });
      
      if (res.success && res.txHash) {
        setDisperseTxHash(res.txHash);
        addBotLog("system", "System", `[DISPERSE RÉUSSI] SOL distribué vers les 5 sous-portefeuilles ! Tx: ${res.txHash.slice(0, 12)}...`, 'trade');
      } else {
        setDisperseError(res.error || "Une erreur est survenue lors de la distribution.");
      }
    } catch (e: any) {
      setDisperseError(e.message || "Erreur de distribution");
    } finally {
      setIsDispersing(false);
    }
  };

  const closePositionById = (posId: string, exitPrice: number, reason: string) => {
    const exists = activePositionsRef.current.some(x => x.id === posId);
    if (!exists) return;

    setActivePositions(prev => {
      const p = prev.find(x => x.id === posId);
      if (!p) return prev;

      const priceDiff = exitPrice - p.entryPrice;
      const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
      const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);

      if (p.botId) {
        // Bot trade margin is handled within the bot's capital. Do not change global balance.
      } else {
        setBalance(bal => bal + p.amount + profit);
      }
      
      const closed: ClosedPosition = {
        id: p.id,
        pair: p.pair,
        type: p.type,
        entryPrice: p.entryPrice,
        exitPrice: exitPrice,
        amount: p.amount,
        leverage: p.leverage,
        profit: profit,
        timestamp: Date.now(),
        wasBot: !!p.botId,
        buyTxHash: p.txHash
      };

      setClosedPositions(closedPrev => {
        if (closedPrev.some(x => x.id === closed.id)) return closedPrev;
        return [closed, ...closedPrev];
      });
      
      if (p.botId) {
        const isRealPosition = !!p.txHash;
        if (p.pair.startsWith('SOL:') && isRealPosition) {
          const parts = p.pair.split(':');
          const mintAddress = parts[1];
          const botConfig = botsRef.current.find(b => b.id === p.botId);
          const priority = botConfig?.priorityFee || 0.005;

          const targetPool = (p.bondingCurveProgress && p.bondingCurveProgress >= 99) ? 'raydium' : 'pump';
          addBotLog(p.botId, p.botId, `Envoi de l'ordre de VENTE réelle (100%) sur Solana pour $${parts[2]}... (Frais: +${priority} SOL, Pool: ${targetPool})`, 'info');

          executeRealPumpTrade({
            action: 'sell',
            mint: mintAddress,
            amount: '100%', // Dump 100% of holdings on SL/TP hit
            denominatedInSol: false,
            slippage: 15,
            priorityFee: priority,
            pool: targetPool
          }).then((res) => {
            if (res.success && res.txHash) {
              addBotLog(p.botId!, p.botId!, `[VENTE RÉELLE RÉUSSIE] Vente de 100% des jetons validée sur Solana ! Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
              setClosedPositions(closedPrev => 
                closedPrev.map(item => item.id === p.id ? { ...item, sellTxHash: res.txHash } : item)
              );
            } else {
              addBotLog(p.botId!, p.botId!, `[ÉCHEC VENTE RÉELLE] Échec du dump sur Solana : ${res.error || 'Erreur réseau/RPC.'}`, 'error');
            }
          });
        }

        addBotLog(p.botId, p.botId, `Position fermée à ${exitPrice.toFixed(5)} (${reason}). Résultat: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} $`, 'trade');
        
        // If it was a loss, record the mistake and create a new BotLearning
        if (profit < 0) {
          let learningEffect = '';
          if (p.entryRsi !== undefined) {
            const emaStatus = p.entryEmaTrend === 'ABOVE' ? 'au-dessus de' : 'sous';
            if (p.type === 'BUY') {
              learningEffect = `Éviter LONG sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`;
            } else {
              learningEffect = `Éviter SHORT sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`;
            }
          } else if (p.bondingCurveProgress !== undefined && p.replyCount !== undefined) {
            learningEffect = `Bloquer l'achat de Meme Coins avec moins de ${p.replyCount + 1} réponses si la Bonding Curve est proche de ${p.bondingCurveProgress.toFixed(0)}%`;
          } else {
            learningEffect = `Renforcer la sélectivité sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')} suite à un échec technique`;
          }

          const newLearning: BotLearning = {
            id: 'lrn_' + Math.random().toString(36).substring(2, 9),
            botId: p.botId,
            pair: p.pair,
            type: p.type,
            entryRsi: p.entryRsi,
            entryEmaTrend: p.entryEmaTrend,
            bondingCurveProgress: p.bondingCurveProgress,
            replyCount: p.replyCount,
            lossAmount: Math.abs(profit),
            timestamp: Date.now(),
            learningEffect
          };

          setBotLearnings(prev => {
            if (prev.some(x => x.id === newLearning.id)) return prev;
            return [newLearning, ...prev];
          });

          setTimeout(() => {
            addBotLog(p.botId!, p.botId!, `[IA Apprentissage] Leçon enregistrée : "${learningEffect}". Cette configuration sera dorénavant évitée.`, 'info');
          }, 50);
        }
        
        // Update Bot Performance metrics & Circuit Breaker
        const botIdVal = p.botId;
        const profitVal = profit;
        
        setBots(prevBots => prevBots.map(b => {
          if (b.id === botIdVal) {
            const nextTotal = (b.totalTrades || 0) + 1;
            const isWin = profitVal >= 0;
            const nextWins = (b.winningTrades || 0) + (isWin ? 1 : 0);
            const nextLosses = isWin ? 0 : (b.consecutiveLosses || 0) + 1;
            const nextNetProfit = (b.netProfit || 0) + profitVal;
            const nextCapital = Math.max(0, b.capital + profitVal);
            
            let nextStatus = b.status;
            let nextMultiplier = b.selectivityMultiplier || 1.0;
            
            if (isWin) {
              nextMultiplier = Math.max(1.0, nextMultiplier - 0.2); // Less selective
            } else {
              nextMultiplier = Math.min(2.0, nextMultiplier + 0.35); // More selective
            }

            // Circuit Breakers
            const maxDrawdownLimit = -0.15 * b.capital; // -15% of initial allocated capital
            if (nextCapital <= 0) {
              nextStatus = 'STOPPED';
              setTimeout(() => {
                addBotLog(b.id, b.strategy, `[CIRCUIT BREAKER] Capital du bot épuisé (0 $). Arrêt automatique.`, 'error');
              }, 100);
            } else if (nextNetProfit <= maxDrawdownLimit) {
              nextStatus = 'STOPPED';
              setTimeout(() => {
                addBotLog(b.id, b.strategy, `[CIRCUIT BREAKER] Perte cumulative de ${Math.abs(nextNetProfit).toFixed(2)} $ (limite de -15% atteinte). Arrêt automatique.`, 'error');
              }, 100);
            } else if (nextLosses >= 3) {
              nextStatus = 'STOPPED';
              setTimeout(() => {
                addBotLog(b.id, b.strategy, `[CIRCUIT BREAKER] 3 pertes consécutives subies. Arrêt automatique du bot pour protéger le capital.`, 'error');
              }, 100);
            }

            return {
              ...b,
              capital: nextCapital,
              totalTrades: nextTotal,
              winningTrades: nextWins,
              consecutiveLosses: nextLosses,
              netProfit: nextNetProfit,
              selectivityMultiplier: nextMultiplier,
              status: nextStatus
            };
          }
          return b;
        }));
      }

      return prev.filter(x => x.id !== posId);
    });
    activePositionsRef.current = activePositionsRef.current.filter(x => x.id !== posId);
  };

  const isSubmittingOrderRef = useRef(false);

  // Handle manual order submission
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrderRef.current) return;
    isSubmittingOrderRef.current = true;

    setTimeout(() => {
      isSubmittingOrderRef.current = false;
    }, 500);

    const currentPrice = livePrices[selectedPair] || 0.0001;

    if (tradingMode === 'REAL') {
      if (!selectedPair.startsWith('SOL:')) {
        alert("Veuillez sélectionner un jeton Solana valide ou renseigner un CA.");
        return;
      }
      const parts = selectedPair.split(':');
      const mintAddress = parts[1];
      if (!mintAddress || mintAddress.startsWith('ukhh')) {
        alert("Adresse de contrat Solana invalide.");
        return;
      }
      if (orderAmount <= 0) {
        alert("Le montant doit être supérieur à 0.");
        return;
      }
      if (solanaBalance === null || orderAmount > solanaBalance) {
        alert(`Solde SOL insuffisant. Requis: ${orderAmount} SOL, Disponible: ${solanaBalance?.toFixed(3)} SOL`);
        return;
      }

      const tokenSymbol = parts[2] || 'TOKEN';
      addBotLog("manual", "Manuel", `Envoi d'un ordre d'achat réel de ${orderAmount} SOL pour $${tokenSymbol}...`, 'info');
      
      executeRealPumpTrade({
        action: 'buy', // Manual placement is always a buy order to open a position!
        mint: mintAddress,
        amount: orderAmount,
        denominatedInSol: true,
        slippage: 15,
        priorityFee: 0.005
      }).then((res) => {
        if (res.success && res.txHash) {
          addBotLog("manual", "Manuel", `[ACHAT MANUEL RÉEL RÉUSSI] Transaction confirmée ! Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
          
          const newRealPos: Position = {
            id: 'pos_' + Math.random().toString(36).substring(2, 9),
            pair: selectedPair,
            type: 'BUY',
            entryPrice: currentPrice,
            currentPrice: currentPrice,
            amount: orderAmount,
            leverage: 1,
            timestamp: Date.now(),
            txHash: res.txHash
          };
          
          setActivePositions(prev => [...prev, newRealPos]);
          activePositionsRef.current = [...activePositionsRef.current, newRealPos];
        } else {
          addBotLog("manual", "Manuel", `[ÉCHEC ACHAT MANUEL RÉEL] ${res.error || 'Erreur réseau/RPC Solana.'}`, 'error');
          alert(`Échec de l'achat réel : ${res.error}`);
        }
      });
      return;
    }

    if (!livePrices[selectedPair]) {
      alert("Le prix en direct n'est pas encore disponible. Veuillez patienter.");
      return;
    }

    if (orderAmount <= 0) {
      alert("Le montant doit être supérieur à 0.");
      return;
    }

    const marginRequired = orderAmount;
    if (marginRequired > balance) {
      alert(`Solde insuffisant. Marge requise: ${marginRequired} $, Solde disponible: ${balance.toFixed(2)} $`);
      return;
    }

    // Parse SL/TP
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    const newPos: Position = {
      id: 'pos_' + Math.random().toString(36).substring(2, 9),
      pair: selectedPair,
      type: orderType,
      entryPrice: currentPrice,
      currentPrice: currentPrice,
      amount: orderAmount,
      leverage: leverage,
      sl,
      tp,
      timestamp: Date.now()
    };

    setActivePositions(prev => {
      if (prev.some(x => x.id === newPos.id)) return prev;
      return [...prev, newPos];
    });
    activePositionsRef.current = [...activePositionsRef.current, newPos];
    setBalance(bal => bal - marginRequired);
    
    // Clear inputs
    setStopLoss('');
    setTakeProfit('');
  };

  // Close position manually
  const handleClosePosition = (p: Position) => {
    const current = livePrices[p.pair] || p.entryPrice;
    closePositionById(p.id, current, "Fermeture manuelle");
  };

  // Start a new bot
  const handleStartBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (botCapital <= 0) {
      alert("Le capital du bot doit être supérieur à 0.");
      return;
    }

    if (tradingMode === 'REAL') {
      if (solanaBalance === null || botCapital > solanaBalance) {
        alert(`Solde SOL insuffisant. Requis: ${botCapital} SOL, Disponible: ${solanaBalance?.toFixed(3)} SOL`);
        return;
      }
    } else {
      if (botCapital > balance) {
        alert(`Capital insuffisant. Requis: ${botCapital} $, Solde disponible: ${balance.toFixed(2)} $`);
        return;
      }
    }

    const newBot: TradingBot = {
      id: 'bot_' + Math.random().toString(36).substring(2, 9),
      pair: botStrategy === 'AI Autopilot (Machine à Cash)' 
        ? 'ALL' 
        : botStrategy === 'Pump.fun Sniper Bot'
          ? 'SOLANA'
          : botPair,
      strategy: botStrategy,
      timeframe: botStrategy === 'Pump.fun Sniper Bot' ? '0' : botTimeframe,
      capital: botCapital,
      status: 'RUNNING',
      createdAt: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      consecutiveLosses: 0,
      netProfit: 0,
      selectivityMultiplier: 1.0,
      riskProfile: botStrategy === 'AI Autopilot (Machine à Cash)' ? botRiskProfile : undefined,
      pumpMode: botStrategy === 'Pump.fun Sniper Bot' ? pumpSniperMode : undefined,
      priorityFee: botStrategy === 'Pump.fun Sniper Bot' ? priorityFee : undefined,
      autoVolume: botStrategy === 'Pump.fun Sniper Bot' ? autoVolume : undefined
    };

    setBots(prev => {
      if (prev.some(x => x.id === newBot.id)) return prev;
      return [...prev, newBot];
    });

    if (tradingMode === 'REAL') {
      setSolanaBalance(bal => bal !== null ? bal - botCapital : null);
      addBotLog(newBot.id, newBot.strategy, `Sniper Bot Solana démarré en réel avec ${newBot.capital} SOL de capital allocation.`, 'info');
    } else {
      setBalance(bal => bal - botCapital);
      const logPair = newBot.pair === 'ALL' ? 'Scan Global' : newBot.pair.replace('FX:', '').replace('-USD', '').replace('=', '');
      addBotLog(newBot.id, newBot.strategy, `Bot démarré sur ${logPair} (${newBot.timeframe}m) avec ${newBot.capital} $ de capital.`, 'info');
    }
  };

  // Start/Stop bot
  const handleToggleBot = (botId: string) => {
    setBots(prev => prev.map(b => {
      if (b.id === botId) {
        const nextStatus = b.status === 'RUNNING' ? 'STOPPED' : 'RUNNING';
        addBotLog(b.id, b.strategy, `Bot ${nextStatus === 'RUNNING' ? 'redémarré' : 'mis en pause'}.`, 'info');
        return { ...b, status: nextStatus };
      }
      return b;
    }));
  };

  // Delete bot
  const handleDeleteBot = (botId: string) => {
    const pos = activePositions.find(p => p.botId === botId);
    if (pos) {
      const current = livePrices[pos.pair] || pos.entryPrice;
      closePositionById(pos.id, current, "Suppression du Bot");
    }
    const targetBot = bots.find(b => b.id === botId);
    if (targetBot) {
      if (targetBot.strategy === 'Pump.fun Sniper Bot') {
        setSolanaBalance(bal => bal !== null ? bal + targetBot.capital : null);
      } else {
        setBalance(bal => bal + targetBot.capital);
      }
    }
    setBots(prev => prev.filter(b => b.id !== botId));
    setBotLogs(prev => prev.filter(l => l.botId !== botId));
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#07040a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
          <span className="text-sm text-white/50">Chargement du terminal de trading...</span>
        </div>
      </div>
    );
  }

  const activePairPrice = livePrices[selectedPair] || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-white">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Terminal de Trading Algorithmique</h1>
          <p className="text-sm text-white/40 mt-1 font-body">Gérez vos ordres manuellement ou lancez vos robots de trading en démo ou en réel on-chain.</p>
        </div>

        {/* Mode Toggle Switch (Demo vs Real) */}
        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              setTradingMode('DEMO');
              setActiveTab('manual');
            }}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'DEMO'
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/20 shadow-md shadow-amber-500/5 font-extrabold"
                : "text-white/40 hover:text-white/80"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Mode Démo (Simulé)
          </button>
          <button
            onClick={() => {
              setTradingMode('REAL');
              setActiveTab('manual');
            }}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'REAL'
                ? "bg-purple-600/25 text-purple-300 border border-purple-500/20 shadow-md shadow-purple-500/5 font-extrabold"
                : "text-white/40 hover:text-white/80"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            Mode Réel (Solana)
          </button>
        </div>

        {/* Portfolio Stats Panel */}
        <div className="grid grid-cols-2 md:flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 w-full md:w-auto">
          {tradingMode === 'DEMO' ? (
            <>
              <div className="px-3 border-r border-white/5">
                <div className="text-[10px] uppercase font-bold text-white/40 font-headline">Solde Démo</div>
                <div className="text-lg font-bold text-amber-400 font-body mt-0.5">{balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $</div>
              </div>
              <div className="px-3 border-r border-white/5">
                <div className="text-[10px] uppercase font-bold text-white/40 font-headline">Equity</div>
                <div className="text-lg font-bold text-white font-body mt-0.5">{equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $</div>
              </div>
              <div className="px-3 border-r border-white/5">
                <div className="text-[10px] uppercase font-bold text-white/40 font-headline">Marge Démo</div>
                <div className="text-lg font-bold text-violet-400 font-body mt-0.5">
                  {activePositions.filter(p => !p.pair.startsWith('SOL:')).reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-FR')} $
                </div>
              </div>
              <div className="px-3">
                <div className="text-[10px] uppercase font-bold text-white/40 font-headline">Trades</div>
                <div className="text-lg font-bold text-cyan-400 font-body mt-0.5">{activePositions.filter(p => !p.pair.startsWith('SOL:')).length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="px-3 border-r border-white/5 flex flex-col justify-center">
                <div className="text-[10px] uppercase font-bold text-purple-400 font-headline flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                  Solde Réel SOL
                </div>
                <div className="text-lg font-bold text-purple-300 font-body mt-0.5 flex items-center gap-1.5">
                  <span>{solanaBalance !== null ? `${solanaBalance.toFixed(3)} SOL` : '0.000 SOL'}</span>
                  {solanaPubKey && (
                    <span className="text-[9px] text-white/40 font-mono">({solanaPubKey.slice(0, 4)}...{solanaPubKey.slice(-4)})</span>
                  )}
                </div>
              </div>
              <div className="px-3 border-r border-white/5">
                <div className="text-[10px] uppercase font-bold text-white/40 font-headline">Allocations Sniper</div>
                <div className="text-lg font-bold text-violet-400 font-body mt-0.5">
                  {activePositions.filter(p => p.pair.startsWith('SOL:')).reduce((sum, p) => sum + p.amount, 0).toFixed(2)} SOL
                </div>
              </div>
              <div className="px-3 border-r border-white/5">
                <div className="text-[10px] uppercase font-bold text-white/40 font-headline">Snipes Actifs</div>
                <div className="text-lg font-bold text-cyan-400 font-body mt-0.5">{activePositions.filter(p => p.pair.startsWith('SOL:')).length}</div>
              </div>
              {rpcLatency !== null && nodeBlockHeight !== null && (
                <div className="px-3 flex flex-col justify-center">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 font-headline flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
                    Chainstack Latency
                  </div>
                  <div className="text-lg font-bold text-cyan-300 font-body mt-0.5 flex items-center gap-1.5">
                    <span>{rpcLatency} ms</span>
                    <span className="text-[9px] text-white/40 font-mono">(Block: {nodeBlockHeight.toLocaleString()})</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SECTION A: ACTIVE POSITIONS (FULL WIDTH) */}
      <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          {tradingMode === 'DEMO' ? "Positions Ouvertes Démo" : "Positions Ouvertes Réelles (SOL)"} ({activePositions.filter(p => tradingMode === 'REAL' ? p.pair.startsWith('SOL:') : !p.pair.startsWith('SOL:')).length})
        </h2>

        {activePositions.filter(p => tradingMode === 'REAL' ? p.pair.startsWith('SOL:') : !p.pair.startsWith('SOL:')).length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-white/30 font-body text-xs">
            {tradingMode === 'DEMO' ? "Aucune position démo ouverte actuellement. Utilisez le panneau de gauche pour initier un trade." : "Aucun snipe SOL actif actuellement."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-headline">
                  <th className="py-2.5">Actif</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Levier</th>
                  <th className="py-2.5">Prix Entrée</th>
                  <th className="py-2.5">Prix Actuel</th>
                  <th className="py-2.5 text-right">PnL ({tradingMode === 'DEMO' ? 'USD' : 'SOL'})</th>
                  <th className="py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {activePositions
                  .filter(p => tradingMode === 'REAL' ? p.pair.startsWith('SOL:') : !p.pair.startsWith('SOL:'))
                  .map((p) => {
                  const current = livePrices[p.pair] || p.entryPrice;
                  const priceDiff = current - p.entryPrice;
                  const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
                  const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
                  const isProfit = profit >= 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPosition(p)}
                      className="border-b border-white/5 hover:bg-white/[0.05] active:bg-white/[0.08] font-body cursor-pointer transition-all duration-150"
                    >
                      <td className="py-3 font-semibold flex items-center gap-1.5">
                        {p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')}
                        {p.botId && (
                          <span className="text-[8px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-headline uppercase font-bold">
                            Bot
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          p.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {p.type === 'BUY' ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="py-3 text-white/60">{p.leverage}x</td>
                      <td className="py-3 text-white/80">{p.entryPrice.toFixed(p.entryPrice > 100 ? 2 : 5)}</td>
                      <td className="py-3 font-bold text-white">{current.toFixed(p.entryPrice > 100 ? 2 : 5)}</td>
                      <td className={cn(
                        "py-3 text-right font-bold font-body",
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {isProfit ? '+' : ''}{profit.toFixed(2)} $
                        <span className="text-[9px] block font-normal opacity-70">
                          ({(pctDiff * p.leverage * (p.type === 'BUY' ? 100 : -100)).toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClosePosition(p);
                          }}
                          className="px-2.5 py-1 text-[10px] bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 rounded-md font-semibold transition-all duration-200"
                        >
                          Fermer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Trading Tab & Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('manual')}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-headline",
                activeTab === 'manual' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
              )}
            >
              <Zap className="inline-block h-3.5 w-3.5 mr-1" />
              Trading
            </button>
            <button
              onClick={() => setActiveTab('bots')}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-headline",
                activeTab === 'bots' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
              )}
            >
              <Bot className="inline-block h-3.5 w-3.5 mr-1" />
              Bots Auto
            </button>
            {tradingMode === 'REAL' && (
              <button
                onClick={() => setActiveTab('wallets')}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-headline flex items-center justify-center gap-1",
                  activeTab === 'wallets' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
                )}
              >
                <span className="text-xs">💳</span>
                Multi-Wallets
              </button>
            )}
          </div>

          {/* TAB 1: MANUAL TRADING */}
          {activeTab === 'manual' && (
            <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline">Passer un Ordre</h2>
                <div className="flex items-center gap-1.5 text-xs text-white/40 font-body">
                  <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
                  Flux direct
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {tradingMode === 'DEMO' ? (
                  <>
                    {/* Pair Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Paire de devises (Démo)</label>
                      <select
                        value={selectedPair}
                        onChange={(e) => setSelectedPair(e.target.value)}
                        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                      >
                        {currencyPairs.map(c => <option key={c.value} value={c.value} className="bg-[#14101a]">{c.label}</option>)}
                      </select>
                    </div>

                    {/* Price Display */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex justify-between items-center">
                      <span className="text-xs text-white/50 font-body">Prix Actuel :</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xl font-bold font-body transition-colors duration-300",
                          priceDirections[selectedPair] === 'up' ? 'text-emerald-400' :
                          priceDirections[selectedPair] === 'down' ? 'text-rose-400' : 'text-white'
                        )}>
                          {activePairPrice ? activePairPrice.toFixed(5) : 'Chargement...'}
                        </span>
                        {priceDirections[selectedPair] === 'up' && <TrendingUp className="h-4 w-4 text-emerald-400" />}
                        {priceDirections[selectedPair] === 'down' && <TrendingDown className="h-4 w-4 text-rose-400" />}
                      </div>
                    </div>

                    {/* Order Type Toggle */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setOrderType('BUY')}
                        className={cn(
                          "h-11 rounded-xl font-bold text-xs transition-all duration-300 font-headline",
                          orderType === 'BUY' 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                            : "bg-white/5 text-white/40 border border-white/5 hover:text-white"
                        )}
                      >
                        ACHAT (LONG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('SELL')}
                        className={cn(
                          "h-11 rounded-xl font-bold text-xs transition-all duration-300 font-headline",
                          orderType === 'SELL' 
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]" 
                            : "bg-white/5 text-white/40 border border-white/5 hover:text-white"
                        )}
                      >
                        VENTE (SHORT)
                      </button>
                    </div>

                    {/* Amount input */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Montant (Marge en USD)</label>
                        <span className="text-[10px] text-white/40 font-body">Max: {balance.toFixed(0)} $</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                        <input
                          type="number"
                          value={orderAmount}
                          onChange={(e) => setOrderAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Leverage Slider */}
                    <div className="space-y-1.5 bg-white/5 border border-white/10 rounded-xl p-3.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Effet de Levier</label>
                        <span className="text-xs font-bold text-[#c2ff0c] font-body">{leverage}x</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value))}
                        className="w-full accent-[#c2ff0c] bg-white/10 rounded-lg h-1.5 cursor-pointer mt-1"
                      />
                      <div className="flex justify-between text-[8px] text-white/20 font-body px-0.5">
                        <span>1x</span>
                        <span>25x</span>
                        <span>50x</span>
                        <span>75x</span>
                        <span>100x</span>
                      </div>
                    </div>

                    {/* SL / TP inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Stop Loss (Prix)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={stopLoss}
                          placeholder={activePairPrice ? (orderType === 'BUY' ? (activePairPrice * 0.985).toFixed(5) : (activePairPrice * 1.015).toFixed(5)) : 'Facultatif'}
                          onChange={(e) => setStopLoss(e.target.value)}
                          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Take Profit (Prix)</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={takeProfit}
                          placeholder={activePairPrice ? (orderType === 'BUY' ? (activePairPrice * 1.03).toFixed(5) : (activePairPrice * 0.97).toFixed(5)) : 'Facultatif'}
                          onChange={(e) => setTakeProfit(e.target.value)}
                          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                      type="submit"
                      className={cn(
                        "w-full h-12 rounded-xl text-black font-semibold text-xs transition-all duration-300 font-headline uppercase tracking-wider mt-2",
                        orderType === 'BUY' 
                          ? "bg-emerald-400 hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                          : "bg-rose-400 hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(251,113,133,0.3)]"
                      )}
                    >
                      Ouvrir la Position {orderType === 'BUY' ? 'LONG' : 'SHORT'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Solana Custom CA Input */}
                    <div className="space-y-3 bg-purple-950/10 border border-purple-500/15 p-4 rounded-xl">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Sélection Jeton Solana (Réel)</label>
                        <select
                          value={selectedPair.startsWith('SOL:') && !selectedPair.split(':')[1].startsWith('ukhh') ? 'SOL:custom' : selectedPair}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== 'SOL:custom') {
                              setSelectedPair(val);
                            } else {
                              setSelectedPair('SOL:custom_mint:Token');
                            }
                          }}
                          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                        >
                          <option value="SOL:ukhh55555555555555555555555555555555555:SOL" className="bg-[#14101a]">Sélectionner un jeton...</option>
                          <option value="SOL:ukhh11111111111111111111111111111111111:$WIFUN" className="bg-[#14101a]">$WIFUN</option>
                          <option value="SOL:ukhh22222222222222222222222222222222222:$PEPEFUN" className="bg-[#14101a]">$PEPEFUN</option>
                          <option value="SOL:ukhh33333333333333333333333333333333333:$BONKFUN" className="bg-[#14101a]">$BONKFUN</option>
                          <option value="SOL:custom" className="bg-[#14101a]">Autre Jeton (Saisir adresse)...</option>
                        </select>
                      </div>
                      
                      {(!selectedPair.startsWith('SOL:') || selectedPair.split(':')[1].startsWith('ukhh') || selectedPair.includes('custom_mint')) && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Adresse du Contrat du Jeton (Mint CA)</label>
                          <input
                            type="text"
                            placeholder="Collez le Mint Address (ex: FNt55...)"
                            value={selectedPair.startsWith('SOL:') && !selectedPair.split(':')[1].startsWith('ukhh') && !selectedPair.includes('custom_mint') ? selectedPair.split(':')[1] : ''}
                            onChange={(e) => {
                              const ca = e.target.value.trim();
                              if (ca) {
                                setSelectedPair(`SOL:${ca}:Token`);
                              }
                            }}
                            className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Amount in SOL */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Montant à Acheter (SOL)</label>
                        <span className="text-[10px] text-white/40 font-body">Disponible : {solanaBalance !== null ? `${solanaBalance.toFixed(3)} SOL` : '0.00 SOL'}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 text-xs font-mono">SOL</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.001"
                          value={orderAmount}
                          onChange={(e) => setOrderAmount(Math.max(0.001, parseFloat(e.target.value) || 0))}
                          className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-12 pr-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Disclaimer & Execution button */}
                    <div className="p-3 bg-purple-950/10 border border-purple-500/10 rounded-xl text-[9px] text-purple-300/70 leading-normal font-body">
                      ⚡ Les ordres manuels en Mode Réel sont acheminés en direct via votre nœud Chainstack et s'exécutent sur la blockchain Solana. Le levier est forcé à 1x (Spot).
                    </div>

                    <button
                      type="submit"
                      disabled={!isSolanaWalletActive}
                      className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/40"
                    >
                      Exécuter l'Achat Réel sur Solana
                    </button>
                  </>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: AUTOMATIC TRADING BOTS */}
          {activeTab === 'bots' && (
            <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-5">
              {/* Dynamic Strategy Header based on mode */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                <span className="text-xs text-white/50 font-body">Stratégie active :</span>
                <span className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase rounded-lg font-headline border",
                  tradingMode === 'DEMO'
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                    : "bg-purple-600/25 text-purple-300 border-purple-500/25"
                )}>
                  {tradingMode === 'DEMO' ? "🤖 IA Autopilot (Démo)" : "🎯 Sniper Solana (Réel)"}
                </span>
              </div>

              {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
                <div className="space-y-1">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
                    <span className="text-[#c2ff0c]">🤖</span> Autopilote Quantitatif IA
                  </h2>
                  <p className="text-[11px] text-white/40 font-body leading-relaxed">
                    L'IA analyse le marché Forex & Crypto en temps réel pour ouvrir et gérer des positions optimales de manière 100% autonome.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
                    <span className="text-purple-400">🎯</span> Pump.fun Solana Sniper
                  </h2>
                  <p className="text-[11px] text-white/40 font-body leading-relaxed">
                    Scanne le Launchpad Solana en temps réel. Achète les nouveaux jetons de bonding curve ayant un momentum social exceptionnel et encaisse les profits rapidement.
                  </p>
                </div>
              )}
              
              <form onSubmit={handleStartBot} className="space-y-4">
                {/* Active pair select - Static for AI/Meme scan */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Recherche Multi-Actifs</label>
                  {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
                    <div className="w-full h-11 bg-white/5 border border-[#c2ff0c]/20 rounded-xl px-3 flex items-center text-xs text-[#c2ff0c] font-body font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#c2ff0c] animate-pulse mr-2" />
                      Tous les Actifs (Scan Global Continu)
                    </div>
                  ) : (
                    <div className="w-full h-11 bg-purple-950/20 border border-purple-500/30 rounded-xl px-3 flex items-center text-xs text-purple-400 font-body font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse mr-2" />
                      Solana Meme Coins Launchpad Stream (Pump.fun)
                    </div>
                  )}
                </div>

                {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
                  <>
                    {/* Risk Profile Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Profil de Risque & Levier</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setBotRiskProfile('CONSERVATIVE')}
                          className={cn(
                            "p-2.5 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                            botRiskProfile === 'CONSERVATIVE'
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <span className="text-xs font-bold font-headline uppercase">Sûr</span>
                          <span className="text-[8px] font-body block opacity-80">Score &gt;85% • 5x</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBotRiskProfile('MODERATE')}
                          className={cn(
                            "p-2.5 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                            botRiskProfile === 'MODERATE'
                              ? "bg-amber-500/10 border-amber-500/50 text-amber-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <span className="text-xs font-bold font-headline uppercase">Modéré</span>
                          <span className="text-[8px] font-body block opacity-80">Score &gt;75% • 10x</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBotRiskProfile('AGGRESSIVE')}
                          className={cn(
                            "p-2.5 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                            botRiskProfile === 'AGGRESSIVE'
                              ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <span className="text-xs font-bold font-headline uppercase">Risque</span>
                          <span className="text-[8px] font-body block opacity-80">Score &gt;65% • 20x</span>
                        </button>
                      </div>
                    </div>

                    {/* Timeframe */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Unité de Temps de Recherche</label>
                      <select
                        value={botTimeframe}
                        onChange={(e) => setBotTimeframe(e.target.value)}
                        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:outline-none text-white font-body"
                      >
                        {timeframes.map(t => <option key={t.value} value={t.value} className="bg-[#14101a]">{t.label}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Pump.fun Sniper Mode Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Stratégie de Sniping Solana</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setPumpSniperMode('PRECOCE')}
                          className={cn(
                            "p-2 py-3 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                            pumpSniperMode === 'PRECOCE'
                              ? "bg-purple-600/15 border-purple-500/50 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <span className="text-[10px] font-bold font-headline uppercase">Ultra-Précoce</span>
                          <span className="text-[8px] font-body block opacity-80 leading-tight">Curve &lt;8%</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPumpSniperMode('MOMENTUM')}
                          className={cn(
                            "p-2 py-3 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                            pumpSniperMode === 'MOMENTUM'
                              ? "bg-purple-600/15 border-purple-500/50 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <span className="text-[10px] font-bold font-headline uppercase">Momentum</span>
                          <span className="text-[8px] font-body block opacity-80 leading-tight">Réponses &gt;10</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPumpSniperMode('RAYDIUM')}
                          className={cn(
                            "p-2 py-3 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                            pumpSniperMode === 'RAYDIUM'
                              ? "bg-purple-600/15 border-purple-500/50 text-purple-300"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <span className="text-[10px] font-bold font-headline uppercase">Raydium Proche</span>
                          <span className="text-[8px] font-body block opacity-80 leading-tight">Curve &gt;75%</span>
                        </button>
                      </div>
                    </div>

                    {/* Solana Gas Priority Fee */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Frais de Priorité Solana (Priority Fee)</label>
                        <span className="text-xs font-bold text-purple-400 font-body">{priorityFee} SOL</span>
                      </div>
                      <select
                        value={priorityFee}
                        onChange={(e) => setPriorityFee(parseFloat(e.target.value))}
                        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:outline-none text-white font-body font-semibold"
                      >
                        <option value="0.001" className="bg-[#14101a]">0.001 SOL (Normal - Économique)</option>
                        <option value="0.005" className="bg-[#14101a]">0.005 SOL (Rapide - Standard)</option>
                        <option value="0.015" className="bg-[#14101a]">0.015 SOL (Sniper Extrême - Prioritaire)</option>
                        <option value="0.05" className="bg-[#14101a]">0.05 SOL (Jito Validator Tip - Ultra Rapide)</option>
                      </select>
                    </div>

                    {/* Auto-Volume Generator & Maker mode */}
                    <div className="flex items-center justify-between bg-purple-950/10 border border-purple-500/15 rounded-xl p-3.5">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold text-white font-headline uppercase block">Générateur de Volume (Auto-Bump)</span>
                        <span className="text-[9px] text-purple-300/60 font-body block leading-normal">
                          Simule des micro-échanges (0.01 - 0.05 SOL) via 5 sous-portefeuilles pour propulser le jeton en "Trending".
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoVolume(!autoVolume)}
                        className={cn(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 relative focus:outline-none shrink-0",
                          autoVolume ? "bg-purple-600" : "bg-white/10"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full bg-white shadow-md transform transition-all duration-300",
                            autoVolume ? "translate-x-6" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Pump.fun specifications */}
                    <div className="bg-purple-950/10 border border-purple-500/15 rounded-xl p-3 text-[10px] space-y-2 font-body text-purple-300/80">
                      <div className="flex justify-between">
                        <span>Cible de Profit</span>
                        <span className="font-bold text-emerald-400">+80% (Bonding Curve Completed)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protection Stop Loss</span>
                        <span className="font-bold text-rose-400">-15% (Anti-Rug Safety)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Effet de Levier</span>
                        <span className="font-bold">1x (Achat Spot Obligatoire)</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Bot Capital allocation */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Capital Allocateur (USD)</label>
                    <span className="text-[10px] text-white/40 font-body">Disponible: {balance.toFixed(0)} $</span>
                  </div>
                  <input
                    type="number"
                    value={botCapital}
                    onChange={(e) => setBotCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:outline-none text-white font-body"
                  />
                </div>

                {/* Start Button */}
                {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
                  <button
                    type="submit"
                    className="w-full h-12 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(194,255,12,0.4)]"
                  >
                    <Play className="h-4 w-4 fill-black" />
                    Activer la Machine à Cash IA
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/40"
                  >
                    <Play className="h-4 w-4 fill-white animate-pulse" />
                    Lancer le Sniper Bot Solana
                  </button>
                )}
              </form>
            </div>
          )}

          {/* TAB 3: MULTI-WALLETS MANAGER */}
          {activeTab === 'wallets' && (
            <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline">Gestionnaire de Sous-Portefeuilles</h2>
                <p className="text-[10px] text-white/40 mt-1 font-body leading-relaxed">
                  Gérez vos portefeuilles secondaires de Market Making. Ces adresses sont générées localement et sont utilisées pour simuler de multiples acheteurs réels on-chain (Auto-Bump).
                </p>
              </div>

              {/* Disperse SOL Panel */}
              <div className="bg-purple-950/15 border border-purple-500/15 rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-headline">Distribuer du SOL (Disperse)</span>
                  <span className="text-[10px] text-white/40 font-body">Portefeuille principal connecté</span>
                </div>
                
                {!isSolanaWalletActive && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300 font-body leading-relaxed space-y-1">
                    <p>⚠️ <strong>Clé principale manquante</strong> :</p>
                    <p>Votre clé <code>SOLANA_PRIVATE_KEY</code> n'est pas encore configurée dans le fichier <code>.env</code>.</p>
                    <p className="text-white/40">Veuillez la renseigner et relancer le serveur de dev pour pouvoir distribuer du SOL en réel.</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase font-headline">Montant par Portefeuille (SOL)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.005"
                      min="0.001"
                      value={disperseAmount}
                      onChange={(e) => setDisperseAmount(Math.max(0.001, parseFloat(e.target.value) || 0))}
                      className="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:outline-none text-white font-body"
                    />
                    <button
                      onClick={handleDisperseSOL}
                      disabled={isDispersing || !isSolanaWalletActive}
                      className="px-4 h-10 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white text-xs font-semibold rounded-xl font-headline transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                      {isDispersing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        "Distribuer"
                      )}
                    </button>
                  </div>
                </div>

                {disperseTxHash && (
                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                    Distribution réussie ! Signature :{" "}
                    <a
                      href={`https://solscan.io/tx/${disperseTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-emerald-300 font-bold"
                    >
                      {disperseTxHash.slice(0, 16)}...
                    </a>
                  </div>
                )}

                {disperseError && (
                  <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-body text-rose-400">
                    Erreur: {disperseError}
                  </div>
                )}
              </div>

              {/* Sub-wallets List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 font-headline">Vos 5 Sous-Portefeuilles</h3>
                
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {subWallets.map((w, idx) => {
                    const isFunded = w.balance !== null && w.balance > 0;
                    return (
                      <div key={w.publicKey} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white/80 font-headline">Portefeuille #{idx + 1}</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded font-body",
                            isFunded ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {w.balance !== null ? `${w.balance.toFixed(4)} SOL` : '0.0000 SOL'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px] font-mono text-white/40 pt-0.5">
                          <span className="truncate pr-4">{w.publicKey}</span>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(w.publicKey);
                                alert("Adresse publique copiée !");
                              }}
                              className="text-purple-400 hover:text-purple-300 font-semibold"
                            >
                              Copier
                            </button>
                            <a
                              href={`https://solscan.io/address/${w.publicKey}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-400 hover:text-purple-300 font-semibold"
                            >
                              Solscan
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Running Bots and Logs */}
        <div className="lg:col-span-7 space-y-6">


          {/* SECTION B: ACTIVE BOTS */}
          <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4 text-[#c2ff0c]" />
              {tradingMode === 'DEMO' ? "Mes Bots Démo" : "Mes Snipers SOL Réels"} ({bots.filter(b => tradingMode === 'REAL' ? b.strategy === 'Pump.fun Sniper Bot' : b.strategy !== 'Pump.fun Sniper Bot').length})
            </h2>

            {bots.filter(b => tradingMode === 'REAL' ? b.strategy === 'Pump.fun Sniper Bot' : b.strategy !== 'Pump.fun Sniper Bot').length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-white/30 font-body text-xs">
                {tradingMode === 'DEMO' ? "Aucun bot démo configuré." : "Aucun sniper SOL configuré actuellement."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bots
                  .filter(b => tradingMode === 'REAL' ? b.strategy === 'Pump.fun Sniper Bot' : b.strategy !== 'Pump.fun Sniper Bot')
                  .map((b) => (
                  <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                    {/* Glowing indicator */}
                    <div className={cn(
                      "absolute top-0 right-0 h-1.5 w-1.5 rounded-full m-3",
                      b.status === 'RUNNING' ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )} />

                    <div>
                      <div className="text-xs font-body font-semibold flex items-center gap-1">
                        {b.strategy === 'Pump.fun Sniper Bot' ? (
                          <span className="text-purple-400 flex items-center gap-0.5">🟣 Stream Solana (Pump.fun)</span>
                        ) : b.pair === 'ALL' ? (
                          <span className="text-[#c2ff0c] flex items-center gap-0.5">🤖 Scan Multi-Actifs</span>
                        ) : (
                          <>
                            <span className="text-white/40">{b.pair.replace('FX:', '').replace('-USD', '').replace('=', '')}</span>
                            <span className="text-white/40">— {b.timeframe}m</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm font-bold font-headline mt-0.5 flex items-center gap-1.5">
                        {b.strategy === 'Pump.fun Sniper Bot' ? (
                          <>
                            <span>{b.strategy}</span>
                            <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-headline uppercase font-bold border border-purple-500/25">
                              {b.pumpMode === 'PRECOCE' ? 'Ultra-Précoce' : b.pumpMode === 'MOMENTUM' ? 'Momentum' : 'Raydium Proche'}
                            </span>
                          </>
                        ) : (
                          <span>{b.strategy}</span>
                        )}
                        {b.riskProfile && (
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded font-headline uppercase font-bold",
                            b.riskProfile === 'CONSERVATIVE' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                            b.riskProfile === 'MODERATE' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                            b.riskProfile === 'AGGRESSIVE' && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          )}>
                            {b.riskProfile === 'CONSERVATIVE' ? 'Sûr' : b.riskProfile === 'AGGRESSIVE' ? 'Risque' : 'Modéré'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-2.5 text-xs">
                      <div>
                        <span className="text-white/40 block text-[9px] font-headline">Capital</span>
                        <span className="font-bold text-white font-body">{b.capital} $</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[9px] font-headline">Statut</span>
                        <span className={cn(
                          "font-bold font-body",
                          b.status === 'RUNNING' ? "text-emerald-400" : "text-amber-400"
                        )}>
                          {b.status === 'RUNNING' ? 'ACTIF' : 'PAUSE'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2.5 text-[10px]">
                      <div>
                        <span className="text-white/40 block text-[8px] font-headline">PnL Net</span>
                        <span className={cn(
                          "font-bold font-body",
                          (b.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {(b.netProfit || 0) >= 0 ? '+' : ''}{(b.netProfit || 0).toFixed(2)} $
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[8px] font-headline">Win Rate</span>
                        <span className="font-bold text-white font-body">
                          {b.totalTrades && b.totalTrades > 0 
                            ? `${(((b.winningTrades || 0) / b.totalTrades) * 100).toFixed(0)}%` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[8px] font-headline">Sélectivité</span>
                        <span className="font-bold text-violet-400 font-body">
                          {b.selectivityMultiplier ? `${b.selectivityMultiplier.toFixed(2)}x` : '1.00x'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-2.5">
                      <button
                        onClick={() => handleToggleBot(b.id)}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-semibold rounded-md border flex items-center justify-center gap-1 transition-all duration-200",
                          b.status === 'RUNNING'
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        )}
                      >
                        {b.status === 'RUNNING' ? (
                          <>
                            <Square className="h-2.5 w-2.5 fill-amber-400" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-2.5 w-2.5 fill-emerald-400" />
                            Lancer
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteBot(b.id)}
                        className="p-1.5 rounded-md border border-white/15 text-white/50 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all duration-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION E: AI LEARNING CONSOLE (NEW) */}
          <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
                <span className="text-purple-400">🧠</span>
                Moteur d'Apprentissage & Feedback IA ({botLearnings.length})
              </h2>
              {botLearnings.length > 0 && (
                <button
                  onClick={() => setBotLearnings([])}
                  className="text-[10px] text-white/40 hover:text-white transition-all font-body"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {botLearnings.length === 0 ? (
                <div className="border border-dashed border-white/5 rounded-xl p-6 text-center text-white/30 font-body text-xs">
                  Aucun feedback d'apprentissage enregistré. Les bots analysent automatiquement chaque gain et perte pour s'ajuster en continu.
                </div>
              ) : (
                botLearnings.map((l) => (
                  <div key={l.id} className={cn(
                    "border rounded-xl p-3 flex justify-between items-center gap-3 transition-all duration-200",
                    l.isPositive 
                      ? "bg-emerald-950/10 border-emerald-500/10 hover:border-emerald-500/20"
                      : "bg-purple-950/10 border-purple-500/10 hover:border-purple-500/20"
                  )}>
                    <div className="space-y-1">
                      <div className="text-[10px] font-headline uppercase font-bold flex items-center gap-1.5">
                        <span className={l.isPositive ? "text-emerald-400" : "text-purple-400"}>
                          {l.isPositive ? "🚀 Optimisation" : "🧠 Apprentissage"} #{l.id.replace('lrn_', '')}
                        </span>
                        <span className="text-white/20">•</span>
                        <span className="text-white/60 font-body normal-case">
                          {l.isPositive ? "Profit maximisé" : "Perte évitée"}: {(l.amount || l.lossAmount || 0).toFixed(2)} {tradingMode === 'REAL' ? 'SOL' : '$'}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 font-body leading-relaxed">{l.learningEffect}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[9px] text-white/30 font-body block">{new Date(l.timestamp).toLocaleTimeString('fr-FR')}</span>
                      <span className={cn(
                        "inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold font-headline uppercase",
                        l.isPositive 
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-purple-500/20 text-purple-300"
                      )}>
                        {l.isPositive ? "Ciblé" : "Actif"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION C: BOT ACTIVITY LOGS */}
          <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4 text-violet-400" />
              Journal d'Activité des Bots
            </h2>

            <div className="h-40 overflow-y-auto border border-white/5 rounded-xl bg-white/[0.01] p-3 font-mono text-[10px] space-y-2">
              {botLogs.length === 0 ? (
                <div className="text-center text-white/20 py-8 font-body">Aucune activité enregistrée.</div>
              ) : (
                botLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0">
                    <span className="text-white/30 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                    <span className={cn(
                      "font-bold shrink-0",
                      log.type === 'trade' ? "text-[#c2ff0c]" :
                      log.type === 'error' ? "text-rose-400" : "text-cyan-400"
                    )}>
                      [{log.botName}]
                    </span>
                    <span className="text-white/70">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION D: CLOSED POSITIONS HISTORY */}
          <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-white/40" />
              {tradingMode === 'DEMO' ? "Historique des Clôtures Démo" : "Historique des Clôtures Réelles (SOL)"} ({closedPositions.filter(h => tradingMode === 'REAL' ? h.pair.startsWith('SOL:') : !h.pair.startsWith('SOL:')).length})
            </h2>

            {closedPositions.filter(h => tradingMode === 'REAL' ? h.pair.startsWith('SOL:') : !h.pair.startsWith('SOL:')).length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-white/30 font-body text-xs">
                Aucune transaction clôturée pour le moment.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2.5">
                {closedPositions
                  .filter(h => tradingMode === 'REAL' ? h.pair.startsWith('SOL:') : !h.pair.startsWith('SOL:'))
                  .map((h) => {
                  const isProfit = h.profit >= 0;
                  return (
                    <div key={h.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          {h.pair.replace('FX:', '').replace('-USD', '').replace('=', '')}
                          <span className={cn(
                            "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",
                            h.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {h.type === 'BUY' ? 'LONG' : 'SHORT'} {h.leverage}x
                          </span>
                          {h.wasBot && (
                            <span className="text-[8px] bg-violet-500/15 text-violet-400 px-1 py-0.5 rounded font-bold uppercase">
                              Bot
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40 mt-1 font-body">
                          Entrée: {h.entryPrice.toFixed(h.entryPrice > 100 ? 2 : 5)} | Sortie: {h.exitPrice.toFixed(h.entryPrice > 100 ? 2 : 5)}
                        </div>
                        {(h.buyTxHash || h.sellTxHash) && (
                          <div className="flex gap-2.5 mt-1 text-[9px] font-mono text-purple-400">
                            {h.buyTxHash && (
                              <a
                                href={`https://solscan.io/tx/${h.buyTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline hover:text-purple-300"
                              >
                                [Tx Achat]
                              </a>
                            )}
                            {h.sellTxHash && (
                              <a
                                href={`https://solscan.io/tx/${h.sellTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline hover:text-purple-300"
                              >
                                [Tx Vente]
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-bold text-sm block font-body",
                          isProfit ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {isProfit ? '+' : ''}{h.profit.toFixed(2)} $
                        </span>
                        <span className="text-[9px] text-white/30 block font-body">
                          {new Date(h.timestamp).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* POSITION DETAILS MODAL */}
      {selectedPosition && (() => {
        const p = selectedPosition;
        const current = livePrices[p.pair] || p.entryPrice;
        const priceDiff = current - p.entryPrice;
        const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
        const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
        const isProfit = profit >= 0;
        const cleanName = p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
        const isSol = p.pair.startsWith('SOL:');
        const mint = isSol ? p.pair.split(':')[1] : '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6 relative bg-[#0e0a12]/95">
              {/* Close Button */}
              <button
                onClick={() => setSelectedPosition(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title & Type Badge */}
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                  <span>Détails du Trade : {cleanName}</span>
                  {p.botId && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase font-bold">
                      Bot Actif
                    </span>
                  )}
                </h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold font-headline uppercase",
                  p.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  {p.type === 'BUY' ? 'LONG / ACHAT' : 'SHORT / VENTE'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Marge Engagée</span>
                  <span className="text-sm font-bold text-white font-body">{p.amount.toFixed(2)} $</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Levier configuré</span>
                  <span className="text-sm font-bold text-white font-body">{p.leverage}x</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Prix d'Entrée</span>
                  <span className="text-sm font-bold text-white font-body">
                    {p.entryPrice.toFixed(p.entryPrice > 100 ? 2 : 5)} {isSol ? 'SOL' : ''}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Prix Actuel</span>
                  <span className="text-sm font-bold text-[#c2ff0c] font-body">
                    {current.toFixed(p.entryPrice > 100 ? 2 : 5)} {isSol ? 'SOL' : ''}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Stop Loss (SL)</span>
                  <span className="text-sm font-bold text-rose-400 font-body">
                    {p.sl ? `${p.sl.toFixed(p.entryPrice > 100 ? 2 : 5)}` : 'Aucun'}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Take Profit (TP)</span>
                  <span className="text-sm font-bold text-emerald-400 font-body">
                    {p.tp ? `${p.tp.toFixed(p.entryPrice > 100 ? 2 : 5)}` : 'Aucun'}
                  </span>
                </div>
              </div>

              {/* Profit & Performance */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-white/40 block uppercase font-headline">PnL en direct</span>
                  <span className={cn(
                    "text-xl font-bold font-body",
                    isProfit ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {isProfit ? '+' : ''}{profit.toFixed(2)} $
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/40 block uppercase font-headline">Variation en %</span>
                  <span className={cn(
                    "text-sm font-bold font-body",
                    isProfit ? "text-emerald-400" : "text-rose-400"
                  )}>
                    ({isProfit ? '+' : ''}{(pctDiff * p.leverage * (p.type === 'BUY' ? 100 : -100)).toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Dynamic Metadata Section */}
              {isSol && (
                <div className="bg-purple-950/10 border border-purple-500/10 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 font-headline">Métadonnées Solana & Pump.fun</h4>
                  
                  {p.bondingCurveProgress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-body text-purple-300/80">
                        <span>Progression Bonding Curve</span>
                        <span className="font-bold">{p.bondingCurveProgress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-purple-950/40 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${p.bondingCurveProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-body text-purple-300/70 pt-1">
                    <div>
                      <span className="block text-[8px] text-white/30 uppercase font-headline">Activité Sociale</span>
                      <span className="font-bold text-white">{p.replyCount ?? 0} réponses</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-white/30 uppercase font-headline">Date d'Ouverture</span>
                      <span className="font-bold text-white">{new Date(p.timestamp).toLocaleTimeString('fr-FR')}</span>
                    </div>
                  </div>

                  {mint && (
                    <div className="border-t border-purple-500/10 pt-2.5 flex items-center justify-between text-[9px] font-mono text-purple-300/50">
                      <span className="truncate pr-2">CA: {mint}</span>
                      <div className="flex gap-1.5">
                        {p.txHash && (
                          <a
                            href={`https://solscan.io/tx/${p.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold"
                          >
                            Tx Achat
                          </a>
                        )}
                        <a
                          href={`https://pump.fun/${mint}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold"
                        >
                          Pump.fun
                        </a>
                        <a
                          href={`https://solscan.io/token/${mint}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold"
                        >
                          Solscan
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bot Indicators Section */}
              {!isSol && p.botId && (
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 font-headline">Indicateurs à l'Entrée</h4>
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-body text-white/60">
                    <div>
                      <span>RSI d'Entrée :</span>
                      <span className="font-bold text-white ml-1.5">{p.entryRsi?.toFixed(1) ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span>Tendance EMA 20 :</span>
                      <span className="font-bold text-white ml-1.5">
                        {p.entryEmaTrend === 'ABOVE' ? 'Haussière' : 'Baissière'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    handleClosePosition(p);
                    setSelectedPosition(null);
                  }}
                  className="flex-1 h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-semibold font-headline uppercase transition-all duration-200"
                >
                  Fermer la Position (Dump)
                </button>
                <button
                  onClick={() => setSelectedPosition(null)}
                  className="px-5 h-11 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-semibold font-headline uppercase transition-all duration-200"
                >
                  Retour
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
