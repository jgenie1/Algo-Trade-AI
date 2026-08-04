"use client";

import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, Copy, Check, Lock, Wallet, RefreshCw } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { getRealSolanaBalance } from '@/services/pumpFunService';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import TransactionHistoryTable from '@/components/TransactionHistoryTable';
import DepositGuidesCard from '@/components/DepositGuidesCard';

export default function DepositPage() {
  const { tradingMode, setTradingMode, balance, setBalance, reserveVault, setReserveVault, reserveVaultSol, setReserveVaultSol, transactions, setTransactions } = useAppState();
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('1000');
  const [vaultUnlockAmount, setVaultUnlockAmount] = useState<string>('');
  const [isUnlockingVault, setIsUnlockingVault] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted || tradingMode !== 'REAL') return;
    getRealSolanaBalance().then(res => {
      if (res && res.success && res.balance !== undefined && res.publicKey) {
        setSolanaBalance(res.balance);
        setSolanaPubKey(res.publicKey);
      }
    });
  }, [tradingMode, isMounted]);

  const handleCopyAddress = () => {
    if (!solanaPubKey) return;
    navigator.clipboard.writeText(solanaPubKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleUnlockVault = (e: React.FormEvent) => {
    e.preventDefault();
    const isReal = tradingMode === 'REAL';
    const currentVault = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
    const amt = parseFloat(vaultUnlockAmount) || currentVault;
    if (amt <= 0 || amt > currentVault) return;
    setIsUnlockingVault(true);
    setTimeout(() => {
      if (isReal) {
        setReserveVaultSol(prev => Math.max(0, prev - amt));
      } else {
        setReserveVault(prev => Math.max(0, prev - amt));
        setBalance(prev => prev + amt);
      }
      setTransactions(prev => [{
        id: 'tx_vault_' + Math.random().toString(36).substring(2, 9),
        type: 'DEPOSIT' as const,
        amount: amt,
        currency: isReal ? 'SOL' : 'USD',
        timestamp: Date.now(),
        status: 'COMPLETED'
      }, ...(prev || [])]);
      setIsUnlockingVault(false);
      setVaultUnlockAmount('');
    }, 600);
  };

  const handleDemoDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tradingMode === 'REAL') return;
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    setIsLoading(true);
    setTimeout(() => {
      setBalance(balance + amt);
      setTransactions(prev => [{
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        type: 'DEPOSIT' as const,
        amount: amt,
        currency: 'USD',
        timestamp: Date.now(),
        status: 'COMPLETED'
      }, ...(prev || [])]);
      setIsLoading(false);
      setDepositAmount('1000');
    }, 500);
  };

  const currentTxs = (transactions || []).filter(tx =>
    tradingMode === 'REAL' ? tx.currency === 'SOL' : tx.currency === 'USD'
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ArrowDownLeft className="h-8 w-8 text-[#c2ff0c]" />
            Créditer le Compte
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Alimentez vos fonds pour la simulation ou le trading réel.</p>
        </div>

        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setTradingMode('DEMO')}
            className={cn("h-auto px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg font-headline border-none",
              tradingMode === 'DEMO' ? "bg-amber-500/25 text-amber-300" : "text-white/40")}
          >
            Mode Démo
          </Button>
          <Button
            variant="ghost"
            onClick={() => setTradingMode('REAL')}
            className={cn("h-auto px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg font-headline border-none",
              tradingMode === 'REAL' ? "bg-purple-600/25 text-purple-300" : "text-white/40")}
          >
            Mode Réel (Solana)
          </Button>
        </div>
      </div>

      {/* Account Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xl">
          <span className="text-[10px] uppercase font-bold text-[#c2ff0c] font-headline block">Solde Actuel Disponible</span>
          <div className="text-2xl font-extrabold text-white font-body">
            {tradingMode === 'REAL' 
              ? `${solanaBalance !== null ? solanaBalance.toFixed(4) : '0.0000'} SOL` 
              : `${(balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD`
            }
          </div>
          <span className="text-[11px] text-[#c2ff0c]/80 font-mono block font-semibold">
            {tradingMode === 'REAL' 
              ? formatSolToUsdAndHtg(solanaBalance).combinedLabel 
              : `≈ ${formatUsdToHtg(balance)}`
            }
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Solde prêt pour le trading en mode {tradingMode}</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xl">
          <span className="text-[10px] uppercase font-bold text-purple-400 font-headline block">Coffre de Réserve (Vault)</span>
          <div className="text-2xl font-extrabold text-purple-300 font-body">
            {tradingMode === 'REAL' 
              ? `${(reserveVaultSol || 0).toFixed(4)} SOL` 
              : `${(reserveVault || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD`
            }
          </div>
          <span className="text-[11px] text-purple-200/80 font-mono block font-semibold">
            {tradingMode === 'REAL' 
              ? formatSolToUsdAndHtg(reserveVaultSol).combinedLabel 
              : `≈ ${formatUsdToHtg(reserveVault)}`
            }
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Réserve de sécurité non engagée</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline block">Statut du Compte</span>
            <div className="text-base font-extrabold text-white font-body mt-1">
              {tradingMode === 'REAL' ? 'Solana Mainnet (Web3)' : 'Portefeuille Démo (Simulé)'}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
              ✓ Synchronisé avec l'application
            </span>
          </div>
          <Button
            onClick={() => {
              if (tradingMode === 'REAL') {
                getRealSolanaBalance().then(res => {
                  if (res && res.success && res.balance !== undefined) setSolanaBalance(res.balance);
                });
              }
            }}
            size="sm"
            className="h-8 bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold font-headline rounded-xl self-start mt-2 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser Solde
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-7 bg-[#14101a] border-white/10 rounded-2xl relative overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {tradingMode === 'DEMO' ? (
              <form onSubmit={handleDemoDeposit} className="space-y-4">
                <h2 className="text-lg font-bold font-headline text-amber-400">Générateur de Fonds Fictifs</h2>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 text-white font-body"
                />
                <Button type="submit" disabled={isLoading} className="w-full h-11 bg-[#c2ff0c] text-black font-extrabold font-headline">
                  {isLoading ? 'Créditement...' : 'Ajouter au solde démo'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-headline text-purple-300">Adresse de Dépôt SOL</h2>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between font-mono text-xs text-white">
                  <span>{solanaPubKey || 'Chargement...'}</span>
                  <Button onClick={handleCopyAddress} size="sm" className="bg-[#c2ff0c] text-black font-bold font-headline">
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-5 space-y-4">
          <DepositGuidesCard solanaPubKey={solanaPubKey} />
        </div>
      </div>

      <TransactionHistoryTable transactions={currentTxs} tradingMode={tradingMode} />
    </div>
  );
}
