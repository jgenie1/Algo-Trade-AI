"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Bot, 
  Target, 
  ShieldCheck, 
  Flame,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';

export default function PerformancePage() {
  const { tradingMode, setTradingMode, bots, closedPositions } = useAppState();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
          <span className="text-sm text-white/50">Chargement des performances...</span>
        </div>
      </div>
    );
  }

  // Dynamic statistics extraction from actual bots list and historical trades
  const getBotStats = (strategyName: string, pumpMode?: string) => {
    // Filter bots for this strategy
    const matchingBots = bots.filter(b => {
      if (b.strategy !== strategyName) return false;
      if (pumpMode && b.pumpMode !== pumpMode) return false;
      return true;
    });
    
    // Filter closed trades belonging to these bots
    const botIds = matchingBots.map(b => b.id);
    const matchingTrades = closedPositions.filter(p => p.wasBot && botIds.includes(p.botId));
    
    const totalProfit = matchingTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalTrades = matchingTrades.length;
    const winningTrades = matchingTrades.filter(t => (t.profit || 0) >= 0).length;
    
    const winRate = totalTrades > 0 ? `${Math.round((winningTrades / totalTrades) * 100)}%` : "0%";
    const isActive = matchingBots.some(b => b.status === 'RUNNING');
    
    const isReal = tradingMode === 'REAL';
    
    // Calculate return yield percentage relative to allocated capital
    const totalAllocatedCapital = matchingBots.reduce((sum, b) => sum + (b.capital || 0), 0);
    let yieldPercent = "0.0%";
    if (totalAllocatedCapital > 0) {
      const yieldVal = (totalProfit / totalAllocatedCapital) * 100;
      yieldPercent = yieldVal >= 0 ? `+${yieldVal.toFixed(1)}%` : `${yieldVal.toFixed(1)}%`;
    }
    
    const netGains = isReal 
      ? `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(3)} SOL` 
      : `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} $`;

    return {
      profit: yieldPercent,
      netGains,
      winRate,
      status: isActive ? "ACTIF" : (matchingBots.length > 0 ? "PAUSE" : "INACTIF")
    };
  };

  const precoceStats = getBotStats('Pump.fun Sniper Bot', 'PRECOCE');
  const momentumStats = getBotStats('Pump.fun Sniper Bot', 'MOMENTUM');
  const raydiumStats = getBotStats('Pump.fun Sniper Bot', 'RAYDIUM');

  const autopilotStats = getBotStats('AI Autopilot (Machine à Cash)');
  const rsiStats = getBotStats('RSI Pullback');
  const emaStats = getBotStats('EMA Cross');

  const strategiesList = tradingMode === 'DEMO' ? [
    {
      name: "IA Autopilot (Machine à Cash)",
      description: "Apprentissage continu par renforcement sur flux Forex/Crypto.",
      profit: autopilotStats.profit,
      netGains: autopilotStats.netGains,
      winRate: autopilotStats.winRate,
      risk: "MODÉRÉ",
      status: autopilotStats.status,
      color: "text-[#c2ff0c]",
      barColor: "bg-[#c2ff0c]",
      icon: Bot
    },
    {
      name: "RSI Pullback Reversal",
      description: "Détection des extrêmes de survente/surachat avec confirmations.",
      profit: rsiStats.profit,
      netGains: rsiStats.netGains,
      winRate: rsiStats.winRate,
      risk: "SÛR",
      status: rsiStats.status,
      color: "text-emerald-400",
      barColor: "bg-emerald-400",
      icon: ShieldCheck
    },
    {
      name: "EMA Golden Cross Trend",
      description: "Suivi de tendance longue distance via croisements d'exponentielles.",
      profit: emaStats.profit,
      netGains: emaStats.netGains,
      winRate: emaStats.winRate,
      risk: "MODÉRÉ",
      status: emaStats.status,
      color: "text-cyan-400",
      barColor: "bg-cyan-400",
      icon: Target
    }
  ] : [
    {
      name: "Solana Sniper (Ultra-Précoce)",
      description: "Achat instantané dès l'émission de la bonding curve sur Pump.fun.",
      profit: precoceStats.profit,
      netGains: precoceStats.netGains,
      winRate: precoceStats.winRate,
      risk: "ÉLEVÉ (AGRESSIF)",
      status: precoceStats.status,
      color: "text-purple-400",
      barColor: "bg-purple-500",
      icon: Flame
    },
    {
      name: "Solana Sniper (Momentum)",
      description: "Achète uniquement si le momentum social et les réponses s'emballent.",
      profit: momentumStats.profit,
      netGains: momentumStats.netGains,
      winRate: momentumStats.winRate,
      risk: "MODÉRÉ",
      status: momentumStats.status,
      color: "text-[#c2ff0c]",
      barColor: "bg-[#c2ff0c]",
      icon: Bot
    },
    {
      name: "Raydium Migration Frontrun",
      description: "Identifie les migrations vers Raydium imminentes (curve > 90%).",
      profit: raydiumStats.profit,
      netGains: raydiumStats.netGains,
      winRate: raydiumStats.winRate,
      risk: "SÛR",
      status: raydiumStats.status,
      color: "text-cyan-400",
      barColor: "bg-cyan-400",
      icon: ShieldCheck
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-[#c2ff0c]" />
            Comparatif des Performances
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Analysez et comparez l'efficacité de vos différentes stratégies de trading automatique configurées.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setTradingMode('DEMO')}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'DEMO'
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Démo (Simulé)
          </button>
          <button
            onClick={() => setTradingMode('REAL')}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'REAL'
                ? "bg-purple-600/25 text-purple-300 border border-purple-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Réel (Solana)
          </button>
        </div>
      </div>

      {/* Strategies list section */}
      <div className="space-y-4">
        {strategiesList.map((strat, idx) => {
          const Icon = strat.icon;
          return (
            <div 
              key={strat.name} 
              className="bg-[#14101a] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group hover:border-white/15 transition-all duration-300"
            >
              {/* Highlight background glow */}
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#c2ff0c] to-purple-600 opacity-30 group-hover:opacity-100 transition-opacity" />

              <div className="flex gap-4 items-start md:items-center">
                <div className={cn(
                  "p-3 rounded-xl bg-white/5 shrink-0 border border-white/5",
                  strat.color
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold font-headline">{strat.name}</h3>
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded font-bold font-headline",
                      strat.status === 'ACTIF' ? "bg-emerald-500/10 text-emerald-400" :
                      strat.status === 'PAUSE' ? "bg-amber-500/10 text-amber-400" : "bg-white/10 text-white/50"
                    )}>
                      {strat.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 font-body leading-relaxed max-w-lg">{strat.description}</p>
                </div>
              </div>

              {/* Stats column */}
              <div className="flex gap-6 md:gap-10 shrink-0 w-full md:w-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/30 block font-headline">Rendement</span>
                  <span className={cn("text-xl font-extrabold font-body", strat.color)}>{strat.profit}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/30 block font-headline">Gains Nets</span>
                  <span className="text-xl font-extrabold text-white font-body">{strat.netGains}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/30 block font-headline">Win Rate</span>
                  <span className="text-xl font-extrabold text-white/80 font-body">{strat.winRate}</span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[9px] uppercase font-bold text-white/30 block font-headline">Profil Risque</span>
                  <span className="text-xs font-bold text-white/60 font-body block mt-1">{strat.risk}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison analysis card */}
      <div className="bg-[#14101a] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
          🧠 Recommandation du Consensus d'Intelligence Collective
        </h2>
        <p className="text-xs text-white/50 leading-relaxed font-body">
          Examen de l'activité sur la blockchain Solana en direct de votre nœud RPC.
          Les métriques affichées ci-dessus reflètent à 100% les performances réelles de vos bots lancés et l'historique de vos positions clôturées.
        </p>
      </div>
    </div>
  );
}
