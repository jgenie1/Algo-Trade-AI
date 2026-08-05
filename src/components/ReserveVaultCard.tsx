"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowDownLeft, ShieldCheck, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [selectedLockPct, setSelectedLockPct] = useState<number>(10); // Default 10%
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
        ? "Mise en réserve automatique de 10% des gains ACTIVÉE." 
        : "Mise en réserve automatique des gains DÉSACTIVÉE.",
      type: 'success'
    });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const isReal = tradingMode === 'REAL';
  const vaultAmount = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const activeBalance = isReal ? (fetchedSolBalance || 0) : balance;
  const currencyLabel = isReal ? 'SOL' : 'USD';

  // Reserve X% or specific amount to Vault
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
      setFeedbackMsg({ text: `Succès ! ${formattedStr} réservés et transférés dans le Coffre-Fort.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 4500);
    }, 400);
  };

  // Transfer from Vault back to Main Account
  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const amt = parseFloat(unlockAmount) || vaultAmount;
    if (amt <= 0 || amt > vaultAmount) {
      setFeedbackMsg({ text: "Montant de déblocage invalide ou supérieur au solde du coffre.", type: 'error' });
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
      setFeedbackMsg({ text: `Succès ! ${formattedStr} transférés du Coffre-Fort vers votre Solde Principal.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 4500);
    }, 400);
  };

  return (
    <Card className="bg-gradient-to-br from-[#180e22] via-[#120818] to-[#0c0512] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Background Ambient Glow */}
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-purple-600/10 blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-2xl shadow-lg shadow-amber-950/30">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-headline font-extrabold text-white">Coffre-Fort de Sécurité</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                10% SOL / USD
              </span>
            </div>
            <p className="text-xs text-white/50 font-body">Réserve sécurisée intouchable protégée des risques du marché.</p>
          </div>
        </div>

        <div className="text-left sm:text-right bg-white/[0.03] sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-none border-white/5 w-full sm:w-auto">
          <span className="text-[10px] uppercase font-bold text-amber-400 font-headline block">Solde Actuel du Coffre</span>
          <span className="text-2xl font-black text-amber-300 font-headline">
            {isReal ? `${vaultAmount.toFixed(4)} SOL` : `$${vaultAmount.toFixed(2)}`}
          </span>
          <span className="text-[11px] text-amber-200/70 font-mono block font-semibold">
            {isReal ? formatSolToUsdAndHtg(vaultAmount).combinedLabel : `≈ ${formatUsdToHtg(vaultAmount)}`}
          </span>
        </div>
      </div>

      {/* Auto-Reserve Toggle Row */}
      <div className="p-3 bg-purple-950/20 border border-purple-500/25 rounded-xl flex items-center justify-between gap-3 text-xs font-body">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#c2ff0c]" />
          <div>
            <span className="font-bold text-white font-headline block">Réservation Automatique des Gains (10%)</span>
            <span className="text-[10px] text-white/50 block">Sécurise automatiquement 10% de chaque trade gagnant en Mode {tradingMode}.</span>
          </div>
        </div>

        <button
          onClick={toggleAutoReserve}
          className={cn(
            "h-7 px-3 rounded-full text-[10px] font-extrabold font-headline transition-all border flex items-center gap-1 shrink-0",
            autoReserveWinningTrades 
              ? "bg-[#c2ff0c]/20 text-[#c2ff0c] border-[#c2ff0c]/40" 
              : "bg-white/5 text-white/40 border-white/10 hover:text-white"
          )}
        >
          {autoReserveWinningTrades ? <CheckCircle2 className="h-3 w-3 text-[#c2ff0c]" /> : null}
          {autoReserveWinningTrades ? "ACTIVÉE" : "DÉSACTIVÉE"}
        </button>
      </div>

      {/* Main Grid: Lock 10% vs Unlock Vault */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Lock 10% / Custom amount into Vault */}
        <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300 font-headline flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Mise en Réserve (Dépôt au Coffre)
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                Dispo: {isReal ? `${activeBalance.toFixed(4)} SOL` : `$${activeBalance.toFixed(2)}`}
              </span>
            </div>

            <p className="text-[11px] text-white/50 font-body">
              Choisissez le % ou saisissez un montant à verrouiller au Coffre-Fort :
            </p>

            {/* Quick Percentage Pills */}
            <div className="flex gap-1.5 pt-1">
              {[5, 10, 25, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setSelectedLockPct(pct);
                    setLockAmount('');
                  }}
                  className={cn(
                    "flex-1 py-1 text-[10px] font-extrabold font-headline rounded-lg border transition-all",
                    selectedLockPct === pct && !lockAmount
                      ? "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm"
                      : "bg-white/5 text-white/40 border-white/10 hover:text-white"
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <Input
              type="number"
              step="any"
              placeholder={`Montant personnalisé (${currencyLabel})`}
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
              className="h-10 bg-white/5 border-white/15 text-white text-xs font-mono rounded-xl mt-2"
            />
          </div>

          <Button
            onClick={() => handleLockAmount()}
            disabled={isProcessing || activeBalance <= 0}
            className="w-full h-11 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-xs font-extrabold font-headline rounded-xl mt-3 transition-all"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
            Verrouiller {lockAmount ? `${lockAmount} ${currencyLabel}` : `${selectedLockPct}% (${isReal ? (activeBalance * (selectedLockPct/100)).toFixed(4) + ' SOL' : '$' + (activeBalance * (selectedLockPct/100)).toFixed(2)})`}
          </Button>
        </div>

        {/* Section 2: Transfer from Vault back to Main Account */}
        <form onSubmit={handleUnlockVault} className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-300 font-headline flex items-center gap-1.5">
                <Unlock className="h-4 w-4 text-purple-400" />
                Déblocage vers Solde Principal
              </span>
              <span className="text-[10px] text-amber-300/80 font-mono font-bold">
                Réserve: {isReal ? `${vaultAmount.toFixed(4)} SOL` : `$${vaultAmount.toFixed(2)}`}
              </span>
            </div>

            <p className="text-[11px] text-white/50 font-body">
              Transférez les fonds réservés vers votre compte principal pour les réinvestir ou les retirer :
            </p>

            <div className="flex gap-2 pt-1">
              <Input
                type="number"
                step="any"
                placeholder={`Montant à transférer (${currencyLabel})`}
                value={unlockAmount}
                onChange={(e) => setUnlockAmount(e.target.value)}
                className="h-10 bg-white/5 border-white/15 text-white text-xs font-mono rounded-xl"
              />
              <Button
                type="button"
                onClick={() => setUnlockAmount(vaultAmount.toString())}
                className="h-10 px-3 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[10px] font-extrabold font-headline rounded-xl shrink-0"
              >
                TOUT (MAX)
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isProcessing || vaultAmount <= 0}
            className="w-full h-11 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-extrabold font-headline rounded-xl transition-all"
          >
            {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownLeft className="h-4 w-4 mr-2 text-purple-300" />}
            Transférer au Solde Principal ({currencyLabel})
          </Button>
        </form>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className={cn(
          "p-3.5 rounded-xl text-xs font-body flex items-center gap-2 animate-in fade-in duration-200",
          feedbackMsg.type === 'success' ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
        )}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}
    </Card>
  );
}
