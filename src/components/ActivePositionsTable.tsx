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
    <Card className="bg-[#14101a] border-white/10 rounded-2xl shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          {tradingMode === 'DEMO' ? "Positions Ouvertes Démo" : "Positions Ouvertes Réelles (SOL)"} ({filteredPositions.length})
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="border border-white/5 rounded-xl p-6 flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
            <span className="text-xs text-white/30 font-body">Chargement des positions depuis Firebase...</span>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-white/30 font-body text-xs">
            {tradingMode === 'DEMO' ? "Aucune position démo ouverte actuellement." : "Aucun snipe SOL actif actuellement."}
          </div>
        ) : (
          <div className="space-y-3">
            {/* VUE MOBILE (Cartes Tactiles Compactes) */}
            <div className="block md:hidden space-y-3">
              {filteredPositions.map((p) => {
                const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 145.50;
                const current = (livePrices && livePrices[p.pair]) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
                const priceDiff = current - entry;
                const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
                const rawProfit = typeof p.pnl === 'number' && !isNaN(p.pnl) ? p.pnl : (pctDiff * amt * lev * (p.type === 'BUY' ? 1 : -1));
                const profit = isNaN(rawProfit) ? 0 : rawProfit;
                const rawPnlPct = typeof p.pnlPercent === 'number' && !isNaN(p.pnlPercent) ? p.pnlPercent : (pctDiff * lev * (p.type === 'BUY' ? 100 : -100));
                const pnlPct = isNaN(rawPnlPct) ? 0 : rawPnlPct;
                const isProfit = profit >= 0;
                const cleanAsset = (p.pair || "").replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');

                return (
                  <div key={p.id} className="p-4 bg-[#120d18] border border-white/10 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-white">{cleanAsset}</span>
                        <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border-none", p.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400')}>
                          {p.type} {lev}x
                        </Badge>
                        {p.botId && (
                          <span className="bg-[#2e1d44] text-[#b388ff] border border-[#6b3ba7]/30 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-headline">
                            BOT
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={cn("text-sm font-extrabold font-mono block", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                          {isProfit ? '+' : ''}{profit.toFixed(tradingMode === 'DEMO' ? 2 : 4)} {tradingMode === 'DEMO' ? '$' : 'SOL'}
                        </span>
                        <span className={cn("text-[10px] font-mono block", isProfit ? "text-emerald-400" : "text-rose-400")}>
                          ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white/60 bg-white/5 p-2.5 rounded-xl">
                      <div>Entrée: <span className="text-white font-bold">{entry.toFixed(4)}</span></div>
                      <div>Prix: <span className="text-white font-bold">{current.toFixed(4)}</span></div>
                    </div>

                    <Button
                      onClick={() => handleClosePosition(p)}
                      className="w-full h-9 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-headline font-bold rounded-xl"
                    >
                      Fermer la Position
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* VUE DESKTOP (Table Clustered) */}
            <div className="hidden md:block rounded-xl border border-white/10 bg-[#120d18] overflow-x-auto w-full max-w-full shadow-2xl">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/10">
                  <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="py-3 px-4 text-white/50 font-medium text-xs font-headline">Actif</TableHead>
                    <TableHead className="py-3 px-4 text-white/50 font-medium text-xs font-headline">Type</TableHead>
                    <TableHead className="py-3 px-4 text-white/50 font-medium text-xs font-headline">Levier</TableHead>
                    <TableHead className="py-3 px-4 text-white/50 font-medium text-xs font-headline">Taille</TableHead>
                    <TableHead className="py-3 px-4 text-white/50 font-medium text-xs font-headline">Prix Entrée</TableHead>
                    <TableHead className="py-3 px-4 text-white/50 font-medium text-xs font-headline">Prix Actuel</TableHead>
                    <TableHead className="py-3 px-4 text-right text-white/50 font-medium text-xs font-headline">PnL ({tradingMode === 'DEMO' ? 'USD' : 'SOL'})</TableHead>
                    <TableHead className="py-3 px-4 text-center text-white/50 font-medium text-xs font-headline">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((p) => {
                    const lev = typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 1;
                    const amt = typeof p.amount === 'number' && !isNaN(p.amount) ? p.amount : 0;
                    const entry = typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) && p.entryPrice > 0 ? p.entryPrice : 145.50;
                    const current = (livePrices && livePrices[p.pair]) || (typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : entry);
                    const priceDiff = current - entry;
                    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
                    const rawProfit = typeof p.pnl === 'number' && !isNaN(p.pnl) ? p.pnl : (pctDiff * amt * lev * (p.type === 'BUY' ? 1 : -1));
                    const profit = isNaN(rawProfit) ? 0 : rawProfit;
                    const rawPnlPct = typeof p.pnlPercent === 'number' && !isNaN(p.pnlPercent) ? p.pnlPercent : (pctDiff * lev * (p.type === 'BUY' ? 100 : -100));
                    const pnlPct = isNaN(rawPnlPct) ? 0 : rawPnlPct;
                    const isProfit = profit >= 0;
                    const cleanAsset = (p.pair || "").replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');

                    return (
                      <TableRow key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-3 px-4 font-bold font-mono text-white flex items-center gap-2">
                          <span>{cleanAsset}</span>
                          {p.botId && (
                            <span className="bg-[#2e1d44] text-[#b388ff] border border-[#6b3ba7]/30 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-headline">
                              BOT
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border-none", p.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400')}>
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-mono text-xs text-white/70">{lev}x</TableCell>
                        <TableCell className="py-3 px-4 font-mono text-xs text-white/70">{amt} {tradingMode === 'DEMO' ? '$' : 'SOL'}</TableCell>
                        <TableCell className="py-3 px-4 font-mono text-xs text-white/70">{entry.toFixed(4)}</TableCell>
                        <TableCell className="py-3 px-4 font-mono text-xs text-white/70">{current.toFixed(4)}</TableCell>
                        <TableCell className={cn("py-3 px-4 text-right font-mono font-bold text-xs", isProfit ? "text-[#c2ff0c]" : "text-rose-400")}>
                          {isProfit ? '+' : ''}{profit.toFixed(tradingMode === 'DEMO' ? 2 : 4)} ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Button
                            onClick={() => handleClosePosition(p)}
                            className="h-8 px-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-lg"
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
