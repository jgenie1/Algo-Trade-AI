"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Sparkles, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import LeaderboardTable from '@/components/trading/LeaderboardTable';
import {
  LeaderboardEntry,
  DEMO_LEADERBOARD_ENTRIES,
  REAL_LEADERBOARD_ENTRIES
} from '@/data/leaderboardEntries';

export default function LeaderboardPage() {
  const router = useRouter();
  const { tradingMode, setTradingMode, balance, reserveVault, bots, setBots, closedPositions } = useAppState();

  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [copiedRank, setCopiedRank] = useState<number | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userClosedTrades = (closedPositions || []).filter(
    (p) => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === tradingMode
  );
  const userTotalTrades = userClosedTrades.length;
  const userWinningTrades = userClosedTrades.filter((t) => (t.profit || 0) >= 0).length;
  const userWinRateVal = userTotalTrades > 0 ? (userWinningTrades / userTotalTrades) * 100 : 82.5;
  const userPnlVal = userClosedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const userPnlPercentVal = userPnlVal !== 0 ? parseFloat((userPnlVal * 2.5).toFixed(1)) : 14.5;

  const userLeaderboardEntry: LeaderboardEntry = {
    rank: 0,
    name: "Votre Compte Quant (Vous)",
    creator: "Vous-même",
    strategy: tradingMode === 'REAL' ? "Sniper & Trading Réel On-Chain" : "Trading Algorithmique Simulée",
    strategyCategory: tradingMode === 'REAL' ? "Sniper On-Chain" : "Machine à Cash AI",
    defaultPair: tradingMode === 'REAL' ? "SOL:$WIF" : "FX:EURUSD",
    pnl: `${userPnlPercentVal >= 0 ? '+' : ''}${userPnlPercentVal} %`,
    monthlyPnlVal: userPnlPercentVal,
    winRate: `${userWinRateVal.toFixed(1)}%`,
    winRateVal: userWinRateVal,
    drawdown: "1.8%",
    riskLevel: "MODÉRÉ",
    followers: 1,
    aiModel: "Moteur IA Intégré",
    timeframe: "30D",
    stopLossPct: 3.0,
    takeProfitPct: 10.0
  };

  const rawEntries = tradingMode === 'REAL' ? REAL_LEADERBOARD_ENTRIES : DEMO_LEADERBOARD_ENTRIES;

  const filteredEntries = rawEntries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.creator.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = selectedRisk === 'ALL' || entry.riskLevel === selectedRisk;
    return matchesSearch && matchesRisk;
  });

  const handleCopyStrategy = (entry: LeaderboardEntry) => {
    const defaultCapital = tradingMode === 'REAL' ? 0.5 : 1000;
    const isSolanaMeme = entry.defaultPair.startsWith('SOL:');

    const newBot = {
      id: `bot_copy_${Date.now()}_${entry.rank}`,
      name: `${entry.name} (Copy)`,
      pair: entry.defaultPair,
      timeframe: '15',
      strategy: entry.strategyCategory as any,
      allocatedCapital: defaultCapital,
      capital: defaultCapital,
      accumulatedProfit: 0,
      active: true,
      stopLoss: entry.stopLossPct,
      takeProfit: entry.takeProfitPct,
      riskLevel: entry.riskLevel,
      aiModel: entry.aiModel,
      isCopyTrading: true,
      copiedTraderName: entry.name,
      mode: tradingMode,
      pumpMode: entry.pumpMode
    };

    setBots([...bots, newBot as any]);
    setCopiedRank(entry.rank);
    setNoticeMessage(`Félicitations ! La stratégie "${entry.name}" a été automatiquement copiée et votre robot est déjà actif.`);

    setTimeout(() => {
      setNoticeMessage(null);
      setCopiedRank(null);
      router.push('/');
    }, 2500);
  };

  return (
    <div className="space-y-6 pb-12 text-white">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-400" />
            <h1 className="text-3xl font-black tracking-tight font-headline text-white">
              Classement & Copy-Trading
            </h1>
          </div>
          <p className="text-sm text-slate-300 font-medium mt-1 font-body">
            Copiez en 1-Click les meilleurs robots de trading algorithmique et traders autonomes.
          </p>
        </div>
      </div>

      {noticeMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-3 animate-in fade-in">
          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#140f1d] border border-white/10 p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un robot ou créateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-body text-white placeholder:text-slate-500 focus:outline-none focus:border-[#c2ff0c]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["ALL", "FAIBLE", "MODÉRÉ", "ÉLEVÉ"].map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-headline font-extrabold uppercase transition-all duration-200",
                selectedRisk === risk
                  ? "bg-[#c2ff0c] text-black"
                  : "bg-white/5 text-slate-400 hover:text-white"
              )}
            >
              {risk === 'ALL' ? 'Tous Risques' : risk}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table Component */}
      <LeaderboardTable
        entries={filteredEntries}
        userEntry={userLeaderboardEntry}
        copiedRank={copiedRank}
        onCopyStrategy={handleCopyStrategy}
        tradingMode={tradingMode}
      />
    </div>
  );
}
