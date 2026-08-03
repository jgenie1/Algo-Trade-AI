"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Bot, ShieldCheck, Target, Flame, RefreshCw } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import PerformanceStrategyCard from '@/components/PerformanceStrategyCard';

export default function PerformancePage() {
  const { tradingMode, setTradingMode, bots, closedPositions } = useAppState();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getBotStats = (strategyName: string, pumpMode?: string) => {
    const matchingBots = bots.filter(b => {
      if (b.strategy !== strategyName) return false;
      if (pumpMode && b.pumpMode !== pumpMode) return false;
      return true;
    });

    const botIds = matchingBots.map(b => b.id);
    const matchingTrades = closedPositions.filter(p => {
      if (!p) return false;
      const tradeMode = p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO');
      if (tradeMode !== tradingMode) return false;
      if (p.botId && botIds.includes(p.botId)) return true;
      if (p.botName && p.botName.toLowerCase().includes(strategyName.toLowerCase())) return true;
      return false;
    });

    const totalProfit = matchingTrades.reduce((sum, t) => {
      const p = typeof t.profit === 'number' && !isNaN(t.profit) ? t.profit : 0;
      if (Math.abs(p) > 100000) return sum;
      return sum + p;
    }, 0);
    const totalTrades = matchingTrades.length;
    const winningTrades = matchingTrades.filter(t => (t.profit || 0) >= 0).length;
    const winRate = totalTrades > 0 ? `${Math.round((winningTrades / totalTrades) * 100)}%` : "0%";
    const isActive = matchingBots.some(b => b.status === 'RUNNING');
    const isReal = tradingMode === 'REAL';

    const totalAllocatedCapital = matchingBots.reduce((sum, b) => sum + (b.capital || 0), 0);
    let yieldPercent = "0.0%";
    if (totalAllocatedCapital > 0) {
      const yieldVal = (totalProfit / totalAllocatedCapital) * 100;
      yieldPercent = yieldVal >= 0 ? `+${yieldVal.toFixed(1)}%` : `${yieldVal.toFixed(1)}%`;
    }

    const netGains = (
      <div className="flex flex-col">
        <span>{isReal ? `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} SOL` : `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} $`}</span>
        <span className="text-[9px] text-white/40 font-mono font-normal">
          {isReal ? formatSolToUsdAndHtg(totalProfit).combinedLabel : `≈ ${formatUsdToHtg(totalProfit)}`}
        </span>
      </div>
    );

    return {
      profit: yieldPercent,
      netGains,
      winRate,
      status: isActive ? "ACTIF" : (matchingBots.length > 0 ? "PAUSE" : "INACTIF")
    };
  };

  const autopilotStats = getBotStats('AI Autopilot (Machine à Cash)');
  const rsiStats = getBotStats('RSI Pullback');
  const emaStats = getBotStats('EMA Cross');

  const precoceStats = getBotStats('Pump.fun Sniper Bot', 'PRECOCE');
  const momentumStats = getBotStats('Pump.fun Sniper Bot', 'MOMENTUM');
  const raydiumStats = getBotStats('Pump.fun Sniper Bot', 'RAYDIUM');

  const strategiesList = tradingMode === 'DEMO' ? [
    {
      name: "IA Autopilot (Machine à Cash)",
      description: "Apprentissage continu sur Forex/Crypto.",
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
      description: "Détection des extrêmes de survente/surachat.",
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
      description: "Suivi de tendance via croisements d'exponentielles.",
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
      description: "Achat dès l'émission de la bonding curve.",
      profit: precoceStats.profit,
      netGains: precoceStats.netGains,
      winRate: precoceStats.winRate,
      risk: "ÉLEVÉ",
      status: precoceStats.status,
      color: "text-purple-400",
      barColor: "bg-purple-500",
      icon: Flame
    },
    {
      name: "Solana Sniper (Momentum)",
      description: "Achat sur accélération de momentum social.",
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
      description: "Achat sur migrations Raydium imminentes.",
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-[#c2ff0c]" />
            Comparatif des Performances
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Analysez et comparez l'efficacité de vos stratégies.</p>
        </div>

        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
          <button onClick={() => setTradingMode('DEMO')} className={cn("px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg font-headline", tradingMode === 'DEMO' ? "bg-amber-500/25 text-amber-300" : "text-white/40")}>
            Mode Démo
          </button>
          <button onClick={() => setTradingMode('REAL')} className={cn("px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg font-headline", tradingMode === 'REAL' ? "bg-purple-600/25 text-purple-300" : "text-white/40")}>
            Mode Réel (Solana)
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {strategiesList.map(strat => (
          <PerformanceStrategyCard key={strat.name} strategy={strat} />
        ))}
      </div>
    </div>
  );
}
