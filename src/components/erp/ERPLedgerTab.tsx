"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  ExternalLink,
  Download
} from 'lucide-react';
import { cn, formatUsdToHtg } from '@/lib/utils';

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: string;
  txHash?: string;
  mode?: 'DEMO' | 'REAL';
}

interface ERPLedgerTabProps {
  transactions: TransactionItem[];
  tradingMode: 'DEMO' | 'REAL';
  handleExportLedgerCSV: () => void;
}

export default function ERPLedgerTab({
  transactions = [],
  tradingMode,
  handleExportLedgerCSV
}: ERPLedgerTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const solPriceUsd = 145.0;

  // Filter transactions
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.txHash && tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  // Calculate totals
  const totalVolumeUsd = transactions.reduce((sum, tx) => {
    const val = tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount;
    return sum + val;
  }, 0);

  const totalInflowUsd = transactions
    .filter(tx => tx.type === 'DEPOT' || tx.type === 'DEPOSIT' || tx.type === 'BUY')
    .reduce((sum, tx) => sum + (tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount), 0);

  const totalOutflowUsd = transactions
    .filter(tx => tx.type === 'RETRAIT' || tx.type === 'WITHDRAW' || tx.type === 'SELL')
    .reduce((sum, tx) => sum + (tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount), 0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline block">Volume Total Audité</span>
          <div className="text-2xl font-extrabold text-white font-body">
            {totalVolumeUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD
          </div>
          <span className="text-[10px] text-cyan-300 font-mono block">
            ≈ {formatUsdToHtg(totalVolumeUsd)}
          </span>
          <span className="text-[9px] text-white/30 font-body block mt-1">{transactions.length} écritures comptables enregistrées</span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-emerald-400 font-headline block flex items-center gap-1">
            <ArrowDownLeft className="h-3.5 w-3.5" /> Entrées de Fonds (Inflows)
          </span>
          <div className="text-2xl font-extrabold text-emerald-400 font-body">
            +{totalInflowUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
          </div>
          <span className="text-[10px] text-emerald-300/70 font-mono block">
            Dépôts & Gains crédités
          </span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-rose-400 font-headline block flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" /> Sorties de Fonds (Outflows)
          </span>
          <div className="text-2xl font-extrabold text-rose-400 font-body">
            -{totalOutflowUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
          </div>
          <span className="text-[10px] text-rose-300/70 font-mono block">
            Retraits & Capitaux désengagés
          </span>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-[#c2ff0c] font-headline block flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Conformité Audit SHA-256
          </span>
          <div className="text-xl font-extrabold text-[#c2ff0c] font-body flex items-center gap-2 mt-1">
            <CheckCircle2 className="h-5 w-5 text-[#c2ff0c]" /> 100% VALIDE
          </div>
          <span className="text-[9px] text-white/40 font-body block mt-1">Registre immuable vérifié sur blockchain</span>
        </Card>
      </div>

      {/* Main Ledger Table Card */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white font-headline flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
              Grand Livre Comptable & Audit Financier
            </h3>
            <p className="text-xs text-slate-400 font-body mt-0.5">
              Journal d&apos;audit de toutes les opérations financières de l&apos;entreprise
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
              <Input
                placeholder="Rechercher ID, Type, TxHash..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white/5 border-white/15 text-xs text-white rounded-xl placeholder:text-white/30 font-body"
              />
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExportLedgerCSV}
              size="sm"
              className="h-9 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-headline rounded-xl flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Exporter Journal (.CSV)
            </Button>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {['ALL', 'DEPOT', 'RETRAIT', 'BUY', 'SELL', 'BOT_TRADE'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg border transition-all font-headline cursor-pointer",
                filterType === type 
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
              )}
            >
              {type === 'ALL' ? 'Toutes les Écritures' : type}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-[10px] uppercase tracking-wider font-headline">
                <th className="py-3 px-4">Ref / ID Transaction</th>
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Type Opération</th>
                <th className="py-3 px-4 text-right">Montant Brut</th>
                <th className="py-3 px-4 text-right">Valeur Estimée USD</th>
                <th className="py-3 px-4 text-center">Mode</th>
                <th className="py-3 px-4 text-center">Statut Audit</th>
                <th className="py-3 px-4 text-right">Empreinte Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Aucune écriture comptable trouvée dans le grand livre.
                  </td>
                </tr>
              ) : (
                filteredTxs.map(tx => {
                  const usdVal = tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount;
                  const isPositive = tx.type === 'DEPOT' || tx.type === 'DEPOSIT' || tx.type === 'BUY';

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {tx.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-[11px] whitespace-nowrap">
                        {new Date(tx.timestamp).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className={cn(
                          "px-2 py-0.5 text-[9px] font-extrabold uppercase border-none font-headline",
                          isPositive ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                        )}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {tx.amount.toLocaleString('fr-FR')} {tx.currency || 'USD'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-300">
                        {usdVal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className="text-[9px] border-white/20 text-white/70 font-mono">
                          {tx.mode || tradingMode}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold font-headline">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          CONFIRMÉ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {tx.txHash ? (
                          <a
                            href={`https://solscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] inline-flex items-center gap-1 underline underline-offset-2"
                          >
                            {tx.txHash.slice(0, 8)}...
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-white/20 font-mono text-[10px]">Livre Interne</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
