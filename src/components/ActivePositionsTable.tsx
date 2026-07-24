"use client";

import React from 'react';
import { Activity, XCircle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
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

  const filteredPositions = activePositions.filter(p => 
    tradingMode === 'REAL' ? p.pair?.startsWith('SOL:') : !p.pair?.startsWith('SOL:')
  );

  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl shadow-xl w-full">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          {tradingMode === 'DEMO' ? "Positions Ouvertes Démo" : "Positions Ouvertes Réelles (SOL)"} ({filteredPositions.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 sm:px-6 pb-4">
        {isLoading ? (
          <div className="border border-white/5 rounded-xl p-6 flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
            <span className="text-xs text-white/30 font-body">Chargement des positions...</span>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-6 sm:p-8 text-center text-white/30 font-body text-xs">
            {tradingMode === 'DEMO' ? "Aucune position démo ouverte actuellement. Utilisez le panneau de contrôle pour initier un trade." : "Aucun snipe SOL actif actuellement."}
          </div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (Under 640px) */}
            <div className="block sm:hidden space-y-2.5">
              {filteredPositions.map((p) => {
                const current = (p.pair ? livePrices[p.pair] : null) || p.entryPrice;
                const priceDiff = current - p.entryPrice;
                const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
                const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
                const isProfit = profit >= 0;

                const solPrice = livePrices['SOL'] || 140;
                const sizeUsd = p.pair?.startsWith('SOL:') ? p.amount * solPrice : p.amount;
                const sizeHtg = sizeUsd * 130;
                
                const pnlUsd = p.pair?.startsWith('SOL:') ? profit * solPrice : profit;

                return (
                  <div 
                    key={p.id}
                    onClick={() => setSelectedPosition(p)}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2 hover:border-[#c2ff0c]/40 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {/* Card Top: Pair, Type & Close Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm font-headline">
                          {(p.pair || '').replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')}
                        </span>
                        <Badge 
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-extrabold border-none",
                            p.type === 'BUY' ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                          )}
                        >
                          {p.type === 'BUY' ? 'LONG' : 'SHORT'} {p.leverage}x
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClosePosition(p);
                        }}
                        className="h-7 px-2.5 text-[10px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg font-bold"
                      >
                        Fermer
                      </Button>
                    </div>

                    {/* Card Middle: Entry, Current & Size */}
                    <div className="grid grid-cols-3 gap-1 py-1 text-[11px] font-mono border-y border-white/5 text-white/60">
                      <div>
                        <span className="text-[9px] text-white/40 block font-body uppercase">Taille</span>
                        <span className="text-white font-semibold">{p.pair?.startsWith('SOL:') ? `${p.amount.toFixed(2)} SOL` : `${p.amount.toFixed(0)} $`}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-white/40 block font-body uppercase">Entrée</span>
                        <span>{p.entryPrice.toFixed(p.entryPrice > 100 ? 2 : 4)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-white/40 block font-body uppercase">Actuel</span>
                        <span className="text-white font-semibold">{current.toFixed(p.entryPrice > 100 ? 2 : 4)}</span>
                      </div>
                    </div>

                    {/* Card Bottom: PnL Display */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[10px] text-white/50 font-body">Profit / Perte:</span>
                      <div className={cn("font-extrabold font-mono flex items-center gap-1", isProfit ? "text-emerald-400" : "text-rose-400")}>
                        {isProfit ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {p.pair?.startsWith('SOL:') ? (
                          <span>{isProfit ? '+' : ''}{profit.toFixed(4)} SOL (≈ ${pnlUsd.toFixed(2)})</span>
                        ) : (
                          <span>{isProfit ? '+' : ''}${profit.toFixed(2)} USD</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (640px and up) */}
            <div className="hidden sm:block rounded-md border border-white/5 overflow-x-auto w-full">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/5">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="py-2.5 text-white/40 font-headline">Actif</TableHead>
                    <TableHead className="py-2.5 text-white/40 font-headline">Type</TableHead>
                    <TableHead className="py-2.5 text-white/40 font-headline">Levier</TableHead>
                    <TableHead className="py-2.5 text-white/40 font-headline">Taille</TableHead>
                    <TableHead className="py-2.5 text-white/40 font-headline">Prix Entrée</TableHead>
                    <TableHead className="py-2.5 text-white/40 font-headline">Prix Actuel</TableHead>
                    <TableHead className="py-2.5 text-right text-white/40 font-headline">PnL ({tradingMode === 'DEMO' ? 'USD' : 'SOL'})</TableHead>
                    <TableHead className="py-2.5 text-center text-white/40 font-headline">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((p) => {
                    const current = (p.pair ? livePrices[p.pair] : null) || p.entryPrice;
                    const priceDiff = current - p.entryPrice;
                    const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
                    const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
                    const isProfit = profit >= 0;

                    const solPrice = livePrices['SOL'] || 140;
                    const sizeUsd = p.pair?.startsWith('SOL:') ? p.amount * solPrice : p.amount;
                    const sizeHtg = sizeUsd * 130;
                    
                    const pnlUsd = p.pair?.startsWith('SOL:') ? profit * solPrice : profit;
                    const pnlHtg = pnlUsd * 130;

                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => setSelectedPosition(p)}
                        className="border-b border-white/5 hover:bg-white/[0.03] active:bg-white/[0.05] cursor-pointer transition-all duration-150"
                      >
                        <TableCell className="py-3 font-semibold font-body text-white flex items-center gap-1.5 border-none">
                          {(p.pair || '').replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')}
                          {p.botId && (
                            <Badge variant="secondary" className="text-[8px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-headline uppercase font-bold border-none">
                              Bot
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 border-none">
                          <Badge 
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold border-none",
                              p.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            )}
                          >
                            {p.type === 'BUY' ? 'LONG' : 'SHORT'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-white/60 font-body border-none">{p.leverage}x</TableCell>
                        <TableCell className="py-3 text-white/80 font-body border-none">
                          {p.pair?.startsWith('SOL:') ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-white">{p.amount.toFixed(2)} SOL</span>
                              <span className="text-[9px] text-white/40 leading-none">
                                ≈ ${sizeUsd.toFixed(1)} / {sizeHtg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} G
                              </span>
                            </div>
                          ) : (
                            `${p.amount.toFixed(0)} $`
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-white/80 font-body border-none">
                          {p.entryPrice.toFixed(p.entryPrice > 100 ? 2 : 5)}
                        </TableCell>
                        <TableCell className="py-3 font-bold text-white font-body border-none">
                          {current.toFixed(p.entryPrice > 100 ? 2 : 5)}
                        </TableCell>
                        <TableCell className={cn(
                          "py-3 text-right font-bold font-body border-none",
                          isProfit ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {p.pair?.startsWith('SOL:') ? (
                            <div className="flex flex-col gap-0.5 text-right items-end">
                              <span className="font-bold">{isProfit ? '+' : ''}{profit.toFixed(4)} SOL</span>
                              <span className="text-[9px] text-white/40 font-normal leading-none">
                                ≈ {isProfit ? '+' : ''}${pnlUsd.toFixed(2)}
                              </span>
                              <span className="text-[8px] text-white/30 font-normal leading-none">
                                {isProfit ? '+' : ''}{pnlHtg.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} G
                              </span>
                            </div>
                          ) : (
                            <>
                              {isProfit ? '+' : ''}{profit.toFixed(2)} $
                              <span className="text-[9px] block font-normal opacity-70">
                                ({(pctDiff * p.leverage * (p.type === 'BUY' ? 100 : -100)).toFixed(2)}%)
                              </span>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center border-none" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleClosePosition(p)}
                            className="h-7 px-2.5 text-[10px] bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 rounded-md font-semibold transition-all duration-200"
                          >
                            Fermer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
