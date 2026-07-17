"use client";

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Position {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  sl?: number;
  tp?: number;
  timestamp: number;
  botId?: string;
  txHash?: string;
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW';
  bondingCurveProgress?: number;
  replyCount?: number;
}

interface PositionDetailsModalProps {
  position: Position;
  onClose: () => void;
  livePrices: { [key: string]: number };
  handleClosePosition: (pos: Position) => void;
}

export default function PositionDetailsModal({
  position,
  onClose,
  livePrices,
  handleClosePosition
}: PositionDetailsModalProps) {
  const current = livePrices[position.pair] || position.entryPrice;
  const priceDiff = current - position.entryPrice;
  const pctDiff = position.entryPrice > 0 ? (priceDiff / position.entryPrice) : 0;
  const profit = pctDiff * position.amount * position.leverage * (position.type === 'BUY' ? 1 : -1);
  const isProfit = profit >= 0;
  const cleanName = position.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
  const isSol = position.pair.startsWith('SOL:');
  const mint = isSol ? position.pair.split(':')[1] : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-6 relative bg-[#0e0a12]/95">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors h-8 w-8 rounded-lg hover:bg-white/5"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Title & Type Badge */}
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
            <span>Détails du Trade : {cleanName}</span>
            {position.botId && (
              <Badge className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase font-bold border-none">
                Bot Actif
              </Badge>
            )}
          </h3>
          <Badge 
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold font-headline uppercase border-none",
              position.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            )}
          >
            {position.type === 'BUY' ? 'LONG / ACHAT' : 'SHORT / VENTE'}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Marge Engagée</span>
            <span className="text-sm font-bold text-white font-body">{position.amount.toFixed(2)} $</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Levier configuré</span>
            <span className="text-sm font-bold text-white font-body">{position.leverage}x</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Prix d'Entrée</span>
            <span className="text-sm font-bold text-white font-body">
              {position.entryPrice.toFixed(position.entryPrice > 100 ? 2 : 5)} {isSol ? 'SOL' : ''}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Prix Actuel</span>
            <span className="text-sm font-bold text-[#c2ff0c] font-body">
              {current.toFixed(position.entryPrice > 100 ? 2 : 5)} {isSol ? 'SOL' : ''}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Stop Loss (SL)</span>
            <span className="text-sm font-bold text-rose-400 font-body">
              {position.sl ? `${position.sl.toFixed(position.entryPrice > 100 ? 2 : 5)}` : 'Aucun'}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Take Profit (TP)</span>
            <span className="text-sm font-bold text-emerald-400 font-body">
              {position.tp ? `${position.tp.toFixed(position.entryPrice > 100 ? 2 : 5)}` : 'Aucun'}
            </span>
          </div>
        </div>

        {/* Profit & Performance */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-white/40 block uppercase font-headline">PnL en direct</span>
            <span className={cn(
              "text-xl font-bold font-body",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              {isProfit ? '+' : ''}{profit.toFixed(2)} $
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Variation en %</span>
            <span className={cn(
              "text-sm font-bold font-body",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              ({isProfit ? '+' : ''}{(pctDiff * position.leverage * (position.type === 'BUY' ? 100 : -100)).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Dynamic Metadata Section */}
        {isSol && (
          <div className="bg-purple-950/10 border border-purple-500/10 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 font-headline">Métadonnées Solana & Pump.fun</h4>
            
            {position.bondingCurveProgress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-body text-purple-300/80">
                  <span>Progression Bonding Curve</span>
                  <span className="font-bold">{position.bondingCurveProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-purple-950/40 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${position.bondingCurveProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-[10px] font-body text-purple-300/70 pt-1">
              <div>
                <span className="block text-[8px] text-white/30 uppercase font-headline">Activité Sociale</span>
                <span className="font-bold text-white">{position.replyCount ?? 0} réponses</span>
              </div>
              <div>
                <span className="block text-[8px] text-white/30 uppercase font-headline">Date d'Ouverture</span>
                <span className="font-bold text-white">{new Date(position.timestamp).toLocaleTimeString('fr-FR')}</span>
              </div>
            </div>

            {mint && (
              <div className="border-t border-purple-500/10 pt-2.5 flex items-center justify-between text-[9px] font-mono text-purple-300/50">
                <span className="truncate pr-2">CA: {mint}</span>
                <div className="flex gap-1.5">
                  {position.txHash && (
                    <a
                      href={`https://solscan.io/tx/${position.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold font-body"
                    >
                      Tx Achat
                    </a>
                  )}
                  <a
                    href={`https://pump.fun/${mint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold font-body"
                  >
                    Pump.fun
                  </a>
                  <a
                    href={`https://solscan.io/token/${mint}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold font-body"
                  >
                    Solscan
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bot Indicators Section */}
        {!isSol && position.botId && (
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 font-headline">Indicateurs à l'Entrée</h4>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-body text-white/60">
              <div>
                <span>RSI d'Entrée :</span>
                <span className="font-bold text-white ml-1.5">{position.entryRsi?.toFixed(1) ?? 'N/A'}</span>
              </div>
              <div>
                <span>Tendance EMA 20 :</span>
                <span className="font-bold text-white ml-1.5">
                  {position.entryEmaTrend === 'ABOVE' ? 'Haussière' : 'Baissière'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => {
              handleClosePosition(position);
              onClose();
            }}
            className="flex-1 h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-semibold font-headline uppercase transition-all duration-200 border-none"
          >
            Fermer la Position (Dump)
          </Button>
          <Button
            onClick={onClose}
            className="px-5 h-11 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-xs font-semibold font-headline uppercase transition-all duration-200 border-none"
          >
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
}
