"use client";

import React from 'react';
import { RotateCcw, ShieldCheck, Zap, Lock, Activity, Wallet } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/context/AppContext';

interface PortfolioStatsHeaderProps {
  tradingMode: 'DEMO' | 'REAL';
  setTradingMode: (mode: 'DEMO' | 'REAL') => void;
  balance: number;
  reserveVault: number;
  equity: number;
  activePositions: any[];
  solanaBalance: number | null;
  evmBalance: number | null;
  walletChain: 'Solana' | 'BSC' | 'Ethereum' | null;
  rpcLatency: number | null;
  handleResetDemo: () => void;
  onSelectTab: (tab: 'manual' | 'bots' | 'tokens' | 'wallets') => void;
}

export default function PortfolioStatsHeader({
  tradingMode,
  setTradingMode,
  balance,
  reserveVault,
  equity,
  activePositions,
  solanaBalance,
  evmBalance,
  walletChain,
  rpcLatency,
  handleResetDemo,
  onSelectTab
}: PortfolioStatsHeaderProps) {
  const { reserveVaultSol, bots } = useAppState();
  const isDemo = tradingMode === 'DEMO';

  const demoPositionsCount = activePositions.filter(
    (p) => (p.mode || 'DEMO') === 'DEMO'
  ).length;

  const realPositions = activePositions.filter(
    (p) => (p.mode || 'DEMO') === 'REAL'
  );

  const realAllocatedSol = realPositions.reduce(
    (sum, p) => sum + (p.amount || 0), 0
  );

  const realBots = (bots || []).filter(
    (b) => (b.mode || 'DEMO') === 'REAL' && b.status === 'RUNNING'
  );

  const realBotsPnL = realBots.reduce((sum, b) => {
    const pnl = typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : (typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : 0);
    return sum + pnl;
  }, 0);

  const realUnrealizedPnL = realPositions.reduce((sum, p) => {
    const profitVal = typeof p.profit === 'number' && !isNaN(p.profit) ? p.profit : (typeof p.pnl === 'number' && !isNaN(p.pnl) ? p.pnl : 0);
    return sum + profitVal;
  }, 0);

  // --- Determine which wallet/balance to show in REAL mode ---
  const isEvmWallet = walletChain === 'BSC' || walletChain === 'Ethereum';
  const evmCurrencyLabel = walletChain === 'BSC' ? 'BNB' : walletChain === 'Ethereum' ? 'ETH' : 'ETH';

  const realBalance = isEvmWallet ? evmBalance : solanaBalance;
  const realCurrency = isEvmWallet ? evmCurrencyLabel : 'SOL';
  const realVaultVal = isEvmWallet ? 0 : (Number(reserveVaultSol) || 0);
  const realEquity = (realBalance || 0) + realVaultVal + realAllocatedSol + realUnrealizedPnL + realBotsPnL;

  const realBalanceDisplay = realBalance !== null
    ? `${realBalance.toFixed(4)} ${realCurrency}`
    : `0.0000 ${isEvmWallet ? evmCurrencyLabel : 'SOL'}`;

  const getApproxUsd = () => {
    if (realBalance === null) return null;
    if (walletChain === 'Ethereum') return (realBalance * 3000).toFixed(2);
    if (walletChain === 'BSC') return (realBalance * 300).toFixed(2);
    return null;
  };
  const approxUsd = getApproxUsd();

  const modeLabel = walletChain === 'Ethereum'
    ? 'Mode Réel (ETH)'
    : walletChain === 'BSC'
    ? 'Mode Réel (BSC)'
    : 'Mode Réel (Solana)';

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#14101a] border border-white/10 rounded-2xl p-4 sm:p-5 w-full shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/40 via-purple-500/50 to-[#c2ff0c]/40" />

      {/* Mode Switch Controls Segment */}
      <div className="flex items-center bg-black/40 border border-white/10 p-1.5 rounded-xl gap-1 shrink-0">
        <Button
          variant="ghost"
          onClick={() => {
            setTradingMode('DEMO');
            onSelectTab('manual');
          }}
          className={cn(
            "px-4 py-2 h-9 text-xs font-extrabold uppercase rounded-lg transition-all duration-200 font-headline flex items-center gap-2 border-none cursor-pointer",
            isDemo
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Mode Démo (USD)
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            setTradingMode('REAL');
            onSelectTab('manual');
          }}
          className={cn(
            "px-4 py-2 h-9 text-xs font-extrabold uppercase rounded-lg transition-all duration-200 font-headline flex items-center gap-2 border-none cursor-pointer",
            !isDemo
              ? "bg-purple-600/25 text-purple-200 border border-purple-500/40 shadow-sm font-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          {modeLabel}
        </Button>

        {isDemo && (
          <Button
            variant="ghost"
            onClick={handleResetDemo}
            title="Réinitialiser le solde à 10 000 $, effacer les bots & positions démo."
            className="px-3 py-2 h-9 text-[11px] font-extrabold uppercase rounded-lg transition-all duration-200 font-headline flex items-center gap-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 ml-1 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Portfolio Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 flex-1 justify-end">
        {isDemo ? (
          <>
            {/* Card 1: Solde Démo */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-amber-400/90 font-headline tracking-wide flex items-center gap-1">
                <Wallet className="h-3 w-3 text-amber-400" />
                Solde Démo
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 font-headline tracking-tight">
                {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[10px] text-white/40 font-mono font-medium">
                ≈ {formatUsdToHtg(balance)}
              </div>
            </div>

            {/* Card 2: Coffre-Fort (Vault) */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-[#c2ff0c] font-headline flex items-center gap-1 tracking-wide">
                <Lock className="h-3 w-3 text-[#c2ff0c]" />
                Coffre-Fort (10%)
              </div>
              <div className="text-base sm:text-lg font-black text-[#c2ff0c] font-headline tracking-tight">
                ${(Number(reserveVault) || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-white/40 font-mono font-medium">
                ≈ {formatUsdToHtg(Number(reserveVault) || 0)}
              </div>
            </div>

            {/* Card 3: Equity */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-white/60 font-headline tracking-wide flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-purple-400" />
                Equity
              </div>
              <div className="text-base sm:text-lg font-black text-white font-headline tracking-tight">
                {equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[10px] text-white/40 font-mono font-medium">
                ≈ {formatUsdToHtg(equity)}
              </div>
            </div>

            {/* Card 4: Trades Actifs */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-cyan-400 font-headline tracking-wide flex items-center gap-1">
                <Activity className="h-3 w-3 text-cyan-400" />
                Positions
              </div>
              <div className="text-base sm:text-lg font-black text-cyan-300 font-headline tracking-tight">
                {demoPositionsCount} actives
              </div>
              <div className="text-[10px] text-white/40 font-body">
                Mode simulation
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Solde Réel */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-purple-300 font-headline flex items-center gap-1 tracking-wide">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse inline-block" />
                Solde Réel
                {walletChain && (
                  <span className="ml-0.5 text-[8px] text-purple-300 font-mono font-bold bg-purple-500/20 px-1 rounded">
                    {walletChain}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-black text-purple-200 font-headline tracking-tight">
                {realBalanceDisplay}
              </div>
              {!isEvmWallet && solanaBalance !== null && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                  {formatSolToUsdAndHtg(solanaBalance).combinedLabel}
                </div>
              )}
              {isEvmWallet && approxUsd && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                  ≈ ${Number(approxUsd).toLocaleString('fr-FR')} USD
                </div>
              )}
            </div>

            {/* Card 2: Coffre-Fort SOL Réel */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-amber-400 font-headline flex items-center gap-1 tracking-wide">
                <Lock className="h-3 w-3 text-amber-400" />
                Coffre-Fort (10%)
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 font-headline tracking-tight">
                {realVaultVal.toFixed(4)} SOL
              </div>
              <div className="text-[10px] text-amber-200/80 font-mono font-bold">
                {formatSolToUsdAndHtg(realVaultVal).combinedLabel}
              </div>
            </div>

            {/* Card 3: Equity Réelle */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-white/60 font-headline tracking-wide flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Equity Réelle
              </div>
              <div className="text-base sm:text-lg font-black text-white font-headline tracking-tight">
                {realEquity.toFixed(4)} {realCurrency}
              </div>
              {!isEvmWallet && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                  {formatSolToUsdAndHtg(realEquity).combinedLabel}
                </div>
              )}
            </div>

            {/* Card 4: Allocations */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all">
              <div className="text-[10px] uppercase font-bold text-violet-300 font-headline tracking-wide flex items-center gap-1">
                <Zap className="h-3 w-3 text-violet-400" />
                Allocations
              </div>
              <div className="text-base sm:text-lg font-black text-violet-200 font-headline tracking-tight">
                {realAllocatedSol.toFixed(3)} {realCurrency}
              </div>
              {!isEvmWallet && (
                <div className="text-[10px] text-white/40 font-mono">
                  {formatSolToUsdAndHtg(realAllocatedSol).combinedLabel}
                </div>
              )}
            </div>

            {/* Card 5: RPC Latency */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-0.5 hover:border-white/20 transition-all col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-cyan-400 font-headline tracking-wide flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
                Latency RPC
              </div>
              <div className="text-base sm:text-lg font-black text-cyan-300 font-headline tracking-tight">
                {rpcLatency !== null ? `${rpcLatency} ms` : 'Connecté'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-bold">
                Mainnet Solana
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
