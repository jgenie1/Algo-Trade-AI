"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BrainCircuit, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Copy, 
  CheckCircle2, 
  Search, 
  Filter, 
  Star, 
  Users, 
  BarChart3, 
  ArrowUpRight,
  Flame
} from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export interface StrategyItem {
  id: string;
  name: string;
  creator: string;
  category: 'Grid' | 'DCA' | 'Arbitrage' | 'AI Multi-Indicator' | 'Sniper';
  description: string;
  winRate: number;
  monthlyReturn: number;
  maxDrawdown: number;
  riskLevel: 'FAIBLE' | 'MODÉRÉ' | 'ÉLEVÉ';
  rating: number;
  activeUsers: number;
  pairs: string[];
  aiEngine: string;
  isPopular?: boolean;
}

export const COMMUNITY_STRATEGIES: StrategyItem[] = [
  {
    id: 'strat-1',
    name: 'Gemini SuperTrend & VWAP Momentum',
    creator: 'QuantAI Labs',
    category: 'AI Multi-Indicator',
    description: 'Combine le breakout SuperTrend 3x ATR avec le suivi de niveau VWAP et filtres RSI 14 pour capter les tendances institutionnelles.',
    winRate: 84.5,
    monthlyReturn: 28.4,
    maxDrawdown: 4.2,
    riskLevel: 'MODÉRÉ',
    rating: 4.9,
    activeUsers: 1420,
    pairs: ['SOL/USDC', 'BTC/USDT', 'ETH/USDT'],
    aiEngine: 'Gemini 2.5 Flash',
    isPopular: true
  },
  {
    id: 'strat-2',
    name: 'Pump.fun High-Speed Sniper V4',
    creator: 'AlphaSeeker',
    category: 'Sniper',
    description: 'Détecte les nouveaux listings de jetons Solana sur Pump.fun avec vérification automatique de liquidité locked et rugcheck IA.',
    winRate: 76.2,
    monthlyReturn: 64.8,
    maxDrawdown: 12.5,
    riskLevel: 'ÉLEVÉ',
    rating: 4.8,
    activeUsers: 980,
    pairs: ['SOL Memecoins', 'RAY/SOL'],
    aiEngine: 'DeepSeek R1 Quant',
    isPopular: true
  },
  {
    id: 'strat-3',
    name: 'Safe-Hedge Stablecoin Arbitrage',
    creator: 'YieldMaster',
    category: 'Arbitrage',
    description: 'Exploite les micro-décalages de prix entre les paires USDC/USDT/DAI sur PancakeSwap, Raydium et Uniswap sans risque directionnel.',
    winRate: 98.1,
    monthlyReturn: 8.5,
    maxDrawdown: 0.5,
    riskLevel: 'FAIBLE',
    rating: 4.9,
    activeUsers: 2150,
    pairs: ['USDC/USDT', 'USDC/PYUSD'],
    aiEngine: 'Algorithmique Quant',
    isPopular: false
  },
  {
    id: 'strat-4',
    name: 'Institutional Smart DCA Grid',
    creator: 'WhaleTracker',
    category: 'DCA',
    description: 'Accumulation progressive selon la volatilité moyenne (ATR) avec rentrées automatisées sur les niveaux de support clés Fibonnaci.',
    winRate: 89.0,
    monthlyReturn: 16.2,
    maxDrawdown: 3.1,
    riskLevel: 'FAIBLE',
    rating: 4.7,
    activeUsers: 840,
    pairs: ['SOL/USDC', 'ETH/USDC'],
    aiEngine: 'Gemini 2.5 Pro',
    isPopular: false
  }
];

export default function StrategyMarketplace() {
  const { bots, setBots, balance, reserveVault, tradingMode, setTradingMode } = useAppState();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allocatableBalance = Math.max(0, balance - (reserveVault || 0));

  const filteredStrategies = COMMUNITY_STRATEGIES.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = selectedRisk === 'ALL' || s.riskLevel === selectedRisk;
    return matchesSearch && matchesRisk;
  });

  const handleCopyStrategy = (strat: StrategyItem) => {
    const requiredCapital = tradingMode === 'REAL' ? 0.1 : 500;
    if (tradingMode === 'DEMO' && allocatableBalance < requiredCapital) {
      alert(`Capital allocable insuffisant pour démarrer la stratégie ($${allocatableBalance.toFixed(2)} disponibles). Requis: $${requiredCapital}. Le Coffre-Fort de Réserve 10% ($${(Number(reserveVault) || 0).toFixed(2)}) est intouchable.`);
      return;
    }

    const newBot = {
      id: `bot-${Date.now()}`,
      name: `[Copie] ${strat.name}`,
      pair: strat.pairs[0] || 'SOL/USDC',
      strategy: strat.category === 'Sniper' ? 'Pump.fun Sniper Bot' : strat.name,
      status: 'RUNNING',
      pnl: 0,
      pnlPercent: 0,
      capital: requiredCapital,
      tradesCount: 0,
      winRate: strat.winRate,
      aiModel: strat.aiEngine,
      mode: tradingMode,
      stopLossPct: 3.0,
      takeProfitPct: 8.0,
      trailingStopPct: 2.0
    };

    setBots([...bots, newBot]);
    setCopiedId(strat.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 text-white font-body">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/20 to-black border border-white/10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 text-xs font-bold font-headline uppercase">
            <Flame className="h-3.5 w-3.5" />
            Marketplace De Stratégies & Copy-Trading IA
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-white">
            Copiez Les Meilleurs Algorithmes Déployés Par La Communauté
          </h1>
          <p className="text-sm text-white/70">
            Explorez des modèles de trading optimisés par IA, testés on-chain avec métriques de performance et taux de réussite en temps réel.
          </p>
        </div>

        <Link
          href="/strategies/leaderboard"
          className="px-5 py-3 bg-[#c2ff0c] text-black font-extrabold font-headline rounded-2xl text-xs uppercase hover:bg-[#c2ff0c]/90 hover:shadow-[0_0_20px_rgba(194,255,12,0.3)] transition-all flex items-center gap-2 shrink-0 border-none"
        >
          Voir Le Classement Leaders
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une stratégie, paire ou modèle IA..."
            className="pl-10 h-11 bg-white/5 border-white/10 rounded-2xl text-xs text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="h-4 w-4 text-white/40 shrink-0" />
          <span className="text-xs text-white/50 font-headline uppercase font-bold shrink-0">Risque :</span>
          {(['ALL', 'FAIBLE', 'MODÉRÉ', 'ÉLEVÉ'] as const).map(risk => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={`px-3 py-1.5 rounded-xl text-xs font-headline font-bold uppercase transition-all shrink-0 ${
                selectedRisk === risk
                  ? 'bg-[#c2ff0c] text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Active App Bots Section (Dynamic App State) */}
      {bots.length > 0 && (
        <div className="space-y-4 bg-purple-950/20 border border-purple-500/30 rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#c2ff0c]" />
              <h2 className="text-lg font-bold font-headline text-white">Vos Bots & Stratégies d'App en Tâche de Fond ({bots.length})</h2>
            </div>
            <Link href="/?tab=bots" className="text-xs text-[#c2ff0c] font-headline font-bold hover:underline">
              Gérer dans le Terminal →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {bots.map(bot => {
              const pnlVal = bot.pnl || 0;
              const isProfit = pnlVal >= 0;
              return (
                <div key={bot.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-headline text-white truncate max-w-[140px]">{bot.name}</span>
                    <Badge className={bot.status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-300 text-[9px]' : 'bg-amber-500/20 text-amber-300 text-[9px]'}>
                      {bot.status === 'RUNNING' ? 'EN EXÉCUTION' : 'EN PAUSE'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Paire:</span>
                    <span className="text-purple-300 font-bold">{bot.pair}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">PnL Direct:</span>
                    <span className={isProfit ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {isProfit ? '+' : ''}{pnlVal.toFixed(2)} {bot.mode === 'REAL' ? 'SOL' : '$'} ({bot.pnlPercent || 0}%)
                    </span>
                  </div>
                  <div className="text-[10px] text-white/30 pt-1 border-t border-white/5 flex justify-between">
                    <span>Capital: {bot.capital} {bot.mode === 'REAL' ? 'SOL' : '$'}</span>
                    <span>Modèle: {bot.aiModel || 'Gemini 2.5'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Community Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredStrategies.map(strat => (
          <Card key={strat.id} className="bg-[#14101a] border-white/10 hover:border-[#c2ff0c]/50 transition-all rounded-3xl p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-extrabold font-headline text-white truncate min-w-0">{strat.name}</h3>
                    {strat.isPopular && (
                      <Badge className="bg-amber-500/20 text-amber-300 font-headline text-[9px] uppercase border-none">
                        TOP POPULAIRE
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/40 font-mono">Créé par <span className="text-purple-300 font-bold">{strat.creator}</span></p>
                </div>

                <Badge className={`font-mono text-[10px] uppercase border-none ${
                  strat.riskLevel === 'FAIBLE' ? 'bg-emerald-500/20 text-emerald-300' :
                  strat.riskLevel === 'MODÉRÉ' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  Risque {strat.riskLevel}
                </Badge>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                {strat.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/5 font-mono text-center">
                <div>
                  <span className="text-[10px] text-white/40 block font-headline uppercase">Win Rate</span>
                  <span className="text-sm font-extrabold text-emerald-400">{strat.winRate}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-headline uppercase">Rendement Mensuel</span>
                  <span className="text-sm font-extrabold text-[#c2ff0c]">+{strat.monthlyReturn}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-headline uppercase">Drawdown Max</span>
                  <span className="text-sm font-extrabold text-rose-400">-{strat.maxDrawdown}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-white/50">
                <span className="flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5 text-[#c2ff0c]" />
                  {strat.aiEngine}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  {strat.activeUsers} Traders
                </span>
              </div>
            </div>

            <Button
              onClick={() => handleCopyStrategy(strat)}
              className={`w-full h-11 font-extrabold font-headline rounded-2xl text-xs uppercase flex items-center justify-center gap-2 border-none transition-all ${
                copiedId === strat.id
                  ? 'bg-emerald-400 text-black'
                  : 'bg-[#c2ff0c] text-black hover:shadow-[0_0_20px_rgba(194,255,12,0.3)]'
              }`}
            >
              {copiedId === strat.id ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Stratégie Ajoutée À Vos Bots !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier Cette Stratégie En 1 Clic
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
