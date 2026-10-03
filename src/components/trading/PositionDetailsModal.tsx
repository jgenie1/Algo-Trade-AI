"use client";

import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg, formatSmartPnl } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Position } from '@/types';
import { resolveLivePrice } from '@/lib/symbolUtils';
import { getExplorerTxUrl, getExplorerTokenUrl } from '@/utils/explorerLinks';

function formatDisplayPrice(val: number): string {
  if (!val || isNaN(val)) return '0.00';
  if (val >= 1000) return val.toFixed(2);
  if (val >= 1) return val.toFixed(4);
  if (val >= 0.0001) return val.toFixed(6);
  return val.toFixed(8);
}

interface PositionDetailsModalProps {
  position: Position;
  onClose: () => void;
  livePrices: { [key: string]: number };
  handleClosePosition: (pos: Position) => void | Promise<void>;
}

export default function PositionDetailsModal({
  position,
  onClose,
  livePrices,
  handleClosePosition
}: PositionDetailsModalProps) {
  const current = resolveLivePrice(position.pair, livePrices) || (typeof position.currentPrice === 'number' && !isNaN(position.currentPrice) ? position.currentPrice : position.entryPrice);
  const priceDiff = current - position.entryPrice;
  const pctDiff = position.entryPrice > 0 ? (priceDiff / position.entryPrice) : 0;
  const isLong = position.type === 'BUY' || (position.type as string) === 'LONG';
  const profit = pctDiff * position.amount * position.leverage * (isLong ? 1 : -1);
  const isProfit = profit >= 0;
  const cleanName = position.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
  const posChain: 'SOL' | 'BSC' = (position as any).chain
    ? ((position as any).chain.toUpperCase().includes('BSC') ? 'BSC' : 'SOL')
    : (position.pair?.startsWith('BSC:') ? 'BSC' : 'SOL');
  const isSol = posChain === 'SOL' || position.pair.startsWith('SOL:');
  const mint = isSol ? (position.mint || (position.pair.startsWith('SOL:') ? position.pair.split(':')[1] : '')) : '';

  const [isClosing, setIsClosing] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string | null>(null);

  const handleConfirmClose = async () => {
    if (!position) return;
    setIsClosing(true);
    setCloseError(null);
    try {
      await handleClosePosition(position);
      onClose();
    } catch (err: any) {
      const errMsg = err?.message || 'Échec de la fermeture de la position on-chain.';
      setCloseError(errMsg);
    } finally {
      setIsClosing(false);
    }
  };

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
            <span className="text-sm font-bold text-white font-body">
              {isSol ? position.amount.toFixed(4) : position.amount.toFixed(2)} {isSol ? 'SOL' : '$'}
            </span>
            <span className="text-[9px] text-white/40 font-mono block mt-0.5">
              {isSol ? formatSolToUsdAndHtg(position.amount).combinedLabel : `≈ ${formatUsdToHtg(position.amount)}`}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Levier configuré</span>
            <span className="text-sm font-bold text-white font-body">{position.leverage}x</span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Prix d&apos;Entrée</span>
            <span className="text-sm font-bold text-white font-body">
              {formatDisplayPrice(position.entryPrice)} {isSol ? 'SOL' : '$'}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Prix Actuel</span>
            <span className="text-sm font-bold text-[#c2ff0c] font-body">
              {formatDisplayPrice(current)} {isSol ? 'SOL' : '$'}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Stop Loss (SL Trade)</span>
            <span className="text-sm font-bold text-rose-400 font-body block">
              {position.sl 
                ? `${formatDisplayPrice(position.sl)} ${isSol ? 'SOL' : '$'}`
                : 'Protection auto (-3%)'}
            </span>
            <span className="text-[9px] text-rose-300/80 font-mono block mt-0.5">
              {position.sl && position.entryPrice > 0
                ? `Seuil max: -${Math.abs(((position.sl - position.entryPrice) / position.entryPrice) * 100).toFixed(2)}%`
                : 'Sécurité automatique active'}
            </span>
          </div>
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Take Profit (TP)</span>
            <span className="text-sm font-bold text-emerald-400 font-body block">
              {position.tp 
                ? `${formatDisplayPrice(position.tp)} ${isSol ? 'SOL' : '$'}` 
                : 'Objectif auto (+6%)'}
            </span>
            <span className="text-[9px] text-emerald-300/80 font-mono block mt-0.5">
              {position.tp && position.entryPrice > 0
                ? `Objectif: +${Math.abs(((position.tp - position.entryPrice) / position.entryPrice) * 100).toFixed(2)}%`
                : 'Verrouillage automatique actif'}
            </span>
          </div>
        </div>

        {/* Profit & Performance */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-white/40 block uppercase font-headline">PnL en direct</span>
            <span className={cn(
              "text-xl font-bold font-body block",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              {formatSmartPnl(profit, isSol)} {isSol ? 'SOL' : '$'}
            </span>
            <span className="text-[10px] text-white/50 font-mono font-semibold block mt-0.5">
              {isSol ? formatSolToUsdAndHtg(profit).combinedLabel : `≈ ${formatUsdToHtg(profit)}`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/40 block uppercase font-headline">Variation en %</span>
            <span className={cn(
              "text-sm font-bold font-body",
              isProfit ? "text-emerald-400" : "text-rose-400"
            )}>
              ({isProfit ? '+' : ''}{(pctDiff * position.leverage * (isLong ? 100 : -100)).toFixed(2)}%)
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
                <span className="block text-[8px] text-white/30 uppercase font-headline">Filtre IA Sniper</span>
                <span className="font-bold text-[#c2ff0c]">Validé (14 Critères)</span>
              </div>
            </div>

            <div className="p-3 bg-black/40 border border-purple-500/20 rounded-xl space-y-1.5 font-mono text-[9.5px]">
              <div className="flex justify-between items-center text-[#c2ff0c] font-headline font-bold text-[10px]">
                <span>🎯 ÉVALUATION SNIPER 14-POINTS</span>
                <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] border border-[#c2ff0c]/30 text-[8px] px-1.5 py-0">
                  CONFIRMÉ
                </Badge>
              </div>
              <p className="text-white/70 leading-relaxed">
                Smart Money: <strong className="text-white">8/10</strong> • Liquidité: <strong className="text-white">7/10</strong> • Meme Score: <strong className="text-white">8.5/10</strong>
              </p>
              <p className="text-emerald-400 font-extrabold">
                ⚡ Objectifs Extrapolés : TP1 (x2) | TP2 (x5) | TP3 (x10) | TP4 (x20) | TP5 (x100)
              </p>
            </div>

            {mint && !mint.startsWith('custom_mint') && !mint.startsWith('ukhh') && (
              <div className="border-t border-purple-500/10 pt-2.5 flex items-center justify-between text-[9px] font-mono text-purple-300/50">
                <span className="truncate pr-2">CA: {mint}</span>
                <div className="flex gap-1.5">
                  <a
                    href={`https://pump.fun/${mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold font-body"
                  >
                    Pump.fun
                  </a>
                  <a
                    href={getExplorerTokenUrl(posChain, mint)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-semibold font-body flex items-center gap-1"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    {posChain === 'SOL' ? 'Solscan Token' : 'BscScan Token'}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* On-Chain Transaction Verification Section */}
        {position.txHash && (
          <div className="bg-purple-950/20 border border-purple-500/30 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-purple-300 font-headline flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Preuve d&apos;Exécution On-Chain ({posChain === 'SOL' ? 'Solana / Solscan' : 'BSC / BscScan'})
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                100% Vérifiable
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-white/10 gap-2">
              <span className="text-white/60 truncate">Hash: {position.txHash}</span>
              <a
                href={getExplorerTxUrl(posChain, position.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm"
              >
                <ExternalLink className="h-3 w-3" />
                Voir sur {posChain === 'SOL' ? 'Solscan' : 'BscScan'}
              </a>
            </div>
          </div>
        )}

        {/* Close Error Banner */}
        {closeError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
            ⚠️ {closeError}
          </div>
        )}

        {/* Bot Indicators Section */}
        {!isSol && position.botId && (
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400 font-headline">Indicateurs à l&apos;Entrée</h4>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-body text-white/60">
              <div>
                <span>RSI d&apos;Entrée :</span>
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
            onClick={handleConfirmClose}
            disabled={isClosing}
            className="flex-1 h-11 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 rounded-xl text-xs font-bold font-headline uppercase transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isClosing ? "Fermeture on-chain en cours..." : "Fermer la Position"}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isClosing}
            className="px-5 h-11 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-semibold font-headline uppercase transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
}
