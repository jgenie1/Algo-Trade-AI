"use client";

import React, { useState, useEffect } from 'react';
import { Zap, Bot, Coins } from 'lucide-react';
import { useTradingEngine } from '@/hooks/useTradingEngine';
import { useAppState } from '@/context/AppContext';
import ActivePositionsTable from '@/components/trading/ActivePositionsTable';
import ManualOrderForm from '@/components/trading/ManualOrderForm';
import TradingBotsManager from '@/components/trading/TradingBotsManager';
import MultiWalletsManager from '@/components/wallet/MultiWalletsManager';
import WalletTokenPortfolio from '@/components/wallet/WalletTokenPortfolio';
import DEXSwapModal from '@/components/wallet/DEXSwapModal';
import PositionDetailsModal from '@/components/trading/PositionDetailsModal';
import MarketRadarAndChart from '@/components/trading/MarketRadarAndChart';
import dynamic from 'next/dynamic';
import PortfolioStatsHeader from '@/components/layout/PortfolioStatsHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { SwapToken } from '@/services/dexSwapService';

const AutomatedPipelineFlowVisualizer = dynamic(
  () => import('@/components/trading/AutomatedPipelineFlowVisualizer').then((mod) => mod.default),
  { ssr: false }
);

export default function TradingTerminalPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'bots' | 'tokens' | 'wallets'>('manual');
  const [isClient, setIsClient] = useState(false);

  // Swap modal state
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapFromToken, setSwapFromToken] = useState<SwapToken | undefined>(undefined);
  const [swapToToken, setSwapToToken] = useState<SwapToken | undefined>(undefined);

  const handleOpenSwap = (from?: SwapToken, to?: SwapToken) => {
    setSwapFromToken(from);
    setSwapToToken(to);
    setIsSwapModalOpen(true);
  };

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'tokens' || tabParam === 'manual' || tabParam === 'bots' || tabParam === 'wallets') {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const {
    isMounted,
    tradingMode,
    balance,
    equity,
    activePositions,
    livePrices,
    priceDirections,
    selectedPosition,
    setSelectedPosition,
    solanaPubKey,
    solanaBalance,
    setSolanaBalance,
    evmBalance,
    walletChain,
    isSolanaWalletActive,
    rpcLatency,
    disperseAmount,
    setDisperseAmount,
    isDispersing,
    disperseTxHash,
    disperseError,
    subWallets,
    bots,
    botLogs,
    selectedPair,
    setSelectedPair,
    addBotLog,
    handleToggleBot,
    handleDeleteBot,
    handleDisperseSOL,
    handleClosePosition,
    resetDemoData
  } = useTradingEngine();

  const { setTradingMode, reserveVault } = useAppState();

  const handleResetDemo = () => {
    const confirmMsg =
      "Êtes-vous sûr de vouloir tout réinitialiser en Mode Démo " +
      "(remise du solde à 10 000 $, suppression des bots et positions démo) ?\n\n" +
      "- Remarque : Les apprentissages IA accumulés seront intégralement conservés.";

    if (window.confirm(confirmMsg)) {
      resetDemoData();
    }
  };

  if (!isMounted && !isClient) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] w-full">
        <div className="flex flex-col items-center gap-4 p-8 bg-[#140f1d] border border-white/10 rounded-3xl shadow-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c2ff0c] border-t-transparent" />
          <div className="flex flex-col items-center text-center">
            <span className="text-base font-extrabold font-headline text-white">
              Chargement du terminal...
            </span>
            <span className="text-xs text-white/50 font-body mt-1">
              Initialisation des flux de marché & du moteur algorithmique...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 text-white px-1 sm:px-2" suppressHydrationWarning>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-headline text-white">
              Terminal de Trading Algorithmique
            </h1>
            <span className="px-2.5 py-1 rounded-lg bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 text-[10px] font-extrabold uppercase font-headline flex items-center gap-1.5 shadow-[0_0_12px_rgba(194,255,12,0.2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c2ff0c] animate-ping" />
              Live 24/7
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium font-body">
            Gérez vos ordres manuellement, supervisez votre flotte de robots IA ou convertissez vos tokens en USD en bloc.
          </p>
        </div>
      </div>

      {/* Header Stats Bar */}
      <PortfolioStatsHeader
        tradingMode={tradingMode}
        setTradingMode={setTradingMode}
        balance={balance}
        reserveVault={reserveVault}
        equity={equity}
        activePositions={activePositions}
        solanaBalance={solanaBalance}
        evmBalance={evmBalance}
        walletChain={walletChain}
        rpcLatency={rpcLatency}
        handleResetDemo={handleResetDemo}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Active Positions Table */}
      <ActivePositionsTable
        livePrices={livePrices}
        setSelectedPosition={setSelectedPosition}
        handleClosePosition={handleClosePosition}
      />

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="flex w-full bg-[#120a1c]/95 border border-white/15 p-2 rounded-2xl gap-2 h-auto mb-6 overflow-x-auto no-scrollbar scrollbar-none snap-x whitespace-nowrap backdrop-blur-2xl shadow-2xl">
          <TabsTrigger
            value="manual"
            className="flex-1 min-w-[170px] sm:min-w-0 py-3 px-4 text-xs font-black uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/30 data-[state=active]:to-amber-600/20 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-500/50 data-[state=active]:shadow-[0_0_20px_rgba(245,158,11,0.3)] text-slate-300 hover:text-white snap-start active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Trading Manuel & Analyse</span>
          </TabsTrigger>

          <TabsTrigger
            value="bots"
            className="flex-1 min-w-[180px] sm:min-w-0 py-3 px-4 text-xs font-black uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c2ff0c]/25 data-[state=active]:to-[#c2ff0c]/10 data-[state=active]:text-[#c2ff0c] data-[state=active]:border data-[state=active]:border-[#c2ff0c]/50 data-[state=active]:shadow-[0_0_20px_rgba(194,255,12,0.3)] text-slate-300 hover:text-white snap-start active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Bot className="h-4 w-4 text-[#c2ff0c]" />
            <span>Bots IA & Flotte Multi-Wallet</span>
            {(bots || []).filter(b => b.status === 'RUNNING').length > 0 && (
              <span className="bg-[#c2ff0c] text-black font-black text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(194,255,12,0.8)] leading-none ml-1">
                {(bots || []).filter(b => b.status === 'RUNNING').length} Actif{(bots || []).filter(b => b.status === 'RUNNING').length > 1 ? 's' : ''}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="tokens"
            className="flex-1 min-w-[170px] sm:min-w-0 py-3 px-4 text-xs font-black uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/35 data-[state=active]:to-purple-800/20 data-[state=active]:text-purple-200 data-[state=active]:border data-[state=active]:border-purple-400/50 data-[state=active]:shadow-[0_0_20px_rgba(168,85,247,0.35)] text-slate-300 hover:text-white flex items-center justify-center gap-2 snap-start active:scale-95 cursor-pointer"
          >
            <Coins className="h-4 w-4 text-purple-400" />
            <span>Mes Tokens & Swap DEX</span>
          </TabsTrigger>

          {tradingMode === 'REAL' && (
            <TabsTrigger
              value="wallets"
              className="flex-1 min-w-[170px] sm:min-w-0 py-3 px-4 text-xs font-black uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600/35 data-[state=active]:to-purple-600/20 data-[state=active]:text-indigo-200 data-[state=active]:border data-[state=active]:border-indigo-400/50 data-[state=active]:shadow-[0_0_20px_rgba(99,102,241,0.35)] text-slate-300 hover:text-white flex items-center justify-center gap-2 snap-start active:scale-95 cursor-pointer"
            >
              <span className="text-sm">💳</span>
              <span>Flotte Multi-Wallets</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Manual Trading & Analysis */}
        <TabsContent value="manual" className="m-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <MarketRadarAndChart
                selectedPair={selectedPair}
                setSelectedPair={setSelectedPair}
                livePrices={livePrices}
                priceDirections={priceDirections}
                botLogs={botLogs}
                bots={bots}
              />
            </div>

            <div className="lg:col-span-5">
              <ManualOrderForm
                livePrices={livePrices}
                priceDirections={priceDirections}
                solanaBalance={solanaBalance}
                solanaPubKey={solanaPubKey}
                isSolanaWalletActive={isSolanaWalletActive}
                addBotLog={addBotLog}
                selectedPair={selectedPair}
                setSelectedPair={setSelectedPair}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Automatic Bots & Intelligence */}
        <TabsContent value="bots" className="m-0 focus-visible:outline-none space-y-6">
          <AutomatedPipelineFlowVisualizer />

          <MarketRadarAndChart
            selectedPair={selectedPair}
            setSelectedPair={setSelectedPair}
            livePrices={livePrices}
            priceDirections={priceDirections}
            botLogs={botLogs}
            bots={bots}
          />

          <TradingBotsManager
            solanaBalance={solanaBalance}
            setSolanaBalance={setSolanaBalance}
            isSolanaWalletActive={isSolanaWalletActive}
            addBotLog={addBotLog}
            handleToggleBot={handleToggleBot}
            handleDeleteBot={handleDeleteBot}
            livePrices={livePrices}
            subWallets={subWallets}
            handleDisperseSOL={handleDisperseSOL}
            isDispersing={isDispersing}
          />
        </TabsContent>

        {/* Tab 3: Wallet Tokens & Bulk Sell */}
        <TabsContent value="tokens" className="m-0 focus-visible:outline-none">
          <WalletTokenPortfolio
            solanaPubKey={solanaPubKey}
            solanaBalance={solanaBalance}
            evmBalance={evmBalance}
            walletChain={walletChain}
            onOpenSwap={handleOpenSwap}
          />
        </TabsContent>

        {/* Tab 4: Solana Multi-Wallets */}
        {tradingMode === 'REAL' && (
          <TabsContent value="wallets" className="m-0 focus-visible:outline-none">
            <MultiWalletsManager
              subWallets={subWallets}
              isSolanaWalletActive={isSolanaWalletActive}
              disperseAmount={disperseAmount}
              setDisperseAmount={setDisperseAmount}
              isDispersing={isDispersing}
              disperseTxHash={disperseTxHash}
              disperseError={disperseError}
              handleDisperseSOL={handleDisperseSOL}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Position Details Modal */}
      {selectedPosition && (
        <PositionDetailsModal
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
          livePrices={livePrices}
          handleClosePosition={handleClosePosition}
        />
      )}

      {/* DEX Swap Modal */}
      <DEXSwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        initialFromToken={swapFromToken}
        initialToToken={swapToToken}
      />
    </div>
  );
}

