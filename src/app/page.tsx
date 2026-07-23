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
  CheckCircle2,
  Terminal,
  Cpu,
  RefreshCw,
  Search,
  Sliders,
  Check,
  Coins
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

const SCAN_RADAR_PAIRS = [
  { symbol: 'EUR/USD', pair: 'FX:EURUSD', rsi: 44.2, trend: 'HAUSSIER', signal: 'ACHAT', score: 84 },
  { symbol: 'GBP/USD', pair: 'FX:GBPUSD', rsi: 58.1, trend: 'HAUSSIER', signal: 'ACHAT', score: 79 },
  { symbol: 'USD/JPY', pair: 'FX:USDJPY', rsi: 67.4, trend: 'SURACHAT', signal: 'VENTE', score: 88 },
  { symbol: 'AUD/USD', pair: 'FX:AUDUSD', rsi: 31.8, trend: 'SURVENTE', signal: 'ACHAT', score: 92 },
  { symbol: 'GOLD/USD', pair: 'GOLD', rsi: 49.5, trend: 'NEUTRE', signal: 'ATTENTE', score: 55 },
  { symbol: 'BTC/USD', pair: 'BTC', rsi: 61.2, trend: 'HAUSSIER', signal: 'ACHAT', score: 86 }
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

  const { bots, botLogs, setTradingMode } = useAppState();

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
              Trading Quantitatif Multi-Marchés • Scan 24/7 & Consensus IA
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

      {/* Main Trading Workspace Grid (Control Center + Dynamic Powerful Panel) */}
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

          {/* Quick Pair Picker Bar (visible when in manual tab) */}
          {activeTab === 'manual' && (
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
          )}

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
              {activeTab === 'bots' ? '⚡ Moniteur IA' : activeTab === 'wallets' ? '💳 Multi-Wallets' : '📊 Graphique Live'}
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

          {/* Right Panel: DYNAMIC HIGH-POWER WORKSPACE PANEL */}
          <div className={cn("lg:col-span-7 w-full", mobileSubTab !== 'chart' && "hidden lg:block")}>
            
            {/* TAB 1: TRADING MANUEL -> TRADINGVIEW CHART & SENTIMENT */}
            {activeTab === 'manual' && (
              <Card className="glass-panel bg-[#0d0914]/90 border-white/10 shadow-2xl h-[560px] flex flex-col overflow-hidden w-full relative rounded-2xl">
                <div className="p-3 bg-[#120e1a] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#c2ff0c]" />
                    <span className="text-xs font-bold font-headline text-white tracking-wide uppercase">
                      Graphique HD ({selectedPair.replace('FX:', '').replace('CRYPTO:', '').replace('SOL:PUMP', 'SOL/USD')})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono">
                      ● FLUX LIVE
                    </Badge>
                  </div>
                </div>
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
            )}

            {/* TAB 2: ROBOTS D'IA -> RADAR IA MULTI-PAIRES & CONSOLE QUANTITATIVE EN DIRECT */}
            {activeTab === 'bots' && (
              <div className="flex flex-col gap-4 h-[560px] overflow-hidden">
                {/* AI Multi-Pair Radar Heatmap */}
                <Card className="glass-panel bg-[#0d0914]/90 border-white/10 p-4 rounded-2xl shrink-0">
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-[#c2ff0c]" />
                      <h3 className="text-xs font-bold font-headline uppercase text-white tracking-wider">
                        Radar Quantitatif IA & Scanner Multi-Paires 24/7
                      </h3>
                    </div>
                    <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 text-[10px]">
                      {bots.filter(b => b.status === 'RUNNING').length} Bots Actifs
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {SCAN_RADAR_PAIRS.map((item) => (
                      <div key={item.symbol} className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex flex-col justify-between hover:border-[#c2ff0c]/30 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-white">{item.symbol}</span>
                          <Badge className={cn(
                            "text-[9px] font-extrabold px-1.5 py-0.5",
                            item.signal === 'ACHAT' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            item.signal === 'VENTE' ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                            "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          )}>
                            {item.signal} ({item.score}%)
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-white/50 font-mono">
                          <span>RSI: {item.rsi}</span>
                          <span className={item.trend.includes('HAUSSIER') ? 'text-emerald-400' : item.trend.includes('SURVENTE') ? 'text-cyan-400' : 'text-rose-400'}>
                            {item.trend}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Real-time AI Decision Stream Console */}
                <Card className="glass-panel bg-[#0d0914]/90 border-white/10 p-4 rounded-2xl flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-purple-400" />
                      <h3 className="text-xs font-bold font-headline uppercase text-white tracking-wider">
                        Flux de Décisions Quantitatives des Robots en Temps Réel
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-white/40">Mises à jour instantanées</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs pr-1">
                    {botLogs && botLogs.length > 0 ? (
                      botLogs.slice(0, 15).map((log, idx) => (
                        <div key={log.id || idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5 hover:bg-white/10 transition-colors">
                          <span className={cn(
                            "h-2 w-2 rounded-full mt-1 shrink-0",
                            log.type === 'error' ? 'bg-rose-400' :
                            log.type === 'warning' ? 'bg-amber-400' :
                            'bg-[#c2ff0c]'
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white text-[11px]">{log.botStrategy || 'Robot'}</span>
                              <span className="text-[9px] text-white/30">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-[11px] text-white/70 mt-0.5 break-words font-body">{log.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl">
                        <Bot className="h-8 w-8 text-white/20 mb-2 animate-bounce" />
                        <p className="text-xs text-white/40 font-body">
                          Aucun log pour le moment. Lancez un robot dans le panneau de gauche pour voir les signaux IA s'afficher en direct !
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 3: MULTI-WALLETS -> SOLANA INFRASTRUCTURE & DISPERSER ANALYTICS */}
            {activeTab === 'wallets' && tradingMode === 'REAL' && (
              <Card className="glass-panel bg-[#0d0914]/90 border-white/10 p-5 rounded-2xl h-[560px] flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-purple-400" />
                      <h3 className="text-sm font-bold font-headline uppercase text-white tracking-wider">
                        Distribution & Moniteur On-Chain Solana
                      </h3>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      5 Sous-Portefeuilles Dédiés
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-purple-300 font-headline uppercase block">Frais de Gaz Prioritaires (Priority Fee)</span>
                        <span className="text-[11px] text-white/60 font-body">Optimisé pour passer avant les bots adverses sur Pump.fun</span>
                      </div>
                      <Badge className="bg-purple-600 text-white font-mono text-xs px-2.5 py-1">0.005 SOL</Badge>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-headline font-bold text-white">
                        <span>Solana Mainnet RPC Node</span>
                        <span className="text-emerald-400 font-mono">Chainstack Dedicated (12 ms)</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[95%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-[#c2ff0c]/10 border border-white/10 mt-4">
                  <h4 className="text-xs font-bold font-headline text-white uppercase mb-1">💡 À quoi sert la dispersion multi-portefeuilles ?</h4>
                  <p className="text-[11px] text-white/70 font-body leading-relaxed">
                    La dispersion permet de répartir vos achats sur plusieurs sous-portefeuilles Solana indépendants pour générer du volume de trading artificiel et camoufler l'activité de votre bot principal.
                  </p>
                </div>
              </Card>
            )}

          </div>
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
