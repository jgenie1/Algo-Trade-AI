"use client";

import React, { useState, useEffect } from 'react';
import { Zap, Bot } from 'lucide-react';
import { useTradingSimulation } from '@/hooks/useTradingSimulation';
import { useAppState } from '@/context/AppContext';
import ActivePositionsTable from '@/components/ActivePositionsTable';
import ManualOrderForm from '@/components/ManualOrderForm';
import TradingBotsManager from '@/components/TradingBotsManager';
import MultiWalletsManager from '@/components/MultiWalletsManager';
import PositionDetailsModal from '@/components/PositionDetailsModal';
import MarketRadarAndChart from '@/components/MarketRadarAndChart';
import PortfolioStatsHeader from '@/components/PortfolioStatsHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function TradingTerminalPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'bots' | 'wallets'>('manual');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
  } = useTradingSimulation();

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
            Gérez vos ordres manuellement ou lancez vos robots de trading en démo ou en réel.
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
        <TabsList className="flex w-full bg-black/40 border border-white/15 p-1.5 rounded-xl gap-2 h-auto mb-6">
          <TabsTrigger
            value="manual"
            className="flex-1 py-2.5 text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-amber-500/25 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-500/30 text-slate-300 hover:text-white"
          >
            <Zap className="inline-block h-4 w-4 mr-1.5 text-amber-400" />
            Trading Manuel & Analyse
          </TabsTrigger>

          <TabsTrigger
            value="bots"
            className="flex-1 py-2.5 text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-[#c2ff0c]/20 data-[state=active]:text-[#c2ff0c] data-[state=active]:border data-[state=active]:border-[#c2ff0c]/30 text-slate-300 hover:text-white"
          >
            <Bot className="inline-block h-4 w-4 mr-1.5 text-[#c2ff0c]" />
            Bots Automatiques & Intelligence
          </TabsTrigger>

          {tradingMode === 'REAL' && (
            <TabsTrigger
              value="wallets"
              className="flex-1 py-2.5 text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-200 data-[state=active]:border data-[state=active]:border-purple-500/30 text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
            >
              <span className="text-sm">💳</span>
              Multi-Wallets Solana
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
          />
        </TabsContent>

        {/* Tab 3: Solana Multi-Wallets */}
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
    </div>
  );
}
