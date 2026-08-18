"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, Percent, BarChart2, Zap,
  Clock, ShieldCheck, Activity, Trophy, Target,
  ArrowUpRight, ArrowDownRight, Download
} from "lucide-react";
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from "@/lib/utils";
import { useAppState } from "@/context/AppContext";
import dynamic from "next/dynamic";
import VaultGrowthChart from "@/components/wallet/VaultGrowthChart";
import { exportTransactionsToCSV, exportBotsPerformanceToCSV } from "@/services/exportService";

const AutomatedPipelineFlowVisualizer = dynamic(
  () => import("@/components/trading/AutomatedPipelineFlowVisualizer").then((mod) => mod.default),
  { ssr: false }
);

function AnimatedNumber({ value, decimals = 2, prefix = "", suffix = "", className = "" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const startTime = performance.now();
    const animate = (now: number) => {
      const p = Math.min((now - startTime) / 800, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * e);
      if (p < 1) requestAnimationFrame(animate);
      else prevRef.current = end;
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span className={className}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

export default function AnalyticsPage() {
  const { tradingMode, setTradingMode, activePositions, closedPositions, bots, transactions, balance } = useAppState();
  const [isMounted, setIsMounted] = useState(false);
  const isReal = tradingMode === "REAL";
  const safeActivePositions = Array.isArray(activePositions) ? activePositions : [];
  const safeClosedPositions = Array.isArray(closedPositions) ? closedPositions : [];
  
  const filteredActive = safeActivePositions.filter(p => p && (p.mode || 'DEMO') === tradingMode);
  const filteredClosed = safeClosedPositions.filter(p => p && (p.mode || 'DEMO') === tradingMode);

  const winningTrades = filteredClosed.filter(p => p.profit > 0).length;
  const losingTrades = filteredClosed.filter(p => p.profit <= 0).length;
  const totalTrades = filteredClosed.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalWins = filteredClosed.filter(p => p.profit > 0).reduce((s, p) => s + p.profit, 0);
  const totalLosses = Math.abs(filteredClosed.filter(p => p.profit <= 0).reduce((s, p) => s + p.profit, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? 99 : 0);
  const totalGains = filteredClosed.reduce((s, p) => s + p.profit, 0);

  const tradesWithDuration = filteredClosed.filter(p => p.timestamp && p.closeTimestamp);
  const avgDurationMs = tradesWithDuration.length > 0
    ? tradesWithDuration.reduce((s, p) => s + ((p.closeTimestamp || p.timestamp) - p.timestamp), 0) / tradesWithDuration.length : 0;
  const avgDurationStr = avgDurationMs > 0
    ? avgDurationMs < 60000 ? `${Math.round(avgDurationMs / 1000)}s`
      : avgDurationMs < 3600000 ? `${Math.round(avgDurationMs / 60000)} min`
      : `${(avgDurationMs / 3600000).toFixed(1)}h` : "-";

  // Base capital for equity curve & drawdown calculation
  const storedSolBalance = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('trade_solana_balance') || '0') : 0;
  const baseVal = isReal ? (storedSolBalance > 0 ? storedSolBalance : 1.0) : 10000;
  let peak = baseVal, maxDD = 0, temp = baseVal;
  const pnlData = [baseVal];
  const sortedClosed = [...filteredClosed].sort((a, b) => a.timestamp - b.timestamp);
  for (const p of sortedClosed) {
    temp += p.profit; pnlData.push(temp);
    if (temp > peak) peak = temp;
    const dd = peak > 0 ? ((peak - temp) / peak) * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }
  if (pnlData.length === 1) pnlData.push(baseVal);

  const returns = filteredClosed.map(p => p.profit);
  const avgRet = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length > 1 ? returns.reduce((s, r) => s + Math.pow(r - avgRet, 2), 0) / (returns.length - 1) : 0;
  const sharpe = Math.sqrt(variance) > 0 ? avgRet / Math.sqrt(variance) : 0;

  const assetCounts: Record<string, number> = {};
  for (const p of [...filteredActive, ...filteredClosed]) {
    const raw = (p.pair || "").replace("FX:", "").replace("-USD", "").replace("=X", "").replace("=F", "").replace("SOL:", "").split(":").pop() || "Unknown";
    assetCounts[raw] = (assetCounts[raw] || 0) + 1;
  }
  const totalAC = Object.values(assetCounts).reduce((a, b) => a + b, 0) || 1;
  const distribution = Object.entries(assetCounts)
    .map(([name, val]) => ({ name, value: Math.round((val / totalAC) * 100) }))
    .sort((a, b) => b.value - a.value).slice(0, 5);
  if (!distribution.length) distribution.push({ name: "Aucun actif", value: 100 });

  const filteredBots = (bots || []).filter(b => (b.mode || 'DEMO') === tradingMode);
  const runningBots = filteredBots.filter(b => b.status === "RUNNING").length;
  const totalBotProfit = filteredBots.reduce((s, b) => s + (b.netProfit || b.pnl || 0), 0);

  const W = 600, H = 180, P = 20, cW = W - P * 2, cH = H - P * 2;
  const minV = Math.min(...pnlData), maxV = Math.max(...pnlData), vR = maxV - minV || 1;
  const pts = pnlData.map((v, i) => `${P + (i / (pnlData.length - 1)) * cW},${H - P - ((v - minV) / vR) * cH}`).join(" ");
  const areaPts = `${P},${H - P} ${pts} ${W - P},${H - P}`;
  const isProfit = totalGains >= 0;
  const barColors = ["#c2ff0c", "#a78bfa", "#22d3ee", "#f59e0b", "#f43f5e"];

  const kpi1 = [
    { label: "Win Rate", icon: <Percent className="h-4 w-4" />, color: "text-emerald-400", bg: "from-emerald-500/10",
      val: <AnimatedNumber value={winRate} decimals={1} suffix="%" className="text-2xl font-extrabold text-emerald-400 font-body" />,
      sub: `${winningTrades} gagnants · ${losingTrades} perdants` },
    { label: "Profits Nets", icon: isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
      color: isProfit ? "text-[#c2ff0c]" : "text-rose-400", bg: isProfit ? "from-lime-500/10" : "from-rose-500/10",
      val: (
        <div className="flex flex-col">
          <span className={cn("text-2xl font-extrabold font-body", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
            {isProfit ? "+" : ""}{isReal ? totalGains.toFixed(3) + " SOL" : totalGains.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " $"}
          </span>
          <span className="text-[10px] text-white/50 font-mono font-semibold mt-0.5">
            {isReal ? formatSolToUsdAndHtg(totalGains).combinedLabel : `≈ ${formatUsdToHtg(totalGains)}`}
          </span>
        </div>
      ),
      sub: `${totalTrades} transactions fermées` },
    { label: "Profit Factor", icon: <BarChart2 className="h-4 w-4" />, color: "text-purple-400", bg: "from-purple-500/10",
      val: <AnimatedNumber value={Math.min(profitFactor, 99)} decimals={2} className="text-2xl font-extrabold text-purple-400 font-body" />,
      sub: "Gains bruts / pertes bruts" },
    { label: "Max Drawdown", icon: <TrendingDown className="h-4 w-4" />, color: "text-rose-400", bg: "from-rose-500/10",
      val: <AnimatedNumber value={maxDD} decimals={2} suffix="%" className="text-2xl font-extrabold text-rose-400 font-body" />,
      sub: "Baisse maximale du capital" },
  ];

  const kpi2 = [
    { label: "Ratio Sharpe", icon: <Activity className="h-4 w-4" />, color: "text-cyan-400", bg: "from-cyan-500/10",
      val: <AnimatedNumber value={sharpe} decimals={2} className="text-xl font-bold font-body text-cyan-400" />,
      sub: sharpe > 1 ? "Excellente performance ajustée du risque" : "Performance normale" },
    { label: "Robots Actifs", icon: <Zap className="h-4 w-4" />, color: "text-[#c2ff0c]", bg: "from-lime-500/10",
      val: <span className="text-xl font-bold text-[#c2ff0c] font-body">{runningBots} / {filteredBots.length}</span>,
      sub: `${filteredBots.filter(b => b.status === "PAUSED").length} en pause` },
    { label: "Durée Moyenne Trade", icon: <Clock className="h-4 w-4" />, color: "text-[#c2ff0c]", bg: "from-amber-500/10",
      val: <span className="text-xl font-bold text-[#c2ff0c] font-body">14m 32s</span>,
      sub: "Fréquence moyenne des cycles" },
    { label: "Performance Bots", icon: <Trophy className="h-4 w-4" />, color: "text-[#c2ff0c]", bg: "from-purple-500/10",
      val: (
        <div className="flex flex-col">
          <span className="text-xl font-bold text-[#c2ff0c] font-body">
            {totalBotProfit >= 0 ? "+" : ""}{isReal ? totalBotProfit.toFixed(3) + " SOL" : totalBotProfit.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " $"}
          </span>
          <span className="text-[10px] text-white/50 font-mono font-semibold mt-0.5">
            {isReal ? formatSolToUsdAndHtg(totalBotProfit).combinedLabel : `≈ ${formatUsdToHtg(totalBotProfit)}`}
          </span>
        </div>
      ),
      sub: "Cumul tous bots confondus" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Visualiseur de Pipeline d'Exécution IA & Solana */}
      <AutomatedPipelineFlowVisualizer />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <BarChart2 className="h-8 w-8 text-[#c2ff0c]" />
            Statistiques & Analyses
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Performances en temps réel, métriques de risque et analyse du Coffre-Fort.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV Buttons */}
          <button
            onClick={() => {
              if (!transactions || transactions.length === 0) {
                alert("Aucune transaction enregistrée à exporter pour le moment.");
                return;
              }
              exportTransactionsToCSV(transactions);
            }}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 border border-white/10"
          >
            <Download className="h-3.5 w-3.5 text-[#c2ff0c]" />
            Exporter CSV Transactions
          </button>
          <button
            onClick={() => {
              if (!bots || bots.length === 0) {
                alert("Aucun robot de trading configuré pour le rapport CSV.");
                return;
              }
              exportBotsPerformanceToCSV(bots);
            }}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-headline font-bold flex items-center gap-1.5 border border-white/10"
          >
            <Download className="h-3.5 w-3.5 text-[#c2ff0c]" />
            Rapport Bots CSV
          </button>
        </div>
      </div>

      {/* Graphique de Croissance du Coffre-Fort & Capital */}
      <VaultGrowthChart />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi1.map((k, i) => (
          <div key={i} className={cn("relative bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-2 overflow-hidden group hover:border-white/20 transition-all duration-300")}>
            <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500", k.bg)} />
            <div className={cn("text-[10px] uppercase font-bold font-headline flex items-center gap-1.5 relative", k.color)}>{k.icon}{k.label}</div>
            <div className="relative">{k.val}</div>
            <p className="text-[9px] text-white/30 font-body relative">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi2.map((k, i) => (
          <div key={i} className="bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-2 hover:border-white/20 transition-all duration-300">
            <div className="text-[10px] uppercase font-bold text-white/40 font-headline flex items-center gap-1.5">{k.icon}{k.label}</div>
            {k.val}
            <p className="text-[9px] text-white/30 font-body">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Courbe PnL
            </h2>
            <div className={cn("flex items-center gap-1 text-xs font-bold font-body px-2.5 py-1 rounded-full", isProfit ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400")}>
              {isProfit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {isProfit ? "En profit" : "En perte"}
            </div>
          </div>
          <div className="bg-[#09070c] border border-white/5 rounded-xl p-3.5">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="pnlGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isProfit ? "#c2ff0c" : "#f43f5e"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isProfit ? "#c2ff0c" : "#f43f5e"} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map(r => <line key={r} x1={P} y1={P + r * cH} x2={W - P} y2={P + r * cH} stroke="white" strokeOpacity="0.05" strokeDasharray="4 4" />)}
              <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="white" strokeOpacity="0.1" />
              <polygon points={areaPts} fill="url(#pnlGrad2)" />
              <polyline points={pts} fill="none" stroke={isProfit ? "#c2ff0c" : "#f43f5e"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pnlData.map((v, i) => {
                const x = P + (i / (pnlData.length - 1)) * cW;
                const y = H - P - ((v - minV) / vR) * cH;
                return <circle key={i} cx={x} cy={y} r="3.5" fill="#09070c" stroke={isProfit ? "#c2ff0c" : "#f43f5e"} strokeWidth="2" />;
              })}
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-white/30 font-body px-1">
            <span>Départ</span><span>{totalTrades} trades fermés</span><span>Actuel</span>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#14101a] border border-white/10 rounded-2xl p-5 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-purple-400" /> Répartition Actifs
          </h2>
          <div className="space-y-3">
            {distribution.map((item, idx) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white/80 font-body flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: barColors[idx] }} />{item.name}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">{item.value}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, background: barColors[idx] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
