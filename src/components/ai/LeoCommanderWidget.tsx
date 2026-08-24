"use client";

import React, { useState } from 'react';
import { Crown, Shield, Zap, Lock, Power, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/context/AppContext';
import { evaluateFleetWithLeo, executeLeoOrder, LeoFleetStatus } from '@/services/leoOrchestratorService';

export default function LeoCommanderWidget() {
  const state = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [inputCommand, setInputCommand] = useState('');
  const [chatLogs, setChatLogs] = useState<Array<{ sender: 'USER' | 'LEO'; text: string; time: string }>>([
    {
      sender: 'LEO',
      text: "👑 Salutations, Commandant. Je suis LÉO, votre Maître Orchestrateur IA. Les 5 bots de trading sont sous mon contrôle direct. Quel est votre ordre ?",
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const fleetStatus: LeoFleetStatus = evaluateFleetWithLeo(state, {}, 180);

  const handleSendCommand = (cmdText?: string) => {
    const textToSend = cmdText || inputCommand;
    if (!textToSend.trim()) return;

    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setChatLogs(prev => [...prev, { sender: 'USER', text: textToSend, time }]);
    setInputCommand('');

    const result = executeLeoOrder(textToSend, state, {
      setActivePositions: state.setActivePositions,
      setReserveVault: state.setReserveVault,
      setReserveVaultSol: state.setReserveVaultSol,
      setBots: state.setBots
    });

    setTimeout(() => {
      setChatLogs(prev => [...prev, { sender: 'LEO', text: result.message, time }]);
    }, 400);
  };

  return (
    <>
      {/* Bouton Flottant Doré Cyber-Luxe */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-500 via-[#f0b90b] to-yellow-600 text-black font-headline font-black text-xs uppercase rounded-2xl shadow-[0_0_25px_rgba(240,185,11,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 border border-yellow-200/50"
      >
        <Crown className="h-4 w-4 text-black" />
        <span>Léo AI Commander</span>
        <Badge className="bg-black text-[#f0b90b] text-[9px] font-black uppercase px-1.5 py-0.2">
          {fleetStatus.regime === 'BULL_MOMENTUM' ? '⚡ BULL' : '🛡️ DÉFENSE'}
        </Badge>
      </button>

      {/* Modale de Commandement Suprême */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-[#0e0a1a]/95 border border-[#f0b90b]/30 text-white backdrop-blur-2xl rounded-3xl p-6 shadow-[0_0_50px_rgba(240,185,11,0.2)]">
          <DialogHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-[#f0b90b] flex items-center justify-center text-black shadow-[0_0_20px_rgba(240,185,11,0.4)]">
                  <Crown className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-headline font-black text-white flex items-center gap-2">
                    <span>LÉO</span>
                    <Badge className="bg-[#f0b90b] text-black font-black text-[10px] tracking-wider uppercase">
                      CHIEF AI ORCHESTRATOR
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-white/50 font-body">
                    Contrôle des 5 Bots • Coffre-Fort 10% • BlackRock Aladdin Risk Parity
                  </DialogDescription>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-white/40 block uppercase font-headline">Score de Flotte</span>
                <span className="text-lg font-black font-mono text-[#c2ff0c]">{fleetStatus.fleetHealthScore}%</span>
              </div>
            </div>
          </DialogHeader>

          {/* Baromètre Tactique */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 text-center font-mono">
            <div className="p-2 bg-black/40 rounded-xl">
              <span className="text-[10px] text-white/40 block">Régime de Marché</span>
              <span className="text-xs font-black text-[#f0b90b]">{fleetStatus.regime}</span>
            </div>
            <div className="p-2 bg-black/40 rounded-xl">
              <span className="text-[10px] text-white/40 block">Win-Rate Flotte</span>
              <span className="text-xs font-black text-emerald-400">{fleetStatus.winRate24h}%</span>
            </div>
            <div className="p-2 bg-black/40 rounded-xl">
              <span className="text-[10px] text-white/40 block">Coffre Sécurisé</span>
              <span className="text-xs font-black text-[#c2ff0c]">${fleetStatus.vaultSecuredUsd.toFixed(2)}</span>
            </div>
          </div>

          {/* 4 Boutons d'Ordres Rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              onClick={() => handleSendCommand("Léo, sécurise tous les profits dans le coffre-fort")}
              variant="outline"
              className="h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px] font-headline font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" /> Sécuriser Gains
            </Button>
            <Button
              onClick={() => handleSendCommand("Léo, passe en mode attaque avec le sniper")}
              variant="outline"
              className="h-10 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30 text-[11px] font-headline font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-[#f0b90b]" /> Mode Attaque
            </Button>
            <Button
              onClick={() => handleSendCommand("Léo, active le bouclier défensif et resserre le stop loss")}
              variant="outline"
              className="h-10 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30 text-[11px] font-headline font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Shield className="h-3.5 w-3.5" /> Mode Défense
            </Button>
            <Button
              onClick={() => handleSendCommand("Léo, arrêt d'urgence immédiat")}
              variant="outline"
              className="h-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 text-[11px] font-headline font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Power className="h-3.5 w-3.5" /> Kill-Switch
            </Button>
          </div>

          {/* Terminal de Chat avec Léo */}
          <div className="h-56 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-black/60 border border-white/10 font-body text-xs">
            {chatLogs.map((log, i) => (
              <div key={i} className={`flex flex-col ${log.sender === 'USER' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1 text-[10px] text-white/30 mb-0.5">
                  <span>{log.sender === 'USER' ? 'Commandant' : '👑 LÉO'}</span>
                  <span>•</span>
                  <span>{log.time}</span>
                </div>
                <div className={`p-3 rounded-2xl max-w-[85%] ${
                  log.sender === 'USER' 
                    ? 'bg-[#9945FF]/20 text-purple-200 border border-[#9945FF]/40 rounded-tr-none' 
                    : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none font-mono text-[11px]'
                }`}>
                  {log.text}
                </div>
              </div>
            ))}
          </div>

          {/* Saisie de Commande */}
          <form onSubmit={(e) => { e.preventDefault(); handleSendCommand(); }} className="flex gap-2">
            <Input
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              placeholder="Donnez un ordre à Léo (ex: 'Passe en mode défensif', 'Sécurise 10%')..."
              className="bg-black/60 border-white/15 text-white text-xs rounded-xl focus:border-[#f0b90b]"
            />
            <Button type="submit" className="bg-[#f0b90b] hover:bg-yellow-400 text-black font-black font-headline text-xs px-4 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
