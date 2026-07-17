"use client";

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  currency: string;
  timestamp: number;
  status: string;
  txHash?: string;
  address?: string;
}

interface TransactionHistoryTableProps {
  transactions: Transaction[];
  tradingMode: 'DEMO' | 'REAL';
  accentColor?: 'purple' | 'rose';
}

export default function TransactionHistoryTable({
  transactions,
  tradingMode,
  accentColor = 'purple'
}: TransactionHistoryTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl font-body">
        Aucun dépôt ou retrait n'a été enregistré pour le moment en mode {tradingMode === 'DEMO' ? 'Démo' : 'Réel'}.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="border-b border-white/5">
          <TableRow className="hover:bg-transparent border-b border-white/5">
            <TableHead className="pb-3 pl-2 text-[9px] uppercase font-headline text-white/40 tracking-wider">ID</TableHead>
            <TableHead className="pb-3 text-[9px] uppercase font-headline text-white/40 tracking-wider">Type</TableHead>
            <TableHead className="pb-3 text-[9px] uppercase font-headline text-white/40 tracking-wider">Montant</TableHead>
            <TableHead className="pb-3 text-[9px] uppercase font-headline text-white/40 tracking-wider">Devise</TableHead>
            <TableHead className="pb-3 text-[9px] uppercase font-headline text-white/40 tracking-wider">Date</TableHead>
            <TableHead className="pb-3 text-[9px] uppercase font-headline text-white/40 tracking-wider">Statut</TableHead>
            {tradingMode === 'REAL' && (
              <TableHead className="pb-3 pr-2 text-right text-[9px] uppercase font-headline text-white/40 tracking-wider">Blockchain</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-white/5">
          {transactions.map(tx => (
            <TableRow key={tx.id} className="hover:bg-white/5 transition-colors border-b border-white/5">
              <TableCell className="py-3 pl-2 font-mono text-white/40 text-xs border-none">{tx.id}</TableCell>
              <TableCell className="py-3 border-none">
                {tx.type === 'DEPOSIT' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    Dépôt
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-xs">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Retrait
                  </span>
                )}
              </TableCell>
              <TableCell className="py-3 font-semibold text-white text-xs border-none">
                {tx.type === 'DEPOSIT' ? '+' : '-'} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="py-3 text-white/60 font-medium text-xs border-none">{tx.currency}</TableCell>
              <TableCell className="py-3 text-white/40 text-xs border-none">
                {new Date(tx.timestamp).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </TableCell>
              <TableCell className="py-3 border-none">
                <Badge className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full border-none">
                  {tx.status}
                </Badge>
              </TableCell>
              {tradingMode === 'REAL' && (
                <TableCell className="py-3 pr-2 text-right border-none">
                  {tx.txHash ? (
                    <a
                      href={`https://solscan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline font-medium text-xs"
                    >
                      Détails
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-white/20 text-xs">-</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
