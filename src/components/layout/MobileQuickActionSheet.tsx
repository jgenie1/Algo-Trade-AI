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
  Layers,
  Crown
} from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/context/AppContext';
import DEXSwapModal from '@/components/wallet/DEXSwapModal';
import PanicKillSwitch from '@/components/layout/PanicKillSwitch';

export default function MobileQuickActionSheet() {
  const { reserveVault, reserveVaultSol, tradingMode, setBalance, setReserveVault, setReserveVaultSol, setTransactions } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  const handleOpenLeo = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open_leo_commander'));
    }
  };

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
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-purple-600 via-[#9945FF] to-[#c2ff0c] p-3.5 rounded-full shadow-[0_0_20px_rgba(153,69,255,0.6)] text-black active:scale-95 transition-all duration-200 border-2 border-white/20 select-none z-10"
        aria-label="Actions rapides"
      >
        <Zap className="h-6 w-6 text-black fill-black" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm bg-[#0e0a1a]/95 border border-white/10 text-white backdrop-blur-2xl rounded-3xl p-5 shadow-[0_0_50px_rgba(153,69,255,0.2)]">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="text-base font-headline font-black text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#c2ff0c]" />
              <span>Actions Rapides & Navigation</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 font-body">
              Accès direct aux fonctionnalités essentielles de trading
            </DialogDescription>
          </DialogHeader>

          {/* Bouton Hero LÉO AI COMMANDER */}
          <button
            onClick={handleOpenLeo}
            className="w-full p-3 bg-gradient-to-r from-amber-500 via-[#f0b90b] to-yellow-600 text-black rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(240,185,11,0.4)] active:scale-95 transition-all font-headline"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-black/20 text-black rounded-xl">
                <Crown className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black block uppercase tracking-wider">LÉO AI COMMANDER</span>
                <span className="text-[10px] text-black/80 font-medium block">Veille Web & Contrôle des 5 Bots</span>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase bg-black text-[#f0b90b] px-2 py-1 rounded-lg">OUVRIR</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5 py-1 font-body">
            <Link
              href="/?tab=tokens"
              onClick={() => setIsOpen(false)}
              className="p-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-2xl flex flex-col items-start gap-1.5 active:scale-95 transition-all"
            >
              <div className="p-2 bg-purple-500/30 text-purple-200 rounded-xl">
                <Coins className="h-4 w-4" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-purple-200 font-headline block truncate">Mes Tokens & USD</span>
                <span className="text-[10px] text-white/60 block truncate">Portefeuille & Vente</span>
              </div>
            </Link>

            <Link
              href="/?tab=tokens"
              onClick={() => setIsOpen(false)}
              className="p-3 bg-[#c2ff0c]/15 hover:bg-[#c2ff0c]/25 border border-[#c2ff0c]/30 rounded-2xl flex flex-col items-start gap-1.5 active:scale-95 transition-all"
            >
              <div className="p-2 bg-[#c2ff0c]/20 text-[#c2ff0c] rounded-xl">
                <Layers className="h-4 w-4 text-[#c2ff0c]" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-[#c2ff0c] font-headline block truncate">Vendre Tout en Bloc</span>
                <span className="text-[10px] text-white/60 block truncate">Conversion USD</span>
              </div>
            </Link>

            <Link
              href="/strategies/leaderboard"
              onClick={() => setIsOpen(false)}
              className="p-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-2xl flex flex-col items-start gap-1.5 active:scale-95 transition-all"
            >
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
                <Trophy className="h-4 w-4" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-amber-300 font-headline block truncate">Classement & Copy</span>
                <span className="text-[10px] text-white/60 block truncate">Top Traders & Bots</span>
              </div>
            </Link>

            <Link
              href="/strategies"
              onClick={() => setIsOpen(false)}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex flex-col items-start gap-1.5 active:scale-95 transition-all"
            >
              <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-purple-300 font-headline block truncate">Marketplace IA</span>
                <span className="text-[10px] text-white/60 block truncate">Catalogue Bots</span>
              </div>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                setIsSwapOpen(true);
              }}
              className="p-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 rounded-2xl flex flex-col items-start gap-1.5 text-left w-full active:scale-95 transition-all"
            >
              <div className="p-2 bg-sky-500/20 text-sky-300 rounded-xl">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-sky-200 font-headline block truncate">DEX Swap Express</span>
                <span className="text-[10px] text-white/60 block truncate">Jupiter / Raydium</span>
              </div>
            </button>

            <button
              onClick={handleUnlockVaultFast}
              className="p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-2xl flex flex-col items-start gap-1.5 text-left w-full active:scale-95 transition-all"
            >
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-xs font-bold text-emerald-300 font-headline block truncate">Coffre-Fort</span>
                <span className="text-[10px] text-white/60 block truncate">Vider vers Solde</span>
              </div>
            </button>
          </div>

          {/* Section Panic Switch */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-white/70 font-body">Arrêt d&apos;Urgence Global :</span>
            <PanicKillSwitch />
          </div>
        </DialogContent>
      </Dialog>

      {/* DEX Swap Modal */}
      <DEXSwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />
    </>
  );
}
