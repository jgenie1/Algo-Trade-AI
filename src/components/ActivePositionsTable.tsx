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

  const filteredPositions = activePositions.filter(p => 
    tradingMode === 'REAL' ? p.pair?.startsWith('SOL:') : !p.pair?.startsWith('SOL:')
  );

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
            {tradingMode === 'DEMO' ? "Aucune position démo ouverte actuellement. Utilisez le panneau de gauche pour initier un trade." : "Aucun snipe SOL actif actuellement."}
          </div>
        ) : (
          <div className="rounded-md border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/5">
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="py-2.5 text-white/40 font-headline">Actif</TableHead>
                  <TableHead className="py-2.5 text-white/40 font-headline">Type</TableHead>
                  <TableHead className="py-2.5 text-white/40 font-headline">Levier</TableHead>
                  <TableHead className="py-2.5 text-white/40 font-headline">Prix Entrée</TableHead>
                  <TableHead className="py-2.5 text-white/40 font-headline">Prix Actuel</TableHead>
                  <TableHead className="py-2.5 text-right text-white/40 font-headline">PnL ({tradingMode === 'DEMO' ? 'USD' : 'SOL'})</TableHead>
                  <TableHead className="py-2.5 text-center text-white/40 font-headline">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((p) => {
                  const current = livePrices[p.pair] || p.entryPrice;
                  const priceDiff = current - p.entryPrice;
                  const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
                  const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
                  const isProfit = profit >= 0;

                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => setSelectedPosition(p)}
                      className="border-b border-white/5 hover:bg-white/[0.03] active:bg-white/[0.05] cursor-pointer transition-all duration-150"
                    >
                      <TableCell className="py-3 font-semibold font-body text-white flex items-center gap-1.5 border-none">
                        {p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '')}
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
                        {p.entryPrice.toFixed(p.entryPrice > 100 ? 2 : 5)}
                      </TableCell>
                      <TableCell className="py-3 font-bold text-white font-body border-none">
                        {current.toFixed(p.entryPrice > 100 ? 2 : 5)}
                      </TableCell>
                      <TableCell className={cn(
                        "py-3 text-right font-bold font-body border-none",
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {isProfit ? '+' : ''}{profit.toFixed(2)} $
                        <span className="text-[9px] block font-normal opacity-70">
                          ({(pctDiff * p.leverage * (p.type === 'BUY' ? 100 : -100)).toFixed(2)}%)
                        </span>
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
        )}
      </CardContent>
    </Card>
  );
}
