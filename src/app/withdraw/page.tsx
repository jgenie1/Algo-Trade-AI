"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { getRealSolanaBalance, withdrawSolana, fetchLiveWalletBalance } from '@/services/pumpFunService';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TransactionHistoryTable from '@/components/TransactionHistoryTable';
import WithdrawFormCard from '@/components/WithdrawFormCard';
import ReserveVaultCard from '@/components/ReserveVaultCard';

const SOLANA_NETWORK_FEE = 0.00005;
const PRIORITY_FEE_ESTIMATE = 0.001;

export default function WithdrawPage() {
  const { tradingMode, setTradingMode, balance, setBalance, transactions, setTransactions } = useAppState();
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);

  const [recipientAddress, setRecipientAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [connectedWeb3Wallet, setConnectedWeb3Wallet] = useState<{ name: string; address: string; chain: string } | null>(null);

  const refreshLiveBalance = () => {
    if (tradingMode === 'REAL') {
      fetchLiveWalletBalance().then(res => {
        if (res && res.success) {
          if (res.solanaBalance !== null) setSolanaBalance(res.solanaBalance);
          if (res.solanaPubKey && !solanaPubKey) setSolanaPubKey(res.solanaPubKey);
        }
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('connected_web3_wallet');
      if (stored) {
        try { setConnectedWeb3Wallet(JSON.parse(stored)); } catch (e) {}
      }
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || tradingMode !== 'REAL') return;
    refreshLiveBalance();
  }, [tradingMode, isMounted]);

  const handleFillConnectedWeb3Address = async () => {
    if (connectedWeb3Wallet && connectedWeb3Wallet.address) {
      setRecipientAddress(connectedWeb3Wallet.address);
      return;
    }
    try {
      const win = window as any;
      const solanaObj = win.solana || win.solflare || win.backpack;
      if (solanaObj) {
        const resp = await solanaObj.connect();
        const pubKey = resp?.publicKey ? resp.publicKey.toString() : solanaObj.publicKey?.toString();
        if (pubKey) {
          const providerName = solanaObj.isPhantom ? "Phantom Solana" : "Solana Web3 Wallet";
          const w = { name: providerName, address: pubKey, chain: "Solana" };
          localStorage.setItem('connected_web3_wallet', JSON.stringify(w));
          setConnectedWeb3Wallet(w);
          setRecipientAddress(pubKey);
        }
      }
    } catch (err: any) {}
  };

  const handlePercentClick = (pct: number) => {
    const maxAvailable = tradingMode === 'REAL'
      ? Math.max(0, (solanaBalance || 0) - SOLANA_NETWORK_FEE - PRIORITY_FEE_ESTIMATE)
      : balance;
    if (maxAvailable <= 0) { setWithdrawAmount('0'); return; }
    const decimals = tradingMode === 'REAL' ? 4 : 2;
    setWithdrawAmount((maxAvailable * (pct / 100)).toFixed(decimals));
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setTxHash('');
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) { setErrorMsg("Veuillez entrer un montant valide supérieur à 0."); return; }
    setIsLoading(true);

    if (tradingMode === 'DEMO') {
      setTimeout(() => {
        if (amt > balance) { setErrorMsg("Solde insuffisant."); setIsLoading(false); return; }
        setBalance(balance - amt);
        setTransactions(prev => [{
          id: 'tx_' + Math.random().toString(36).substring(2, 9),
          type: 'WITHDRAW' as const,
          amount: amt,
          currency: 'USD',
          timestamp: Date.now(),
          status: 'COMPLETED'
        }, ...(prev || [])]);
        setIsLoading(false);
        setWithdrawAmount('');
      }, 600);
    } else {
      if (!recipientAddress) { setErrorMsg("Adresse destinataire requise."); setIsLoading(false); return; }
      try {
        const res = await withdrawSolana({ recipient: recipientAddress, amount: amt });
        if (res && res.success && res.txHash) {
          setTxHash(res.txHash);
          setSolanaBalance(prev => prev !== null ? prev - amt : null);
          setTransactions(prev => [{
            id: 'tx_' + Math.random().toString(36).substring(2, 9),
            type: 'WITHDRAW' as const,
            amount: amt,
            currency: 'SOL',
            timestamp: Date.now(),
            status: 'COMPLETED',
            txHash: res.txHash,
            address: recipientAddress
          }, ...(prev || [])]);
          setWithdrawAmount('');
        } else {
          setErrorMsg(res.error || "Une erreur est survenue lors du retrait.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Erreur blockchain.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const currentTxs = (transactions || []).filter(tx =>
    tradingMode === 'REAL' ? tx.currency === 'SOL' : tx.currency === 'USD'
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ArrowUpRight className="h-8 w-8 text-rose-400" />
            Retirer des Fonds
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Débitez vos fonds virtuels ou retirez vos gains Solana vers votre hot wallet.</p>
        </div>

        <div className="flex items-center bg-black/40 border border-white/10 p-1.5 rounded-xl gap-1 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setTradingMode('DEMO')}
            className={cn("px-4 py-2 h-9 text-xs font-extrabold uppercase rounded-lg transition-all duration-200 font-headline flex items-center gap-2 border-none cursor-pointer",
              tradingMode === 'DEMO' ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-black" : "text-white/40 hover:text-white hover:bg-white/5")}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Mode Démo
          </Button>
          <Button
            variant="ghost"
            onClick={() => setTradingMode('REAL')}
            className={cn("px-4 py-2 h-9 text-xs font-extrabold uppercase rounded-lg transition-all duration-200 font-headline flex items-center gap-2 border-none cursor-pointer",
              tradingMode === 'REAL' ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm font-black" : "text-white/40 hover:text-white hover:bg-white/5")}
          >
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            Mode Réel (Solana)
          </Button>
        </div>
      </div>

      {/* Account Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xl">
          <span className="text-[10px] uppercase font-bold text-rose-400 font-headline block">Solde Actuel Retirable</span>
          <div className="text-2xl font-extrabold text-white font-body">
            {tradingMode === 'REAL' 
              ? `${solanaBalance !== null ? solanaBalance.toFixed(4) : '0.0000'} SOL` 
              : `${(balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD`
            }
          </div>
          <span className="text-[11px] text-rose-300/80 font-mono block font-semibold">
            {tradingMode === 'REAL' 
              ? formatSolToUsdAndHtg(solanaBalance).combinedLabel 
              : `≈ ${formatUsdToHtg(balance)}`
            }
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Disponible pour retrait immédiat ({tradingMode})</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xl">
          <span className="text-[10px] uppercase font-bold text-amber-400 font-headline block">Mode de Compte</span>
          <div className="text-xl font-extrabold text-white font-body mt-1">
            {tradingMode === 'REAL' ? 'Solana Mainnet (Web3)' : 'Portefeuille Démo (USD)'}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
            ✓ Prêt pour l'opération
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">Sélecteur de mode disponible en haut</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline block flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Synchronisation
            </span>
            <div className="text-sm font-extrabold text-slate-200 font-body mt-1">
              {tradingMode === 'REAL' ? 'Blockchain Solana RPC' : 'Fonds virtuels simulés'}
            </div>
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

      {/* Interactive Coffre-Fort (Vault 10% SOL / USD) Card */}
      <ReserveVaultCard solanaBalance={solanaBalance} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <WithdrawFormCard
            tradingMode={tradingMode}
            balance={balance}
            solanaBalance={solanaBalance}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            recipientAddress={recipientAddress}
            setRecipientAddress={setRecipientAddress}
            isLoading={isLoading}
            handleWithdraw={handleWithdraw}
            handlePercentClick={handlePercentClick}
            handleFillConnectedWeb3Address={handleFillConnectedWeb3Address}
            connectedWeb3Wallet={connectedWeb3Wallet}
            errorMsg={errorMsg}
            txHash={txHash}
          />
        </div>
      </div>

      <TransactionHistoryTable transactions={currentTxs} tradingMode={tradingMode} />
    </div>
  );
}
