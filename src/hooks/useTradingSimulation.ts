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
  disperseSolToSubWallets 
} from '@/services/pumpFunService';

export const currencyPairs = [
  { value: 'ALL', label: '🌐 Toutes les Paires (Scan Multi-Actifs Continu)', ticker: 'ALL' },
  { value: 'FX:EURUSD', label: 'EUR/USD', ticker: 'EURUSD=X' },
  { value: 'FX:GBPUSD', label: 'GBP/USD', ticker: 'GBPUSD=X' },
  { value: 'FX:USDJPY', label: 'USD/JPY', ticker: 'JPY=X' },
  { value: 'FX:AUDUSD', label: 'AUD/USD', ticker: 'AUDUSD=X' },
  { value: 'FX:USDCAD', label: 'USD/CAD', ticker: 'CAD=X' },
  { value: 'FX:USDCHF', label: 'USD/CHF', ticker: 'CHF=X' },
  { value: 'FX:EURGBP', label: 'EUR/GBP', ticker: 'EURGBP=X' },
  { value: 'FX:EURJPY', label: 'EUR/JPY', ticker: 'EURJPY=X' },
  { value: 'FX:GBPJPY', label: 'GBP/JPY', ticker: 'GBPJPY=X' },
  { value: 'BTC', label: 'BTC/USD', ticker: 'BTC-USD' },
  { value: 'ETH', label: 'ETH/USD', ticker: 'ETH-USD' },
  { value: 'SOL', label: 'SOL/USD', ticker: 'SOL-USD' },
  { value: 'BNB', label: 'BNB/USD', ticker: 'BNB-USD' },
  { value: 'XRP', label: 'XRP/USD', ticker: 'XRP-USD' },
  { value: 'ADA', label: 'ADA/USD', ticker: 'ADA-USD' },
  { value: 'DOGE', label: 'DOGE/USD', ticker: 'DOGE-USD' },
  { value: 'LINK', label: 'LINK/USD', ticker: 'LINK-USD' },
  { value: 'AVAX', label: 'AVAX/USD', ticker: 'AVAX-USD' },
  { value: 'GOLD', label: 'GOLD/USD', ticker: 'GC=F' },
  { value: 'SILVER', label: 'SILVER/USD', ticker: 'SI=F' },
  { value: 'OIL', label: 'OIL/USD', ticker: 'CL=F' },
];

export const timeframes = [
  { value: '1', label: '1 min (Scalping)' },
  { value: '5', label: '5 min (Intraday Momentum)' },
  { value: '15', label: '15 min (Intraday Standard)' },
  { value: '60', label: '1 heure (Swing Trading)' },
  { value: '240', label: '4 heures (Tendance Majeure)' },
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
  mode?: 'DEMO' | 'REAL';
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
  mode?: 'DEMO' | 'REAL';
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
    reserveVault,
    setReserveVault,
    reserveVaultSol,
    setReserveVaultSol,
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
    isLoading: isAppLoading
  } = useAppState();

  const [equity, setEquity] = useState<number>(10000);
  const [selectedPair, setSelectedPair] = useState<string>('FX:EURUSD');
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: 'up' | 'down' | 'flat' }>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
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
        import('@solana/web3.js').then(({ Keypair }) => {
          const defaultSubs = Array.from({ length: 5 }).map(() => {
            const kp = Keypair.generate();
            const secretKeyBase64 = btoa(String.fromCharCode(...Array.from(kp.secretKey)));
            return {
              publicKey: kp.publicKey.toBase58(),
              privateKey: secretKeyBase64,
              balance: 0
            };
          });
          localStorage.setItem('trade_sub_wallets', JSON.stringify(defaultSubs));
          setSubWallets(defaultSubs);
        });
      }
    }
  }, []);

  // Solana Sync
  useEffect(() => {
    if (!isMounted) return;
    
    const updateWalletAndStatus = () => {
      getRealSolanaBalance().then(res => {
        if (res && res.success && res.balance !== undefined && res.publicKey) {
          setSolanaBalance(res.balance);
          setSolanaPubKey(res.publicKey);
          setIsSolanaWalletActive(true);
        } else {
          setIsSolanaWalletActive(false);
        }
      });

      checkSolanaNetworkHealth().then(res => {
        if (res && res.success && res.latency !== undefined && res.blockHeight !== undefined) {
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
            if (balRes && balRes.success && balRes.balances) {
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
        ...activePositions.map(p => p.pair),
        ...bots.filter(b => b.status === 'RUNNING').map(b => b.pair)
      ]));

      for (const pairVal of uniquePairs) {
        if (pairVal === 'ALL' || pairVal === 'SOLANA') continue;
        if (pairVal.startsWith('SOL:')) {
          const parts = pairVal.split(':');
          if (parts.length >= 2) {
            const mint = parts[1];
            try {
              const coin = await fetchPumpCoin(mint);
              if (coin) {
                const lastClose = coin.virtual_sol_reserves / coin.virtual_token_reserves;
                const oldPrice = livePrices[pairVal];
                if (oldPrice) {
                  setPriceDirections(dir => ({
                    ...dir,
                    [pairVal]: lastClose > oldPrice ? 'up' : lastClose < oldPrice ? 'down' : 'flat'
                  }));
                }
                setLivePrices(prev => ({ ...prev, [pairVal]: lastClose }));
              }
            } catch (e) {}
          }
        } else {
          try {
            const candles = await fetchLiveMarketData(pairVal, '15');
            if (candles.length > 0) {
              const lastClose = candles[candles.length - 1].close;
              const oldPrice = livePrices[pairVal];
              if (oldPrice) {
                setPriceDirections(dir => ({
                  ...dir,
                  [pairVal]: lastClose > oldPrice ? 'up' : lastClose < oldPrice ? 'down' : 'flat'
                }));
              }
              setLivePrices(prev => ({ ...prev, [pairVal]: lastClose }));
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

  // Compute live equity based on free balance, locked margins, active bots and live PnL
  useEffect(() => {
    let totalManualPnL = 0;
    let lockedManualMargin = 0;

    const manualPositions = (activePositions || []).filter(p => p && !p.botId);
    manualPositions.forEach(p => {
      const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 145.50;
      const current = livePrices[p.pair] || entry;
      const priceDiff = current - entry;
      const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
      const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
      const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
      const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
      const rawProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
      if (!isNaN(rawProfit)) {
        totalManualPnL += rawProfit;
      }
      if (!isNaN(amt)) {
        lockedManualMargin += amt;
      }
    });

    let activeBotsCapitalAndPnL = 0;
    (bots || []).forEach(b => {
      if (!b || b.status !== 'RUNNING') return;
      const cap = typeof b.capital === 'number' && !isNaN(b.capital) ? b.capital : 0;
      const botPnL = typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : (typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : 0);
      activeBotsCapitalAndPnL += cap + botPnL;
    });

    const safeBal = typeof balance === 'number' && !isNaN(balance) ? balance : 10000;
    const safeVault = typeof reserveVault === 'number' && !isNaN(reserveVault) ? reserveVault : 0;
    const calcEquity = safeBal + lockedManualMargin + activeBotsCapitalAndPnL + totalManualPnL + safeVault;

    setEquity(isNaN(calcEquity) ? safeBal : calcEquity);
  }, [activePositions, livePrices, balance, bots, reserveVault]);

  // Refs for intervals
  const botsRef = useRef(bots);
  const activePositionsRef = useRef(activePositions);
  const livePricesRef = useRef(livePrices);
  const liveWsCoinsRef = useRef<any[]>([]);
  const botLearningsRef = useRef(botLearnings);
  const subWalletsRef = useRef(subWallets);
  const tradingModeRef = useRef(tradingMode);
  const balanceRef = useRef(balance);
  const solanaBalanceRef = useRef(solanaBalance);

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
    solanaBalanceRef.current = solanaBalance;
  });

  // Client-side WS
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    // Global unhandled rejection guard to catch DOM Event objects
    if (typeof window !== 'undefined') {
      const handleUnhandled = (event: PromiseRejectionEvent) => {
        if (event.reason instanceof Event || (event.reason && typeof event.reason === 'object' && event.reason.type)) {
          event.preventDefault();
        }
      };
      window.addEventListener('unhandledrejection', handleUnhandled);
    }

    const connectWs = async () => {
      try {
        const url = await getPumpFunWsUrl();
        if (!url || (!url.startsWith('wss://') && !url.startsWith('ws://'))) {
          return;
        }

        ws = new WebSocket(url);

        ws.onopen = () => {
          try {
            ws?.send(JSON.stringify({ method: 'subscribeNewToken' }));
          } catch (e) {}
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
          if (err && typeof err === 'object' && 'preventDefault' in err) {
            err.preventDefault();
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 5000);
        };
      } catch (e) {}
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
      const runningBots = botsRef.current.filter(b => 
        b.status === 'RUNNING' && 
        ((b.mode || 'DEMO') === tradingModeRef.current)
      );
      if (runningBots.length === 0) return;

      for (const bot of runningBots) {
        try {
          const botPosition = activePositionsRef.current.find(p => p.botId === bot.id);

          if (botPosition) {
            // DCA or volume generation if a position is already open
            const currentPrice = livePricesRef.current[botPosition.pair] || botPosition.entryPrice;

            if (bot.strategy === 'Pump.fun Sniper Bot' && bot.autoVolume) {
              const mintAddress = botPosition.pair.split(':')[1];
              if (mintAddress) {
                const action = Math.random() > 0.50 ? 'buy' : 'sell';
                const microSol = (0.01 + Math.random() * 0.02).toFixed(4);
                const subWallet = Math.floor(Math.random() * 5) + 1;
                const fee = bot.priorityFee || 0.005;

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
                  if (res && res.success && res.txHash) {
                     addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Réel Succès] Micro-${action === 'buy' ? 'achat' : 'vente'} validé ! Hash: ${res.txHash.slice(0, 10)}... Jeton Bumpé.`, 'info');
                  } else {
                     addBotLogRef.current(bot.id, "Volume Gen", `[Auto-Bump Réel Échec] ${res.error || 'Erreur réseau Solana.'}`, 'error');
                  }
                });
              }
            }

            const maxDcaEntries = 3;
            const currentEntries = botPosition.dcaCount || 1;
            const targetAllocated = bot.capital;
            
            if (bot.strategy !== 'Pump.fun Sniper Bot' && currentEntries < maxDcaEntries && botPosition.amount < targetAllocated) {
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
                      sl: (p.type === 'BUY' || p.type === 'LONG') ? parseFloat((newAvgEntry * (1 - slDistance)).toFixed(5)) : parseFloat((newAvgEntry * (1 + slDistance)).toFixed(5)),
                      tp: (p.type === 'BUY' || p.type === 'LONG') ? parseFloat((newAvgEntry * (1 + tpDistance)).toFixed(5)) : parseFloat((newAvgEntry * (1 - tpDistance)).toFixed(5))
                    };
                  }
                  return p;
                }));
                
                const cleanPair = botPosition.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                addBotLogRef.current(bot.id, bot.strategy, `[DCA Accumulation ${newEntryCount}/${maxDcaEntries}] Position renforcée sur ${cleanPair} à ${currentPrice.toFixed(5)} (P.R.U recalculé: ${newAvgEntry.toFixed(5)})`, 'trade');
              }
            }
            continue;
          }

          // If no active position, look for new signals
          if (bot.strategy === 'Pump.fun Sniper Bot') {
            let latestCoins = [...liveWsCoinsRef.current];
            let usingWs = true;

            if (latestCoins.length === 0) {
              latestCoins = await fetchLatestPumpCoins();
              usingWs = false;
            }

            if (latestCoins.length === 0) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", "Aucun jeton trouvé sur le stream (attente de flux)...", "info");
              continue;
            }

            const mode = bot.pumpMode || 'PRECOCE';
            let matchingCoin: any = null;

            if (mode === 'PRECOCE') {
              matchingCoin = latestCoins.find(c => !c.complete && (c.virtual_sol_reserves / 1e9) < 34.4);
            } else if (mode === 'MOMENTUM') {
              matchingCoin = latestCoins.find(c => !c.complete && (c.reply_count || 0) >= 10 && (c.virtual_sol_reserves / 1e9) >= 34.4 && (c.virtual_sol_reserves / 1e9) < 65.7);
            } else if (mode === 'RAYDIUM') {
              matchingCoin = latestCoins.find(c => !c.complete && (c.virtual_sol_reserves / 1e9) >= 68.5);
            }

            if (!matchingCoin) {
              const modeLabel = mode === 'PRECOCE' ? 'Ultra-Précoce' : mode === 'MOMENTUM' ? 'Momentum' : 'Raydium Proche';
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Scan de ${latestCoins.length} jetons. Aucun ne répond aux critères du mode ${modeLabel}.`, "info");
              continue;
            }

            const targetPair = `SOL:${matchingCoin.mint}:${matchingCoin.symbol}`;
            const lastClose = matchingCoin.virtual_sol_reserves / matchingCoin.virtual_token_reserves;

            if (usingWs) {
              liveWsCoinsRef.current = liveWsCoinsRef.current.filter(c => c.mint !== matchingCoin.mint);
            }

            const curveProgress = Math.max(0, Math.min(100, (((matchingCoin.virtual_sol_reserves / 1e9) - 30) / 55) * 100));
            const replies = matchingCoin.reply_count || 0;
            const descriptionStr = matchingCoin.description || '';
            const hasSocials = /(twitter|t\.me|telegram|discord|http|\.com|\.net)/i.test(descriptionStr);
            const nameStr = matchingCoin.name || '';
            const isScamSpam = /(scam|rug|hack|fake|free sol|airdrop|giveaway)/i.test(nameStr + ' ' + descriptionStr);
            const isCreatorSafe = matchingCoin.creator !== matchingCoin.bonding_curve && matchingCoin.creator !== '11111111111111111111111111111111';

            let trigger = false;
            let details = '';

            if (isScamSpam) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Achat $${matchingCoin.symbol} ANNULÉ : Alerte Scam/Spam.`, 'info');
            } else if (!isCreatorSafe) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Achat $${matchingCoin.symbol} ANNULÉ : Créateur suspect.`, 'info');
            } else {
              if (mode === 'PRECOCE') {
                if (curveProgress < 12) {
                  trigger = true;
                  details = `[Ultra-Précoce] Curve: ${curveProgress.toFixed(1)}%.`;
                }
              } else if (mode === 'MOMENTUM') {
                const momentumScore = (replies * 6) + (hasSocials ? 30 : 0);
                if (momentumScore > 75) {
                  trigger = true;
                  details = `[Momentum] Réponses: ${replies}.`;
                } else {
                  addBotLogRef.current(bot.id, "Pump.fun Sniper", `Jeton $${matchingCoin.symbol} écarté (Score ${momentumScore.toFixed(0)}% < 75%).`, 'info');
                }
              } else if (mode === 'RAYDIUM') {
                if (curveProgress >= 78 && hasSocials) {
                  trigger = true;
                  details = `[Raydium completion] Curve: ${curveProgress.toFixed(1)}%.`;
                }
              }
            }

            if (trigger) {
              const signal = 'BUY';
              const reason = `[Sniper Mode: ${mode}] Jeton $${matchingCoin.symbol} - ${details}`;

              // Check AI Learning blockage
              let learningBlocked = false;
              let learningReason = '';

              const myLearnings = botLearningsRef.current.filter(l => l.botId === bot.id);
              for (const learning of myLearnings) {
                if (learning.bondingCurveProgress !== undefined && learning.replyCount !== undefined) {
                  if (Math.abs(curveProgress - learning.bondingCurveProgress) < 15 && replies <= learning.replyCount) {
                    learningBlocked = true;
                    learningReason = learning.learningEffect;
                    break;
                  }
                }
              }

              if (learningBlocked) {
                addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage] Signal ${signal} sur $${matchingCoin.symbol} BLOQUÉ : perte passée (${learningReason}).`, 'info');
                continue;
              }

              if (tradingModeRef.current === 'DEMO') {
                const totalFunds = balanceRef.current + bot.capital;
                if (totalFunds <= 0) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur $${matchingCoin.symbol} REJETÉ : Solde insuffisant.`, 'error');
                  continue;
                }
              } else {
                const solBal = solanaBalanceRef.current;
                if (solBal === null || solBal <= 0.001) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur $${matchingCoin.symbol} REJETÉ : Solde SOL insuffisant.`, 'error');
                  continue;
                }
              }

              const orderId = 'pos_' + Math.random().toString(36).substring(2, 9);
              const slDistance = 0.15;
              const tpDistance = 0.80;

              setLivePrices(prev => ({ ...prev, [targetPair]: lastClose }));

              const slPrice = lastClose * (1 - slDistance);
              const tpPrice = lastClose * (1 + tpDistance);

              const newPos = {
                id: orderId,
                pair: targetPair,
                type: 'BUY' as const,
                entryPrice: lastClose,
                currentPrice: lastClose,
                amount: bot.capital,
                leverage: 1,
                sl: parseFloat(slPrice.toFixed(5)),
                tp: parseFloat(tpPrice.toFixed(5)),
                timestamp: Date.now(),
                botId: bot.id,
                highestPrice: lastClose,
                dcaCount: 1,
                bondingCurveProgress: curveProgress,
                replyCount: replies,
                mode: bot.mode || tradingModeRef.current
              };

              const isBotReal = (bot.mode || 'DEMO') === 'REAL' && tradingModeRef.current === 'REAL';
              if (isBotReal) {
                const priority = bot.priorityFee || 0.005;
                addBotLogRef.current(bot.id, bot.strategy, `Envoi transaction d'achat réelle SOL pour $${matchingCoin.symbol}...`, 'info');
                
                executeRealPumpTrade({
                  action: 'buy',
                  mint: matchingCoin.mint,
                  amount: bot.capital,
                  denominatedInSol: true,
                  slippage: 5,
                  priorityFee: priority
                }).then((res) => {
                  if (res && res.success && res.txHash) {
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
                addBotLogRef.current(bot.id, bot.strategy, `Ordre BUY ouvert sur $${matchingCoin.symbol} à ${lastClose.toFixed(5)}. Raison: ${reason}`, 'trade');
              }
            }

          } else {
            // Standard quant strategy bot evaluation (with support for 'ALL' pairs scanning)
            const pairsToScan = bot.pair === 'ALL'
              ? currencyPairs.map(cp => cp.value).filter(v => v !== 'ALL')
              : [bot.pair];

            let signalOpened = false;

            for (const currentPair of pairsToScan) {
              if (signalOpened) break;

              const fetchedCandles = await fetchLiveMarketData(currentPair, bot.timeframe);
              if (!fetchedCandles || fetchedCandles.length < 15) continue;
              
              const indicators = calculateIndicators(fetchedCandles, ['RSI', 'EMA']) || {};
              const rsiValues = indicators.rsi || [];
              if (!rsiValues || rsiValues.length === 0) continue;

              const lastRsi = rsiValues[rsiValues.length - 1];
              const emaValues = indicators.ema || [];
              const lastClose = fetchedCandles[fetchedCandles.length - 1]?.close || 0;

              let signal: 'BUY' | 'SELL' | null = null;
              let reason = '';

              const mult = bot.selectivityMultiplier || 1.0;
              const triggerChance = 0.45 / mult;
              const closes = fetchedCandles.map(c => c.close);
              const volumes = fetchedCandles.map(c => c.volume || 0);

              if (bot.strategy === 'RSI Pullback' && closes.length >= 2) {
                const buyThreshold = 42 - (mult - 1.0) * 5;
                const sellThreshold = 58 + (mult - 1.0) * 5;
                const isBullishReversal = closes[closes.length - 1] > closes[closes.length - 2];
                const isBearishReversal = closes[closes.length - 1] < closes[closes.length - 2];

                if (lastRsi < buyThreshold && isBullishReversal && Math.random() < triggerChance) {
                  signal = 'BUY';
                  reason = `RSI Survente (${lastRsi.toFixed(1)} < ${buyThreshold.toFixed(1)}) confirmé par un retournement haussier (Fermeture: ${closes[closes.length - 1].toFixed(5)} > ${closes[closes.length - 2].toFixed(5)})`;
                } else if (lastRsi > sellThreshold && isBearishReversal && Math.random() < triggerChance) {
                  signal = 'SELL';
                  reason = `RSI Surachat (${lastRsi.toFixed(1)} > ${sellThreshold.toFixed(1)}) confirmé par un retournement baissier (Fermeture: ${closes[closes.length - 1].toFixed(5)} < ${closes[closes.length - 2].toFixed(5)})`;
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
                const volumeConfirm = lastVol > avgVol * 1.05;

                if (goldenCross && volumeConfirm && Math.random() < triggerChance) {
                  signal = 'BUY';
                  reason = `Crossover haussier EMA 9/20 confirmé par pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)`;
                } else if (deathCross && volumeConfirm && Math.random() < triggerChance) {
                  signal = 'SELL';
                  reason = `Crossover baissier EMA 9/20 confirmé par pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)`;
                }
              } else if (bot.strategy === 'BB Mean Reversion') {
                const bbInds = calculateIndicators(fetchedCandles, ['Bollinger Bands']) || {};
                if (bbInds.bollingerBands && bbInds.bollingerBands.lower && bbInds.bollingerBands.upper && closes.length >= 2) {
                  // Re-calculate bands with standard deviation of 1.7 for higher responsiveness
                  const mean = closes.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, closes.length);
                  let varianceSum = 0;
                  const slice = closes.slice(-20);
                  slice.forEach(v => { varianceSum += Math.pow(v - mean, 2); });
                  const stdDev = Math.sqrt(varianceSum / slice.length) || 1e-5;
                  
                  const lower = mean - 1.7 * stdDev;
                  const upper = mean + 1.7 * stdDev;
                  
                  const isBullishRebound = closes[closes.length - 1] > closes[closes.length - 2];
                  const isBearishRebound = closes[closes.length - 1] < closes[closes.length - 2];

                  if (lastClose <= lower && isBullishRebound && Math.random() < triggerChance) {
                    signal = 'BUY';
                    reason = `Rebond de survente BB (Prix: ${lastClose.toFixed(5)} <= Bas: ${lower.toFixed(5)})`;
                  } else if (lastClose >= upper && isBearishRebound && Math.random() < triggerChance) {
                    signal = 'SELL';
                    reason = `Correction de surachat BB (Prix: ${lastClose.toFixed(5)} >= Haut: ${upper.toFixed(5)})`;
                  }
                }
              } else if (bot.strategy === 'SuperTrend Momentum') {
                const stInds = calculateIndicators(fetchedCandles, ['SuperTrend']) || {};
                if (stInds.superTrend && stInds.superTrend.direction && stInds.superTrend.direction.length >= 2) {
                  const dirs = stInds.superTrend.direction;
                  const lastDir = dirs[dirs.length - 1];
                  const prevDir = dirs[dirs.length - 2];
                  if (prevDir === 'DOWN' && lastDir === 'UP') {
                    signal = 'BUY';
                    reason = `Changement de tendance SuperTrend (Baissier ➔ Haussier)`;
                  } else if (prevDir === 'UP' && lastDir === 'DOWN') {
                    signal = 'SELL';
                    reason = `Changement de tendance SuperTrend (Haussier ➔ Baissier)`;
                  }
                }
              } else if (bot.strategy === 'VWAP Breakout') {
                const vwapInds = calculateIndicators(fetchedCandles, ['VWAP']) || {};
                if (vwapInds.vwap && vwapInds.vwap.length >= 2) {
                  const vwapVals = vwapInds.vwap;
                  const lastVwap = vwapVals[vwapVals.length - 1];
                  const prevClose = closes[closes.length - 2];
                  if (prevClose < lastVwap && lastClose > lastVwap) {
                    signal = 'BUY';
                    reason = `Cassure haussière du VWAP (Prix ${lastClose.toFixed(5)} > VWAP ${lastVwap.toFixed(5)})`;
                  } else if (prevClose > lastVwap && lastClose < lastVwap) {
                    signal = 'SELL';
                    reason = `Cassure baissière du VWAP (Prix ${lastClose.toFixed(5)} < VWAP ${lastVwap.toFixed(5)})`;
                  }
                }
              } else if (bot.strategy === 'AI Autopilot (Machine à Cash)' && closes.length >= 10) {
                const ema20 = (calculateIndicators(fetchedCandles, ['EMA']) || {}).ema || [];
                const lastEma = ema20.length > 0 ? (ema20[ema20.length - 1] || lastClose) : lastClose;
                const isBullishEma = lastClose > lastEma;
                const agentMathScore = (isBullishEma ? 35 : -35) + (lastRsi < 43 ? 45 : lastRsi > 57 ? -45 : 0);

                const priceTrend = closes[closes.length - 1] - closes[closes.length - 5];
                const lastVol = volumes[volumes.length - 1] || 0;
                const avgVol = volumes.slice(-5).reduce((s, v) => s + v, 0) / 5 || 1;
                const isVolumeSpiking = lastVol > avgVol * 1.25;
                const agentMomentumScore = (priceTrend > 0 ? 30 : -30) + (isVolumeSpiking ? 25 : 0);

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
                const reqScore = risk === 'CONSERVATIVE' ? 35 : risk === 'AGGRESSIVE' ? 15 : 25;

                const assetLabel = currencyPairs.find(c => c.value === currentPair)?.label || currentPair;

                if (finalScore > reqScore) {
                  signal = 'BUY';
                  reason = `[Consensus Multi-Agent IA: ${finalScore.toFixed(0)}% > ${reqScore}%] Autopilot haussier sur ${assetLabel}.${customLog}`;
                } else if (finalScore < -reqScore) {
                  signal = 'SELL';
                  reason = `[Consensus Multi-Agent IA: ${finalScore.toFixed(0)}% < -${reqScore}%] Autopilot baissier sur ${assetLabel}.${customLog}`;
                } else {
                  if (Math.random() < 0.15) {
                    addBotLogRef.current(bot.id, "IA Autopilot", `Scan de ${assetLabel} (Score: ${finalScore.toFixed(0)}% / Requis: ±${reqScore}%)${customLog}. Aucun signal.`, 'info');
                  }
                }
              }

              if (signal) {
                let learningBlocked = false;
                let learningReason = '';

                const myLearnings = botLearningsRef.current.filter(l => l.botId === bot.id);
                for (const learning of myLearnings) {
                  if (learning.pair === currentPair && learning.type === signal) {
                    if (learning.entryRsi !== undefined) {
                      const rsiDiff = Math.abs(lastRsi - learning.entryRsi);
                      if (rsiDiff < 6) {
                        learningBlocked = true;
                        learningReason = learning.learningEffect;
                        break;
                      }
                    }
                  }
                }

                if (learningBlocked) {
                  const cleanPair = currentPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                  addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage] Signal ${signal} sur ${cleanPair} BLOQUÉ : perte passée (${learningReason}).`, 'info');
                  continue;
                }

                const cleanPair = currentPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
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

                const closesForVol = fetchedCandles.map(c => c.close);
                const avg = closesForVol.slice(-15).reduce((s, val) => s + val, 0) / Math.min(15, closesForVol.length);
                const stdDev = Math.sqrt(closesForVol.slice(-15).reduce((s, val) => s + Math.pow(val - avg, 2), 0) / Math.min(15, closesForVol.length));
                const volatilityPct = stdDev / avg || 0.0015;

                if (volatilityPct > 0.003) {
                  slDistance = volatilityPct * 2.2;
                  tpDistance = volatilityPct * 4.5;
                } else {
                  slDistance = Math.max(0.004, volatilityPct * 1.5);
                  tpDistance = Math.max(0.010, volatilityPct * 3.2);
                }

                const slPrice = signal === 'BUY' ? lastClose * (1 - slDistance) : lastClose * (1 + slDistance);
                const tpPrice = signal === 'BUY' ? lastClose * (1 + tpDistance) : lastClose * (1 - tpDistance);

                const newPos = {
                  id: orderId,
                  pair: currentPair,
                  type: signal,
                  entryPrice: lastClose,
                  currentPrice: lastClose,
                  amount: parseFloat((bot.capital / 3).toFixed(2)),
                  leverage: bot.strategy === 'AI Autopilot (Machine à Cash)'
                    ? (bot.riskProfile === 'CONSERVATIVE' ? 5 : bot.riskProfile === 'AGGRESSIVE' ? 20 : 10)
                    : 10,
                  sl: parseFloat(slPrice.toFixed(5)),
                  tp: parseFloat(tpPrice.toFixed(5)),
                  timestamp: Date.now(),
                  botId: bot.id,
                  highestPrice: lastClose,
                  dcaCount: 1,
                  entryRsi: lastRsi !== 0 ? lastRsi : undefined,
                  entryEmaTrend: emaValues && emaValues.length > 0 ? (lastClose > emaValues[emaValues.length - 1] ? 'ABOVE' : 'BELOW') : undefined,
                  mode: bot.mode || tradingModeRef.current
                };

                setActivePositions(prev => {
                  if (prev.some(x => x.id === newPos.id)) return prev;
                  return [...prev, newPos];
                });

                addBotLogRef.current(bot.id, bot.strategy, `Ordre ${signal} ouvert sur ${cleanPair} à ${lastClose.toFixed(5)}. Raison: ${reason}`, 'trade');
                signalOpened = true;
                break;
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

        const isLong = p.type === 'BUY' || p.type === 'LONG';
        if (isLong) {
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

        if (isLong) {
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

    const interval = setInterval(checkStops, 1000);
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
      
      if (res && res.success && res.txHash) {
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

    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 145.50;
    const priceDiff = exitPrice - entry;
    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
    const profit = pctDiff * amt * lev * (isLong ? 1 : -1);

    const posMode = p.mode || 'DEMO';
    if (posMode === 'DEMO') {
      if (profit > 0) {
        const vaultSkim = profit * 0.10;
        const netProfit = profit * 0.90;
        setBalance(bal => bal + amt + netProfit);
        if (setReserveVault) {
          setReserveVault(vault => vault + vaultSkim);
        }
      } else {
        const returnAmount = Math.max(0, amt + profit);
        setBalance(bal => bal + returnAmount);
      }
    } else if (posMode === 'REAL') {
      if (profit > 0) {
        const vaultSkimSol = profit * 0.10;
        if (setReserveVaultSol) {
          setReserveVaultSol(vault => vault + vaultSkimSol);
        }
      }
    }
    
    const closed = {
      id: p.id,
      pair: p.pair,
      type: p.type,
      entryPrice: p.entryPrice,
      exitPrice: exitPrice,
      amount: p.amount,
      leverage: p.leverage,
      profit: parseFloat(profit.toFixed(2)),
      pnl: parseFloat(profit.toFixed(2)),
      timestamp: p.timestamp || Date.now(),
      closeTimestamp: Date.now(),
      wasBot: !!p.botId,
      botId: p.botId,
      botName: p.botName,
      buyTxHash: p.txHash,
      mode: posMode
    };

    setClosedPositions(closedPrev => {
      if (closedPrev.some(x => x.id === closed.id)) return closedPrev;
      return [closed, ...closedPrev];
    });
    
    if (p.botId) {
      const isRealPosition = posMode === 'REAL' && !!p.txHash;
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
          if (res && res.success && res.txHash) {
            addBotLog(p.botId!, p.botId!, `[VENTE RÉELLE RÉUSSIE] Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
            setClosedPositions(closedPrev => 
              closedPrev.map(item => item.id === p.id ? { ...item, sellTxHash: res.txHash } : item)
            );
          } else {
            addBotLog(p.botId!, p.botId!, `[ÉCHEC VENTE RÉELLE] Échec: ${res.error || 'Erreur réseau.'}`, 'error');
          }
        });
      }

      const sourceLabel = p.botId ? p.botId : 'Ordre Manuel';
      addBotLog(sourceLabel, sourceLabel, `Position fermée à ${exitPrice.toFixed(5)} (${reason}). Résultat: ${profit >= 0 ? '+' : ''}${profit.toFixed(2)} $`, 'trade');
      
      if (profit < 0) {
        let learningEffect = '';
        if (p.entryRsi !== undefined) {
          const emaStatus = p.entryEmaTrend === 'ABOVE' ? 'au-dessus de' : 'sous';
          if (p.type === 'BUY' || p.type === 'LONG') {
            learningEffect = `Éviter LONG sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`;
          } else {
            learningEffect = `Éviter SHORT sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} si RSI proche de ${p.entryRsi.toFixed(0)} et prix ${emaStatus} l'EMA 20`;
          }
        } else if (p.bondingCurveProgress !== undefined && p.replyCount !== undefined) {
          learningEffect = `Bloquer l'achat de Meme Coins avec moins de ${p.replyCount + 1} réponses si la Bonding Curve est proche de ${p.bondingCurveProgress.toFixed(0)}%`;
        } else {
          learningEffect = `Renforcer la sélectivité sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')} suite à un échec technique`;
        }

        const newLearning = {
          id: 'lrn_' + Math.random().toString(36).substring(2, 9),
          botId: p.botId || 'manual',
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
          addBotLog(sourceLabel, sourceLabel, `[IA Apprentissage] Leçon enregistrée : "${learningEffect}".`, 'info');
        }, 50);
      } else if (profit > 0) {
        const winningPattern = {
          id: 'win_' + Math.random().toString(36).substring(2, 9),
          botId: p.botId || 'manual',
          pair: p.pair,
          type: p.type,
          lossAmount: 0,
          timestamp: Date.now(),
          learningEffect: `[Configuration Gagnante] Confirmation du modèle haussier/baissier sur ${p.pair.replace('FX:', '').replace('SOL:', '')} (+${profit.toFixed(2)} $)`
        };
        setBotLearnings(prev => [winningPattern, ...prev].slice(0, 50));
      }
      
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
    setBots(prev => prev.map(b => {
      if (b.id === botId) {
        const isResetLoss = nextStatus === 'RUNNING' && ((b.pnl ?? 0) <= -b.capital || (b.netProfit ?? 0) <= -b.capital);
        return {
          ...b,
          status: nextStatus,
          ...(isResetLoss ? { pnl: 0, netProfit: 0, pnlPercent: 0 } : {})
        };
      }
      return b;
    }));
  };

  const handleDeleteBot = (botId: string) => {
    const pos = activePositionsRef.current.find(p => p.botId === botId);
    if (pos) {
      const current = livePrices[pos.pair] || pos.entryPrice;
      closePositionById(pos.id, current, "Suppression du Bot");
    }
    const targetBot = bots.find(b => b.id === botId);
    if (targetBot) {
      if ((targetBot.mode || 'DEMO') === 'REAL') {
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
    solanaBalance,
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
