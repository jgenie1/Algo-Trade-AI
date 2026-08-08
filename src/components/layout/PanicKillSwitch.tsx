"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { AlertOctagon, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAppState } from '@/context/AppContext';
import { dispatchAlert } from '@/services/notificationService';

export default function PanicKillSwitch() {
  const { 
    tradingMode,
    balance,
    setBalance,
    activePositions, 
    setActivePositions, 
    closedPositions, 
    setClosedPositions, 
    bots, 
    setBots 
  } = useAppState();

  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleExecuteKillSwitch = async () => {
    setIsExecuting(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    // 1. Fermer toutes les positions ouvertes et récréditer le solde (marge + pnl)
    const now = Date.now();
    let totalReturnedCapital = 0;
    const safePositions = Array.isArray(activePositions) ? activePositions : [];
    const positionsToClose = safePositions.map(pos => {
      const margin = typeof pos.amount === 'number' && !isNaN(pos.amount) ? pos.amount : 0;
      const entry = typeof pos.entryPrice === 'number' && !isNaN(pos.entryPrice) && pos.entryPrice > 0 ? pos.entryPrice : 145.50;
      const current = pos.currentPrice || entry;
      const priceDiff = current - entry;
      const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
      const lev = typeof pos.leverage === 'number' && !isNaN(pos.leverage) ? pos.leverage : 1;
      const isLong = pos.type === 'BUY' || (pos.type as string) === 'LONG';
      const pnlVal = pctDiff * margin * lev * (isLong ? 1 : -1);
      const returnedForPos = Math.max(0, margin + pnlVal);
      totalReturnedCapital += returnedForPos;
      return {
        ...pos,
        closedAt: now,
        status: 'CLOSED',
        profit: pnlVal,
        pnl: pnlVal
      };
    });

    if (tradingMode === 'DEMO' && totalReturnedCapital > 0) {
      setBalance(prev => Math.max(0, prev + totalReturnedCapital));
    } else if (tradingMode === 'REAL') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('web3_wallet_updated'));
      }
    }

    setClosedPositions([...positionsToClose, ...closedPositions]);
    setActivePositions([]);

    // 2. Mettre en pause tous les bots actifs
    const safeBots = Array.isArray(bots) ? bots : [];
    const stoppedBots = safeBots.map(b => ({
      ...b,
      status: 'PAUSED' as const
    }));
    setBots(stoppedBots);

    // 3. Envoyer une alerte d'urgence Telegram & Discord
    await dispatchAlert(
      "🚨 ARRÊT D'URGENCE EXÉCUTÉ (PANIC KILL SWITCH)",
      `Toutes les positions actives (${activePositions.length}) ont été fermées d'urgence et tous les bots (${bots.length}) ont été mis en pause immédiate. Le capital restant est mis en sécurité.`,
      'STOP_LOSS'
    );

    setIsExecuting(false);
    setIsDone(true);

    setTimeout(() => {
      setIsDone(false);
      setIsOpen(false);
    }, 2500);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="h-10 px-3 bg-gradient-to-r from-rose-950/60 to-red-950/60 hover:from-rose-900/80 hover:to-red-900/80 border border-rose-500/40 text-rose-300 font-headline font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.35)] shrink-0"
      >
        <AlertOctagon className="h-4 w-4 text-rose-400 animate-pulse" />
        <span className="hidden md:inline font-headline uppercase tracking-wide">Arrêt d'Urgence</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#140b12] border-rose-500/30 text-white rounded-3xl p-6 max-w-md shadow-2xl space-y-4">
          <DialogHeader className="border-b border-rose-500/15 pb-3">
            <DialogTitle className="text-xl font-headline font-extrabold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              Arrêt d'Urgence Général (Kill Switch)
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 font-body mt-1">
              Cette action clôturera <strong>immédiatement 100% de vos positions actives</strong> et suspendra l'exécution de <strong>tous vos bots de trading</strong>.
            </DialogDescription>
          </DialogHeader>

          {isDone ? (
            <div className="py-6 text-center space-y-3 font-body">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-white font-headline">Positions Fermées & Bots Stoppés !</h3>
              <p className="text-xs text-white/70">
                Toutes vos positions actives ont été fermées et vos bots ont été mis en pause en sécurité.
              </p>
            </div>
          ) : (
            <div className="space-y-4 font-body py-2">
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 space-y-1">
                <p className="font-bold">⚠️ Récapitulatif de l'action d'urgence :</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-white/70">
                  <li>Fermeture instantanée de {(Array.isArray(activePositions) ? activePositions : []).length} position(s) ouverte(s).</li>
                  <li>Mise en pause de {(Array.isArray(bots) ? bots : []).filter(b => b.status === 'RUNNING').length} bot(s) en cours d'exécution.</li>
                  <li>Envoi d'une alerte prioritaire sur votre Telegram / Discord.</li>
                </ul>
              </div>

              <DialogFooter className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isExecuting}
                  className="flex-1 h-11 bg-white/5 hover:bg-white/10 border-white/10 rounded-2xl text-xs font-bold font-headline"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteKillSwitch}
                  disabled={isExecuting}
                  className="flex-1 h-11 bg-rose-600 hover:bg-rose-500 text-white font-extrabold font-headline rounded-2xl text-xs uppercase shadow-[0_0_15px_rgba(244,63,94,0.4)] border-none"
                >
                  {isExecuting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Fermeture...
                    </span>
                  ) : "Exécuter l'Arrêt d'Urgence"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
