"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowDownLeft, ShieldCheck, RefreshCw, Zap, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/context/AppContext';
import { formatSolToUsdAndHtg, formatUsdToHtg, cn } from '@/lib/utils';
import { getRealSolanaBalance } from '@/services/pumpFunService';

interface ReserveVaultCardProps {
  solanaBalance?: number | null;
}

export default function ReserveVaultCard({ solanaBalance: propSolBalance }: ReserveVaultCardProps) {
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

  const [fetchedSolBalance, setFetchedSolBalance] = useState<number | null>(propSolBalance ?? null);
  const [lockAmount, setLockAmount] = useState<string>('');
  const [unlockAmount, setUnlockAmount] = useState<string>('');
  const [selectedLockPct, setSelectedLockPct] = useState<number>(10);
  const [autoReserveWinningTrades, setAutoReserveWinningTrades] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync propSolBalance to state or auto-fetch live Solana balance in REAL mode
  useEffect(() => {
    if (propSolBalance !== undefined && propSolBalance !== null) {
      setFetchedSolBalance(propSolBalance);
    } else if (tradingMode === 'REAL') {
      getRealSolanaBalance().then(res => {
        if (res && res.success && res.balance !== undefined) {
          setFetchedSolBalance(res.balance);
        }
      });
    }
  }, [propSolBalance, tradingMode]);

  // Load auto-reserve preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAuto = localStorage.getItem('auto_reserve_10_percent_enabled');
      if (storedAuto !== null) {
        setAutoReserveWinningTrades(storedAuto === 'true');
      }
    }
  }, []);

  const toggleAutoReserve = () => {
    const nextVal = !autoReserveWinningTrades;
    setAutoReserveWinningTrades(nextVal);
    localStorage.setItem('auto_reserve_10_percent_enabled', String(nextVal));
    setFeedbackMsg({
      text: nextVal 
        ? "Réserve automatique de 10% des gains ACTIVÉE." 
        : "Réserve automatique des gains DÉSACTIVÉE.",
      type: 'success'
    });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const isReal = tradingMode === 'REAL';
  const vaultAmount = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const activeBalance = isReal ? (fetchedSolBalance || 0) : balance;
  const currencyLabel = isReal ? 'SOL' : 'USD';

  // Lock funds into Vault
  const handleLockAmount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedbackMsg(null);

    let amountToLock = parseFloat(lockAmount);
    if (isNaN(amountToLock) || amountToLock <= 0) {
      amountToLock = activeBalance * (selectedLockPct / 100);
    }

    if (amountToLock <= 0) {
      setFeedbackMsg({ text: "Solde principal insuffisant pour effectuer la réservation.", type: 'error' });
      return;
    }

    if (isReal && activeBalance < amountToLock) {
      setFeedbackMsg({ text: `Solde Solana insuffisant (${activeBalance.toFixed(4)} SOL disponibles).`, type: 'error' });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      if (isReal) {
        setReserveVaultSol(prev => {
          const updated = prev + amountToLock;
          localStorage.setItem('trade_reserve_vault_sol', updated.toString());
          return updated;
        });
        setFetchedSolBalance(prev => prev !== null ? Math.max(0, prev - amountToLock) : null);
      } else {
        const newBal = Math.max(0, balance - amountToLock);
        setBalance(newBal);
        localStorage.setItem('trade_balance', newBal.toString());

        setReserveVault(prev => {
          const updated = prev + amountToLock;
          localStorage.setItem('trade_reserve_vault', updated.toString());
          return updated;
        });
      }

      setTransactions(prev => [{
        id: 'tx_lock_' + Math.random().toString(36).substring(2, 9),
        type: 'WITHDRAW' as const,
        amount: amountToLock,
        currency: currencyLabel,
        timestamp: Date.now(),
        status: 'COMPLETED'
      }, ...(prev || [])]);

      setIsProcessing(false);
      setLockAmount('');
      const formattedStr = isReal ? `${amountToLock.toFixed(4)} SOL` : `$${amountToLock.toFixed(2)}`;
      setFeedbackMsg({ text: `Succès ! ${formattedStr} réservés dans le Coffre-Fort.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 4500);
    }, 400);
  };

  // Unlock funds back to Main Account
  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const amt = parseFloat(unlockAmount) || vaultAmount;
    if (amt <= 0 || amt > vaultAmount) {
      setFeedbackMsg({ text: "Montant invalide ou supérieur au solde du coffre.", type: 'error' });
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      if (isReal) {
        setReserveVaultSol(prev => {
          const updated = Math.max(0, prev - amt);
          localStorage.setItem('trade_reserve_vault_sol', updated.toString());
          return updated;
        });
        setFetchedSolBalance(prev => prev !== null ? prev + amt : amt);
      } else {
        setReserveVault(prev => {
          const updated = Math.max(0, prev - amt);
          localStorage.setItem('trade_reserve_vault', updated.toString());
          return updated;
        });
        setBalance(prev => {
          const updated = prev + amt;
          localStorage.setItem('trade_balance', updated.toString());
          return updated;
        });
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
      const formattedStr = isReal ? `${amt.toFixed(4)} SOL` : `$${amt.toFixed(2)}`;
      setFeedbackMsg({ text: `Succès ! ${formattedStr} transférés au Solde Principal.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 4500);
    }, 400);
  };

  return (
    <Card className="bg-[#14101a] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-6">
      {/* Top Ambient Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-purple-500/50 to-[#c2ff0c]/40" />

      {/* Card Header & Main Vault Metric */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shadow-inner shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-headline font-bold text-white tracking-tight">Coffre-Fort de Sécurité</h3>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                10% SOL / USD
              </span>
            </div>
            <p className="text-xs text-white/40 font-body mt-0.5">
              Réserve intouchable protégée contre le drawdown et le trading à haut risque.
            </p>
          </div>
        </div>

        {/* Vault Total Display Box */}
        <div className="w-full md:w-auto bg-white/[0.03] border border-white/10 p-3.5 rounded-xl flex md:flex-col justify-between items-end md:items-end">
          <span className="text-[10px] uppercase font-bold text-amber-400/90 font-headline">Réserve du Coffre</span>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-300 font-headline tracking-tight">
              {isReal ? `${vaultAmount.toFixed(4)} SOL` : `$${vaultAmount.toFixed(2)}`}
            </div>
            <div className="text-[11px] text-white/40 font-mono font-medium">
              {isReal ? formatSolToUsdAndHtg(vaultAmount).combinedLabel : `≈ ${formatUsdToHtg(vaultAmount)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Reserve 10% Switch Banner */}
      <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#c2ff0c]/10 text-[#c2ff0c] rounded-lg border border-[#c2ff0c]/20">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white font-headline block">Sécurisation Automatique des Gains</span>
            <span className="text-[11px] text-white/40 font-body block">Prélève automatiquement 10% de chaque trade gagnant en Mode {tradingMode}.</span>
          </div>
        </div>

        <button
          onClick={toggleAutoReserve}
          className={cn(
            "h-8 px-3.5 rounded-xl text-[10px] font-extrabold font-headline transition-all border flex items-center gap-1.5 shrink-0 cursor-pointer",
            autoReserveWinningTrades 
              ? "bg-[#c2ff0c]/15 text-[#c2ff0c] border-[#c2ff0c]/40 hover:bg-[#c2ff0c]/25" 
              : "bg-white/5 text-white/40 border-white/10 hover:text-white"
          )}
        >
          {autoReserveWinningTrades && <CheckCircle2 className="h-3.5 w-3.5 text-[#c2ff0c]" />}
          {autoReserveWinningTrades ? "ACTIVÉE" : "DÉSACTIVÉE"}
        </button>
      </div>

      {/* Action Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Panel: Deposit / Reserve into Vault */}
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-headline flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Mettre en Réserve
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                Dispo: {isReal ? `${activeBalance.toFixed(4)} SOL` : `$${activeBalance.toFixed(2)}`}
              </span>
            </div>

            <p className="text-[11px] text-white/40 font-body">
              Transférez une portion de vos fonds actifs vers le coffre-fort :
            </p>

            {/* Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 25, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setSelectedLockPct(pct);
                    setLockAmount('');
                  }}
                  className={cn(
                    "py-1.5 text-[10px] font-bold font-headline rounded-lg border transition-all cursor-pointer",
                    selectedLockPct === pct && !lockAmount
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-white/5 text-white/40 border-white/10 hover:text-white"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <Input
                type="number"
                step="any"
                placeholder={`Montant (${currencyLabel})`}
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                className="h-10 bg-white/5 border-white/15 text-white text-xs font-mono rounded-xl pr-12"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold text-white/40 font-mono">
                {currencyLabel}
              </span>
            </div>
          </div>

          <Button
            onClick={() => handleLockAmount()}
            disabled={isProcessing || activeBalance <= 0}
            className="w-full h-10 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold font-headline rounded-xl cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
            Réserver {lockAmount ? `${lockAmount} ${currencyLabel}` : `${selectedLockPct}% (${isReal ? (activeBalance * (selectedLockPct/100)).toFixed(4) + ' SOL' : '$' + (activeBalance * (selectedLockPct/100)).toFixed(2)})`}
          </Button>
        </div>

        {/* Right Panel: Unlock / Transfer back to Main Balance */}
        <form onSubmit={handleUnlockVault} className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 font-headline flex items-center gap-1.5">
                <Unlock className="h-4 w-4 text-purple-400" />
                Débloquer au Solde Principal
              </span>
              <span className="text-[10px] text-amber-300/80 font-mono font-bold">
                Coffre: {isReal ? `${vaultAmount.toFixed(4)} SOL` : `$${vaultAmount.toFixed(2)}`}
              </span>
            </div>

            <p className="text-[11px] text-white/40 font-body">
              Récupérez vos SOL/USD réservés pour trader ou retirer :
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  step="any"
                  placeholder={`Montant à débloquer`}
                  value={unlockAmount}
                  onChange={(e) => setUnlockAmount(e.target.value)}
                  className="h-10 bg-white/5 border-white/15 text-white text-xs font-mono rounded-xl pr-12"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-bold text-white/40 font-mono">
                  {currencyLabel}
                </span>
              </div>
              <Button
                type="button"
                onClick={() => setUnlockAmount(vaultAmount.toString())}
                className="h-10 px-3 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-[10px] font-bold font-headline rounded-xl cursor-pointer"
              >
                MAX
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isProcessing || vaultAmount <= 0}
            className="w-full h-10 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs font-bold font-headline rounded-xl cursor-pointer"
          >
            {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5" />}
            Transférer au Solde Principal
          </Button>
        </form>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={cn(
          "p-3 rounded-xl text-xs font-body flex items-center gap-2 animate-in fade-in duration-200",
          feedbackMsg.type === 'success' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
        )}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </Card>
  );
}
