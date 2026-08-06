"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wand2, Sparkles, Bot, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { currencyPairs, timeframes } from '@/hooks/useTradingSimulation';
import { getLearningTelemetrySummary } from '@/services/aiClosedLoopLearningService';

export default function AIStrategyGeneratorForm() {
  const { tradingMode, balance, setBalance, setBots, setBotLogs } = useAppState();

  const [prompt, setPrompt] = useState<string>(
    "Achat automatique sur EUR/USD en 15min si RSI < 35 ou cassure VWAP, avec Take Profit 4% et Stop Loss 1.5%."
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [compiledStrategy, setCompiledStrategy] = useState<{
    name: string;
    pair: string;
    timeframe: string;
    capital: number;
    rulesSummary: string[];
    tpPct: number;
    slPct: number;
    leverage: number;
  } | null>(null);

  const [isActivated, setIsActivated] = useState<boolean>(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setIsActivated(false);

    setTimeout(() => {
      // Natural language prompt parsing heuristic
      const lower = prompt.toLowerCase();

      let pair = 'ALL';
      if (lower.includes('eur') || lower.includes('eur/usd')) pair = 'FX:EURUSD';
      else if (lower.includes('btc') || lower.includes('bitcoin')) pair = 'BTC';
      else if (lower.includes('sol') || lower.includes('solana')) pair = 'SOL';
      else if (lower.includes('gbp')) pair = 'FX:GBPUSD';
      else if (lower.includes('gold') || lower.includes('or')) pair = 'GOLD';

      let timeframe = '15';
      if (lower.includes('1m') || lower.includes('1 min')) timeframe = '1';
      else if (lower.includes('5m') || lower.includes('5 min')) timeframe = '5';
      else if (lower.includes('1h') || lower.includes('1 heure')) timeframe = '60';

      let tpPct = 3.5;
      const tpMatch = lower.match(/take profit\s*([0-9.]+)|tp\s*([0-9.]+)/i);
      if (tpMatch) tpPct = parseFloat(tpMatch[1] || tpMatch[2]) || 3.5;

      let slPct = 1.5;
      const slMatch = lower.match(/stop loss\s*([0-9.]+)|sl\s*([0-9.]+)/i);
      if (slMatch) slPct = parseFloat(slMatch[1] || slMatch[2]) || 1.5;

      setCompiledStrategy({
        name: `Bot Sur-Mesure IA (${pair.replace('FX:', '')})`,
        pair,
        timeframe,
        capital: 1000,
        rulesSummary: [
          `Paire d'analyse : ${pair === 'ALL' ? 'Scan Global' : pair}`,
          `Indicateurs combinés : RSI < 35, Dynamic SuperTrend & VWAP`,
          `Gestion du Risque : TP +${tpPct}% | SL -${slPct}%`,
          `Fréquence d'exécution : Bougie ${timeframe} minute(s)`
        ],
        tpPct,
        slPct,
        leverage: 5
      });

      setIsGenerating(false);
    }, 1000);
  };

  const handleActivateBot = () => {
    if (!compiledStrategy) return;

    const newBot = {
      id: 'bot_ai_' + Math.random().toString(36).substring(2, 9),
      pair: compiledStrategy.pair,
      strategy: 'AI Autopilot (Machine à Cash)',
      timeframe: compiledStrategy.timeframe,
      capital: compiledStrategy.capital,
      status: 'RUNNING',
      createdAt: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      consecutiveLosses: 0,
      netProfit: 0,
      selectivityMultiplier: 1.0,
      mode: tradingMode,
      customRules: prompt
    };

    setBots(prev => [...prev, newBot]);
    setBalance(bal => Math.max(0, bal - compiledStrategy.capital));

    setBotLogs(prev => [
      {
        id: 'log_' + Date.now(),
        botId: newBot.id,
        botName: compiledStrategy.name,
        message: `🤖 Bot IA généré par Prompt activé avec succès ! Règles : "${prompt}"`,
        type: 'info',
        timestamp: Date.now()
      },
      ...prev
    ]);

    setIsActivated(true);
  };

  return (
    <Card className="shadow-xl bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-5">
      <CardHeader className="p-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#c2ff0c]/10 border border-[#c2ff0c]/20 rounded-xl">
            <Wand2 className="h-6 w-6 text-[#c2ff0c]" />
          </div>
          <div>
            <CardTitle className="text-base font-headline font-bold text-white flex items-center gap-2">
              <span>Forge de Stratégies IA (Prompt-to-Bot)</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-headline font-bold uppercase">
                IA Generative
              </span>
            </CardTitle>
            <CardDescription className="text-xs font-body text-white/50">
              Décrivez vos règles de trading en langage naturel. L'IA génère et déploie le bot en 1 clic.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Closed-Loop Auto-Learning Status Banner */}
        {(() => {
          const summary = getLearningTelemetrySummary();
          return (
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[11px] font-headline font-bold">
                <span className="text-emerald-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                  Auto-Learning Télemetrie ({summary.winRatePct}% Win Rate)
                </span>
                <span className="text-white/40 font-mono font-normal">
                  {summary.totalTradesRecorded} trades analysés
                </span>
              </div>
              <p className="text-[10px] text-white/50 font-body">
                {summary.recommendedPromptTuning}
              </p>
            </div>
          );
        })()}

        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Règles de Trading (Prompt)</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ex: Achète du BTC quand le RSI repasse au-dessus de 30 avec un Take Profit à 5% et Stop Loss à 2%..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[#c2ff0c] font-body resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-headline font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin text-[#c2ff0c]" />
                Compilations des règles par l'IA...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#c2ff0c]" />
                Générer la Stratégie IA
              </>
            )}
          </Button>
        </form>

        {/* Compiled Strategy Preview Card */}
        {compiledStrategy && (
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-[#c2ff0c] font-headline flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-[#c2ff0c]" />
                {compiledStrategy.name}
              </h4>
              <span className="text-[10px] text-white/40 font-mono">Prêt au déploiement</span>
            </div>

            <ul className="space-y-1 text-xs text-white/80 font-body">
              {compiledStrategy.rulesSummary.map((rule, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              {isActivated ? (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-headline font-bold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  Bot IA activé et ajouté au gestionnaire !
                </div>
              ) : (
                <Button
                  onClick={handleActivateBot}
                  className="w-full h-10 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-headline font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Lancer ce Bot IA</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
