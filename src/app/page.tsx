"use client";

import React, { useState, useEffect } from 'react';
import { 
  Activity,
  Zap,
  Bot,
  TrendingUp,
  ShieldAlert,
  Wallet,
  Sparkles,
  BarChart3,
  Globe,
  Layers,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingSimulation } from '@/hooks/useTradingSimulation';
import { useAppState } from '@/context/AppContext';
import ActivePositionsTable from '@/components/ActivePositionsTable';
import ManualOrderForm from '@/components/ManualOrderForm';
import TradingBotsManager from '@/components/TradingBotsManager';
import MultiWalletsManager from '@/components/MultiWalletsManager';
import PositionDetailsModal from '@/components/PositionDetailsModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const TVWidget = dynamic(
  () => import('@/components/TradingViewWidget').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#0d0914] rounded-2xl border border-white/5 p-6 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c2ff0c] border-t-transparent" />
        <span className="text-xs font-mono text-white/40">Chargement du graphique TradingView...</span>
      </div>
    ),
  }
);

const PRESET_PAIRS = [
  { id: 'FX:EURUSD', label: 'EUR/USD', icon: '🇪🇺' },
  { id: 'FX:GBPUSD', label: 'GBP/USD', icon: '🇬🇧' },
  { id: 'FX:USDJPY', label: 'USD/JPY', icon: '🇯🇵' },
  { id: 'SOL:PUMP', label: 'SOL/USD', icon: '☀️' },
  { id: 'CRYPTO:BTCUSD', label: 'BTC/USD', icon: '₿' }
];

export default function TradingTerminalPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'bots' | 'wallets'>('manual');
  const [isClient, setIsClient] = useState(false);
  const [mobileSubTab, setMobileSubTab] = useState<'trade' | 'chart'>('trade');

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
    selectedPair,
    setSelectedPair,
    addBotLog,
    handleToggleBot,
    handleDeleteBot,
    handleDisperseSOL,
    handleClosePosition
  } = useTradingSimulation();

  const { bots, setTradingMode } = useAppState();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c2ff0c] border-t-transparent shadow-lg shadow-[#c2ff0c]/20" />
          <span className="text-sm font-headline tracking-wide text-white/60 uppercase font-semibold">Initialisation du Terminal Pro...</span>
        </div>
      </div>
    );
  }

  const solPrice = livePrices['SOL'] || 140;
  const solToUsd = (sol: number) => sol * solPrice;
  const usdToHtg = (usd: number) => usd * 130;

  const runningSolBotsCapital = bots
    .filter(b => b.status === 'RUNNING' && (b.strategy === 'Pump.fun Sniper Bot' || b.pair?.startsWith('SOL:')))
    .reduce((sum, b) => sum + (b.capital || 0), 0);

  const activeSolPositionsCapital = activePositions
    .filter(p => p.pair?.startsWith('SOL:'))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalSniperAllocation = Math.max(runningSolBotsCapital, activeSolPositionsCapital);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-3 sm:p-4 md:p-6 text-white font-body" suppressHydrationWarning={true}>
      
      {/* Top Banner & Mode Control Header */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 glass-panel bg-[#120e1a]/80 border border-white/10 p-4 sm:p-5 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c2ff0c]/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Title & Status */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#c2ff0c]/20 to-purple-600/30 border border-[#c2ff0c]/30 flex items-center justify-center shadow-lg shadow-[#c2ff0c]/10 shrink-0">
            <Activity className="h-6 w-6 text-[#c2ff0c] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline text-white">
                Terminal Algotrade AI
              </h1>
              <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 text-[10px] font-extrabold uppercase px-2 py-0.5 font-headline">
                Pro v2.5
              </Badge>
            </div>
            <p className="text-xs text-white/50 font-body mt-0.5">
              Trading Quantitatif Multi-Marchés • Forex & Solana Memecoins 24/7
            </p>
          </div>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 z-10 flex-wrap">
          <div className="flex items-center bg-[#09070c] border border-white/10 p-1 rounded-xl gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTradingMode('DEMO');
                setActiveTab('manual');
              }}
              className={cn(
                "px-3.5 py-1.5 h-8 text-[11px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5 border-none",
                tradingMode === 'DEMO'
                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10 font-extrabold"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", tradingMode === 'DEMO' ? "bg-amber-400 animate-ping" : "bg-white/20")} />
              Mode Démo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTradingMode('REAL');
                setActiveTab('manual');
              }}
              className={cn(
                "px-3.5 py-1.5 h-8 text-[11px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5 border-none",
                tradingMode === 'REAL'
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-500/10 font-extrabold"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", tradingMode === 'REAL' ? "bg-purple-400 animate-ping" : "bg-white/20")} />
              Mode Réel (Solana)
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {tradingMode === 'DEMO' ? (
          <>
            <Card className="glass-panel bg-[#120e1a]/60 border-white/5 hover:border-amber-500/30 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-headline">Solde Démo (USD)</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-headline mt-1">
                {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[10px] text-white/30 font-body mt-1">Capital Virtuel de Test</div>
            </Card>

            <Card className="glass-panel bg-[#120e1a]/60 border-white/5 hover:border-emerald-500/30 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-headline">Equity Totale</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-headline mt-1">
                {equity.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[10px] text-emerald-400/60 font-body mt-1">Solde + PnL Latent</div>
            </Card>

            <Card className="glass-panel bg-[#120e1a]/60 border-white/5 hover:border-purple-500/30 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-headline">Marge Engagée</div>
              <div className="text-xl sm:text-2xl font-extrabold text-purple-300 font-headline mt-1">
                {activePositions.filter(p => !p.pair.startsWith('SOL:')).reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
              </div>
              <div className="text-[10px] text-white/30 font-body mt-1">Capital Mobilisé</div>
            </Card>

            <Card className="glass-panel bg-[#120e1a]/60 border-white/5 hover:border-cyan-500/30 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-headline">Positions Ouvertes</div>
              <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-headline mt-1">
                {activePositions.filter(p => !p.pair.startsWith('SOL:')).length}
              </div>
              <div className="text-[10px] text-cyan-400/60 font-body mt-1">Ordres en Cours</div>
            </Card>
          </>
        ) : (
          <>
            <Card className="glass-panel bg-[#120e1a]/60 border-purple-500/20 hover:border-purple-500/40 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300/70 font-headline flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                Solde Solana Réel
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-headline mt-1">
                {solanaBalance !== null ? `${solanaBalance.toFixed(3)} SOL` : '0.000 SOL'}
              </div>
              {solanaBalance !== null && (
                <div className="text-[10px] text-purple-300/80 font-body mt-1 font-semibold">
                  ≈ ${solToUsd(solanaBalance).toFixed(2)} USD / {usdToHtg(solToUsd(solanaBalance)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} HTG
                </div>
              )}
            </Card>

            <Card className="glass-panel bg-[#120e1a]/60 border-violet-500/20 hover:border-violet-500/40 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-300/70 font-headline">
                Allocations Sniper
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-violet-400 font-headline mt-1">
                {totalSniperAllocation.toFixed(2)} SOL
              </div>
              <div className="text-[10px] text-violet-300/80 font-body mt-1 font-semibold">
                ≈ ${solToUsd(totalSniperAllocation).toFixed(2)} USD / {usdToHtg(solToUsd(totalSniperAllocation)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} HTG
              </div>
            </Card>

            <Card className="glass-panel bg-[#120e1a]/60 border-cyan-500/20 hover:border-cyan-500/40 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/70 font-headline">
                Snipes Actifs
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-headline mt-1">
                {activePositions.filter(p => p.pair?.startsWith('SOL:')).length}
              </div>
              <div className="text-[10px] text-cyan-400/60 font-body mt-1">Positions Pump.fun</div>
            </Card>

            <Card className="glass-panel bg-[#120e1a]/60 border-white/5 hover:border-emerald-500/30 transition-all p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 font-headline flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Latence RPC Node
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-headline mt-1">
                {rpcLatency !== null ? `${rpcLatency} ms` : '12 ms'}
              </div>
              <div className="text-[10px] text-white/40 font-mono mt-1">
                Block: {nodeBlockHeight ? nodeBlockHeight.toLocaleString() : '312,450,192'}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Main Trading Workspace Grid (Control Center + TradingView Chart) */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full space-y-4">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#120e1a]/80 border border-white/10 p-1.5 rounded-2xl">
          <TabsList className="flex bg-[#09070c] border border-white/10 p-1 rounded-xl gap-1 h-auto w-full sm:w-auto">
            <TabsTrigger
              value="manual"
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-[#c2ff0c]/15 data-[state=active]:text-[#c2ff0c] data-[state=active]:border data-[state=active]:border-[#c2ff0c]/30 text-white/50 hover:text-white"
            >
              <Zap className="inline-block h-3.5 w-3.5 mr-1.5" />
              Trading Manuel
            </TabsTrigger>
            <TabsTrigger
              value="bots"
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-[#c2ff0c]/15 data-[state=active]:text-[#c2ff0c] data-[state=active]:border data-[state=active]:border-[#c2ff0c]/30 text-white/50 hover:text-white"
            >
              <Bot className="inline-block h-3.5 w-3.5 mr-1.5" />
              Robots d'IA
            </TabsTrigger>
            {tradingMode === 'REAL' && (
              <TabsTrigger
                value="wallets"
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 font-headline data-[state=active]:bg-[#c2ff0c]/15 data-[state=active]:text-[#c2ff0c] data-[state=active]:border data-[state=active]:border-[#c2ff0c]/30 text-white/50 hover:text-white"
              >
                <Wallet className="inline-block h-3.5 w-3.5 mr-1.5" />
                Sous-Portefeuilles
              </TabsTrigger>
            )}
          </TabsList>

          {/* Quick Pair Picker Bar */}
          <div className="hidden xl:flex items-center gap-1.5 px-2">
            <span className="text-[10px] uppercase font-headline text-white/40 font-bold mr-1">Direct Pair:</span>
            {PRESET_PAIRS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPair(p.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border",
                  selectedPair === p.id
                    ? "bg-[#c2ff0c]/20 text-[#c2ff0c] border-[#c2ff0c]/40 font-bold"
                    : "bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white"
                )}
              >
                <span className="mr-1">{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Mobile Sub-Navigation Toggle */}
          <div className="flex lg:hidden bg-[#09070c] border border-white/10 p-1 rounded-xl w-full gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMobileSubTab('trade')}
              className={cn(
                "flex-1 h-8 rounded-lg text-[11px] font-bold font-headline uppercase border-none",
                mobileSubTab === 'trade'
                  ? "bg-[#c2ff0c]/20 text-[#c2ff0c] font-extrabold"
                  : "text-white/40 hover:text-white"
              )}
            >
              ⚙️ Exécution & Bots
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMobileSubTab('chart')}
              className={cn(
                "flex-1 h-8 rounded-lg text-[11px] font-bold font-headline uppercase border-none",
                mobileSubTab === 'chart'
                  ? "bg-[#c2ff0c]/20 text-[#c2ff0c] font-extrabold"
                  : "text-white/40 hover:text-white"
              )}
            >
              📊 Graphique Live
            </Button>
          </div>
        </div>

        {/* Workspace Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Panel: Control Center & Order Execution */}
          <div className={cn("lg:col-span-5 w-full space-y-4", mobileSubTab !== 'trade' && "hidden lg:block")}>
            <TabsContent value="manual" className="m-0 focus-visible:outline-none">
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

            <TabsContent value="bots" className="m-0 focus-visible:outline-none">
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
          </div>

          {/* Right Panel: TradingView Live Interactive Chart */}
          <Card className={cn(
            "lg:col-span-7 glass-panel bg-[#0d0914]/90 border-white/10 shadow-2xl h-[560px] flex flex-col overflow-hidden w-full relative rounded-2xl",
            mobileSubTab !== 'chart' && "hidden lg:flex"
          )}>
            {/* Chart Header Bar */}
            <div className="p-3 bg-[#120e1a] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#c2ff0c]" />
                <span className="text-xs font-bold font-headline text-white tracking-wide uppercase">
                  Graphique Professionnel en Temps Réel ({selectedPair.replace('FX:', '').replace('CRYPTO:', '').replace('SOL:PUMP', 'SOL/USD')})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                  ● FLUX EN DIRECT
                </Badge>
              </div>
            </div>

            {/* TradingView Container */}
            <div className="p-0 flex-grow relative w-full h-full">
              {isClient && (
                <TVWidget 
                  symbol={selectedPair} 
                  interval="15" 
                  indicators={["RSI", "SMA"]}
                />
              )}
            </div>
          </Card>
        </div>
      </Tabs>

      {/* SECTION B: ACTIVE POSITIONS & ORDERS TABLE (PLACED NATURALLY AT THE BOTTOM) */}
      <div className="pt-2">
        <ActivePositionsTable
          livePrices={livePrices}
          setSelectedPosition={setSelectedPosition}
          handleClosePosition={handleClosePosition}
        />
      </div>

      {/* Position Details Modal Overlay */}
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
