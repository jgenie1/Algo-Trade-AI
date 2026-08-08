"use client";

import React, { useState, useEffect } from 'react';
import { Building2, FileSpreadsheet, BarChart3, ShieldAlert, Cpu } from 'lucide-react';
import { cn, formatUsdToHtg, SOL_USD_RATE } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { getRealSolanaBalance, fetchLiveWalletBalance } from '@/services/pumpFunService';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ERPOverviewTab from '@/components/erp/ERPOverviewTab';
import ERPLedgerTab from '@/components/erp/ERPLedgerTab';
import ERPRiskTab from '@/components/erp/ERPRiskTab';
import ERPLicenseTab from '@/components/erp/ERPLicenseTab';

const ORGANIZATIONS = [
  { id: 'alpha', name: 'Hedge Fund Desk Alpha', type: 'SOLANA MAINNET & HIGH-FREQ', balanceLimit: '500,000 $' },
  { id: 'prop', name: 'Prop Trading Firm Desk', type: 'FOREX & COMMODITIES', balanceLimit: '1,000,000 $' },
  { id: 'treasury', name: 'Liquidity Pool Treasury', type: 'MULTI-ASSET VAULT', balanceLimit: '2,500,000 $' },
] as const;

export default function SaaSERPPage() {
  const { tradingMode, balance, reserveVault, reserveVaultSol, activePositions, closedPositions, bots, transactions } = useAppState();
  const [selectedOrg, setSelectedOrg] = useState<string>('alpha');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'risk' | 'license'>('overview');

  useEffect(() => {
    fetchLiveWalletBalance().then(res => {
      if (res && res.success && res.solanaBalance !== null) {
        setSolanaBalance(res.solanaBalance);
      }
    });
  }, []);

  const solPriceUsd = SOL_USD_RATE || 145.0;

  // Mode filtering
  const modePositions = (activePositions || []).filter(p => (p.mode || 'DEMO') === tradingMode);
  const modeBots = (bots || []).filter(b => (b.mode || 'DEMO') === tradingMode);
  const modeClosed = (closedPositions || []).filter(p => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === tradingMode);

  // Manual open positions margin & PnL
  let openPositionsPnLUsd = 0;
  let openPositionsMarginUsd = 0;
  modePositions.forEach(p => {
    const entry = typeof p.entryPrice === 'number' && p.entryPrice > 0 ? p.entryPrice : 145.50;
    const current = entry;
    const priceDiff = current - entry;
    const pctDiff = entry > 0 ? (priceDiff / entry) : 0;
    const lev = p.leverage || 1;
    const amt = p.amount || 0;
    const isLong = p.type === 'BUY' || (p.type as string) === 'LONG';
    const profit = pctDiff * amt * lev * (isLong ? 1 : -1);

    const amtUsd = tradingMode === 'REAL' ? amt * solPriceUsd : amt;
    const profitUsd = tradingMode === 'REAL' ? profit * solPriceUsd : profit;

    openPositionsMarginUsd += amtUsd;
    openPositionsPnLUsd += profitUsd;
  });

  // Bots capital & running PnL
  let botAllocatedCapitalUsd = 0;
  let botRunningPnLUsd = 0;
  modeBots.forEach(b => {
    const cap = (tradingMode === 'REAL' && (b.capital || 0) > 50) ? 0.5 : (b.capital || 0);
    const pnl = typeof b.pnl === 'number' ? b.pnl : (typeof b.netProfit === 'number' ? b.netProfit : 0);

    const capUsd = tradingMode === 'REAL' ? cap * solPriceUsd : cap;
    const pnlUsd = tradingMode === 'REAL' ? pnl * solPriceUsd : pnl;

    if (tradingMode === 'DEMO') {
      botAllocatedCapitalUsd += capUsd;
    }
    if (b.status === 'RUNNING') {
      botRunningPnLUsd += pnlUsd;
    }
  });

  // Available Cash (Trésorerie liquide + Coffre-Fort)
  const freeCashUsd = tradingMode === 'REAL' ? (solanaBalance || 0) * solPriceUsd : balance;
  const vaultUsd = tradingMode === 'REAL' ? (Number(reserveVaultSol) || 0) * solPriceUsd : (Number(reserveVault) || 0);
  const totalAvailableCashUsd = freeCashUsd + vaultUsd;

  // Total AUM (100% Identique à l'Equity du Tableau de Bord!)
  const totalAumUsd = freeCashUsd + vaultUsd + botAllocatedCapitalUsd + openPositionsMarginUsd + openPositionsPnLUsd + botRunningPnLUsd;
  const convertedAum = formatUsdToHtg(totalAumUsd);

  // Profit net clôturé
  const totalClosedProfit = modeClosed.reduce((sum, p) => sum + (p.profit || 0), 0);
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

      {/* Tab Components */}
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

      {activeTab === 'ledger' && (
        <ERPLedgerTab
          transactions={transactions}
          tradingMode={tradingMode}
          handleExportLedgerCSV={handleExportLedgerCSV}
        />
      )}

      {activeTab === 'risk' && (
        <ERPRiskTab
          totalAumUsd={totalAumUsd}
          openPositions={activePositions}
          bots={bots}
          tradingMode={tradingMode}
        />
      )}

      {activeTab === 'license' && (
        <ERPLicenseTab
          selectedOrgName={ORGANIZATIONS.find(o => o.id === selectedOrg)?.name}
          tradingMode={tradingMode}
        />
      )}
    </div>
  );
}
