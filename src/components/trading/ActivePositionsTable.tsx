"use client";

import React from 'react';
import { Activity, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatSmartPnl, getRealMarketBasePrice } from '@/lib/utils';
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
}

export default function ActivePositionsTable({
  livePrices,
  setSelectedPosition,
  handleClosePosition
}: ActivePositionsTableProps) {
  const { activePositions, tradingMode, isLoading } = useAppState();
  const safePositions = Array.isArray(activePositions) ? activePositions : [];
  const filteredPositions = safePositions.filter((p: any) => p && (p.mode || 'DEMO') === tradingMode);
  const isSolMode = tradingMode === 'REAL';

  // Calcul du PnL Total En Direct cumulé
  const totalLiveProfit = filteredPositions.reduce((acc: number, p: any) => {
    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : getRealMarketBasePrice(p.pair);
    const current = (livePrices && livePrices[p.pair]) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
    const priceDiff = current - entry;
    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
    const liveProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
    return acc + (isNaN(liveProfit) ? 0 : liveProfit);
  }, 0);

  const isTotalProfit = totalLiveProfit >= 0;

  return (
    <Card className="bg-[#150f21] border-white/15 rounded-2xl shadow-2xl">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
            <span>{tradingMode === 'DEMO' ? "Positions Ouvertes Démo" : "Positions Ouvertes Réelles (SOL)"} ({filteredPositions.length})</span>
          </div>

          {/* Badge PnL Total En Direct */}
          {filteredPositions.length > 0 && (
            <div className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-mono font-extrabold flex items-center gap-2 shadow-inner transition-all",
              isTotalProfit 
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : "bg-rose-500/15 text-rose-300 border-rose-500/40"
            )}>
              <span className="relative flex h-2 w-2">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isTotalProfit ? "bg-emerald-400" : "bg-rose-400")}></span>
                <span className={cn("relative inline-flex rounded-full h-2 w-2", isTotalProfit ? "bg-emerald-500" : "bg-rose-500")}></span>
              </span>
              <span>PnL Direct Total : {formatSmartPnl(totalLiveProfit, isSolMode)} {isSolMode ? 'SOL' : '$'}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
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
                const current = (livePrices && livePrices[p.pair]) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
                const priceDiff = current - entry;
                const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
                const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
                const liveProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
                const profit = isNaN(liveProfit) ? 0 : liveProfit;
                const livePnlPct = pctDiff * lev * (isLong ? 100 : -100);
                const pnlPct = isNaN(livePnlPct) ? 0 : livePnlPct;
                const isProfit = profit >= 0;
                const cleanAsset = (p.pair || "").replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');

                return (
                  <div
                    key={p.id ? `${p.id}_${idx}` : `pos_mob_${idx}`}
                    onClick={() => setSelectedPosition(p)}
                    className="p-4 bg-[#1a1429] hover:bg-[#231b38] border border-white/15 hover:border-purple-500/40 rounded-2xl space-y-3 shadow-lg cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-base text-white group-hover:text-[#c2ff0c] transition-colors">{cleanAsset}</span>
                        <Badge className={cn("text-xs font-extrabold px-2.5 py-0.5 rounded-full border-none", isLong ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300')}>
                          {p.type} {lev}x
                        </Badge>
                        {p.botId && (
                          <span className="bg-[#2e1d44] text-[#c2ff0c] border border-[#6b3ba7]/40 text-xs font-extrabold px-2 py-0.5 rounded uppercase font-headline">
                            BOT
                          </span>
                        )}
                      </div>

                      {/* Affichage du PnL En Direct avec Pulsation */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isProfit ? "bg-emerald-400" : "bg-rose-400")}></span>
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", isProfit ? "bg-emerald-500" : "bg-rose-500")}></span>
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

                    {/* Dynamic price precision formatting */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10">
                      <div>Entrée: <span className="text-white font-extrabold">{entry.toFixed(entry > 50 ? 2 : 4)}</span></div>
                      <div>Prix Direct: <span className="text-white font-extrabold">{current.toFixed(current > 50 ? 2 : 4)}</span></div>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClosePosition(p);
                        }}
                        className="flex-1 h-9 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-headline font-bold rounded-xl"
                      >
                        Fermer
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
                    <TableHead className="py-3.5 px-4 text-right text-white font-extrabold text-xs uppercase font-headline">PnL En Direct ({isSolMode ? 'SOL' : 'USD'})</TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-white font-extrabold text-xs uppercase font-headline">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((p: any, idx: number) => {
                    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : getRealMarketBasePrice(p.pair);
                    const current = (livePrices && livePrices[p.pair]) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
                    const priceDiff = current - entry;
                    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
                    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
                    const liveProfit = pctDiff * amt * lev * (isLong ? 1 : -1);
                    const profit = isNaN(liveProfit) ? 0 : liveProfit;
                    const livePnlPct = pctDiff * lev * (isLong ? 100 : -100);
                    const pnlPct = isNaN(livePnlPct) ? 0 : livePnlPct;
                    const isProfit = profit >= 0;
                    const cleanAsset = (p.pair || "").replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');

                    return (
                      <TableRow
                        key={p.id ? `${p.id}_${idx}` : `pos_dt_${idx}`}
                        onClick={() => setSelectedPosition(p)}
                        className="border-b border-white/10 hover:bg-white/10 cursor-pointer transition-colors group"
                      >
                        <TableCell className="py-3.5 px-4 font-extrabold font-mono text-sm text-white flex items-center gap-2 group-hover:text-[#c2ff0c] transition-colors">
                          <span>{cleanAsset}</span>
                          {p.botId && (
                            <span className="bg-[#2e1d44] text-[#c2ff0c] border border-[#6b3ba7]/40 text-xs font-bold px-2 py-0.5 rounded uppercase font-headline">
                              BOT
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <Badge className={cn("text-xs font-extrabold px-2.5 py-0.5 border-none", isLong ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300')}>
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{lev}x</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{amt.toFixed(2)} {isSolMode ? 'SOL' : '$'}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{entry.toFixed(entry > 50 ? 2 : 4)}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-[#c2ff0c] font-extrabold">{current.toFixed(current > 50 ? 2 : 4)}</TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isProfit ? "bg-emerald-400" : "bg-rose-400")}></span>
                              <span className={cn("relative inline-flex rounded-full h-2 w-2", isProfit ? "bg-emerald-500" : "bg-rose-500")}></span>
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
                              onClick={() => setSelectedPosition(p)}
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 bg-white/5 hover:bg-white/15 text-slate-200 border-white/15 text-xs font-bold rounded-lg flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5 text-purple-400" /> Détails
                            </Button>
                            <Button
                              onClick={() => handleClosePosition(p)}
                              size="sm"
                              className="h-8 px-3 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-lg"
                            >
                              Fermer
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
