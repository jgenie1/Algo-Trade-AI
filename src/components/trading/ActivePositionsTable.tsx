"use client";

import React from 'react';
import { Activity, Eye, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { cn, formatSmartPnl, getRealMarketBasePrice } from '@/lib/utils';
import { resolveLivePrice, getDisplayPairLabel } from '@/lib/symbolUtils';
import { getExplorerTxUrl } from '@/utils/explorerLinks';
import { useAppState } from '@/context/AppContext';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHead 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
  const { activePositions, tradingMode, isLoading } = useAppState();
  const [closingIds, setClosingIds] = React.useState<Record<string, boolean>>({});
  const [isClosingAll, setIsClosingAll] = React.useState(false);

  const safePositions = React.useMemo(() => {
    return Array.isArray(activePositions) ? activePositions : [];
  }, [activePositions]);

  const filteredPositions = React.useMemo(() => {
    return safePositions.filter((p: any) => {
      if (!p) return false;
      const mode = p.mode === 'REAL' ? 'REAL' : (p.mode === 'DEMO' ? 'DEMO' : (tradingMode === 'REAL' && p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO'));
      return mode === tradingMode;
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

                return (
                  <div
                    key={p.id ? `pos_mob_${p.id}` : `pos_mob_${p.pair}_${p.timestamp || idx}`}
                    onClick={() => setSelectedPosition(p)}
                    className="p-4 bg-[#1a1429] hover:bg-[#231b38] border border-white/15 hover:border-purple-500/40 rounded-2xl space-y-3 shadow-lg cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                            {formatSmartPnl(profit, isSolMode)} {isSolMode ? 'SOL' : '$'}
                          </span>
                        </div>
                        <span className={cn("text-xs font-mono font-bold block text-right", isProfit ? "text-emerald-400" : "text-rose-400")}>
                          ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Dynamic price precision formatting with SL and TP */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10">
                      <div>Entrée: <span className="text-white font-extrabold">{formatDisplayPrice(entry)}</span></div>
                      <div>Prix Direct: <span className="text-white font-extrabold">{formatDisplayPrice(current)}</span></div>
                      <div>SL: <span className="text-rose-400 font-extrabold">{p.sl ? formatDisplayPrice(p.sl) : (isLong ? formatDisplayPrice(entry * 0.97) : formatDisplayPrice(entry * 1.03))}</span></div>
                      <div>TP: <span className="text-emerald-400 font-extrabold">{p.tp ? formatDisplayPrice(p.tp) : (isLong ? formatDisplayPrice(entry * 1.06) : formatDisplayPrice(entry * 0.94))}</span></div>
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

                    return (
                      <TableRow
                        key={p.id ? `pos_dt_${p.id}` : `pos_dt_${p.pair}_${p.timestamp || idx}`}
                        onClick={() => setSelectedPosition(p)}
                        className="border-b border-white/10 hover:bg-white/10 cursor-pointer transition-colors group"
                      >
                        <TableCell className="py-3.5 px-4 font-extrabold font-mono text-sm text-white flex items-center gap-2 group-hover:text-[#c2ff0c] transition-colors">
                          <span>{cleanAsset}</span>
                          <Badge className={cn("text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase", isSolana ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-white/60 border-white/10')}>
                            {badge}
                          </Badge>
                          {p.botId && (
                            <span className="bg-[#2e1d44] text-[#c2ff0c] border border-[#6b3ba7]/40 text-xs font-bold px-2 py-0.5 rounded uppercase font-headline">
                              BOT
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
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{amt.toFixed(isSolMode ? 4 : 2)} {isSolMode ? 'SOL' : '$'}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{formatDisplayPrice(entry)}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-[#c2ff0c] font-extrabold">{formatDisplayPrice(current)}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-rose-400 font-bold whitespace-nowrap">
                              SL: {p.sl ? formatDisplayPrice(p.sl) : (isLong ? formatDisplayPrice(entry * 0.97) : formatDisplayPrice(entry * 1.03))}
                            </span>
                            <span className="text-emerald-400 font-bold whitespace-nowrap">
                              TP: {p.tp ? formatDisplayPrice(p.tp) : (isLong ? formatDisplayPrice(entry * 1.06) : formatDisplayPrice(entry * 0.94))}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                              <span className={cn("inline-flex rounded-full h-2 w-2", isProfit ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,130,0.8)]")}></span>
                            </span>
                            <span className={cn("font-mono font-extrabold text-sm", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                              {formatSmartPnl(profit, isSolMode)} {isSolMode ? 'SOL' : '$'}
                            </span>
                          </div>
                          <span className={cn("text-xs font-mono font-bold block opacity-90", isProfit ? "text-emerald-400" : "text-rose-400")}>
                            ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
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
