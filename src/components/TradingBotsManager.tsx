"use client";

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  Trash2, 
  History 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const currencyPairs = [
  { value: 'ALL_FOREX', label: '🌍 Tout le Forex (Scan Multi-Paires)' },
  { value: 'FX:EURUSD', label: 'EUR/USD' },
  { value: 'FX:GBPUSD', label: 'GBP/USD' },
  { value: 'FX:USDJPY', label: 'USD/JPY' },
  { value: 'FX:AUDUSD', label: 'AUD/USD' },
  { value: 'FX:USDCAD', label: 'USD/CAD' },
  { value: 'FX:USDCHF', label: 'USD/CHF' },
  { value: 'BNB', label: 'BNB/USD' },
  { value: 'BTC', label: 'BTC/USD' },
  { value: 'ETH', label: 'ETH/USD' },
  { value: 'LINK', label: 'LINK/USD' },
  { value: 'GOLD', label: 'GOLD/USD' },
];

const timeframes = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 heure' },
  { value: 'D', label: '1 jour' },
];

interface TradingBotsManagerProps {
  solanaBalance: number | null;
  setSolanaBalance: React.Dispatch<React.SetStateAction<number | null>>;
  isSolanaWalletActive: boolean;
  addBotLog: (botId: string, botName: string, message: string, type: 'info' | 'trade' | 'error') => void;
  handleToggleBot: (botId: string) => void;
  handleDeleteBot: (botId: string) => void;
  livePrices: { [key: string]: number };
}

export default function TradingBotsManager({
  solanaBalance,
  setSolanaBalance,
  isSolanaWalletActive,
  addBotLog,
  handleToggleBot,
  handleDeleteBot,
  livePrices
}: TradingBotsManagerProps) {
  const { 
    tradingMode, 
    balance, 
    setBalance, 
    bots, 
    setBots, 
    botLogs, 
    botLearnings, 
    setBotLearnings, 
    closedPositions, 
    isLoading 
  } = useAppState();

  // New Bot Form State
  const [botPair, setBotPair] = useState<string>('ALL_FOREX');
  const [botStrategy, setBotStrategy] = useState<'RSI Pullback' | 'EMA Cross' | 'BB Mean Reversion' | 'AI Autopilot (Machine à Cash)' | 'Pump.fun Sniper Bot'>('AI Autopilot (Machine à Cash)');
  const [botTimeframe, setBotTimeframe] = useState<string>('15');
  const [botCapital, setBotCapital] = useState<number>(1000);
  const [botRiskProfile, setBotRiskProfile] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE');
  const [pumpSniperMode, setPumpSniperMode] = useState<'PRECOCE' | 'MOMENTUM' | 'RAYDIUM'>('PRECOCE');
  const [priorityFee, setPriorityFee] = useState<number>(0.005);
  const [autoVolume, setAutoVolume] = useState<boolean>(false);
  const [botCustomRules, setBotCustomRules] = useState<string>('');

  // Reset strategy selection on mode change to align state with visible options
  useEffect(() => {
    if (tradingMode === 'REAL') {
      setBotStrategy('Pump.fun Sniper Bot');
    } else {
      setBotStrategy('AI Autopilot (Machine à Cash)');
    }
  }, [tradingMode]);

  const handleStartBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (botCapital <= 0) {
      alert("Le capital du bot doit être supérieur à 0.");
      return;
    }

    if (tradingMode === 'REAL') {
      if (solanaBalance === null || botCapital > solanaBalance) {
        alert(`Solde SOL insuffisant. Requis: ${botCapital} SOL, Disponible: ${solanaBalance?.toFixed(3)} SOL`);
        return;
      }
    } else {
      if (botCapital > balance) {
        alert(`Capital insuffisant. Requis: ${botCapital} $, Solde disponible: ${balance.toFixed(2)} $`);
        return;
      }
    }

    const newBot = {
      id: 'bot_' + Math.random().toString(36).substring(2, 9),
      pair: botStrategy === 'AI Autopilot (Machine à Cash)' 
        ? 'ALL' 
        : botStrategy === 'Pump.fun Sniper Bot'
          ? 'SOLANA'
          : botPair,
      strategy: botStrategy,
      timeframe: botStrategy === 'Pump.fun Sniper Bot' ? '0' : botTimeframe,
      capital: botCapital,
      status: 'RUNNING',
      createdAt: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      consecutiveLosses: 0,
      netProfit: 0,
      selectivityMultiplier: 1.0,
      riskProfile: botStrategy === 'AI Autopilot (Machine à Cash)' ? botRiskProfile : undefined,
      pumpMode: botStrategy === 'Pump.fun Sniper Bot' ? pumpSniperMode : undefined,
      priorityFee: botStrategy === 'Pump.fun Sniper Bot' ? priorityFee : undefined,
      autoVolume: botStrategy === 'Pump.fun Sniper Bot' ? autoVolume : undefined,
      mode: tradingMode,
      customRules: botCustomRules || undefined
    };

    setBots(prev => {
      if (prev.some(x => x.id === newBot.id)) return prev;
      return [...prev, newBot];
    });

    setBotCustomRules('');

    if (tradingMode === 'REAL') {
      setSolanaBalance(bal => bal !== null ? bal - botCapital : null);
      addBotLog(newBot.id, newBot.strategy, `Sniper Bot Solana démarré en réel avec ${newBot.capital} SOL de capital allocation.`, 'info');
    } else {
      setBalance(bal => bal - botCapital);
      const logPair = newBot.pair === 'ALL' ? 'Scan Global' : newBot.pair.replace('FX:', '').replace('-USD', '').replace('=', '');
      addBotLog(newBot.id, newBot.strategy, `Bot démarré sur ${logPair} (${newBot.timeframe}m) avec ${newBot.capital} $ de capital.`, 'info');
    }
  };

  const filteredBots = bots.filter(b => 
    b.mode === tradingMode || 
    (b.mode === undefined && (tradingMode === 'REAL' ? b.strategy === 'Pump.fun Sniper Bot' : b.strategy !== 'Pump.fun Sniper Bot'))
  );

  const filteredClosed = closedPositions.filter(h => 
    tradingMode === 'REAL' ? h.pair?.startsWith('SOL:') : !h.pair?.startsWith('SOL:')
  );

  return (
    <div className="space-y-6">
      {/* Bot Configuration Form */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-5 shadow-xl">
        <CardHeader className="p-0">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Sélectionner une Stratégie</label>
            <Select
              value={botStrategy}
              onValueChange={(val) => setBotStrategy(val as any)}
            >
              <SelectTrigger className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body">
                <SelectValue placeholder="Choisir une stratégie" />
              </SelectTrigger>
              <SelectContent className="bg-[#14101a] border-white/10 text-white">
                <SelectItem value="AI Autopilot (Machine à Cash)" className="focus:bg-white/10 focus:text-white cursor-pointer">
                  🤖 IA Autopilot (Machine à Cash)
                </SelectItem>
                <SelectItem value="Pump.fun Sniper Bot" className="focus:bg-white/10 focus:text-white cursor-pointer">
                  🎯 Pump.fun Sniper Bot (Solana)
                </SelectItem>
                <SelectItem value="RSI Pullback" className="focus:bg-white/10 focus:text-white cursor-pointer">
                  📈 RSI Pullback Reversal
                </SelectItem>
                <SelectItem value="EMA Cross" className="focus:bg-white/10 focus:text-white cursor-pointer">
                  📉 EMA Golden Cross Trend
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3">
            {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
                  <span className="text-[#c2ff0c]">🤖</span> Autopilote Quantitatif IA
                </CardTitle>
                <p className="text-[11px] text-white/40 font-body leading-relaxed">
                  L'IA analyse le marché Forex & Crypto en temps réel pour ouvrir et gérer des positions optimales de manière 100% autonome.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
                  <span className="text-purple-400">🎯</span> Pump.fun Solana Sniper
                </CardTitle>
                <p className="text-[11px] text-white/40 font-body leading-relaxed">
                  Scanne le Launchpad Solana en temps réel. Achète les nouveaux jetons de bonding curve ayant un momentum social exceptionnel et encaisse les profits rapidement.
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <form onSubmit={handleStartBot} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Recherche Multi-Actifs</label>
            {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
              <div className="w-full h-11 bg-white/5 border border-[#c2ff0c]/20 rounded-xl px-3 flex items-center text-xs text-[#c2ff0c] font-body font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2ff0c] animate-pulse mr-2" />
                Tous les Actifs (Scan Global Continu)
              </div>
            ) : (
              <div className="w-full h-11 bg-purple-950/20 border border-purple-500/30 rounded-xl px-3 flex items-center text-xs text-purple-400 font-body font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse mr-2" />
                Solana Meme Coins Launchpad Stream (Pump.fun)
              </div>
            )}
          </div>

          {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
            <>
              {/* Risk Profile Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Profil de Risque & Levier</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const).map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant="ghost"
                      onClick={() => setBotRiskProfile(r)}
                      className={cn(
                        "h-auto p-2.5 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                        botRiskProfile === r
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="text-xs font-bold font-headline uppercase">
                        {r === 'CONSERVATIVE' ? 'Sûr' : r === 'AGGRESSIVE' ? 'Risque' : 'Modéré'}
                      </span>
                      <span className="text-[8px] font-body block opacity-80">
                        {r === 'CONSERVATIVE' ? 'Score >85% • 5x' : r === 'AGGRESSIVE' ? 'Score >65% • 20x' : 'Score >75% • 10x'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timeframe */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Unité de Temps de Recherche</label>
                <Select value={botTimeframe} onValueChange={setBotTimeframe}>
                  <SelectTrigger className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-body focus:ring-[#c2ff0c]">
                    <SelectValue placeholder="Choisir une unité" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14101a] border-white/10 text-white">
                    {timeframes.map(t => (
                      <SelectItem key={t.value} value={t.value} className="focus:bg-white/10 focus:text-white cursor-pointer">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Rules */}
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Consignes de Vibe-Trading Personnalisées (Optionnel)</label>
                  <Badge className="text-[8px] bg-[#c2ff0c]/15 text-[#c2ff0c] font-bold tracking-wider font-headline uppercase border-none">
                    Consensus IA Personnalisé
                  </Badge>
                </div>
                <textarea
                  value={botCustomRules}
                  onChange={(e) => setBotCustomRules(e.target.value)}
                  placeholder="Ex: Acheter uniquement si RSI < 35 et EMA haussière, ou s'il y a du volume..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:ring-[#c2ff0c] focus:outline-none text-white font-body placeholder:text-white/20 resize-none"
                />
              </div>
            </>
          ) : (
            <>
              {/* Pump.fun Sniper Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Stratégie de Sniping Solana</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRECOCE', 'MOMENTUM', 'RAYDIUM'] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant="ghost"
                      onClick={() => setPumpSniperMode(m)}
                      className={cn(
                        "h-auto p-2 py-3 rounded-xl border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1",
                        pumpSniperMode === m
                          ? "bg-purple-600/15 border-purple-500/50 text-purple-300 hover:bg-purple-600/25"
                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="text-[10px] font-bold font-headline uppercase">
                        {m === 'PRECOCE' ? 'Ultra-Précoce' : m === 'MOMENTUM' ? 'Momentum' : 'Raydium Proche'}
                      </span>
                      <span className="text-[8px] font-body block opacity-80 leading-tight">
                        {m === 'PRECOCE' ? 'Curve <8%' : m === 'MOMENTUM' ? 'Réponses >10' : 'Curve >75%'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Solana Gas Priority Fee */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Frais de Priorité Solana (Priority Fee)</label>
                  <span className="text-xs font-bold text-purple-400 font-body">{priorityFee} SOL</span>
                </div>
                <Select value={priorityFee.toString()} onValueChange={(val) => setPriorityFee(parseFloat(val))}>
                  <SelectTrigger className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white font-body focus:ring-[#c2ff0c]">
                    <SelectValue placeholder="Choisir les frais" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14101a] border-white/10 text-white">
                    <SelectItem value="0.001" className="focus:bg-white/10 focus:text-white cursor-pointer">0.001 SOL (Normal - Économique)</SelectItem>
                    <SelectItem value="0.005" className="focus:bg-white/10 focus:text-white cursor-pointer">0.005 SOL (Rapide - Standard)</SelectItem>
                    <SelectItem value="0.015" className="focus:bg-white/10 focus:text-white cursor-pointer">0.015 SOL (Sniper Extrême - Prioritaire)</SelectItem>
                    <SelectItem value="0.05" className="focus:bg-white/10 focus:text-white cursor-pointer">0.05 SOL (Jito Validator Tip - Ultra Rapide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-Volume Generator */}
              <div className="flex items-center justify-between bg-purple-950/10 border border-purple-500/15 rounded-xl p-3.5">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-white font-headline uppercase block">Générateur de Volume (Auto-Bump)</span>
                  <span className="text-[9px] text-purple-300/60 font-body block leading-normal">
                    Simule des micro-échanges (0.01 - 0.05 SOL) via 5 sous-portefeuilles pour propulser le jeton en "Trending".
                  </span>
                </div>
                <Switch
                  checked={autoVolume}
                  onCheckedChange={setAutoVolume}
                />
              </div>

              {/* Specifications */}
              <div className="bg-purple-950/10 border border-purple-500/15 rounded-xl p-3 text-[10px] space-y-2 font-body text-purple-300/80">
                <div className="flex justify-between">
                  <span>Cible de Profit</span>
                  <span className="font-bold text-emerald-400">+80% (Bonding Curve Completed)</span>
                </div>
                <div className="flex justify-between">
                  <span>Protection Stop Loss</span>
                  <span className="font-bold text-rose-400">-15% (Anti-Rug Safety)</span>
                </div>
                <div className="flex justify-between">
                  <span>Effet de Levier</span>
                  <span className="font-bold">1x (Achat Spot Obligatoire)</span>
                </div>
              </div>
            </>
          )}

          {/* Bot Capital allocation */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-white/40 uppercase font-headline">
                {tradingMode === 'REAL' ? "Capital Allocateur (SOL)" : "Capital Allocateur (USD)"}
              </label>
              <span className="text-[10px] text-white/40 font-body">
                Disponible: {tradingMode === 'REAL' ? `${solanaBalance?.toFixed(3)} SOL` : `${balance.toFixed(0)} $`}
              </span>
            </div>
            <Input
              type="number"
              value={botCapital || ""}
              onChange={(e) => setBotCapital(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body"
            />
          </div>

          {/* Start Button */}
          {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
            <Button
              type="submit"
              className="w-full h-12 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(194,255,12,0.4)] border-none"
            >
              <Play className="h-4 w-4 fill-black text-black" />
              Activer la Machine à Cash IA
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={tradingMode === 'REAL' && !isSolanaWalletActive}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/40"
            >
              <Play className="h-4 w-4 fill-white animate-pulse" />
              Lancer le Sniper Bot Solana
            </Button>
          )}
        </form>
      </Card>

      {/* Mes Bots Section */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 shadow-xl">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
            <Bot className="h-4 w-4 text-[#c2ff0c]" />
            {tradingMode === 'DEMO' ? "Mes Bots Démo" : "Mes Snipers SOL Réels"} ({filteredBots.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {filteredBots.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-white/30 font-body text-xs">
              {tradingMode === 'DEMO' ? "Aucun bot démo configuré." : "Aucun sniper SOL configuré actuellement."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBots.map((b) => (
                <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                  <div className={cn(
                    "absolute top-0 right-0 h-1.5 w-1.5 rounded-full m-3",
                    b.status === 'RUNNING' ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  )} />

                  <div>
                    <div className="text-xs font-body font-semibold flex items-center gap-1">
                      {b.strategy === 'Pump.fun Sniper Bot' ? (
                        <span className="text-purple-400 flex items-center gap-0.5">🟣 Stream Solana (Pump.fun)</span>
                      ) : b.pair === 'ALL' ? (
                        <span className="text-[#c2ff0c] flex items-center gap-0.5">🤖 Scan Multi-Actifs</span>
                      ) : (
                        <>
                          <span className="text-white/40">{(b.pair || '').replace('FX:', '').replace('-USD', '').replace('=', '')}</span>
                          <span className="text-white/40">— {b.timeframe}m</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-bold font-headline mt-0.5 flex items-center gap-1.5">
                      {b.strategy === 'Pump.fun Sniper Bot' ? (
                        <>
                          <span>{b.strategy}</span>
                          <Badge className="text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-headline uppercase font-bold border border-purple-500/25">
                            {b.pumpMode === 'PRECOCE' ? 'Ultra-Précoce' : b.pumpMode === 'MOMENTUM' ? 'Momentum' : 'Raydium Proche'}
                          </Badge>
                        </>
                      ) : (
                        <span>{b.strategy}</span>
                      )}
                      {b.riskProfile && (
                        <Badge className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded font-headline uppercase font-bold border-none",
                          b.riskProfile === 'CONSERVATIVE' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                          b.riskProfile === 'MODERATE' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                          b.riskProfile === 'AGGRESSIVE' && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {b.riskProfile === 'CONSERVATIVE' ? 'Sûr' : b.riskProfile === 'AGGRESSIVE' ? 'Risque' : 'Modéré'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-2.5 text-xs">
                    <div>
                      <span className="text-white/40 block text-[9px] font-headline">Capital</span>
                      <span className="font-bold text-white font-body">{b.capital} {tradingMode === 'REAL' ? 'SOL' : '$'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[9px] font-headline">Statut</span>
                      <span className={cn(
                        "font-bold font-body",
                        b.status === 'RUNNING' ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {b.status === 'RUNNING' ? 'ACTIF' : 'PAUSE'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2.5 text-[10px]">
                    <div>
                      <span className="text-white/40 block text-[8px] font-headline">PnL Net</span>
                      <span className={cn(
                        "font-bold font-body",
                        (b.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {(b.netProfit || 0) >= 0 ? '+' : ''}{(b.netProfit || 0).toFixed(2)} {tradingMode === 'REAL' ? 'SOL' : '$'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[8px] font-headline">Win Rate</span>
                      <span className="font-bold text-white font-body">
                        {b.totalTrades && b.totalTrades > 0 
                          ? `${(((b.winningTrades || 0) / b.totalTrades) * 100).toFixed(0)}%` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[8px] font-headline">Sélectivité</span>
                      <span className="font-bold text-violet-400 font-body">
                        {b.selectivityMultiplier ? `${b.selectivityMultiplier.toFixed(2)}x` : '1.00x'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-white/5 pt-2.5">
                    <Button
                      variant="ghost"
                      onClick={() => handleToggleBot(b.id)}
                      className={cn(
                        "flex-1 h-8 text-[10px] font-semibold rounded-md border flex items-center justify-center gap-1 transition-all duration-200",
                        b.status === 'RUNNING'
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
                      )}
                    >
                      {b.status === 'RUNNING' ? (
                        <>
                          <Square className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                          Lancer
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteBot(b.id)}
                      className="h-8 px-2.5 rounded-md border border-white/15 text-white/50 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Learning Console */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 shadow-xl">
        <CardHeader className="p-0 mb-4 flex flex-row justify-between items-center space-y-0">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
            <span className="text-purple-400">🧠</span>
            Moteur d'Apprentissage & Feedback IA ({botLearnings.length})
          </CardTitle>
          {botLearnings.length > 0 && (
            <Button
              variant="link"
              onClick={() => setBotLearnings([])}
              className="h-auto p-0 text-[10px] text-white/40 hover:text-white transition-all font-body underline-offset-4"
            >
              Réinitialiser
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {botLearnings.length === 0 ? (
              <div className="border border-dashed border-white/5 rounded-xl p-6 text-center text-white/30 font-body text-xs">
                Le bot n'a rencontré aucun échec pour l'instant. Il apprendra automatiquement de ses pertes futures pour resserrer ses filtres.
              </div>
            ) : (
              botLearnings.map((l) => (
                <div key={l.id} className="bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/20 rounded-xl p-3 flex justify-between items-center gap-3 transition-all duration-200">
                  <div className="space-y-1">
                    <div className="text-[10px] text-purple-400 font-headline uppercase font-bold flex items-center gap-1.5">
                      <span>Leçon #{l.id.replace('lrn_', '')}</span>
                      <span className="text-white/20">•</span>
                      <span className="text-white/60 font-body normal-case">Perte évitée: {l.lossAmount.toFixed(2)} $</span>
                    </div>
                    <p className="text-xs text-white/80 font-body leading-relaxed">{l.learningEffect}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[9px] text-white/30 font-body block">{new Date(l.timestamp).toLocaleTimeString('fr-FR')}</span>
                    <Badge className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/20 text-purple-300 font-headline uppercase border-none">
                      Actif
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bot Activity Logs */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 shadow-xl">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-400" />
            Journal d'Activité des Bots
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-40 overflow-y-auto border border-white/5 rounded-xl bg-white/[0.01] p-3 font-mono text-[10px] space-y-2">
            {botLogs.length === 0 ? (
              <div className="text-center text-white/20 py-8 font-body">Aucune activité enregistrée.</div>
            ) : (
              botLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0">
                  <span className="text-white/30 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                  </span>
                  <span className={cn(
                    "font-bold shrink-0",
                    log.type === 'trade' ? "text-[#c2ff0c]" :
                    log.type === 'error' ? "text-rose-400" : "text-cyan-400"
                  )}>
                    [{log.botName}]
                  </span>
                  <span className="text-white/70">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Closed Positions History */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 shadow-xl">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center gap-2">
            <History className="h-4 w-4 text-white/40" />
            {tradingMode === 'DEMO' ? "Historique des Clôtures Démo" : "Historique des Clôtures Réelles (SOL)"} ({filteredClosed.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
              <span className="text-xs text-white/30 font-body">Chargement de l'historique...</span>
            </div>
          ) : filteredClosed.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-xl p-6 text-center text-white/30 font-body text-xs">
              Aucune transaction clôturée pour le moment.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2.5">
              {filteredClosed.map((h) => {
                const isProfit = h.profit >= 0;
                return (
                  <div key={h.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {(h.pair || '').replace('FX:', '').replace('-USD', '').replace('=', '')}
                        <Badge className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border-none",
                          h.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>
                          {h.type === 'BUY' ? 'LONG' : 'SHORT'} {h.leverage}x
                        </Badge>
                        {h.wasBot && (
                          <Badge className="text-[8px] bg-violet-500/15 text-violet-400 px-1 py-0.5 rounded font-bold uppercase border-none">
                            Bot
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40 mt-1 font-body">
                        Entrée: {h.entryPrice.toFixed(h.entryPrice > 100 ? 2 : 5)} | Sortie: {h.exitPrice.toFixed(h.entryPrice > 100 ? 2 : 5)}
                      </div>
                      {(h.buyTxHash || h.sellTxHash) && (
                        <div className="flex gap-2.5 mt-1 text-[9px] font-mono text-purple-400">
                          {h.buyTxHash && (
                            <a
                              href={`https://solscan.io/tx/${h.buyTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline hover:text-purple-300"
                            >
                              [Tx Achat]
                            </a>
                          )}
                          {h.sellTxHash && (
                            <a
                              href={`https://solscan.io/tx/${h.sellTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline hover:text-purple-300"
                            >
                              [Tx Vente]
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-bold text-sm block font-body",
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {isProfit ? '+' : ''}{h.profit.toFixed(2)} $
                      </span>
                      <span className="text-[9px] text-white/30 block font-body">
                        {new Date(h.timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
