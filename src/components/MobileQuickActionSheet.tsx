"use client";

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  AlertOctagon, 
  RefreshCw,
  TrendingUp,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/context/AppContext';
import DEXSwapModal from '@/components/DEXSwapModal';
import PanicKillSwitch from '@/components/PanicKillSwitch';

export default function MobileQuickActionSheet() {
  const { reserveVault, reserveVaultSol, tradingMode, setBalance, setReserveVault, setReserveVaultSol, setTransactions } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  const handleUnlockVaultFast = () => {
    const isReal = tradingMode === 'REAL';
    const vaultAmt = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
    const currencyLabel = isReal ? 'SOL' : 'USD';
    const formattedAmt = isReal ? `${vaultAmt.toFixed(4)} SOL` : `$${vaultAmt.toFixed(2)}`;

    if (vaultAmt <= 0) {
      alert("Le Coffre-Fort est actuellement vide.");
      return;
    }
    if (confirm(`Transférer ${formattedAmt} du Coffre-Fort vers le Solde Principal ?`)) {
      if (isReal) {
        setReserveVaultSol(0);
      } else {
        setReserveVault(0);
        setBalance(prev => prev + vaultAmt);
      }
      setTransactions(prev => [{
        id: 'tx_vault_' + Math.random().toString(36).substring(2, 9),
        type: 'DEPOSIT' as const,
        amount: vaultAmt,
        currency: currencyLabel,
        timestamp: Date.now(),
        status: 'COMPLETED'
      }, ...(prev || [])]);
      setIsOpen(false);
      alert(`Succès ! ${formattedAmt} transférés au Solde Principal.`);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-13 w-13 rounded-full bg-gradient-to-tr from-[#c2ff0c] to-emerald-400 text-black flex items-center justify-center shadow-[0_0_20px_rgba(194,255,12,0.5)] -mt-6 border-4 border-[#0c0d12] active:scale-95 transition-all"
        aria-label="Actions rapides"
      >
        <Zap className="h-6 w-6 fill-black text-black" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#140b12] border border-white/10 rounded-3xl p-6 text-white space-y-4 max-w-md">
          <DialogHeader className="text-left border-b border-white/10 pb-3">
            <DialogTitle className="text-lg font-headline font-extrabold text-[#c2ff0c] flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#c2ff0c]" />
              Actions Rapides Au Pouce
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 font-body">
              Accès instantané aux fonctions principales du terminal trading.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2 font-body">
            <Link
              href="/deposit"
              onClick={() => setIsOpen(false)}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-2"
            >
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white font-headline block">Dépôt / Créditer</span>
                <span className="text-[10px] text-white/40 block">Recharger le solde</span>
              </div>
            </Link>

            <Link
              href="/withdraw"
              onClick={() => setIsOpen(false)}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-2"
            >
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white font-headline block">Retrait de Fonds</span>
                <span className="text-[10px] text-white/40 block">Retirer sur portefeuille</span>
              </div>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsSwapOpen(true);
              }}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-2 text-left"
            >
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white font-headline block">DEX Swap Express</span>
                <span className="text-[10px] text-white/40 block">Jupiter / Uniswap</span>
              </div>
            </button>

            <button
              onClick={handleUnlockVaultFast}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-2 text-left"
            >
              <div className="p-2 bg-[#c2ff0c]/20 text-[#c2ff0c] rounded-xl">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#c2ff0c] font-headline block">Vider Coffre-Fort</span>
                <span className="text-[10px] text-white/40 block">Transférer vers Solde</span>
              </div>
            </button>
          </div>

          {/* Section Panic Switch */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/60 font-body">Arrêt d'Urgence Global :</span>
            <PanicKillSwitch />
          </div>
        </DialogContent>
      </Dialog>

      {/* DEX Swap Modal */}
      <DEXSwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />
    </>
  );
}
