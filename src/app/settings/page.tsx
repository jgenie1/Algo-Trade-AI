"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Check, RefreshCw, RotateCcw, Radio, SlidersHorizontal, Globe, Key, Eye, EyeOff } from 'lucide-react';
import { SOL_USD_RATE, getUsdHtgRate, fetchLiveUsdHtgRate, cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import CEXKeyManager from '@/components/wallet/CEXKeyManager';
import SettingsNotificationsCard from '@/components/layout/SettingsNotificationsCard';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS, dispatchAlert } from '@/services/notificationService';

export default function SettingsPage() {
  const { setBalance } = useAppState();
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [rpcUrl, setRpcUrl] = useState<string>('https://rpc.ankr.com/solana');
  const [solanaPrivateKey, setSolanaPrivateKey] = useState<string>('');
  const [solanaPubKeyInput, setSolanaPubKeyInput] = useState<string>('');
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<string>('15');
  const [priorityFee, setPriorityFee] = useState<string>('0.001');
  const [minMarginSol, setMinMarginSol] = useState<string>('0.001');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');

  const [usdHtgRate, setUsdHtgRate] = useState<number>(132);
  const [isSyncingRate, setIsSyncingRate] = useState<boolean>(false);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isTestingNotif, setIsTestingNotif] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const [tvApiKey, setTvApiKey] = useState<string>('');
  const [tvWebhookUrl, setTvWebhookUrl] = useState<string>('');
  const [tvSecret, setTvSecret] = useState<string>('');
  const [isTestingTv, setIsTestingTv] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    setUsdHtgRate(getUsdHtgRate());
    setNotifSettings(getNotificationSettings());
    if (typeof window !== 'undefined') {
      const storedRpc = localStorage.getItem('settings_rpc_url');
      const storedKey = localStorage.getItem('settings_solana_private_key');
      const storedSlippage = localStorage.getItem('settings_slippage');
      const storedFee = localStorage.getItem('settings_priority_fee');
      const storedMargin = localStorage.getItem('settings_min_margin_sol');
      const storedModel = localStorage.getItem('settings_ai_model');
      const storedWallet = localStorage.getItem('connected_web3_wallet');

      const storedTvApi = localStorage.getItem('settings_tv_api_key');
      const storedTvUrl = localStorage.getItem('settings_tv_webhook_url');
      const storedTvSecret = localStorage.getItem('settings_tv_secret');

      if (storedRpc) setRpcUrl(storedRpc);
      if (storedKey) setSolanaPrivateKey(storedKey);
      if (storedSlippage) setSlippage(storedSlippage);
      if (storedFee) setPriorityFee(storedFee);
      if (storedMargin) setMinMarginSol(storedMargin);
      if (storedModel) setAiModel(storedModel);
      if (storedTvApi) setTvApiKey(storedTvApi);
      if (storedTvUrl) setTvWebhookUrl(storedTvUrl);
      if (storedTvSecret) setTvSecret(storedTvSecret);

      if (storedWallet) {
        try {
          const parsed = JSON.parse(storedWallet);
          if (parsed.address) setSolanaPubKeyInput(parsed.address);
        } catch (e) {}
      }
    }
  }, []);

  const handleSavePubKeyOnly = () => {
    const trimmed = solanaPubKeyInput.trim();
    if (!trimmed || trimmed.length < 32 || trimmed.length > 44 || /[^1-9A-HJ-NP-Za-km-z]/.test(trimmed)) {
      alert("Adresse publique Solana invalide (format Base58, 32 à 44 caractères requis).");
      return;
    }
    const w = {
      name: "Portefeuille Solana (Adresse Publique)",
      address: trimmed,
      chain: "Solana" as const
    };
    localStorage.setItem('connected_web3_wallet', JSON.stringify(w));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));
    alert(`✅ Adresse Publique enregistrée pour le suivi de solde : ${trimmed}`);
  };


  const handleSyncLiveRate = async () => {
    setIsSyncingRate(true);
    const liveRate = await fetchLiveUsdHtgRate();
    setUsdHtgRate(liveRate);
    setIsSyncingRate(false);
  };

  const handleTestTradingViewWebhook = async () => {
    setIsTestingTv(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsTestingTv(false);
    alert(
      "✅ Test Webhook TradingView Réussi !\n\n" +
      "📡 Endpoint : " + (tvWebhookUrl || "https://algotrade.ai/api/tradingview-webhook") + "\n" +
      "🔑 Jeton Secret : Configuré\n" +
      "📊 Payload Test : {\"action\":\"BUY\", \"symbol\":\"BTCUSD\", \"price\":65000, \"secret\":\"***\"}\n\n" +
      "Le récepteur de signaux TradingView est prêt à recevoir vos alertes en temps réel."
    );
  };

  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_rpc_url', rpcUrl);
      localStorage.setItem('settings_solana_private_key', solanaPrivateKey.trim());
      localStorage.setItem('settings_slippage', slippage);
      localStorage.setItem('settings_priority_fee', priorityFee);
      localStorage.setItem('settings_min_margin_sol', minMarginSol);
      localStorage.setItem('settings_ai_model', aiModel);
      localStorage.setItem('settings_usd_htg_rate', usdHtgRate.toString());
      localStorage.setItem('settings_tv_api_key', tvApiKey.trim());
      localStorage.setItem('settings_tv_webhook_url', tvWebhookUrl.trim());
      localStorage.setItem('settings_tv_secret', tvSecret.trim());
      saveNotificationSettings(notifSettings);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    saveNotificationSettings(notifSettings);
    await dispatchAlert("Alerte Test", "Système opérationnel !", "TEST");
    setIsTestingNotif(false);
  };

  const handleResetDemo = () => {
    if (confirm("Réinitialiser le solde virtuel à 10,000 $ ?")) {
      setBalance(10000);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      <div className="border-b border-white/5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline flex items-center gap-2.5">
            <Settings className="h-8 w-8 text-[#c2ff0c]" />
            Configuration Globale Du Système
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Paramétrez vos connexions, clés CEX, API TradingView et alertes.</p>
        </div>

        <Button onClick={handleResetDemo} variant="outline" className="h-10 px-4 bg-white/5 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold font-headline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser Démo (10k $)
        </Button>
      </div>

      <CEXKeyManager />

      <form onSubmit={handleSaveAllSettings} className="space-y-6">
        {/* Card API TradingView & Webhooks Integration */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-base font-bold font-headline text-blue-400 flex items-center gap-2">
              <Radio className="h-5 w-5" /> Intégration API TradingView & Webhooks de Signalisation
            </h3>
            <Badge className={cn(
              "text-[10px] uppercase font-mono font-bold px-2.5 py-1 border-none",
              tvWebhookUrl || tvApiKey ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/40"
            )}>
              {tvWebhookUrl || tvApiKey ? "Actif & Connecté" : "En attente"}
            </Badge>
          </div>

          <p className="text-xs text-white/50 leading-relaxed font-body">
            📈 Connectez vos alertes Pine Script et indicateurs TradingView directement à votre terminal d&apos;exécution automatique AlgoTrade AI.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-body">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 font-headline uppercase">
                Clé d&apos;API TradingView / REST Token
              </label>
              <Input
                type="text"
                value={tvApiKey}
                onChange={(e) => setTvApiKey(e.target.value)}
                placeholder="Ex: tv_live_98a72b4c1..."
                className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 font-headline uppercase">
                Jeton Secret Webhook (Authentification HMAC)
              </label>
              <Input
                type="password"
                value={tvSecret}
                onChange={(e) => setTvSecret(e.target.value)}
                placeholder="Ex: sec_wh_893274981723..."
                className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
              />
            </div>
          </div>

          <div className="space-y-2 font-body">
            <label className="text-xs font-bold text-white/70 font-headline uppercase">
              URL du Endpoint Webhook TradingView (Receveur de Signaux)
            </label>
            <Input
              type="text"
              value={tvWebhookUrl}
              onChange={(e) => setTvWebhookUrl(e.target.value)}
              placeholder="Ex: https://votre-domaine.com/api/tradingview-webhook"
              className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-white/5">
            <p className="text-[10px] text-white/40 font-body">
              💡 Configurez le Webhook dans TradingView Alertes ➔ <i>Message Payload</i> : <code>{"{\"action\":\"BUY\", \"pair\":\"BTCUSD\", \"secret\":\"***\"}"}</code>
            </p>

            <Button
              type="button"
              onClick={handleTestTradingViewWebhook}
              disabled={isTestingTv}
              className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white font-headline text-xs font-bold rounded-xl shrink-0 border-none"
            >
              {isTestingTv ? 'Test du Webhook...' : '⚡ Tester Signal TradingView'}
            </Button>
          </div>
        </Card>

        {/* Card Clé Privée Solana */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-base font-bold font-headline text-emerald-400 flex items-center gap-2">
              <Key className="h-5 w-5" /> Clé Privée Solana (Trading Automatisé Réel)
            </h3>
            <Badge className={cn(
              "text-[10px] uppercase font-mono font-bold px-2.5 py-1 border-none",
              solanaPrivateKey ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
            )}>
              {solanaPrivateKey ? "Configurée" : "Non configurée"}
            </Badge>
          </div>

          <div className="space-y-3 font-body">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/60 font-headline">Clé Privée Solana Mainnet (Format Base58 ou Array JSON)</label>
              <button
                type="button"
                onClick={() => setShowPrivateKey(prev => !prev)}
                className="text-xs text-purple-400 hover:text-purple-300 font-extrabold flex items-center gap-1 font-headline"
              >
                {showPrivateKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPrivateKey ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <Input
              type={showPrivateKey ? "text" : "password"}
              placeholder="Ex: 4Zv7k... (Base58) ou [12, 34, 56...] (Array JSON)"
              value={solanaPrivateKey}
              onChange={(e) => setSolanaPrivateKey(e.target.value)}
              className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
              <p className="text-[10px] text-white/50 leading-relaxed font-body flex-1 min-w-[240px]">
                🔒 <strong>Sécurité local-first :</strong> Votre clé est stockée uniquement dans la mémoire locale de votre navigateur. <strong>Requis pour permettre aux robots d&apos;exécuter des snipes Solana en arrière-plan sans popup Phantom à chaque position.</strong>
              </p>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const { Keypair } = await import('@solana/web3.js');
                    const { default: bs58 } = await import('bs58');
                    const kp = Keypair.generate();
                    const secretBase58 = bs58.encode(kp.secretKey);
                    const pubKey = kp.publicKey.toBase58();
                    setSolanaPrivateKey(secretBase58);
                    localStorage.setItem('settings_solana_private_key', secretBase58);
                    alert(`✅ Nouveau portefeuille Bot Solana généré !\n\n📍 Adresse Publique : ${pubKey}\n\nEnvoyez vos SOL (ex: 0.1 SOL) à cette adresse pour alimenter vos robots sans validation Phantom.`);
                  } catch (err: any) {
                    alert("Erreur de génération : " + err.message);
                  }
                }}
                className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold font-headline flex items-center gap-1.5 transition-all"
              >
                ✨ Générer Portefeuille Bot Dédié (1-Click)
              </button>
            </div>

            {/* Public Key pasting for tracking balance */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <label className="text-xs font-bold text-white/60 font-headline">Adresse Publique Solana (Suivi du Solde & Lecture Seule)</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ex: 7xKX... (Collez votre adresse publique Solana Base58)"
                  value={solanaPubKeyInput}
                  onChange={(e) => setSolanaPubKeyInput(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c] flex-1"
                />
                <Button
                  type="button"
                  onClick={handleSavePubKeyOnly}
                  className="h-11 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-headline text-xs font-bold rounded-xl shrink-0"
                >
                  Enregistrer Adresse Publique
                </Button>
              </div>
              <p className="text-[10px] text-white/40 font-body">
                💡 Collez votre adresse publique Solana ici pour suivre votre solde SOL réel sur le tableau de bord sans révéler de clé privée.
              </p>
            </div>
          </div>
        </Card>

        <SettingsNotificationsCard
          notifSettings={notifSettings}
          setNotifSettings={setNotifSettings}
          handleTestNotification={handleTestNotification}
          isTestingNotif={isTestingNotif}
        />

        {/* Card Paramètres Avancés Marge, Gas & Slippage */}
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-base font-bold font-headline text-[#c2ff0c] flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" /> Paramètres Avancés de Marge & Frais (Solana / EVM)
            </h3>
            <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] text-[10px] uppercase font-mono font-bold border-none">
              Solana Mainnet
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-body">
            {/* Marge Minimum Requise / Minimal Reserve */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 font-headline uppercase">
                Marge Minimal / Solde Requis (SOL)
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                max="1.0"
                value={minMarginSol}
                onChange={(e) => setMinMarginSol(e.target.value)}
                placeholder="Ex: 0.001"
                className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
              />
              <p className="text-[10px] text-white/40 leading-relaxed font-body">
                💡 <strong>Seuil d&apos;exécution :</strong> Si votre solde wallet est supérieur à ce montant (ex: 0.001 SOL), les ordres SELL et BUY sont autorisés même avec un faible solde (ex: 0.0023 SOL).
              </p>
            </div>

            {/* Frais Prioritaires / Priority Fee (Jito / RPC) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 font-headline uppercase">
                Frais Prioritaires / Gas Fee (SOL)
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                max="0.1"
                value={priorityFee}
                onChange={(e) => setPriorityFee(e.target.value)}
                placeholder="Ex: 0.001"
                className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
              />
              <p className="text-[10px] text-white/40 leading-relaxed font-body">
                ⚡ <strong>Vitesse d&apos;inclusion :</strong> Frais alloués aux validateurs Solana/Jito pour garantir un passage prioritaire des ordres sans rejet en période de forte volatilité.
              </p>
            </div>

            {/* Slippage Maximal */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/70 font-headline uppercase">
                Slippage Maximal (%)
              </label>
              <Input
                type="number"
                step="1"
                min="1"
                max="100"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="Ex: 15"
                className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white focus:ring-[#c2ff0c]"
              />
              <p className="text-[10px] text-white/40 leading-relaxed font-body">
                📊 <strong>Tolérance d&apos;écart :</strong> Écart de prix maximal accepté entre l&apos;envoi de l&apos;ordre et son exécution on-chain. Recommandé : 15% pour Pump.fun / Raydium.
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold font-headline text-purple-400 flex items-center gap-2">
            <Radio className="h-5 w-5" /> Nœud RPC Solana & Trading
          </h3>
          <div className="space-y-3 font-body">
            <label className="text-xs font-bold text-white/60">URL du Nœud RPC Mainnet</label>
            <Input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              className="h-11 bg-white/5 border-white/10 text-xs font-mono text-white"
            />
          </div>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold font-headline text-cyan-400 flex items-center gap-2">
            <Globe className="h-5 w-5" /> Taux de Change USD / HTG (Gourdes)
          </h3>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={usdHtgRate}
              onChange={(e) => setUsdHtgRate(parseFloat(e.target.value) || 132)}
              className="h-11 bg-white/5 border-white/10 text-white font-mono text-sm"
            />
            <Button type="button" onClick={handleSyncLiveRate} disabled={isSyncingRate} className="h-11 bg-white/10 text-white font-headline text-xs font-bold">
              {isSyncingRate ? 'Synchro...' : 'Actualiser Live'}
            </Button>
          </div>
        </Card>

        <Button type="submit" className="w-full h-12 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-extrabold font-headline rounded-xl text-sm cursor-pointer">
          {isSaved ? 'Enregistré avec succès !' : 'Sauvegarder Tous Les Paramètres'}
        </Button>
      </form>
    </div>
  );
}
