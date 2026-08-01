"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Check, RefreshCw, RotateCcw, Radio, SlidersHorizontal, Globe } from 'lucide-react';
import { SOL_USD_RATE, getUsdHtgRate, fetchLiveUsdHtgRate } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import CEXKeyManager from '@/components/CEXKeyManager';
import SettingsNotificationsCard from '@/components/SettingsNotificationsCard';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings, dispatchAlert } from '@/services/notificationService';

export default function SettingsPage() {
  const { setBalance } = useAppState();
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [rpcUrl, setRpcUrl] = useState<string>('https://solana-mainnet.core.chainstack.com/39a622a578bd62b');
  const [slippage, setSlippage] = useState<string>('15');
  const [priorityFee, setPriorityFee] = useState<string>('0.005');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');

  const [usdHtgRate, setUsdHtgRate] = useState<number>(132);
  const [isSyncingRate, setIsSyncingRate] = useState<boolean>(false);

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
    await dispatchAlert("Alerte Test", "Système opérationnel !", "TEST");
    setIsTestingNotif(false);
  };

  const handleResetDemo = () => {
    if (confirm("Réinitialiser le solde virtuel à 10,000 $ ?")) {
      setBalance(10000);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-[#c2ff0c]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      <div className="border-b border-white/5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline flex items-center gap-2.5">
            <Settings className="h-8 w-8 text-[#c2ff0c]" />
            Configuration Globale Du Système
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Paramétrez vos connexions, clés CEX et alertes.</p>
        </div>

        <Button onClick={handleResetDemo} variant="outline" className="h-10 px-4 bg-white/5 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold font-headline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser Démo (10k $)
        </Button>
      </div>

      <CEXKeyManager />

      <form onSubmit={handleSaveAllSettings} className="space-y-6">
        <SettingsNotificationsCard
          notifSettings={notifSettings}
          setNotifSettings={setNotifSettings}
          handleTestNotification={handleTestNotification}
          isTestingNotif={isTestingNotif}
        />

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

        <Button type="submit" className="w-full h-12 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-extrabold font-headline rounded-xl text-sm">
          {isSaved ? 'Enregistré avec succès !' : 'Sauvegarder Tous Les Paramètres'}
        </Button>
      </form>
    </div>
  );
}
