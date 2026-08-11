"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";

interface PastTrade {
  date: string;
  pair: string;
  trend: string;
  signal: 'ACHAT' | 'VENTE' | 'NEUTRE';
  justification: string;
  value: string;
  status: 'Gagné' | 'Perdu' | 'En cours';
}

interface AIAnalysisHistoryTableProps {
  tradeHistory: PastTrade[];
  closedPositions: any[];
}

export default function AIAnalysisHistoryTable({
  tradeHistory,
  closedPositions
}: AIAnalysisHistoryTableProps) {
  const combinedHistory = [
    ...tradeHistory,
    ...closedPositions.map(p => ({
      date: new Date(p.timestamp).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }),
      pair: p.pair.replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', ''),
      trend: (p.type === 'BUY' || p.type === 'LONG') ? 'HAUSSIÈRE' : 'BAISSIÈRE',
      signal: (p.type === 'BUY' || p.type === 'LONG') ? 'ACHAT' as const : 'VENTE' as const,
      justification: p.wasBot ? 'Exécuté par bot de trading.' : 'Ordre placé manuellement.',
      value: `${p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)} ${p.pair.startsWith('SOL:') ? 'SOL' : '$'}`,
      status: (p.profit >= 0 ? 'Gagné' : 'Perdu') as 'Gagné' | 'Perdu'
    }))
  ];

  return (
    <Card className="glass-panel border-white/5 shadow-xl overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline text-lg text-white flex items-center gap-2">
            <History className="h-5 w-5 text-[#c2ff0c]" />
            <span>Historique des Signaux & Trades</span>
          </CardTitle>
          <CardDescription className="text-white/40 text-xs font-body">
            Journal des signaux générés et résultats en direct
          </CardDescription>
        </div>

        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 text-xs">
          {["Tous", "1D", "1W", "1M"].map((f) => (
            <button
              key={f}
              className={cn(
                "px-3 py-1 font-semibold rounded-md font-headline",
                f === "Tous" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 font-bold text-xs uppercase bg-white/[0.01] font-headline">
                <th className="py-4 px-6">Date & Heure</th>
                <th className="py-4 px-6">Paire</th>
                <th className="py-4 px-6">Tendance</th>
                <th className="py-4 px-6">Signal</th>
                <th className="py-4 px-6">Justification</th>
                <th className="py-4 px-6">Profit / Valeur</th>
                <th className="py-4 px-6 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {combinedHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-white/30 font-body">
                    Aucun signal ou trade récent enregistré. Lancez l&apos;analyse IA ou ouvrez une position.
                  </td>
                </tr>
              ) : (
                combinedHistory.map((trade, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="py-4 px-6 font-mono text-xs text-white/70">{trade.date}</td>
                    <td className="py-4 px-6 font-bold text-white font-body">{trade.pair}</td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/5 border border-white/10 text-white/80 font-headline">
                        {trade.trend}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded text-[10px] font-black font-headline",
                        trade.signal === 'ACHAT' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                        trade.signal === 'VENTE' ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-white/10 text-white/50 border border-white/10"
                      )}>
                        {trade.signal}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate text-xs text-white/60 font-body" title={trade.justification}>
                      {trade.justification}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-white/80">{trade.value}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={cn(
                        "inline-flex items-center text-xs font-bold font-headline",
                        trade.status === 'Gagné' ? "text-green-400" :
                        trade.status === 'Perdu' ? "text-red-400" : "text-amber-400 animate-pulse"
                      )}>
                        {trade.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
