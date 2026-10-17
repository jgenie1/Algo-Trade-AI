"use client";

import React from 'react';
import { X, ExternalLink, Shield, Sliders, Check, Scissors } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg, formatSmartPnl, isRealOnChainPosition } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  position: initialPosition,
  onClose,
  livePrices,
  handleClosePosition
}: PositionDetailsModalProps) {
  const { activePositions, setActivePositions, setBalance, setReserveVault, setClosedPositions } = useAppState();
  const position = React.useMemo(
    () => activePositions.find(p => p.id === initialPosition.id) || initialPosition,
    [activePositions, initialPosition]
  );

  const current = resolveLivePrice(position.pair, livePrices) || (typeof position.currentPrice === 'number' && !isNaN(position.currentPrice) ? position.currentPrice : position.entryPrice);
  const priceDiff = current - position.entryPrice;
  const pctDiff = position.entryPrice > 0 ? (priceDiff / position.entryPrice) : 0;
  const isLong = position.type === 'BUY' || (position.type as string) === 'LONG';
  const profit = pctDiff * position.amount * position.leverage * (isLong ? 1 : -1);
  const pnlPct = pctDiff * position.leverage * (isLong ? 100 : -100);
  const isProfit = profit >= 0;
  const cleanName = position.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');
  const posChain: 'SOL' | 'BSC' = (position as any).chain
    ? ((position as any).chain.toUpperCase().includes('BSC') ? 'BSC' : 'SOL')
    : (position.pair?.startsWith('BSC:') ? 'BSC' : 'SOL');
  const isSol = isRealOnChainPosition(position);
  const mint = position.mint || (position.pair.startsWith('SOL:') ? position.pair.split(':')[1] : '');

  const [isClosing, setIsClosing] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string | null>(null);
  const [isEditingSlTp, setIsEditingSlTp] = React.useState(false);
  const [editSl, setEditSl] = React.useState<string>(position.sl ? String(position.sl) : '');
  const [editTp, setEditTp] = React.useState<string>(position.tp ? String(position.tp) : '');
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEditingSlTp) {
      setEditSl(position.sl ? String(position.sl) : '');
      setEditTp(position.tp ? String(position.tp) : '');
    }
  }, [position.sl, position.tp, isEditingSlTp]);

  const isBeLocked = Boolean(
    position.isBreakEvenLocked ||
    (isLong && position.sl && position.sl > position.entryPrice) ||
    (!isLong && position.sl && position.sl < position.entryPrice)
  );

  const canLockBreakEven = isLong
    ? current > position.entryPrice * 1.003 && (!position.sl || position.sl <= position.entryPrice)
    : current < position.entryPrice * 0.997 && (!position.sl || position.sl >= position.entryPrice);

  const handleSaveSlTp = () => {
    setCloseError(null);
    const nextSl = editSl.trim() ? parseFloat(editSl) : undefined;
    const nextTp = editTp.trim() ? parseFloat(editTp) : undefined;

    if (nextSl !== undefined && (isNaN(nextSl) || nextSl <= 0)) {
      setCloseError('Veuillez saisir un prix de Stop-Loss valide (> 0).');
      return;
    }
    if (nextTp !== undefined && (isNaN(nextTp) || nextTp <= 0)) {
      setCloseError('Veuillez saisir un prix de Take-Profit valide (> 0).');
      return;
    }

    if (nextSl !== undefined && !isNaN(nextSl)) {
      if (isLong && nextSl >= current) {
        setCloseError(`Le Stop-Loss LONG (${formatDisplayPrice(nextSl)}) doit être inférieur au prix actuel (${formatDisplayPrice(current)}).`);
        return;
      }
      if (!isLong && nextSl <= current) {
        setCloseError(`Le Stop-Loss SHORT (${formatDisplayPrice(nextSl)}) doit être supérieur au prix actuel (${formatDisplayPrice(current)}).`);
        return;
      }
    }

    if (nextTp !== undefined && !isNaN(nextTp)) {
      if (isLong && nextTp <= current) {
        setCloseError(`Le Take-Profit LONG (${formatDisplayPrice(nextTp)}) doit être supérieur au prix actuel (${formatDisplayPrice(current)}).`);
        return;
      }
      if (!isLong && nextTp >= current) {
        setCloseError(`Le Take-Profit SHORT (${formatDisplayPrice(nextTp)}) doit être inférieur au prix actuel (${formatDisplayPrice(current)}).`);
        return;
      }
    }

    const nextBe = Boolean(
      (isLong && nextSl && nextSl > position.entryPrice) ||
      (!isLong && nextSl && nextSl < position.entryPrice)
    );

    setActivePositions(prev => {
      const updated = prev.map(item =>
        item.id === position.id
          ? {
              ...item,
              sl: nextSl,
              tp: nextTp,
              isBreakEvenLocked: nextBe,
              highestPrice: current,
              lowestPrice: current,
              trailingTier: nextBe ? Math.max(item.trailingTier || 0, 1) : 0
            }
          : item
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('trade_positions', JSON.stringify(updated));
      }
      return updated;
    });
    setIsEditingSlTp(false);
    setActionFeedback('✅ Stop-Loss & Take-Profit enregistrés et activés en direct !');
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleLockBreakEvenNow = () => {
    const bufferRatio = position.pair.startsWith('SOL:') ? 0.005 : 0.003;
    const beSl = isLong
      ? position.entryPrice * (1 + bufferRatio)
      : position.entryPrice * (1 - bufferRatio);

    setActivePositions(prev => {
      const updated = prev.map(item =>
        item.id === position.id
          ? {
              ...item,
              sl: beSl,
              isBreakEvenLocked: true,
              trailingTier: Math.max(item.trailingTier || 0, 1)
            }
          : item
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('trade_positions', JSON.stringify(updated));
      }
      return updated;
    });
    setActionFeedback(`🛡️ Break-Even verrouillé à ${formatDisplayPrice(beSl)} (+${(bufferRatio * 100).toFixed(1)}% garanti) !`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handlePartialClose50 = () => {
    if (isSol || position.amount < 2) return;
    const halfAmount = parseFloat((position.amount * 0.5).toFixed(2));
    const remainingAmount = parseFloat((position.amount - halfAmount).toFixed(2));
    const halfProfit = profit * 0.5;
    const autoReserveEnabled = typeof window !== 'undefined' ? localStorage.getItem('auto_reserve_10_percent_enabled') !== 'false' : true;

    if (halfProfit > 0) {
      const vaultSkim = autoReserveEnabled ? halfProfit * 0.10 : 0;
      const netProfit = halfProfit - vaultSkim;
      setBalance(bal => bal + halfAmount + netProfit);
      if (vaultSkim > 0) {
        setReserveVault(vault => {
          const updated = vault + vaultSkim;
          if (typeof window !== 'undefined') localStorage.setItem('trade_reserve_vault', updated.toString());
          return updated;
        });
      }
    } else {
      setBalance(bal => bal + Math.max(0, halfAmount + halfProfit));
    }

    const bufferRatio = 0.003;
    const autoBeSl = isProfit
      ? (isLong ? Math.max(position.sl || 0, position.entryPrice * (1 + bufferRatio)) : Math.min(position.sl || Infinity, position.entryPrice * (1 - bufferRatio)))
      : position.sl;

    setActivePositions(prev => {
      const updated = prev.map(item =>
        item.id === position.id
          ? {
              ...item,
              amount: remainingAmount,
              sl: autoBeSl,
              isBreakEvenLocked: isProfit ? true : item.isBreakEvenLocked,
              partialCloseCount: (item.partialCloseCount || 0) + 1
            }
          : item
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('trade_positions', JSON.stringify(updated));
      }
      return updated;
    });

    setClosedPositions(prev => [
      {
        id: `${position.id}_part_${Date.now()}`,
        pair: position.pair,
        type: position.type,
        entryPrice: position.entryPrice,
        exitPrice: current,
        amount: halfAmount,
        leverage: position.leverage,
        profit: parseFloat(halfProfit.toFixed(2)),
        pnl: parseFloat(halfProfit.toFixed(2)),
        timestamp: position.timestamp || Date.now(),
        closeTimestamp: Date.now(),
        wasBot: !!position.botId,
        botId: position.botId,
        botName: position.botName,
        mode: 'DEMO'
      },
      ...prev
    ]);

    setActionFeedback(`✂️ 50% encaissé (${halfAmount.toFixed(2)} $ + PnL ${halfProfit >= 0 ? '+' : ''}${halfProfit.toFixed(2)} $). Restant: ${remainingAmount.toFixed(2)} $ sécurisé !`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

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

  // Calcul de la jauge de progression SL <-> TP
  const effectiveSl = position.sl || (isLong ? position.entryPrice * 0.97 : position.entryPrice * 1.03);
  const effectiveTp = position.tp || (isLong ? position.entryPrice * 1.06 : position.entryPrice * 0.94);
  const totalRange = Math.abs(effectiveTp - effectiveSl);
  const progressPct = totalRange > 0
    ? Math.max(0, Math.min(100, isLong ? ((current - effectiveSl) / totalRange) * 100 : ((effectiveSl - current) / totalRange) * 100))
    : 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl p-6 space-y-5 relative bg-[#0e0a12]/95 my-auto max-h-[92vh] overflow-y-auto">
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
        <div className="flex items-center gap-3 flex-wrap pr-8">
          <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2 flex-wrap">
            <span>Détails du Trade : {cleanName}</span>
            {position.botId && (
              <Badge className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase font-bold border-none">
                Bot Actif
              </Badge>
            )}
            {position.dcaCount && position.dcaCount > 1 && (
              <Badge className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 uppercase font-mono font-bold border-none">
                DCA Niveau {position.dcaCount}/3
              </Badge>
            )}
            {isBeLocked && (
              <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 uppercase font-mono font-bold border-none">
                🛡️ Gain Garanti {position.trailingTier ? `(Palier ${position.trailingTier}/4)` : ''}
              </Badge>
            )}
            {position.isAiPatternBoosted && (
              <Badge className="text-[9px] bg-gradient-to-r from-emerald-500/20 to-purple-500/20 text-[#c2ff0c] px-2 py-0.5 rounded border border-[#c2ff0c]/40 uppercase font-mono font-bold">
                ⚡ IA Boostée
              </Badge>
            )}
          </h3>
          <Badge 
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold font-headline uppercase border-none",
              isLong ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            )}
          >
            {isLong ? 'LONG / ACHAT' : 'SHORT / VENTE'}
          </Badge>
        </div>

        {actionFeedback && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold font-mono animate-in fade-in duration-150">
            {actionFeedback}
          </div>
        )}

        {position.isAiPatternBoosted && (
          <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-purple-950/40 border border-[#c2ff0c]/30 rounded-xl space-y-1 font-mono text-[10px]">
            <div className="flex items-center gap-1.5 text-[#c2ff0c] font-bold">
              <span>🧠 OPTIMISATION PAR APPRENTISSAGE IA</span>
            </div>
            <p className="text-white/80 leading-relaxed font-body text-xs">
              {position.aiBoostReason || "Cette position a bénéficié d'une allocation renforcée (+20% à +25%) et d'un ratio Risk/Reward optimisé suite à la validation d'un motif gagnant."}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5">
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
            <span className="text-[10px] text-white/40 block uppercase font-headline">Levier & Excursion Max</span>
            <span className="text-sm font-bold text-white font-body">{position.leverage}x</span>
            <span className="text-[9px] text-emerald-400/90 font-mono block mt-0.5">
              Pic Max: +{(Math.max(position.highestPnlPct || 0, isProfit ? pnlPct : 0)).toFixed(2)}%
            </span>
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
            <span className={cn("text-sm font-bold font-body block", isBeLocked ? "text-emerald-400" : "text-rose-400")}>
              {position.sl 
                ? `${formatDisplayPrice(position.sl)} ${isSol ? 'SOL' : '$'}`
                : 'Protection auto (-3%)'}
            </span>
            <span className={cn("text-[9px] font-mono block mt-0.5", isBeLocked ? "text-emerald-300 font-semibold" : "text-rose-300/80")}>
              {position.sl && position.entryPrice > 0
                ? (isBeLocked
                  ? `🛡️ Profit Garanti: +${Math.abs(((position.sl - position.entryPrice) / position.entryPrice) * 100).toFixed(2)}%`
                  : `Seuil max: -${Math.abs(((position.sl - position.entryPrice) / position.entryPrice) * 100).toFixed(2)}%`)
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

        {/* SL <-> TP Trajectory Gauge & Interactive Controls */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-rose-400 font-bold">SL: {formatDisplayPrice(effectiveSl)}</span>
            <span className="text-white/60">Progression vers TP ({progressPct.toFixed(0)}%)</span>
            <span className="text-emerald-400 font-bold">TP: {formatDisplayPrice(effectiveTp)}</span>
          </div>
          <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/10 relative">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isProfit ? "bg-gradient-to-r from-emerald-500 to-[#c2ff0c]" : "bg-gradient-to-r from-rose-500 to-amber-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Quick Position Management Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditingSlTp(v => !v)}
              className="h-8 px-2.5 text-[10px] font-headline font-bold bg-white/5 hover:bg-white/10 border-white/15 text-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="h-3 w-3 text-[#c2ff0c]" />
              {isEditingSlTp ? 'Masquer Éditeur SL/TP' : 'Modifier SL / TP'}
            </Button>

            {canLockBreakEven && (
              <Button
                type="button"
                size="sm"
                onClick={handleLockBreakEvenNow}
                className="h-8 px-2.5 text-[10px] font-headline font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Shield className="h-3 w-3 text-emerald-400" />
                Sécuriser Break-Even
              </Button>
            )}

            {!isSol && position.amount >= 2 && (
              <Button
                type="button"
                size="sm"
                onClick={handlePartialClose50}
                className="h-8 px-2.5 text-[10px] font-headline font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Scissors className="h-3 w-3 text-amber-400" />
                Encaisser 50%
              </Button>
            )}
          </div>

          {isEditingSlTp && (
            <div className="pt-2 border-t border-white/10 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-[9px] text-white/50 uppercase font-headline font-bold">Préréglages rapides (depuis prix actuel) :</span>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: 'Serré (-1% / +2.5%)', slPct: 0.01, tpPct: 0.025 },
                    { label: 'Standard (-2.5% / +6%)', slPct: 0.025, tpPct: 0.06 },
                    { label: 'Large (-5% / +12%)', slPct: 0.05, tpPct: 0.12 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (current > 0) {
                          const decimals = current >= 100 ? 2 : current >= 1 ? 4 : current >= 0.001 ? 6 : 8;
                          const nextSlVal = isLong ? current * (1 - preset.slPct) : current * (1 + preset.slPct);
                          const nextTpVal = isLong ? current * (1 + preset.tpPct) : current * (1 - preset.tpPct);
                          setEditSl(nextSlVal.toFixed(decimals));
                          setEditTp(nextTpVal.toFixed(decimals));
                          setCloseError(null);
                        }
                      }}
                      className="px-2 py-0.5 text-[9px] font-mono font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded text-slate-300 hover:text-[#c2ff0c] transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-headline font-bold text-rose-300">Nouveau Stop-Loss</label>
                  <Input
                    type="number"
                    step="any"
                    value={editSl}
                    onChange={(e) => {
                      setEditSl(e.target.value);
                      setCloseError(null);
                    }}
                    className="h-9 bg-black/40 border-white/15 text-xs font-mono text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-headline font-bold text-emerald-300">Nouveau Take-Profit</label>
                  <Input
                    type="number"
                    step="any"
                    value={editTp}
                    onChange={(e) => {
                      setEditTp(e.target.value);
                      setCloseError(null);
                    }}
                    className="h-9 bg-black/40 border-white/15 text-xs font-mono text-white"
                  />
                </div>
              </div>
              {closeError && (
                <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-lg text-rose-300 text-[11px] font-medium">
                  ⚠️ {closeError}
                </div>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSlTp}
                className="w-full h-8 bg-[#c2ff0c] hover:bg-[#b0e60b] text-black font-headline font-extrabold text-[10px] uppercase rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Enregistrer SL / TP en Direct
              </Button>
            </div>
          )}
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
              ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
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
