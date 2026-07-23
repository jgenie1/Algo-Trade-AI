"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppState } from '@/context/AppContext';
import { fetchLiveMarketData, type Candle } from '@/services/yahooFinanceService';
import { calculateIndicators } from '@/services/technicalAnalysisService';
import { 
  fetchLatestPumpCoins, 
  fetchPumpCoin, 
  getPumpFunWsUrl, 
  executeRealPumpTrade, 
  getRealSolanaBalance, 
  checkSolanaNetworkHealth, 
  getMultipleSolanaBalances, 
  disperseSolToSubWallets,
  generateSubWalletsServer
} from '@/services/pumpFunService';

const currencyPairs = [
  { value: 'ALL_FOREX', label: '🌍 Tout le Forex (Scan Multi-Paires)', ticker: 'EURUSD=X' },
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

const FOREX_SCAN_PAIRS = [
  'FX:EURUSD',
  'FX:GBPUSD',
  'FX:USDJPY',
  'FX:AUDUSD',
  'FX:USDCAD',
  'FX:USDCHF',
  'GOLD',
  'BTC',
  'ETH',
  'BNB',
  'LINK'
];

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
  botId?: string;
  txHash?: string;
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW';
  bondingCurveProgress?: number;
  replyCount?: number;
  highestPrice?: number;
  dcaCount?: number;
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
}

interface SubWallet {
  publicKey: string;
  privateKey: string;
  balance: number | null;
}

export function useTradingSimulation() {
  const {
    tradingMode,
    balance,
    setBalance,
    activePositions,
    setActivePositions,
    closedPositions,
    setClosedPositions,
    bots,
    setBots,
    botLogs,
    setBotLogs,
    botLearnings,
    setBotLearnings,
    isLoading: isAppLoading,
    solanaBalance,
    setSolanaBalance,
    solanaPubKey,
    setSolanaPubKey,
    isSolanaWalletActive,
    setIsSolanaWalletActive
  } = useAppState();

  const [equity, setEquity] = useState<number>(10000);
  const [selectedPair, setSelectedPair] = useState<string>('FX:EURUSD');
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: 'up' | 'down' | 'flat' }>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [nodeBlockHeight, setNodeBlockHeight] = useState<number | null>(null);
  const [disperseAmount, setDisperseAmount] = useState<number>(0.02);
  const [isDispersing, setIsDispersing] = useState<boolean>(false);
  const [disperseTxHash, setDisperseTxHash] = useState<string>('');
  const [disperseError, setDisperseError] = useState<string>('');
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Load sub-wallets
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const storedSubs = localStorage.getItem('trade_sub_wallets');
      if (storedSubs) {
        try {
          setSubWallets(JSON.parse(storedSubs));
        } catch (e) {}
      } else {
        generateSubWalletsServer().then(res => {
          if (res?.success && res.wallets) {
            localStorage.setItem('trade_sub_wallets', JSON.stringify(res.wallets));
            setSubWallets(res.wallets);
          }
        }).catch(err => {
          console.error("Subwallets server error:", err);
        });
      }
    }
  }, []);

  // Solana Network Health & Sub-wallets Sync
  useEffect(() => {
    if (!isMounted) return;
    
    const updateNetworkAndSubWallets = () => {
      checkSolanaNetworkHealth().then(res => {
        if (res.success && res.latency !== undefined && res.blockHeight !== undefined) {
          setRpcLatency(res.latency);
          setNodeBlockHeight(res.blockHeight);
        } else {
          setRpcLatency(null);
          setNodeBlockHeight(null);
        }
      });

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

    updateNetworkAndSubWallets();
    const interval = setInterval(updateNetworkAndSubWallets, 12000);
    return () => clearInterval(interval);
  }, [isMounted]);

  // Fetch prices loop
  useEffect(() => {
    const updatePrices = async () => {
      setIsLoadingPrice(true);
      const uniquePairs = Array.from(new Set([
        selectedPair,
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
    const interval = setInterval(updatePrices, 10000);
    return () => clearInterval(interval);
  }, [selectedPair, activePositions.length, bots.length]);

  // Noise simulation
  useEffect(() => {
    const noiseInterval = setInterval(() => {
      setLivePrices(prev => {
        const nextPrices = { ...prev };
        Object.keys(nextPrices).forEach(key => {
          const basePrice = nextPrices[key];
          const isMeme = key.startsWith('SOL:');
          const volatility = isMeme ? 0.025 : 0.0001;
          const jitterPercent = (Math.random() - 0.48) * volatility;
          nextPrices[key] = basePrice * (1 + jitterPercent);
        });
        return nextPrices;
      });
    }, 1000);

    return () => clearInterval(noiseInterval);
  }, []);

  // Compute live equity
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

  // Refs for intervals
  // Compute Available Solana Balance (subtracting capital allocated to active Real bots)
  const runningRealBotsCapital = bots
    .filter(b => (b.mode === 'REAL' || (b.mode === undefined && b.strategy === 'Pump.fun Sniper Bot')) && b.status === 'RUNNING')
    .reduce((sum, b) => sum + b.capital, 0);
  const availableSolanaBalance = solanaBalance !== null 
    ? Math.max(0, solanaBalance - runningRealBotsCapital) 
    : null;

  const botsRef = useRef(bots);
  const activePositionsRef = useRef(activePositions);
  const livePricesRef = useRef(livePrices);
  const liveWsCoinsRef = useRef<any[]>([]);
  const botLearningsRef = useRef(botLearnings);
  const subWalletsRef = useRef(subWallets);
  const tradingModeRef = useRef(tradingMode);
  const balanceRef = useRef(balance);
  const solanaBalanceRef = useRef(availableSolanaBalance);

  const closePositionByIdRef = useRef<(posId: string, exitPrice: number, reason: string) => void>(() => {});
  const addBotLogRef = useRef<(botId: string, botName: string, message: string, type: 'info' | 'trade' | 'error') => void>(() => {});

  useEffect(() => {
    botsRef.current = bots;
    activePositionsRef.current = activePositions;
    livePricesRef.current = livePrices;
    botLearningsRef.current = botLearnings;
    subWalletsRef.current = subWallets;
    tradingModeRef.current = tradingMode;
    balanceRef.current = balance;
    solanaBalanceRef.current = availableSolanaBalance;
  });

  // Client-side WS
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = async () => {
      const url = await getPumpFunWsUrl();
      if (!url || (!url.startsWith('wss://') && !url.startsWith('ws://'))) {
        return;
      }

      ws = new WebSocket(url);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ method: 'subscribeNewToken' }));
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw && raw.mint) {
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
        console.warn("Pump.fun WebSocket connection issue:", err);
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 5000);
      };
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  // Bot ticking simulation loop
  useEffect(() => {
    const botTick = async () => {
      const runningBots = botsRef.current.filter(b => {
        const botMode = b.mode || (b.strategy === 'Pump.fun Sniper Bot' ? 'REAL' : 'DEMO');
        return b.status === 'RUNNING' && botMode === tradingModeRef.current;
      });
      if (runningBots.length === 0) return;

      for (const bot of runningBots) {
        try {
          let targetPair = bot.pair;

          let lastRsi = 50;
          let lastClose = 0;
          let candles: Candle[] = [];
          let emaValues: number[] = [];
          let targetCoinData: any = null;

          if (bot.strategy === 'Pump.fun Sniper Bot') {
            let latestCoins = Array.isArray(liveWsCoinsRef.current) ? [...liveWsCoinsRef.current] : [];
            let usingWs = true;

            if (!latestCoins || latestCoins.length === 0) {
              const fetched = await fetchLatestPumpCoins();
              latestCoins = Array.isArray(fetched) ? fetched : [];
              usingWs = false;
            }

            if (!latestCoins || !Array.isArray(latestCoins) || latestCoins.length === 0) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", "Aucun jeton trouvé sur le stream (attente de flux)...", "info");
              continue;
            }

            const mode = bot.pumpMode || 'PRECOCE';
            let matchingCoin: any = null;

            // Détection préventive et filtrage des tokens suspects/arnaques
            const isCoinSafe = (c: any) => {
              if (!c) return false;
              const nameStr = (c.name || '').toLowerCase();
              const descStr = (c.description || '').toLowerCase();
              const isScam = /(scam|rug|hack|fake|free sol|airdrop|giveaway|test|reward)/i.test(nameStr + ' ' + descStr);
              const isCreatorSafe = c.creator !== c.bonding_curve && c.creator !== '11111111111111111111111111111111';
              return !isScam && isCreatorSafe;
            };

            if (mode === 'PRECOCE') {
              matchingCoin = latestCoins.find(c => c && !c.complete && (c.virtual_sol_reserves / 1e9) < 34.4 && isCoinSafe(c));
            } else if (mode === 'MOMENTUM') {
              matchingCoin = latestCoins.find(c => c && !c.complete && (c.reply_count || 0) >= 8 && (c.virtual_sol_reserves / 1e9) >= 34.4 && (c.virtual_sol_reserves / 1e9) < 65.7 && isCoinSafe(c));
            } else if (mode === 'RAYDIUM') {
              matchingCoin = latestCoins.find(c => c && !c.complete && (c.virtual_sol_reserves / 1e9) >= 68.5 && isCoinSafe(c));
            }

            if (!matchingCoin) {
              const modeLabel = mode === 'PRECOCE' ? 'Ultra-Précoce' : mode === 'MOMENTUM' ? 'Momentum' : 'Raydium Proche';
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Scan de ${latestCoins.length} jetons. Aucun ne répond aux critères du mode ${modeLabel}.`, "info");
              continue;
            }
            targetCoinData = matchingCoin;
            targetPair = `SOL:${matchingCoin.mint}:${matchingCoin.symbol}`;
            lastClose = (matchingCoin.virtual_token_reserves > 0) ? (matchingCoin.virtual_sol_reserves / matchingCoin.virtual_token_reserves) : 0;

            if (usingWs && Array.isArray(liveWsCoinsRef.current)) {
              liveWsCoinsRef.current = liveWsCoinsRef.current.filter(c => c && c.mint !== matchingCoin.mint);
            }
          } else {
            const fetchedCandles = await fetchLiveMarketData(targetPair, bot.timeframe);
            if (!fetchedCandles || !Array.isArray(fetchedCandles) || fetchedCandles.length < 15) continue;
            candles = fetchedCandles;

            const indicators = calculateIndicators(candles, ['RSI', 'EMA']) || {};
            const rsiValues = Array.isArray(indicators.rsi) ? indicators.rsi : [];
            if (!rsiValues || rsiValues.length === 0) continue;

            lastRsi = rsiValues[rsiValues.length - 1] || 50;
            emaValues = Array.isArray(indicators.ema) ? indicators.ema : [];
            lastClose = (candles && candles.length > 0) ? (candles[candles.length - 1]?.close || 0) : 0;
          }

          const botPosition = activePositionsRef.current.find(p => p.botId === bot.id);

          if (botPosition) {
            if (bot.strategy === 'Pump.fun Sniper Bot' && bot.autoVolume) {
              const mintAddress = botPosition.pair.split(':')[1];
              if (mintAddress) {
                const action = Math.random() > 0.50 ? 'buy' : 'sell';
                const microSol = (0.01 + Math.random() * 0.02).toFixed(4);
                const subWallet = Math.floor(Math.random() * 5) + 1;
                const fee = bot.priorityFee || 0.005;

                const botMode = bot.mode || (bot.strategy === 'Pump.fun Sniper Bot' ? 'REAL' : 'DEMO');
                if (botMode === 'REAL') {
                  addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Réel] Envoi transaction de micro-${action === 'buy' ? 'achat' : 'vente'} de ${microSol} SOL via sous-portefeuille #${subWallet}...`, 'info');

                  executeRealPumpTrade({
                    action: action,
                    mint: mintAddress,
                    amount: action === 'buy' ? parseFloat(microSol) : '50%',
                    denominatedInSol: action === 'buy',
                    slippage: 15,
                    priorityFee: fee,
                    customPrivateKey: subWalletsRef.current[subWallet - 1]?.privateKey
                  }).then((res) => {
                    if (res.success && res.txHash) {
                       addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Réel Succès] Micro-${action === 'buy' ? 'achat' : 'vente'} validé ! Hash: ${res.txHash.slice(0, 10)}... Jeton Bumpé.`, 'info');
                    } else {
                       addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Réel Échec] ${res.error || 'Erreur réseau Solana.'}`, 'error');
                    }
                  });
                } else {
                  addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Démo] Simulation de micro-${action === 'buy' ? 'achat' : 'vente'} de ${microSol} SOL via sous-portefeuille #${subWallet}...`, 'info');
                  setTimeout(() => {
                    addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Démo Succès] Micro-${action === 'buy' ? 'achat' : 'vente'} validé (Simulé) !`, 'info');
                  }, 1000);
                }
              }
            }

            const maxDcaEntries = 3;
            const currentEntries = botPosition.dcaCount || 1;
            const targetAllocated = bot.capital;
            
            if (bot.strategy !== 'Pump.fun Sniper Bot' && currentEntries < maxDcaEntries && botPosition.amount < targetAllocated) {
              const currentPrice = lastClose;
              const dcaThreshold = 0.98;
              
              if (currentPrice <= botPosition.entryPrice * dcaThreshold) {
                const newEntryCount = currentEntries + 1;
                const chunkAmount = targetAllocated / maxDcaEntries;
                const newAmount = botPosition.amount + chunkAmount;
                const newAvgEntry = ((botPosition.entryPrice * botPosition.amount) + (currentPrice * chunkAmount)) / newAmount;
                
                setActivePositions(prev => prev.map(p => {
                  if (p.id === botPosition.id) {
                    const slDistance = 0.02;
                    const tpDistance = 0.04;
                    return {
                      ...p,
                      amount: newAmount,
                      entryPrice: newAvgEntry,
                      dcaCount: newEntryCount,
                      sl: p.type === 'BUY' ? parseFloat((newAvgEntry * (1 - slDistance)).toFixed(5)) : parseFloat((newAvgEntry * (1 + slDistance)).toFixed(5)),
                      tp: p.type === 'BUY' ? parseFloat((newAvgEntry * (1 + tpDistance)).toFixed(5)) : parseFloat((newAvgEntry * (1 - tpDistance)).toFixed(5))
                    };
                  }
                  return p;
                }));
                
                const cleanPair = targetPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                addBotLogRef.current(bot.id, bot.strategy, `[DCA Accumulation ${newEntryCount}/${maxDcaEntries}] Position renforcée sur ${cleanPair} à ${currentPrice.toFixed(5)} (P.R.U recalculé: ${newAvgEntry.toFixed(5)})`, 'trade');
              }
            }
            continue;
          }

          if (!botPosition) {
            let signal: 'BUY' | 'SELL' | null = null;
            let reason = '';

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
                return Math.min(1.0, baseChance * 2.2);
              }
              return baseChance;
            };

            if (bot.strategy === 'Pump.fun Sniper Bot') {
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
                  addBotLogRef.current(bot.id, "Pump.fun Sniper", `Achat $${targetCoinData.symbol} ANNULÉ : Alerte Scam/Spam.`, 'info');
                } else if (!isCreatorSafe) {
                  addBotLogRef.current(bot.id, "Pump.fun Sniper", `Achat $${targetCoinData.symbol} ANNULÉ : Créateur suspect.`, 'info');
                } else {
                  if (mode === 'PRECOCE') {
                    const maxCurve = hasBoost ? 25 : 12;
                    if (curveProgress < maxCurve) {
                      trigger = true;
                      details = `[Ultra-Précoce] Curve: ${curveProgress.toFixed(1)}% < ${maxCurve}%${hasBoost ? ' (Boosté)' : ''}.`;
                    }
                  } else if (mode === 'MOMENTUM') {
                    const momentumScore = (replies * 6) + (hasSocials ? 30 : 0);
                    const targetScore = hasBoost ? 50 : 75;
                    if (momentumScore > targetScore) {
                      trigger = true;
                      details = `[Momentum] Réponses: ${replies} (Score ${momentumScore.toFixed(0)}% > ${targetScore}%${hasBoost ? ' Boosté' : ''}).`;
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
            } else {
              // FOREX MULTI-PAIR SCANNER
              let bestPairSignal: {
                pair: string;
                signal: 'BUY' | 'SELL';
                reason: string;
                score: number;
                lastClose: number;
                lastRsi: number;
                candles: Candle[];
              } | null = null;

              const scanPairsList = (bot.pair === 'ALL_FOREX' || !bot.pair || bot.pair === 'FX:EURUSD') ? FOREX_SCAN_PAIRS : [bot.pair];

              for (const candPair of scanPairsList) {
                try {
                  const fetchedCandles = await fetchLiveMarketData(candPair, bot.timeframe);
                  if (!fetchedCandles || fetchedCandles.length < 15) continue;

                  const candCloses = fetchedCandles.map(c => c.close);
                  const candVolumes = fetchedCandles.map(c => c.volume);
                  const candIndicators = calculateIndicators(fetchedCandles, ['RSI', 'EMA', 'Bollinger Bands']) || {};
                  const candRsiArr = candIndicators.rsi || [];
                  if (candRsiArr.length === 0) continue;

                  const candLastRsi = candRsiArr[candRsiArr.length - 1];
                  const candLastClose = fetchedCandles[fetchedCandles.length - 1]?.close || 0;

                  let candSig: 'BUY' | 'SELL' | null = null;
                  let candReason = '';
                  let candScore = 0;

                  const candAssetLabel = currencyPairs.find(c => c.value === candPair)?.label || candPair;

                  if (bot.strategy === 'RSI Pullback' && candCloses.length >= 2) {
                    const buyThreshold = isDemo ? 47 : (35 - (mult - 1.0) * 5);
                    const sellThreshold = isDemo ? 53 : (65 + (mult - 1.0) * 5);
                    const isBullishReversal = candCloses[candCloses.length - 1] > candCloses[candCloses.length - 2];
                    const isBearishReversal = candCloses[candCloses.length - 1] < candCloses[candCloses.length - 2];

                    if (candLastRsi < buyThreshold && isBullishReversal) {
                      const hasBoost = boostedSignals.includes('BUY');
                      if (!blockedSignals.includes('BUY') && Math.random() < getTriggerChance('BUY')) {
                        candSig = 'BUY';
                        candScore = (buyThreshold - candLastRsi) + 30;
                        candReason = `RSI Survente sur ${candAssetLabel} (${candLastRsi.toFixed(1)} < ${buyThreshold.toFixed(1)}) avec retournement haussier${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                      }
                    } else if (candLastRsi > sellThreshold && isBearishReversal) {
                      const hasBoost = boostedSignals.includes('SELL');
                      if (!blockedSignals.includes('SELL') && Math.random() < getTriggerChance('SELL')) {
                        candSig = 'SELL';
                        candScore = (candLastRsi - sellThreshold) + 30;
                        candReason = `RSI Surachat sur ${candAssetLabel} (${candLastRsi.toFixed(1)} > ${sellThreshold.toFixed(1)}) avec retournement baissier${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                      }
                    }
                  } else if (bot.strategy === 'EMA Cross' && candCloses.length >= 20) {
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

                    const fastEma = getEMA(candCloses, 9);
                    const slowEma = getEMA(candCloses, 20);

                    const lastIdx = candCloses.length - 1;
                    const prevIdx = candCloses.length - 2;

                    const fastLast = fastEma[lastIdx];
                    const slowLast = slowEma[lastIdx];
                    const fastPrev = fastEma[prevIdx];
                    const slowPrev = slowEma[prevIdx];

                    const goldenCross = fastPrev <= slowPrev && fastLast > slowLast;
                    const deathCross = fastPrev >= slowPrev && fastLast < slowLast;

                    const lastVol = candVolumes[lastIdx] || 0;
                    const avgVol = candVolumes.slice(-5).reduce((s, v) => s + v, 0) / 5 || 1;
                    const volumeConfirm = isDemo ? true : (lastVol > avgVol * 1.1);

                    if (goldenCross && volumeConfirm) {
                      const hasBoost = boostedSignals.includes('BUY');
                      if (!blockedSignals.includes('BUY') && Math.random() < getTriggerChance('BUY')) {
                        candSig = 'BUY';
                        candScore = 50 + (lastVol / avgVol) * 10;
                        candReason = `Crossover haussier EMA 9/20 sur ${candAssetLabel} avec pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                      }
                    } else if (deathCross && volumeConfirm) {
                      const hasBoost = boostedSignals.includes('SELL');
                      if (!blockedSignals.includes('SELL') && Math.random() < getTriggerChance('SELL')) {
                        candSig = 'SELL';
                        candScore = 50 + (lastVol / avgVol) * 10;
                        candReason = `Crossover baissier EMA 9/20 sur ${candAssetLabel} avec pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                      }
                    }
                  } else if (bot.strategy === 'BB Mean Reversion') {
                    if (candIndicators.bollingerBands && candIndicators.bollingerBands.lower && candIndicators.bollingerBands.upper && candCloses.length >= 2) {
                      const lower = candIndicators.bollingerBands.lower[candIndicators.bollingerBands.lower.length - 1];
                      const upper = candIndicators.bollingerBands.upper[candIndicators.bollingerBands.upper.length - 1];
                      
                      const isBullishRebound = candCloses[candCloses.length - 1] > candCloses[candCloses.length - 2];
                      const isBearishRebound = candCloses[candCloses.length - 1] < candCloses[candCloses.length - 2];

                      if (candLastClose <= lower && isBullishRebound) {
                        const hasBoost = boostedSignals.includes('BUY');
                        if (!blockedSignals.includes('BUY') && Math.random() < getTriggerChance('BUY')) {
                          candSig = 'BUY';
                          candScore = ((lower - candLastClose) / (lower || 1)) * 1000 + 40;
                          candReason = `Rebond de survente BB sur ${candAssetLabel} (Prix: ${candLastClose.toFixed(5)} <= Bas: ${lower.toFixed(5)})${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                        }
                      } else if (candLastClose >= upper && isBearishRebound) {
                        const hasBoost = boostedSignals.includes('SELL');
                        if (!blockedSignals.includes('SELL') && Math.random() < getTriggerChance('SELL')) {
                          candSig = 'SELL';
                          candScore = ((candLastClose - upper) / (upper || 1)) * 1000 + 40;
                          candReason = `Correction de surachat BB sur ${candAssetLabel} (Prix: ${candLastClose.toFixed(5)} >= Haut: ${upper.toFixed(5)})${hasBoost ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                        }
                      }
                    }
                  } else if (bot.strategy === 'AI Autopilot (Machine à Cash)' && candCloses.length >= 10) {
                    const ema20 = candIndicators.ema || [];
                    const lastEma = ema20.length > 0 ? (ema20[ema20.length - 1] || candLastClose) : candLastClose;
                    const isBullishEma = candLastClose > lastEma;
                    const agentMathScore = (isBullishEma ? 30 : -30) + (candLastRsi < 40 ? 40 : candLastRsi > 60 ? -40 : 0);

                    const priceTrend = candCloses[candCloses.length - 1] - candCloses[candCloses.length - 5];
                    const lastVol = candVolumes[candVolumes.length - 1] || 0;
                    const avgVol = candVolumes.slice(-5).reduce((s, v) => s + v, 0) / 5 || 1;
                    const isVolumeSpiking = lastVol > avgVol * 1.25;
                    const agentMomentumScore = (priceTrend > 0 ? 25 : -25) + (isVolumeSpiking ? 25 : 0);

                    const finalScore = agentMathScore + agentMomentumScore;
                    const baseReq = isDemo ? 15 : (50 - (mult - 1.0) * 10);
                    const reqScoreBuy = boostedSignals.includes('BUY') ? baseReq * 0.5 : baseReq;
                    const reqScoreSell = boostedSignals.includes('SELL') ? baseReq * 0.5 : baseReq;

                    if (finalScore > reqScoreBuy && !blockedSignals.includes('BUY')) {
                      candSig = 'BUY';
                      candScore = Math.abs(finalScore);
                      candReason = `[Consensus Multi-Agent IA: ${finalScore.toFixed(0)}%] Autopilot haussier sur ${candAssetLabel}.${boostedSignals.includes('BUY') ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                    } else if (finalScore < -reqScoreSell && !blockedSignals.includes('SELL')) {
                      candSig = 'SELL';
                      candScore = Math.abs(finalScore);
                      candReason = `[Consensus Multi-Agent IA: ${finalScore.toFixed(0)}%] Autopilot baissier sur ${candAssetLabel}.${boostedSignals.includes('SELL') ? ' [IA Apprentissage: Confiance Renforcée]' : ''}`;
                    }
                  }

                  if (candSig) {
                    if (!bestPairSignal || candScore > bestPairSignal.score) {
                      bestPairSignal = {
                        pair: candPair,
                        signal: candSig,
                        reason: candReason,
                        score: candScore,
                        lastClose: candLastClose,
                        lastRsi: candLastRsi,
                        candles: fetchedCandles
                      };
                    }
                  }
                } catch (e) {}
              }

              if (bestPairSignal) {
                signal = bestPairSignal.signal;
                reason = `[Scan Multi-Paires] ${bestPairSignal.reason}`;
                targetPair = bestPairSignal.pair;
                lastClose = bestPairSignal.lastClose;
                lastRsi = bestPairSignal.lastRsi;
                candles = bestPairSignal.candles;
              } else if (bot.strategy === 'AI Autopilot (Machine à Cash)') {
                addBotLogRef.current(bot.id, "IA Autopilot", `Scan de ${scanPairsList.length} paires Forex... Aucun consensus.`, 'info');
              } else {
                addBotLogRef.current(bot.id, bot.strategy, `Scan de ${scanPairsList.length} paires Forex... Aucune opportunité détectée.`, 'info');
              }
            }

            if (signal) {
              if (blockedSignals.includes(signal)) {
                const cleanPair = targetPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage] Signal ${signal} sur ${cleanPair} BLOQUÉ : configuration perdante évitée.`, 'info');
                continue;
              }

              const cleanPair = targetPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
              if (tradingModeRef.current === 'DEMO') {
                const totalFunds = balanceRef.current + bot.capital;
                if (totalFunds <= 0) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur ${cleanPair} REJETÉ : Solde insuffisant.`, 'error');
                  continue;
                }
              } else {
                const solBal = solanaBalanceRef.current;
                if (solBal === null || solBal <= 0.001) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur ${cleanPair} REJETÉ : Solde SOL insuffisant.`, 'error');
                  continue;
                }
              }

              const orderId = 'pos_' + Math.random().toString(36).substring(2, 9);
              let slDistance = 0.015;
              let tpDistance = 0.030;

              if (bot.strategy === 'Pump.fun Sniper Bot') {
                slDistance = 0.15;
                tpDistance = 0.80;
                setLivePrices(prev => ({ ...prev, [targetPair]: lastClose }));
              } else {
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
              
              const newPos = {
                id: orderId,
                pair: targetPair,
                type: signal,
                entryPrice: lastClose,
                currentPrice: lastClose,
                amount: bot.strategy === 'Pump.fun Sniper Bot' ? bot.capital : (bot.capital / 3),
                leverage: bot.strategy === 'AI Autopilot (Machine à Cash)'
                  ? (bot.riskProfile === 'CONSERVATIVE' ? 5 : bot.riskProfile === 'AGGRESSIVE' ? 20 : 10)
                  : bot.strategy === 'Pump.fun Sniper Bot' ? 1 : 10,
                sl: parseFloat(slPrice.toFixed(5)),
                tp: parseFloat(tpPrice.toFixed(5)),
                timestamp: Date.now(),
                botId: bot.id,
                highestPrice: lastClose,
                dcaCount: 1,
                
                entryRsi: lastRsi !== 0 ? lastRsi : undefined,
                entryEmaTrend: emaValues && emaValues.length > 0 ? (lastClose > emaValues[emaValues.length - 1] ? 'ABOVE' : 'BELOW') : undefined,
                bondingCurveProgress: bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData
                  ? Math.max(0, Math.min(100, (((targetCoinData.virtual_sol_reserves / 1e9) - 30) / 55) * 100))
                  : undefined,
                replyCount: bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData
                  ? targetCoinData.reply_count || 0
                  : undefined
              };

              const isBotReal = bot.mode === 'REAL' || (bot.mode === undefined && bot.strategy === 'Pump.fun Sniper Bot');
              if (isBotReal && bot.strategy === 'Pump.fun Sniper Bot' && targetCoinData) {
                const priority = bot.priorityFee || 0.005;
                addBotLogRef.current(bot.id, bot.strategy, `Envoi transaction d'achat réelle SOL pour $${targetCoinData.symbol}...`, 'info');
                
                executeRealPumpTrade({
                  action: 'buy',
                  mint: targetCoinData.mint,
                  amount: bot.capital,
                  denominatedInSol: true,
                  slippage: 5,
                  priorityFee: priority
                }).then((res) => {
                  if (res.success && res.txHash) {
                    addBotLogRef.current(bot.id, bot.strategy, `[ACHAT RÉEL RÉUSSI] Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
                    
                    const posWithTx = { ...newPos, txHash: res.txHash };
                    setActivePositions(prev => {
                      if (prev.some(x => x.id === posWithTx.id)) return prev;
                      return [...prev, posWithTx];
                    });
                  } else {
                    addBotLogRef.current(bot.id, bot.strategy, `[ÉCHEC ACHAT RÉEL] ${res.error || 'Erreur réseau.'}`, 'error');
                  }
                });
              } else {
                setActivePositions(prev => {
                  if (prev.some(x => x.id === newPos.id)) return prev;
                  return [...prev, newPos];
                });
                addBotLogRef.current(bot.id, bot.strategy, `Ordre ${signal} ouvert sur ${cleanPair} à ${lastClose.toFixed(5)}. Raison: ${reason}`, 'trade');
              }
            }
          }

        } catch (e: any) {
          addBotLogRef.current(bot.id, bot.strategy, `Erreur d'analyse: ${e.message}`, 'error');
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

  // Global Position Monitor
  useEffect(() => {
    const checkStops = () => {
      const positions = activePositionsRef.current;
      if (positions.length === 0) return;

      positions.forEach(p => {
        const current = livePricesRef.current[p.pair];
        if (!current) return;

        if (p.type === 'BUY') {
          const currentHighest = p.highestPrice || p.entryPrice;
          if (current > currentHighest) {
            p.highestPrice = current;
            const trailingPct = p.pair.startsWith('SOL:') ? 0.15 : 0.02;
            const newSl = parseFloat((current * (1 - trailingPct)).toFixed(5));
            if (!p.sl || newSl > p.sl) {
              p.sl = newSl;
              setActivePositions(prev => prev.map(item => item.id === p.id ? { ...item, highestPrice: current, sl: newSl } : item));
            }
          }
        } else {
          const currentLowest = p.highestPrice || p.entryPrice;
          if (current < currentLowest) {
            p.highestPrice = current;
            const trailingPct = 0.02;
            const newSl = parseFloat((current * (1 + trailingPct)).toFixed(5));
            if (!p.sl || newSl < p.sl) {
              p.sl = newSl;
              setActivePositions(prev => prev.map(item => item.id === p.id ? { ...item, highestPrice: current, sl: newSl } : item));
            }
          }
        }

        let shouldClose = false;
        let closeReason = '';

        if (p.type === 'BUY') {
          if (p.sl && current <= p.sl) {
            shouldClose = true;
            closeReason = `Stop Loss suiveur déclenché (${current.toFixed(5)} <= ${p.sl})`;
          } else if (p.tp && current >= p.tp) {
            shouldClose = true;
            closeReason = `Take Profit déclenché (${current.toFixed(5)} >= ${p.tp})`;
          }
        } else {
          if (p.sl && current >= p.sl) {
            shouldClose = true;
            closeReason = `Stop Loss suiveur déclenché (${current.toFixed(5)} >= ${p.sl})`;
          } else if (p.tp && current <= p.tp) {
            shouldClose = true;
            closeReason = `Take Profit déclenché (${current.toFixed(5)} <= ${p.tp})`;
          }
        }

        if (shouldClose) {
          closePositionByIdRef.current(p.id, current, closeReason);
        }
      });
    };

    const interval = setInterval(checkStops, 2000);
    return () => clearInterval(interval);
  }, []);

  const addBotLog = (botId: string, botName: string, message: string, type: 'info' | 'trade' | 'error') => {
    const newLog = {
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
    const p = activePositionsRef.current.find(x => x.id === posId);
    if (!p) return;

    const priceDiff = exitPrice - p.entryPrice;
    const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
    const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);

    if (!p.botId) {
      setBalance(bal => bal + p.amount + profit);
    }
    
    const closed = {
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
      if (isRealPosition && p.pair.startsWith('SOL:')) {
        const parts = p.pair.split(':');
        const mintAddress = parts[1];
        const botConfig = botsRef.current.find(b => b.id === p.botId);
        const priority = botConfig?.priorityFee || 0.005;
        const targetPool = (p.bondingCurveProgress && p.bondingCurveProgress >= 99) ? 'raydium' : 'pump';
        
        addBotLog(p.botId, p.botId, `Vente réelle SOL pour $${parts[2]}...`, 'info');

        executeRealPumpTrade({
          action: 'sell',
          mint: mintAddress,
          amount: '100%',
          denominatedInSol: false,
          slippage: 15,
          priorityFee: priority,
          pool: targetPool
        }).then((res) => {
          if (res.success && res.txHash) {
            addBotLog(p.botId!, p.botId!, `[VENTE RÉELLE RÉUSSIE] Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
            setClosedPositions(closedPrev => 
              closedPrev.map(item => item.id === p.id ? { ...item, sellTxHash: res.txHash } : item)
            );
          } else {
            addBotLog(p.botId!, p.botId!, `[ÉCHEC VENTE RÉELLE] Échec: ${res.error || 'Erreur réseau.'}`, 'error');
          }
        });
      }

      addBotLog(p.botId, p.botId, `Position fermée à ${exitPrice.toFixed(5)} (${reason}). Résultat: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} $`, 'trade');
      
      let learningEffect = '';
      const isWin = profit >= 0;
      
      if (p.entryRsi !== undefined) {
        const emaStatus = p.entryEmaTrend === 'ABOVE' ? 'au-dessus de' : 'sous';
        if (p.type === 'BUY') {
          learningEffect = isWin 
            ? `Favoriser LONG sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`
            : `Éviter LONG sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`;
        } else {
          learningEffect = isWin
            ? `Favoriser SHORT sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`
            : `Éviter SHORT sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`;
        }
      } else if (p.bondingCurveProgress !== undefined && p.replyCount !== undefined) {
        learningEffect = isWin
          ? `Cibler l'achat de Meme Coins avec plus de ${p.replyCount} réponses si la Bonding Curve dépasse ${p.bondingCurveProgress.toFixed(0)}%`
          : `Bloquer l'achat de Meme Coins avec moins de ${p.replyCount + 1} réponses si la Bonding Curve est proche de ${p.bondingCurveProgress.toFixed(0)}%`;
      } else {
        learningEffect = isWin
          ? `Reproduire la configuration technique sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')}`
          : `Renforcer la sélectivité sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')} suite à un échec technique`;
      }

      const newLearning = {
        id: 'lrn_' + Math.random().toString(36).substring(2, 9),
        botId: p.botId,
        pair: p.pair,
        type: p.type,
        entryRsi: p.entryRsi,
        entryEmaTrend: p.entryEmaTrend,
        bondingCurveProgress: p.bondingCurveProgress,
        replyCount: p.replyCount,
        lossAmount: Math.abs(profit), // Keep for backward compat
        amount: Math.abs(profit),
        isPositive: isWin,
        timestamp: Date.now(),
        learningEffect
      };

      setBotLearnings(prev => {
        if (prev.some(x => x.id === newLearning.id)) return prev;
        return [newLearning, ...prev];
      });

      setTimeout(() => {
        addBotLog(p.botId!, p.botId!, `[IA Apprentissage] Configuration ${isWin ? 'gagnante' : 'perdante'} enregistrée : "${learningEffect}".`, 'info');
      }, 50);
      
      const botIdVal = p.botId;
      const profitVal = profit;
      const circuitBreakerLogs: { id: string; strategy: string; message: string }[] = [];

      const updatedBots = botsRef.current.map(b => {
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
            nextMultiplier = Math.max(1.0, nextMultiplier - 0.2);
          } else {
            nextMultiplier = Math.min(2.0, nextMultiplier + 0.35);
          }

          const maxDrawdownLimit = -0.15 * b.capital;
          if (nextCapital <= 0) {
            nextStatus = 'STOPPED';
            circuitBreakerLogs.push({ id: b.id, strategy: b.strategy, message: `[CIRCUIT BREAKER] Capital épuisé. Arrêt.` });
          } else if (nextNetProfit <= maxDrawdownLimit) {
            nextStatus = 'STOPPED';
            circuitBreakerLogs.push({ id: b.id, strategy: b.strategy, message: `[CIRCUIT BREAKER] Limite de perte de -15% atteinte. Arrêt.` });
          } else if (nextLosses >= 3) {
            nextStatus = 'STOPPED';
            circuitBreakerLogs.push({ id: b.id, strategy: b.strategy, message: `[CIRCUIT BREAKER] 3 pertes consécutives subies. Arrêt.` });
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
      });

      setBots(updatedBots);
      botsRef.current = updatedBots;

      if (circuitBreakerLogs.length > 0) {
        setTimeout(() => {
          circuitBreakerLogs.forEach(log => addBotLogRef.current(log.id, log.strategy, log.message, 'error'));
        }, 50);
      }
    }

    setActivePositions(prev => prev.filter(x => x.id !== posId));
  };

  const handleToggleBot = (botId: string) => {
    const bot = botsRef.current.find(b => b.id === botId);
    if (!bot) return;
    const nextStatus = bot.status === 'RUNNING' ? 'STOPPED' : 'RUNNING';
    addBotLog(bot.id, bot.strategy, `Bot ${nextStatus === 'RUNNING' ? 'redémarré' : 'mis en pause'}.`, 'info');
    setBots(prev => prev.map(b => b.id === botId ? { ...b, status: nextStatus } : b));
  };

  const handleDeleteBot = (botId: string) => {
    const pos = activePositionsRef.current.find(p => p.botId === botId);
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

  const handleClosePosition = (p: Position) => {
    const current = livePrices[p.pair] || p.entryPrice;
    closePositionById(p.id, current, "Fermeture manuelle");
  };

  closePositionByIdRef.current = closePositionById;
  addBotLogRef.current = addBotLog;

  return {
    isMounted,
    tradingMode,
    balance,
    setBalance,
    equity,
    activePositions,
    closedPositions,
    bots,
    botLogs,
    botLearnings,
    isAppLoading,
    livePrices,
    priceDirections,
    isLoadingPrice,
    selectedPosition,
    setSelectedPosition,
    solanaPubKey,
    solanaBalance: availableSolanaBalance,
    setSolanaBalance,
    isSolanaWalletActive,
    rpcLatency,
    nodeBlockHeight,
    disperseAmount,
    setDisperseAmount,
    isDispersing,
    disperseTxHash,
    disperseError,
    subWallets,
    setSubWallets,
    selectedPair,
    setSelectedPair,
    addBotLog,
    handleToggleBot,
    handleDeleteBot,
    handleDisperseSOL,
    handleClosePosition
  };
}
