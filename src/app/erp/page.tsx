"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Download, 
  AlertTriangle, 
  Zap, 
  Activity, 
  Coins, 
  Lock, 
  Users, 
  Check, 
  BarChart3, 
  FileSpreadsheet, 
  RefreshCw, 
  Cpu, 
  Layers, 
  Sliders, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { getRealSolanaBalance } from '@/services/pumpFunService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const ORGANIZATIONS = [
  { id: 'alpha', name: 'Hedge Fund Desk Alpha', type: 'SOLANA MAINNET & HIGH-FREQ', balanceLimit: '500,000 $' },
  { id: 'prop', name: 'Prop Trading Firm Desk', type: 'FOREX & COMMODITIES', balanceLimit: '1,000,000 $' },
  { id: 'treasury', name: 'Liquidity Pool Treasury', type: 'MULTI-ASSET VAULT', balanceLimit: '2,500,000 $' },
] as const;

export default function SaaSERPPage() {
  const { tradingMode, setTradingMode, balance, activePositions, closedPositions, bots, transactions } = useAppState();
  const [selectedOrg, setSelectedOrg] = useState<string>('alpha');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState<number>(5.0);
  const [isKillSwitchActive, setIsKillSwitchActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'risk' | 'license'>('overview');

  useEffect(() => {
    setIsMounted(true);
    getRealSolanaBalance().then(res => {
      if (res && res.success && res.balance !== undefined) {
        setSolanaBalance(res.balance);
      }
    });
  }, []);

  // Calculated Financial Metrics for ERP Balance Sheet
  const solPriceUsd = 145.0;
  const solValueUsd = (solanaBalance || 0) * solPriceUsd;
  const demoBalanceUsd = balance;
  const totalAvailableCashUsd = tradingMode === 'REAL' ? solValueUsd : demoBalanceUsd;

  const botAllocatedCapitalUsd = (bots || []).reduce((sum, b) => {
    const cap = b.capital || 0;
    return sum + (tradingMode === 'REAL' ? cap * solPriceUsd : cap);
  }, 0);

  const openPositionsValueUsd = (activePositions || []).reduce((sum, p) => {
    const current = p.entryPrice;
    return sum + (p.pair.startsWith('SOL:') ? p.amount * solPriceUsd : p.amount);
  }, 0);

  const totalAumUsd = totalAvailableCashUsd + botAllocatedCapitalUsd + openPositionsValueUsd;
  const convertedAum = formatUsdToHtg(totalAumUsd);

  const filteredClosed = (closedPositions || []).filter(p => (p.mode || (p.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')) === tradingMode);
  const totalClosedProfit = filteredClosed.reduce((sum, p) => sum + (p.profit || 0), 0);
  const formattedClosedProfitUsd = tradingMode === 'REAL' ? totalClosedProfit * solPriceUsd : totalClosedProfit;

  // Export Ledger CSV
  const handleExportLedgerCSV = () => {
    const headers = ["ID Transaction", "Date", "Type", "Montant", "Devise", "Valeur USD", "Valeur HTG", "Statut"];
    const rows = (transactions || []).map(tx => {
      const usdVal = tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount;
      const htgVal = usdVal * 132;
      return [
        tx.id,
        new Date(tx.timestamp).toISOString(),
        tx.type,
        tx.amount,
        tx.currency,
        usdVal.toFixed(2),
        Math.round(htgVal),
        tx.status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Grand_Livre_Comptable_ERP_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render page immediately (no blocking hydration spinner)
  const currentOrgObj = ORGANIZATIONS.find(o => o.id === selectedOrg) || ORGANIZATIONS[0];

  return (
    <div className="w-full max-w-full space-y-6 text-white px-1 sm:px-2" suppressHydrationWarning>
      {/* Header & Organization Switcher */}
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
              Pilotage comptable, audit financier du grand livre, gestion multi-organisations et contrôle des risques quantitatifs.
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Org Selector */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/15 p-1.5 rounded-xl flex-1 sm:flex-initial">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 font-headline pl-2 hidden sm:inline">Organisation:</span>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="h-9 w-[220px] bg-white/5 border-white/15 rounded-lg text-xs font-bold text-white font-headline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#14101a] border-white/15 text-white font-headline text-xs">
                {ORGANIZATIONS.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExportLedgerCSV}
            className="h-10 px-4 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-extrabold font-headline flex items-center gap-2 transition-all shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4 text-[#c2ff0c]" />
            Exporter le Grand Livre CSV
          </Button>
        </div>
      </div>

      {/* ERP Suite Navigation Tabs */}
      <div className="flex w-full bg-black/40 border border-white/15 p-1.5 rounded-xl gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Bilan Comptable & AUM', icon: BarChart3, color: 'text-[#c2ff0c]' },
          { id: 'ledger', label: 'Grand Livre & Audit', icon: FileSpreadsheet, color: 'text-cyan-400' },
          { id: 'risk', label: 'Contrôle des Risques & Kill-Switch', icon: ShieldAlert, color: 'text-rose-400' },
          { id: 'license', label: 'Licence SaaS & Télémétrie API', icon: Cpu, color: 'text-purple-400' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-2.5 px-4 text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center justify-center gap-2 whitespace-nowrap border-none cursor-pointer",
                isActive 
                  ? "bg-white/20 text-white shadow-lg shadow-white/5 border border-white/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-4 w-4", tab.color)} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & BALANCE SHEET */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top ERP Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-white/40 font-headline block">Actifs Sous Gestion (AUM)</span>
              <div className="text-2xl font-extrabold text-[#c2ff0c] font-body">
                {totalAumUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD
              </div>
              <span className="text-[10px] text-emerald-400 font-mono block font-semibold">
                ≈ {convertedAum}
              </span>
              <span className="text-[9px] text-white/30 font-body block mt-1">Cumul liquidités + bots + positions en cours</span>
            </Card>

            <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-purple-400 font-headline block">Trésorerie Disponible</span>
              <div className="text-2xl font-extrabold text-white font-body">
                {tradingMode === 'REAL' 
                  ? `${solanaBalance !== null ? solanaBalance.toFixed(2) : '0.00'} SOL` 
                  : `${balance.toLocaleString('fr-FR')} $`
                }
              </div>
              <span className="text-[10px] text-purple-300 font-mono block font-semibold">
                {tradingMode === 'REAL' ? formatSolToUsdAndHtg(solanaBalance).combinedLabel : `≈ ${formatUsdToHtg(balance)}`}
              </span>
              <span className="text-[9px] text-white/30 font-body block mt-1">Réserve liquide immédiatement mobilisable</span>
            </Card>

            <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline block">Capital Alloué aux Bots</span>
              <div className="text-2xl font-extrabold text-cyan-300 font-body">
                {botAllocatedCapitalUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
              </div>
              <span className="text-[10px] text-white/50 font-mono block">
                ≈ {formatUsdToHtg(botAllocatedCapitalUsd)}
              </span>
              <span className="text-[9px] text-white/30 font-body block mt-1">{bots.length} robot(s) de trading automatisés</span>
            </Card>

            <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-amber-400 font-headline block">Gains Réalisés Cumulés</span>
              <div className={cn("text-2xl font-extrabold font-body", formattedClosedProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {formattedClosedProfitUsd >= 0 ? '+' : ''}{formattedClosedProfitUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
              </div>
              <span className="text-[10px] text-white/50 font-mono block">
                ≈ {formatUsdToHtg(formattedClosedProfitUsd)}
              </span>
              <span className="text-[9px] text-white/30 font-body block mt-1">Profit net clôturé sur l'organisation</span>
            </Card>
          </div>

          {/* Asset Allocation Inventory */}
          <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-[#c2ff0c]" />
                  Inventaire des Actifs ERP & Ventilation de la Trésorerie
                </h3>
                <p className="text-xs text-white/40 mt-1 font-body">
                  Ventilation comptable des réserves en portefeuille et des allocations algorithmiques.
                </p>
              </div>
              <Badge className="bg-white/10 text-white font-mono text-[10px]">Org: {currentOrgObj.name}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold text-purple-400 font-headline">Fonds Blockchain Solana (SOL)</span>
                <div className="text-xl font-bold font-mono text-white">
                  {solanaBalance !== null ? solanaBalance.toFixed(2) : '0.00'} SOL
                </div>
                <div className="text-xs text-purple-300 font-mono">
                  {formatSolToUsdAndHtg(solanaBalance || 0).combinedLabel}
                </div>
                <div className="text-[10px] text-white/40 pt-2 border-t border-white/5">
                  Réseau: Solana Mainnet · RPC: Chainstack Dedicated Node
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold text-amber-400 font-headline">Réserve Démo Simulée (USD)</span>
                <div className="text-xl font-bold font-mono text-white">
                  {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
                </div>
                <div className="text-xs text-amber-300 font-mono">
                  ≈ {formatUsdToHtg(balance)}
                </div>
                <div className="text-[10px] text-white/40 pt-2 border-t border-white/5">
                  Mode: Simulé sans risque financier réels
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold text-cyan-400 font-headline">Capital Mobilisé dans les Bots</span>
                <div className="text-xl font-bold font-mono text-white">
                  {botAllocatedCapitalUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $ USD
                </div>
                <div className="text-xs text-cyan-300 font-mono">
                  ≈ {formatUsdToHtg(botAllocatedCapitalUsd)}
                </div>
                <div className="text-[10px] text-white/40 pt-2 border-t border-white/5">
                  {bots.filter(b => b.status === 'RUNNING').length} bot(s) actifs sur {bots.length}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: GENERAL LEDGER & FINANCIAL AUDIT */}
      {activeTab === 'ledger' && (
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#c2ff0c]" />
                Grand Livre Comptable Des Opérations (General Ledger)
              </h3>
              <p className="text-xs text-white/40 mt-1 font-body">
                Traçabilité complète des flux de trésorerie, crédits, retraits et opérations algorithmiques.
              </p>
            </div>
            <Button
              onClick={handleExportLedgerCSV}
              className="h-9 px-3 bg-[#c2ff0c] text-black font-headline font-bold text-xs rounded-xl uppercase hover:shadow-[0_0_15px_rgba(194,255,12,0.3)] border-none"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Télécharger Rapport CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-headline uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-3">Identifiant Tx</th>
                  <th className="py-3 px-3">Date & Heure</th>
                  <th className="py-3 px-3">Catégorie</th>
                  <th className="py-3 px-3">Montant Brut</th>
                  <th className="py-3 px-3">Équivalent USD</th>
                  <th className="py-3 px-3">Équivalent Gourdes (HTG)</th>
                  <th className="py-3 px-3 text-right">Statut Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(transactions || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-white/30 font-body">
                      Aucun mouvement comptable enregistré. Les dépôts et retraits apparaîtront ici.
                    </td>
                  </tr>
                ) : (
                  (transactions || []).map(tx => {
                    const usdVal = tx.currency === 'SOL' ? tx.amount * solPriceUsd : tx.amount;
                    const htgVal = usdVal * 132;
                    return (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono text-white/60">{tx.id}</td>
                        <td className="py-3 px-3 font-mono text-white/40">
                          {new Date(tx.timestamp).toLocaleString('fr-FR', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold font-headline uppercase",
                            tx.type === 'DEPOSIT' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {tx.type === 'DEPOSIT' ? 'DÉPÔT CRÉDIT' : 'RETRAIT DÉBIT'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold font-mono text-white">
                          {tx.amount.toLocaleString()} {tx.currency}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400">
                          {usdVal.toFixed(2)} $
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-300">
                          {Math.round(htgVal).toLocaleString('fr-FR')} HTG
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Badge className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase border-none">
                            VERIFIED (CHAIN)
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: RISK CONTROL SUITE & EMERGENCY KILL-SWITCH */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          {/* Emergency Kill Switch Banner */}
          <Card className={cn(
            "border-2 rounded-2xl p-6 transition-all duration-300",
            isKillSwitchActive 
              ? "bg-rose-950/40 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]" 
              : "bg-[#14101a] border-rose-500/30"
          )}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-6 w-6 text-rose-400 animate-pulse" />
                  <h3 className="text-lg font-bold font-headline text-rose-400">
                    Interrupteur d'Urgence ERP (Kill-Switch Liquidation)
                  </h3>
                </div>
                <p className="text-xs text-white/60 font-body leading-relaxed max-w-2xl">
                  En cas de krach soudain ou de choc systémique sur le marché, déclenchez l'arrêt d'urgence pour suspendre instantanément tous les robots de trading et bloquer les nouveaux ordres.
                </p>
              </div>

              <Button
                onClick={() => setIsKillSwitchActive(!isKillSwitchActive)}
                className={cn(
                  "h-12 px-6 font-headline font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all duration-300 border-none shrink-0",
                  isKillSwitchActive 
                    ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]"
                )}
              >
                {isKillSwitchActive ? "DÉSACTIVER KILL-SWITCH (REPRISE)" : "DÉCLENCHER ARRÊT D'URGENCE (KILL-SWITCH)"}
              </Button>
            </div>

            {isKillSwitchActive && (
              <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-bold font-headline flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>KILL-SWITCH ACTIF : Tous les robots sont gelés et les ouvertures d'ordres sont verrouillées.</span>
              </div>
            )}
          </Card>

          {/* Risk Control Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase font-headline text-purple-400 flex items-center gap-2">
                <Sliders className="h-4 w-4" /> Plafond De Drawdown Maximal (Max Loss Cap)
              </h3>
              <p className="text-xs text-white/50 font-body">
                Si la perte cumulée quotidienne dépasse le pourcentage configuré, le système suspend automatiquement les positions.
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-white/60 font-body">Seuil Max Drawdown</span>
                  <span className="text-[#c2ff0c] font-mono font-bold text-sm">{maxDrawdownLimit}%</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={maxDrawdownLimit}
                  onChange={(e) => setMaxDrawdownLimit(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg cursor-pointer accent-[#c2ff0c]"
                />
                <div className="flex justify-between text-[9px] text-white/30 font-headline">
                  <span>1% (Très Conservateur)</span>
                  <span>5% (Standard ERP)</span>
                  <span>20% (Agressif)</span>
                </div>
              </div>
            </Card>

            <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase font-headline text-cyan-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Statut De Conformité Regulatory & Audit
              </h3>
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                  <span className="text-white/60 font-body">Norme SOC-2 Type II</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 font-mono text-[9px] border-none">CONFORME</Badge>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                  <span className="text-white/60 font-body">Sécurité Clés Privées On-Chain</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 font-mono text-[9px] border-none">CHIFFREMENT LOCAL</Badge>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                  <span className="text-white/60 font-body">Audit des Smart Contracts Pump.fun / Raydium</span>
                  <Badge className="bg-[#c2ff0c]/10 text-[#c2ff0c] font-mono text-[9px] border-none">VÉRIFIÉ</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: SAAS LICENSE & TELEMETRY */}
      {activeTab === 'license' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* License Status Card */}
          <Card className="lg:col-span-6 bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#c2ff0c] font-headline">Statut De La Licence SaaS</span>
                <h3 className="text-xl font-bold font-headline text-white mt-1">SaaS Enterprise Tier (Illimité)</h3>
              </div>
              <Badge className="bg-[#c2ff0c] text-black font-extrabold text-[10px] uppercase px-2.5 py-1 border-none">
                ACTIF
              </Badge>
            </div>

            <div className="space-y-3 text-xs font-body">
              <div className="flex justify-between text-white/70">
                <span>Expiration de la licence</span>
                <span className="font-mono text-white font-semibold">2027-12-31 (Renouvellement Auto)</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Nœud RPC Solana</span>
                <span className="font-mono text-purple-300 font-semibold">Chainstack Dedicated High-Speed Node</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Modèle IA Gemini</span>
                <span className="font-mono text-cyan-300 font-semibold">Gemini 1.5 Pro Flash API</span>
              </div>
            </div>
          </Card>

          {/* Usage Telemetry Meter */}
          <Card className="lg:col-span-6 bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase font-headline text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#c2ff0c]" /> Consommation Des Ressources API
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-white/60">Appels Nœud RPC Chainstack</span>
                  <span className="font-mono text-[#c2ff0c]">1.2M / 10.0M appels (12%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c2ff0c] rounded-full w-[12%]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-white/60">Tokens API Gemini AI</span>
                  <span className="font-mono text-cyan-400">245,000 / 2,000,000 tokens (12.2%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full w-[12.2%]" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
