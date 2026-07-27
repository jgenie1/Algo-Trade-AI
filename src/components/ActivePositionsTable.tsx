"use client";

import React from 'react';
import { Activity } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
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
            {tradingMode === 'DEMO' ? "Aucune position démo ouverte actuellement. Utilisez le panneau de gauche pour initier un trade." : "Aucun snipe SOL actif actuellement."}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#120d18] overflow-x-auto w-full max-w-full shadow-2xl">
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
                  const current = livePrices[p.pair] || p.entryPrice;
                  const priceDiff = current - p.entryPrice;
                  const pctDiff = p.entryPrice > 0 ? (priceDiff / p.entryPrice) : 0;
                  const profit = pctDiff * p.amount * p.leverage * (p.type === 'BUY' ? 1 : -1);
                  const pnlPct = pctDiff * p.leverage * (p.type === 'BUY' ? 100 : -100);
                  const isProfit = profit >= 0;

                  const cleanAsset = p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');

                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => setSelectedPosition(p)}
                      className="border-b border-white/5 hover:bg-white/[0.04] active:bg-white/[0.07] cursor-pointer transition-all duration-150"
                    >
                      <TableCell className="py-3.5 px-4 border-none font-bold text-white text-xs flex items-center gap-2">
                        <span>{cleanAsset}</span>
                        {p.botId && (
                          <span className="bg-[#2e1d44] text-[#b388ff] border border-[#6b3ba7]/30 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-headline">
                            BOT
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 border-none">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border font-headline inline-block",
                          p.type === 'BUY' 
                            ? "bg-[#0d3424] text-[#34d399] border-[#064e3b]/50" 
                            : "bg-[#3d1325] text-[#f43f5e] border-[#881337]/50"
                        )}>
                          {p.type === 'BUY' ? 'LONG' : 'SHORT'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 border-none text-white/80 font-medium text-xs font-body">
                        {p.leverage}x
                      </TableCell>
                      <TableCell className="py-3.5 px-4 border-none font-bold text-white text-xs font-body">
                        {typeof p.amount === 'number' ? p.amount.toFixed(2) : p.amount} {tradingMode === 'REAL' ? 'SOL' : '$'}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 border-none text-white/90 text-xs font-mono">
                        {p.entryPrice.toFixed(p.entryPrice > 100 ? 2 : 5)}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 border-none font-bold text-white text-xs font-mono">
                        {current.toFixed(p.entryPrice > 100 ? 2 : 5)}
                      </TableCell>
                      <TableCell className={cn(
                        "py-3.5 px-4 border-none text-right font-headline",
                        isProfit ? "text-[#34d399]" : "text-[#f43f5e]"
                      )}>
                        <div className="font-bold text-xs">
                          {isProfit ? '+' : ''}{profit.toFixed(tradingMode === 'REAL' ? 3 : 2)} {tradingMode === 'REAL' ? 'SOL' : '$'}
                        </div>
                        <span className="text-[10px] block opacity-85 font-mono font-medium mt-0.5">
                          ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 border-none text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleClosePosition(p)}
                          className="px-3.5 py-1 text-xs font-medium text-white bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 border border-white/15 rounded-full transition-all duration-200 shadow-sm"
                        >
                          Fermer
                        </button>
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
