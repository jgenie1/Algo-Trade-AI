"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, DEFAULT_USER, saveFullState, AppState, auth } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { getRealSolanaBalance } from '@/services/pumpFunService';

interface AppContextType {
  tradingMode: 'DEMO' | 'REAL';
  setTradingMode: React.Dispatch<React.SetStateAction<'DEMO' | 'REAL'>>;
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
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
  solanaBalance: number | null;
  setSolanaBalance: React.Dispatch<React.SetStateAction<number | null>>;
  solanaPubKey: string;
  setSolanaPubKey: React.Dispatch<React.SetStateAction<string>>;
  isSolanaWalletActive: boolean;
  setIsSolanaWalletActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [tradingMode, setTradingMode] = useState<'DEMO' | 'REAL'>('DEMO');
  const [balance, setBalance] = useState<number>(10000);
  const [activePositionsState, setActivePositionsState] = useState<any[]>([]);
  const [closedPositionsState, setClosedPositionsState] = useState<any[]>([]);
  const [botsState, setBotsState] = useState<any[]>([]);
  const [transactionsState, setTransactionsState] = useState<any[]>([]);
  const [botLearningsState, setBotLearningsState] = useState<any[]>([]);
  const [botLogsState, setBotLogsState] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [isSolanaWalletActive, setIsSolanaWalletActive] = useState<boolean>(false);

  const setActivePositions = React.useCallback((val: any) => {
    setActivePositionsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  const setClosedPositions = React.useCallback((val: any) => {
    setClosedPositionsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  const setBots = React.useCallback((val: any) => {
    setBotsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  const setTransactions = React.useCallback((val: any) => {
    setTransactionsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  const setBotLearnings = React.useCallback((val: any) => {
    setBotLearningsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  const setBotLogs = React.useCallback((val: any) => {
    setBotLogsState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      return Array.isArray(next) ? next : [];
    });
  }, []);

  const activePositions = activePositionsState;
  const closedPositions = closedPositionsState;
  const bots = botsState;
  const transactions = transactionsState;
  const botLearnings = botLearningsState;
  const botLogs = botLogsState;

  // State refs to resolve stale closures and race conditions in onSnapshot subscription
  const tradingModeRef = useRef(tradingMode);
  const balanceRef = useRef(balance);
  const activePositionsRef = useRef(activePositionsState);
  const closedPositionsRef = useRef(closedPositionsState);
  const botsRef = useRef(botsState);
  const transactionsRef = useRef(transactionsState);
  const botLearningsRef = useRef(botLearningsState);
  const botLogsRef = useRef(botLogsState);

  useEffect(() => { tradingModeRef.current = tradingMode; }, [tradingMode]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { activePositionsRef.current = activePositionsState; }, [activePositionsState]);
  useEffect(() => { closedPositionsRef.current = closedPositionsState; }, [closedPositionsState]);
  useEffect(() => { botsRef.current = botsState; }, [botsState]);
  useEffect(() => { transactionsRef.current = transactionsState; }, [transactionsState]);
  useEffect(() => { botLearningsRef.current = botLearningsState; }, [botLearningsState]);
  useEffect(() => { botLogsRef.current = botLogsState; }, [botLogsState]);

  // Prevents sending local updates to Firestore during an onSnapshot load
  const isIncomingSync = useRef(false);
  // CRITICAL: Gates ALL Firestore saves until initial data load is done.
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

    const loadFromLocalStorage = () => {
      const mode = localStorage.getItem('trade_mode') as 'DEMO' | 'REAL';
      const bal = localStorage.getItem('trade_balance');
      const pos = localStorage.getItem('trade_positions');
      const closed = localStorage.getItem('trade_closed');
      const runningBots = localStorage.getItem('trade_bots');
      const txs = localStorage.getItem('trade_transactions');
      const learnings = localStorage.getItem('trade_learnings');
      const logs = localStorage.getItem('trade_logs');

      if (mode === 'REAL' || mode === 'DEMO') setTradingMode(mode);
      if (bal) setBalance(parseFloat(bal));
      if (pos) { try { setActivePositions(JSON.parse(pos)); } catch(e) {} }
      if (closed) { try { setClosedPositions(JSON.parse(closed)); } catch(e) {} }
      if (runningBots) { try { setBots(JSON.parse(runningBots)); } catch(e) {} }
      if (txs) { try { setTransactions(JSON.parse(txs)); } catch(e) {} }
      if (learnings) { try { setBotLearnings(JSON.parse(learnings)); } catch(e) {} }
      if (logs) { try { setBotLogs(JSON.parse(logs)); } catch(e) {} }
    };
    
    // Timeout fallback (2.5 seconds) in case Firestore hangs or is offline
    const timeoutId = setTimeout(() => {
      if (!isInitialized.current) {
        console.warn("Firebase connection timeout. Falling back to LocalStorage.");
        loadFromLocalStorage();
        isInitialized.current = true;
        setIsLoading(false);
      }
    }, 2500);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      clearTimeout(timeoutId);
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AppState>;
        
        isIncomingSync.current = true;
        
        if (data.tradeMode !== undefined && data.tradeMode !== tradingModeRef.current) {
          setTradingMode(data.tradeMode);
          localStorage.setItem('trade_mode', data.tradeMode);
        }
        if (data.balance !== undefined && data.balance !== balanceRef.current) {
          setBalance(data.balance);
          localStorage.setItem('trade_balance', data.balance.toString());
        }
        if (data.positions !== undefined) {
          const arr = Array.isArray(data.positions) ? data.positions : [];
          if (JSON.stringify(arr) !== JSON.stringify(activePositionsRef.current)) {
            setActivePositions(arr);
            localStorage.setItem('trade_positions', JSON.stringify(arr));
          }
        }
        if (data.closedPositions !== undefined) {
          const arr = Array.isArray(data.closedPositions) ? data.closedPositions : [];
          if (JSON.stringify(arr) !== JSON.stringify(closedPositionsRef.current)) {
            setClosedPositions(arr);
            localStorage.setItem('trade_closed', JSON.stringify(arr));
          }
        }
        if (data.bots !== undefined) {
          const arr = Array.isArray(data.bots) ? data.bots : [];
          if (JSON.stringify(arr) !== JSON.stringify(botsRef.current)) {
            setBots(arr);
            localStorage.setItem('trade_bots', JSON.stringify(arr));
          }
        }
        if (data.transactions !== undefined) {
          const arr = Array.isArray(data.transactions) ? data.transactions : [];
          if (JSON.stringify(arr) !== JSON.stringify(transactionsRef.current)) {
            setTransactions(arr);
            localStorage.setItem('trade_transactions', JSON.stringify(arr));
          }
        }
        if (data.botLearnings !== undefined) {
          const arr = Array.isArray(data.botLearnings) ? data.botLearnings : [];
          if (JSON.stringify(arr) !== JSON.stringify(botLearningsRef.current)) {
            setBotLearnings(arr);
            localStorage.setItem('trade_learnings', JSON.stringify(arr));
          }
        }
        if (data.botLogs !== undefined) {
          const arr = Array.isArray(data.botLogs) ? data.botLogs : [];
          if (JSON.stringify(arr) !== JSON.stringify(botLogsRef.current)) {
            setBotLogs(arr);
            localStorage.setItem('trade_logs', JSON.stringify(arr));
          }
        }
        
        setTimeout(() => {
          isIncomingSync.current = false;
        }, 50);
      } else {
        // No Firestore document yet: fall back to LocalStorage
        loadFromLocalStorage();
      }

      // Mark initialization as complete — saves are now allowed
      isInitialized.current = true;
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase ERP Sync Error:", error);
      // On Firebase error: fall back to LocalStorage and allow saves
      loadFromLocalStorage();
      isInitialized.current = true;
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Solana Global Sync Loop
  useEffect(() => {
    const updateSolanaStatus = () => {
      getRealSolanaBalance().then(res => {
        if (res.success && res.balance !== undefined && res.publicKey) {
          setSolanaBalance(res.balance);
          setSolanaPubKey(res.publicKey);
          setIsSolanaWalletActive(true);
        } else {
          setIsSolanaWalletActive(false);
        }
      }).catch(() => {
        setIsSolanaWalletActive(false);
      });
    };

    updateSolanaStatus();
    const interval = setInterval(updateSolanaStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // 3. Save to Firestore whenever states change
  // CRITICAL: Only runs after isInitialized.current = true, which is set only
  // after the first Firestore snapshot (or localStorage fallback) completes.
  // This prevents the race condition where empty state overwrites real data on mount.
  useEffect(() => {
    if (!isInitialized.current || isIncomingSync.current) return;

    // Persist to LocalStorage immediately
    localStorage.setItem('trade_mode', tradingMode);
    localStorage.setItem('trade_balance', balance.toString());
    localStorage.setItem('trade_positions', JSON.stringify(activePositions));
    localStorage.setItem('trade_closed', JSON.stringify(closedPositions));
    localStorage.setItem('trade_bots', JSON.stringify(bots));
    localStorage.setItem('trade_transactions', JSON.stringify(transactions));
    localStorage.setItem('trade_learnings', JSON.stringify(botLearnings));
    localStorage.setItem('trade_logs', JSON.stringify(botLogs));

    // Debounce Firestore save to 500ms to avoid excessive writes
    const timer = setTimeout(() => {
      saveFullState({
        tradeMode: tradingMode,
        balance,
        positions: activePositions,
        closedPositions,
        bots,
        transactions,
        botLearnings,
        botLogs
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [tradingMode, balance, activePositions, closedPositions, bots, transactions, botLearnings, botLogs]);

  return (
    <AppContext.Provider value={{
      tradingMode,
      setTradingMode,
      balance,
      setBalance,
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
      isLoading,
      solanaBalance,
      setSolanaBalance,
      solanaPubKey,
      setSolanaPubKey,
      isSolanaWalletActive,
      setIsSolanaWalletActive
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
