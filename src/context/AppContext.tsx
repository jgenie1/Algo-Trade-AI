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
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AppState>;
        
        isIncomingSync.current = true;
        
        if (data.tradeMode !== undefined) {
          setTradingMode(data.tradeMode);
          localStorage.setItem('trade_mode', data.tradeMode);
        }
        if (data.balance !== undefined) {
          setBalance(data.balance);
          localStorage.setItem('trade_balance', data.balance.toString());
        }
        if (data.positions !== undefined) {
          setActivePositions(data.positions);
          localStorage.setItem('trade_positions', JSON.stringify(data.positions));
        }
        if (data.closedPositions !== undefined) {
          setClosedPositions(data.closedPositions);
          localStorage.setItem('trade_closed', JSON.stringify(data.closedPositions));
        }
        if (data.bots !== undefined) {
          setBots(data.bots);
          localStorage.setItem('trade_bots', JSON.stringify(data.bots));
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
