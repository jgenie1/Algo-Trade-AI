"use client";

import React, { useState } from 'react';
import { Lock, Unlock, ArrowDownLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/context/AppContext';
import { formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';

interface ReserveVaultCardProps {
  solanaBalance?: number | null;
}

export default function ReserveVaultCard({ solanaBalance }: ReserveVaultCardProps) {
  const { 
    tradingMode, 
    balance, 
    setBalance, 
    reserveVault, 
    setReserveVault, 
    reserveVaultSol, 
    setReserveVaultSol,
    setTransactions 
  } = useAppState();

  const [unlockAmount, setUnlockAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const isReal = tradingMode === 'REAL';
  const vaultAmount = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const mainBalance = isReal ? (solanaBalance || 0) : balance;
  const currencyLabel = isReal ? 'SOL' : 'USD';

  // Quick Action: Transfer 10% of main balance to Vault
  const handleLockTenPercent = () => {
    const tenPercent = mainBalance * 0.1;
    if (tenPercent <= 0) {
      setFeedbackMsg("Solde principal insuffisant pour réserver 10%.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      if (isReal) {
        setReserveVaultSol(prev => prev + tenPercent);
      } else {
        setBalance(prev => Math.max(0, prev - tenPercent));
        setReserveVault(prev => prev + tenPercent);
      }

      setTransactions(prev => [{
        id: 'tx_lock_10_' + Math.random().toString(36).substring(2, 9),
        type: 'WITHDRAW' as const,
        amount: tenPercent,
        currency: currencyLabel,
        timestamp: Date.now(),
        status: 'COMPLETED'
      }, ...(prev || [])]);

      setIsProcessing(false);
      setFeedbackMsg(`Succès ! 10% (${isReal ? tenPercent.toFixed(4) + ' SOL' : '$' + tenPercent.toFixed(2)}) transférés vers le Coffre-Fort.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }, 400);
  };

  // Transfer from Vault back to Main Balance
  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(unlockAmount) || vaultAmount;
    if (amt <= 0 || amt > vaultAmount) {
      setFeedbackMsg("Montant de déblocage invalide.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      if (isReal) {
        setReserveVaultSol(prev => Math.max(0, prev - amt));
      } else {
        setReserveVault(prev => Math.max(0, prev - amt));
        setBalance(prev => prev + amt);
      }

      setTransactions(prev => [{
        id: 'tx_unlock_vault_' + Math.random().toString(36).substring(2, 9),
        type: 'DEPOSIT' as const,
        amount: amt,
        currency: currencyLabel,
        timestamp: Date.now(),
        status: 'COMPLETED'
      }, ...(prev || [])]);

      setIsProcessing(false);
      setUnlockAmount('');
      setFeedbackMsg(`Succès ! ${isReal ? amt.toFixed(4) + ' SOL' : '$' + amt.toFixed(2)} transférés au Solde Principal.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }, 400);
  };

  return (
    <Card className="bg-gradient-to-br from-[#180e22] to-[#120818] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-5">
      {/* Background Ambient Glow */}
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-purple-600/10 blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-headline font-extrabold text-white flex items-center gap-2">
              <span>Coffre-Fort de Sécurité</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                10% SOL / USD
              </span>
            </h3>
            <p className="text-xs text-white/50 font-body">Réserve intouchable protégée contre le trading à haut risque.</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-white/40 font-headline block">Total Réserve</span>
          <span className="text-xl font-extrabold text-amber-300 font-headline">
            {isReal ? `${vaultAmount.toFixed(4)} SOL` : `$${vaultAmount.toFixed(2)}`}
          </span>
          <span className="text-[10px] text-amber-200/70 font-mono block">
            {isReal ? formatSolToUsdAndHtg(vaultAmount).combinedLabel : `≈ ${formatUsdToHtg(vaultAmount)}`}
          </span>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Action 1: Reserve 10% automatically */}
        <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-headline">
            <ShieldCheck className="h-4 w-4" />
            <span>Mise en Réserve 10%</span>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed font-body">
            Transfère automatiquement 10% de votre solde actif vers la réserve du Coffre-Fort.
          </p>
          <Button
            onClick={handleLockTenPercent}
            disabled={isProcessing || mainBalance <= 0}
            className="w-full h-10 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-xs font-bold font-headline rounded-xl"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Réserver 10% ({isReal ? (mainBalance * 0.1).toFixed(4) + ' SOL' : '$' + (mainBalance * 0.1).toFixed(2)})
          </Button>
        </div>

        {/* Action 2: Unlock / Transfer Vault to Main Balance */}
        <form onSubmit={handleUnlockVault} className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300 font-headline">
            <Unlock className="h-4 w-4" />
            <span>Débloquer vers Solde Principal</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              step="any"
              placeholder={`Montant (${currencyLabel})`}
              value={unlockAmount}
              onChange={(e) => setUnlockAmount(e.target.value)}
              className="h-10 bg-white/5 border-white/15 text-white text-xs font-mono rounded-xl"
            />
            <Button
              type="button"
              onClick={() => setUnlockAmount(vaultAmount.toString())}
              className="h-10 px-2.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold font-headline rounded-xl"
            >
              MAX
            </Button>
          </div>
          <Button
            type="submit"
            disabled={isProcessing || vaultAmount <= 0}
            className="w-full h-10 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold font-headline rounded-xl"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownLeft className="h-4 w-4 mr-2" />}
            Transférer au Solde Principal
          </Button>
        </form>
      </div>

      {/* Feedback Message */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-body animate-in fade-in">
          {feedbackMsg}
        </div>
      )}
    </Card>
  );
}
