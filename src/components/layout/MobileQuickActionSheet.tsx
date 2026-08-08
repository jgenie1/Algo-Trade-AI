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
  Bot,
  Trophy,
  Coins,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/context/AppContext';
import DEXSwapModal from '@/components/wallet/DEXSwapModal';
import PanicKillSwitch from '@/components/layout/PanicKillSwitch';

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
              href="/?tab=tokens"
              onClick={() => setIsOpen(false)}
              className="p-3.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-2xl flex flex-col items-start gap-1.5"
            >
              <div className="p-2 bg-purple-500/30 text-purple-200 rounded-xl">
                <Coins className="h-5 w-5" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-extrabold text-purple-200 font-headline block truncate">Mes Tokens & USD</span>
                <span className="text-[10px] text-white/50 block truncate">Portefeuille & Vente</span>
              </div>
            </Link>

            <Link
              href="/?tab=tokens"
              onClick={() => setIsOpen(false)}
              className="p-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-2xl flex flex-col items-start gap-1.5"
            >
              <div className="p-2 bg-indigo-500/30 text-[#c2ff0c] rounded-xl">
                <Layers className="h-5 w-5 text-[#c2ff0c]" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-extrabold text-[#c2ff0c] font-headline block truncate">Vendre Tout en Bloc</span>
                <span className="text-[10px] text-white/50 block truncate">Conversion USD</span>
              </div>
            </Link>

            <Link
              href="/strategies/leaderboard"
              onClick={() => setIsOpen(false)}
              className="p-3.5 bg-[#c2ff0c]/10 hover:bg-[#c2ff0c]/20 border border-[#c2ff0c]/30 rounded-2xl flex flex-col items-start gap-1.5"
            >
              <div className="p-2 bg-[#c2ff0c]/20 text-[#c2ff0c] rounded-xl">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-[#c2ff0c] font-headline block truncate">Classement & Copy</span>
                <span className="text-[10px] text-white/50 block truncate">Top Traders & Bots</span>
              </div>
            </Link>

            <Link
              href="/strategies"
              onClick={() => setIsOpen(false)}
              className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-1.5"
            >
              <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-purple-300 font-headline block truncate">Marketplace IA</span>
                <span className="text-[10px] text-white/50 block truncate">Catalogue Bots</span>
              </div>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsSwapOpen(true);
              }}
              className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-1.5 text-left w-full"
            >
              <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-white font-headline block truncate">DEX Swap Express</span>
                <span className="text-[10px] text-white/40 block truncate">Jupiter / Raydium</span>
              </div>
            </button>

            <button
              onClick={handleUnlockVaultFast}
              className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-1.5 text-left w-full"
            >
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                <Lock className="h-5 w-5" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-amber-300 font-headline block truncate">Coffre-Fort</span>
                <span className="text-[10px] text-white/40 block truncate">Vider vers Solde</span>
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
