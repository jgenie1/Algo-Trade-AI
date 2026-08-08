"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Flame, 
  Lock, 
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { cn, formatUsdToHtg } from '@/lib/utils';
import PanicKillSwitch from '@/components/layout/PanicKillSwitch';

interface ERPRiskTabProps {
  totalAumUsd: number;
  openPositions: any[];
  bots: any[];
  tradingMode: 'DEMO' | 'REAL';
}

export default function ERPRiskTab({
  totalAumUsd,
  openPositions = [],
  bots = [],
  tradingMode
}: ERPRiskTabProps) {
  const [autoStopLoss, setAutoStopLoss] = useState(true);
  const [leverageCap, setLeverageCap] = useState(20);
  const [maxPositionSize, setMaxPositionSize] = useState(15); // % of AUM
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);

  // Compute metrics
  const activeBotsCount = bots.filter(b => b.status === 'RUNNING' || b.active).length;
  const openPositionsCount = openPositions.length;
  
  const totalMarginExposed = openPositions.reduce((sum, p) => sum + (p.amount || 0), 0);
  const riskRatio = totalAumUsd > 0 ? (totalMarginExposed / totalAumUsd) * 100 : 0;

  const riskLevel = riskRatio > 50 ? 'ÉLEVÉ' : riskRatio > 25 ? 'MODÉRÉ' : 'CONTRÔLÉ';
  const riskColor = riskRatio > 50 ? 'text-rose-400' : riskRatio > 25 ? 'text-amber-400' : 'text-emerald-400';
  const riskBg = riskRatio > 50 ? 'bg-rose-500/10 border-rose-500/20' : riskRatio > 25 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-rose-400 font-headline block flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> Niveau de Risque Global
          </span>
          <div className={cn("text-2xl font-extrabold font-body flex items-center gap-2", riskColor)}>
            {riskLevel}
          </div>
          <span className="text-[10px] text-white/50 font-mono block">
            Exposition globale: {riskRatio.toFixed(1)}% de l'AUM
          </span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-amber-400 font-headline block flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" /> Marge Engagée Actives
          </span>
          <div className="text-2xl font-extrabold text-amber-300 font-body">
            {totalMarginExposed.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
          </div>
          <span className="text-[10px] text-white/40 font-mono block">
            {openPositionsCount} position(s) ouverte(s)
          </span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-purple-400 font-headline block flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> Levier Maximal Autorisé
          </span>
          <div className="text-2xl font-extrabold text-purple-300 font-body">
            {leverageCap}x
          </div>
          <span className="text-[10px] text-white/40 font-mono block">
            Plafond paramétrable par l'Risk Manager
          </span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline block flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Protections Actives
          </span>
          <div className="text-xl font-extrabold text-emerald-400 font-body flex items-center gap-2 mt-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" /> OPÉRATIONNEL
          </div>
          <span className="text-[9px] text-white/40 font-body block mt-1">Stop Loss automatique & Coupe-circuit</span>
        </Card>
      </div>

      {/* Panic Kill Switch Integration */}
      <div className="bg-[#1a0c16] border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 border-none shadow-lg animate-pulse">
                ARRÊT D'URGENCE DE SÉCURITÉ
              </Badge>
              <span className="text-xs text-rose-300 font-mono font-bold">PROTOCOLE ERM ENTERPRISE</span>
            </div>
            <h3 className="text-xl font-extrabold text-white font-headline">
              Coupe-Circuit d'Urgence (Panic Kill-Switch)
            </h3>
            <p className="text-xs text-rose-200/70 font-body max-w-2xl">
              Ferme immédiatement toutes les positions ouvertes, stoppe l'ensemble des robots d'arbitrage et sécurise les fonds en solde liquide.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <PanicKillSwitch />
          </div>
        </div>
      </div>

      {/* Risk Parameters Form & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/10 pb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-purple-400" />
            <h3 className="text-base font-bold text-white font-headline">Paramètres de Ratios de Risque</h3>
          </div>

          <div className="space-y-4 font-body text-xs">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <div>
                <span className="font-bold text-white font-headline block">Stop-Loss Automatique Enterprise</span>
                <span className="text-slate-400 text-[10px]">Coupe automatiquement toute position atteignant -5% de perte</span>
              </div>
              <Switch checked={autoStopLoss} onCheckedChange={setAutoStopLoss} />
            </div>

            <div className="space-y-2 bg-white/5 p-3.5 rounded-xl border border-white/5">
              <div className="flex justify-between font-headline font-bold text-slate-200">
                <span>Plafond de Taille par Position</span>
                <span className="text-purple-400 font-mono">{maxPositionSize}% de l'AUM</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={maxPositionSize}
                onChange={e => setMaxPositionSize(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/30 font-mono">
                <span>1% (Conservateur)</span>
                <span>50% (Agressif)</span>
              </div>
            </div>

            <div className="space-y-2 bg-white/5 p-3.5 rounded-xl border border-white/5">
              <div className="flex justify-between font-headline font-bold text-slate-200">
                <span>Levier Maximum Autorisé</span>
                <span className="text-cyan-400 font-mono">{leverageCap}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={leverageCap}
                onChange={e => setLeverageCap(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/30 font-mono">
                <span>1x (Spot)</span>
                <span>100x (Haute Fréquence)</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/10 pb-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-headline">Règles d'Isolation & Sous-Portefeuilles</h3>
          </div>

          <div className="space-y-3 font-body text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-headline block">Sous-Portefeuilles Décentralisés (5 Sub-Wallets)</span>
                <span className="text-[10px] text-slate-400">Cloisonnement des fonds pour limiter le risque de contamination</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-none font-mono">ACTIF</Badge>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-headline block">Contrôle de Dérive du Solde (Slippage max 1%)</span>
                <span className="text-[10px] text-slate-400">Rejet des ordres hors des bandes d'écart tolérées</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-none font-mono">ACTIF</Badge>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-headline block">Monitoring en Temps Réel MEV & RPC</span>
                <span className="text-[10px] text-slate-400">Protection anti-frontrunning sur DEX Solana</span>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-none font-mono">EN VEILLE</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
