"use client";

import React, { useState, useEffect } from 'react';
import { Building2, FileSpreadsheet, BarChart3, ShieldAlert, Cpu } from 'lucide-react';
import { cn, formatUsdToHtg } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { getRealSolanaBalance } from '@/services/pumpFunService';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ERPOverviewTab from '@/components/ERPOverviewTab';

const ORGANIZATIONS = [
  { id: 'alpha', name: 'Hedge Fund Desk Alpha', type: 'SOLANA MAINNET & HIGH-FREQ', balanceLimit: '500,000 $' },
  { id: 'prop', name: 'Prop Trading Firm Desk', type: 'FOREX & COMMODITIES', balanceLimit: '1,000,000 $' },
  { id: 'treasury', name: 'Liquidity Pool Treasury', type: 'MULTI-ASSET VAULT', balanceLimit: '2,500,000 $' },
] as const;

export default function SaaSERPPage() {
  const { tradingMode, balance, activePositions, closedPositions, bots, transactions } = useAppState();
  const [selectedOrg, setSelectedOrg] = useState<string>('alpha');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'risk' | 'license'>('overview');

  useEffect(() => {
    getRealSolanaBalance().then(res => {
      if (res && res.success && res.balance !== undefined) {
        setSolanaBalance(res.balance);
      }
    });
  }, []);

  const solPriceUsd = 145.0;
  const solValueUsd = (solanaBalance || 0) * solPriceUsd;
  const totalAvailableCashUsd = tradingMode === 'REAL' ? solValueUsd : balance;

  const botAllocatedCapitalUsd = (bots || []).reduce((sum, b) => {
    const cap = b.capital || 0;
    return sum + (tradingMode === 'REAL' ? cap * solPriceUsd : cap);
  }, 0);

  const openPositionsValueUsd = (activePositions || []).reduce((sum, p) => {
    return sum + (p.pair.startsWith('SOL:') ? p.amount * solPriceUsd : p.amount);
  }, 0);

  const totalAumUsd = totalAvailableCashUsd + botAllocatedCapitalUsd + openPositionsValueUsd;
  const convertedAum = formatUsdToHtg(totalAumUsd);

  const filteredClosed = (closedPositions || []).filter(p => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === tradingMode);
  const totalClosedProfit = filteredClosed.reduce((sum, p) => sum + (p.profit || 0), 0);
  const formattedClosedProfitUsd = tradingMode === 'REAL' ? totalClosedProfit * solPriceUsd : totalClosedProfit;

  const handleExportLedgerCSV = () => {
    const headers = ["ID Transaction", "Date", "Type", "Montant", "Devise", "Valeur USD", "Statut"];
    const rows = (transactions || []).map(tx => {
      const usdVal = tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount;
      return [
        tx.id,
        new Date(tx.timestamp).toISOString(),
        tx.type,
        tx.amount,
        tx.currency,
        usdVal.toFixed(2),
        tx.status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Grand_Livre_Comptable_ERP_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-full space-y-6 text-white px-1 sm:px-2" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#140f1d] border border-white/15 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 shadow-lg shadow-[#c2ff0c]/10">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline text-white">
                Console SaaS ERP Enterprise
              </h1>
              <Badge className="bg-[#c2ff0c] text-black font-extrabold text-[10px] uppercase px-2.5 py-0.5 font-headline border-none shadow-md">
                ERP Suite v4.2
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 font-body">
              Pilotage comptable, audit financier du grand livre et contrôle des risques.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-black/40 border border-white/15 p-1.5 rounded-xl flex-1 sm:flex-initial">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 font-headline pl-2 hidden sm:inline">Organisation:</span>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="h-9 w-[220px] bg-white/5 border-white/15 rounded-lg text-xs font-bold text-white font-headline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#14101a] border-white/15 text-white font-headline text-xs">
                {ORGANIZATIONS.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExportLedgerCSV}
            className="h-10 px-4 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-extrabold font-headline flex items-center gap-2 transition-all shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#c2ff0c]" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full bg-black/40 border border-white/15 p-1.5 rounded-xl gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Bilan Comptable & AUM', icon: BarChart3, color: 'text-[#c2ff0c]' },
          { id: 'ledger', label: 'Grand Livre & Audit', icon: FileSpreadsheet, color: 'text-cyan-400' },
          { id: 'risk', label: 'Contrôle des Risques', icon: ShieldAlert, color: 'text-rose-400' },
          { id: 'license', label: 'Licence SaaS', icon: Cpu, color: 'text-purple-400' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-2.5 px-4 text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
                isActive 
                  ? "bg-white/20 text-white shadow-lg border border-white/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-4 w-4", tab.color)} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1 Component */}
      {activeTab === 'overview' && (
        <ERPOverviewTab
          totalAumUsd={totalAumUsd}
          convertedAum={convertedAum}
          tradingMode={tradingMode}
          solanaBalance={solanaBalance}
          balance={balance}
          botAllocatedCapitalUsd={botAllocatedCapitalUsd}
          formattedClosedProfitUsd={formattedClosedProfitUsd}
          bots={bots}
          totalAvailableCashUsd={totalAvailableCashUsd}
        />
      )}
    </div>
  );
}
