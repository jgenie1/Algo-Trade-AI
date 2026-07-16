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
  const [isLoading, setIsLoading] = useState(false);

  // A ref to prevent sending local updates to Firestore during the onSnapshot load
  const isIncomingSync = useRef(false);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
      const mode = localStorage.getItem('trade_mode') as 'DEMO' | 'REAL';
      const bal = localStorage.getItem('trade_balance');
      const pos = localStorage.getItem('trade_positions');
      const closed = localStorage.getItem('trade_closed');
      const runningBots = localStorage.getItem('trade_bots');
      const txs = localStorage.getItem('trade_transactions');

      if (mode === 'REAL' || mode === 'DEMO') setTradingMode(mode);
      if (bal) setBalance(parseFloat(bal));
      if (pos) {
        try { setActivePositions(JSON.parse(pos)); } catch(e) {}
      }
      if (closed) {
        try { setClosedPositions(JSON.parse(closed)); } catch(e) {}
      }
      if (runningBots) {
        try { setBots(JSON.parse(runningBots)); } catch(e) {}
      }
      if (txs) {
        try { setTransactions(JSON.parse(txs)); } catch(e) {}
      }
  }, []);

  // 1.5. Firebase Anonymous Authentication
  useEffect(() => {
    signInAnonymously(auth)
      .then(() => {
        console.log("Firebase Auth: Connected anonymously");
      })
      .catch((error) => {
        console.warn("Firebase Auth: Anonymous login not allowed/configured. Continuing in local-only mode if permissions fail.", error);
      });
  }, []);

  // 2. Real-time Subscription to Firebase Firestore
  useEffect(() => {
    const docRef = doc(db, 'erp', DEFAULT_USER);
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AppState>;
        
        // Prevent trigger loop by flagging incoming sync
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
        
        setTimeout(() => {
          isIncomingSync.current = false;
        }, 50);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase ERP Sync Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Save to Firestore whenever states change (excluding incoming syncs and initial load)
  useEffect(() => {
    if (isLoading || isIncomingSync.current) return;

    // Persist local copies immediately
    localStorage.setItem('trade_mode', tradingMode);
    localStorage.setItem('trade_balance', balance.toString());
    localStorage.setItem('trade_positions', JSON.stringify(activePositions));
    localStorage.setItem('trade_closed', JSON.stringify(closedPositions));
    localStorage.setItem('trade_bots', JSON.stringify(bots));
    localStorage.setItem('trade_transactions', JSON.stringify(transactions));

    // Debounce save to Firestore slightly
    const timer = setTimeout(() => {
      saveFullState({
        tradeMode: tradingMode,
        balance,
        positions: activePositions,
        closedPositions,
        bots,
        transactions
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [tradingMode, balance, activePositions, closedPositions, bots, transactions, isLoading]);

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
