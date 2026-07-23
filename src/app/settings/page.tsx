"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  SlidersHorizontal, 
  Wallet, 
  Bell, 
  ShieldCheck, 
  Check, 
  Zap, 
  Copy, 
  Download, 
  Upload, 
  RotateCcw, 
  LogOut, 
  Sparkles, 
  Activity,
  Globe,
  Lock,
  Volume2,
  Cpu
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppState } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { 
    tradingMode, 
    setTradingMode, 
    balance, 
    setBalance, 
    bots, 
    setBots 
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'profile' | 'rpc' | 'notifications' | 'backup'>('profile');

  // Profile Form State
  const [userName, setUserName] = useState<string>('David Owner');
  const [userEmail, setUserEmail] = useState<string>('admin@trade.ai');
  const [avatarUrl, setAvatarUrl] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100');
  const [displayCurrency, setDisplayCurrency] = useState<string>('USD');
  const [discordWebhook, setDiscordWebhook] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');

  // RPC & Execution State
  const [rpcUrl, setRpcUrl] = useState<string>('https://solana-mainnet.core.chainstack.com/39a622a578bd62b');
  const [slippage, setSlippage] = useState<string>('15');
  const [priorityFee, setPriorityFee] = useState<string>('0.005');
  const [pingLatency, setPingLatency] = useState<number | null>(42);

  // Notification Toggles
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const [tradeNotifications, setTradeNotifications] = useState<boolean>(true);
  const [errorNotifications, setErrorNotifications] = useState<boolean>(true);

  // Success Toast Notice State
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('user_profile_name');
      const email = localStorage.getItem('user_profile_email');
      const avatar = localStorage.getItem('user_profile_avatar');
      const rpc = localStorage.getItem('settings_rpc_url');
      const slip = localStorage.getItem('settings_slippage');
      const fee = localStorage.getItem('settings_priority_fee');
      const discord = localStorage.getItem('settings_discord_webhook');
      const telegram = localStorage.getItem('settings_telegram_chat_id');
      const sound = localStorage.getItem('settings_sound_alerts');

      if (name) setUserName(name);
      if (email) setUserEmail(email);
      if (avatar) setAvatarUrl(avatar);
      if (rpc) setRpcUrl(rpc);
      if (slip) setSlippage(slip);
      if (fee) setPriorityFee(fee);
      if (discord) setDiscordWebhook(discord);
      if (telegram) setTelegramChatId(telegram);
      if (sound !== null) setSoundAlerts(sound === 'true');
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('user_profile_name', userName);
    localStorage.setItem('user_profile_email', userEmail);
    localStorage.setItem('user_profile_avatar', avatarUrl);
    localStorage.setItem('settings_rpc_url', rpcUrl);
    localStorage.setItem('settings_slippage', slippage);
    localStorage.setItem('settings_priority_fee', priorityFee);
    localStorage.setItem('settings_discord_webhook', discordWebhook);
    localStorage.setItem('settings_telegram_chat_id', telegramChatId);
    localStorage.setItem('settings_sound_alerts', String(soundAlerts));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePresetRpc = (url: string) => {
    setRpcUrl(url);
    setPingLatency(Math.floor(25 + Math.random() * 30));
  };

  const handleExportConfig = () => {
    const configData = {
      bots,
      settings: {
        userName,
        userEmail,
        rpcUrl,
        slippage,
        priorityFee,
        tradingMode
      },
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algotrade_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetBalance = () => {
    if (confirm("Voulez-vous réinitialiser votre solde de démonstration à 10 000 $ ?")) {
      setBalance(10000);
      alert("Solde Démo réinitialisé à 10 000 $ avec succès !");
    }
  };

  const handleClearSession = () => {
    if (confirm("Attention : cela va effacer la session locale et recharger la page. Continuer ?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto font-body text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171122] via-[#1b1429] to-[#14101a] p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#c2ff0c]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <Avatar className="h-16 w-16 rounded-2xl border-2 border-[#c2ff0c]/40 shadow-lg shrink-0">
            <AvatarImage src={avatarUrl} alt={userName} />
            <AvatarFallback className="bg-white/10 text-white font-bold text-lg">DO</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold font-headline text-white tracking-tight">{userName}</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> TRADER PRO VIP
              </span>
            </div>
            <p className="text-xs text-white/50 font-mono">{userEmail}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <Button
            onClick={() => setTradingMode(m => m === 'DEMO' ? 'REAL' : 'DEMO')}
            className={cn(
              "font-bold text-xs px-4 h-10 rounded-xl transition-all duration-200 shadow-md",
              tradingMode === 'REAL'
                ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40"
                : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
            )}
          >
            Mode : {tradingMode === 'REAL' ? '⚡ RÉEL (Solana Mainnet)' : '🎮 DÉMO (Fonds Fictifs)'}
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-xs font-semibold transition-all duration-200",
            activeTab === 'profile'
              ? "bg-[#c2ff0c] text-black shadow-md font-bold"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <User className="h-4 w-4" />
          Profil & Préférences
        </button>

        <button
          onClick={() => setActiveTab('rpc')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-xs font-semibold transition-all duration-200",
            activeTab === 'rpc'
              ? "bg-[#c2ff0c] text-black shadow-md font-bold"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Cpu className="h-4 w-4" />
          RPC Solana & Gaz
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-xs font-semibold transition-all duration-200",
            activeTab === 'notifications'
              ? "bg-[#c2ff0c] text-black shadow-md font-bold"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <Bell className="h-4 w-4" />
          Alertes & Webhooks
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-xs font-semibold transition-all duration-200",
            activeTab === 'backup'
              ? "bg-[#c2ff0c] text-black shadow-md font-bold"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Sauvegarde & Sécurité
        </button>
      </div>

      {/* Success Notification Alert */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="h-5 w-5 shrink-0" />
          <span className="font-semibold">Paramètres et profil enregistrés avec succès !</span>
        </div>
      )}

      {/* Tab Content 1: Profile & Preferences */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-[#14101a] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <User className="h-5 w-5 text-[#c2ff0c]" />
                Informations du Profil
              </h2>
              <p className="text-xs text-white/40">Modifiez votre identité d'affichage et vos préférences d'interface.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 font-headline">Nom d'affichage</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-[#c2ff0c] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 font-headline">Adresse Email</label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-[#c2ff0c] transition-colors"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-white/70 font-headline">URL de la Photo de Profil (Avatar)</label>
              <input
                type="url"
                required
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c] transition-colors"
              />
            </div>

            <div className="space-y-2 font-headline">
              <label className="text-xs font-semibold text-white/70">Devise Principale</label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="w-full h-11 bg-[#1a1424] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#c2ff0c]"
              >
                <option value="USD">USD ($) - Dollar Américain</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="SOL">SOL (𝄠) - Solana Token</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <Button type="submit" className="bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 font-bold px-6 h-11 rounded-xl">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      )}

      {/* Tab Content 2: RPC Solana & Execution */}
      {activeTab === 'rpc' && (
        <form onSubmit={handleSaveProfile} className="bg-[#14101a] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[#c2ff0c]" />
                Nœud RPC Solana & Paramètres d'Exécution On-Chain
              </h2>
              <p className="text-xs text-white/40">Configurez votre connexion à la blockchain Solana pour une vitesse maximale du Sniper.</p>
            </div>
            {pingLatency && (
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Latence : {pingLatency} ms
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-white/70 font-headline">Présélections Nœuds RPC Rapides</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handlePresetRpc('https://solana-mainnet.core.chainstack.com/39a622a578bd62b')}
                className="p-3 bg-white/5 border border-white/10 hover:border-[#c2ff0c]/50 rounded-xl text-left transition-all"
              >
                <p className="text-xs font-bold text-white font-headline">Chainstack Dedicated</p>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">Ultra-faible latence (Gratuit)</p>
              </button>

              <button
                type="button"
                onClick={() => handlePresetRpc('https://api.mainnet-beta.solana.com')}
                className="p-3 bg-white/5 border border-white/10 hover:border-[#c2ff0c]/50 rounded-xl text-left transition-all"
              >
                <p className="text-xs font-bold text-white font-headline">Solana Official RPC</p>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">Nœud public officiel</p>
              </button>

              <button
                type="button"
                onClick={() => handlePresetRpc('https://rpc.helius.xyz/?api-key=free')}
                className="p-3 bg-white/5 border border-white/10 hover:border-[#c2ff0c]/50 rounded-xl text-left transition-all"
              >
                <p className="text-xs font-bold text-white font-headline">Helius RPC Fast</p>
                <p className="text-[10px] text-white/40 font-mono mt-0.5">Optimisé Pump.fun</p>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 font-headline">URL du Point de Terminaison RPC Solana</label>
              <input
                type="text"
                required
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 font-headline">
                <label className="text-xs font-semibold text-white/70">Tolérance au Slippage (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c]"
                />
                <p className="text-[10px] text-white/40">Slippage recommandé pour le Sniper Pump.fun : 15%</p>
              </div>

              <div className="space-y-2 font-headline">
                <label className="text-xs font-semibold text-white/70">Frais Prioritaires Réseau (SOL)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={priorityFee}
                  onChange={(e) => setPriorityFee(e.target.value)}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c]"
                />
                <p className="text-[10px] text-white/40">Permet aux transactions de passer en priorité lors des congestions Solana.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <Button type="submit" className="bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 font-bold px-6 h-11 rounded-xl">
              Sauvegarder les paramètres RPC
            </Button>
          </div>
        </form>
      )}

      {/* Tab Content 3: Notifications & Webhooks */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveProfile} className="bg-[#14101a] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#c2ff0c]" />
                Alertes & Integrations Webhook
              </h2>
              <p className="text-xs text-white/40">Recevez des notifications instantanées lors de l'ouverture et la fermeture des positions.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white font-headline">Alertes Sonores (PWA Audio)</p>
                <p className="text-[10px] text-white/40">Joue un signal sonore lors du déclenchement d'un trade ou d'un Stop Loss.</p>
              </div>
              <input
                type="checkbox"
                checked={soundAlerts}
                onChange={(e) => setSoundAlerts(e.target.checked)}
                className="h-5 w-5 accent-[#c2ff0c] cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 font-headline">URL Webhook Discord (Optionnel)</label>
              <input
                type="url"
                value={discordWebhook}
                onChange={(e) => setDiscordWebhook(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c]"
              />
              <p className="text-[10px] text-white/40">Permet d'envoyer chaque ordre de bot directement dans votre serveur Discord.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 font-headline">ID Chat Telegram (Optionnel)</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="@mon_chat_id"
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <Button type="submit" className="bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 font-bold px-6 h-11 rounded-xl">
              Sauvegarder les intégrations
            </Button>
          </div>
        </form>
      )}

      {/* Tab Content 4: Backup & Security */}
      {activeTab === 'backup' && (
        <div className="bg-[#14101a] border border-white/10 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold font-headline text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#c2ff0c]" />
                Sauvegarde & Actions Système
              </h2>
              <p className="text-xs text-white/40">Exportez vos configurations ou réinitialisez vos soldes de test.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-[#c2ff0c]" />
                <h3 className="text-xs font-bold text-white font-headline">Exporter la configuration des Bots</h3>
              </div>
              <p className="text-[11px] text-white/50">Téléchargez un fichier de sauvegarde JSON de tous vos robots configurés et leurs règles IA.</p>
              <Button onClick={handleExportConfig} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs h-10 rounded-xl">
                Télécharger le fichier de sauvegarde (.json)
              </Button>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-400" />
                <h3 className="text-xs font-bold text-white font-headline">Réinitialiser Solde Démo</h3>
              </div>
              <p className="text-[11px] text-white/50">Remet votre solde virtuel de démonstration à 10 000 $ en cas de perte de test.</p>
              <Button onClick={handleResetBalance} className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs h-10 rounded-xl">
                Réinitialiser solde à 10 000 $
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <Button onClick={handleClearSession} variant="ghost" className="text-rose-400 hover:bg-rose-500/10 text-xs font-bold gap-2">
              <LogOut className="h-4 w-4" /> Effacer la session locale
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
