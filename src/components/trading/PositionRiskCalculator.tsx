"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, ShieldCheck, Percent, Zap } from 'lucide-react';
import { useAppState } from '@/context/AppContext';

interface PositionRiskCalculatorProps {
  solanaBalance?: number | null;
}

export default function PositionRiskCalculator({ solanaBalance }: PositionRiskCalculatorProps) {
  const { balance, reserveVault, reserveVaultSol, tradingMode } = useAppState();

  const isReal = tradingMode === 'REAL';
  const rawBal = isReal ? (solanaBalance || 0) : balance;
  const vaultVal = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const allocatableBalance = Math.max(0, rawBal - vaultVal);
  const currencySymbol = isReal ? 'SOL' : '$';

  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1% par défaut
  const [stopLossPips, setStopLossPips] = useState<number>(20); // 20 pips/points par défaut
  const [entryPrice, setEntryPrice] = useState<number>(145.50);

  // Calculs de gestion de risque
  const maxRiskAmount = allocatableBalance * (riskPercent / 100); // Perte max tolérée
  const recommendedTradeSize = (allocatableBalance / 3); // 1/3 de règle stricte
  const lotSizeUnits = stopLossPips > 0 ? (maxRiskAmount / (stopLossPips * 0.1)).toFixed(2) : '0';

  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-4 font-body">
      <div className="border-b border-white/5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-[#c2ff0c]" />
          <h3 className="text-sm font-extrabold font-headline uppercase text-white">
            Calculateur De Risque & Taille De Position ({isReal ? 'SOL' : 'USD'})
          </h3>
        </div>
        <span className="text-[9px] bg-[#c2ff0c]/15 text-[#c2ff0c] px-2 py-0.5 rounded font-mono font-bold uppercase">
          RISK MGMT 1% / 2%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Risque Maximal (%)</label>
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 1.0)}
              className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white pr-7"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">%</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Distance Stop Loss (Pips/Points)</label>
          <Input
            type="number"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 20)}
            className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Prix d'Entrée ($)</label>
          <Input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 145.50)}
            className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
          />
        </div>
      </div>

      {/* Result Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5 font-mono text-center">
        <div>
          <span className="text-[9px] text-white/40 block font-headline uppercase">Perte Max Risquée</span>
          <span className="text-sm font-extrabold text-rose-400">
            {isReal ? `${maxRiskAmount.toFixed(2)} SOL` : `$${maxRiskAmount.toFixed(2)}`}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-white/40 block font-headline uppercase">Taille Ordre Recommandée (1/3)</span>
          <span className="text-sm font-extrabold text-[#c2ff0c]">
            {isReal ? `${recommendedTradeSize.toFixed(2)} SOL` : `$${recommendedTradeSize.toFixed(2)}`}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[9px] text-white/40 block font-headline uppercase">Taille Lot Estimée</span>
          <span className="text-sm font-extrabold text-purple-300">{lotSizeUnits} Lots</span>
        </div>
      </div>
    </Card>
  );
}
