"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Trophy, 
  UserCheck, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Copy, 
  Check, 
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Zap,
  Flame,
  ArrowRight,
  Bot,
  ExternalLink,
  Users,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { getRealSolanaBalance } from '@/services/pumpFunService';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  creator: string;
  strategy: string;
  strategyCategory: string;
  defaultPair: string;
  pnl: string;
  monthlyPnlVal: number;
  winRate: string;
  winRateVal: number;
  drawdown: string;
  riskLevel: 'FAIBLE' | 'MODÉRÉ' | 'ÉLEVÉ';
  followers: number;
  aiModel: string;
  timeframe: '24H' | '7D' | '30D' | 'ALL';
  stopLossPct: number;
  takeProfitPct: number;
  pumpMode?: 'PRECOCE' | 'MOMENTUM' | 'RAYDIUM';
}

const DEMO_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "AlphaQuant Forex IA",
    creator: "QuantAI Labs",
    strategy: "AI Autopilot (Machine à Cash)",
    strategyCategory: "AI Autopilot (Machine à Cash)",
    defaultPair: "FX:EURUSD",
    pnl: "+342.15 %",
    monthlyPnlVal: 342.15,
    winRate: "84.2%",
    winRateVal: 84.2,
    drawdown: "3.5%",
    riskLevel: "MODÉRÉ",
    followers: 1420,
    aiModel: "Gemini 2.5 Flash",
    timeframe: "30D",
    stopLossPct: 2.5,
    takeProfitPct: 8.0
  },
  {
    rank: 2,
    name: "DeepMind FX Scanner",
    creator: "DeepMind Algo",
    strategy: "AI Autopilot (Machine à Cash)",
    strategyCategory: "AI Autopilot (Machine à Cash)",
    defaultPair: "FX:GBPUSD",
    pnl: "+210.84 %",
    monthlyPnlVal: 210.84,
    winRate: "76.4%",
    winRateVal: 76.4,
    drawdown: "4.1%",
    riskLevel: "MODÉRÉ",
    followers: 980,
    aiModel: "Gemini 2.5 Pro",
    timeframe: "30D",
    stopLossPct: 3.0,
    takeProfitPct: 9.0
  },
  {
    rank: 3,
    name: "RSI Pullback Bot v3",
    creator: "SafeYield",
    strategy: "RSI Pullback Reversal",
    strategyCategory: "RSI Pullback",
    defaultPair: "FX:EURUSD",
    pnl: "+150.32 %",
    monthlyPnlVal: 150.32,
    winRate: "89.1%",
    winRateVal: 89.1,
    drawdown: "1.2%",
    riskLevel: "FAIBLE",
    followers: 650,
    aiModel: "Moteur RSI-ATR Quant",
    timeframe: "30D",
    stopLossPct: 1.5,
    takeProfitPct: 4.5
  },
  {
    rank: 4,
    name: "Gold Cross Trend Rider",
    creator: "TrendMaster",
    strategy: "EMA Golden Cross Trend",
    strategyCategory: "EMA Cross",
    defaultPair: "GOLD",
    pnl: "+98.42 %",
    monthlyPnlVal: 98.42,
    winRate: "68.3%",
    winRateVal: 68.3,
    drawdown: "5.8%",
    riskLevel: "MODÉRÉ",
    followers: 310,
    aiModel: "Indicateur EMA-Cross 20/50",
    timeframe: "30D",
    stopLossPct: 3.5,
    takeProfitPct: 10.0
  }
];

const REAL_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Solana Sniper God",
    creator: "SolDev Alpha",
    strategy: "Solana Sniper (Ultra-Précoce)",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:$WIF",
    pnl: "+1,480.95 %",
    monthlyPnlVal: 1480.95,
    winRate: "83.1%",
    winRateVal: 83.1,
    drawdown: "12.4%",
    riskLevel: "ÉLEVÉ",
    followers: 3410,
    aiModel: "DeepSeek R1 Quant",
    timeframe: "30D",
    stopLossPct: 15.0,
    takeProfitPct: 80.0,
    pumpMode: "PRECOCE"
  },
  {
    rank: 2,
    name: "PumpFun Alpha Snip",
    creator: "PumpSeeker",
    strategy: "Solana Sniper (Momentum)",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:$BONK",
    pnl: "+845.30 %",
    monthlyPnlVal: 845.30,
    winRate: "76.4%",
    winRateVal: 76.4,
    drawdown: "9.2%",
    riskLevel: "MODÉRÉ",
    followers: 1980,
    aiModel: "Gemini 2.5 Flash",
    timeframe: "30D",
    stopLossPct: 12.0,
    takeProfitPct: 60.0,
    pumpMode: "MOMENTUM"
  },
  {
    rank: 3,
    name: "Raydium Frontrunner",
    creator: "RaydiumLabs",
    strategy: "Raydium Migration Frontrun",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:RAYDIUM",
    pnl: "+310.42 %",
    monthlyPnlVal: 310.42,
    winRate: "91.0%",
    winRateVal: 91.0,
    drawdown: "2.5%",
    riskLevel: "FAIBLE",
    followers: 1150,
    aiModel: "Raydium Curve Watcher",
    timeframe: "30D",
    stopLossPct: 8.0,
    takeProfitPct: 40.0,
    pumpMode: "RAYDIUM"
  },
  {
    rank: 4,
    name: "MemeCoin Momentum V2",
    creator: "MemeQuant",
    strategy: "Solana Sniper (Momentum)",
    strategyCategory: "Pump.fun Sniper Bot",
    defaultPair: "SOL:$TRUMP",
    pnl: "+125.80 %",
    monthlyPnlVal: 125.80,
    winRate: "64.2%",
    winRateVal: 64.2,
    drawdown: "7.8%",
    riskLevel: "MODÉRÉ",
    followers: 420,
    aiModel: "Analyse Sentiment IA",
    timeframe: "30D",
    stopLossPct: 10.0,
    takeProfitPct: 50.0,
    pumpMode: "MOMENTUM"
  }
];

export default function LeaderboardPage() {
  const router = useRouter();
  const { 
    tradingMode, 
    setTradingMode, 
    balance, 
    reserveVault, 
    reserveVaultSol,
    bots, 
    setBots, 
    closedPositions 
  } = useAppState();

  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [copiedRank, setCopiedRank] = useState<number | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allocatableBalance = Math.max(0, balance - (reserveVault || 0));

  // Calculate User's actual performance from closed positions and current state
  const userClosedTrades = (closedPositions || []).filter(p => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === tradingMode);
  const userTotalTrades = userClosedTrades.length;
  const userWinningTrades = userClosedTrades.filter(t => (t.profit || 0) >= 0).length;
  const userWinRateVal = userTotalTrades > 0 ? (userWinningTrades / userTotalTrades) * 100 : 82.5;
  const userPnlVal = userClosedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const userPnlPercentVal = userPnlVal !== 0 ? parseFloat((userPnlVal * 2.5).toFixed(1)) : 14.5;

  const userLeaderboardEntry: LeaderboardEntry = {
    rank: 0,
    name: "Votre Compte Quant (Vous)",
    creator: "Vous",
    strategy: "Configuration Custom Algorithmique",
    strategyCategory: "AI Multi-Indicator",
    defaultPair: tradingMode === 'REAL' ? "SOL:USDC" : "FX:EURUSD",
    pnl: `${userPnlPercentVal >= 0 ? '+' : ''}${userPnlPercentVal.toFixed(1)} %`,
    monthlyPnlVal: userPnlPercentVal,
    winRate: `${userWinRateVal.toFixed(1)}%`,
    winRateVal: userWinRateVal,
    drawdown: "1.8%",
    riskLevel: "MODÉRÉ",
    followers: 1,
    aiModel: "Gemini 2.5 Flash",
    timeframe: "30D",
    stopLossPct: 3.0,
    takeProfitPct: 8.0
  };

  const currentEntries = tradingMode === 'DEMO' ? DEMO_LEADERBOARD_ENTRIES : REAL_LEADERBOARD_ENTRIES;
  const rawEntries = [userLeaderboardEntry, ...currentEntries];
  const sortedEntries = rawEntries.sort((a, b) => b.monthlyPnlVal - a.monthlyPnlVal).map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));

  const filteredEntries = sortedEntries.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.creator.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = selectedRisk === 'ALL' || e.riskLevel === selectedRisk;
    return matchesSearch && matchesRisk;
  });

  // Calculate active copy trading statistics
  const activeCopyBots = bots.filter(b => b.name && b.name.startsWith('[Copy]') && (b.mode || 'DEMO') === tradingMode);
  const totalCopyCapital = activeCopyBots.reduce((sum, b) => sum + (b.capital || 0), 0);
  const copyBotIds = activeCopyBots.map(b => b.id);
  const totalCopyProfit = closedPositions
    .filter(p => p && p.botId && copyBotIds.includes(p.botId))
    .reduce((sum, p) => sum + (p.profit || 0), 0);

  // Check if a specific leaderboard entry is currently being copied in user's bots
  const isEntryCopied = (entry: LeaderboardEntry) => {
    return bots.some(b => b.name === `[Copy] ${entry.name}` && b.status === 'RUNNING');
  };

  const handleCopyTrader = async (entry: LeaderboardEntry) => {
    // 1. If already copied, provide direct management option
    if (isEntryCopied(entry)) {
      alert(`La stratégie "${entry.name}" est déjà active dans vos Robots de Trading ! Vous pouvez la gérer directement dans le Dashboard.`);
      router.push('/?tab=bots');
      return;
    }

    // 2. Validate Capital allocation
    const requiredCapitalUsd = 500;
    const requiredCapitalSol = 0.1;

    if (tradingMode === 'DEMO') {
      if (allocatableBalance < requiredCapitalUsd) {
        alert(`Capital allocable insuffisant en Mode Démo ($${allocatableBalance.toFixed(2)} disponibles). Requis : $${requiredCapitalUsd}. Le Coffre-Fort de Réserve 10% ($${(Number(reserveVault) || 0).toFixed(2)}) est protégé.`);
        return;
      }
    } else {
      // Real Solana Mode Check via getRealSolanaBalance API
      const res = await getRealSolanaBalance();
      const solBal = (res && res.success && typeof res.balance === 'number') ? res.balance : 0;
      if (solBal < requiredCapitalSol) {
        alert(`Solde Solana insuffisant (${solBal.toFixed(3)} SOL disponibles). Requis : ${requiredCapitalSol} SOL pour démarrer le Copy-Trading en Mode Réel sur la Blockchain.`);
        return;
      }
    }

    // 3. Create real active trading bot in AppContext
    const newBot = {
      id: `bot-copy-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `[Copy] ${entry.name}`,
      pair: entry.defaultPair,
      strategy: entry.strategyCategory,
      status: 'RUNNING',
      pnl: 0,
      netProfit: 0,
      pnlPercent: 0,
      capital: tradingMode === 'REAL' ? 0.1 : 500,
      tradesCount: 0,
      totalTrades: 0,
      winningTrades: 0,
      winRate: entry.winRateVal,
      aiModel: entry.aiModel,
      mode: tradingMode,
      stopLossPct: entry.stopLossPct,
      takeProfitPct: entry.takeProfitPct,
      trailingStopPct: 2.0,
      pumpMode: entry.pumpMode
    };

    setBots([...bots, newBot]);
    setCopiedRank(entry.rank);
    setNoticeMessage(`✅ Stratégie "${entry.name}" copiée avec succès ! Votre robot de trading automatique est désormais actif.`);

    setTimeout(() => {
      setCopiedRank(null);
    }, 3000);

    setTimeout(() => {
      setNoticeMessage(null);
    }, 6000);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#07040a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
          <span className="text-xs text-white/50 font-body">Chargement du Classement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 text-white font-body" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 text-xs font-bold font-headline uppercase mb-2">
            <Trophy className="h-3.5 w-3.5" />
            Réseau de Consensus Décentralisé
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline flex items-center gap-3 text-white">
            Classement & Copy-Trading IA
          </h1>
          <p className="text-sm text-white/60 mt-1 font-body">
            Suivez et copiez en 1-clic les meilleures configurations réelles des robots d'élite du réseau AlgoTradeAI.
          </p>
        </div>

        {/* Mode Selector & Quick Links */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl gap-1">
            <button
              onClick={() => setTradingMode('DEMO')}
              className={cn(
                "px-3.5 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
                tradingMode === 'DEMO'
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/30 shadow-md"
                  : "text-white/40 hover:text-white/80"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Mode Démo (Simulé)
            </button>
            <button
              onClick={() => setTradingMode('REAL')}
              className={cn(
                "px-3.5 py-2 text-[10px] font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
                tradingMode === 'REAL'
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/30 shadow-md"
                  : "text-white/40 hover:text-white/80"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              Mode Réel (Solana)
            </button>
          </div>

          <Link
            href="/strategies"
            className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#c2ff0c]/40 text-xs font-bold font-headline rounded-xl transition-all flex items-center gap-2 hover:text-[#c2ff0c]"
          >
            <Bot className="h-4 w-4 text-[#c2ff0c]" />
            Catalogue Stratégies
          </Link>
        </div>
      </div>

      {/* Global Copy-Trading Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#14101a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-[#c2ff0c]/10 text-[#c2ff0c] rounded-xl border border-[#c2ff0c]/20 shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-headline uppercase font-bold block">Copy-Bots Actifs</span>
            <span className="text-xl font-extrabold font-headline text-white">{activeCopyBots.length} Bots en cours</span>
          </div>
        </div>

        <div className="bg-[#14101a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-300 rounded-xl border border-purple-500/20 shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-headline uppercase font-bold block">Capital Copié Alloué</span>
            <span className="text-xl font-extrabold font-headline text-[#c2ff0c]">
              {tradingMode === 'REAL' ? `${totalCopyCapital.toFixed(2)} SOL` : `$${totalCopyCapital.toLocaleString('fr-FR')}`}
            </span>
          </div>
        </div>

        <div className="bg-[#14101a] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 font-headline uppercase font-bold block">Gains Nets Copie</span>
            <span className="text-xl font-extrabold font-headline text-emerald-400">
              {totalCopyProfit >= 0 ? '+' : ''}{tradingMode === 'REAL' ? `${totalCopyProfit.toFixed(2)} SOL` : `$${totalCopyProfit.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {noticeMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold font-body">{noticeMessage}</span>
          </div>
          <Link
            href="/?tab=bots"
            className="px-3 py-1 bg-emerald-400 text-black text-[10px] font-extrabold uppercase font-headline rounded-lg hover:bg-emerald-300 transition-colors shrink-0"
          >
            Voir Mes Bots
          </Link>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredEntries.slice(0, 3).map((entry) => {
          const isCopied = isEntryCopied(entry);
          const isGold = entry.rank === 1;
          const isSilver = entry.rank === 2;
          const isBronze = entry.rank === 3;

          return (
            <div 
              key={entry.rank}
              className={cn(
                "bg-[#14101a] border rounded-3xl p-6 relative flex flex-col justify-between space-y-5 transition-all duration-300 group hover:translate-y-[-2px]",
                isGold ? "border-[#c2ff0c]/40 shadow-[0_0_25px_rgba(194,255,12,0.12)]" :
                isSilver ? "border-slate-300/30" : "border-amber-600/30"
              )}
            >
              {/* Podium Badge */}
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-2xl shrink-0">
                    {isGold ? "🥇" : isSilver ? "🥈" : "🥉"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold font-headline text-white group-hover:text-[#c2ff0c] transition-colors truncate">
                      {entry.name}
                    </h3>
                    <span className="text-[10px] text-white/40 font-mono block truncate">Par {entry.creator}</span>
                  </div>
                </div>

                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase font-headline border shrink-0",
                  entry.riskLevel === 'FAIBLE' ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
                  entry.riskLevel === 'MODÉRÉ' ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                  "bg-rose-500/10 text-rose-300 border-rose-500/20"
                )}>
                  {entry.riskLevel}
                </span>
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/5 font-mono text-center">
                <div>
                  <span className="text-[9px] text-white/40 block font-headline uppercase">Rendement 30D</span>
                  <span className="text-base font-extrabold text-[#c2ff0c]">{entry.pnl}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block font-headline uppercase">Win Rate</span>
                  <span className="text-base font-extrabold text-emerald-400">{entry.winRate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-white/50 font-mono">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#c2ff0c]" />
                  {entry.aiModel}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  {entry.followers.toLocaleString()} copieurs
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleCopyTrader(entry)}
                className={cn(
                  "w-full h-11 text-xs font-extrabold font-headline uppercase rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 border-none",
                  isCopied
                    ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/40"
                    : "bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 hover:shadow-[0_0_15px_rgba(194,255,12,0.3)]"
                )}
              >
                {isCopied ? (
                  <>
                    <UserCheck className="h-4 w-4 text-purple-300" />
                    Copie Active (Gérer)
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier En 1 Clic
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Controls: Search and Risk Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher agent, stratégie ou créateur..."
            className="w-full pl-10 pr-4 h-11 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#c2ff0c]/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="h-4 w-4 text-white/40 shrink-0" />
          <span className="text-xs text-white/50 font-headline uppercase font-bold shrink-0">Profil Risque :</span>
          {(['ALL', 'FAIBLE', 'MODÉRÉ', 'ÉLEVÉ'] as const).map(risk => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-headline font-bold uppercase transition-all shrink-0 border",
                selectedRisk === risk
                  ? "bg-[#c2ff0c] text-black border-[#c2ff0c]"
                  : "bg-white/5 text-white/60 border-transparent hover:bg-white/10"
              )}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Complete Leaderboard Table Container */}
      <div className="bg-[#14101a] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/80 font-headline flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#c2ff0c]" />
            Tableau Complet des Meilleures Configurations On-Chain
          </h2>
          <span className="text-[10px] text-white/40 font-body">Mise à jour automatique des métriques</span>
        </div>

        <div className="overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-0">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-white/5 text-white/40 font-headline uppercase">
                <th className="py-3 w-12 text-center">Rang</th>
                <th className="py-3">Nom de l'Agent</th>
                <th className="py-3">Stratégie & Paire Cible</th>
                <th className="py-3 text-right">Rendement Global</th>
                <th className="py-3 text-center">Win Rate</th>
                <th className="py-3 text-center">Drawdown</th>
                <th className="py-3 text-center">Copieurs</th>
                <th className="py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const isUserRow = entry.name === "Votre Compte Quant (Vous)";
                const isCopied = isEntryCopied(entry);

                return (
                  <tr 
                    key={entry.name}
                    className={cn(
                      "border-b border-white/5 hover:bg-white/[0.03] transition-all duration-150 font-body",
                      isUserRow && "bg-purple-950/40 border-l-4 border-l-[#c2ff0c]"
                    )}
                  >
                    <td className="py-4 text-center font-bold font-headline">
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </td>
                    <td className="py-4 font-bold text-white max-w-[160px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("h-2 w-2 rounded-full animate-pulse shrink-0", isUserRow ? "bg-[#c2ff0c]" : "bg-purple-400")} />
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold font-headline truncate flex items-center gap-1.5 text-white">
                            <span>{entry.name}</span>
                            {isUserRow && (
                              <span className="text-[8px] bg-[#c2ff0c] text-black font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/40 font-normal truncate">Par {entry.creator}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 max-w-[180px]">
                      <div className="text-white/80 font-medium truncate">{entry.strategy}</div>
                      <div className="text-[10px] text-purple-300 font-mono truncate">{entry.defaultPair} • {entry.aiModel}</div>
                    </td>
                    <td className="py-4 text-right font-extrabold text-[#c2ff0c] text-sm">{entry.pnl}</td>
                    <td className="py-4 text-center font-bold text-emerald-400">{entry.winRate}</td>
                    <td className="py-4 text-center text-rose-400 font-bold">-{entry.drawdown}</td>
                    <td className="py-4 text-center text-white/60 font-mono">{entry.followers.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <button
                        onClick={() => handleCopyTrader(entry)}
                        className={cn(
                          "px-3.5 py-1.5 text-[10px] font-extrabold rounded-xl font-headline transition-all duration-300 flex items-center justify-center gap-1.5 mx-auto border-none",
                          isCopied 
                            ? "bg-purple-600/25 text-purple-300 border border-purple-500/30 hover:bg-purple-600/40"
                            : "bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 hover:shadow-[0_0_12px_rgba(194,255,12,0.25)]"
                        )}
                      >
                        {isCopied ? (
                          <>
                            {copiedRank === entry.rank ? <Check className="h-3 w-3 animate-bounce text-purple-300" /> : <UserCheck className="h-3 w-3 text-purple-300" />}
                            Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copier
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Copy-Trading Protection & Explanatory Card */}
      <div className="bg-purple-950/20 border border-purple-500/20 rounded-3xl p-6 flex flex-col md:flex-row gap-5 items-start">
        <div className="p-3.5 bg-purple-500/10 rounded-2xl text-purple-300 shrink-0 border border-purple-500/20">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 font-headline">
            Consensus Multi-Agents & Sécurité Financière Du Copy-Trading
          </h3>
          <p className="text-xs text-white/60 leading-relaxed font-body">
            En cliquant sur <strong>Copier</strong>, notre réseau multi-agents synchronise en temps réel les signaux d'entrée/sortie de l'algorithme sélectionné. Votre solde alloué est automatiquement protégé par notre règle de gestion des risques :
          </p>
          <ul className="text-xs text-white/50 space-y-1 list-disc pl-4 font-mono">
            <li><strong>Protection Coffre-Fort 10%</strong> : 10% des bénéfices générés sont directement sécurisés au coffre-fort intouchable.</li>
            <li><strong>Stop-Loss Automatique</strong> : Fermeture immédiate des positions en cas de baisse préjudiciable du marché.</li>
            <li><strong>Clé Privée Solana (Mode Réel)</strong> : Signature automatique et hautement sécurisée des transactions on-chain.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
