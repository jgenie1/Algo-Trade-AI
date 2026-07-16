"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  Coins, 
  ExternalLink,
  ShieldAlert,
  RefreshCw,
  Check,
  Info,
  History,
  ArrowDownLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRealSolanaBalance, withdrawSolana } from '@/services/pumpFunService';
import { useAppState } from '@/context/AppContext';

export default function WithdrawPage() {
  const { tradingMode, setTradingMode, balance, setBalance, transactions, setTransactions } = useAppState();
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const isSolanaWalletActive = !!solanaPubKey;
  
  const [recipientAddress, setRecipientAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Standard fee estimates
  const solanaNetworkFee = 0.00005; 
  const priorityFeeEstimate = 0.001;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (tradingMode === 'REAL') {
      getRealSolanaBalance().then(res => {
        if (res.success && res.balance !== undefined && res.publicKey) {
          setSolanaBalance(res.balance);
          setSolanaPubKey(res.publicKey);
        }
      });
    }
  }, [tradingMode, isMounted]);

  const handlePercentClick = (pct: number) => {
    const maxAvailable = tradingMode === 'REAL' 
      ? Math.max(0, (solanaBalance || 0) - solanaNetworkFee - priorityFeeEstimate)
      : balance;
    
    if (maxAvailable <= 0) {
      setWithdrawAmount('0');
      return;
    }
    
    const amt = maxAvailable * (pct / 100);
    setWithdrawAmount(amt.toFixed(tradingMode === 'REAL' ? 4 : 2));
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setTxHash('');
    const amt = parseFloat(withdrawAmount);
    
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Veuillez entrer un montant valide supérieur à 0.");
      return;
    }

    setIsLoading(true);

    if (tradingMode === 'DEMO') {
      setTimeout(() => {
        if (amt > balance) {
          setErrorMsg("Solde insuffisant.");
          setIsLoading(false);
          return;
        }
        
        const nextBal = balance - amt;
        setBalance(nextBal);
        
        // Save transaction to global context
        const newTx = {
          id: 'tx_' + Math.random().toString(36).substring(2, 9),
          type: 'WITHDRAW',
          amount: amt,
          currency: 'USD',
          timestamp: Date.now(),
          status: 'COMPLETED'
        };
        setTransactions(prev => [newTx, ...(prev || [])]);

        setIsLoading(false);
        setWithdrawAmount('');
        alert(`Retrait simulé réussi ! ${amt.toLocaleString()} $ retirés.`);
      }, 800);
    } else {
      if (!recipientAddress) {
        setErrorMsg("Adresse destinataire requise.");
        setIsLoading(false);
        return;
      }
      
      const totalCost = amt + solanaNetworkFee + priorityFeeEstimate;
      if (solanaBalance === null || totalCost > solanaBalance) {
        setErrorMsg(`Solde insuffisant. Vous devez couvrir le montant du retrait (${amt} SOL) + les frais de réseau (${(solanaNetworkFee + priorityFeeEstimate).toFixed(5)} SOL).`);
        setIsLoading(false);
        return;
      }

      try {
        const res = await withdrawSolana({
          recipient: recipientAddress,
          amount: amt
        });

        if (res.success && res.txHash) {
          setTxHash(res.txHash);
          setSolanaBalance(prev => prev !== null ? prev - amt : null);
          
          // Save real transaction to global context
          const newTx = {
            id: 'tx_' + Math.random().toString(36).substring(2, 9),
            type: 'WITHDRAW',
            amount: amt,
            currency: 'SOL',
            timestamp: Date.now(),
            status: 'COMPLETED',
            txHash: res.txHash,
            address: recipientAddress
          };
          setTransactions(prev => [newTx, ...(prev || [])]);

          setWithdrawAmount('');
          setRecipientAddress('');
        } else {
          setErrorMsg(res.error || "Une erreur est survenue lors de la transaction blockchain.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Erreur de communication avec la blockchain Solana.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
          <span className="text-sm text-white/50">Chargement...</span>
        </div>
      </div>
    );
  }

  // Filter transactions for display
  const currentTxs = (transactions || []).filter(tx => 
    tradingMode === 'REAL' ? tx.currency === 'SOL' : tx.currency === 'USD'
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ArrowUpRight className="h-8 w-8 text-rose-400" />
            Retirer des Fonds
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Débitez vos fonds virtuels ou retirez vos gains Solana vers votre hot wallet de stockage.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setTradingMode('DEMO')}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'DEMO'
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Démo (Simulé)
          </button>
          <button
            onClick={() => setTradingMode('REAL')}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'REAL'
                ? "bg-purple-600/25 text-purple-300 border border-purple-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Réel (Solana)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Withdraw Box */}
        <div className="md:col-span-7 bg-[#14101a] border border-white/10 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold font-headline text-rose-400">Demande de Retrait</h2>
            <p className="text-xs text-white/40 mt-1 font-body leading-relaxed">
              {tradingMode === 'DEMO' 
                ? "Débitez votre solde fictif. Utile pour réinitialiser ou simuler des sorties de capitaux." 
                : "Transférez vos jetons SOL vers une autre adresse Solana externe."}
            </p>
          </div>

          <form onSubmit={handleWithdraw} className="space-y-4">
            {tradingMode === 'REAL' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Adresse destinataire (Solana Wallet CA)</label>
                <input
                  type="text"
                  required
                  placeholder="Collez l'adresse publique du destinataire (Ex: Fs...)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value.trim())}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-rose-400 text-white font-mono focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">
                  Montant à retirer ({tradingMode === 'DEMO' ? 'USD' : 'SOL'})
                </label>
                <span className="text-[10px] text-white/30 font-body">
                  Max: {tradingMode === 'REAL' 
                    ? `${Math.max(0, (solanaBalance || 0) - solanaNetworkFee - priorityFeeEstimate).toFixed(4)} SOL` 
                    : `${balance.toLocaleString()} $`
                  }
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">
                  {tradingMode === 'DEMO' ? '$' : 'SOL'}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Ex: 1.5"
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-12 pr-3 text-sm focus:ring-rose-400 text-white font-body focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Percent Selectors */}
            <div className="grid grid-cols-5 gap-1.5">
              {[25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentClick(pct)}
                  className="py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[10px] font-bold font-headline transition-all"
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePercentClick(100)}
                className="py-1.5 bg-[#c2ff0c]/10 hover:bg-[#c2ff0c]/20 border border-[#c2ff0c]/10 text-[#c2ff0c] rounded-lg text-[10px] font-bold font-headline transition-all"
              >
                Max
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-body">
                ❌ {errorMsg}
              </div>
            )}

            {txHash && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-body space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  Retrait Réussi !
                </p>
                <a
                  href={`https://solscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] underline hover:text-emerald-300"
                >
                  Voir la transaction sur Solscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (tradingMode === 'REAL' && !isSolanaWalletActive)}
              className={cn(
                "w-full h-11 text-black font-bold text-xs rounded-xl font-headline uppercase transition-all duration-300 flex items-center justify-center gap-2 mt-2",
                tradingMode === 'DEMO' 
                  ? "bg-amber-400 hover:bg-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
                  : "bg-rose-400 hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] disabled:bg-white/10 disabled:text-white/30"
              )}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                "Valider le Retrait"
              )}
            </button>
          </form>
        </div>

        {/* Right column: Info Summary */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-[#1b1527] to-[#120d1c] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-5">
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-headline block">Solde Courant</span>
              
              {tradingMode === 'DEMO' ? (
                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-amber-400 font-body">
                    {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                  </div>
                  <span className="text-[10px] text-white/30 block">Compte d'entraînement démo</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-3xl font-extrabold text-purple-300 font-body flex items-center gap-2">
                    <Coins className="h-7 w-7 text-purple-400" />
                    <span>{solanaBalance !== null ? `${solanaBalance.toFixed(4)} SOL` : '0.0000 SOL'}</span>
                  </div>
                  <span className="text-[10px] text-white/30 block">Fonds on-chain réels transférables</span>
                </div>
              )}
            </div>

            {tradingMode === 'REAL' && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2 text-xs font-body">
                <span className="text-[9px] font-bold text-purple-400 uppercase font-headline">Estimation des Frais</span>
                <div className="flex justify-between text-white/60">
                  <span>Frais Blockchain Solana</span>
                  <span className="font-mono">{solanaNetworkFee.toFixed(5)} SOL</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Frais de Priorité Estimés</span>
                  <span className="font-mono">{priorityFeeEstimate.toFixed(5)} SOL</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between font-bold text-purple-300">
                  <span>Total Frais de Réseau</span>
                  <span className="font-mono">{(solanaNetworkFee + priorityFeeEstimate).toFixed(5)} SOL</span>
                </div>
              </div>
            )}

            <div className="border-t border-white/5 pt-4 flex items-start gap-2.5 text-[10px] text-white/40 font-body leading-relaxed">
              <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <span>Attention : Les transactions sur le réseau principal Solana sont définitives et irréversibles. Une adresse erronée se traduira par une perte définitive de vos fonds.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-[#14101a]/80 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-white">
          <History className="h-5 w-5 text-rose-400" />
          Historique des Mouvements ({tradingMode === 'DEMO' ? 'Démo' : 'Réel'})
        </h2>

        {currentTxs.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl font-body">
            Aucun dépôt ou retrait n'a été enregistré pour le moment en mode {tradingMode === 'DEMO' ? 'Démo' : 'Réel'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 uppercase font-headline text-[9px] tracking-wider">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Montant</th>
                  <th className="pb-3">Devise</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Statut</th>
                  {tradingMode === 'REAL' && <th className="pb-3 pr-2 text-right">Blockchain</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentTxs.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pl-2 font-mono text-white/40">{tx.id}</td>
                    <td className="py-3">
                      {tx.type === 'DEPOSIT' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          Dépôt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Retrait
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      {tx.type === 'DEPOSIT' ? '+' : '-'} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-white/60 font-medium">{tx.currency}</td>
                    <td className="py-3 text-white/40">
                      {new Date(tx.timestamp).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        {tx.status}
                      </span>
                    </td>
                    {tradingMode === 'REAL' && (
                      <td className="py-3 pr-2 text-right">
                        {tx.txHash ? (
                          <a
                            href={`https://solscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline font-medium"
                          >
                            Détails
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
