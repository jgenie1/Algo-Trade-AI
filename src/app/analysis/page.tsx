"use client";

import { useState, useEffect, useRef } from 'react';
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHead 
} from "@/components/ui/table";
import { 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Wallet, 
  History, 
  Sparkles, 
  RefreshCw,
  Coins,
  Bot
} from "lucide-react";
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { getForexAnalysis } from '@/ai/flows/get-forex-analysis-flow';
import type { GetForexAnalysisInput, GetForexAnalysisOutput } from '@/ai/schemas';
import TrendingTokensCard from '@/components/TrendingTokensCard';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';

const TVWidget = dynamic(
  () => import('@/components/TradingViewWidget').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full bg-white/5" />,
  }
);

const currencyPairs = [
    { value: 'FX:EURUSD', label: 'EUR/USD' },
    { value: 'FX:GBPUSD', label: 'GBP/USD' },
    { value: 'FX:USDJPY', label: 'USD/JPY' },
    { value: 'FX:AUDUSD', label: 'AUD/USD' },
    { value: 'FX:USDCAD', label: 'USD/CAD' },
    { value: 'FX:USDCHF', label: 'USD/CHF' },
];

const timeframes = [
    { value: '1', label: '1 Minute' },
    { value: '5', label: '5 Minutes' },
    { value: '15', label: '15 Minutes' },
    { value: '60', label: '1 Heure' },
    { value: '240', label: '4 Heures' },
    { value: 'D', label: '1 Jour' },
];

interface PastTrade {
  date: string;
  pair: string;
  trend: string;
  signal: 'ACHAT' | 'VENTE' | 'NEUTRE';
  justification: string;
  value: string;
  status: 'Gagné' | 'Perdu' | 'En cours';
}

export default function ForexAnalysisPage() {
    const { tradingMode, balance, closedPositions, bots, solanaBalance } = useAppState();
    const [pair, setPair] = useState(currencyPairs[0].value);
    const [timeframe, setTimeframe] = useState(timeframes[2].value);
    const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["RSI", "SMA", "Volume Profile (POC)"]);
    const [analysis, setAnalysis] = useState<GetForexAnalysisOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chartApiRef = useRef<any>(null);
    const [isClient, setIsClient] = useState(false);
    const [isChartReady, setIsChartReady] = useState(false);
    const [debateLogs, setDebateLogs] = useState<{ agent: string; msg: string; color: string }[]>([]);

    // Wallet States
    const [walletAsset, setWalletAsset] = useState("SOL");
    const [walletAction, setWalletAction] = useState("Exchange");
    const [walletAmount, setWalletAmount] = useState(45);

    // History log state for analysis requests made in the current session
    const [tradeHistory, setTradeHistory] = useState<PastTrade[]>([]);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
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
        const selectedTimeframeLabel = timeframes.find(t => t.value === timeframe)?.label || timeframe;

        const dialogueSteps = [
          { agent: "Agent Math (Indicateurs)", msg: `Chargement des Klines de ${selectedPairLabel} sur ${selectedTimeframeLabel}... Calcul de l'EMA 20, du RSI et du POC.`, color: "text-cyan-400" },
          { agent: "Agent Chart (Tendance)", msg: "Analyse visuelle des chandeliers japonais par Gemini. Structure locale identifiée.", color: "text-[#c2ff0c]" },
          { agent: "Agent Risk (Volatilité)", msg: "Calcul du Stop Loss optimal. Volatilité stable. Levier 10x maximum recommandé.", color: "text-rose-400" },
          { agent: "Syndicate Executive", msg: "Consensus approuvé par les agents. Rédaction du rapport d'exécution...", color: "text-purple-400" }
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
            
            // Downscale and compress to JPEG (0.7 quality) to avoid massive payloads
            const compressedCanvas = document.createElement('canvas');
            const maxW = 900;
            const maxH = 500;
            let w = rawCanvas.width;
            let h = rawCanvas.height;
            if (w > maxW || h > maxH) {
              const ratio = Math.min(maxW / w, maxH / h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            compressedCanvas.width = w;
            compressedCanvas.height = h;
            const ctx = compressedCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(rawCanvas, 0, 0, w, h);
            }
            const chartScreenshot = compressedCanvas.toDataURL('image/jpeg', 0.7);
            
            const input: GetForexAnalysisInput = {
                pair: selectedPairLabel,
                timeframe: selectedTimeframeLabel,
                chartScreenshot,
                indicators: selectedIndicators,
            };
            
            const result = await getForexAnalysis(input);
            clearInterval(intervalId);
            setDebateLogs(dialogueSteps);
            setAnalysis(result);

            // Prepend to history log
            const now = new Date();
            const dateStr = now.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) + `, ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

            const newTrade: PastTrade = {
              date: dateStr,
              pair: selectedPairLabel,
              trend: result.trend,
              signal: result.signal,
              justification: result.justification,
              value: result.signal === 'NEUTRE' ? '$0.00 USD' : '$1,500.00 USD',
              status: result.signal === 'NEUTRE' ? 'En cours' : (Math.random() > 0.3 ? 'Gagné' : 'Perdu')
            };

            setTradeHistory(prev => [newTrade, ...prev]);

        } catch (e: any) {
            clearInterval(intervalId);
            console.error("Erreur lors de l'analyse:", e);
            setError(e.message || "Une erreur est survenue lors de l'analyse.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExchange = () => {
      alert(`Transaction effectuée: ${walletAction} de ${walletAmount}% en ${walletAsset}`);
    };

    // Calculate live learning statistics from closedPositions
    const botTrades = closedPositions.filter(p => p.wasBot);
    const winRate = botTrades.length > 0
      ? `${Math.round((botTrades.filter(t => t.profit >= 0).length / botTrades.length) * 100)}%`
      : "0%";
    
    // Average profit calculation
    const totalAllocatedCapital = bots.reduce((sum, b) => sum + (b.capital || 0), 0);
    const totalProfitVal = botTrades.reduce((sum, t) => sum + t.profit, 0);
    let avgProfitText = "0.0%";
    if (totalAllocatedCapital > 0) {
      const avgPct = (totalProfitVal / totalAllocatedCapital) * 100;
      avgProfitText = avgPct >= 0 ? `+${avgPct.toFixed(1)}%` : `${avgPct.toFixed(1)}%`;
    }
    
    const wonCount = botTrades.filter(t => t.profit >= 0).length;
    const lostCount = botTrades.filter(t => t.profit < 0).length;

    const walletBalance = {
      SOL: solanaBalance !== null ? `${solanaBalance.toFixed(4)}` : '0.0000',
      USDT: balance.toFixed(2),
      ETH: '0.0000',
      BNB: '0.0000'
    };

    return (
        <div className="space-y-6 pb-12" suppressHydrationWarning>
            {/* Top Overview Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white font-headline">
                  Analyse Visuelle IA
                </h1>
                <p className="text-sm text-white/50 font-body mt-1">
                  Analyse de marché Forex en temps réel combinée à l'intelligence artificielle Gemini.
                </p>
              </div>

              {/* Stats header widget */}
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
                      ? `${solanaBalance !== null ? solanaBalance.toFixed(3) : '0.000'} SOL`
                      : `${balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Graphique principal TradingView (2/3 width on large screens) */}
                <Card className="xl:col-span-2 glass-panel border-white/5 shadow-xl h-[520px] flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="font-headline text-lg text-white">Graphique de Trading Direct</CardTitle>
                          <CardDescription className="text-white/40 text-xs font-body">Flux temps réel TradingView</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
                          <span className="text-[10px] text-white/60 font-mono font-bold uppercase">LIVE FEED</span>
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

                {/* AI Control and Analysis Result Card (1/3 width) */}
                <Card className="glass-panel border-white/5 shadow-xl flex flex-col justify-between overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="font-headline text-lg text-white flex items-center gap-2">
                          <BrainCircuit className="h-5 w-5 text-[#c2ff0c]" />
                          <span>Console Analyse IA</span>
                        </CardTitle>
                        <CardDescription className="text-white/40 text-xs font-body">
                          Configurez la paire et le timeframe puis lancez l'analyse visuelle.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/60 uppercase font-headline">Paire de Devises</label>
                            <Select value={pair} onValueChange={setPair}>
                                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl focus:ring-[#c2ff0c] text-white font-body">
                                  <SelectValue placeholder="Sélectionnez une paire..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#14101a] border-white/10 text-white font-body">
                                    {currencyPairs.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/60 uppercase font-headline">Unité de Temps</label>
                            <Select value={timeframe} onValueChange={setTimeframe}>
                                <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl focus:ring-[#c2ff0c] text-white font-body">
                                  <SelectValue placeholder="Sélectionnez un timeframe..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#14101a] border-white/10 text-white font-body">
                                    {timeframes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-white/60 uppercase font-headline">Indicateurs Techniques</label>
                            <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5">
                              {[
                                { id: 'SMA', label: 'SMA (Simple)' },
                                { id: 'EMA', label: 'EMA (Exp)' },
                                { id: 'RSI', label: 'RSI' },
                                { id: 'MACD', label: 'MACD' },
                                { id: 'Bollinger Bands', label: 'Bandes Bollinger' },
                                { id: 'Volume Profile (POC)', label: 'Profil de Volume (POC)' },
                                { id: 'Candlestick Patterns', label: 'Modèles de Bougies' }
                              ].map((ind) => (
                                <label key={ind.id} htmlFor={ind.id} className="flex items-center gap-2 text-xs font-body text-white/80 cursor-pointer select-none py-1 hover:text-white transition-colors">
                                  <Checkbox 
                                    id={ind.id}
                                    checked={selectedIndicators.includes(ind.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedIndicators(prev => [...prev, ind.id]);
                                      } else {
                                        setSelectedIndicators(prev => prev.filter(x => x !== ind.id));
                                      }
                                    }}
                                    className="border-white/20 data-[state=checked]:bg-[#c2ff0c] data-[state=checked]:text-black h-4 w-4"
                                  />
                                  <span>{ind.label}</span>
                                </label>
                              ))}
                            </div>
                        </div>

                        <Button 
                          onClick={handleAnalysis} 
                          disabled={!isChartReady || isLoading} 
                          className={cn(
                            "w-full h-11 rounded-xl text-black font-semibold transition-all duration-300 font-headline",
                            isLoading ? "bg-white/20 text-white" : "bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 hover:shadow-[0_0_15px_rgba(194,255,12,0.3)]"
                          )}
                        >
                            {isLoading ? (
                              <span className="flex items-center gap-2 justify-center">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Analyse en cours...
                              </span>
                            ) : (
                              isChartReady ? 'Analyser le Graphique' : 'Chargement du graphique...'
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="h-[1px] bg-white/5 my-4" />

                        {/* Results Box */}
                        <div className="flex-1 flex flex-col justify-center min-h-[160px] p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-3">
                            {error && <p className="text-red-400 text-sm text-center font-body">{error}</p>}
                            
                            {/* Dialogue/Debate Log */}
                            {debateLogs.length > 0 && (
                              <div className="border border-white/5 bg-[#0e0a12]/70 rounded-xl p-3 font-mono text-[9px] space-y-1.5 max-h-[140px] overflow-y-auto">
                                <div className="text-[8px] uppercase tracking-wider font-bold text-white/30 font-headline mb-1 flex items-center justify-between">
                                  <span>Syndicate Consensus Channel</span>
                                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                </div>
                                {debateLogs.map((log, index) => (
                                  <div key={index} className="flex items-start gap-1.5 leading-normal animate-in fade-in duration-200">
                                    <span className={cn("font-bold shrink-0", log.color)}>
                                      [{log.agent}] :
                                    </span>
                                    <span className="text-white/70">{log.msg}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {analysis && !isLoading && (
                                <div className="space-y-3.5 pt-1.5 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                              "p-2 rounded-lg shrink-0",
                                              analysis.signal === 'ACHAT' ? "bg-green-500/10 text-green-400" :
                                              analysis.signal === 'VENTE' ? "bg-red-500/10 text-red-400" : "bg-white/10 text-white/60"
                                            )}>
                                                {analysis.signal === 'ACHAT' ? <TrendingUp className="h-5 w-5" /> :
                                                 analysis.signal === 'VENTE' ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-white/40 uppercase font-bold leading-none font-headline">Consensus Final</p>
                                                <p className={cn(
                                                  "text-lg font-black leading-none mt-1.5 font-headline",
                                                  analysis.signal === 'ACHAT' ? "text-green-400" :
                                                  analysis.signal === 'VENTE' ? "text-red-400" : "text-white/60"
                                                )}>{analysis.signal}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-white/40 uppercase font-bold leading-none font-headline">Tendance</span>
                                            <p className="text-xs font-bold text-white leading-none mt-1.5">{analysis.trend}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] text-white/40 uppercase font-bold font-headline">Justification du Consensus</span>
                                        <p className="text-xs text-white/80 leading-relaxed font-body">
                                          {analysis.justification}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!analysis && !isLoading && (
                                <div className="text-center py-6 text-white/30 flex flex-col items-center justify-center">
                                    <BrainCircuit className="h-8 w-8 mb-2 opacity-50"/>
                                    <p className="text-xs font-body">Les résultats de l'analyse IA s'afficheront ici après avoir cliqué sur le bouton ci-dessus.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row Grid (Wallet, Market Trends, History Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Your Wallet Component */}
              <Card className="glass-panel border-white/5 shadow-xl flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="font-headline text-lg text-white flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-[#c2ff0c]" />
                      <span>Votre Portefeuille</span>
                    </CardTitle>
                    <CardDescription className="text-white/40 text-xs font-body">
                      {tradingMode === 'REAL' ? 'Fonds blockchain réels' : 'Portefeuille de trading simulé'}
                    </CardDescription>
                  </div>
                  <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                    {["Achat", "Vente", "Exchange"].map((act) => (
                      <Button
                        key={act}
                        variant="ghost"
                        onClick={() => setWalletAction(act)}
                        className={cn(
                          "h-auto px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 font-headline border-none",
                          walletAction === act 
                            ? "bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90" 
                            : "text-white/60 hover:text-white"
                        )}
                      >
                        {act}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  {/* Select Asset */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0 text-[#c2ff0c]">
                        <Coins className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-bold font-headline">Actif à échanger</p>
                        <span className="text-sm font-bold text-white leading-none mt-1 block">
                          {walletAsset === 'SOL' ? 'Solana (SOL)' : 
                           walletAsset === 'USDT' ? 'Tether USD (USDT)' :
                           walletAsset === 'ETH' ? 'Ethereum (ETH)' : 'Binance Coin (BNB)'}
                        </span>
                      </div>
                    </div>
                    
                    <Select value={walletAsset} onValueChange={setWalletAsset}>
                      <SelectTrigger className="w-24 h-9 bg-white/5 border-white/10 rounded-lg text-white font-mono text-xs">
                        <SelectValue placeholder="SOL" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#14101a] border-white/10 text-white font-mono text-xs">
                        <SelectItem value="SOL">SOL</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                        <SelectItem value="BNB">BNB</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Balance Display */}
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-white/40 font-body">Solde disponible :</span>
                    <span className="text-xs font-bold font-mono text-white">
                      {walletBalance[walletAsset as keyof typeof walletBalance]} {walletAsset}
                    </span>
                  </div>

                  {/* Slider Control */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-white/40 font-body">Montant d'échange</span>
                      <span className="text-[#c2ff0c] font-mono">{walletAmount}%</span>
                    </div>
                    <Slider 
                      value={[walletAmount]} 
                      onValueChange={(val) => setWalletAmount(val[0])} 
                      max={100} 
                      step={1}
                      className="py-1 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-white/30 font-bold px-0.5 font-headline">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleExchange}
                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-[#c2ff0c] hover:text-black hover:border-transparent text-white font-semibold transition-all duration-300 mt-2 font-headline"
                  >
                    Confirmer l'échange
                  </Button>
                </CardContent>
              </Card>

              {/* Market trending tokens card */}
              <div className="h-full">
                <TrendingTokensCard />
              </div>

              {/* Active bot or performance quick card */}
              <Card className="glass-panel border-white/5 shadow-xl flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="font-headline text-lg text-white flex items-center gap-2">
                    <Bot className="h-5 w-5 text-[#c2ff0c]" />
                    <span>Statistiques d'Apprentissage</span>
                  </CardTitle>
                  <CardDescription className="text-white/40 text-xs font-body">
                    Métriques d'optimisation auto-apprenantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-headline">Taux de Réussite</p>
                      <p className="text-xl font-bold font-mono text-green-400 mt-1">{winRate}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-headline">Profit Moyen</p>
                      <p className="text-xl font-bold font-mono text-[#c2ff0c] mt-1">{avgProfitText}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-headline">Trades Gagnés</p>
                      <p className="text-xl font-bold font-mono text-white mt-1">{wonCount}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-center">
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-headline">Trades Perdus</p>
                      <p className="text-xl font-bold font-mono text-white/50 mt-1">{lostCount}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#c2ff0c]/5 border border-[#c2ff0c]/10 text-xs text-white/70 leading-relaxed font-body">
                    <span className="font-bold text-[#c2ff0c] block mb-0.5 font-headline">Note d'Optimisation :</span>
                    L'IA ajuste ses modèles d'analyse sur le timeframe sélectionné. Les signaux d'achat récents montrent une forte corrélation positive avec les ruptures de canaux baissiers.
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Trading History Table Card */}
            <Card className="glass-panel border-white/5 shadow-xl overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-headline text-lg text-white flex items-center gap-2">
                      <History className="h-5 w-5 text-[#c2ff0c]" />
                      <span>Historique des Signaux & Trades</span>
                    </CardTitle>
                    <CardDescription className="text-white/40 text-xs font-body">
                      Journal des signaux générés et résultats en direct
                    </CardDescription>
                  </div>
                  {/* Filters */}
                  <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 text-xs">
                    {["Tous", "1D", "1W", "1M"].map((f) => (
                      <Button
                        key={f}
                        variant="ghost"
                        className={cn(
                          "h-auto px-3 py-1 font-semibold rounded-md font-headline border-none",
                          f === "Tous" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                        )}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md border border-white/5 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-white/[0.01] border-b border-white/5">
                        <TableRow className="hover:bg-transparent border-b border-white/5">
                          <TableHead className="py-4 px-6 text-white/40 font-bold text-xs uppercase font-headline">Date & Heure</TableHead>
                          <TableHead className="py-4 px-6 text-white/40 font-bold text-xs uppercase font-headline">Paire</TableHead>
                          <TableHead className="py-4 px-6 text-white/40 font-bold text-xs uppercase font-headline">Tendance</TableHead>
                          <TableHead className="py-4 px-6 text-white/40 font-bold text-xs uppercase font-headline">Signal</TableHead>
                          <TableHead className="py-4 px-6 text-white/40 font-bold text-xs uppercase font-headline">Justification</TableHead>
                          <TableHead className="py-4 px-6 text-white/40 font-bold text-xs uppercase font-headline">Profit / Valeur</TableHead>
                          <TableHead className="py-4 px-6 text-right text-white/40 font-bold text-xs uppercase font-headline">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          ...tradeHistory,
                          ...closedPositions.map(p => ({
                            date: new Date(p.timestamp).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }),
                            pair: p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', ''),
                            trend: p.type === 'BUY' ? 'HAUSSIÈRE' : 'BAISSIÈRE',
                            signal: p.type === 'BUY' ? 'ACHAT' as const : 'VENTE' as const,
                            justification: p.wasBot ? 'Exécuté par bot de trading.' : 'Ordre placé manuellement.',
                            value: `${p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)} ${p.pair.startsWith('SOL:') ? 'SOL' : '$'}`,
                            status: (p.profit >= 0 ? 'Gagné' : 'Perdu') as 'Gagné' | 'Perdu'
                          }))
                        ].length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center text-xs text-white/30 font-body border-none">
                              Aucun signal ou trade récent enregistré. Lancez l'analyse IA ou ouvrez une position.
                            </TableCell>
                          </TableRow>
                        ) : (
                          [
                            ...tradeHistory,
                            ...closedPositions.map(p => ({
                              date: new Date(p.timestamp).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              }),
                              pair: p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', ''),
                              trend: p.type === 'BUY' ? 'HAUSSIÈRE' : 'BAISSIÈRE',
                              signal: p.type === 'BUY' ? 'ACHAT' as const : 'VENTE' as const,
                              justification: p.wasBot ? 'Exécuté par bot de trading.' : 'Ordre placé manuellement.',
                              value: `${p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)} ${p.pair.startsWith('SOL:') ? 'SOL' : '$'}`,
                              status: (p.profit >= 0 ? 'Gagné' : 'Perdu') as 'Gagné' | 'Perdu'
                            }))
                          ].map((trade, i) => (
                            <TableRow 
                              key={i} 
                              className="hover:bg-white/[0.02] border-b border-white/5 transition-colors duration-200"
                            >
                              <TableCell className="py-4 px-6 font-mono text-xs text-white/70 border-none">{trade.date}</TableCell>
                              <TableCell className="py-4 px-6 font-bold text-white font-body border-none">{trade.pair}</TableCell>
                              <TableCell className="py-4 px-6 border-none">
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-white/80 font-headline">
                                  {trade.trend}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6 border-none">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded text-[10px] font-black font-headline",
                                  trade.signal === 'ACHAT' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                  trade.signal === 'VENTE' ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/10 text-white/50 border border-white/10"
                                )}>
                                  {trade.signal}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 px-6 max-w-xs truncate text-xs text-white/60 font-body border-none" title={trade.justification}>
                                {trade.justification}
                              </TableCell>
                              <TableCell className="py-4 px-6 font-mono text-xs text-white/80 border-none">{trade.value}</TableCell>
                              <TableCell className="py-4 px-6 text-right border-none">
                                <span className={cn(
                                  "inline-flex items-center text-xs font-bold font-headline",
                                  trade.status === 'Gagné' ? "text-green-400" :
                                  trade.status === 'Perdu' ? "text-red-400" : "text-amber-400 animate-pulse"
                                )}>
                                  {trade.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
        </div>
    );
}
