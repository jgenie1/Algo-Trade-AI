"use client";

import React, { useState } from 'react';
import { 
  Activity,
  Zap,
  Bot
} from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { useTradingSimulation } from '@/hooks/useTradingSimulation';
import { useAppState } from '@/context/AppContext';
import ActivePositionsTable from '@/components/ActivePositionsTable';
import ManualOrderForm from '@/components/ManualOrderForm';
import TradingBotsManager from '@/components/TradingBotsManager';
import MultiWalletsManager from '@/components/MultiWalletsManager';
import PositionDetailsModal from '@/components/PositionDetailsModal';
import MarketRadarAndChart from '@/components/MarketRadarAndChart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function TradingTerminalPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'bots' | 'wallets'>('manual');
  
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
    nodeBlockHeight,
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
    handleClosePosition
  } = useTradingSimulation();

  const { setTradingMode, reserveVault } = useAppState();

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
          <span className="text-sm text-white/50 font-body">Chargement du terminal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 text-white px-1 sm:px-2" suppressHydrationWarning>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-headline text-white">Terminal de Trading Algorithmique</h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium mt-1 font-body">Gérez vos ordres manuellement ou lancez vos robots de trading en démo ou en réel on-chain.</p>
        </div>
      </div>

      {/* Full-width Stats & Mode Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#140f1d] border border-white/15 rounded-2xl p-5 w-full shadow-2xl">
        {/* Mode Toggle Switch (Demo vs Real) */}
        <div className="flex items-center bg-black/40 border border-white/15 p-1.5 rounded-xl gap-1 shrink-0">
          <Button
            variant="ghost"
            onClick={() => {
              setTradingMode('DEMO');
              setActiveTab('manual');
            }}
            className={cn(
              "px-4 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-2 border-none",
              tradingMode === 'DEMO'
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
              setActiveTab('manual');
            }}
            className={cn(
              "px-4 py-2 h-auto text-xs font-extrabold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-2 border-none",
              tradingMode === 'REAL'
                ? "bg-purple-600/35 text-purple-200 border border-purple-500/30 shadow-md shadow-purple-500/10 font-black"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            Mode Réel (Solana)
          </Button>
        </div>

        {/* Portfolio Stats Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-4 lg:gap-8 flex-1 justify-end">
          {tradingMode === 'DEMO' ? (
            <>
              <div className="px-4 border-r border-white/10">
                <div className="text-xs uppercase font-extrabold text-slate-300 font-headline tracking-wide">Solde Démo</div>
                <div className="text-xl font-extrabold text-amber-400 font-body mt-0.5">{balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $</div>
              </div>
              <div className="px-4 border-r border-white/10">
                <div className="text-xs uppercase font-extrabold text-[#c2ff0c] font-headline flex items-center gap-1 tracking-wide">
                  🔒 Coffre-Fort (10%)
                </div>
                <div className="text-xl font-extrabold text-[#c2ff0c] font-body mt-0.5">${(Number(reserveVault) || 0).toFixed(2)}</div>
              </div>
              <div className="px-4 border-r border-white/10">
                <div className="text-xs uppercase font-extrabold text-slate-300 font-headline tracking-wide">Equity</div>
                <div className="text-xl font-extrabold text-white font-body mt-0.5">{equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $</div>
              </div>
              <div className="px-4">
                <div className="text-xs uppercase font-extrabold text-slate-300 font-headline tracking-wide">Trades</div>
                <div className="text-xl font-extrabold text-cyan-400 font-body mt-0.5">{activePositions.filter(p => !p.pair.startsWith('SOL:')).length}</div>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 border-r border-white/10 flex flex-col justify-center">
                <div className="text-xs uppercase font-extrabold text-purple-300 font-headline flex items-center gap-1 tracking-wide">
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse inline-block" />
                  Solde Réel (SOL / USD / HTG)
                </div>
                <div className="text-xl font-extrabold text-purple-200 font-body mt-0.5 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span>{solanaBalance !== null ? `${solanaBalance.toFixed(3)} SOL` : '0.000 SOL'}</span>
                    {solanaPubKey && (
                      <span className="text-xs text-slate-300 font-mono">({solanaPubKey.slice(0, 4)}...{solanaPubKey.slice(-4)})</span>
                    )}
                  </div>
                  {solanaBalance !== null && (
                    <span className="text-xs text-emerald-400 font-mono font-bold">
                      {formatSolToUsdAndHtg(solanaBalance).combinedLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-4 border-r border-white/10">
                <div className="text-xs uppercase font-extrabold text-slate-300 font-headline tracking-wide">Allocations Sniper (Réel)</div>
                <div className="text-xl font-extrabold text-violet-300 font-body mt-0.5">
                  {activePositions.filter(p => (p.mode || 'DEMO') === 'REAL').reduce((sum, p) => sum + p.amount, 0).toFixed(2)} SOL
                </div>
                <span className="text-xs text-slate-300 font-mono block">
                  {formatSolToUsdAndHtg(activePositions.filter(p => (p.mode || 'DEMO') === 'REAL').reduce((sum, p) => sum + p.amount, 0)).combinedLabel}
                </span>
              </div>
              <div className="px-4 border-r border-white/10">
                <div className="text-xs uppercase font-extrabold text-slate-300 font-headline tracking-wide">Snipes Actifs</div>
                <div className="text-xl font-extrabold text-cyan-400 font-body mt-0.5">{activePositions.filter(p => (p.mode || 'DEMO') === 'REAL').length}</div>
              </div>
              {rpcLatency !== null && nodeBlockHeight !== null && (
                <div className="px-4 flex flex-col justify-center">
                  <div className="text-xs uppercase font-extrabold text-cyan-400 font-headline flex items-center gap-1 tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
                    Chainstack Latency
                  </div>
                  <div className="text-xl font-extrabold text-cyan-300 font-body mt-0.5 flex items-center gap-2">
                    <span>{rpcLatency} ms</span>
                    <span className="text-xs text-slate-300 font-mono">(Block: {nodeBlockHeight.toLocaleString()})</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SECTION A: ACTIVE POSITIONS (FULL WIDTH) */}
      <ActivePositionsTable
        livePrices={livePrices}
        setSelectedPosition={setSelectedPosition}
        handleClosePosition={handleClosePosition}
      />

      {/* Main Tabs Layout */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <TabsList className="flex w-full bg-white/5 border border-white/10 p-1 rounded-xl gap-1 h-auto mb-6">
          <TabsTrigger
            value="manual"
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 hover:text-white"
          >
            <Zap className="inline-block h-3.5 w-3.5 mr-1" />
            Trading Manuel
          </TabsTrigger>
          <TabsTrigger
            value="bots"
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 hover:text-white"
          >
            <Bot className="inline-block h-3.5 w-3.5 mr-1" />
            Bots Automatiques
          </TabsTrigger>
          {tradingMode === 'REAL' && (
            <TabsTrigger
              value="wallets"
              className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 hover:text-white flex items-center justify-center gap-1"
            >
              <span className="text-xs">💳</span>
              Multi-Wallets
            </TabsTrigger>
          )}
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <TabsContent value="manual" className="m-0">
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
            </TabsContent>

            <TabsContent value="bots" className="m-0">
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

            {tradingMode === 'REAL' && (
              <TabsContent value="wallets" className="m-0">
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
          </div>

          {/* Right Column: Multi-Asset Radar & Interactive Pro Chart */}
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
        </div>
      </Tabs>

      {/* Position Details Modal overlay */}
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
