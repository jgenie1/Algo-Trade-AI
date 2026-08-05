"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, DEFAULT_USER, saveFullState, AppState, auth } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getRealMarketBasePrice, initClientUsdHtgRate, fetchLiveUsdHtgRate } from '@/lib/utils';

interface AppContextType {
  tradingMode: 'DEMO' | 'REAL';
  setTradingMode: React.Dispatch<React.SetStateAction<'DEMO' | 'REAL'>>;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  reserveVault: number;
  setReserveVault: React.Dispatch<React.SetStateAction<number>>;
  reserveVaultSol: number;
  setReserveVaultSol: React.Dispatch<React.SetStateAction<number>>;
  activePositions: any[];
  setActivePositions: React.Dispatch<React.SetStateAction<any[]>>;
  closedPositions: any[];
  setClosedPositions: React.Dispatch<React.SetStateAction<any[]>>;
  bots: any[];
  setBots: React.Dispatch<React.SetStateAction<any[]>>;
  transactions: any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  botLearnings: any[];
  setBotLearnings: React.Dispatch<React.SetStateAction<any[]>>;
  botLogs: any[];
  setBotLogs: React.Dispatch<React.SetStateAction<any[]>>;
  resetDemoData: () => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [tradingMode, setTradingMode] = useState<'DEMO' | 'REAL'>('DEMO');
  const [balance, setBalance] = useState<number>(10000);
  const [reserveVault, setReserveVault] = useState<number>(0);
  const [reserveVaultSol, setReserveVaultSol] = useState<number>(0);
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [closedPositions, setClosedPositions] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [botLearnings, setBotLearnings] = useState<any[]>([]);
  const [botLogs, setBotLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Prevents sending local updates to Firestore during an onSnapshot load
  const isIncomingSync = useRef(false);
  // CRITICAL: Gates ALL Firestore saves until initial data load is done.
  const isInitialized = useRef(false);
  // Track last synced state string to break Firestore feedback loops
  const lastStateHashRef = useRef<string>('');

  // 1. Firebase Anonymous Authentication
  useEffect(() => {
    try {
      signInAnonymously(auth)
        .then(() => {
          console.log("Firebase Auth: Connected anonymously");
        })
        .catch((error) => {
          console.warn("Firebase Auth: Anonymous login not allowed/configured. Continuing in local-only mode.", error);
        });
    } catch (e) {
      console.warn("Firebase Auth init error:", e);
    }
  }, []);

  // 1b. Load persisted USD/HTG rate from localStorage AFTER hydration (avoids SSR mismatch)
  useEffect(() => {
    // initClientUsdHtgRate reads localStorage — MUST be inside useEffect, never during render
    initClientUsdHtgRate();
    // Then fetch live rate in background
    fetchLiveUsdHtgRate().catch(() => {});
  }, []);

  // 2. Real-time Subscription to Firebase Firestore (primary source of truth)
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const loadFromLocalStorage = () => {
      const mode = localStorage.getItem('trade_mode') as 'DEMO' | 'REAL';
      const bal = localStorage.getItem('trade_balance');
      const vault = localStorage.getItem('trade_reserve_vault');
      const vaultSol = localStorage.getItem('trade_reserve_vault_sol');
      const pos = localStorage.getItem('trade_positions');
      const closed = localStorage.getItem('trade_closed');
      const runningBots = localStorage.getItem('trade_bots');
      const txs = localStorage.getItem('trade_transactions');
      const learnings = localStorage.getItem('trade_learnings');
      const logs = localStorage.getItem('trade_logs');

      if (mode === 'REAL' || mode === 'DEMO') setTradingMode(mode);
      if (bal) setBalance(parseFloat(bal));
      if (vault) setReserveVault(parseFloat(vault));
      if (vaultSol) setReserveVaultSol(parseFloat(vaultSol));
      if (pos) { try { setActivePositions(sanitizePositions(JSON.parse(pos))); } catch(e) {} }
      if (closed) { try { setClosedPositions(sanitizeClosed(JSON.parse(closed))); } catch(e) {} }
      if (runningBots) { try { setBots(sanitizeBots(JSON.parse(runningBots))); } catch(e) {} }
      if (txs) { try { setTransactions(JSON.parse(txs)); } catch(e) {} }
      if (learnings) { try { setBotLearnings(JSON.parse(learnings)); } catch(e) {} }
      if (logs) { try { setBotLogs(JSON.parse(logs)); } catch(e) {} }
    };

    const sanitizePositions = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      const seenKeys = new Set<string>();
      const cleaned: any[] = [];

      for (const p of arr) {
        if (!p || p.pair === 'ALL' || p.pair === 'SOLANA') continue;
        const cleanPair = !p.pair ? 'FX:EURUSD' : p.pair;
        const key = `${p.botId || 'manual'}_${cleanPair}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const rawAmt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
        const amt = rawAmt < 1 ? parseFloat(rawAmt.toFixed(4)) : parseFloat(rawAmt.toFixed(2));
        const expectedBase = getRealMarketBasePrice(cleanPair);
        const isInvalidEntry = !p.entryPrice || isNaN(p.entryPrice) || p.entryPrice <= 0 || (expectedBase < 10 && p.entryPrice > 500) || (expectedBase > 1000 && p.entryPrice < 100);
        const entry = isInvalidEntry ? expectedBase : p.entryPrice;

        // Forex/Commodity pairs cannot be real SOL on-chain positions
        const isNonSolanaPair = cleanPair.startsWith('FX:') || cleanPair.includes('GBP') || cleanPair.includes('EUR') || cleanPair.includes('JPY') || cleanPair.includes('XAU') || (cleanPair.includes('USD') && !cleanPair.startsWith('SOL:'));
        
        let calculatedMode = p.mode ? p.mode : (cleanPair.startsWith('SOL:') && amt < 100 ? 'REAL' : 'DEMO');
        // Force DEMO mode for non-Solana pairs or positions with synthetic huge amounts (>10)
        if (isNonSolanaPair || amt > 10) {
          calculatedMode = 'DEMO';
        }

        cleaned.push({
          ...p,
          pair: cleanPair,
          amount: amt,
          entryPrice: entry,
          leverage: typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1,
          mode: calculatedMode
        });
      }

      return cleaned;
    };

    const sanitizeBots = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((b: any) => {
        const rawCap = typeof b.capital === 'number' && !isNaN(b.capital) ? b.capital : 1000;
        const cleanCap = (rawCap > 100000 || rawCap <= 0) ? 1000 : parseFloat(rawCap.toFixed(2));
        const rawProfit = typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : (typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : 0);
        // Cap bot netProfit between -capital and capital * 10 to eliminate corrupted astronomical values
        const boundedProfit = Math.max(-cleanCap, Math.min(cleanCap * 10, rawProfit));
        const cleanProfit = parseFloat(boundedProfit.toFixed(2));

        return {
          ...b,
          capital: cleanCap,
          netProfit: cleanProfit,
          pnl: cleanProfit,
          mode: b.mode ? b.mode : (b.strategy === 'Pump.fun Sniper Bot' && cleanCap < 100 ? 'REAL' : 'DEMO')
        };
      });
    };

    const sanitizeClosed = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((c: any) => c && c.pair !== 'ALL' && c.pair !== 'SOLANA')
        .map((c: any) => {
          const rawVal = typeof c.profit === 'number' && !isNaN(c.profit) 
            ? c.profit 
            : (typeof c.pnl === 'number' && !isNaN(c.pnl) ? c.pnl : 0);
          const amt = typeof c.amount === 'number' && !isNaN(c.amount) && c.amount > 0 ? c.amount : 1000;
          const lev = typeof c.leverage === 'number' && !isNaN(c.leverage) ? c.leverage : 1;
          
          // Cap position profit between -amount and amount * leverage * 5
          const maxGain = amt * lev * 5;
          const maxLoss = -amt;
          const boundedVal = Math.max(maxLoss, Math.min(maxGain, rawVal));
          const cleanVal = parseFloat(boundedVal.toFixed(2));

          return {
            ...c,
            profit: cleanVal,
            pnl: cleanVal,
            mode: c.mode ? c.mode : (c.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')
          };
        });
    };

    // Safety timeout: if Firebase never responds (network block on server), fall back to localStorage after 3s
    const safetyTimer = setTimeout(() => {
      if (!isInitialized.current) {
        console.warn("Firebase Timeout: no response after 3s, switching to localStorage fallback");
        loadFromLocalStorage();
        isInitialized.current = true;
        setIsLoading(false);
      }
    }, 3000);

    try {
      const docRef = doc(db, 'erp', DEFAULT_USER);

      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Partial<AppState>;
            
            const incomingHash = JSON.stringify(data);
            if (incomingHash === lastStateHashRef.current) {
              isInitialized.current = true;
              setIsLoading(false);
              return;
            }

            isIncomingSync.current = true;
            lastStateHashRef.current = incomingHash;
            
            if (data.tradeMode !== undefined) {
              setTradingMode(data.tradeMode);
              localStorage.setItem('trade_mode', data.tradeMode);
            }
            if (data.balance !== undefined) {
              const val = typeof data.balance === 'number' && !isNaN(data.balance) ? data.balance : (parseFloat(String(data.balance)) || 0);
              setBalance(val);
              localStorage.setItem('trade_balance', val.toString());
            }
            if (data.reserveVault !== undefined) {
              const val = typeof data.reserveVault === 'number' && !isNaN(data.reserveVault) ? data.reserveVault : (parseFloat(String(data.reserveVault)) || 0);
              setReserveVault(val);
              localStorage.setItem('trade_reserve_vault', val.toString());
            }
            if (data.reserveVaultSol !== undefined) {
              const val = typeof data.reserveVaultSol === 'number' && !isNaN(data.reserveVaultSol) ? data.reserveVaultSol : (parseFloat(String(data.reserveVaultSol)) || 0);
              setReserveVaultSol(val);
              localStorage.setItem('trade_reserve_vault_sol', val.toString());
            }
            if (data.positions !== undefined) {
              const sanitized = sanitizePositions(data.positions);
              setActivePositions(sanitized);
              localStorage.setItem('trade_positions', JSON.stringify(sanitized));
            }
            if (data.closedPositions !== undefined) {
              const sanitized = sanitizeClosed(data.closedPositions);
              setClosedPositions(sanitized);
              localStorage.setItem('trade_closed', JSON.stringify(sanitized));
            }
            if (data.bots !== undefined) {
              const sanitized = sanitizeBots(data.bots);
              setBots(sanitized);
              localStorage.setItem('trade_bots', JSON.stringify(sanitized));
            }
            if (data.transactions !== undefined) {
              setTransactions(data.transactions);
              localStorage.setItem('trade_transactions', JSON.stringify(data.transactions));
            }
            if (data.botLearnings !== undefined) {
              setBotLearnings(data.botLearnings);
              localStorage.setItem('trade_learnings', JSON.stringify(data.botLearnings));
            }
            if (data.botLogs !== undefined) {
              setBotLogs(data.botLogs);
              localStorage.setItem('trade_logs', JSON.stringify(data.botLogs));
            }
            if (data.cexKeys !== undefined) {
              localStorage.setItem('algo_trade_cex_keys', JSON.stringify(data.cexKeys));
            }
            if (data.notificationSettings !== undefined) {
              localStorage.setItem('algo_trade_notification_settings', JSON.stringify(data.notificationSettings));
            }
            
            setTimeout(() => {
              isIncomingSync.current = false;
            }, 200);
          } else {
            loadFromLocalStorage();
          }

          isInitialized.current = true;
          setIsLoading(false);
        },
        (error) => {
          console.warn("Firestore snapshot error (using localStorage fallback):", error);
          if (!isInitialized.current) {
            loadFromLocalStorage();
            isInitialized.current = true;
            setIsLoading(false);
          }
        }
      );
    } catch (e) {
      console.warn("Firestore listener init error:", e);
      if (!isInitialized.current) {
        loadFromLocalStorage();
        isInitialized.current = true;
        setIsLoading(false);
      }
    }

    return () => {
      clearTimeout(safetyTimer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const botsRef = useRef(bots);
  const activePositionsRef = useRef(activePositions);
  const balanceRef = useRef(balance);

  useEffect(() => {
    botsRef.current = bots;
    activePositionsRef.current = activePositions;
    balanceRef.current = balance;
  });

  // 2b. Boucle d'exécution continue des bots actifs & alertes automatiques Telegram/Discord
  useEffect(() => {
    if (!isInitialized.current) return;

    const hasRunningBot = bots.some(b => b && b.status === 'RUNNING');
    if (!hasRunningBot) return;

    const interval = setInterval(() => {
      import('@/services/botExecutionEngine').then(({ processBotIteration }) => {
        processBotIteration(
          botsRef.current, 
          activePositionsRef.current, 
          balanceRef.current,
          null,
          setBots, 
          setActivePositions, 
          setClosedPositions,
          setReserveVault, 
          setReserveVaultSol
        );
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [bots.some(b => b && b.status === 'RUNNING')]);

  // 3. Save to Firestore whenever states change
  useEffect(() => {
    if (!isInitialized.current || isIncomingSync.current) return;

    localStorage.setItem('trade_mode', tradingMode);
    localStorage.setItem('trade_balance', balance.toString());
    localStorage.setItem('trade_reserve_vault', reserveVault.toString());
    localStorage.setItem('trade_reserve_vault_sol', reserveVaultSol.toString());
    localStorage.setItem('trade_positions', JSON.stringify(activePositions));
    localStorage.setItem('trade_closed', JSON.stringify(closedPositions));
    localStorage.setItem('trade_bots', JSON.stringify(bots));
    localStorage.setItem('trade_transactions', JSON.stringify(transactions));
    localStorage.setItem('trade_learnings', JSON.stringify(botLearnings));
    localStorage.setItem('trade_logs', JSON.stringify(botLogs));

    const storedCex = localStorage.getItem('algo_trade_cex_keys');
    const storedNotif = localStorage.getItem('algo_trade_notification_settings');

    const currentStateObj = {
      tradeMode: tradingMode,
      balance,
      reserveVault,
      reserveVaultSol,
      positions: activePositions,
      closedPositions,
      bots,
      transactions,
      botLearnings,
      botLogs,
      cexKeys: storedCex ? JSON.parse(storedCex) : undefined,
      notificationSettings: storedNotif ? JSON.parse(storedNotif) : undefined
    };

    const currentStateHash = JSON.stringify(currentStateObj);
    if (currentStateHash === lastStateHashRef.current) return;

    const timer = setTimeout(() => {
      lastStateHashRef.current = currentStateHash;
      saveFullState(currentStateObj);
    }, 500);

    return () => clearTimeout(timer);
  }, [tradingMode, balance, reserveVault, reserveVaultSol, activePositions, closedPositions, bots, transactions, botLearnings, botLogs]);

  const resetDemoData = () => {
    setBalance(10000);
    setReserveVault(0);
    setActivePositions(prev => (prev || []).filter((p: any) => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === 'REAL'));
    setClosedPositions(prev => (prev || []).filter((c: any) => (c.mode || (c.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === 'REAL'));
    setBots(prev => (prev || []).filter((b: any) => (b.mode || (b.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === 'REAL'));
    setBotLogs([]);
    // Note: botLearnings ARE INTENTIONALLY PRESERVED for Real mode usage!
  };

  return (
    <AppContext.Provider value={{
      tradingMode,
      setTradingMode,
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
      transactions,
      setTransactions,
      botLearnings,
      setBotLearnings,
      botLogs,
      setBotLogs,
      resetDemoData,
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppContextProvider');
  }
  return context;
}
