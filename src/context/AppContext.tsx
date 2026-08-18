"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, DEFAULT_USER, getActiveUserId, saveFullState, AppState } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getRealMarketBasePrice, initClientUsdHtgRate, fetchLiveUsdHtgRate } from '@/lib/utils';
import type { 
  AppContextType, 
  Position, 
  ClosedPosition, 
  BotInstance, 
  Transaction, 
  BotLearning, 
  BotLog 
} from '@/types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [tradingMode, setTradingMode] = useState<'DEMO' | 'REAL'>('DEMO');
  const [balance, setBalance] = useState<number>(10000);
  const [reserveVault, setReserveVault] = useState<number>(0);
  const [reserveVaultSol, setReserveVaultSol] = useState<number>(0);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [botLearnings, setBotLearnings] = useState<BotLearning[]>([]);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string>(DEFAULT_USER);

  // Prevents sending local updates to Firestore during an onSnapshot load
  const isIncomingSync = useRef(false);
  // CRITICAL: Gates ALL Firestore saves until initial data load is done.
  const isInitialized = useRef(false);
  // Track last synced state string to break Firestore feedback loops
  const lastStateHashRef = useRef<string>('');

  // 1b. Load persisted USD/HTG rate from localStorage AFTER hydration (avoids SSR mismatch)
  useEffect(() => {
    initClientUsdHtgRate();
    fetchLiveUsdHtgRate().catch(() => {});
    
    // Détecter l'utilisateur actif
    if (typeof window !== 'undefined') {
      const activeId = getActiveUserId();
      setCurrentUserId(activeId);
    }
  }, []);

  // 2. Real-time Subscription to Firebase Firestore (scoped to active user / wallet)
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
      if (bal && !isNaN(parseFloat(bal))) setBalance(parseFloat(bal));
      if (vault && !isNaN(parseFloat(vault))) setReserveVault(parseFloat(vault));
      if (vaultSol && !isNaN(parseFloat(vaultSol))) setReserveVaultSol(parseFloat(vaultSol));
      if (pos) { try { const p = JSON.parse(pos); setActivePositions(sanitizePositions(Array.isArray(p) ? p : [])); } catch { setActivePositions([]); } }
      if (closed) { try { const c = JSON.parse(closed); setClosedPositions(sanitizeClosed(Array.isArray(c) ? c : [])); } catch { setClosedPositions([]); } }
      if (runningBots) { try { const b = JSON.parse(runningBots); setBots(sanitizeBots(Array.isArray(b) ? b : [])); } catch { setBots([]); } }
      if (txs) { try { const t = JSON.parse(txs); setTransactions(Array.isArray(t) ? t : []); } catch { setTransactions([]); } }
      if (learnings) { try { const l = JSON.parse(learnings); setBotLearnings(Array.isArray(l) ? l : []); } catch { setBotLearnings([]); } }
      if (logs) { try { const lg = JSON.parse(logs); setBotLogs(Array.isArray(lg) ? lg : []); } catch { setBotLogs([]); } }
    };

    const sanitizePositions = (arr: any[]): Position[] => {
      if (!Array.isArray(arr)) return [];
      const seenKeys = new Set<string>();
      const cleaned: Position[] = [];

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

        const calculatedMode: 'DEMO' | 'REAL' = p.mode ? p.mode : 'DEMO';

        cleaned.push({
          ...p,
          pair: cleanPair,
          amount: amt,
          entryPrice: entry,
          currentPrice: typeof p.currentPrice === 'number' ? p.currentPrice : entry,
          leverage: typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1,
          mode: calculatedMode
        });
      }

      return cleaned;
    };

    const sanitizeBots = (arr: any[]): BotInstance[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map((b: any) => {
        if (!b) return null;
        const rawCap = typeof b.capital === 'number' && !isNaN(b.capital) ? b.capital : 1000;
        const cleanCap = (rawCap > 100000 || rawCap <= 0) ? 1000 : parseFloat(rawCap.toFixed(2));
        const rawProfit = typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : (typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : 0);
        const boundedProfit = Math.max(-cleanCap, Math.min(cleanCap * 10, rawProfit));
        const cleanProfit = parseFloat(boundedProfit.toFixed(2));

        return {
          ...b,
          capital: cleanCap,
          netProfit: cleanProfit,
          pnl: cleanProfit,
          mode: b.mode ? b.mode : (b.strategy === 'Pump.fun Sniper Bot' && cleanCap < 100 ? 'REAL' : 'DEMO')
        } as BotInstance;
      }).filter(Boolean) as BotInstance[];
    };

    const sanitizeClosed = (arr: any[]): ClosedPosition[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((c: any) => c && c.pair !== 'ALL' && c.pair !== 'SOLANA')
        .map((c: any) => {
          const rawVal = typeof c.profit === 'number' && !isNaN(c.profit) 
            ? c.profit 
            : (typeof c.pnl === 'number' && !isNaN(c.pnl) ? c.pnl : 0);
          const amt = typeof c.amount === 'number' && !isNaN(c.amount) && c.amount > 0 ? c.amount : 1000;
          const lev = typeof c.leverage === 'number' && !isNaN(c.leverage) ? c.leverage : 1;
          
          const maxGain = amt * lev * 5;
          const maxLoss = -amt;
          const boundedVal = Math.max(maxLoss, Math.min(maxGain, rawVal));
          const cleanVal = parseFloat(boundedVal.toFixed(2));

          return {
            ...c,
            profit: cleanVal,
            pnl: cleanVal,
            mode: c.mode ? c.mode : (c.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')
          } as ClosedPosition;
        });
    };

    const safetyTimer = setTimeout(() => {
      if (!isInitialized.current) {
        console.log("Firebase Firestore unreachable — using localStorage.");
        try { unsubscribe(); } catch (_) {}
        loadFromLocalStorage();
        isInitialized.current = true;
        setIsLoading(false);
      }
    }, 3000);

    try {
      const activeId = getActiveUserId();
      const docRef = doc(db, 'erp', activeId);

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
              const sanitized = sanitizePositions(Array.isArray(data.positions) ? data.positions : []);
              setActivePositions(sanitized);
              localStorage.setItem('trade_positions', JSON.stringify(sanitized));
            }
            if (data.closedPositions !== undefined) {
              const sanitized = sanitizeClosed(Array.isArray(data.closedPositions) ? data.closedPositions : []);
              setClosedPositions(sanitized);
              localStorage.setItem('trade_closed', JSON.stringify(sanitized));
            }
            if (data.bots !== undefined) {
              const sanitized = sanitizeBots(Array.isArray(data.bots) ? data.bots : []);
              setBots(sanitized);
              localStorage.setItem('trade_bots', JSON.stringify(sanitized));
            }
            if (data.transactions !== undefined) {
              const txArr = Array.isArray(data.transactions) ? data.transactions : [];
              setTransactions(txArr);
              localStorage.setItem('trade_transactions', JSON.stringify(txArr));
            }
            if (data.botLearnings !== undefined) {
              const lrnArr = Array.isArray(data.botLearnings) ? data.botLearnings : [];
              setBotLearnings(lrnArr);
              localStorage.setItem('trade_learnings', JSON.stringify(lrnArr));
            }
            if (data.botLogs !== undefined) {
              const logArr = Array.isArray(data.botLogs) ? data.botLogs : [];
              setBotLogs(logArr);
              localStorage.setItem('trade_logs', JSON.stringify(logArr));
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
        () => {
          try { unsubscribe(); } catch (_) {}
          console.log("Firestore blocked/unavailable — switching to localStorage fallback.");
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
    botsRef.current = Array.isArray(bots) ? bots : [];
    activePositionsRef.current = Array.isArray(activePositions) ? activePositions : [];
    balanceRef.current = balance;
  }, [bots, activePositions, balance]);

  // 2b. Continuous execution loop for active bots & alerts
  useEffect(() => {
    if (!isInitialized.current) return;

    const hasRunningBot = Array.isArray(bots) && bots.some(b => b && b.status === 'RUNNING');
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
      }).catch(err => console.warn("Failed to load botExecutionEngine:", err));
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(bots) && bots.some(b => b && b.status === 'RUNNING')]);

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

    const currentStateObj: AppState = {
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
    setActivePositions(prev => (Array.isArray(prev) ? prev : []).filter((p) => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === 'REAL'));
    setClosedPositions(prev => (Array.isArray(prev) ? prev : []).filter((c) => (c.mode || (c.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === 'REAL'));
    setBots(prev => (Array.isArray(prev) ? prev : []).filter((b) => (b.mode || (b.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === 'REAL'));
    setBotLogs([]);
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
      isLoading,
      userId: currentUserId
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
