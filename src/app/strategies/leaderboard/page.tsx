"use client";

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  UserCheck, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Copy, 
  Check, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHead 
} from '@/components/ui/table';

import { useAppState } from '@/context/AppContext';

interface LeaderboardEntry {
  rank: number;
  name: string;
  strategy: string;
  pnl: string;
  winRate: string;
  followers: number;
  isCopied: boolean;
}

export default function LeaderboardPage() {
  const { tradingMode, setTradingMode } = useAppState();
  const [isMounted, setIsMounted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Populate simulated rankings based on active mode
  useEffect(() => {
    if (!isMounted) return;
    const entries: LeaderboardEntry[] = tradingMode === 'DEMO' ? [
      {
        rank: 1,
        name: "AlphaQuant Forex IA",
        strategy: "AI Autopilot (Machine à Cash)",
        pnl: "+342.15 %",
        winRate: "79.2%",
        followers: 1205,
        isCopied: false
      },
      {
        rank: 2,
        name: "DeepMind FX Scanner",
        strategy: "AI Autopilot (Machine à Cash)",
        pnl: "+210.84 %",
        winRate: "72.4%",
        followers: 840,
        isCopied: false
      },
      {
        rank: 3,
        name: "RSI Pullback Bot v3",
        strategy: "RSI Pullback Reversal",
        pnl: "+150.32 %",
        winRate: "68.1%",
        followers: 430,
        isCopied: false
      },
      {
        rank: 4,
        name: "Gold Cross Follower",
        strategy: "EMA Golden Cross Trend",
        pnl: "+98.42 %",
        winRate: "59.3%",
        followers: 195,
        isCopied: false
      }
    ] : [
      {
        rank: 1,
        name: "Solana Sniper God",
        strategy: "Solana Sniper (Ultra-Précoce)",
        pnl: "+1,480.95 %",
        winRate: "83.1%",
        followers: 3410,
        isCopied: false
      },
      {
        rank: 2,
        name: "PumpFun Alpha Snip",
        strategy: "Solana Sniper (Momentum)",
        pnl: "+845.30 %",
        winRate: "76.4%",
        followers: 1980,
        isCopied: false
      },
      {
        rank: 3,
        name: "Raydium Frontrunner",
        strategy: "Raydium Migration Frontrun",
        pnl: "+310.42 %",
        winRate: "69.0%",
        followers: 850,
        isCopied: false
      },
      {
        rank: 4,
        name: "MemeCoin Momentum",
        strategy: "Solana Sniper (Momentum)",
        pnl: "+125.80 %",
        winRate: "61.2%",
        followers: 320,
        isCopied: false
      }
    ];
    setLeaderboard(entries);
  }, [tradingMode, isMounted]);

  const handleCopyTrader = (rank: number) => {
    setLeaderboard(prev => prev.map(entry => {
      if (entry.rank === rank) {
        const nextState = !entry.isCopied;
        if (nextState) {
          setCopiedId(rank);
          setTimeout(() => setCopiedId(null), 2000);
        }
        return { ...entry, isCopied: nextState };
      }
      return entry;
    }));
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#07040a] flex items-center justify-center text-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Trophy className="h-8 w-8 text-[#c2ff0c]" />
            Classement & Copy-Trading
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Suivez et copiez les configurations réelles des meilleurs robots algorithmiques du réseau décentralisé AlgoTradeAI.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setTradingMode('DEMO')}
            className={cn(
              "h-auto px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5 border-none",
              tradingMode === 'DEMO'
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Démo (Simulé)
          </Button>
          <Button
            variant="ghost"
            onClick={() => setTradingMode('REAL')}
            className={cn(
              "h-auto px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5 border-none",
              tradingMode === 'REAL'
                ? "bg-purple-600/25 text-purple-300 border border-purple-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Réel (Solana)
          </Button>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#c2ff0c]" />
            Top configurations
          </h2>
          <span className="text-[10px] text-white/40 font-body">Mise à jour toutes les 24h</span>
        </div>

        <div className="rounded-md border border-white/5 overflow-hidden">
          <Table>
            <TableHeader className="bg-white/[0.02] border-b border-white/5">
              <TableRow className="border-b border-white/5 hover:bg-transparent">
                <TableHead className="py-2.5 w-12 text-center text-white/40 font-headline">Rang</TableHead>
                <TableHead className="py-2.5 text-white/40 font-headline">Nom de l'Agent</TableHead>
                <TableHead className="py-2.5 text-white/40 font-headline">Stratégie Ciblée</TableHead>
                <TableHead className="py-2.5 text-right text-white/40 font-headline">Rendement global</TableHead>
                <TableHead className="py-2.5 text-center text-white/40 font-headline">Win Rate</TableHead>
                <TableHead className="py-2.5 text-center text-white/40 font-headline">Abonnés</TableHead>
                <TableHead className="py-2.5 text-center text-white/40 font-headline">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry) => {
                return (
                  <TableRow 
                    key={entry.rank}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-all duration-150"
                  >
                    <TableCell className="py-3.5 text-center font-bold font-headline border-none">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </TableCell>
                    <TableCell className="py-3.5 font-bold text-white flex items-center gap-2 border-none">
                      <span className="h-2 w-2 rounded-full bg-[#c2ff0c] animate-pulse" />
                      {entry.name}
                    </TableCell>
                    <TableCell className="py-3.5 text-white/60 border-none">{entry.strategy}</TableCell>
                    <TableCell className="py-3.5 text-right font-extrabold text-[#c2ff0c] border-none">{entry.pnl}</TableCell>
                    <TableCell className="py-3.5 text-center font-bold text-emerald-400 border-none">{entry.winRate}</TableCell>
                    <TableCell className="py-3.5 text-center text-white/50 border-none">{entry.followers.toLocaleString()}</TableCell>
                    <TableCell className="py-3.5 text-center border-none">
                      <Button
                        onClick={() => handleCopyTrader(entry.rank)}
                        className={cn(
                          "px-3 py-1 text-[10px] font-bold rounded-lg font-headline transition-all duration-300 flex items-center justify-center gap-1.5 mx-auto border-none",
                          entry.isCopied 
                            ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                            : "bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 hover:shadow-[0_0_10px_rgba(194,255,12,0.25)]"
                        )}
                      >
                        {entry.isCopied ? (
                          <>
                            {copiedId === entry.rank ? <Check className="h-3 w-3 animate-bounce" /> : <UserCheck className="h-3 w-3" />}
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copier
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Copy-Trading Warning Card */}
      <div className="bg-purple-950/15 border border-purple-500/15 rounded-2xl p-6 flex gap-4 items-start">
        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-300 shrink-0 border border-purple-500/20">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 font-headline">Comment fonctionne le Copy-Trading ?</h3>
          <p className="text-xs text-white/50 leading-relaxed font-body">
            En cliquant sur <strong>Copier</strong>, notre système de consensus multi-agents calquera automatiquement les ordres de l'algorithme choisi en direct. En Mode Réel, les ordres d'achat et de vente seront signés en arrière-plan par votre clé privée principale sur Solana. Veillez à dimensionner convenablement le capital maximum de copy-trading.
          </p>
        </div>
      </div>
    </div>
  );
}
