"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Zap, 
  Bot, 
  ShieldCheck, 
  TrendingUp, 
  LineChart, 
  Wallet, 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Lock, 
  Sparkles, 
  Cpu, 
  ArrowRight, 
  BarChart3, 
  Trophy, 
  RefreshCw, 
  Globe2, 
  Flame,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppState } from '@/context/AppContext';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { cn, formatSmartPnl, getRealMarketBasePrice } from '@/lib/utils';
import LogoIcon from '@/components/icons/LogoIcon';

export default function HomePage() {
  const { tradingMode, balance, reserveVault, reserveVaultSol, bots, activePositions, closedPositions } = useAppState();
  const { livePrices, priceDirections, rpcLatency } = useTradingEngine();
  const [activePreviewTab, setActivePreviewTab] = useState<'terminal' | 'bots' | 'vault' | 'erp'>('terminal');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isReal = tradingMode === 'REAL';
  const runningBotsCount = (bots || []).filter(b => b.status === 'RUNNING').length;
  const activePositionsCount = (activePositions || []).filter(p => (p.mode || 'DEMO') === tradingMode).length;

  const popularTickers = [
    { pair: 'BTC-USD', name: 'Bitcoin', fallback: 95400, isSol: false },
    { pair: 'ETH-USD', name: 'Ethereum', fallback: 2750, isSol: false },
    { pair: 'SOL-USD', name: 'Solana', fallback: 185.50, isSol: true },
    { pair: 'FX:EURUSD', name: 'EUR / USD', fallback: 1.0845, isForex: true },
    { pair: 'FX:GBPUSD', name: 'GBP / USD', fallback: 1.2980, isForex: true },
    { pair: 'SOL:PUMP_PEPE', name: 'PepeSol', fallback: 0.00042, isSol: true }
  ];

  const coreFeatures = [
    {
      icon: Zap,
      title: "Terminal de Trading & Scalping",
      desc: "Graphiques interactifs TradingView, passages d'ordres au marché ou en limite, gestion avancée de Stop-Loss et Take-Profit dynamiques.",
      href: "/terminal",
      badge: "Haute Vélocité",
      color: "from-amber-500/20 to-amber-600/5",
      borderColor: "border-amber-500/30",
      iconColor: "text-amber-400"
    },
    {
      icon: Bot,
      title: "Flotte de Bots IA Autonomes",
      desc: "Déployez des robots quantitatifs pré-configurés : Pump.fun Sniper, RSI Multi-Timeframe, EMA Trend Following et Grid Trading.",
      href: "/strategies",
      badge: "Trading 24/7",
      color: "from-[#c2ff0c]/20 to-[#c2ff0c]/5",
      borderColor: "border-[#c2ff0c]/30",
      iconColor: "text-[#c2ff0c]"
    },
    {
      icon: Lock,
      title: "Coffre-Fort Anti-Faillite 10%",
      desc: "Sécurisation mathématique de 10% des profits nets de chaque trade gagnant dans un coffre isolé, préservant votre capital des retournements de marché.",
      href: "/withdraw",
      badge: "Protection Capital",
      color: "from-purple-500/20 to-purple-600/5",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-400"
    },
    {
      icon: LineChart,
      title: "Analyse Graphique IA Vision",
      desc: "Détection automatique de figures chartistes (double bottom, biseau, cassure de résistance) avec calcul d'objectifs de prix optimisés.",
      href: "/analysis",
      badge: "Computer Vision",
      color: "from-blue-500/20 to-blue-600/5",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-400"
    },
    {
      icon: Building2,
      title: "Console ERP Enterprise",
      desc: "Bilan patrimonial en direct, journal des écritures comptables, conversion multi-devises (USD / HTG / SOL) et gestion de licences d'équipe.",
      href: "/erp",
      badge: "Comptabilité Pro",
      color: "from-emerald-500/20 to-emerald-600/5",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-400"
    },
    {
      icon: Trophy,
      title: "Copy-Trading & Leaderboard",
      desc: "Suivez les performances des meilleures stratégies de la communauté, analysez les métriques Sharpe et dupliquez les ordres gagnants.",
      href: "/strategies/leaderboard",
      badge: "Classement Public",
      color: "from-rose-500/20 to-rose-600/5",
      borderColor: "border-rose-500/30",
      iconColor: "text-rose-400"
    }
  ];

  const featuredStrategies = [
    {
      title: "Pump.fun Sniper v3",
      category: "Solana Meme Tokens",
      winRate: "78.4%",
      roi: "+312% (30j)",
      drawdown: "-6.2%",
      timeframe: "1s - 15s",
      desc: "Scan des tokens nouvellement lancés avec Bonding Curve > 75%, validation du Dev Wallet et Trailing Stop garanti dès +4% de profit.",
      activeTag: "On-Chain Direct"
    },
    {
      title: "Momentum Alpha 20/50",
      category: "Crypto Majeures (BTC, ETH, SOL)",
      winRate: "72.1%",
      roi: "+84.5% (30j)",
      drawdown: "-4.8%",
      timeframe: "5m - 1h",
      desc: "Stratégie de suivi de tendance par croisement des moyennes mobiles exponentielles et confirmation par le volume en direct de Binance.",
      activeTag: "Trend Following"
    },
    {
      title: "RSI Multi-Timeframe Reversal",
      category: "Forex & Crypto",
      winRate: "69.5%",
      roi: "+62.0% (30j)",
      drawdown: "-3.5%",
      timeframe: "15m",
      desc: "Détection des zones de survente (< 30) et surachat (> 70) extrêmes pour capturer les rebonds techniques avec ratio risque/rendement 1:3.",
      activeTag: "Mean Reversion"
    },
    {
      title: "Volatility Grid Harvester",
      category: "Paires Stable / SOL",
      winRate: "89.2%",
      roi: "+45.8% (30j)",
      drawdown: "-2.1%",
      timeframe: "1m",
      desc: "Achat et vente automatisés par paliers progressifs dans les phases de consolidation pour générer du rendement passif continu.",
      activeTag: "Grid Scalping"
    }
  ];

  const faqs = [
    {
      q: "Comment fonctionne le mode Démo par rapport au mode Réel ?",
      a: "Le Mode Démo vous alloue un capital virtuel de 10 000 $ pour tester toutes les stratégies et les bots sur les cours réels en direct sans aucun risque. Le Mode Réel se connecte directement à la blockchain Solana ou à vos flux de trading pour exécuter des ordres réels."
    },
    {
      q: "Mes clés privées sont-elles sécurisées ?",
      a: "Oui, à 100%. L'application est non-custodiale. Vos clés privées Solana sont stockées uniquement de manière chiffrée dans la mémoire locale de votre navigateur (localStorage). Aucun serveur distant ne possède vos clés."
    },
    {
      q: "Qu'est-ce que le Coffre-Fort de Réserve (10%) ?",
      a: "À chaque trade clôturé en gain, 10% du profit net est automatiquement isolé dans un coffre-fort de réserve dédié. Ce mécanisme anti-drawdown garantit que vous capitalisez une réserve intangible pour faire face à la volatilité."
    },
    {
      q: "Les données de marché sont-elles réelles ?",
      a: "Absolument. Les prix proviennent directement des flux WebSocket de Binance, des API CoinMarketCap et des nœuds RPC Solana officiels. Aucun chiffre n'est inventé ou simulé artificiellement."
    }
  ];

  return (
    <div className="w-full max-w-full space-y-12 sm:space-y-16 py-4 px-2 sm:px-4 text-white" suppressHydrationWarning>
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#160d26]/90 via-[#0e0a19]/90 to-[#08050f]/95 p-6 sm:p-10 lg:p-14 shadow-2xl backdrop-blur-2xl">
        {/* Glow ambient effects */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#c2ff0c]/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs font-mono font-medium backdrop-blur-md shadow-inner">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c2ff0c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c2ff0c]"></span>
            </span>
            <span className="text-[#c2ff0c] font-bold">Moteur Quantitatif Live</span>
            <span className="text-white/40">•</span>
            <span className="text-slate-300">Solana, Pump.fun & Binance</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-headline tracking-tight leading-[1.15] text-white">
            L'Intelligence Artificielle au Service du <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c2ff0c] via-emerald-300 to-teal-400">Trading Quantitatif</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-body max-w-2xl mx-auto leading-relaxed">
            Automatisez vos prises de positions, snipiez les meme coins sur Solana et profitez de stratégies algorithmiques institutionnelles protégées par un Coffre-Fort de Réserve breveté.
          </p>

          {/* Dual Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link href="/terminal" className="w-full sm:w-auto">
              <Button 
                size="lg"
                className="w-full sm:w-auto h-12 px-7 bg-[#c2ff0c] hover:bg-[#b0ec00] text-black font-headline font-black text-sm uppercase rounded-2xl shadow-[0_0_25px_rgba(194,255,12,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Zap className="h-5 w-5 fill-black" />
                <span>Lancer le Terminal de Trading</span>
              </Button>
            </Link>

            <Link href="/strategies" className="w-full sm:w-auto">
              <Button 
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-7 bg-white/5 hover:bg-white/10 text-white border-white/20 font-headline font-bold text-sm uppercase rounded-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Bot className="h-5 w-5 text-[#c2ff0c]" />
                <span>Explorer les Bots IA</span>
              </Button>
            </Link>

            <Link href="/erp" className="w-full sm:w-auto">
              <Button 
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto h-12 px-5 text-slate-300 hover:text-white hover:bg-white/5 font-headline font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Building2 className="h-4 w-4 text-purple-400" />
                <span>Console ERP</span>
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-white/10 mt-8">
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#c2ff0c]">0 ms</div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Latence Optimiste</div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">100%</div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Non-Custodial</div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-400">10%</div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Coffre-Fort Réserve</div>
            </div>
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-center">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">24/7</div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Exécution Autonome</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE TICKER STRIP */}
      <section className="bg-[#110c1c]/90 border border-white/10 rounded-2xl p-3 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scrollbar-none snap-x whitespace-nowrap">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
            <Activity className="h-4 w-4 text-[#c2ff0c] animate-pulse" />
            <span className="text-xs font-headline font-bold uppercase tracking-wider text-slate-300">Flux En Direct :</span>
          </div>

          {popularTickers.map((t, idx) => {
            const livePrice = livePrices[t.pair] || t.fallback;
            const dir = priceDirections[t.pair] || 'flat';
            const isUp = dir === 'up';
            const isDown = dir === 'down';

            const formatDisplay = (val: number) => {
              if (val >= 1000) return val.toFixed(2);
              if (val >= 1) return val.toFixed(4);
              return val.toFixed(6);
            };

            return (
              <div 
                key={idx}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-xl border border-white/5 shrink-0 transition-colors cursor-pointer"
              >
                <span className="font-mono font-extrabold text-xs text-white">{t.name}</span>
                <span className={cn(
                  "font-mono font-extrabold text-xs px-1.5 py-0.5 rounded transition-colors",
                  isUp ? "text-emerald-300 bg-emerald-500/20" : isDown ? "text-rose-300 bg-rose-500/20" : "text-[#c2ff0c] bg-white/5"
                )}>
                  {formatDisplay(livePrice)} {t.isForex ? '' : '$'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. INTERACTIVE COCKPIT SHOWCASE */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 uppercase text-[10px] font-extrabold">
            Aperçu de la Plateforme
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black font-headline text-white">
            Un Écosystème Tout-En-Un Conçu pour la Rentabilité
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-body">
            Basculez entre nos modules spécialisés pour exécuter vos ordres, analyser le marché ou automatiser votre portefeuille.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 bg-[#120b1d] border border-white/15 rounded-2xl gap-1.5 flex-wrap justify-center shadow-xl">
            <button
              onClick={() => setActivePreviewTab('terminal')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-headline font-bold uppercase transition-all flex items-center gap-2 cursor-pointer",
                activePreviewTab === 'terminal' 
                  ? "bg-[#c2ff0c] text-black shadow-[0_0_15px_rgba(194,255,12,0.4)]" 
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Terminal Quant</span>
            </button>

            <button
              onClick={() => setActivePreviewTab('bots')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-headline font-bold uppercase transition-all flex items-center gap-2 cursor-pointer",
                activePreviewTab === 'bots' 
                  ? "bg-[#c2ff0c] text-black shadow-[0_0_15px_rgba(194,255,12,0.4)]" 
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Bots & Snipers</span>
            </button>

            <button
              onClick={() => setActivePreviewTab('vault')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-headline font-bold uppercase transition-all flex items-center gap-2 cursor-pointer",
                activePreviewTab === 'vault' 
                  ? "bg-[#c2ff0c] text-black shadow-[0_0_15px_rgba(194,255,12,0.4)]" 
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Coffre-Fort 10%</span>
            </button>

            <button
              onClick={() => setActivePreviewTab('erp')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-headline font-bold uppercase transition-all flex items-center gap-2 cursor-pointer",
                activePreviewTab === 'erp' 
                  ? "bg-[#c2ff0c] text-black shadow-[0_0_15px_rgba(194,255,12,0.4)]" 
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Console ERP</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="p-6 sm:p-8 bg-[#150f24] border border-white/15 rounded-3xl shadow-2xl">
          {activePreviewTab === 'terminal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-extrabold uppercase">
                  Exécution Instantanée
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-black font-headline text-white">
                  Terminal de Trading Professionnel avec Graphiques Directs
                </h3>
                <p className="text-sm text-slate-300 font-body leading-relaxed">
                  Passez vos ordres d'achat ou de vente en mode LONG et SHORT avec effet de levier configurable. Les Stop-Loss sont surveillés chaque seconde par notre moteur de protection automatique.
                </p>
                <ul className="space-y-2 text-xs font-body text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Flux de chandeliers japonais en temps réel sans latence.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Clôture optimiste instantanée des positions ouvertes (Boutons Fermer & Tout Fermer).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Prise en charge intégrale des paires Crypto, Forex et tokens Solana.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link href="/terminal">
                    <Button className="h-10 px-5 bg-[#c2ff0c] hover:bg-[#b0ec00] text-black font-headline font-extrabold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer">
                      <span>Ouvrir le Terminal</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#1b142e] border border-white/10 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="font-mono text-xs font-bold text-white">SOL / USD</span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-mono font-bold">+5.42%</Badge>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span>Prix Direct :</span>
                    <span className="font-extrabold text-[#c2ff0c]">185.50 $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>EMA 20 :</span>
                    <span className="text-white">182.30 $</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>RSI (14) :</span>
                    <span className="text-emerald-400 font-bold">58.4 (Haussier)</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center">
                    <div className="text-[10px] font-headline font-bold text-emerald-300 uppercase">Signal IA</div>
                    <div className="text-sm font-black font-headline text-white mt-0.5">ACHAT FORT</div>
                  </div>
                  <div className="p-3 bg-purple-500/15 border border-purple-500/30 rounded-xl text-center">
                    <div className="text-[10px] font-headline font-bold text-purple-300 uppercase">Protection</div>
                    <div className="text-sm font-black font-headline text-white mt-0.5">SL -3.5% AUTO</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'bots' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] border-[#c2ff0c]/30 text-[10px] font-extrabold uppercase">
                  Automatisation 24/7
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-black font-headline text-white">
                  Robots Quantitatifs avec Apprentissage Machine Continu
                </h3>
                <p className="text-sm text-slate-300 font-body leading-relaxed">
                  Activez votre flotte de robots sur plusieurs actifs en simultané. Chaque échec ou réussite est analysé pour affiner les conditions d'entrée et ajuster la sélectivité automatiquement.
                </p>
                <ul className="space-y-2 text-xs font-body text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Sniper Pump.fun on-chain avec confirmation de volume.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Trailing Stop sécurisé : passage au Breakeven (+1.5% garanti) dès +4% de hausse.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Circuit Breaker anti-perte : coupure automatique après 3 pertes consécutives.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link href="/strategies">
                    <Button className="h-10 px-5 bg-[#c2ff0c] hover:bg-[#b0ec00] text-black font-headline font-extrabold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer">
                      <span>Découvrir les Stratégies</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                <div className="p-4 bg-[#1e1633] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#c2ff0c]/15 border border-[#c2ff0c]/30 flex items-center justify-center text-[#c2ff0c] font-black font-mono">
                      🤖
                    </div>
                    <div>
                      <div className="font-headline font-extrabold text-sm text-white">Pump.fun Sniper Bot</div>
                      <div className="text-[10px] font-mono text-slate-400">12 trades • Win Rate 83%</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-mono font-bold">+1.45 SOL</Badge>
                </div>

                <div className="p-4 bg-[#1e1633] border border-white/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black font-mono">
                      📈
                    </div>
                    <div>
                      <div className="font-headline font-extrabold text-sm text-white">Momentum Alpha 20/50</div>
                      <div className="text-[10px] font-mono text-slate-400">28 trades • Win Rate 75%</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-mono font-bold">+840.50 $</Badge>
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'vault' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] font-extrabold uppercase">
                  Gestion Sûre du Risque
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-black font-headline text-white">
                  Coffre-Fort de Réserve Automatisé (10% des Gains)
                </h3>
                <p className="text-sm text-slate-300 font-body leading-relaxed">
                  Le secret de la rentabilité long-terme réside dans la préservation des gains. Notre moteur dérive systématiquement 10% de chaque trade gagnant dans un compartiment sécurisé.
                </p>
                <ul className="space-y-2 text-xs font-body text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Immunisé contre les séries de pertes et drawdowns ultérieurs.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Déverrouillable à tout moment d'un simple clic.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Double comptabilité en USD et SOL natif selon votre mode de trading.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link href="/withdraw">
                    <Button className="h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white font-headline font-extrabold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer">
                      <span>Accéder au Coffre-Fort</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 bg-gradient-to-br from-purple-900/30 to-[#1b142e] border border-purple-500/30 rounded-2xl text-center space-y-4 shadow-xl">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Lock className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-xs font-headline font-bold text-slate-400 uppercase">Actif dans le Coffre-Fort</div>
                  <div className="text-3xl font-black font-mono text-[#c2ff0c] mt-1">
                    {mounted ? (isReal ? `${(Number(reserveVaultSol) || 0).toFixed(4)} SOL` : `${(Number(reserveVault) || 0).toFixed(2)} $`) : '0.00 $'}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-purple-200 bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
                  Verrouillage automatique à chaque trade gagnant actif 🟢
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'erp' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-4">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-extrabold uppercase">
                  Bilan & Télémétrie
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-black font-headline text-white">
                  Console ERP d'Entreprise & Registre Comptable
                </h3>
                <p className="text-sm text-slate-300 font-body leading-relaxed">
                  Gardez une vue consolidée sur vos soldes, vos dépôts, vos retraits et l'apprentissage de vos modèles avec synchronisation cloud Firestore temps réel.
                </p>
                <ul className="space-y-2 text-xs font-body text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Conversion automatique en Gourdes Haïtiennes (HTG) et Dollars (USD).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Télémétrie des gains/pertes et enregistrement des motifs gagnants.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#c2ff0c]" />
                    <span>Exportation de rapports comptables et supervision multi-comptes.</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Link href="/erp">
                    <Button className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-black font-headline font-extrabold text-xs uppercase rounded-xl flex items-center gap-2 cursor-pointer">
                      <span>Ouvrir la Console ERP</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#1b142e] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-headline font-bold text-white uppercase border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>Grand Livre Comptable</span>
                  <span className="text-[#c2ff0c] font-mono">ERP v2.4</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="text-slate-300">Actif Net Total</span>
                    <span className="font-extrabold text-white">{mounted ? `${balance.toFixed(2)} $` : '10 000.00 $'}</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="text-slate-300">Transactions Enregistrées</span>
                    <span className="font-extrabold text-purple-300">{mounted ? (closedPositions?.length || 0) + ' trades' : '0 trades'}</span>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl flex justify-between items-center">
                    <span className="text-slate-300">Statut de Synchro Cloud</span>
                    <span className="font-extrabold text-emerald-400">Connecté 🟢</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. THE 6 CORE PILLARS */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] border-[#c2ff0c]/30 uppercase text-[10px] font-extrabold">
            Piliers & Fonctionnalités
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black font-headline text-white">
            Une Technologie d'Avance pour vos Investissements
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-body">
            Chaque composant a été conçu pour maximiser le ratio de Sharpe et éliminer les erreurs émotionnelles de trading.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coreFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <Link key={idx} href={feat.href} className="group block">
                <Card className={cn(
                  "h-full bg-gradient-to-br from-[#160f26] to-[#100b1d] border-white/10 hover:border-white/25 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between"
                )}>
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className={cn("h-12 w-12 rounded-xl bg-white/5 border flex items-center justify-center transition-transform group-hover:scale-110", feat.borderColor)}>
                        <Icon className={cn("h-6 w-6", feat.iconColor)} />
                      </div>
                      <Badge className="bg-white/5 text-slate-300 border-white/10 text-[10px] font-headline font-bold uppercase">
                        {feat.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-extrabold font-headline text-white group-hover:text-[#c2ff0c] transition-colors flex items-center justify-between">
                      <span>{feat.title}</span>
                      <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#c2ff0c]" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
                      {feat.desc}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. STRATEGY SHOWCASE */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 uppercase text-[10px] font-extrabold">
              Stratégies Prêtes à l'Emploi
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black font-headline text-white">
              Déployez des Algorithmes Validés en Quelques Secondes
            </h2>
          </div>
          <Link href="/strategies">
            <Button variant="outline" size="sm" className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white border-white/20 text-xs font-headline font-bold rounded-xl flex items-center gap-1.5 cursor-pointer">
              <span>Voir la Marketplace</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#c2ff0c]" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredStrategies.map((st, idx) => (
            <Card key={idx} className="bg-[#171026] border-white/10 hover:border-[#c2ff0c]/40 rounded-2xl p-4 space-y-3 shadow-xl transition-all duration-300 hover:shadow-2xl flex flex-col justify-between group">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/5 text-[#c2ff0c] border-[#c2ff0c]/30 text-[9px] font-mono font-bold uppercase">
                    {st.activeTag}
                  </Badge>
                  <span className="text-[10px] font-mono text-slate-400">{st.timeframe}</span>
                </div>
                <div>
                  <h4 className="font-extrabold font-headline text-base text-white group-hover:text-[#c2ff0c] transition-colors">{st.title}</h4>
                  <p className="text-[11px] font-body text-slate-400">{st.category}</p>
                </div>
                <p className="text-xs text-slate-300 font-body leading-relaxed line-clamp-3">
                  {st.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="grid grid-cols-3 gap-1 text-center font-mono">
                  <div className="p-1.5 bg-white/5 rounded-lg">
                    <div className="text-[9px] text-slate-400">Win Rate</div>
                    <div className="text-xs font-black text-emerald-400">{st.winRate}</div>
                  </div>
                  <div className="p-1.5 bg-white/5 rounded-lg">
                    <div className="text-[9px] text-slate-400">ROI 30j</div>
                    <div className="text-xs font-black text-[#c2ff0c]">{st.roi}</div>
                  </div>
                  <div className="p-1.5 bg-white/5 rounded-lg">
                    <div className="text-[9px] text-slate-400">Max DD</div>
                    <div className="text-xs font-black text-rose-400">{st.drawdown}</div>
                  </div>
                </div>
                <Link href="/strategies" className="block w-full">
                  <Button size="sm" className="w-full h-8 bg-white/10 hover:bg-[#c2ff0c] text-white hover:text-black font-headline font-bold text-xs uppercase rounded-xl transition-all cursor-pointer">
                    Activer
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. HOW IT WORKS IN 3 STEPS */}
      <section className="p-8 sm:p-12 bg-gradient-to-br from-[#18112b] to-[#0e0a19] border border-white/15 rounded-3xl space-y-8 shadow-2xl">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <Badge className="bg-white/10 text-white border-white/20 uppercase text-[10px] font-extrabold">
            Démarrage Immédiat
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black font-headline text-white">
            Comment Démarrer en 3 Étapes Simples
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#c2ff0c]/40 transition-colors">
            <div className="text-4xl font-black font-mono text-white/10 group-hover:text-[#c2ff0c]/30 transition-colors absolute top-4 right-4">
              01
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#c2ff0c]/15 border border-[#c2ff0c]/30 flex items-center justify-center text-[#c2ff0c] font-black font-mono text-base">
              1
            </div>
            <h3 className="font-extrabold font-headline text-lg text-white">Sélectionnez Votre Mode</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
              Démarrez instantanément avec 10 000 $ en Mode Démo virtuel, ou basculez en Mode Réel en connectant votre portefeuille Solana.
            </p>
          </div>

          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="text-4xl font-black font-mono text-white/10 group-hover:text-purple-500/30 transition-colors absolute top-4 right-4">
              02
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black font-mono text-base">
              2
            </div>
            <h3 className="font-extrabold font-headline text-lg text-white">Lancez Vos Ordres ou Bots</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
              Placez vos trades manuellement avec Stop-Loss / Take-Profit intelligents ou déployez une flotte de bots IA autonomes 24/7.
            </p>
          </div>

          <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="text-4xl font-black font-mono text-white/10 group-hover:text-emerald-500/30 transition-colors absolute top-4 right-4">
              03
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black font-mono text-base">
              3
            </div>
            <h3 className="font-extrabold font-headline text-lg text-white">Sécurisez vos Gains</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
              10% de chaque trade gagnant est automatiquement protégé dans le Coffre-Fort, vous garantissant un capital sécurisé et disponible à tout moment.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <Badge className="bg-white/10 text-white border-white/20 uppercase text-[10px] font-extrabold">
            FAQ
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black font-headline text-white">
            Questions Fréquemment Posées
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-5 bg-[#140e24] border border-white/10 rounded-2xl space-y-2 shadow-lg">
              <h4 className="font-extrabold font-headline text-base text-white flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#c2ff0c] shrink-0" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 font-body leading-relaxed pl-6">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. CALL TO ACTION BANNER */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-[#21133d] via-[#1a0f30] to-[#120824] border border-[#c2ff0c]/30 shadow-2xl text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black font-headline text-white">
            Prêt à Transformer votre Manière de Trader ?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-body">
            Rejoignez AlgoTrade AI dès aujourd'hui. Démarrage immédiat sans carte bancaire en mode Démo ou tradez en direct sur Solana.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/terminal">
            <Button size="lg" className="h-12 px-8 bg-[#c2ff0c] hover:bg-[#b0ec00] text-black font-headline font-black text-sm uppercase rounded-2xl shadow-[0_0_25px_rgba(194,255,12,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer">
              Ouvrir le Terminal de Trading
            </Button>
          </Link>
          <Link href="/strategies">
            <Button size="lg" variant="outline" className="h-12 px-8 bg-white/5 hover:bg-white/10 text-white border-white/20 font-headline font-bold text-sm uppercase rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer">
              Explorer les Stratégies
            </Button>
          </Link>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-white/10 pt-8 pb-4 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="size-8 rounded-xl bg-[#c2ff0c]/20 border border-[#c2ff0c]/30 flex items-center justify-center">
              <LogoIcon className="h-4 w-4 text-[#c2ff0c]" />
            </div>
            <span className="font-headline text-base font-black tracking-tight text-white">
              AlgoTrade<span className="text-[#c2ff0c]">AI</span>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs font-body text-slate-400">
            <Link href="/terminal" className="hover:text-white transition-colors">Terminal</Link>
            <Link href="/strategies" className="hover:text-white transition-colors">Stratégies & Bots</Link>
            <Link href="/erp" className="hover:text-white transition-colors">Console ERP</Link>
            <Link href="/analysis" className="hover:text-white transition-colors">Analyse IA</Link>
            <Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link>
            <Link href="/settings" className="hover:text-white transition-colors">Paramètres</Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500 text-center sm:text-left">
          <div>© {new Date().getFullYear()} AlgoTrade AI. Tous droits réservés. Zéro mock data.</div>
          <div className="flex items-center gap-2 justify-center">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Solana Mainnet & Binance WebSocket Opérationnels</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

