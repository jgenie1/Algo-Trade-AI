"use client";

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Eye, 
  BarChart2, 
  Globe 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { currencyPairs, timeframes } from '@/hooks/useTradingSimulation';
import TradingViewWidget from '@/components/trading/TradingViewWidget';

interface MarketRadarAndChartProps {
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
  livePrices: { [key: string]: number };
  priceDirections: { [key: string]: 'up' | 'down' | 'flat' };
  botLogs: Array<{
    id: string;
    botId: string;
    botName: string;
    message: string;
    type: 'info' | 'trade' | 'error';
    timestamp: number;
  }>;
  bots: Array<{
    id: string;
    pair: string;
    strategy: string;
    status: string;
    capital: number;
    netProfit?: number;
  }>;
}

export default function MarketRadarAndChart({
  selectedPair,
  setSelectedPair,
  livePrices,
  priceDirections,
  botLogs,
  bots
}: MarketRadarAndChartProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'radar' | 'ai'>('chart');
  const [chartTimeframe, setChartTimeframe] = useState<string>('15');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['RSI', 'EMA', 'Bollinger Bands']);

  const actualPair = selectedPair === 'ALL' || selectedPair === 'SOLANA' ? 'FX:EURUSD' : selectedPair;
  const currentPrice = livePrices[actualPair] || 0;

  const toggleIndicator = (ind: string) => {
    setSelectedIndicators(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  // Compute live multi-asset metrics for radar matrix
  const radarList = currencyPairs.filter(cp => cp.value !== 'ALL').map(cp => {
    const price = livePrices[cp.value] || 0;
    const dir = priceDirections[cp.value] || 'flat';

    const change = price > 0 ? (dir === 'up' ? 0.42 : dir === 'down' ? -0.38 : 0) : 0;
    const rsi = price > 0 ? (dir === 'up' ? 62 : dir === 'down' ? 38 : 50) : 50;
    const rsiStatus = rsi < 35 ? 'SURVENDU (Achat)' : rsi > 65 ? 'SURACHETÉ (Vente)' : 'NEUTRE';

    const safeBots = Array.isArray(bots) ? bots : [];
    const botActiveOnPair = safeBots.some(b => b && b.status === 'RUNNING' && (b.pair === 'ALL' || b.pair === cp.value));

    return {
      ...cp,
      price,
      dir,
      change,
      rsi,
      rsiStatus,
      botActive: botActiveOnPair
    };

  });

  return (
    <Card className="bg-[#150f21] border border-white/15 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col h-[660px] overflow-hidden">
      {/* Header Bar */}
      <CardHeader className="p-0 pb-4 border-b border-white/10 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Main Title & Active Pair Display */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#c2ff0c]/15 border border-[#c2ff0c]/30 rounded-xl text-[#c2ff0c]">
              <Globe className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline">
                  Centre d&apos;Analyse Multi-Actifs
                </CardTitle>
                <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] text-xs font-headline uppercase font-bold border-none">
                  Live Stream 24/7
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium font-body mt-0.5">
                Scanneur de marché en temps réel & graphiques multi-indicateurs pour bots algorithmiques.
              </p>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex bg-black/40 border border-white/15 p-1.5 rounded-xl gap-1 shrink-0">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('chart')}
              className={cn(
                "px-3.5 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all font-headline flex items-center gap-1.5 border-none",
                activeTab === 'chart' 
                  ? "bg-white/20 text-white shadow-md font-black" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <BarChart2 className="h-3.5 w-3.5 text-[#c2ff0c]" />
              Graphique Pro
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('radar')}
              className={cn(
                "px-3.5 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all font-headline flex items-center gap-1.5 border-none",
                activeTab === 'radar' 
                  ? "bg-white/20 text-white shadow-md font-black" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              Radar Actifs ({radarList.length})
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('ai')}
              className={cn(
                "px-3.5 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all font-headline flex items-center gap-1.5 border-none",
                activeTab === 'ai' 
                  ? "bg-white/20 text-white shadow-md font-black" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Signaux IA
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Main Content Body */}
      <CardContent className="p-0 pt-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* TAB 1: CHART PRO */}
        {activeTab === 'chart' && (
          <div className="flex flex-col h-full space-y-3">
            {/* Chart Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white/5 border border-white/5 p-2 rounded-xl text-xs">
              {/* Pair Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase font-headline font-bold">Actif :</span>
                <Select value={actualPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs text-white font-body rounded-lg min-w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14101a] border-white/10 text-white">
                    {currencyPairs.filter(c => c.value !== 'ALL').map(cp => (
                      <SelectItem key={cp.value} value={cp.value} className="focus:bg-white/10 cursor-pointer text-xs">
                        {cp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Price Display */}
                <div className="flex items-center gap-1.5 ml-2 font-mono">
                  <span className={cn(
                    "text-sm font-bold",
                    priceDirections[actualPair] === 'up' ? 'text-emerald-400' :
                    priceDirections[actualPair] === 'down' ? 'text-rose-400' : 'text-white'
                  )}>
                    {currentPrice ? currentPrice.toFixed(currentPrice > 100 ? 2 : (currentPrice < 10 ? 4 : 2)) : '—'}
                  </span>
                  {priceDirections[actualPair] === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                  {priceDirections[actualPair] === 'down' && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
                </div>
              </div>

              {/* Timeframe Buttons */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/40 uppercase font-headline font-bold mr-1">Tf :</span>
                {timeframes.map(tf => (
                  <Button
                    key={tf.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartTimeframe(tf.value)}
                    className={cn(
                      "h-7 px-2 text-[10px] font-bold rounded-md font-body border-none",
                      chartTimeframe === tf.value
                        ? "bg-[#c2ff0c] text-black font-extrabold"
                        : "bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {tf.value === '1' ? '1m' : tf.value === '5' ? '5m' : tf.value === '15' ? '15m' : tf.value === '60' ? '1h' : '4h'}
                  </Button>
                ))}
              </div>

              {/* Indicator Toggles */}
              <div className="flex items-center gap-1">
                {['RSI', 'EMA', 'Bollinger Bands', 'MACD'].map(ind => (
                  <Button
                    key={ind}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleIndicator(ind)}
                    className={cn(
                      "h-7 px-2 text-[9px] font-bold rounded-md font-headline uppercase border",
                      selectedIndicators.includes(ind)
                        ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                        : "bg-white/5 text-white/30 border-white/5 hover:text-white"
                    )}
                  >
                    {ind}
                  </Button>
                ))}
              </div>
            </div>

            {/* TradingView Widget Frame */}
            <div className="flex-1 bg-black/40 border border-white/5 rounded-xl overflow-hidden relative min-h-[360px]">
              <TradingViewWidget
                symbol={actualPair}
                interval={chartTimeframe}
                indicators={selectedIndicators}
              />
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-ASSET RADAR MATRIX */}
        {activeTab === 'radar' && (
          <div className="flex flex-col h-full space-y-3 min-h-0">
            <div className="flex justify-between items-center bg-white/5 border border-white/5 p-2.5 rounded-xl">
              <span className="text-xs text-white/70 font-headline font-bold uppercase flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                Matrice Radar Multi-Paires & Détection Opportunités
              </span>
              <Badge className="bg-cyan-500/15 text-cyan-300 text-[9px] font-bold border-none uppercase font-headline">
                {radarList.length} Actifs Scannés Continu
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[480px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {radarList.map((item) => (
                  <div
                    key={item.value}
                    onClick={() => {
                      setSelectedPair(item.value);
                      setActiveTab('chart');
                    }}
                    className={cn(
                      "bg-white/5 border rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-[1.01] flex justify-between items-center group",
                      selectedPair === item.value 
                        ? "border-[#c2ff0c]/50 bg-[#c2ff0c]/5 shadow-[0_0_15px_rgba(194,255,12,0.1)]" 
                        : "border-white/5 hover:border-white/20 hover:bg-white/10"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-headline">{item.label}</span>
                        {item.botActive && (
                          <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] text-[8px] font-bold border-none uppercase px-1.5">
                            Bot Actif
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40 font-body flex items-center gap-2">
                        <span>Ticker: {item.ticker}</span>
                        <span>•</span>
                        <span className={cn(
                          "font-semibold",
                          item.rsi < 35 ? "text-emerald-400" : item.rsi > 65 ? "text-rose-400" : "text-white/60"
                        )}>
                          RSI: {item.rsi} ({item.rsiStatus})
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className={cn(
                        "text-sm font-bold font-mono transition-colors",
                        item.dir === 'up' ? "text-emerald-400" : item.dir === 'down' ? "text-rose-400" : "text-white"
                      )}>
                        {item.price ? item.price.toFixed(item.price > 100 ? 2 : (item.price < 10 ? 4 : 2)) : '—'}
                      </div>
                      <div className={cn(
                        "text-[10px] font-bold font-body flex items-center justify-end gap-1",
                        item.change >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {item.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {item.change >= 0 ? '+' : ''}{item.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REAL-TIME AI SIGNAL TERMINAL */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-full space-y-3 min-h-0">
            <div className="flex justify-between items-center bg-white/5 border border-white/5 p-2.5 rounded-xl">
              <span className="text-xs text-white/70 font-headline font-bold uppercase flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                Flux de Scan Continu Multi-Agents & Consensus IA
              </span>
              <Badge className="bg-amber-500/15 text-amber-300 text-[9px] font-bold border-none uppercase font-headline">
                {botLogs.length} Événements
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/30 border border-white/5 rounded-xl p-3 space-y-2 font-mono text-[11px] max-h-[480px]">
              {(!Array.isArray(botLogs) || botLogs.length === 0) ? (
                <div className="text-center text-white/30 py-12 font-body text-xs">
                  Aucun log de scan disponible pour l&apos;instant. Démarrez un bot en autogestion pour voir le flux en direct.
                </div>
              ) : (
                botLogs.map(log => (
                  <div key={log.id} className="bg-white/5 border border-white/5 p-2.5 rounded-lg space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={cn(
                        "font-bold uppercase font-headline",
                        log.type === 'trade' ? "text-[#c2ff0c]" : log.type === 'error' ? "text-rose-400" : "text-cyan-400"
                      )}>
                        [{log.botName}]
                      </span>
                      <span className="text-white/30 font-body">
                        {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-white/80 font-body leading-relaxed">{log.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
