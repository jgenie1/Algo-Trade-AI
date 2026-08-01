"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';

interface ERPOverviewTabProps {
  totalAumUsd: number;
  convertedAum: string;
  tradingMode: 'DEMO' | 'REAL';
  solanaBalance: number | null;
  balance: number;
  botAllocatedCapitalUsd: number;
  formattedClosedProfitUsd: number;
  bots: any[];
  totalAvailableCashUsd: number;
}

export default function ERPOverviewTab({
  totalAumUsd,
  convertedAum,
  tradingMode,
  solanaBalance,
  balance,
  botAllocatedCapitalUsd,
  formattedClosedProfitUsd,
  bots,
  totalAvailableCashUsd
}: ERPOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-white/40 font-headline block">Actifs Sous Gestion (AUM)</span>
          <div className="text-2xl font-extrabold text-[#c2ff0c] font-body">
            {totalAumUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD
          </div>
          <span className="text-[10px] text-emerald-400 font-mono block font-semibold">
            ≈ {convertedAum}
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Cumul liquidités + bots + positions en cours</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-purple-400 font-headline block">Trésorerie Disponible</span>
          <div className="text-2xl font-extrabold text-white font-body">
            {tradingMode === 'REAL' 
              ? `${solanaBalance !== null ? solanaBalance.toFixed(2) : '0.00'} SOL` 
              : `${balance.toLocaleString('fr-FR')} $`
            }
          </div>
          <span className="text-[10px] text-purple-300 font-mono block font-semibold">
            {tradingMode === 'REAL' ? formatSolToUsdAndHtg(solanaBalance).combinedLabel : `≈ ${formatUsdToHtg(balance)}`}
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Réserve liquide immédiatement mobilisable</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline block">Capital Alloué aux Bots</span>
          <div className="text-2xl font-extrabold text-cyan-300 font-body">
            {botAllocatedCapitalUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
          </div>
          <span className="text-[10px] text-white/50 font-mono block">
            ≈ {formatUsdToHtg(botAllocatedCapitalUsd)}
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">{bots.length} robot(s) de trading automatisés</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-amber-400 font-headline block">Gains Réalisés Cumulés</span>
          <div className={cn("text-2xl font-extrabold font-body", formattedClosedProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formattedClosedProfitUsd >= 0 ? '+' : ''}{formattedClosedProfitUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
          </div>
          <span className="text-[10px] text-white/50 font-mono block">
            ≈ {formatUsdToHtg(formattedClosedProfitUsd)}
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Profit net clôturé sur l'organisation</span>
        </Card>
      </div>

      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white font-headline">Inventaire de Répartition des Actifs</h3>
            <p className="text-xs text-white/40 font-body mt-0.5">Ventilation du bilan comptable de l'organisation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-body">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <span className="text-xs font-bold text-slate-300 font-headline">Trésorerie Fixe</span>
            <div className="text-xl font-bold font-mono text-white">
              {((totalAvailableCashUsd / (totalAumUsd || 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-white/40">Fonds liquides non engagés</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <span className="text-xs font-bold text-cyan-400 font-headline">Bots Algorithmiques</span>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {((botAllocatedCapitalUsd / (totalAumUsd || 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-white/40">Capital sous contrôle des robots</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <span className="text-xs font-bold text-purple-400 font-headline">Margin / En cours</span>
            <div className="text-xl font-bold font-mono text-purple-300">
              {(((totalAumUsd - totalAvailableCashUsd - botAllocatedCapitalUsd) / (totalAumUsd || 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-white/40">Marge immobilisée dans les trades</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
