"use client";

import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const { tradingMode, activePositions, isLoading } = useAppState();

  const filteredPositions = activePositions.filter(p => (p.mode || 'DEMO') === tradingMode);

  return (
    <Card className="bg-[#150f21] border-white/15 rounded-2xl shadow-2xl">
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <span>{tradingMode === 'DEMO' ? "Positions Ouvertes Démo" : "Positions Ouvertes Réelles (SOL)"} ({filteredPositions.length})</span>
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
            {/* VUE MOBILE (Cartes Tactiles Compactes) */}
            <div className="block md:hidden space-y-3">
              {filteredPositions.map((p, idx) => {
                const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 145.50;
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
                  <div key={p.id ? `${p.id}_${idx}` : `pos_mob_${idx}`} className="p-4 bg-[#1a1429] border border-white/15 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-base text-white">{cleanAsset}</span>
                        <Badge className={cn("text-xs font-extrabold px-2.5 py-0.5 rounded-full border-none", isLong ? 'bg-emerald-500/25 text-emerald-300' : 'bg-rose-500/25 text-rose-300')}>
                          {p.type} {lev}x
                        </Badge>
                        {p.botId && (
                          <span className="bg-[#2e1d44] text-[#c2ff0c] border border-[#6b3ba7]/40 text-xs font-extrabold px-2 py-0.5 rounded uppercase font-headline">
                            BOT
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={cn("text-base font-extrabold font-mono block", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                          {isProfit ? '+' : ''}{profit.toFixed(2)} {tradingMode === 'DEMO' ? '$' : 'SOL'}
                        </span>
                        <span className={cn("text-xs font-mono font-bold block", isProfit ? "text-emerald-400" : "text-rose-400")}>
                          ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Dynamic price precision formatting */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10">
                      <div>Entrée: <span className="text-white font-extrabold">{entry.toFixed(entry > 50 ? 2 : 4)}</span></div>
                      <div>Prix: <span className="text-white font-extrabold">{current.toFixed(current > 50 ? 2 : 4)}</span></div>
                    </div>

                    <Button
                      onClick={() => handleClosePosition(p)}
                      className="w-full h-10 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-headline font-bold rounded-xl"
                    >
                      Fermer la Position
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* VUE DESKTOP (Table Clustered) */}
            <div className="hidden md:block rounded-xl border border-white/15 bg-[#181226] overflow-x-auto w-full max-w-full shadow-2xl">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/15">
                  <TableRow className="border-b border-white/15 hover:bg-transparent">
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Actif</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Type</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Levier</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Taille</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Prix Entrée</TableHead>
                    <TableHead className="py-3.5 px-4 text-white font-extrabold text-xs uppercase font-headline">Prix Actuel</TableHead>
                    <TableHead className="py-3.5 px-4 text-right text-white font-extrabold text-xs uppercase font-headline">PnL ({tradingMode === 'DEMO' ? 'USD' : 'SOL'})</TableHead>
                    <TableHead className="py-3.5 px-4 text-center text-white font-extrabold text-xs uppercase font-headline">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((p, idx) => {
                    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 145.50;
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
                      <TableRow key={p.id ? `${p.id}_${idx}` : `pos_dt_${idx}`} className="border-b border-white/10 hover:bg-white/10 transition-colors">
                        <TableCell className="py-3.5 px-4 font-extrabold font-mono text-sm text-white flex items-center gap-2">
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
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{amt.toFixed(2)} {tradingMode === 'DEMO' ? '$' : 'SOL'}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{entry.toFixed(entry > 50 ? 2 : 4)}</TableCell>
                        <TableCell className="py-3.5 px-4 font-mono text-sm text-slate-200 font-bold">{current.toFixed(current > 50 ? 2 : 4)}</TableCell>
                        <TableCell className={cn("py-3.5 px-4 text-right font-mono font-extrabold text-sm", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                          {isProfit ? '+' : ''}{profit.toFixed(2)} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          <Button
                            onClick={() => handleClosePosition(p)}
                            className="h-8 px-3 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-lg"
                          >
                            Fermer la Position
                          </Button>
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
