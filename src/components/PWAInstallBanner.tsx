"use client";

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is running in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    // Catch install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalledSuccess(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers or desktop manual instruction
      alert("Pour installer AlgoTrade ERP sur votre appareil :\n\n- Sur Chrome/Edge : Cliquez sur l'icône d'installation dans la barre d'adresse (ou Menu > Installer AlgoTrade ERP).\n- Sur Safari iOS : Cliquez sur Partager > Sur l'écran d'accueil.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalledSuccess(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (isStandalone) {
    return (
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#c2ff0c]/10 border border-[#c2ff0c]/20 rounded-lg text-[10px] text-[#c2ff0c] font-mono font-bold uppercase">
        <CheckCircle2 className="h-3 w-3" />
        PWA Mode Actif
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleInstallClick}
        className="h-8 px-3 text-[10px] bg-[#c2ff0c]/10 hover:bg-[#c2ff0c]/20 text-[#c2ff0c] border border-[#c2ff0c]/20 rounded-xl font-headline uppercase font-bold flex items-center gap-1.5 transition-all duration-300 shadow-[0_0_15px_rgba(194,255,12,0.15)]"
      >
        <Download className="h-3.5 w-3.5 animate-bounce" />
        <span>Installer App PWA</span>
      </Button>

      {showBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-[#14101a] border border-[#c2ff0c]/30 rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#c2ff0c]/15 text-[#c2ff0c] rounded-xl">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-headline">Installer AlgoTrade ERP</h4>
                <p className="text-[10px] text-white/50 font-body">Utilisez l'application en mode natif avec support hors-ligne.</p>
              </div>
            </div>
            <button onClick={() => setShowBanner(false)} className="text-white/40 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Button
            onClick={handleInstallClick}
            className="w-full h-9 bg-[#c2ff0c] text-black font-headline font-bold text-xs rounded-xl uppercase hover:shadow-[0_0_15px_rgba(194,255,12,0.4)] border-none"
          >
            Installer Maintenant (Desktop / Mobile)
          </Button>
        </div>
      )}
    </div>
  );
}
