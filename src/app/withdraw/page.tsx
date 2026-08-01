"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRealSolanaBalance, withdrawSolana } from '@/services/pumpFunService';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import TransactionHistoryTable from '@/components/TransactionHistoryTable';
import WithdrawFormCard from '@/components/WithdrawFormCard';

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
    getRealSolanaBalance().then(res => {
      if (res && res.success && res.balance !== undefined && res.publicKey) {
        setSolanaBalance(res.balance);
        setSolanaPubKey(res.publicKey);
      }
    });
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

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#c2ff0c]" />
      </div>
    );
  }

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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <WithdrawFormCard
            tradingMode={tradingMode}
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
