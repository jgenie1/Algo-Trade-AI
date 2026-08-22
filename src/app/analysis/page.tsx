"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, Wallet, Coins, Bot } from "lucide-react";
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { GetForexAnalysisInput, GetForexAnalysisOutput } from '@/ai/schemas';
import TrendingTokensCard from '@/components/trading/TrendingTokensCard';
import BacktestSimulator from '@/components/trading/BacktestSimulator';
import AIAnalysisConsoleCard from '@/components/ai/AIAnalysisConsoleCard';
import AIAnalysisHistoryTable from '@/components/ai/AIAnalysisHistoryTable';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { getRealSolanaBalance } from '@/services/pumpFunService';
import { currencyPairs as allCurrencyPairs, timeframes as allTimeframes } from '@/hooks/useTradingSimulation';

const TVWidget = dynamic(
  () => import('@/components/trading/TradingViewWidget').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full bg-white/5" />,
  }
);

const defaultCurrencyPairs = allCurrencyPairs.filter((c: any) => c.value !== 'ALL');
const solanaRealPairs = [
  { value: 'SOL', label: 'SOL/USD (Solana Native)', ticker: 'SOL-USD' },
  { value: 'SOL:$WIF', label: '$WIF (dogwifhat Solana)', ticker: 'WIF-USD' },
  { value: 'SOL:$BONK', label: '$BONK (Bonk Solana)', ticker: 'BONK-USD' },
  { value: 'SOL:$TRUMP', label: '$TRUMP (Official Trump)', ticker: 'TRUMP-USD' },
  { value: 'SOL:RAYDIUM', label: 'RAY/SOL (Raydium Migration)', ticker: 'RAY-USD' }
];

export default function ForexAnalysisPage() {
  const { tradingMode, balance, closedPositions, bots } = useAppState();
  const currencyPairs = tradingMode === 'REAL' ? solanaRealPairs : defaultCurrencyPairs;
  const [pair, setPair] = useState(currencyPairs[0].value);
  const [timeframe, setTimeframe] = useState(allTimeframes[2].value);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["RSI", "SMA", "Volume Profile (POC)"]);
  const [analysis, setAnalysis] = useState<GetForexAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartApiRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const [debateLogs, setDebateLogs] = useState<{ agent: string; msg: string; color: string }[]>([]);

  const [walletAsset, setWalletAsset] = useState("SOL");
  const [walletAction, setWalletAction] = useState("Exchange");
  const [walletAmount, setWalletAmount] = useState(45);
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);

  useEffect(() => {
    setIsClient(true);
    if (tradingMode === 'REAL') {
      getRealSolanaBalance().then(res => {
        if (res && res.success && res.balance !== undefined) {
          setSolanaBalance(res.balance);
        }
      });
    }
  }, [tradingMode]);

  const handleAnalysis = async () => {
    const chart = chartApiRef.current;
    if (!chart) {
      setError("Le graphique de trading n'est pas encore prêt. Veuillez patienter.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebateLogs([]);

    const selectedPairLabel = currencyPairs.find(p => p.value === pair)?.label || pair;
    const selectedTimeframeLabel = allTimeframes.find(t => t.value === timeframe)?.label || timeframe;

    const dialogueSteps = [
      { agent: "Agent Math (Indicateurs)", msg: `Chargement des Klines sur ${selectedPairLabel}...`, color: "text-cyan-400" },
      { agent: "Agent Chart (Tendance)", msg: "Analyse visuelle des chandeliers par Gemini.", color: "text-[#c2ff0c]" },
      { agent: "Agent Risk (Volatilité)", msg: "Calcul du Stop Loss optimal. Levier max 10x.", color: "text-rose-400" },
      { agent: "Syndicate Executive", msg: "Consensus approuvé par les agents.", color: "text-purple-400" }
    ];

    let index = 0;
    setDebateLogs([dialogueSteps[0]]);
    const intervalId = setInterval(() => {
      index++;
      if (index < dialogueSteps.length) {
        setDebateLogs(prev => [...prev, dialogueSteps[index]]);
      } else {
        clearInterval(intervalId);
      }
    }, 1200);

    try {
      const rawCanvas = await chart.takeScreenshot();
      const compressedCanvas = document.createElement('canvas');
      const ratio = Math.min(900 / rawCanvas.width, 500 / rawCanvas.height);
      const w = Math.round(rawCanvas.width * ratio);
      const h = Math.round(rawCanvas.height * ratio);
      compressedCanvas.width = w;
      compressedCanvas.height = h;
      const ctx = compressedCanvas.getContext('2d');
      if (ctx) ctx.drawImage(rawCanvas, 0, 0, w, h);
      const chartScreenshot = compressedCanvas.toDataURL('image/jpeg', 0.7);

      const input: GetForexAnalysisInput = {
        pair: selectedPairLabel,
        timeframe: selectedTimeframeLabel,
        chartScreenshot,
        indicators: selectedIndicators,
      };

      const apiRes = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!apiRes.ok) {
        const errData = await apiRes.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur lors de l'analyse IA.");
      }

      const result: GetForexAnalysisOutput = await apiRes.json();
      clearInterval(intervalId);
      setDebateLogs(dialogueSteps);
      setAnalysis(result);

      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
        `, ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

      setTradeHistory(prev => [{
        date: dateStr,
        pair: selectedPairLabel,
        trend: result.trend,
        signal: result.signal,
        justification: result.justification,
        value: result.signal === 'NEUTRE' ? '$0.00' : '$1,500.00',
        status: result.signal === 'NEUTRE' ? 'En cours' : 'Gagné'
      }, ...prev]);
    } catch (e: any) {
      clearInterval(intervalId);
      setError(e.message || "Erreur lors de l'analyse.");
    } finally {
      setIsLoading(false);
    }
  };

  const botTrades = closedPositions.filter(p => p.wasBot);
  const winRate = botTrades.length > 0
    ? `${Math.round((botTrades.filter(t => t.profit >= 0).length / botTrades.length) * 100)}%`
    : "0%";

  return (
    <div className="space-y-6 pb-12" suppressHydrationWarning>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-headline">
            Analyse Visuelle IA
          </h1>
          <p className="text-sm text-white/50 font-body mt-1">
            Analyse de marché Forex en temps réel combinée à l&apos;intelligence artificielle Gemini.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2.5 pr-4">
          <div className="p-2.5 rounded-xl bg-[#c2ff0c]/15 text-[#c2ff0c]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
              {tradingMode === 'REAL' ? 'Solde SOL Réel' : 'Solde Démo USD'}
            </p>
            <p className="text-lg font-bold font-mono text-white leading-none mt-1">
              {tradingMode === 'REAL' 
                ? `${solanaBalance !== null ? solanaBalance.toFixed(2) : '0.00'} SOL`
                : `${balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 glass-panel border-white/5 shadow-xl min-h-[380px] sm:min-h-[460px] h-[380px] sm:h-[480px] lg:h-[520px] flex flex-col overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-lg text-white">Graphique Direct</CardTitle>
              <CardDescription className="text-white/40 text-xs font-body">TradingView Live Feed</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow relative">
            {isClient && <TVWidget 
              symbol={pair} 
              interval={timeframe} 
              indicators={selectedIndicators}
              onReady={(chart) => {
                chartApiRef.current = chart;
                setIsChartReady(true);
              }}
            />}
          </CardContent>
        </Card>

        {/* AI Console Component */}
        <AIAnalysisConsoleCard
          pair={pair}
          setPair={setPair}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          currencyPairs={currencyPairs}
          timeframes={allTimeframes}
          selectedIndicators={selectedIndicators}
          setSelectedIndicators={setSelectedIndicators}
          handleAnalysis={handleAnalysis}
          isChartReady={isChartReady}
          isLoading={isLoading}
          error={error}
          debateLogs={debateLogs}
          analysis={analysis}
        />
      </div>

      {/* Bottom Grid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrendingTokensCard />

        <Card className="glass-panel border-white/5 shadow-xl flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="font-headline text-lg text-white flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#c2ff0c]" />
              <span>Statistiques IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[9px] text-white/30 font-bold uppercase font-headline">Réussite</p>
                <p className="text-xl font-bold font-mono text-green-400 mt-1">{winRate}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-[9px] text-white/30 font-bold uppercase font-headline">Trades</p>
                <p className="text-xl font-bold font-mono text-white mt-1">{botTrades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <BacktestSimulator />
      </div>

      {/* History Table Component */}
      <AIAnalysisHistoryTable
        tradeHistory={tradeHistory}
        closedPositions={closedPositions}
      />
    </div>
  );
}
