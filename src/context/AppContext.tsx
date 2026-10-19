"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, DEFAULT_USER, getActiveUserId, saveFullState, AppState } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getRealMarketBasePrice, initClientUsdHtgRate, fetchLiveUsdHtgRate, isRealOnChainPosition } from '@/lib/utils';
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

  const recentlyClosedIdsRef = useRef<Set<string>>(new Set());
  const closedPositionsRef = useRef<ClosedPosition[]>([]);

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

    const handlePositionClosed = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.id) {
        recentlyClosedIdsRef.current.add(detail.id);
        setActivePositions(prev => (Array.isArray(prev) ? prev : []).filter(p => p && p.id !== detail.id && (p as any)._id !== detail.id));
        setTimeout(() => {
          recentlyClosedIdsRef.current.delete(detail.id);
        }, 30000);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('position_closed', handlePositionClosed);
    }

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
      if (closed) { 
        try { 
          const c = JSON.parse(closed); 
          const cleanClosed = sanitizeClosed(Array.isArray(c) ? c : []);
          setClosedPositions(cleanClosed);
          closedPositionsRef.current = cleanClosed;
        } catch { 
          setClosedPositions([]); 
        } 
      }
      if (pos) { try { const p = JSON.parse(pos); setActivePositions(sanitizePositions(Array.isArray(p) ? p : [])); } catch { setActivePositions([]); } }
      if (runningBots) { try { const b = JSON.parse(runningBots); setBots(sanitizeBots(Array.isArray(b) ? b : [])); } catch { setBots([]); } }
      if (txs) { try { const t = JSON.parse(txs); setTransactions(Array.isArray(t) ? t : []); } catch { setTransactions([]); } }
      if (learnings) { try { const l = JSON.parse(learnings); setBotLearnings(Array.isArray(l) ? l : []); } catch { setBotLearnings([]); } }
      if (logs) { try { const lg = JSON.parse(logs); setBotLogs(Array.isArray(lg) ? lg : []); } catch { setBotLogs([]); } }
    };

    const sanitizePositions = (arr: any[]): Position[] => {
      if (!Array.isArray(arr)) return [];
      const seenIds = new Set<string>();
      const closedIds = new Set((closedPositionsRef.current || []).map(c => c.id));
      const cleaned: Position[] = [];

      for (const p of arr) {
        if (!p || p.pair === 'ALL' || p.pair === 'SOLANA') continue;
        const cleanPair = !p.pair ? 'FX:EURUSD' : p.pair;
        const posId = p.id || (p as any)._id || `pos_${Math.random().toString(36).substring(2, 9)}`;
        if (
          seenIds.has(posId) ||
          closedIds.has(posId) ||
          recentlyClosedIdsRef.current.has(posId) ||
          (p.id && (closedIds.has(p.id) || recentlyClosedIdsRef.current.has(p.id))) ||
          ((p as any)._id && (closedIds.has((p as any)._id) || recentlyClosedIdsRef.current.has((p as any)._id)))
        ) {
          continue;
        }
        seenIds.add(posId);
        if (p.id) seenIds.add(p.id);
        if ((p as any)._id) seenIds.add((p as any)._id);

        const isReal = isRealOnChainPosition(p);
        const calculatedMode: 'DEMO' | 'REAL' = isReal ? 'REAL' : 'DEMO';
        const rawAmt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
        const amt = isReal ? parseFloat(rawAmt.toFixed(4)) : (rawAmt < 1 ? parseFloat(rawAmt.toFixed(4)) : parseFloat(rawAmt.toFixed(2)));
        const expectedBase = getRealMarketBasePrice(cleanPair);
        const isInvalidEntry = !p.entryPrice || isNaN(p.entryPrice) || p.entryPrice <= 0 || (expectedBase < 10 && p.entryPrice > 500) || (expectedBase > 1000 && p.entryPrice < 100);
        const entry = isInvalidEntry ? expectedBase : p.entryPrice;
        const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
        const isBe = Boolean(p.isBreakEvenLocked || (p.trailingTier && p.trailingTier >= 1));

        const rawSl = typeof p.sl === 'number' ? p.sl : (typeof p.sl === 'string' && p.sl.trim() ? parseFloat(p.sl) : undefined);
        const rawTp = typeof p.tp === 'number' ? p.tp : (typeof p.tp === 'string' && p.tp.trim() ? parseFloat(p.tp) : undefined);

        let cleanSl = rawSl !== undefined && !isNaN(rawSl) && rawSl > 0 ? rawSl : undefined;
        let cleanTp = rawTp !== undefined && !isNaN(rawTp) && rawTp > 0 ? rawTp : undefined;

        // Éliminer tout SL/TP hors échelle (ex: ancien prix corrompu) ou inversé par rapport au sens de la position
        if (cleanSl !== undefined && entry > 0) {
          const slRatio = cleanSl / entry;
          const isInvertedNonBeSl = !isBe && ((isLong && cleanSl >= entry) || (!isLong && cleanSl <= entry));
          if (slRatio > 3 || slRatio < 0.33 || isInvertedNonBeSl) {
            cleanSl = undefined;
          }
        }
        if (cleanTp !== undefined && entry > 0) {
          const tpRatio = cleanTp / entry;
          const isInvertedTp = (isLong && cleanTp <= entry) || (!isLong && cleanTp >= entry);
          if (tpRatio > 4 || tpRatio < 0.25 || isInvertedTp) {
            cleanTp = undefined;
          }
        }

        const cleanHighest = (typeof p.highestPrice === 'number' && !isNaN(p.highestPrice) && p.highestPrice >= entry && p.highestPrice <= entry * 3)
          ? p.highestPrice
          : entry;
        const cleanLowest = (typeof p.lowestPrice === 'number' && !isNaN(p.lowestPrice) && p.lowestPrice <= entry && p.lowestPrice >= entry * 0.33)
          ? p.lowestPrice
          : entry;

        cleaned.push({
          ...p,
          id: posId,
          pair: cleanPair,
          amount: amt,
          entryPrice: entry,
          currentPrice: (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) && p.currentPrice > 0 && p.currentPrice / entry < 3 && p.currentPrice / entry > 0.33) ? p.currentPrice : entry,
          highestPrice: cleanHighest,
          lowestPrice: cleanLowest,
          leverage: typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1,
          sl: cleanSl,
          tp: cleanTp,
          mode: calculatedMode
        });
      }

      return cleaned;
    };

    const sanitizeBots = (arr: any[]): BotInstance[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map((b: any) => {
        if (!b) return null;
        // A bot is REAL only if explicitly marked as REAL
        const isReal = b.mode === 'REAL';
        // In REAL mode, capital is denominated in SOL (default 0.1 SOL, max 50 SOL)
        // In DEMO mode, only heal corrupted dust capital (<= $1 from legacy SOL/margin bug) back to $1000; preserve any user-chosen amount
        const defaultCap = isReal ? 0.1 : 1000;
        const rawCap = typeof b.capital === 'number' && !isNaN(b.capital) && b.capital > 0 ? b.capital : defaultCap;
        const cleanCap = isReal 
          ? (rawCap > 50 ? 0.1 : parseFloat(rawCap.toFixed(4))) 
          : ((rawCap <= 1 || rawCap > 1000000) ? 1000 : parseFloat(rawCap.toFixed(2)));
        const rawProfit = typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : (typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : 0);
        const boundedProfit = Math.max(-cleanCap, Math.min(cleanCap * 10, rawProfit));
        const cleanProfit = parseFloat(boundedProfit.toFixed(isReal ? 4 : 2));

        return {
          ...b,
          capital: cleanCap,
          netProfit: cleanProfit,
          pnl: cleanProfit,
          mode: isReal ? 'REAL' : 'DEMO'
        } as BotInstance;
      }).filter(Boolean) as BotInstance[];
    };

    const sanitizeClosed = (arr: any[]): ClosedPosition[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((c: any) => c && c.pair !== 'ALL' && c.pair !== 'SOLANA')
        .map((c: any) => {
          const isReal = isRealOnChainPosition(c);
          const rawVal = typeof c.profit === 'number' && !isNaN(c.profit) 
            ? c.profit 
            : (typeof c.pnl === 'number' && !isNaN(c.pnl) ? c.pnl : 0);
          const defaultAmt = isReal ? 0.1 : 1000;
          const amt = typeof c.amount === 'number' && !isNaN(c.amount) && c.amount > 0 ? c.amount : defaultAmt;
          const lev = typeof c.leverage === 'number' && !isNaN(c.leverage) ? c.leverage : 1;
          
          const maxGain = amt * lev * 5;
          const maxLoss = -amt;
          const boundedVal = Math.max(maxLoss, Math.min(maxGain, rawVal));
          const cleanVal = parseFloat(boundedVal.toFixed(isReal ? 4 : 2));

          return {
            ...c,
            amount: isReal ? parseFloat(amt.toFixed(4)) : parseFloat(amt.toFixed(2)),
            profit: cleanVal,
            pnl: cleanVal,
            mode: isReal ? 'REAL' : 'DEMO'
          } as ClosedPosition;
        });
    };

    // 1. Immediately hydrate from localStorage for instant 0ms rendering
    loadFromLocalStorage();
    isInitialized.current = true;
    setIsLoading(false);

    try {
      const activeId = getActiveUserId();
      const docRef = doc(db, 'erp', activeId);

      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            // Ignore local pending writes to prevent feedback loops
            if (snapshot.metadata?.hasPendingWrites) {
              return;
            }
            const data = snapshot.data() as Partial<AppState>;
            
            const incomingHash = JSON.stringify(data);
            if (incomingHash === lastStateHashRef.current) {
              return;
            }

            isIncomingSync.current = true;
            lastStateHashRef.current = incomingHash;
            
            if (data.tradeMode !== undefined && (data.tradeMode === 'REAL' || data.tradeMode === 'DEMO')) {
              setTradingMode(prev => {
                if (prev === data.tradeMode) return prev;
                localStorage.setItem('trade_mode', data.tradeMode!);
                return data.tradeMode!;
              });
            }
            if (data.balance !== undefined) {
              const val = typeof data.balance === 'number' && !isNaN(data.balance) ? data.balance : (parseFloat(String(data.balance)) || 0);
              setBalance(prev => {
                if (prev === val) return prev;
                localStorage.setItem('trade_balance', val.toString());
                return val;
              });
            }
            if (data.reserveVault !== undefined) {
              const val = typeof data.reserveVault === 'number' && !isNaN(data.reserveVault) ? data.reserveVault : (parseFloat(String(data.reserveVault)) || 0);
              setReserveVault(prev => {
                if (prev === val) return prev;
                localStorage.setItem('trade_reserve_vault', val.toString());
                return val;
              });
            }
            if (data.reserveVaultSol !== undefined) {
              const val = typeof data.reserveVaultSol === 'number' && !isNaN(data.reserveVaultSol) ? data.reserveVaultSol : (parseFloat(String(data.reserveVaultSol)) || 0);
              setReserveVaultSol(prev => {
                if (prev === val) return prev;
                localStorage.setItem('trade_reserve_vault_sol', val.toString());
                return val;
              });
            }
            if (data.closedPositions !== undefined) {
              const sanitized = sanitizeClosed(Array.isArray(data.closedPositions) ? data.closedPositions : []);
              setClosedPositions(prev => {
                const prevSafe = Array.isArray(prev) ? prev : [];
                if (prevSafe.length === sanitized.length && prevSafe.every((c, i) => c.id === sanitized[i]?.id)) {
                  return prev;
                }
                localStorage.setItem('trade_closed', JSON.stringify(sanitized));
                closedPositionsRef.current = sanitized;
                return sanitized;
              });
            }
            if (data.positions !== undefined) {
              const sanitized = sanitizePositions(Array.isArray(data.positions) ? data.positions : [])
                .filter(p => p && !recentlyClosedIdsRef.current.has(p.id) && !recentlyClosedIdsRef.current.has((p as any)._id));
              setActivePositions(prev => {
                const prevSafe = Array.isArray(prev) ? prev : [];
                // Fusion monotone : ne jamais laisser un snapshot Firestore retardé écraser un verrouillage Break-Even, un encaissement partiel 50% ou un renfort DCA local plus récent
                const merged = sanitized.map(remotePos => {
                  const localPos = prevSafe.find(lp => lp && lp.id === remotePos.id);
                  if (!localPos) return remotePos;
                  const isLong = remotePos.type === 'BUY' || (remotePos.type as string) === 'LONG';
                  const localDca = localPos.dcaCount || 1;
                  const remoteDca = remotePos.dcaCount || 1;
                  const localPartial = localPos.partialCloseCount || 0;
                  const remotePartial = remotePos.partialCloseCount || 0;
                  const localTier = localPos.trailingTier || 0;
                  const remoteTier = remotePos.trailingTier || 0;

                  if (localDca > remoteDca || localPartial > remotePartial || localTier > remoteTier) {
                    const bestSl = (localPos.sl && remotePos.sl && localDca === remoteDca)
                      ? (isLong ? Math.max(localPos.sl, remotePos.sl) : Math.min(localPos.sl, remotePos.sl))
                      : (localPos.sl ?? remotePos.sl);
                    return {
                      ...remotePos,
                      amount: localPartial > remotePartial || localDca > remoteDca ? localPos.amount : remotePos.amount,
                      entryPrice: localDca > remoteDca ? localPos.entryPrice : remotePos.entryPrice,
                      dcaCount: Math.max(localDca, remoteDca),
                      partialCloseCount: Math.max(localPartial, remotePartial),
                      trailingTier: Math.max(localTier, remoteTier),
                      isBreakEvenLocked: Boolean(localPos.isBreakEvenLocked || remotePos.isBreakEvenLocked),
                      highestPrice: isLong ? Math.max(localPos.highestPrice || remotePos.entryPrice, remotePos.highestPrice || remotePos.entryPrice) : localPos.highestPrice,
                      lowestPrice: !isLong ? Math.min(localPos.lowestPrice || remotePos.entryPrice, remotePos.lowestPrice || remotePos.entryPrice) : localPos.lowestPrice,
                      sl: bestSl,
                      tp: localDca > remoteDca ? localPos.tp : (localPos.tp ?? remotePos.tp)
                    };
                  }
                  return remotePos;
                });

                if (
                  prevSafe.length === merged.length &&
                  prevSafe.every((p, i) => p.id === merged[i]?.id && p.amount === merged[i]?.amount && p.entryPrice === merged[i]?.entryPrice && p.sl === merged[i]?.sl && p.tp === merged[i]?.tp && p.trailingTier === merged[i]?.trailingTier && p.partialCloseCount === merged[i]?.partialCloseCount)
                ) {
                  return prev;
                }
                localStorage.setItem('trade_positions', JSON.stringify(merged));
                return merged;
              });
            }
            if (data.bots !== undefined) {
              const sanitized = sanitizeBots(Array.isArray(data.bots) ? data.bots : []);
              setBots(prev => {
                const prevSafe = Array.isArray(prev) ? prev : [];
                if (
                  prevSafe.length === sanitized.length &&
                  prevSafe.every((b, i) => b.id === sanitized[i]?.id && b.status === sanitized[i]?.status && b.capital === sanitized[i]?.capital)
                ) {
                  return prev;
                }
                localStorage.setItem('trade_bots', JSON.stringify(sanitized));
                return sanitized;
              });
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
            if (data.notificationSettings !== undefined) {
              localStorage.setItem('algo_trade_notification_settings', JSON.stringify(data.notificationSettings));
            }
            
            setTimeout(() => {
              isIncomingSync.current = false;
            }, 300);
          }
        },
        () => {
          // Graceful silent fallback if Firestore is unreachable
        }
      );
    } catch (_) {
      // Graceful fallback
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('position_closed', handlePositionClosed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const botsRef = useRef(bots);
  const activePositionsRef = useRef(activePositions);
  const balanceRef = useRef(balance);

  useEffect(() => {
    botsRef.current = Array.isArray(bots) ? bots : [];
    activePositionsRef.current = Array.isArray(activePositions) ? activePositions : [];
    closedPositionsRef.current = Array.isArray(closedPositions) ? closedPositions : [];
    balanceRef.current = balance;
  }, [bots, activePositions, closedPositions, balance]);

  // 3. Immediate local persistence + Debounced Firestore remote save
  useEffect(() => {
    if (!isInitialized.current) return;

    // A. Immediate Synchronous LocalStorage Save (0ms)
    try {
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
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }

    if (isIncomingSync.current) return;

    // B. Debounced Firestore Remote Save
    const timer = setTimeout(() => {
      try {
        let parsedNotif: any = undefined;
        try {
          const storedNotif = localStorage.getItem('algo_trade_notification_settings');
          if (storedNotif) parsedNotif = JSON.parse(storedNotif);
        } catch (_) {}

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
          notificationSettings: parsedNotif
        };

        const currentStateHash = JSON.stringify(currentStateObj);
        if (currentStateHash !== lastStateHashRef.current) {
          lastStateHashRef.current = currentStateHash;
          saveFullState(currentStateObj);
        }
      } catch (e) {
        console.warn("Firestore sync error:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [tradingMode, balance, reserveVault, reserveVaultSol, activePositions, closedPositions, bots, transactions, botLearnings, botLogs]);

  const resetDemoData = () => {
    setBalance(10000);
    setReserveVault(0);
    setActivePositions(prev => (Array.isArray(prev) ? prev : []).filter(p => isRealOnChainPosition(p)));
    setClosedPositions(prev => (Array.isArray(prev) ? prev : []).filter(c => isRealOnChainPosition(c)));
    setBots(prev => (Array.isArray(prev) ? prev : []).filter(b => b.mode === 'REAL'));
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
