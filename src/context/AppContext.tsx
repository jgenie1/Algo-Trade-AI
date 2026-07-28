"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, DEFAULT_USER, saveFullState, AppState, auth } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

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
  // Without this, the save effect fires on mount with empty arrays and
  // overwrites existing Firestore data before the snapshot arrives.
  const isInitialized = useRef(false);

  // 1. Firebase Anonymous Authentication
  useEffect(() => {
    signInAnonymously(auth)
      .then(() => {
        console.log("Firebase Auth: Connected anonymously");
      })
      .catch((error) => {
        console.warn("Firebase Auth: Anonymous login not allowed/configured. Continuing in local-only mode.", error);
      });
  }, []);

  // 2. Real-time Subscription to Firebase Firestore (primary source of truth)
  useEffect(() => {
    const docRef = doc(db, 'erp', DEFAULT_USER);

    const sanitizePositions = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((p: any) => {
        const cleanPair = (p.pair === 'ALL' || !p.pair) ? 'FX:EURUSD' : p.pair;
        const rawAmt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
        const amt = parseFloat(rawAmt.toFixed(2));
        const isEuroFix = p.pair === 'ALL' || (cleanPair === 'FX:EURUSD' && p.entryPrice > 10);
        const entry = isEuroFix ? 1.0850 : (typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 1.0850);
        return {
          ...p,
          pair: cleanPair,
          amount: amt,
          entryPrice: entry,
          leverage: typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1,
          mode: p.mode ? p.mode : (cleanPair.startsWith('SOL:') && amt < 100 ? 'REAL' : 'DEMO')
        };
      });
    };

    const sanitizeBots = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((b: any) => ({
        ...b,
        mode: b.mode ? b.mode : (b.strategy === 'Pump.fun Sniper Bot' && b.capital < 100 ? 'REAL' : 'DEMO')
      }));
    };

    const sanitizeClosed = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((c: any) => {
        const val = typeof c.profit === 'number' && !isNaN(c.profit) 
          ? c.profit 
          : (typeof c.pnl === 'number' && !isNaN(c.pnl) ? c.pnl : 0);
        return {
          ...c,
          profit: val,
          pnl: val,
          mode: c.mode ? c.mode : (c.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')
        };
      });
    };

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

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AppState>;
        
        isIncomingSync.current = true;
        
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
        }, 50);
      } else {
        loadFromLocalStorage();
      }

      isInitialized.current = true;
      setIsLoading(false);
    }, (error) => {
      console.warn("Firebase ERP Sync: switched to offline LocalStorage mode", error);
      loadFromLocalStorage();
      isInitialized.current = true;
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2b. Boucle d'exécution continue des bots actifs & alertes automatiques Telegram/Discord
  useEffect(() => {
    if (!isInitialized.current || bots.length === 0) return;

    const hasRunningBot = bots.some(b => b.status === 'RUNNING');
    if (!hasRunningBot) return;

    const interval = setInterval(() => {
      import('@/services/botExecutionEngine').then(({ processBotIteration }) => {
        processBotIteration(
          bots, 
          activePositions, 
          balance,
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
  }, [bots, activePositions, balance]);

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

    const timer = setTimeout(() => {
      saveFullState({
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
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [tradingMode, balance, reserveVault, reserveVaultSol, activePositions, closedPositions, bots, transactions, botLearnings, botLogs]);

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
