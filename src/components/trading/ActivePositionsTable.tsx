"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useAppState } from '@/context/AppContext';
import { getDisplayPairLabel,resolveLivePrice } from '@/lib/symbolUtils';
import { cn,formatSmartPnl,getRealMarketBasePrice,isRealOnChainPosition } from '@/lib/utils';
import { getExplorerTxUrl } from '@/utils/explorerLinks';
import { Activity,ExternalLink,Eye } from 'lucide-react';
import React from 'react';

interface ActivePositionsTableProps {
  livePrices: { [key: string]: number };
  setSelectedPosition: (pos: any) => void;
  handleClosePosition: (pos: any) => void;
  handleCloseAllPositions?: (targetMode?: 'DEMO' | 'REAL') => void;
}

function getPositionChain(pos: any): 'SOL' | 'BSC' {
  if (pos?.chain) {
    return pos.chain.toUpperCase().includes('BSC') ? 'BSC' : 'SOL';
  }
  if (pos?.pair?.startsWith('BSC:')) return 'BSC';
  return 'SOL';
}

function formatDisplayPrice(val: number): string {
  if (!val || isNaN(val)) return '0.00';
  if (val >= 1000) return val.toFixed(2);
  if (val >= 1) return val.toFixed(4);
  if (val >= 0.0001) return val.toFixed(6);
  return val.toFixed(8);
}

export default function ActivePositionsTable({
  livePrices,
  setSelectedPosition,
  handleClosePosition,
  handleCloseAllPositions
}: ActivePositionsTableProps) {
  const { activePositions, setActivePositions, setBalance, setReserveVault, setClosedPositions, setBots, tradingMode, isLoading } = useAppState();
  const [closingIds, setClosingIds] = React.useState<Record<string, boolean>>({});
  const [isClosingAll, setIsClosingAll] = React.useState(false);

  const handleQuickBreakEven = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!p || !p.entryPrice) return;
    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
    const bufferRatio = p.pair?.startsWith('SOL:') ? 0.005 : 0.003;
    const beSl = isLong ? p.entryPrice * (1 + bufferRatio) : p.entryPrice * (1 - bufferRatio);

    setActivePositions(prev => {
      const updated = prev.map(item =>
        item.id === p.id
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
  };

  const handleQuickPartial50 = (p: any, currentPriceVal: number, totalProfitVal: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!p || isRealOnChainPosition(p) || (p.amount || 0) < 2) return;
    const halfAmount = parseFloat((p.amount * 0.5).toFixed(2));
    const remainingAmount = parseFloat((p.amount - halfAmount).toFixed(2));
    const halfProfit = parseFloat((totalProfitVal * 0.5).toFixed(2));
    const autoReserveEnabled = typeof window !== 'undefined' ? localStorage.getItem('auto_reserve_10_percent_enabled') !== 'false' : true;
    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';

    if (halfProfit > 0) {
      const vaultSkim = autoReserveEnabled ? parseFloat((halfProfit * 0.10).toFixed(2)) : 0;
      const netProfit = parseFloat((halfProfit - vaultSkim).toFixed(2));
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
    const autoBeSl = halfProfit > 0 && p.entryPrice
      ? (isLong ? Math.max(p.sl || 0, p.entryPrice * (1 + bufferRatio)) : Math.min(p.sl || Infinity, p.entryPrice * (1 - bufferRatio)))
      : p.sl;

    setActivePositions(prev => {
      const updated = prev.map(item =>
        item.id === p.id
          ? {
              ...item,
              amount: remainingAmount,
              sl: autoBeSl,
              isBreakEvenLocked: halfProfit > 0 ? true : item.isBreakEvenLocked,
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
        id: `${p.id}_part_${Date.now()}`,
        pair: p.pair,
        type: p.type,
        entryPrice: p.entryPrice,
        exitPrice: currentPriceVal,
        amount: halfAmount,
        leverage: p.leverage || 1,
        profit: halfProfit,
        pnl: halfProfit,
        timestamp: p.timestamp || Date.now(),
        closeTimestamp: Date.now(),
        wasBot: !!p.botId,
        botId: p.botId,
        botName: p.botName,
        mode: 'DEMO'
      },
      ...prev
    ]);

    if (p.botId && setBots) {
      const isWin = halfProfit >= 0;
      setBots(prev => prev.map(b => {
        if (b.id !== p.botId) return b;
        const nextTotal = (b.tradesCount || b.totalTrades || 0) + 1;
        const nextWins = (b.winningTrades || 0) + (isWin ? 1 : 0);
        const nextWinRate = Math.round((nextWins / nextTotal) * 100);
        const nextNetProfit = parseFloat(((b.netProfit || 0) + halfProfit).toFixed(2));
        return {
          ...b,
          totalTrades: nextTotal,
          tradesCount: nextTotal,
          winningTrades: nextWins,
          winRate: nextWinRate,
          consecutiveLosses: isWin ? 0 : (b.consecutiveLosses || 0),
          netProfit: nextNetProfit,
          pnl: nextNetProfit
        };
      }));
    }
  };

  const safePositions = React.useMemo(() => {
    return Array.isArray(activePositions) ? activePositions : [];
  }, [activePositions]);

  const filteredPositions = React.useMemo(() => {
    return safePositions.filter((p: any) => {
      if (!p) return false;
      const isReal = isRealOnChainPosition(p);
      return tradingMode === 'REAL' ? isReal : !isReal;
    });
  }, [safePositions, tradingMode]);

  const isSolMode = tradingMode === 'REAL';

  // Calcul du PnL Total En Direct cumulé memoizé
  const totalLiveProfit = React.useMemo(() => {
    return filteredPositions.reduce((acc: number, p: any) => {
      const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
      const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
      const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : getRealMarketBasePrice(p.pair);
      const current = resolveLivePrice(p.pair, livePrices) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
      const priceDiff = current - entry;
      const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
      const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
      const liveProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
      return acc + (isNaN(liveProfit) ? 0 : liveProfit);
    }, 0);
  }, [filteredPositions, livePrices]);

  const isTotalProfit = totalLiveProfit >= 0;

  const handleSingleClose = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!p) return;
    const posId = p.id;
    if (posId) {
      setClosingIds(prev => ({ ...prev, [posId]: true }));
    }
    try {
      await handleClosePosition(p);
    } catch (err: any) {
      const errMsg = err?.message || 'Échec de la fermeture de la position on-chain.';
      alert(`[Erreur Clôture On-Chain] ${errMsg}`);
    } finally {
      if (posId) {
        setClosingIds(prev => {
          const next = { ...prev };
          delete next[posId];
          return next;
        });
      }
    }
  };

  const handleAllClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosingAll(true);
    try {
      if (handleCloseAllPositions) {
        await handleCloseAllPositions(tradingMode);
      } else {
        for (const p of filteredPositions) {
          await handleClosePosition(p);
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Échec lors de la clôture globale on-chain.';
      alert(`[Erreur Clôture Globale] ${errMsg}`);
    } finally {
      setIsClosingAll(false);
    }
  };

  return (
    <Card className="bg-[#150f21] border-white/15 rounded-2xl shadow-2xl">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
            <span>{tradingMode === 'DEMO' ? "Positions Ouvertes Démo" : "Positions Ouvertes Réelles (SOL)"} ({filteredPositions.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton Tout Fermer */}
            {filteredPositions.length > 0 && (
              <Button
                onClick={handleAllClose}
                disabled={isClosingAll}
                size="sm"
                className="h-7 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isClosingAll ? "Fermeture..." : `Tout Fermer (${filteredPositions.length})`}
              </Button>
            )}

            {/* Badge PnL Total En Direct */}
            {filteredPositions.length > 0 && (
              <div className={cn(
                "px-3 py-1.5 rounded-xl border text-xs font-mono font-extrabold flex items-center gap-2 shadow-inner transition-all",
                isTotalProfit 
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/40"
              )}>
                <span className="relative flex h-2 w-2">
                  <span className={cn("inline-flex rounded-full h-2 w-2", isTotalProfit ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,130,0.8)]")}></span>
                </span>
                <span>PnL Direct Total : {formatSmartPnl(totalLiveProfit, isSolMode)} {isSolMode ? 'SOL' : '$'}</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading && filteredPositions.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-6 flex items-center gap-3 bg-white/5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
            <span className="text-sm text-slate-300 font-medium font-body">Chargement des positions depuis Firebase...</span>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-slate-300 font-body text-sm bg-white/[0.02]">
            {tradingMode === 'DEMO' ? "Aucune position démo ouverte actuellement." : "Aucun snipe SOL actif actuellement."}
          </div>
        ) : (
          <div className="space-y-3">
            {/* VUE MOBILE (Cartes Tactiles Compactes avec PnL En Direct) */}
            <div className="block md:hidden space-y-3">
              {filteredPositions.map((p: any, idx: number) => {
                const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : getRealMarketBasePrice(p.pair);
                const current = resolveLivePrice(p.pair, livePrices) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
                const priceDiff = current - entry;
                const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
                const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
                const liveProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
                const profit = isNaN(liveProfit) ? 0 : liveProfit;
                const livePnlPct = pctDiff * lev * (isLong ? 100 : -100);
                const pnlPct = isNaN(livePnlPct) ? 0 : livePnlPct;
                const isProfit = profit >= 0;
                const { symbol: cleanAsset, badge, isSolana } = getDisplayPairLabel(p.pair);
                const isPosReal = isRealOnChainPosition(p);
                const isBeLocked = Boolean(
                  p.isBreakEvenLocked ||
                  (isLong && p.sl && p.sl > entry) ||
                  (!isLong && p.sl && p.sl < entry)
                );
                const canLockBe = isLong
                  ? current > entry * 1.003 && !isBeLocked
                  : current < entry * 0.997 && !isBeLocked;

                const effSl = p.sl || (isLong ? entry * 0.97 : entry * 1.03);
                const effTp = p.tp || (isLong ? entry * 1.06 : entry * 0.94);
                const range = Math.abs(effTp - effSl);
                const progressPct = range > 0
                  ? Math.max(0, Math.min(100, isLong ? ((current - effSl) / range) * 100 : ((effSl - current) / range) * 100))
                  : 50;

                return (
                  <div
                    key={p.id ? `pos_mob_${p.id}` : `pos_mob_${p.pair}_${p.timestamp || idx}`}
                    onClick={() => setSelectedPosition(p)}
                    className="p-4 bg-[#1a1429] hover:bg-[#231b38] border border-white/15 hover:border-purple-500/40 rounded-2xl space-y-3 shadow-lg cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-base text-white group-hover:text-[#c2ff0c] transition-colors">{cleanAsset}</span>
                        <Badge className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase", isSolana ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-white/60 border-white/10')}>
                          {badge}
                        </Badge>
                        <Badge className={cn("text-xs font-extrabold px-2.5 py-0.5 rounded-full border-none", isLong ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300')}>
                          {p.type} {lev}x
                        </Badge>
                        {p.botId && (
                          <span className="bg-[#2e1d44] text-[#c2ff0c] border border-[#6b3ba7]/40 text-xs font-extrabold px-2 py-0.5 rounded uppercase font-headline">
                            BOT
                          </span>
                        )}
                        {p.dcaCount && p.dcaCount > 1 && (
                          <span className="bg-blue-950/60 text-blue-300 border border-blue-500/40 text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                            DCA x{p.dcaCount}
                          </span>
                        )}
                        {isBeLocked && (
                          <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                            🛡️ {p.trailingTier && p.trailingTier >= 4 ? 'RUNNER T4' : p.trailingTier && p.trailingTier >= 2 ? `PALIER T${p.trailingTier}` : 'BE Sécurisé'}
                          </span>
                        )}
                        {p.isAiPatternBoosted && (
                          <span className="bg-gradient-to-r from-emerald-950/80 to-purple-950/80 text-[#c2ff0c] border border-[#c2ff0c]/40 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 font-mono" title={p.aiBoostReason || "Position optimisée par Apprentissage IA"}>
                            ⚡ IA Boostée
                          </span>
                        )}
                        {p.txHash && (
                          <a
                            href={getExplorerTxUrl(getPositionChain(p), p.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-purple-300 hover:text-purple-200 underline px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span>{getPositionChain(p) === 'SOL' ? 'Solscan' : 'BscScan'} ({p.txHash.slice(0, 4)}...{p.txHash.slice(-4)})</span>
                          </a>
                        )}
                      </div>

                      {/* Affichage du PnL En Direct */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="relative flex h-2 w-2 items-center justify-center">
                            <span className={cn("inline-flex rounded-full h-2 w-2", isProfit ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,130,0.8)]")}></span>
                          </span>
                          <span className={cn("text-base font-extrabold font-mono", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                            {formatSmartPnl(profit, isPosReal)} {isPosReal ? 'SOL' : '$'}
                          </span>
                        </div>
                        <span className={cn("text-xs font-mono font-bold block text-right", isProfit ? "text-emerald-400" : "text-rose-400")}>
                          ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Dynamic price precision formatting with SL and TP + Progress Bar */}
                    <div className="space-y-2 text-xs font-mono text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Entrée: <span className="text-white font-extrabold">{formatDisplayPrice(entry)}</span></div>
                        <div>Prix Direct: <span className="text-white font-extrabold">{formatDisplayPrice(current)}</span></div>
                        <div>
                          SL: <span className={cn("font-extrabold", isBeLocked ? "text-emerald-400" : "text-rose-400")}>
                            {formatDisplayPrice(effSl)}
                          </span>
                          {isBeLocked && (
                            <span className="text-[9px] text-emerald-300/80 ml-1 font-semibold">(Garanti)</span>
                          )}
                        </div>
                        <div>TP: <span className="text-emerald-400 font-extrabold">{formatDisplayPrice(effTp)}</span></div>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", isProfit ? "bg-emerald-400" : "bg-rose-400")}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPosition(p);
                        }}
                        variant="outline"
                        className="flex-1 h-9 bg-white/5 hover:bg-white/10 text-slate-200 border-white/15 text-xs font-headline font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-purple-400" /> Détails
                      </Button>
                      {canLockBe && (
                        <Button
                          onClick={(e) => handleQuickBreakEven(p, e)}
                          className="h-9 px-3 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-200 text-xs font-headline font-bold rounded-xl cursor-pointer"
                        >
                          🛡️ BE
                        </Button>
                      )}
                      {isProfit && !isPosReal && amt >= 4 && (p.partialCloseCount || 0) === 0 && (
                        <Button
                          onClick={(e) => handleQuickPartial50(p, current, profit, e)}
                          className="h-9 px-3 bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/40 text-amber-200 text-xs font-headline font-bold rounded-xl cursor-pointer"
                        >
                          ✂️ 50%
                        </Button>
                      )}
                      <Button
                        onClick={(e) => handleSingleClose(p, e)}
                        disabled={Boolean(p.id && closingIds[p.id]) || isClosingAll}
                        className="flex-1 h-9 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-headline font-bold rounded-xl disabled:opacity-50 cursor-pointer"
                      >
                        {p.id && closingIds[p.id] ? "Fermeture..." : "Fermer"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VUE DESKTOP (Table Clustered avec PnL En Direct) */}
            <div className="hidden md:block rounded-xl border border-white/15 bg-[#181226] overflow-x-auto w-full max-w-full shadow-2xl">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/15">
                  <TableRow className="border-b border-white/15 hover:bg-transparent">
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Actif</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Type</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Levier</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Taille</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Prix Entrée</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Prix Direct</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Stop Loss / TP</TableHead>
                    <TableHead className="py-3.5 px-4 text-right text-white font-extrabold text-xs uppercase font-headline">PnL En Direct ({isSolMode ? 'SOL' : 'USD'})</TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-white font-extrabold text-xs uppercase font-headline">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((p: any, idx: number) => {
                    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : getRealMarketBasePrice(p.pair);
                    const current = resolveLivePrice(p.pair, livePrices) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
                    const priceDiff = current - entry;
                    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
                    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
                    const liveProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
                    const profit = isNaN(liveProfit) ? 0 : liveProfit;
                    const livePnlPct = pctDiff * lev * (isLong ? 100 : -100);
                    const pnlPct = isNaN(livePnlPct) ? 0 : livePnlPct;
                    const isProfit = profit >= 0;
                    const { symbol: cleanAsset, badge, isSolana } = getDisplayPairLabel(p.pair);
                    const isPosReal = isRealOnChainPosition(p);
                    const isBeLocked = Boolean(
                      p.isBreakEvenLocked ||
                      (isLong && p.sl && p.sl > entry) ||
                      (!isLong && p.sl && p.sl < entry)
                    );
                    const canLockBe = isLong
                      ? current > entry * 1.003 && !isBeLocked
                      : current < entry * 0.997 && !isBeLocked;

                    const effSl = p.sl || (isLong ? entry * 0.97 : entry * 1.03);
                    const effTp = p.tp || (isLong ? entry * 1.06 : entry * 0.94);
                    const range = Math.abs(effTp - effSl);
                    const progressPct = range > 0
                      ? Math.max(0, Math.min(100, isLong ? ((current - effSl) / range) * 100 : ((effSl - current) / range) * 100))
                      : 50;

                    return (
                      <TableRow
                        key={p.id ? `pos_dt_${p.id}` : `pos_dt_${p.pair}_${p.timestamp || idx}`}
                        onClick={() => setSelectedPosition(p)}
                        className="border-b border-white/10 hover:bg-white/10 cursor-pointer transition-colors group"
                      >
                        <TableCell className="py-3.5 px-4 font-extrabold font-mono text-sm text-white flex items-center gap-2 flex-wrap group-hover:text-[#c2ff0c] transition-colors">
                          <span>{cleanAsset}</span>
                          <Badge className={cn("text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase", isSolana ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-white/60 border-white/10')}>
                            {badge}
                          </Badge>
                          {p.botId && (
                            <span className="bg-[#2e1d44] text-[#c2ff0c] border border-[#6b3ba7]/40 text-xs font-bold px-2 py-0.5 rounded uppercase font-headline">
                              BOT
                            </span>
                          )}
                          {p.dcaCount && p.dcaCount > 1 && (
                            <span className="bg-blue-950/60 text-blue-300 border border-blue-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                              DCA x{p.dcaCount}
                            </span>
                          )}
                          {(p.partialCloseCount || 0) >= 1 && (
                            <span className="bg-amber-950/70 text-amber-300 border border-amber-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                              ✂️ 50% Encaissé
                            </span>
                          )}
                          {isBeLocked && (
                            <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                              🛡️ {p.trailingTier && p.trailingTier >= 4 ? 'RUNNER T4' : p.trailingTier && p.trailingTier >= 2 ? `PALIER T${p.trailingTier}` : 'BE'}
                            </span>
                          )}
                          {p.isAiPatternBoosted && (
                            <span className="bg-gradient-to-r from-emerald-950/80 to-purple-950/80 text-[#c2ff0c] border border-[#c2ff0c]/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono flex items-center gap-1" title={p.aiBoostReason || "Position optimisée par Apprentissage IA"}>
                              ⚡ IA Boostée
                            </span>
                          )}
                          {p.txHash && (
                            <a
                              href={getExplorerTxUrl(getPositionChain(p), p.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-purple-400 hover:text-purple-300 hover:underline ml-1"
                              title={`Voir sur ${getPositionChain(p) === 'SOL' ? 'Solscan' : 'BscScan'}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>{p.txHash.slice(0, 4)}...{p.txHash.slice(-4)}</span>
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <Badge className={cn("text-xs font-extrabold px-2.5 py-0.5 border-none", isLong ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300')}>
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{lev}x</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{amt.toFixed(isPosReal ? 4 : 2)} {isPosReal ? 'SOL' : '$'}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{formatDisplayPrice(entry)}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-[#c2ff0c] font-extrabold">{formatDisplayPrice(current)}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-xs min-w-[140px]">
                          <div className="flex flex-col gap-1">
                            <span className={cn("font-bold whitespace-nowrap", isBeLocked ? "text-emerald-400" : "text-rose-400")}>
                              SL: {formatDisplayPrice(effSl)}
                              {isBeLocked && (
                                <span className="text-[9px] text-emerald-300/90 ml-1 font-semibold">🛡️ Garanti</span>
                              )}
                            </span>
                            <span className="text-emerald-400 font-bold whitespace-nowrap">
                              TP: {formatDisplayPrice(effTp)}
                            </span>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-0.5" title={`Progression vers TP: ${progressPct.toFixed(0)}%`}>
                              <div
                                className={cn("h-full rounded-full transition-all duration-300", isProfit ? "bg-emerald-400" : "bg-rose-400")}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                              <span className={cn("inline-flex rounded-full h-2 w-2", isProfit ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,130,0.8)]")}></span>
                            </span>
                            <span className={cn("font-mono font-extrabold text-sm", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                              {formatSmartPnl(profit, isPosReal)} {isPosReal ? 'SOL' : '$'}
                            </span>
                          </div>
                          <span className={cn("text-xs font-mono font-bold block opacity-90", isProfit ? "text-emerald-400" : "text-rose-400")}>
                            ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </span>
                          {(p.highestPnlPct || 0) > 0.5 && (
                            <span className="text-[9px] font-mono text-white/40 block">
                              Pic: +{(p.highestPnlPct || 0).toFixed(1)}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPosition(p);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 bg-white/5 hover:bg-white/15 text-slate-200 border-white/15 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                            >
                              <Eye className="h-3.5 w-3.5 text-purple-400" /> Détails
                            </Button>
                            {canLockBe && (
                              <Button
                                onClick={(e) => handleQuickBreakEven(p, e)}
                                size="sm"
                                title="Verrouiller le Stop-Loss à Break-Even (+0.3% à +0.5%)"
                                className="h-8 px-2 bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
                              >
                                🛡️ BE
                              </Button>
                            )}
                            {isProfit && !isPosReal && amt >= 4 && (p.partialCloseCount || 0) === 0 && (
                              <Button
                                onClick={(e) => handleQuickPartial50(p, current, profit, e)}
                                size="sm"
                                title="Encaisser 50% du profit immédiatement et laisser courir le reste sans risque"
                                className="h-8 px-2 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
                              >
                                ✂️ 50%
                              </Button>
                            )}
                            <Button
                              onClick={(e) => handleSingleClose(p, e)}
                              disabled={Boolean(p.id && closingIds[p.id]) || isClosingAll}
                              size="sm"
                              className="h-8 px-3 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                            >
                              {p.id && closingIds[p.id] ? "Fermeture..." : "Fermer"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
