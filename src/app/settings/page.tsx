"use client";

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  ShieldAlert, 
  Coins, 
  SlidersHorizontal, 
  Check, 
  Volume2, 
  VolumeX, 
  Zap, 
  RefreshCw, 
  RotateCcw,
  Globe,
  Radio,
  Bell,
  Send,
  MessageSquare
} from 'lucide-react';
import { cn, SOL_USD_RATE, getUsdHtgRate, fetchLiveUsdHtgRate } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CEXKeyManager from '@/components/CEXKeyManager';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, dispatchAlert } from '@/services/notificationService';

export default function SettingsPage() {
  const { tradingMode, setTradingMode, setBalance } = useAppState();
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Settings State
  const [rpcUrl, setRpcUrl] = useState<string>('https://solana-mainnet.core.chainstack.com/39a622a578bd62b');
  const [wssUrl, setWssUrl] = useState<string>('wss://solana-mainnet.core.chainstack.com/39a622a578bd62b');
  const [slippage, setSlippage] = useState<string>('15');
  const [priorityFee, setPriorityFee] = useState<string>('0.005');

  const [maxDrawdown, setMaxDrawdown] = useState<string>('5.0');
  const [maxPositions, setMaxPositions] = useState<string>('10');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');
  const [consensusThreshold, setConsensusThreshold] = useState<string>('75');

  const [usdHtgRate, setUsdHtgRate] = useState<number>(132);
  const [solPriceUsd, setSolPriceUsd] = useState<number>(SOL_USD_RATE);
  const [isSyncingRate, setIsSyncingRate] = useState<boolean>(false);

  // Notification state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [isTestingNotif, setIsTestingNotif] = useState<boolean>(false);

  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    setUsdHtgRate(getUsdHtgRate());
    if (typeof window !== 'undefined') {
      const storedRpc = localStorage.getItem('settings_rpc_url');
      const storedSlippage = localStorage.getItem('settings_slippage');
      const storedFee = localStorage.getItem('settings_priority_fee');
      const storedModel = localStorage.getItem('settings_ai_model');
      if (storedRpc) setRpcUrl(storedRpc);
      if (storedSlippage) setSlippage(storedSlippage);
      if (storedFee) setPriorityFee(storedFee);
      if (storedModel) setAiModel(storedModel);
    }
  }, []);

  const handleSyncLiveRate = async () => {
    setIsSyncingRate(true);
    const liveRate = await fetchLiveUsdHtgRate();
    setUsdHtgRate(liveRate);
    setIsSyncingRate(false);
  };

  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_rpc_url', rpcUrl);
      localStorage.setItem('settings_slippage', slippage);
      localStorage.setItem('settings_priority_fee', priorityFee);
      localStorage.setItem('settings_ai_model', aiModel);
      localStorage.setItem('settings_usd_htg_rate', usdHtgRate.toString());
      saveNotificationSettings(notifSettings);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    saveNotificationSettings(notifSettings);
    await dispatchAlert(
      "Alerte Test Algo-Trade-AI",
      "Le système de notifications Telegram & Discord est parfaitement opérationnel et prêt à transmettre vos signaux de trading !",
      "TEST"
    );
    setIsTestingNotif(false);
  };

  const handleResetDemo = () => {
    if (confirm("Réinitialiser le solde virtuel du compte Démo à 10,000 $ ?")) {
      setBalance(10000);
      alert("Solde Démo réinitialisé à 10,000 $ !");
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Header */}
      <div className="border-b border-white/5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline flex items-center gap-2.5">
            <Settings className="h-8 w-8 text-[#c2ff0c]" />
            Configuration Globale Du Système & Algorithmes
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">
            Paramétrez vos connexions RPC Solana, vos clés CEX, vos notifications Telegram/Discord, vos modèles IA et les règles de risque.
          </p>
        </div>

        <Button
          onClick={handleResetDemo}
          variant="outline"
          className="h-10 px-4 bg-white/5 hover:bg-white/10 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold font-headline flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser Solde Démo (10k $)
        </Button>
      </div>

      {/* SECTION CEX KEYS MANAGER */}
      <CEXKeyManager />

      <form onSubmit={handleSaveAllSettings} className="space-y-6">

        {/* SECTION NOTIFICATIONS (TELEGRAM & DISCORD) */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-headline text-emerald-400 flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertes & Notifications En Temps Réel (Telegram & Discord)
              </h3>
              <p className="text-xs text-white/40 mt-0.5 font-body">
                Recevez une notification instantanée à chaque exécution d'ordre, Stop-Loss ou alerte de bot.
              </p>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-300 font-mono text-[10px] uppercase border-none">
              WEBHOOKS & TELEGRAM BOT API
            </Badge>
          </div>

          <div className="space-y-4 font-body">
            {/* Telegram config */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold font-headline text-white flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-400" />
                  Bot Telegram
                </label>
                <input
                  type="checkbox"
                  checked={notifSettings.telegramEnabled}
                  onChange={(e) => setNotifSettings({ ...notifSettings, telegramEnabled: e.target.checked })}
                  className="h-4 w-4 accent-[#c2ff0c] rounded"
                />
              </div>

              {notifSettings.telegramEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Input
                    type="text"
                    value={notifSettings.telegramBotToken}
                    onChange={(e) => setNotifSettings({ ...notifSettings, telegramBotToken: e.target.value })}
                    placeholder="Telegram Bot Token (ex: 123456789:ABCdef...)"
                    className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
                  />
                  <Input
                    type="text"
                    value={notifSettings.telegramChatId}
                    onChange={(e) => setNotifSettings({ ...notifSettings, telegramChatId: e.target.value })}
                    placeholder="Telegram Chat ID (ex: 987654321)"
                    className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
                  />
                </div>
              )}
            </div>

            {/* Discord config */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold font-headline text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  Webhook Discord
                </label>
                <input
                  type="checkbox"
                  checked={notifSettings.discordEnabled}
                  onChange={(e) => setNotifSettings({ ...notifSettings, discordEnabled: e.target.checked })}
                  className="h-4 w-4 accent-[#c2ff0c] rounded"
                />
              </div>

              {notifSettings.discordEnabled && (
                <Input
                  type="text"
                  value={notifSettings.discordWebhookUrl}
                  onChange={(e) => setNotifSettings({ ...notifSettings, discordWebhookUrl: e.target.value })}
                  placeholder="URL Webhook Discord (https://discord.com/api/webhooks/...)"
                  className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
                />
              )}
            </div>

            <Button
              type="button"
              onClick={handleTestNotification}
              disabled={isTestingNotif}
              variant="outline"
              className="h-9 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30 rounded-xl text-xs font-bold font-headline flex items-center gap-2"
            >
              <Bell className="h-3.5 w-3.5" />
              {isTestingNotif ? 'Envoi du test...' : 'Tester Les Notifications Maintenant'}
            </Button>
          </div>
        </Card>

        {/* SECTION 1: BLOCKCHAIN & RPC SETTINGS */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-headline text-purple-400 flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Connexions Blockchain & Nœud RPC Solana
              </h3>
              <p className="text-xs text-white/40 mt-0.5 font-body">
                Assurez une exécution ultra-rapide des transactions on-chain via votre infrastructure dédiée.
              </p>
            </div>
            <Badge className="bg-purple-500/15 text-purple-300 font-mono text-[10px] border-none">SOLANA MAINNET</Badge>
          </div>

          <div className="space-y-4 font-body">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Point de terminaison RPC Solana HTTP(S)</label>
              <Input
                type="text"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Point de terminaison WebSocket WSS</label>
              <Input
                type="text"
                value={wssUrl}
                onChange={(e) => setWssUrl(e.target.value)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Tolérance de Slippage (%)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-sm font-mono text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Frais Prioritaires Réseau (SOL)</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    value={priorityFee}
                    onChange={(e) => setPriorityFee(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-sm font-mono text-white pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">SOL</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 2: AI ENGINE & GEMINI INTELLIGENCE */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold font-headline text-[#c2ff0c] flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Moteur d'Intelligence Artificielle & Consensus Gemini
              </h3>
              <p className="text-xs text-white/40 mt-0.5 font-body">
                Réglez le niveau de rigueur de l'IA pour la validation des signaux d'achat/vente.
              </p>
            </div>
            <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] font-mono text-[10px] uppercase border-none">
              {aiModel}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Modèle IA Gemini & Moteur Quant Sélectionné</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full h-11 bg-[#14101a] border border-white/10 rounded-xl px-3 text-xs text-white font-body focus:ring-[#c2ff0c]"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-Streaming - Latence 10ms)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raisonnement Multi-Marchés & Structure)</option>
                <option value="gemini-2.5-flash-thinking">Gemini 2.5 Thinking (Chain-of-Thought Quantitatif)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Analyse Approfondie Multi-Chandelier)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Scanneur Algorithmique Standard)</option>
                <option value="deepseek-r1-quant">DeepSeek R1 Quant Engine (Moteur Financier Open-Source)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet Financial (Microstructure & Carnet d'Ordres)</option>
                <option value="gpt-4o-fintech">GPT-4o Fintech Edition (Analyse Sentiment Macro & Nouvelles)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Seuil de Consensus Minimal (%)</label>
              <div className="relative">
                <Input
                  type="number"
                  value={consensusThreshold}
                  onChange={(e) => setConsensusThreshold(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 rounded-xl text-sm font-mono text-white pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-mono">%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* SECTION 3: CURRENCY & LOCALIZATION SETTINGS */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold font-headline text-amber-400 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Taux de Change du Jour (USD / Gourdes HTG / SOL)
              </h3>
              <p className="text-xs text-white/40 mt-0.5 font-body">
                Taux synchronisé en direct depuis l'API officielle des marchés des devises.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSyncLiveRate}
              disabled={isSyncingRate}
              className="h-9 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold font-headline flex items-center gap-2 shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncingRate && "animate-spin")} />
              {isSyncingRate ? 'Sync API...' : 'Synchroniser Taux du Jour'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Taux 1 USD → HTG (Gourde Haïtienne)</label>
                <span className="text-[9px] text-amber-400 font-mono">EN DIRECT DU JOUR</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={usdHtgRate}
                onChange={(e) => setUsdHtgRate(parseFloat(e.target.value) || 132)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-sm font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Prix Moyen 1 SOL → USD ($)</label>
              <Input
                type="number"
                value={solPriceUsd}
                onChange={(e) => setSolPriceUsd(parseFloat(e.target.value) || 145)}
                className="h-11 bg-white/5 border-white/10 rounded-xl text-sm font-mono text-white"
              />
            </div>
          </div>
        </Card>

        {/* Action Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold font-headline flex items-center gap-2">
              <Check className="h-4 w-4" />
              Paramètres système sauvegardés !
            </div>
          ) : (
            <span className="text-xs text-white/40 font-body">Toutes les modifications sont enregistrées localement dans votre session.</span>
          )}

          <Button
            type="submit"
            className="h-12 px-8 bg-[#c2ff0c] text-black font-extrabold font-headline text-xs rounded-xl uppercase hover:shadow-[0_0_20px_rgba(194,255,12,0.3)] border-none shrink-0"
          >
            Sauvegarder La Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
