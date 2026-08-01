"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BrainCircuit, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAnalysisConsoleCardProps {
  pair: string;
  setPair: (val: string) => void;
  timeframe: string;
  setTimeframe: (val: string) => void;
  currencyPairs: { value: string; label: string }[];
  timeframes: { value: string; label: string }[];
  selectedIndicators: string[];
  setSelectedIndicators: React.Dispatch<React.SetStateAction<string[]>>;
  handleAnalysis: () => void;
  isChartReady: boolean;
  isLoading: boolean;
  error: string | null;
  debateLogs: { agent: string; msg: string; color: string }[];
  analysis: any;
}

export default function AIAnalysisConsoleCard({
  pair,
  setPair,
  timeframe,
  setTimeframe,
  currencyPairs,
  timeframes,
  selectedIndicators,
  setSelectedIndicators,
  handleAnalysis,
  isChartReady,
  isLoading,
  error,
  debateLogs,
  analysis
}: AIAnalysisConsoleCardProps) {
  const indicatorOptions = [
    { id: 'SMA', label: 'SMA (Simple)' },
    { id: 'EMA', label: 'EMA (Exp)' },
    { id: 'RSI', label: 'RSI' },
    { id: 'MACD', label: 'MACD' },
    { id: 'Bollinger Bands', label: 'Bandes Bollinger' },
    { id: 'Volume Profile (POC)', label: 'Profil de Volume (POC)' },
    { id: 'Candlestick Patterns', label: 'Modèles de Bougies' }
  ];

  return (
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
              {currencyPairs.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
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
              {timeframes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white/60 uppercase font-headline">Indicateurs Techniques</label>
          <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5">
            {indicatorOptions.map((ind) => (
              <label key={ind.id} className="flex items-center gap-2 text-xs font-body text-white/80 cursor-pointer select-none py-1 hover:text-white transition-colors">
                <input 
                  type="checkbox"
                  checked={selectedIndicators.includes(ind.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIndicators(prev => [...prev, ind.id]);
                    } else {
                      setSelectedIndicators(prev => prev.filter(x => x !== ind.id));
                    }
                  }}
                  className="accent-[#c2ff0c] rounded border-white/20 bg-white/5 h-3.5 w-3.5"
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

        <div className="h-[1px] bg-white/5 my-4" />

        <div className="flex-1 flex flex-col justify-center min-h-[160px] p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-3">
          {error && <p className="text-red-400 text-sm text-center font-body">{error}</p>}
          
          {debateLogs.length > 0 && (
            <div className="border border-white/5 bg-[#0e0a12]/70 rounded-xl p-3 font-mono text-[9px] space-y-1.5 max-h-[140px] overflow-y-auto">
              <div className="text-[8px] uppercase tracking-wider font-bold text-white/30 font-headline mb-1 flex items-center justify-between">
                <span>Syndicate Consensus Channel</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              {debateLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-1.5 leading-normal animate-in fade-in duration-200">
                  <span className={cn("font-bold shrink-0", log.color)}>[{log.agent}] :</span>
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
  );
}
