"use client";

import React, { useState, useEffect } from 'react';
import { ArrowDownLeft, Copy, Check, Lock, Wallet, RefreshCw, AlertCircle, Edit2, ExternalLink } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { getRealSolanaBalance, fetchLiveWalletBalance } from '@/services/pumpFunService';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import TransactionHistoryTable from '@/components/trading/TransactionHistoryTable';
import DepositGuidesCard from '@/components/wallet/DepositGuidesCard';
import ReserveVaultCard from '@/components/wallet/ReserveVaultCard';

const SOL_EXPLORER = 'https://solscan.io/account/';
const MANUAL_SOL_KEY = 'manual_solana_deposit_address';

export default function DepositPage() {
  const { tradingMode, setTradingMode, balance, setBalance, reserveVault, setReserveVault, reserveVaultSol, setReserveVaultSol, transactions, setTransactions } = useAppState();
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [evmAddress, setEvmAddress] = useState<string>('');
  const [walletChain, setWalletChain] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('1000');
  const [vaultUnlockAmount, setVaultUnlockAmount] = useState<string>('');
  const [isUnlockingVault, setIsUnlockingVault] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState<string>('');

  useEffect(() => { setIsMounted(true); }, []);

  const refreshLiveBalance = () => {
    if (tradingMode === 'REAL') {
      fetchLiveWalletBalance().then(res => {
        if (res && res.success) {
          if (res.solanaBalance !== null) setSolanaBalance(res.solanaBalance);
          if (res.solanaPubKey && !solanaPubKey) setSolanaPubKey(res.solanaPubKey);
          if (res.walletChain) setWalletChain(res.walletChain);
        }
      });
    }
  };

  useEffect(() => {
    if (!isMounted) return;

    // 1. Load connected Web3 wallet from localStorage
    const stored = localStorage.getItem('connected_web3_wallet');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { address: string; chain: string; name: string };
        setWalletChain(parsed.chain);
        if (parsed.chain === 'Solana') {
          setSolanaPubKey(parsed.address);
        } else {
          setEvmAddress(parsed.address);
        }
      } catch (e) {}
    }

    // 2. Load manually set SOL deposit address
    const manualAddr = localStorage.getItem(MANUAL_SOL_KEY);
    if (manualAddr) {
      setManualAddress(manualAddr);
      const storedWallet = localStorage.getItem('connected_web3_wallet');
      if (!storedWallet || JSON.parse(storedWallet || '{}').chain !== 'Solana') {
        setSolanaPubKey(manualAddr);
      }
    }

    // 3. Get live balance from connected wallet or keypair
    refreshLiveBalance();

    const handleWalletUpdated = () => refreshLiveBalance();
    window.addEventListener('web3_wallet_updated', handleWalletUpdated);
    return () => window.removeEventListener('web3_wallet_updated', handleWalletUpdated);
  }, [tradingMode, isMounted]);

  const handleCopyAddress = () => {
    const addr = solanaPubKey || manualAddress;
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveManualAddress = () => {
    const trimmed = manualAddress.trim();
    if (!trimmed) return;
    localStorage.setItem(MANUAL_SOL_KEY, trimmed);
    setSolanaPubKey(trimmed);
    setIsEditingAddress(false);
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
        setReserveVaultSol(prev => {
          const next = Math.max(0, prev - amt);
          localStorage.setItem('trade_reserve_vault_sol', next.toString());
          return next;
        });
        setSolanaBalance(prev => {
          const next = (prev || 0) + amt;
          localStorage.setItem('trade_solana_balance', next.toString());
          return next;
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
        }
      } else {
        setReserveVault(prev => {
          const next = Math.max(0, prev - amt);
          localStorage.setItem('trade_reserve_vault', next.toString());
          return next;
        });
        setBalance(prev => {
          const next = prev + amt;
          localStorage.setItem('trade_balance', next.toString());
          return next;
        });
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

  const displayAddress = solanaPubKey || manualAddress;

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
          <span className="text-[10px] uppercase font-bold text-[#c2ff0c] font-headline block">Solde Actuel Disponible</span>
          <div className="text-2xl font-extrabold text-white font-body">
            {tradingMode === 'REAL'
              ? `${solanaBalance !== null ? solanaBalance.toFixed(4) : '0.0000'} SOL`
              : `${(balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD`
            }
          </div>
          <span className="text-[11px] text-[#c2ff0c]/80 font-mono block font-semibold" suppressHydrationWarning>
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
          <span className="text-[11px] text-purple-200/80 font-mono block font-semibold" suppressHydrationWarning>
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
            {walletChain && (
              <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                ✓ {walletChain} connecté
              </span>
            )}
          </div>
          <Button
            onClick={refreshLiveBalance}
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
              <div className="space-y-5">
                <h2 className="text-lg font-bold font-headline text-purple-300">Adresse de Dépôt SOL</h2>

                {/* Address display or edit */}
                {isEditingAddress ? (
                  <div className="space-y-3">
                    <p className="text-xs text-white/50 font-body">
                      Entrez votre adresse de portefeuille Solana (clé publique) pour recevoir des SOL :
                    </p>
                    <Input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Ex: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs"
                      className="h-11 bg-white/5 border-purple-500/40 text-white font-mono text-xs"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveManualAddress}
                        disabled={!manualAddress.trim()}
                        className="flex-1 h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold font-headline text-xs"
                      >
                        Enregistrer l&apos;adresse
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setIsEditingAddress(false)}
                        className="h-9 px-4 text-white/50 hover:text-white text-xs"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : displayAddress ? (
                  <div className="space-y-3">
                    {/* Address box */}
                    <div className="p-3 bg-white/5 border border-purple-500/30 rounded-xl flex items-center justify-between gap-3">
                      <span className="font-mono text-xs text-white break-all leading-relaxed">{displayAddress}</span>
                      <Button
                        onClick={handleCopyAddress}
                        size="sm"
                        className="shrink-0 bg-[#c2ff0c] text-black font-bold font-headline h-9 px-3"
                      >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setManualAddress(displayAddress);
                          setIsEditingAddress(true);
                        }}
                        className="h-8 text-xs text-white/40 hover:text-white flex items-center gap-1.5 px-2"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Changer l&apos;adresse
                      </Button>
                      <a
                        href={`${SOL_EXPLORER}${displayAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 px-2 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Voir sur Solscan
                      </a>
                    </div>

                    {/* Wallet source badge */}
                    {walletChain === 'Solana' ? (
                      <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-xs text-emerald-300 font-body">
                          Adresse détectée depuis votre wallet Phantom connecté
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-300 font-body">
                          Adresse saisie manuellement — assurez-vous qu&apos;elle est correcte avant d&apos;envoyer
                        </span>
                      </div>
                    )}

                    {/* Minimum notice */}
                    <div className="p-3 bg-white/3 border border-white/5 rounded-lg">
                      <p className="text-[11px] text-white/40 font-body leading-relaxed">
                        ⚠️ <strong className="text-white/60">Important :</strong> Envoyez uniquement des <strong className="text-purple-300">SOL</strong> sur le réseau <strong className="text-purple-300">Solana</strong> à cette adresse. 
                        Tout autre token ou réseau entraînera une perte définitive des fonds.
                      </p>
                    </div>
                  </div>
                ) : (
                  // No address found at all
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-amber-300 font-headline">Aucun wallet Solana détecté</p>
                        <p className="text-xs text-white/50 font-body leading-relaxed">
                          Connectez votre wallet <strong className="text-white/70">Phantom</strong> via le bouton &quot;Connecter Wallet&quot; en haut de page, 
                          ou saisissez manuellement votre adresse de réception SOL.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-white/60 font-headline uppercase tracking-wide block">
                        Entrer une adresse SOL manuellement
                      </label>
                      <Input
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="Ex: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs"
                        className="h-11 bg-white/5 border-white/15 text-white font-mono text-xs"
                      />
                      <Button
                        onClick={handleSaveManualAddress}
                        disabled={!manualAddress.trim()}
                        className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold font-headline"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Définir comme adresse de dépôt
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-5 space-y-4">
          <DepositGuidesCard solanaPubKey={displayAddress || solanaPubKey} />
        </div>
      </div>

      <TransactionHistoryTable transactions={currentTxs} tradingMode={tradingMode} />
    </div>
  );
}
