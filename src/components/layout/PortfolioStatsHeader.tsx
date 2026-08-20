"use client";

import React, { useState, useEffect } from 'react';
import { RotateCcw, ShieldCheck, Zap, Lock, Activity, Wallet } from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg, formatSmartCrypto, formatSmartNumber, getSolUsdRate } from '@/lib/utils';
import { fetchCoinMarketCapQuotes } from '@/services/coinmarketcapService';
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

  // Live CoinMarketCap Price state
  const [liveCmcPrices, setLiveCmcPrices] = useState<{ SOL?: number; ETH?: number; BNB?: number }>({});

  useEffect(() => {
    let isMounted = true;
    const fetchQuotes = async () => {
      const quotes = await fetchCoinMarketCapQuotes(['SOL', 'ETH', 'BNB']);
      if (quotes && isMounted) {
        setLiveCmcPrices({
          SOL: quotes['SOL']?.quote?.USD?.price,
          ETH: quotes['ETH']?.quote?.USD?.price,
          BNB: quotes['BNB']?.quote?.USD?.price
        });
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 4000);
    const handlePriceUpdate = (e: any) => {
      if (e?.detail && typeof e.detail === 'number') {
        setLiveCmcPrices(prev => ({ ...prev, SOL: e.detail }));
      }
    };
    window.addEventListener('live_sol_price_updated', handlePriceUpdate);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('live_sol_price_updated', handlePriceUpdate);
    };
  }, []);

  const liveSolPrice = liveCmcPrices.SOL || getSolUsdRate() || 0;
  const liveEthPrice = liveCmcPrices.ETH || 0;
  const liveBnbPrice = liveCmcPrices.BNB || 0;

  const safeActivePositions = Array.isArray(activePositions) ? activePositions : [];
  const safeBots = Array.isArray(bots) ? bots : [];

  const demoPositionsCount = safeActivePositions.filter(
    (p) => p && (p.mode || 'DEMO') === 'DEMO'
  ).length;

  const realPositions = safeActivePositions.filter(
    (p) => p && (p.mode || 'DEMO') === 'REAL'
  );

  const realAllocatedSol = realPositions.reduce(
    (sum, p) => sum + (p?.amount || 0), 0
  );

  const realBots = safeBots.filter(
    (b) => b && (b.mode || 'DEMO') === 'REAL' && b.status === 'RUNNING'
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
    ? formatSmartCrypto(realBalance, realCurrency)
    : `0,00 ${isEvmWallet ? evmCurrencyLabel : 'SOL'}`;

  const getApproxUsd = () => {
    if (realBalance === null) return null;
    if (walletChain === 'Ethereum') return liveEthPrice > 0 ? (realBalance * liveEthPrice).toFixed(2) : null;
    if (walletChain === 'BSC') return liveBnbPrice > 0 ? (realBalance * liveBnbPrice).toFixed(2) : null;
    return null;
  };
  const approxUsd = getApproxUsd();

  const modeLabel = walletChain === 'Ethereum'
    ? 'Mode Réel (ETH)'
    : walletChain === 'BSC'
    ? 'Mode Réel (BSC)'
    : 'Mode Réel (Solana)';

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-gradient-to-b from-[#160e29]/95 via-[#110a20]/95 to-[#0d0718]/95 border border-white/15 rounded-3xl p-4 sm:p-5 w-full shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] relative overflow-hidden backdrop-blur-2xl transition-all duration-300">
      {/* Top Ambient Glow Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-purple-500 to-[#c2ff0c] opacity-80" />

      {/* Mode Switch Controls & Quick Reset */}
      <div className="flex items-center justify-between sm:justify-start bg-black/60 border border-white/12 p-1.5 rounded-2xl gap-1.5 shrink-0 w-full xl:w-auto shadow-inner">
        <Button
          variant="ghost"
          onClick={() => {
            setTradingMode('DEMO');
            onSelectTab('manual');
          }}
          className={cn(
            "flex-1 sm:flex-initial px-4 py-2 h-10 text-xs font-black uppercase rounded-xl transition-all duration-200 font-headline flex items-center justify-center gap-2 border cursor-pointer select-none active:scale-95",
            isDemo
              ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 text-amber-300 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", isDemo ? "bg-amber-400 animate-pulse" : "bg-slate-500")} />
          <span>Simulation Démo</span>
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            setTradingMode('REAL');
            onSelectTab('manual');
          }}
          className={cn(
            "flex-1 sm:flex-initial px-4 py-2 h-10 text-xs font-black uppercase rounded-xl transition-all duration-200 font-headline flex items-center justify-center gap-2 border cursor-pointer select-none active:scale-95",
            !isDemo
              ? "bg-gradient-to-r from-purple-600/40 to-indigo-600/30 text-purple-200 border-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
              : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", !isDemo ? "bg-[#c2ff0c] animate-pulse" : "bg-slate-500")} />
          <span>{modeLabel}</span>
        </Button>

        {isDemo && (
          <Button
            variant="ghost"
            onClick={handleResetDemo}
            title="Réinitialiser le solde à 10 000 $, effacer les bots & positions démo."
            className="px-3 py-2 h-10 text-[11px] font-black uppercase rounded-xl transition-all duration-200 font-headline flex items-center justify-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 ml-0.5 cursor-pointer select-none shrink-0 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-300" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>

      {/* Portfolio Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 flex-1 justify-end">
        {isDemo ? (
          <>
            {/* Card 1: Solde Démo */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-amber-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-amber-400/90 font-headline tracking-wider flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-amber-400" />
                Solde Démo
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-300 font-headline tracking-tight tabular-nums truncate">
                {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[11px] text-purple-300 font-mono font-bold truncate">
                ≈ {formatUsdToHtg(balance)}
              </div>
            </div>

            {/* Card 2: Coffre-Fort (Vault) */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-[#c2ff0c]/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-[#c2ff0c] font-headline flex items-center gap-1.5 tracking-wider">
                <Lock className="h-3.5 w-3.5 text-[#c2ff0c]" />
                Coffre-Fort
              </div>
              <div className="text-lg sm:text-xl font-black text-[#c2ff0c] font-headline tracking-tight tabular-nums truncate">
                ${(Number(reserveVault) || 0).toFixed(2)}
              </div>
              <div className="text-[11px] text-purple-300 font-mono font-bold truncate">
                ≈ {formatUsdToHtg(Number(reserveVault) || 0)}
              </div>
            </div>

            {/* Card 3: Equity */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-purple-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-purple-300 font-headline tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                Équité Totale
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-headline tracking-tight tabular-nums truncate">
                {equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[11px] text-purple-300 font-mono font-bold truncate">
                ≈ {formatUsdToHtg(equity)}
              </div>
            </div>

            {/* Card 4: Trades Actifs */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-black text-cyan-400 font-headline tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                Positions
              </div>
              <div className="text-lg sm:text-xl font-black text-cyan-300 font-headline tracking-tight tabular-nums">
                {demoPositionsCount} active{demoPositionsCount > 1 ? 's' : ''}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono font-bold truncate">
                Mode Virtuel 100%
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Solde Réel */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-purple-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-purple-300 font-headline flex items-center gap-1.5 tracking-wider">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse inline-block shrink-0" />
                Solde Réel
                {walletChain && (
                  <span className="ml-1 text-[8px] text-purple-200 font-mono font-black bg-purple-500/30 border border-purple-500/40 px-1 py-0.2 rounded">
                    {walletChain}
                  </span>
                )}
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-200 font-headline tracking-tight tabular-nums truncate">
                {realBalanceDisplay}
              </div>
              {!isEvmWallet && solanaBalance !== null && (
                <div className="text-[11px] text-emerald-400 font-mono font-bold truncate">
                  {formatSolToUsdAndHtg(solanaBalance, liveSolPrice).combinedLabel}
                </div>
              )}
              {isEvmWallet && approxUsd && (
                <div className="text-[11px] text-emerald-400 font-mono font-bold truncate">
                  ≈ ${Number(approxUsd).toLocaleString('fr-FR')} USD
                </div>
              )}
            </div>

            {/* Card 2: Coffre-Fort SOL Réel */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-amber-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-amber-400 font-headline flex items-center gap-1.5 tracking-wider">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                Coffre-Fort
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-300 font-headline tracking-tight tabular-nums truncate">
                {formatSmartCrypto(realVaultVal, 'SOL')}
              </div>
              <div className="text-[11px] text-amber-200 font-mono font-bold truncate">
                {formatSolToUsdAndHtg(realVaultVal, liveSolPrice).combinedLabel}
              </div>
            </div>

            {/* Card 3: Equity Réelle */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-emerald-300 font-headline tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Équité Réelle
              </div>
              <div className="text-lg sm:text-xl font-black text-white font-headline tracking-tight tabular-nums truncate">
                {formatSmartCrypto(realEquity, realCurrency)}
              </div>
              {!isEvmWallet && (
                <div className="text-[11px] text-emerald-400 font-mono font-bold truncate">
                  {formatSolToUsdAndHtg(realEquity, liveSolPrice).combinedLabel}
                </div>
              )}
            </div>

            {/* Card 4: Allocations */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-violet-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group">
              <div className="text-[10px] uppercase font-black text-violet-300 font-headline tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-violet-400" />
                Allocations Bots
              </div>
              <div className="text-lg sm:text-xl font-black text-violet-200 font-headline tracking-tight tabular-nums truncate">
                {formatSmartCrypto(realAllocatedSol, realCurrency)}
              </div>
              {!isEvmWallet && (
                <div className="text-[11px] text-purple-300 font-mono font-bold truncate">
                  {formatSolToUsdAndHtg(realAllocatedSol, liveSolPrice).combinedLabel}
                </div>
              )}
            </div>

            {/* Card 5: RPC Latency */}
            <div className="p-3 bg-black/40 hover:bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 rounded-2xl space-y-1 transition-all duration-200 shadow-md group col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-black text-cyan-400 font-headline tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
                RPC Solana
              </div>
              <div className="text-lg sm:text-xl font-black text-cyan-300 font-headline tracking-tight tabular-nums">
                {rpcLatency !== null ? `${rpcLatency} ms` : 'Connecté'}
              </div>
              <div className="text-[11px] text-emerald-400 font-mono font-bold">
                Mainnet Live 🟢
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
