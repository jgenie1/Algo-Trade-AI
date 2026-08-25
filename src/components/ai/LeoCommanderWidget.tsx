"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Crown, Shield, Zap, Lock, Power, Send, Globe, Radio, Sparkles, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppState } from '@/context/AppContext';
import { evaluateFleetWithLeo, executeLeoOrder, LeoFleetStatus } from '@/services/leoOrchestratorService';

/**
 * Rendu Cyber-Luxe Premium des messages de Léo sans astérisques bruts (Optimisé Mobile & Desktop)
 */
function PremiumLeoMessage({ text, sender }: { text: string; sender: 'USER' | 'LEO' }) {
  if (sender === 'USER') {
    return (
      <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/40 to-[#9945FF]/30 text-purple-100 border border-[#9945FF]/40 rounded-tr-none font-medium text-[11px] sm:text-xs shadow-md">
        {text}
      </div>
    );
  }

  const cleanContent = text.replace(/\*\*/g, '').replace(/\*/g, '');
  const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);

  return (
    <div className="p-3 sm:p-4 rounded-2xl bg-[#140e24] border border-[#f0b90b]/25 rounded-tl-none space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs shadow-xl text-white/90">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('👑') || trimmed.startsWith('🌐') || trimmed.startsWith('⚡') || trimmed.startsWith('🛡️') || trimmed.startsWith('🛑')) {
          return (
            <div key={idx} className="flex items-center gap-1.5 pb-1 border-b border-white/10 text-amber-300 font-headline font-bold text-[11px] sm:text-xs uppercase tracking-wide">
              <span>{trimmed}</span>
            </div>
          );
        }

        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const content = trimmed.replace(/^[•-]\s*/, '');
          const parts = content.split(' : ');

          if (parts.length === 2) {
            return (
              <div key={idx} className="flex items-start gap-1.5 sm:gap-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b] mt-1 shrink-0 shadow-[0_0_6px_#f0b90b]" />
                <div className="flex-1">
                  <span className="text-white/50 font-semibold">{parts[0]} : </span>
                  <span className="font-bold text-white font-mono">{parts[1]}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="flex items-start gap-1.5 sm:gap-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c2ff0c] mt-1 shrink-0" />
              <span className="text-white/80 font-medium">{content}</span>
            </div>
          );
        }

        if (trimmed.includes('?')) {
          return (
            <div key={idx} className="pt-1.5 text-[#f0b90b] font-semibold text-[10px] sm:text-[11px] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>{trimmed}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-white/80 font-normal leading-relaxed text-[11px] sm:text-xs">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function LeoCommanderWidget() {
  const state = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'radar' | 'positions'>('chat');
  const [inputCommand, setInputCommand] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLeoThinking, setIsLeoThinking] = useState(false);
  const [fleetStatus, setFleetStatus] = useState<LeoFleetStatus | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [chatLogs, setChatLogs] = useState<Array<{ sender: 'USER' | 'LEO'; text: string; time: string }>>([
    {
      sender: 'LEO',
      text: "👑 Salutations, Commandant. Je suis LÉO, votre Maître Orchestrateur IA & Directeur des Investissements.\n\nJe scrute le Net en continu (CoinMarketCap, Pump.fun, DexScreener) et commande vos 5 bots pour maximiser vos profits tout en verrouillant 10% dans le Coffre-Fort.\n\nPosez-moi n'importe quelle question ou cliquez sur un ordre ci-dessous !",
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatLogs, isLeoThinking]);

  const refreshFleetData = async () => {
    setIsScanning(true);
    try {
      const data = await evaluateFleetWithLeo(state, {}, 180);
      setFleetStatus(data);
    } catch (e) {}
    setIsScanning(false);
  };

  useEffect(() => {
    const handleGlobalOpen = () => setIsOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('open_leo_commander', handleGlobalOpen);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open_leo_commander', handleGlobalOpen);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshFleetData();
    }
  }, [isOpen]);

  const handleSendCommand = async (cmdText?: string) => {
    const textToSend = cmdText || inputCommand;
    if (!textToSend.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newLogs = [...chatLogs, { sender: 'USER' as const, text: textToSend, time }];
    setChatLogs(newLogs);
    setInputCommand('');
    setIsLeoThinking(true);

    try {
      const result = await executeLeoOrder(
        textToSend, 
        state, 
        {
          setActivePositions: state.setActivePositions,
          setReserveVault: state.setReserveVault,
          setReserveVaultSol: state.setReserveVaultSol,
          setBots: state.setBots,
          setBalance: state.setBalance
        },
        {},
        newLogs
      );

      setChatLogs(prev => [...prev, { sender: 'LEO', text: result.message, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err: any) {
      setChatLogs(prev => [...prev, { sender: 'LEO', text: "👑 Ordre reçu, Commandant. Analyse et exécution en cours.", time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLeoThinking(false);
      refreshFleetData();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40 sm:z-50 flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-amber-500 via-[#f0b90b] to-yellow-600 text-black font-headline font-black text-[11px] sm:text-xs uppercase rounded-xl sm:rounded-2xl shadow-[0_0_25px_rgba(240,185,11,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 border border-yellow-200/60 group"
      >
        <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
          <Crown className="relative inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 text-black" />
        </span>
        <span className="hidden xs:inline">Léo AI</span>
        <span className="xs:hidden">Léo</span>
        <Badge className="bg-black text-[#f0b90b] text-[8px] sm:text-[9px] font-black uppercase px-1 sm:px-1.5 py-0.2">
          {fleetStatus?.regime ? fleetStatus.regime.split('_')[0] : 'LIVE'}
        </Badge>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[88vh] overflow-y-auto bg-[#0e0a1a]/95 border border-[#f0b90b]/40 text-white backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_0_60px_rgba(240,185,11,0.25)]">
          <DialogHeader className="border-b border-white/10 pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 to-[#f0b90b] flex items-center justify-center text-black shadow-[0_0_20px_rgba(240,185,11,0.4)] shrink-0">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-xl font-headline font-black text-white flex items-center gap-1.5 sm:gap-2">
                    <span>LÉO</span>
                    <Badge className="bg-[#f0b90b] text-black font-black text-[8px] sm:text-[10px] tracking-wider uppercase px-1.5 py-0">
                      CHIEF AI ORCHESTRATOR
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs text-white/50 font-body line-clamp-1">
                    Veille Web Temps Réel • Commandement des 5 Bots • Coffre-Fort 10%
                  </DialogDescription>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[8px] sm:text-[10px] text-white/40 block uppercase font-headline">Score Flotte</span>
                <span className="text-sm sm:text-lg font-black font-mono text-[#c2ff0c]">
                  {fleetStatus ? `${fleetStatus.fleetHealthScore}%` : '85%'}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-center font-mono text-xs">
            <div className="p-1.5 sm:p-2 bg-black/40 rounded-lg sm:rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-white/40 block">Sentiment Web</span>
              <span className="text-[10px] sm:text-xs font-black text-[#f0b90b]">
                {fleetStatus?.sentiment || 'GREED'} ({fleetStatus?.fearAndGreedIndex || 72}/100)
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-black/40 rounded-lg sm:rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-white/40 block">Win-Rate 24h</span>
              <span className="text-[10px] sm:text-xs font-black text-[#c2ff0c]">
                {fleetStatus?.winRate24h || 78.5}%
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-black/40 rounded-lg sm:rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-white/40 block">AUM Global</span>
              <span className="text-[10px] sm:text-xs font-black text-white">
                ${fleetStatus?.totalAumUsd || 10000}
              </span>
            </div>
            <div className="p-1.5 sm:p-2 bg-black/40 rounded-lg sm:rounded-xl">
              <span className="text-[8px] sm:text-[9px] text-white/40 block">Coffre-Fort (10%)</span>
              <span className="text-[10px] sm:text-xs font-black text-emerald-400">
                ${fleetStatus?.vaultSecuredUsd || 0}
              </span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className="grid grid-cols-3 bg-black/50 border border-white/10 p-1 rounded-xl sm:rounded-2xl h-9 sm:h-11">
              <TabsTrigger value="chat" className="text-[10px] sm:text-xs font-headline font-bold data-[state=active]:bg-[#f0b90b] data-[state=active]:text-black rounded-lg sm:rounded-xl">
                💬 Terminal Léo
              </TabsTrigger>
              <TabsTrigger value="radar" className="text-[10px] sm:text-xs font-headline font-bold data-[state=active]:bg-[#f0b90b] data-[state=active]:text-black rounded-lg sm:rounded-xl">
                🌐 Radar Web
              </TabsTrigger>
              <TabsTrigger value="positions" className="text-[10px] sm:text-xs font-headline font-bold data-[state=active]:bg-[#f0b90b] data-[state=active]:text-black rounded-lg sm:rounded-xl">
                📊 Flotte & Trades ({fleetStatus?.totalPositionsCount || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-3 sm:space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
                <Button
                  onClick={() => handleSendCommand("Léo, scrute le net et donne moi les meilleures opportunités")}
                  variant="outline"
                  className="h-8 sm:h-9 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30 text-[9px] sm:text-[10px] font-headline font-bold rounded-lg sm:rounded-xl flex items-center justify-center gap-1 px-1.5"
                >
                  <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Scruter le Net
                </Button>
                <Button
                  onClick={() => handleSendCommand("Léo, lance une attaque avec le bot sniper")}
                  variant="outline"
                  className="h-8 sm:h-9 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] sm:text-[10px] font-headline font-bold rounded-lg sm:rounded-xl flex items-center justify-center gap-1 px-1.5"
                >
                  <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#f0b90b]" /> Ordonner Trade
                </Button>
                <Button
                  onClick={() => handleSendCommand("Léo, sécurise tous les profits dans le coffre-fort")}
                  variant="outline"
                  className="h-8 sm:h-9 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] sm:text-[10px] font-headline font-bold rounded-lg sm:rounded-xl flex items-center justify-center gap-1 px-1.5"
                >
                  <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Sécuriser Gains
                </Button>
                <Button
                  onClick={() => handleSendCommand("Léo, ferme toutes les positions ouvertes")}
                  variant="outline"
                  className="h-8 sm:h-9 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] sm:text-[10px] font-headline font-bold rounded-lg sm:rounded-xl flex items-center justify-center gap-1 px-1.5"
                >
                  <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Fermer Trades
                </Button>
                <Button
                  onClick={() => handleSendCommand("Léo, arrêt d'urgence immédiat")}
                  variant="outline"
                  className="h-8 sm:h-9 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 text-[9px] sm:text-[10px] font-headline font-bold rounded-lg sm:rounded-xl flex items-center justify-center gap-1 px-1.5 col-span-2 sm:col-span-1"
                >
                  <Power className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Kill-Switch
                </Button>
              </div>

              <div className="h-44 sm:h-56 overflow-y-auto space-y-2 sm:space-y-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-black/60 border border-white/10 text-xs">
                {chatLogs.map((log, i) => (
                  <div key={i} className={`flex flex-col ${log.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-white/30 mb-0.5 px-1">
                      <span>{log.sender === 'USER' ? 'Commandant' : '👑 LÉO'}</span>
                      <span>•</span>
                      <span>{log.time}</span>
                    </div>
                    <div className="max-w-[92%] sm:max-w-[90%]">
                      <PremiumLeoMessage text={log.text} sender={log.sender} />
                    </div>
                  </div>
                ))}
                {isLeoThinking && (
                  <div className="flex items-center gap-2 p-3 bg-[#140e24] border border-[#f0b90b]/30 rounded-2xl rounded-tl-none text-xs text-amber-300">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#f0b90b] border-t-transparent" />
                    <span className="font-headline font-bold">LÉO consulte Gemini IA & analyse les Klines...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSendCommand(); }} className="flex gap-1.5 sm:gap-2">
                <Input
                  value={inputCommand}
                  onChange={(e) => setInputCommand(e.target.value)}
                  placeholder="Posez une question ou donnez un ordre à Léo..."
                  className="bg-black/60 border-white/15 text-white text-[11px] sm:text-xs rounded-xl focus:border-[#f0b90b] h-9 sm:h-10"
                />
                <Button 
                  type="submit" 
                  disabled={isLeoThinking}
                  className="bg-[#f0b90b] hover:bg-yellow-400 text-black font-black font-headline text-xs px-3 sm:px-4 rounded-xl h-9 sm:h-10 shrink-0"
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="radar" className="space-y-2.5 sm:space-y-3 mt-2 sm:mt-3">
              <div className="flex justify-between items-center text-[10px] sm:text-xs">
                <span className="text-white/60">Scrutage direct (Pump.fun, CMC) :</span>
                <Button onClick={refreshFleetData} variant="ghost" size="sm" className="h-6 sm:h-7 text-[9px] sm:text-[10px] text-[#f0b90b] gap-1 px-2">
                  <RefreshCw className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${isScanning ? 'animate-spin' : ''}`} /> Actualiser
                </Button>
              </div>

              <div className="space-y-1.5 sm:space-y-2 max-h-52 overflow-y-auto pr-1">
                {(fleetStatus?.topOpportunities || []).map((opp, idx) => (
                  <div key={idx} className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between font-mono text-[11px] sm:text-xs transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs sm:text-sm truncate">{opp.name}</span>
                        <Badge className="bg-[#f0b90b]/20 text-[#f0b90b] border border-[#f0b90b]/30 text-[8px] sm:text-[9px] px-1">
                          Alpha {opp.alphaScore}
                        </Badge>
                        <Badge className="bg-emerald-500/20 text-emerald-300 text-[8px] sm:text-[9px] px-1">
                          {opp.signal}
                        </Badge>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-white/50 font-body mt-0.5 line-clamp-1">{opp.reasoning}</p>
                    </div>

                    <Button
                      onClick={() => handleSendCommand(`Léo, ordonne au ${opp.targetBot} d'acheter ${opp.name}`)}
                      className="bg-[#f0b90b] hover:bg-yellow-400 text-black font-headline font-bold text-[9px] sm:text-[10px] h-7 sm:h-8 rounded-lg px-2 sm:px-3 shrink-0"
                    >
                      Trade
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ONGLET 3 : POSITIONS SOUS SURVEILLANCE */}
            <TabsContent value="positions" className="space-y-2.5 sm:space-y-3 mt-2 sm:mt-3">
              <div className="text-[10px] sm:text-xs text-white/60">
                Positions sous surveillance ({fleetStatus?.totalPositionsCount || 0}) :
              </div>

              <div className="space-y-1.5 sm:space-y-2 max-h-52 overflow-y-auto pr-1">
                {(fleetStatus?.activePositionsSummary || []).length === 0 ? (
                  <div className="p-4 sm:p-6 text-center text-white/40 text-[11px] sm:text-xs font-mono bg-black/40 rounded-xl border border-white/5">
                    Aucune position ouverte. Les 5 bots scrutent le marché.
                  </div>
                ) : (
                  (fleetStatus?.activePositionsSummary || []).map((p, idx) => (
                    <div key={idx} className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between font-mono text-[11px] sm:text-xs">
                      <div>
                        <span className="font-bold text-white">{p.pair}</span>
                        <span className="text-[9px] text-white/40 ml-1.5">({p.botName})</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${p.pnlUsd >= 0 ? 'text-[#c2ff0c]' : 'text-rose-400'}`}>
                          {p.pnlUsd >= 0 ? '+' : ''}${p.pnlUsd.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-white/50 ml-1">({p.pnlPct.toFixed(2)}%)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
