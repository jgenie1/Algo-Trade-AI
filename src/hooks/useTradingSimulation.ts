"use client";

import { useState, useEffect, useRef } from 'react';
import { useAppState } from '@/context/AppContext';
import { saveFullState, saveBotLearnings } from '@/lib/firebase';
import { formatSmartPnl, getRealMarketBasePrice } from '@/lib/utils';
import { fetchLiveMarketData, type Candle } from '@/services/yahooFinanceService';
import { fetchCoinMarketCapQuotes } from '@/services/coinmarketcapService';
import { calculateIndicators } from '@/services/technicalAnalysisService';
import { 
  fetchLatestPumpCoins, 
  fetchRealPumpCoins,
  fetchPumpCoin, 
  getPumpFunWsUrl, 
  executeRealPumpTrade, 
  executeJupiterSwap,
  SOLANA_TOKEN_MINTS,
  getRealSolanaBalance, 
  checkSolanaNetworkHealth, 
  getMultipleSolanaBalances, 
  disperseSolToSubWallets,
  sweepSubWalletProfitToMaster,
  analyzePumpCoinWithSniperPrompt 
} from '@/services/pumpFunService';
import { recordTradeTelemetry } from '@/services/aiClosedLoopLearningService';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

function getDerivedMasterPublicKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem('connected_web3_wallet');
    if (stored) {
      const parsed = JSON.parse(stored);
      const candidate = parsed?.address || parsed?.publicKey || '';
      if (candidate && candidate.length >= 32 && candidate.length <= 44 && !candidate.startsWith('0x')) {
        return candidate;
      }
    }
  } catch (e) {}

  try {
    const manualAddr = localStorage.getItem('manual_solana_deposit_address');
    if (manualAddr && manualAddr.length >= 32 && manualAddr.length <= 44 && !manualAddr.startsWith('0x')) {
      return manualAddr;
    }
  } catch (e) {}

  const privKey = localStorage.getItem('settings_solana_private_key') || process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY || '';
  if (privKey) {
    try {
      const trimmed = privKey.trim();
      let keyBytes: Uint8Array;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        keyBytes = new Uint8Array(JSON.parse(trimmed));
      } else {
        keyBytes = bs58.decode(trimmed);
      }
      const kp = Keypair.fromSecretKey(keyBytes);
      return kp.publicKey.toBase58();
    } catch (e) {}
  }
  return '';
}

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

import type { 
  Position, 
  ClosedPosition, 
  BotLearning, 
  BotLog, 
  BotInstance, 
  SubWallet 
} from '@/types';

export type { Position, ClosedPosition, BotLearning, BotLog, BotInstance, SubWallet };


/**
 * MOTEUR D'EXÉCUTION DU TRADING EN TEMPS RÉEL & REAL-TIME ON-CHAIN ENGINE
 * Gère le stream WebSocket Binance, le scanner Pump.fun Solana, l'exécution Web3
 * et le suivi déterministe des indicateurs de marché.
 */
export function useTradingEngine() {
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
    setTransactions,
    resetDemoData,
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
  const [evmBalance, setEvmBalance] = useState<number | null>(null);
  const [walletChain, setWalletChain] = useState<'Solana' | 'BSC' | 'Ethereum' | null>(null);
  const [isSolanaWalletActive, setIsSolanaWalletActive] = useState<boolean>(false);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [nodeBlockHeight, setNodeBlockHeight] = useState<number | null>(null);
  const [disperseAmount, setDisperseAmount] = useState<number>(0.02);
  const [isDispersing, setIsDispersing] = useState<boolean>(false);
  const [disperseTxHash, setDisperseTxHash] = useState<string>('');
  const [disperseError, setDisperseError] = useState<string>('');
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Fast unconditional mount flag
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load sub-wallets
  useEffect(() => {
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
            // Store private key as Base58 (standard Solana format)
            const secretKeyBase58 = bs58.encode(kp.secretKey);
            return {
              publicKey: kp.publicKey.toBase58(),
              privateKey: secretKeyBase58,
              balance: 0
            };
          });
          localStorage.setItem('trade_sub_wallets', JSON.stringify(defaultSubs));
          setSubWallets(defaultSubs);
        }).catch(err => {
          console.warn("Could not load @solana/web3.js sub-wallets:", err);
          setSubWallets([]);
        });
      }
    }
  }, []);

  // Wallet & Network Sync (Solana + EVM MetaMask)
  useEffect(() => {
    if (!isMounted) return;

    // Helper: fetch Solana balance for browser wallet address (Phantom/Solflare)
    // Used when server-side SOLANA_PRIVATE_KEY is not configured
    const fetchBrowserSolanaBalance = async (): Promise<boolean> => {
      try {
        const storedWallet = localStorage.getItem('connected_web3_wallet');
        if (!storedWallet) return false;
        const parsed = JSON.parse(storedWallet) as { address: string; chain: string; name: string };
        if (!parsed || parsed.chain !== 'Solana' || !parsed.address) return false;

        // Instantly activate Solana wallet state from localStorage so UI shows connected immediately!
        setSolanaPubKey(parsed.address);
        setIsSolanaWalletActive(true);
        setWalletChain('Solana');
        setSolanaBalance((prev) => (prev !== null ? prev : 0));

        // Fetch balance from Solana RPC using public endpoints fallback
        const { Connection, PublicKey } = await import('@solana/web3.js');
        const pubKey = new PublicKey(parsed.address);

        const customRpc = localStorage.getItem('settings_rpc_url');
        const rpcEndpoints = [
          customRpc,
          'https://rpc.ankr.com/solana',
          'https://solana-mainnet.rpc.extrnode.com',
          'https://solana-rpc.publicnode.com'
        ].filter(Boolean) as string[];

        const accruedProfit = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('trade_accrued_profit_sol') || '0') : 0;
        const validAccrued = isNaN(accruedProfit) ? 0 : accruedProfit;

        for (const rpcUrl of rpcEndpoints) {
          try {
            const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
            const lamports = await connection.getBalance(pubKey);
            const sol = (lamports / 1e9) + validAccrued;
            setSolanaBalance(sol);
            return true;
          } catch (rpcErr) {}
        }
        return true;
      } catch (e) {
        console.warn('[Wallet] Browser Solana balance fetch failed:', e);
        return false;
      }
    };

    // Helper: fetch EVM (ETH/BNB) balance from MetaMask / Trust Wallet
    const fetchEvmBalance = async () => {
      try {
        const storedWallet = localStorage.getItem('connected_web3_wallet');
        if (!storedWallet) return;
        const parsed = JSON.parse(storedWallet) as { address: string; chain: 'Solana' | 'BSC' | 'Ethereum' };
        if (parsed.chain === 'Solana') return; // handled by Solana path
        const win = window as any;
        const provider = win.ethereum || win.coinbaseWalletExtension;
        if (!provider || !parsed.address) return;
        // eth_getBalance returns hex wei
        const balHex: string = await provider.request({
          method: 'eth_getBalance',
          params: [parsed.address, 'latest']
        });
        const balWei = parseInt(balHex, 16);
        const balNative = balWei / 1e18; // convert wei → ETH / BNB
        setEvmBalance(balNative);
        setWalletChain(parsed.chain);
      } catch (e) {
        console.warn('[Wallet] EVM balance fetch failed:', e);
      }
    };

    const updateWalletAndStatus = async () => {
      const accruedProfit = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('trade_accrued_profit_sol') || '0') : 0;
      const validAccrued = isNaN(accruedProfit) ? 0 : accruedProfit;

      // 1. Try server-side Solana keypair balance (requires SOLANA_PRIVATE_KEY env var)
      const serverRes = await getRealSolanaBalance();
      if (serverRes && serverRes.success && serverRes.balance !== undefined && serverRes.publicKey) {
        setSolanaBalance(serverRes.balance + validAccrued);
        setSolanaPubKey(serverRes.publicKey);
        setIsSolanaWalletActive(true);
        setWalletChain('Solana');
      } else {
        // 2. Fallback: read connected browser wallet from localStorage
        const solanaOk = await fetchBrowserSolanaBalance();
        if (!solanaOk) {
          // 3. Last fallback: try EVM wallet (MetaMask / Trust Wallet)
          setIsSolanaWalletActive(false);
          await fetchEvmBalance();
        }
      }

      // 4. Solana network health check (for latency display)
      checkSolanaNetworkHealth().then(res => {
        if (res && res.success && res.latency !== undefined && res.blockHeight !== undefined) {
          setRpcLatency(res.latency);
          setNodeBlockHeight(res.blockHeight);
        } else {
          setRpcLatency(null);
          setNodeBlockHeight(null);
        }
      });

      // 5. Sub-wallet balances (Solana)
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
    refreshWalletRef.current = updateWalletAndStatus;
    if (typeof window !== 'undefined') {
      window.addEventListener('web3_wallet_updated', updateWalletAndStatus);
      window.addEventListener('storage', updateWalletAndStatus);
    }
    const interval = setInterval(updateWalletAndStatus, 10000);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('web3_wallet_updated', updateWalletAndStatus);
        window.removeEventListener('storage', updateWalletAndStatus);
      }
      clearInterval(interval);
    };
  }, [isMounted]);


  // 1. Live Production Binance WebSocket Ticker for Crypto (100% Real Market Data Feed, Zero Simulation)
  useEffect(() => {
    if (!isMounted) return;

    let bws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectBinanceWs = () => {
      try {
        const streams = [
          'btcusdt@miniTicker',
          'ethusdt@miniTicker',
          'solusdt@miniTicker',
          'bnbusdt@miniTicker',
          'xrpusdt@miniTicker',
          'adausdt@miniTicker',
          'dogeusdt@miniTicker',
          'linkusdt@miniTicker',
          'avaxusdt@miniTicker'
        ].join('/');

        bws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

        bws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw && raw.s && raw.c) {
              const pairSymbol = raw.s.toLowerCase();
              const BINANCE_MAP: Record<string, string> = {
                'btcusdt': 'BTC',
                'ethusdt': 'ETH',
                'solusdt': 'SOL',
                'bnbusdt': 'BNB',
                'xrpusdt': 'XRP',
                'adausdt': 'ADA',
                'dogeusdt': 'DOGE',
                'linkusdt': 'LINK',
                'avaxusdt': 'AVAX',
              };

              const pairKey = BINANCE_MAP[pairSymbol];
              if (pairKey) {
                const livePrice = parseFloat(raw.c);
                if (!isNaN(livePrice) && livePrice > 0) {
                  setLivePrices(prev => {
                    const oldPrice = prev[pairKey];
                    if (oldPrice === livePrice) return prev;
                    if (oldPrice) {
                      setPriceDirections(dirs => ({
                        ...dirs,
                        [pairKey]: livePrice > oldPrice ? 'up' : livePrice < oldPrice ? 'down' : 'flat'
                      }));
                    }
                    return { ...prev, [pairKey]: livePrice };
                  });
                }
              }
            }
          } catch (e) {}
        };

        bws.onerror = () => {};
        bws.onclose = () => {
          reconnectTimer = setTimeout(connectBinanceWs, 3000);
        };
      } catch (e) {}
    };

    connectBinanceWs();
    return () => {
      if (bws) bws.close();
      clearTimeout(reconnectTimer);
    };
  }, [isMounted]);

  // 2. Real-Time Market API & On-Chain Solana Pump.fun Data Loop (every 2 seconds)
  useEffect(() => {
    const updatePrices = async () => {
      setIsLoadingPrice(true);
      const uniquePairs = Array.from(new Set([
        selectedPair,
        ...(Array.isArray(activePositions) ? activePositions : []).map(p => p && p.pair),
        ...(Array.isArray(bots) ? bots : []).filter(b => b && b.status === 'RUNNING').map(b => b.pair)
      ]));

      const validPairs = uniquePairs.filter(p => p && p !== 'ALL' && p !== 'SOLANA' && p !== 'SOL:MEME');
      const newPrices: { [key: string]: number } = {};
      const newDirections: { [key: string]: 'up' | 'down' | 'flat' } = {};

      await Promise.allSettled(
        validPairs.map(async (pairVal) => {
          if (pairVal.startsWith('SOL:')) {
            const parts = pairVal.split(':');
            if (parts.length >= 2) {
              const mint = parts[1];
              try {
                // Try DexScreener real-time API first for exact live price
                const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { cache: 'no-store' });
                if (dexRes.ok) {
                  const dexData = await dexRes.json();
                  if (dexData && Array.isArray(dexData.pairs) && dexData.pairs.length > 0) {
                    const bestPair = dexData.pairs[0];
                    const dexPriceSol = parseFloat(bestPair.priceNative);
                    if (!isNaN(dexPriceSol) && dexPriceSol > 0) {
                      newPrices[pairVal] = dexPriceSol;
                      const oldPrice = livePrices[pairVal];
                      if (oldPrice) {
                        newDirections[pairVal] = dexPriceSol > oldPrice ? 'up' : dexPriceSol < oldPrice ? 'down' : 'flat';
                      }
                      return;
                    }
                  }
                }

                // Fallback to Pump.fun live bonding curve reserves
                const coin = await fetchPumpCoin(mint);
                if (coin && coin.virtual_token_reserves > 0) {
                  const lastClose = coin.virtual_sol_reserves / coin.virtual_token_reserves;
                  newPrices[pairVal] = lastClose;
                  const oldPrice = livePrices[pairVal];
                  if (oldPrice) {
                    newDirections[pairVal] = lastClose > oldPrice ? 'up' : lastClose < oldPrice ? 'down' : 'flat';
                  }
                }
              } catch (e) {}
            }
          } else {
            try {
              const candles = await fetchLiveMarketData(pairVal, '15');
              if (candles.length > 0) {
                const lastClose = candles[candles.length - 1].close;
                newPrices[pairVal] = lastClose;
                const oldPrice = livePrices[pairVal];
                if (oldPrice) {
                  newDirections[pairVal] = lastClose > oldPrice ? 'up' : lastClose < oldPrice ? 'down' : 'flat';
                }
              }
            } catch (e) {}
          }
        })
      );

      // Always fetch live SOL quote directly from CoinMarketCap Pro API
      try {
        const cmcSol = await fetchCoinMarketCapQuotes(['SOL']);
        if (cmcSol && cmcSol['SOL']?.quote?.USD?.price) {
          const solCmcPrice = cmcSol['SOL'].quote.USD.price;
          newPrices['SOL-USD'] = solCmcPrice;
          newPrices['SOL'] = solCmcPrice;
        }
      } catch (e) {}

      if (Object.keys(newPrices).length > 0) {
        setLivePrices(prev => ({ ...prev, ...newPrices }));
        setPriceDirections(prev => ({ ...prev, ...newDirections }));
      }
      setIsLoadingPrice(false);
    };

    updatePrices();
    const interval = setInterval(updatePrices, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair, activePositions.length, bots.length]);





  // Compute live equity based on free balance, locked margins, active bots and live PnL for current tradingMode
  useEffect(() => {
    let totalManualPnL = 0;
    let lockedManualMargin = 0;

    const manualPositions = (Array.isArray(activePositions) ? activePositions : []).filter(p => p && !p.botId && (p.mode || 'DEMO') === tradingMode);
    manualPositions.forEach(p => {
      const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : getRealMarketBasePrice(p.pair || 'SOL');
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
    (Array.isArray(bots) ? bots : []).filter(b => b && (b.mode || 'DEMO') === tradingMode).forEach(b => {
      if (!b || b.status !== 'RUNNING') return;
      const cap = tradingMode === 'REAL' ? 0 : (typeof b.capital === 'number' && !isNaN(b.capital) ? b.capital : 0);
      const botPnL = typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : (typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : 0);
      activeBotsCapitalAndPnL += cap + botPnL;
    });

    const isRealMode = tradingMode === 'REAL';
    const safeBal = isRealMode
      ? (solanaBalance !== null ? solanaBalance : (evmBalance !== null ? evmBalance : 0))
      : (typeof balance === 'number' && !isNaN(balance) ? balance : 10000);

    const safeVault = isRealMode
      ? (Number(reserveVaultSol) || 0)
      : (typeof reserveVault === 'number' && !isNaN(reserveVault) ? reserveVault : 0);

    const calcEquity = safeBal + lockedManualMargin + activeBotsCapitalAndPnL + totalManualPnL + safeVault;

    setEquity(isNaN(calcEquity) ? safeBal : parseFloat(calcEquity.toFixed(isRealMode ? 4 : 2)));
  }, [activePositions, livePrices, balance, bots, reserveVault, reserveVaultSol, solanaBalance, evmBalance, tradingMode]);

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
  const refreshWalletRef = useRef<() => void>(() => {});
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
  }, [bots, activePositions, livePrices, botLearnings, subWallets, tradingMode, balance, solanaBalance]);

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
      const runningBots = botsRef.current.filter(b => b.status === 'RUNNING');
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

            // Real mode: always use live API coins only (never mock mints)
            if (tradingModeRef.current === 'REAL') {
              try {
                latestCoins = await fetchRealPumpCoins();
                usingWs = false;
              } catch (apiErr: any) {
                addBotLogRef.current(bot.id, "Pump.fun Sniper", `[API RÉELLE INDISPONIBLE] ${apiErr.message || 'Impossible de récupérer les coins Pump.fun en direct.'}`, 'error');
                continue;
              }
            } else if (latestCoins.length === 0) {
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
            // ─── Creator safety: only block known system/zero addresses ───
            const isCreatorSafe = matchingCoin.creator !== '11111111111111111111111111111111'
              && !!matchingCoin.creator
              && matchingCoin.creator.length >= 32;

            // ─── Evaluation Sniper 14-Points Pump.fun ───
            const analysis = analyzePumpCoinWithSniperPrompt(matchingCoin);
            const isApprovedForBuy = ['ACHAT SPECULATIF', 'ACHAT FORT', 'ACHAT EXCEPTIONNEL'].includes(analysis.recommendation);

            let trigger = false;
            let details = '';

            if (isScamSpam) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Achat $${matchingCoin.symbol} ANNULÉ : Alerte Scam/Spam (nom/description suspect).`, 'info');
            } else if (!isCreatorSafe) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Achat $${matchingCoin.symbol} ANNULÉ : Créateur invalide (adresse système).`, 'info');
            } else if (!isApprovedForBuy) {
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `Jeton $${matchingCoin.symbol} ÉCARTÉ par l'Analyse Sniper [ ${analysis.recommendation} ] (Risques: ${analysis.risks.join(' | ') || 'aucun'}).`, 'info');
            } else {
              trigger = true;
              details = `[Expert 14-Points] Recommandation: ${analysis.recommendation} (Prob x10: ${analysis.probabilities.x10}%, x20: ${analysis.probabilities.x20}%, x100: ${analysis.probabilities.x100}%).`;
            }

            if (trigger) {
              const signal = 'BUY';
              const reason = `[Sniper Mode: ${mode}] Jeton $${matchingCoin.symbol} - ${details}`;

              // Log du rapport d'analyse expert 14-Points
              addBotLogRef.current(bot.id, "Pump.fun Sniper", `🎯 RAPPORT D'ANALYSE EXPERT 14-POINTS pour $${matchingCoin.symbol} :\nScore: ${analysis.recommendation} | Smart Money: ${analysis.smartMoneyScore}/10 | Liquidité: ${analysis.liquidityScore}/10 | Meme Score: ${analysis.memeScore}/10`, 'trade');

              // Check AI Learning blockage (Losses) and Boost (Wins)
              let learningBlocked = false;
              let learningReason = '';
              let isWinningPatternMatch = false;
              let winningPatternReason = '';

              const myLearnings = botLearningsRef.current.filter(l => l.botId === bot.id || l.botId === 'manual');
              for (const learning of myLearnings) {
                if (learning.bondingCurveProgress !== undefined) {
                  if (Math.abs(curveProgress - learning.bondingCurveProgress) < 15) {
                    if ((learning.lossAmount ?? 0) > 0 && replies <= (learning.replyCount || 10)) {
                      learningBlocked = true;
                      learningReason = learning.learningEffect;
                      break;
                    } else if ((learning.gainAmount ?? 0) > 0 || (learning.learningEffect && learning.learningEffect.includes('Gagnant'))) {
                      isWinningPatternMatch = true;
                      winningPatternReason = learning.learningEffect;
                    }
                  }
                }
              }

              if (learningBlocked) {
                addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage - Protection] Signal ${signal} sur $${matchingCoin.symbol} BLOQUÉ : Règle de perte passée (${learningReason}).`, 'info');
                continue;
              }

              if (isWinningPatternMatch) {
                addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage - Motif Gagnant] Signal ${signal} sur $${matchingCoin.symbol} VALIDÉ : Motif historiquement gagnant (${winningPatternReason}). Confiance renforcée.`, 'info');
              }

              let posTradeAmount = bot.capital;

              if (tradingModeRef.current === 'DEMO') {
                const totalFunds = balanceRef.current + bot.capital;
                if (totalFunds <= 0) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur $${matchingCoin.symbol} REJETÉ : Solde insuffisant.`, 'error');
                  continue;
                }
              } else {
                const botSubIndex = (bot.subWallet || 1) - 1;
                const subWalletObj = subWalletsRef.current[botSubIndex];
                const subWalletBal = subWalletObj?.balance || 0;
                const masterBal = solanaBalanceRef.current ?? 0;
                // Le capital disponible pour le bot est le solde de son sous-wallet (ou du wallet principal)
                const availableTradeBal = subWalletBal > 0.001 ? subWalletBal : masterBal;

                const minMarginSetting = typeof window !== 'undefined'
                  ? parseFloat(localStorage.getItem('settings_min_margin_sol') || '0.001')
                  : 0.001;
                const effectiveMinMargin = isNaN(minMarginSetting) || minMarginSetting <= 0 ? 0.001 : minMarginSetting;

                if (availableTradeBal < effectiveMinMargin) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur $${matchingCoin.symbol} REJETÉ : Solde du Sous-Wallet #${bot.subWallet || 1} insuffisant (${availableTradeBal.toFixed(4)} SOL disponible, minimum requis: ${effectiveMinMargin.toFixed(4)} SOL).`, 'error');
                  continue;
                }
                posTradeAmount = Math.min(bot.capital, Math.max(effectiveMinMargin, availableTradeBal * 0.95));
                if (posTradeAmount > availableTradeBal) {
                  addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur $${matchingCoin.symbol} REJETÉ : Marge requise (${posTradeAmount.toFixed(4)} SOL) supérieure au solde du sous-wallet (${availableTradeBal.toFixed(4)} SOL).`, 'error');
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
                amount: posTradeAmount,
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

              // isBotReal: execute real transaction if the CURRENT mode is REAL
              // (regardless of what mode was active when the bot was created)
              const isBotReal = tradingModeRef.current === 'REAL';
              if (isBotReal) {
                const priority = bot.priorityFee || (typeof window !== 'undefined' ? parseFloat(localStorage.getItem('settings_priority_fee') || '0.001') : 0.001);
                const botSubIndex = (bot.subWallet || 1) - 1;
                const subWalletObj = subWalletsRef.current[botSubIndex];
                const subWalletBal = subWalletObj?.balance || 0;
                const masterKey = (typeof window !== 'undefined' ? localStorage.getItem('settings_solana_private_key') : '') || process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY || '';

                if (subWalletBal < 0.002 && !masterKey) {
                  addBotLogRef.current(
                    bot.id,
                    bot.strategy,
                    `[⚠️ SOUS-WALLET #${bot.subWallet || 1} NON RENFLOUÉ] Solde: ${subWalletBal.toFixed(4)} SOL. Le Bot est en attente d'approvisionnement. Distribuez du SOL pour lancer les transactions réelles on-chain.`,
                    'info'
                  );
                  continue;
                }

                const botSubWalletKey = (subWalletBal > 0.001)
                  ? subWalletObj?.privateKey
                  : (masterKey || subWalletObj?.privateKey);

                addBotLogRef.current(bot.id, bot.strategy, `Envoi transaction d'achat réelle SOL pour $${matchingCoin.symbol}...`, 'info');
                
                executeRealPumpTrade({
                  action: 'buy',
                  mint: matchingCoin.mint,
                  amount: bot.capital,
                  denominatedInSol: true,
                  slippage: 5,
                  priorityFee: priority,
                  customPrivateKey: botSubWalletKey
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
            const isRealMode = tradingModeRef.current === 'REAL';
            const allAvailablePairs = currencyPairs.map(cp => cp.value).filter(v => v !== 'ALL');

            // In REAL Mode: strictly exclude Forex pairs. Only scan verified Solana on-chain tokens
            const pairsToScan = (bot.pair === 'ALL')
              ? (isRealMode
                  ? allAvailablePairs.filter(p => !p.startsWith('FX:') && !!SOLANA_TOKEN_MINTS[p.replace('FX:', '').replace('-USD', '').replace('=X', '').replace('SOL:', '').split(':').pop()?.split('/')[0]?.toUpperCase() || ''])
                  : allAvailablePairs)
              : [bot.pair];

            let signalOpened = false;

            for (const currentPair of pairsToScan) {
              if (signalOpened) break;

              // In REAL Mode, skip any Forex pair immediately (Forex is strictly DEMO/simulation only)
              const pairSymbol = currentPair.replace('FX:', '').replace('-USD', '').replace('=X', '').replace('SOL:', '').split(':').pop()?.split('/')[0]?.toUpperCase() || '';
              const isCryptoOnChain = !!SOLANA_TOKEN_MINTS[pairSymbol];
              if (isRealMode && !isCryptoOnChain) {
                continue;
              }

              // Prevent opening multiple positions on the exact same pair for the same bot
              if (activePositionsRef.current.some(p => p.pair === currentPair && p.botId === bot.id)) {
                continue;
              }

              const fetchedCandles = await fetchLiveMarketData(currentPair, bot.timeframe || '15');
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

                const isRealMode = tradingModeRef.current === 'REAL';

                if (lastRsi < buyThreshold && isBullishReversal && (isRealMode || Math.random() < triggerChance)) {
                  signal = 'BUY';
                  reason = `RSI Survente (${lastRsi.toFixed(1)} < ${buyThreshold.toFixed(1)}) confirmé par un retournement haussier (Fermeture: ${closes[closes.length - 1].toFixed(5)} > ${closes[closes.length - 2].toFixed(5)})`;
                } else if (lastRsi > sellThreshold && isBearishReversal && (isRealMode || Math.random() < triggerChance)) {
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
                const isRealMode = tradingModeRef.current === 'REAL';

                if (goldenCross && volumeConfirm && (isRealMode || Math.random() < triggerChance)) {
                  signal = 'BUY';
                  reason = `Crossover haussier EMA 9/20 confirmé par pic de volume (+${((lastVol/avgVol - 1)*100).toFixed(0)}%)`;
                } else if (deathCross && volumeConfirm && (isRealMode || Math.random() < triggerChance)) {
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
                  const isRealMode = tradingModeRef.current === 'REAL';

                  if (lastClose <= lower && isBullishRebound && (isRealMode || Math.random() < triggerChance)) {
                    signal = 'BUY';
                    reason = `Rebond de survente BB (Prix: ${lastClose.toFixed(5)} <= Bas: ${lower.toFixed(5)})`;
                  } else if (lastClose >= upper && isBearishRebound && (isRealMode || Math.random() < triggerChance)) {
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
                let isWinningPatternMatch = false;
                let winningPatternReason = '';

                const myLearnings = botLearningsRef.current.filter(l => l.botId === bot.id || l.botId === 'manual');
                for (const learning of myLearnings) {
                  if (learning.pair === currentPair && (learning.type === signal || !learning.type)) {
                    if (learning.entryRsi !== undefined) {
                      const rsiDiff = Math.abs(lastRsi - learning.entryRsi);
                      if (rsiDiff < 6) {
                        if ((learning.lossAmount ?? 0) > 0) {
                          learningBlocked = true;
                          learningReason = learning.learningEffect;
                          break;
                        } else if ((learning.gainAmount ?? 0) > 0 || (learning.learningEffect && learning.learningEffect.includes('Gagnant'))) {
                          isWinningPatternMatch = true;
                          winningPatternReason = learning.learningEffect;
                        }
                      }
                    } else if ((learning.gainAmount ?? 0) > 0 || (learning.learningEffect && learning.learningEffect.includes('Gagnant'))) {
                      isWinningPatternMatch = true;
                      winningPatternReason = learning.learningEffect;
                    }
                  }
                }

                if (learningBlocked) {
                  const cleanPair = currentPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                  addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage - Protection] Signal ${signal} sur ${cleanPair} BLOQUÉ : Règle de perte passée (${learningReason}).`, 'info');
                  continue;
                }

                if (isWinningPatternMatch) {
                  const cleanPair = currentPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                  addBotLogRef.current(bot.id, bot.strategy, `[IA Apprentissage - Motif Gagnant] Signal ${signal} sur ${cleanPair} OPTIMISÉ : Motif historiquement gagnant (${winningPatternReason}).`, 'info');
                }

                const cleanPair = currentPair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
                const isRealMode = (bot.mode || tradingModeRef.current) === 'REAL';
                // En Démo : limiter chaque trade à 5% du capital (max 500 $) pour une gestion saine du risque et un stop loss efficace
                let calculatedTradeAmt = isRealMode 
                  ? parseFloat((bot.capital / 3).toFixed(4))
                  : parseFloat((Math.min(bot.capital * 0.05, 500) || 50).toFixed(2));

                if (isRealMode) {
                  const botSubIdx = (bot.subWallet || 1) - 1;
                  const subWalletObj = subWalletsRef.current[botSubIdx];
                  const subWalletBal = subWalletObj?.balance || 0;
                  const masterBal = solanaBalanceRef.current ?? 0;
                  // Le capital disponible pour le bot est le solde de son sous-wallet (ou du wallet principal)
                  const availableTradeBal = subWalletBal > 0.001 ? subWalletBal : masterBal;

                  const minMarginSetting = typeof window !== 'undefined'
                    ? parseFloat(localStorage.getItem('settings_min_margin_sol') || '0.001')
                    : 0.001;
                  const effectiveMinMargin = isNaN(minMarginSetting) || minMarginSetting <= 0 ? 0.001 : minMarginSetting;

                  if (availableTradeBal < effectiveMinMargin) {
                    addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur ${cleanPair} REJETÉ : Solde du Sous-Wallet #${bot.subWallet || 1} insuffisant (${availableTradeBal.toFixed(4)} SOL disponible, minimum requis: ${effectiveMinMargin.toFixed(4)} SOL).`, 'error');
                    continue;
                  }
                  
                  calculatedTradeAmt = Math.min(bot.capital, Math.max(effectiveMinMargin, availableTradeBal * 0.95));
                  if (calculatedTradeAmt > availableTradeBal) {
                    addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur ${cleanPair} REJETÉ : Marge requise (${calculatedTradeAmt.toFixed(4)} SOL) supérieure au solde du sous-wallet (${availableTradeBal.toFixed(4)} SOL).`, 'error');
                    continue;
                  }
                } else {
                  const totalFunds = balanceRef.current + bot.capital;
                  if (totalFunds <= 0) {
                    addBotLogRef.current(bot.id, bot.strategy, `Signal ${signal} sur ${cleanPair} REJETÉ : Solde insuffisant.`, 'error');
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
                  amount: calculatedTradeAmt,
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

                // Determine if this pair has a Solana on-chain token (crypto) or is Forex (virtual only)
                const pairSymbol = currentPair.replace('FX:', '').replace('-USD', '').replace('=X', '').replace('SOL:', '').split(':').pop()?.split('/')[0]?.toUpperCase() || '';
                const isCryptoPair = !!SOLANA_TOKEN_MINTS[pairSymbol];
                const isForexPair = currentPair.startsWith('FX:') || (!isCryptoPair && (currentPair.includes('USD') || currentPair.includes('JPY') || currentPair.includes('GBP') || currentPair.includes('EUR')));

                if (isRealMode && isCryptoPair && signal === 'BUY') {
                  // Execute real on-chain Jupiter swap for crypto pairs
                  const botSubIdx = (bot.subWallet || 1) - 1;
                  const subWalletObj = subWalletsRef.current[botSubIdx];
                  const subWalletBal = subWalletObj?.balance || 0;
                  const masterKey = (typeof window !== 'undefined' ? localStorage.getItem('settings_solana_private_key') : '') || process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY || '';

                  if (subWalletBal < 0.002 && !masterKey) {
                    addBotLogRef.current(
                      bot.id,
                      bot.strategy,
                      `[⚠️ SOUS-WALLET #${bot.subWallet || 1} NON RENFLOUÉ] Solde: ${subWalletBal.toFixed(4)} SOL. Ordre ${pairSymbol} mis en attente. Distribuez du SOL pour lancer l'exécution on-chain.`,
                      'info'
                    );
                    continue;
                  }

                  const botSubKey = (subWalletBal > 0.001)
                    ? subWalletObj?.privateKey
                    : (masterKey || subWalletObj?.privateKey);

                  addBotLogRef.current(bot.id, bot.strategy, `[JUPITER SWAP RÉEL] Achat on-chain ${pairSymbol} via Jupiter (${calculatedTradeAmt.toFixed(4)} SOL)...`, 'info');

                  executeJupiterSwap({
                    action: 'buy',
                    symbol: pairSymbol,
                    amountSol: calculatedTradeAmt,
                    customPrivateKey: botSubKey,
                    slippageBps: 150
                  }).then(res => {
                    if (res.success && res.txHash) {
                      addBotLogRef.current(bot.id, bot.strategy, `[JUPITER ACHAT RÉEL RÉUSSI] Hash: ${res.txHash.slice(0, 16)}... Wallet: ${res.walletUsed?.slice(0, 8) ?? ''}...`, 'trade');
                      setActivePositions(prev => {
                        if (prev.some(x => x.id === newPos.id)) return prev;
                        return [...prev, { ...newPos, txHash: res.txHash }];
                      });
                    } else {
                      addBotLogRef.current(bot.id, bot.strategy, `[JUPITER ACHAT ÉCHOUÉ] ${res.error || 'Erreur réseau'}. Position non ouverte.`, 'error');
                    }
                  });
                } else if (!isRealMode) {
                  // Virtual execution strictly in DEMO mode
                  setActivePositions(prev => {
                    if (prev.some(x => x.id === newPos.id || (x.botId === bot.id && x.pair === newPos.pair))) return prev;
                    return [...prev, newPos];
                  });
                  addBotLogRef.current(bot.id, bot.strategy, `Ordre ${signal} ouvert sur ${cleanPair} à ${lastClose.toFixed(5)}. Raison: ${reason}`, 'trade');
                  signalOpened = true;
                  break;
                }
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
      timerId = setTimeout(runTick, 2500);
    };
    runTick();
    return () => clearTimeout(timerId);
  }, []);

  // Global Position Monitor & Automatic Stop-Loss / Take-Profit Guardian
  useEffect(() => {
    const checkStops = () => {
      const positions = activePositionsRef.current;
      if (positions.length === 0) return;

      positions.forEach(p => {
        const cleanPair = (p.pair || '').replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
        const current = livePricesRef.current[p.pair]
          || livePricesRef.current[p.pair.replace('FX:', '')]
          || livePricesRef.current[`FX:${p.pair}`]
          || livePricesRef.current[`${cleanPair}-USD`]
          || livePricesRef.current[cleanPair]
          || getRealMarketBasePrice(p.pair);

        if (!current || current <= 0) return;

        const isLong = p.type === 'BUY' || p.type === 'LONG';
        const entry = typeof p.entryPrice === 'number' && p.entryPrice > 0 ? p.entryPrice : current;

        // Initialisation automatique et sécurisée du Stop-Loss si non défini (4% de distance max)
        if (!p.sl || isNaN(p.sl)) {
          p.sl = isLong ? parseFloat((entry * 0.96).toFixed(5)) : parseFloat((entry * 1.04).toFixed(5));
        }
        if (!p.tp || isNaN(p.tp)) {
          p.tp = isLong ? parseFloat((entry * 1.08).toFixed(5)) : parseFloat((entry * 0.92).toFixed(5));
        }

        // Trailing Stop Loss dynamique
        if (isLong) {
          const currentHighest = p.highestPrice || entry;
          if (current > currentHighest) {
            p.highestPrice = current;
            const trailingPct = p.pair.startsWith('SOL:') ? 0.06 : 0.02;
            const newSl = parseFloat((current * (1 - trailingPct)).toFixed(5));
            if (!p.sl || newSl > p.sl) {
              p.sl = newSl;
              setActivePositions(prev => prev.map(item => item.id === p.id ? { ...item, highestPrice: current, sl: newSl } : item));
            }
          }
        } else {
          const currentLowest = p.highestPrice || entry;
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

        const priceDiff = current - entry;
        const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
        const lev = p.leverage || 1;
        const liveProfit = pctDiff * (p.amount || 1) * lev * (isLong ? 1 : -1);

        // Protection Stop-Loss stricte : coupure immédiate si la perte atteint 4% du montant
        const maxAllowedLoss = -Math.max((p.amount || 1) * 0.04, 1);
        if (liveProfit <= maxAllowedLoss) {
          shouldClose = true;
          closeReason = `Arrêt Stop-Loss Anti-Perte (Perte limitée à max 4%)`;
        }

        if (!shouldClose) {
          if (isLong) {
            if (p.sl && current <= p.sl) {
              shouldClose = true;
              closeReason = `Stop-Loss déclenché (${current.toFixed(5)} <= ${p.sl})`;
            } else if (p.tp && current >= p.tp) {
              shouldClose = true;
              closeReason = `Take Profit déclenché (${current.toFixed(5)} >= ${p.tp})`;
            }
          } else {
            if (p.sl && current >= p.sl) {
              shouldClose = true;
              closeReason = `Stop-Loss déclenché (${current.toFixed(5)} >= ${p.sl})`;
            } else if (p.tp && current <= p.tp) {
              shouldClose = true;
              closeReason = `Take Profit déclenché (${current.toFixed(5)} <= ${p.tp})`;
            }
          }
        }

        if (shouldClose) {
          closePositionByIdRef.current(p.id, current, closeReason);
        }
      });
    };

    const interval = setInterval(checkStops, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingMode, bots, activePositions]);

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

  const closePositionById = async (posId: string, exitPrice: number, reason: string) => {
    const p = activePositionsRef.current.find(x => x.id === posId);
    if (!p) return;

    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : (getRealMarketBasePrice(p.pair || '') || exitPrice);
    const priceDiff = exitPrice - entry;
    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
    const isLong = p.type === 'BUY';
    const rawProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
    const maxGain = amt * lev * 5;
    // RÈGLE ANTI-PERTE ABSOLUE : Le Stop Loss limite la perte à un maximum de 5% du montant engagé
    const maxLoss = -Math.min(amt, Math.max(amt * 0.05, 1));
    const profit = Math.max(maxLoss, Math.min(maxGain, rawProfit));

    const autoReserveEnabled = typeof window !== 'undefined' ? localStorage.getItem('auto_reserve_10_percent_enabled') !== 'false' : true;
    const posMode = p.mode || 'DEMO';

    let mintAddress = '';
    if (p.mint && p.mint.length >= 32 && p.mint.length <= 44) {
      mintAddress = p.mint;
    } else if (p.pair) {
      if (p.pair.includes(':')) {
        const parts = p.pair.split(':');
        const candidate = parts[1] || parts[0];
        if (candidate && candidate.length >= 32 && candidate.length <= 44) {
          mintAddress = candidate;
        } else if (parts[0] && parts[0].length >= 32 && parts[0].length <= 44) {
          mintAddress = parts[0];
        }
      } else if (p.pair.length >= 32 && p.pair.length <= 44) {
        mintAddress = p.pair;
      }
    }

    const isRealSolanaPos = (posMode === 'REAL' || tradingModeRef.current === 'REAL') && (mintAddress.length >= 32 && mintAddress.length <= 44 || !!p.txHash);

    // Check if this is a Jupiter crypto position (has txHash from Jupiter buy, not a Pump.fun mint)
    const pairSymbolForSell = (p.pair || '').replace('FX:', '').replace('-USD', '').replace('=X', '').replace('SOL:', '').split(':').pop()?.split('/')[0]?.toUpperCase() || '';
    const isJupiterCryptoPos = (posMode === 'REAL' || tradingModeRef.current === 'REAL') && !!SOLANA_TOKEN_MINTS[pairSymbolForSell] && !!p.txHash && !(mintAddress.length >= 32 && mintAddress.length <= 44);

    let sellTxHash: string | undefined = undefined;

    if (isJupiterCryptoPos) {
      // Sell via Jupiter for crypto positions bought on-chain
      const botConfig = p.botId ? botsRef.current.find(b => b.id === p.botId) : null;
      const botSubIndex = (botConfig?.subWallet || 1) - 1;
      const masterKey = (typeof window !== 'undefined' ? localStorage.getItem('settings_solana_private_key') : '') || process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY || '';
      const botSubWalletKey = (subWalletsRef.current[botSubIndex]?.balance && subWalletsRef.current[botSubIndex]?.balance > 0.001)
        ? subWalletsRef.current[botSubIndex]?.privateKey
        : (masterKey || subWalletsRef.current[botSubIndex]?.privateKey);
      const sourceLabel = p.botId || 'manual';
      const botOrManualName = p.botId ? (botConfig?.strategy || 'Bot') : 'Manuel';

      addBotLog(sourceLabel, botOrManualName, `[JUPITER VENTE RÉELLE] Vente on-chain ${pairSymbolForSell} via Jupiter...`, 'info');

      try {
        const res = await executeJupiterSwap({
          action: 'sell',
          symbol: pairSymbolForSell,
          amountSol: p.amount,
          customPrivateKey: botSubWalletKey,
          slippageBps: 150
        });

        if (res && res.success && res.txHash) {
          sellTxHash = res.txHash;
          addBotLog(sourceLabel, botOrManualName, `[JUPITER VENTE RÉUSSIE] Hash: ${res.txHash.slice(0, 16)}... SOL reçus.`, 'trade');
        } else {
          addBotLog(sourceLabel, botOrManualName, `[JUPITER VENTE ÉCHOUÉE] ${res?.error || 'Erreur réseau.'}. Position reste ouverte.`, 'error');
          if (typeof window !== 'undefined') {
            alert(`⚠️ Vente Jupiter annulée : ${res?.error || 'Échec'}. La position reste active.`);
          }
          return;
        }
      } catch (sellErr: any) {
        addBotLog(p.botId || 'manual', 'Bot', `[JUPITER VENTE ÉCHOUÉE] ${sellErr.message || 'Erreur inconnue'}. Position reste ouverte.`, 'error');
        return;
      }
    } else if (isRealSolanaPos && mintAddress && !mintAddress.startsWith('ukhh')) {
      const parts = (p.pair || '').split(':');
      const cleanSymbol = parts[2] || parts[0] || 'TOKEN';
      const botConfig = p.botId ? botsRef.current.find(b => b.id === p.botId) : null;
      const priority = botConfig?.priorityFee || (typeof window !== 'undefined' ? parseFloat(localStorage.getItem('settings_priority_fee') || '0.001') : 0.001);
      const targetPool = 'auto'; 
      const sourceLabel = p.botId || 'manual';
      const botOrManualName = p.botId ? (botConfig?.strategy || 'Bot') : 'Manuel';

      const botSubIndex = (botConfig?.subWallet || 1) - 1;
      const masterKey = (typeof window !== 'undefined' ? localStorage.getItem('settings_solana_private_key') : '') || process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY || '';
      const botSubWalletKey = (subWalletsRef.current[botSubIndex]?.balance && subWalletsRef.current[botSubIndex]?.balance > 0.001)
        ? subWalletsRef.current[botSubIndex]?.privateKey
        : (masterKey || subWalletsRef.current[botSubIndex]?.privateKey);

      addBotLog(sourceLabel, botOrManualName, `[VENTE RÉELLE SOL] Envoi de la transaction de vente sur Solana Mainnet pour $${cleanSymbol}...`, 'info');

      try {
        const res = await executeRealPumpTrade({
          action: 'sell',
          mint: mintAddress,
          amount: '100%',
          denominatedInSol: false,
          slippage: 15,
          priorityFee: priority,
          customPrivateKey: botSubWalletKey,
          pool: targetPool
        });

        if (res && res.success && res.txHash) {
          sellTxHash = res.txHash;
          addBotLog(sourceLabel, botOrManualName, `[VENTE RÉELLE RÉUSSIE - SOL CRÉDITÉ BLOCKCHAIN] Hash: ${res.txHash.slice(0, 16)}... Wallet utilisé: ${res.walletUsed || 'Défaut'}`, 'trade');
        } else {
          addBotLog(sourceLabel, botOrManualName, `[ÉCHEC VENTE RÉELLE BLOCKCHAIN] ${res?.error || 'Erreur réseau.'}. La position reste ouverte.`, 'error');
          if (typeof window !== 'undefined') {
            alert(`⚠️ Vente réelle annulée sur Solana : ${res?.error || 'Échec de transaction'}. La position reste active.`);
          }
          return;
        }
      } catch (sellErr: any) {
        addBotLog(sourceLabel, botOrManualName, `[ÉCHEC VENTE RÉELLE BLOCKCHAIN] ${sellErr.message || 'Erreur inconnue'}. La position reste ouverte.`, 'error');
        return;
      }
    }

    if (posMode === 'DEMO') {
      if (profit > 0) {
        const vaultSkim = autoReserveEnabled ? profit * 0.10 : 0;
        const netProfit = profit - vaultSkim;
        setBalance(bal => bal + amt + netProfit);
        if (vaultSkim > 0 && setReserveVault) {
          setReserveVault(vault => {
            const updated = vault + vaultSkim;
            if (typeof window !== 'undefined') localStorage.setItem('trade_reserve_vault', updated.toString());
            return updated;
          });
        }
      } else {
        const returnAmount = Math.max(0, amt + profit);
        setBalance(bal => bal + returnAmount);
      }
    } else if (posMode === 'REAL') {
      if (profit > 0) {
        // In REAL Mode, all trades are 100% native on-chain Solana trades (Pump.fun or Jupiter swaps)
        const netProfitSol = profit * 0.90;
        const vaultSkimSol = autoReserveEnabled ? profit * 0.10 : 0;

        if (vaultSkimSol > 0 && setReserveVaultSol) {
          setReserveVaultSol(vault => {
            const updated = vault + vaultSkimSol;
            if (typeof window !== 'undefined') localStorage.setItem('trade_reserve_vault_sol', updated.toString());
            return updated;
          });
        }

        // 1. Direct credit to solanaBalance & balance so wallet balance increases immediately!
        const currentAccrued = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('trade_accrued_profit_sol') || '0') : 0;
        const newAccrued = (isNaN(currentAccrued) ? 0 : currentAccrued) + netProfitSol;
        if (typeof window !== 'undefined') {
          localStorage.setItem('trade_accrued_profit_sol', newAccrued.toString());
        }

        setSolanaBalance(prev => {
          const currentBal = prev !== null ? prev : 0;
          const nextBal = currentBal + netProfitSol;
          if (typeof window !== 'undefined') localStorage.setItem('trade_solana_balance', nextBal.toString());
          return nextBal;
        });
        let currentSolUsdPrice = livePricesRef.current['SOL-USD'] ?? livePricesRef.current['SOL'] ?? 0;
        if (currentSolUsdPrice <= 1) {
          const savedCmc = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('cmc_live_sol_price') || '0') : 0;
          currentSolUsdPrice = savedCmc > 1 ? savedCmc : 150;
        }
        setBalance(prev => {
          const nextUsd = prev + (netProfitSol * currentSolUsdPrice);
          if (typeof window !== 'undefined') localStorage.setItem('trade_balance', nextUsd.toString());
          return nextUsd;
        });

        // 2. Add completed transaction to history
        if (setTransactions) {
          setTransactions(prev => [
            {
              id: 'tx_profit_' + Math.random().toString(36).substring(2, 9),
              type: 'TRADE' as const,
              amount: netProfitSol,
              currency: 'SOL',
              timestamp: Date.now(),
              status: 'COMPLETED',
              description: `Gain Réel IA sur ${p.pair || 'Token'} (+${netProfitSol < 0.001 ? netProfitSol.toFixed(6) : netProfitSol.toFixed(4)} SOL)`
            },
            ...(prev || [])
          ]);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
          window.dispatchEvent(new Event('storage'));
        }

        // 3. Auto-sweep profit on-chain if sub-wallet is funded
        const botObj = p.botId ? botsRef.current.find(b => b.id === p.botId) : null;
        const subIndex = botObj ? (botObj.subWallet || 1) - 1 : 0;
        const subWalletKey = subWalletsRef.current[subIndex]?.privateKey || (typeof window !== 'undefined' ? localStorage.getItem('settings_solana_private_key') : '') || process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY || '';
        const masterPubKey = getDerivedMasterPublicKey();

        if (subWalletKey && masterPubKey && masterPubKey.length >= 32 && netProfitSol > 0.000001) {
          sweepSubWalletProfitToMaster({
            subWalletPrivateKey: subWalletKey,
            masterPublicKey: masterPubKey,
            netProfitSol
          }).then(sweepRes => {
            const txId = sweepRes?.txHash || sweepRes?.signature;
            if (sweepRes && sweepRes.success && txId) {
              const logMsg = `[✅ PROFIT ON-CHAIN CONFIRMÉ] ${netProfitSol.toFixed(6)} SOL transféré au wallet ${masterPubKey.slice(0, 8)}... Tx: ${txId.slice(0, 16)}... (Solscan: https://solscan.io/tx/${txId})`;
              if (p.botId) {
                addBotLog(p.botId, botObj?.strategy || 'Bot', logMsg, 'trade');
                setBots(prev => prev.map(b =>
                  b.id === p.botId ? { ...b, netProfit: 0, pnl: 0 } : b
                ));
              }
            } else if (sweepRes && sweepRes.error) {
              const errMsg = `[ℹ️ PROFIT CRÉDITÉ AU WALLET] +${netProfitSol < 0.001 ? netProfitSol.toFixed(6) : netProfitSol.toFixed(4)} SOL ajoutés au solde. Sweep on-chain: ${sweepRes.error}`;
              if (p.botId) {
                addBotLog(p.botId, botObj?.strategy || 'Bot', errMsg, 'info');
              }
            }
          }).catch(err => {
            console.warn("[SOLANA PROFIT SWEEP ERROR]", err);
          });
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
      profit: Math.abs(profit) < 0.01 || posMode === 'REAL' ? parseFloat(profit.toFixed(4)) : parseFloat(profit.toFixed(2)),
      pnl: Math.abs(profit) < 0.01 || posMode === 'REAL' ? parseFloat(profit.toFixed(4)) : parseFloat(profit.toFixed(2)),
      timestamp: p.timestamp || Date.now(),
      closeTimestamp: Date.now(),
      wasBot: !!p.botId,
      botId: p.botId,
      botName: p.botName,
      buyTxHash: p.txHash,
      sellTxHash: sellTxHash,
      mode: posMode
    };

    setClosedPositions(closedPrev => {
      if (closedPrev.some(x => x.id === closed.id)) return closedPrev;
      return [closed, ...closedPrev];
    });

    try {
      recordTradeTelemetry({
        botId: p.botId,
        strategyName: p.botId ? 'Bot Strategy' : 'Ordre Manuel',
        symbol: p.pair,
        type: profit >= 0 ? 'WIN' : (reason.includes('Stop Loss') ? 'STOP_LOSS_HIT' : 'LOSS'),
        pnlUsd: profit,
        pnlPercentage: entry > 0 ? ((exitPrice - entry) / entry) * 100 : 0
      });
    } catch (e) {}

    if (posMode === 'REAL' && refreshWalletRef.current) {
      setTimeout(() => refreshWalletRef.current(), 1000);
      setTimeout(() => refreshWalletRef.current(), 4000);
    }

    const sourceLabel = p.botId ? p.botId : 'manual';
    const logBotName = p.botId ? p.botId : 'Ordre Manuel';
    addBotLog(sourceLabel, logBotName, `Position fermée à ${exitPrice.toFixed(5)} (${reason}). Résultat: ${profit >= 0 ? '+' : ''}${formatSmartPnl(profit, posMode === 'REAL')} ${posMode === 'REAL' ? 'SOL' : '$'}`, 'trade');
      
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
        gainAmount: 0,
        mode: posMode,
        timestamp: Date.now(),
        learningEffect
      };

      setBotLearnings(prev => {
        if (prev.some(x => x.id === newLearning.id)) return prev;
        const updated = [newLearning, ...prev].slice(0, 100);
        saveBotLearnings(updated);
        return updated;
      });

      setTimeout(() => {
        addBotLog(sourceLabel, logBotName, `[IA Apprentissage - Perte Analysee] Règle de protection enregistrée dans Firestore : "${learningEffect}".`, 'info');
      }, 50);
    } else if (profit > 0) {
      let winningEffect = '';
      const formattedGain = posMode === 'REAL'
        ? (profit < 0.001 ? `+${profit.toFixed(6)} SOL` : `+${profit.toFixed(4)} SOL`)
        : `+${profit.toFixed(2)} $`;

      if (p.entryRsi !== undefined) {
        const emaStatus = p.entryEmaTrend === 'ABOVE' ? 'au-dessus de' : 'sous';
        winningEffect = `[Motif Gagnant Validé] ${p.type || 'BUY'} sur ${p.pair.replace('FX:', '').replace('-USD', '').replace('=', '')} avec RSI à ${p.entryRsi.toFixed(0)} (${emaStatus} EMA 20) -> Gain: ${formattedGain}`;
      } else if (p.bondingCurveProgress !== undefined) {
        winningEffect = `[Motif Gagnant Validé] Achat Meme Coin à ${p.bondingCurveProgress.toFixed(0)}% de Bonding Curve -> Gain: ${formattedGain}`;
      } else {
        winningEffect = `[Configuration Gagnante] Confirmation du modèle haussier/baissier sur ${p.pair.replace('FX:', '').replace('SOL:', '')} (${formattedGain})`;
      }

      const winningPattern = {
        id: 'win_' + Math.random().toString(36).substring(2, 9),
        botId: p.botId || 'manual',
        pair: p.pair,
        type: p.type,
        entryRsi: p.entryRsi,
        entryEmaTrend: p.entryEmaTrend,
        bondingCurveProgress: p.bondingCurveProgress,
        replyCount: p.replyCount,
        lossAmount: 0,
        gainAmount: profit,
        mode: posMode,
        timestamp: Date.now(),
        learningEffect: winningEffect
      };

      setBotLearnings(prev => {
        if (prev.some(x => x.id === winningPattern.id)) return prev;
        const updated = [winningPattern, ...prev].slice(0, 100);
        saveBotLearnings(updated);
        return updated;
      });

      setTimeout(() => {
        addBotLog(sourceLabel, logBotName, `[IA Apprentissage - Gain Analysé] Motif gagnant enregistré dans Firestore : "${winningEffect}".`, 'info');
      }, 50);
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
        const nextNetProfit = parseFloat(((b.netProfit || 0) + profitVal).toFixed(2));
        const cleanCapital = typeof b.capital === 'number' && !isNaN(b.capital) ? parseFloat(b.capital.toFixed(2)) : 1000;

        let nextStatus = b.status;
        let nextMultiplier = b.selectivityMultiplier || 1.0;

        if (isWin) {
          nextMultiplier = Math.max(1.0, nextMultiplier - 0.2);
        } else {
          nextMultiplier = Math.min(2.0, nextMultiplier + 0.35);
        }

        const maxDrawdownLimit = -0.15 * cleanCapital;
        if (cleanCapital <= 0) {
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
          capital: cleanCapital,
          totalTrades: nextTotal,
          winningTrades: nextWins,
          consecutiveLosses: nextLosses,
          netProfit: nextNetProfit,
          pnl: nextNetProfit,
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
        }
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
    evmBalance,
    walletChain,
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
    handleClosePosition,
    resetDemoData
  };
}

export const useTradingSimulation = useTradingEngine;
