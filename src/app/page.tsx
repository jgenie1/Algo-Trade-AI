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
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-headline text-white">
            Terminal de Trading Algorithmique
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium mt-1 font-body">
            Gérez vos ordres manuellement, lancez vos robots ou convertissez vos tokens en USD en bloc.
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
        <TabsList className="flex w-full bg-[#120a1c]/90 border border-white/15 p-1.5 rounded-2xl gap-2 h-auto mb-6 overflow-x-auto no-scrollbar scrollbar-none snap-x whitespace-nowrap backdrop-blur-xl shadow-lg">
          <TabsTrigger
            value="manual"
            className="flex-1 min-w-[150px] sm:min-w-0 py-2.5 px-3 text-[11px] sm:text-xs font-extrabold uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-amber-500/25 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-500/40 data-[state=active]:shadow-[0_0_12px_rgba(245,158,11,0.2)] text-slate-300 hover:text-white snap-start active:scale-95 cursor-pointer"
          >
            <Zap className="inline-block h-3.5 w-3.5 mr-1.5 text-amber-400" />
            Trading Manuel & Analyse
          </TabsTrigger>

          <TabsTrigger
            value="bots"
            className="flex-1 min-w-[160px] sm:min-w-0 py-2.5 px-3 text-[11px] sm:text-xs font-extrabold uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-[#c2ff0c]/20 data-[state=active]:text-[#c2ff0c] data-[state=active]:border data-[state=active]:border-[#c2ff0c]/40 data-[state=active]:shadow-[0_0_12px_rgba(194,255,12,0.2)] text-slate-300 hover:text-white snap-start active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Bot className="inline-block h-3.5 w-3.5 text-[#c2ff0c]" />
            <span>Bots IA & Intelligence</span>
            {(bots || []).filter(b => b.status === 'RUNNING').length > 0 && (
              <span className="bg-[#c2ff0c] text-black font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(194,255,12,0.8)] leading-none ml-1">
                {(bots || []).filter(b => b.status === 'RUNNING').length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="tokens"
            className="flex-1 min-w-[150px] sm:min-w-0 py-2.5 px-3 text-[11px] sm:text-xs font-extrabold uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-200 data-[state=active]:border data-[state=active]:border-purple-500/40 data-[state=active]:shadow-[0_0_12px_rgba(168,85,247,0.3)] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 snap-start active:scale-95 cursor-pointer"
          >
            <Coins className="inline-block h-3.5 w-3.5 text-purple-400" />
            <span>Mes Tokens & Vente</span>
          </TabsTrigger>

          {tradingMode === 'REAL' && (
            <TabsTrigger
              value="wallets"
              className="flex-1 min-w-[150px] sm:min-w-0 py-2.5 px-3 text-[11px] sm:text-xs font-extrabold uppercase rounded-xl transition-all duration-300 font-headline data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-200 data-[state=active]:border data-[state=active]:border-purple-500/40 data-[state=active]:shadow-[0_0_12px_rgba(168,85,247,0.3)] text-slate-300 hover:text-white flex items-center justify-center gap-1.5 snap-start active:scale-95 cursor-pointer"
            >
              <span className="text-xs">💳</span>
              <span>Multi-Wallets SOL</span>
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

