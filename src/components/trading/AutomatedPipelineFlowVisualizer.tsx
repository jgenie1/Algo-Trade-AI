"use client";

import React, { useState, useEffect } from 'react';
import { 
  Scan, 
  ShieldCheck, 
  BarChart3, 
  Zap, 
  Cpu, 
  Link as LinkIcon, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  Wallet, 
  Sparkles,
  RefreshCw,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PipelineStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badgeText: string;
  status: 'ACTIVE' | 'DONE' | 'WAITING';
  color: string;
  borderColor: string;
  bgColor: string;
  details: string;
}

export default function AutomatedPipelineFlowVisualizer() {
  const { tradingMode, activePositions, closedPositions, bots } = useAppState();
  const [activeStep, setActiveStep] = useState<number>(1);

  const activeBotCount = bots.filter(b => b.status === 'RUNNING').length;
  const realSolPositions = activePositions.filter(p => (p.mode || 'DEMO') === tradingMode).length;
  const recentClosed = closedPositions.filter(p => (p.mode || 'DEMO') === tradingMode);
  const totalProfit = recentClosed.reduce((sum, p) => sum + (p.profit || 0), 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev >= 10 ? 1 : prev + 1));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const steps: PipelineStep[] = [
    {
      id: 1,
      title: "1. TOKEN SCANNING",
      subtitle: "Pump.fun & DexScreener API",
      icon: Scan,
      badgeText: "3,400+ Mints/min",
      status: activeStep === 1 ? 'ACTIVE' : activeStep > 1 ? 'DONE' : 'WAITING',
      color: "text-[#c2ff0c]",
      borderColor: "border-[#c2ff0c]/40",
      bgColor: "bg-[#c2ff0c]/10",
      details: "Analyse en continu du mempool et des paires récemment créées sur Solana et BSC."
    },
    {
      id: 2,
      title: "2. ANTI-SCAM ENGINE",
      subtitle: "Vérification Rug Pull",
      icon: ShieldCheck,
      badgeText: "Dev & Liquidity Check",
      status: activeStep === 2 ? 'ACTIVE' : activeStep > 2 ? 'DONE' : 'WAITING',
      color: "text-purple-400",
      borderColor: "border-purple-500/40",
      bgColor: "bg-purple-500/10",
      details: "Audit automatique de la répartition des holders, de l'adresse du créateur et du verrouillage de liquidité."
    },
    {
      id: 3,
      title: "3. QUALITY & RISK SCORE",
      subtitle: "Algorithme Prédictif IA",
      icon: BarChart3,
      badgeText: "Probabilités x10 / x100",
      status: activeStep === 3 ? 'ACTIVE' : activeStep > 3 ? 'DONE' : 'WAITING',
      color: "text-cyan-400",
      borderColor: "border-cyan-500/40",
      bgColor: "bg-cyan-500/10",
      details: "Calcul du ratio Qualité/Risque. Les jetons avec un score < 75/100 sont rejetés immédiatement."
    },
    {
      id: 4,
      title: "4. BUY SIGNAL EMISSION",
      subtitle: "Déclencheur d'Achat Instantané",
      icon: Zap,
      badgeText: "Signal Confirmé",
      status: activeStep === 4 ? 'ACTIVE' : activeStep > 4 ? 'DONE' : 'WAITING',
      color: "text-amber-400",
      borderColor: "border-amber-500/40",
      bgColor: "bg-amber-500/10",
      details: "Émission du signal d'achat haute fréquence aux sous-portefeuilles des robots."
    },
    {
      id: 5,
      title: "5. EXECUTION ENGINE",
      subtitle: "PumpPortal / Raydium Swap",
      icon: Cpu,
      badgeText: "Slippage 15% Max",
      status: activeStep === 5 ? 'ACTIVE' : activeStep > 5 ? 'DONE' : 'WAITING',
      color: "text-[#c2ff0c]",
      borderColor: "border-[#c2ff0c]/40",
      bgColor: "bg-[#c2ff0c]/10",
      details: "Routage optimal et signature ultrarapide du payload via les sous-portefeuilles."
    },
    {
      id: 6,
      title: "6. SOLANA TX CONFIRMED",
      subtitle: "Confirmation RPC Blockhash",
      icon: LinkIcon,
      badgeText: "Mainnet Confirmed",
      status: activeStep === 6 ? 'ACTIVE' : activeStep > 6 ? 'DONE' : 'WAITING',
      color: "text-emerald-400",
      borderColor: "border-emerald-500/40",
      bgColor: "bg-emerald-500/10",
      details: "Validation du hash de transaction et confirmation d'inclusion on-chain."
    },
    {
      id: 7,
      title: "7. POSITION OPENED",
      subtitle: "Suivi Temps Réel",
      icon: TrendingUp,
      badgeText: `${realSolPositions} Positions Actives`,
      status: activeStep === 7 ? 'ACTIVE' : activeStep > 7 ? 'DONE' : 'WAITING',
      color: "text-blue-400",
      borderColor: "border-blue-500/40",
      bgColor: "bg-blue-500/10",
      details: "Suivi en temps réel des bougies et du PnL flottant sur le terminal."
    },
    {
      id: 8,
      title: "8. TP / SL ENGINE",
      subtitle: "Trailing Stop & Target",
      icon: Target,
      badgeText: "Stop Loss Suiveur",
      status: activeStep === 8 ? 'ACTIVE' : activeStep > 8 ? 'DONE' : 'WAITING',
      color: "text-purple-400",
      borderColor: "border-purple-500/40",
      bgColor: "bg-purple-500/10",
      details: "Déclenchement automatique de la vente dès l'atteinte du Take-Profit ou du Stop-Loss."
    },
    {
      id: 9,
      title: "9. SELL & SOLANA TX",
      subtitle: "Clôture & Échange SOL",
      icon: RefreshCw,
      badgeText: "Ordre Vente Validé",
      status: activeStep === 9 ? 'ACTIVE' : activeStep > 9 ? 'DONE' : 'WAITING',
      color: "text-amber-400",
      borderColor: "border-amber-500/40",
      bgColor: "bg-amber-500/10",
      details: "Conversion 100% des tokens vers SOL natif sur le réseau Solana Mainnet."
    },
    {
      id: 10,
      title: "10. PROFIT CONFIRMED",
      subtitle: "Virement Master Wallet",
      icon: Wallet,
      badgeText: "Profit Sweep Actif",
      status: activeStep === 10 ? 'ACTIVE' : 'WAITING',
      color: "text-[#c2ff0c]",
      borderColor: "border-[#c2ff0c]/60",
      bgColor: "bg-[#c2ff0c]/20",
      details: "Balayage automatique des bénéfices (90% Master Wallet, 10% Coffre-Fort) et augmentation du solde on-chain."
    }
  ];

  const currentActive = steps.find(s => s.id === activeStep) || steps[0];

  return (
    <Card className="bg-[#0b0814]/90 backdrop-blur-2xl border border-white/12 rounded-2xl p-5 md:p-6 space-y-6 shadow-2xl overflow-hidden relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#c2ff0c]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c2ff0c] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c2ff0c]"></span>
            </span>
            <h2 className="text-xl font-extrabold tracking-tight font-headline text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#c2ff0c]" />
              Pipeline d'Exécution & Auto-Virement des Gains IA
            </h2>
          </div>
          <p className="text-xs text-white/50 mt-1 font-body">
            Flux de trading automatisé en 10 étapes : du scan anti-scam jusqu'au virement des bénéfices réels sur votre wallet.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 font-headline font-bold text-[10px] uppercase px-3 py-1">
            <Sparkles className="h-3 w-3 mr-1 text-[#c2ff0c]" />
            {activeBotCount} Robots en Exécution
          </Badge>
          <Badge className={cn(
            "font-headline font-bold text-[10px] uppercase px-3 py-1 border-none",
            tradingMode === 'REAL' ? "bg-purple-600/30 text-purple-200" : "bg-amber-500/20 text-amber-300"
          )}>
            {tradingMode} MODE
          </Badge>
        </div>
      </div>

      {/* Grid Flow Visualizer */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative z-10 font-body">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === activeStep;
          const isDone = step.id < activeStep;

          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={cn(
                "p-3.5 rounded-xl border transition-all duration-300 cursor-pointer relative group flex flex-col justify-between h-32",
                isActive 
                  ? `${step.bgColor} ${step.borderColor} shadow-[0_0_20px_rgba(194,255,12,0.15)] scale-[1.02]` 
                  : isDone
                    ? "bg-white/[0.03] border-white/10 opacity-80 hover:opacity-100"
                    : "bg-white/[0.01] border-white/5 opacity-40 hover:opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-colors",
                  isActive ? `${step.bgColor} ${step.color} ${step.borderColor}` : "bg-white/5 border-white/10 text-white/60"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <span className="text-[9px] font-mono font-bold text-white/30">#{step.id}</span>
                )}
              </div>

              <div>
                <h3 className={cn(
                  "text-xs font-bold font-headline truncate mt-2",
                  isActive ? "text-white" : "text-white/70"
                )}>
                  {step.title}
                </h3>
                <p className="text-[9px] text-white/40 font-mono truncate">{step.subtitle}</p>
              </div>

              <span className={cn(
                "text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded w-max mt-1",
                isActive ? "bg-[#c2ff0c] text-black font-extrabold" : "bg-white/5 text-white/50"
              )}>
                {step.badgeText}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Step Details Panel */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] border border-[#c2ff0c]/30 text-[10px] font-mono font-bold uppercase">
              Étape #{currentActive.id} en direct
            </Badge>
            <h4 className="text-sm font-bold font-headline text-white">{currentActive.title}</h4>
          </div>
          <p className="text-xs text-white/60 font-body leading-relaxed max-w-3xl">
            {currentActive.details}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-[9px] text-white/40 uppercase font-headline block">Gains Réels Cumulés</span>
            <span className="text-sm font-mono font-extrabold text-[#c2ff0c]">
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(4)} {tradingMode === 'REAL' ? 'SOL' : '$'}
            </span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-[#c2ff0c] animate-ping" />
        </div>
      </div>
    </Card>
  );
}
