"use client";

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn, formatSolToUsdAndHtg } from '@/lib/utils';
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
  onSelectTab: (tab: 'manual') => void;
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

  const realBotsCapitalAndPnL = realBots.reduce((sum, b) => {
    const cap = typeof b.capital === 'number' && !isNaN(b.capital) ? b.capital : 0;
    const pnl = typeof b.netProfit === 'number' && !isNaN(b.netProfit) ? b.netProfit : (typeof b.pnl === 'number' && !isNaN(b.pnl) ? b.pnl : 0);
    return sum + cap + pnl;
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
  const realEquity = (realBalance || 0) + realVaultVal + realAllocatedSol + realUnrealizedPnL + realBotsCapitalAndPnL;

  const realBalanceDisplay = realBalance !== null
    ? `${realBalance.toFixed(4)} ${realCurrency}`
    : `0.0000 ${isEvmWallet ? evmCurrencyLabel : 'SOL'}`;

  // USD approximation (rough estimate — ETH ~$3000, BNB ~$300, SOL ~$200)
  const getApproxUsd = () => {
    if (realBalance === null) return null;
    if (walletChain === 'Ethereum') return (realBalance * 3000).toFixed(2);
    if (walletChain === 'BSC') return (realBalance * 300).toFixed(2);
    // Solana: use existing helper
    return null;
  };
  const approxUsd = getApproxUsd();

  const modeLabel = walletChain === 'Ethereum'
    ? 'Mode Réel (ETH)'
    : walletChain === 'BSC'
    ? 'Mode Réel (BSC)'
    : 'Mode Réel (Solana)';

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#140f1d] border border-white/15 rounded-2xl p-5 w-full shadow-2xl">
      {/* Mode Toggle Switch (Demo vs Real) */}
      <div className="flex items-center bg-black/40 border border-white/15 p-1.5 rounded-xl gap-1 shrink-0">
        <Button
          variant="ghost"
          onClick={() => {
            setTradingMode('DEMO');
            onSelectTab('manual');
          }}
          className={cn(
            "px-4 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-2 border-none",
            isDemo
              ? "bg-amber-500/30 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10 font-black"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Mode Démo (Simulé)
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            setTradingMode('REAL');
            onSelectTab('manual');
          }}
          className={cn(
            "px-4 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-2 border-none",
            !isDemo
              ? "bg-purple-600/35 text-purple-200 border border-purple-500/30 shadow-md shadow-purple-500/10 font-black"
              : "text-slate-400 hover:text-white hover:bg-white/5"
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
            className="px-3 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 ml-2"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-400" />
            Réinitialiser Démo
          </Button>
        )}
      </div>

      {/* Portfolio Stats Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 flex-1 justify-end">
        {isDemo ? (
          <>
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-slate-300 font-headline tracking-wide">
                Solde Démo
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-amber-400 font-body">
                {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-[#c2ff0c] font-headline flex items-center gap-1 tracking-wide">
                🔒 Coffre-Fort (10%)
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-[#c2ff0c] font-body">
                ${(Number(reserveVault) || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-slate-300 font-headline tracking-wide">
                Equity
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white font-body">
                {equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
            </div>

            <div className="p-3 bg-[#140f1d] border border-white/10 rounded-xl space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-slate-300 font-headline tracking-wide">
                Trades
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-cyan-400 font-body">
                {demoPositionsCount}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Real Wallet Balance */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-purple-300 font-headline flex items-center gap-1 tracking-wide">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse inline-block" />
                Solde Réel
                {walletChain && (
                  <span className="ml-1 text-[9px] text-purple-400/70 font-mono font-bold bg-purple-400/10 px-1 rounded">
                    {walletChain}
                  </span>
                )}
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-purple-200 font-body flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span>{realBalanceDisplay}</span>
                </div>
                {/* USD estimate for EVM wallets */}
                {isEvmWallet && approxUsd && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    ≈ ${Number(approxUsd).toLocaleString('fr-FR')} USD
                  </span>
                )}
                {/* SOL USD+HTG conversion */}
                {!isEvmWallet && solanaBalance !== null && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {formatSolToUsdAndHtg(solanaBalance).combinedLabel}
                  </span>
                )}
                {/* No wallet connected yet */}
                {realBalance === null && (
                  <span className="text-[10px] text-amber-400 font-mono">
                    Connectez un wallet ↗
                  </span>
                )}
              </div>
            </div>

            {/* Real Equity */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-slate-300 font-headline tracking-wide">
                Equity Réelle
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white font-body">
                {realBalance !== null ? `${realEquity.toFixed(4)} ${realCurrency}` : `0.0000 ${realCurrency}`}
              </div>
              {!isEvmWallet && realBalance !== null && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                  {formatSolToUsdAndHtg(realEquity).combinedLabel}
                </span>
              )}
              {isEvmWallet && realBalance !== null && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                  ≈ ${(realEquity * (walletChain === 'Ethereum' ? 3000 : 300)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                </span>
              )}
            </div>

            {/* Real Allocations */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-slate-300 font-headline tracking-wide">
                Allocations ({realPositions.length + realBots.length} Actifs)
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-violet-300 font-body">
                {realAllocatedSol.toFixed(3)} {realCurrency}
              </div>
              {!isEvmWallet && (
                <span className="text-[10px] text-slate-300 font-mono block">
                  {formatSolToUsdAndHtg(realAllocatedSol).combinedLabel}
                </span>
              )}
            </div>

            {/* Latency RPC */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center space-y-0.5">
              <div className="text-[10px] uppercase font-extrabold text-cyan-400 font-headline flex items-center gap-1 tracking-wide">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
                Latency RPC
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-cyan-300 font-body flex items-center gap-1.5">
                <span>
                  {rpcLatency !== null ? `${rpcLatency} ms` : 'Connecté'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
