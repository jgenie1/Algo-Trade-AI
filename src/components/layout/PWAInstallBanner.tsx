"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Download, Smartphone, Share, PlusSquare, CheckCircle2 } from 'lucide-react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Detect if running in standalone mode (already installed PWA)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture beforeinstallprompt for Chrome/Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowIOSModal(true);
    }
  };

  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleInstallClick}
        title="Installer l'application PWA"
        aria-label="Installer PWA"
        className="h-10 px-2.5 bg-[#170e28]/80 hover:bg-[#c2ff0c]/15 border border-[#c2ff0c]/30 hover:border-[#c2ff0c]/60 text-[#c2ff0c] rounded-xl flex items-center gap-1.5 shadow-sm transition-all duration-200 shrink-0 group active:scale-95"
      >
        <div className="relative flex items-center justify-center">
          <Smartphone className="h-4 w-4 text-[#c2ff0c] transition-transform duration-200 group-hover:scale-110" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#c2ff0c] animate-pulse shadow-[0_0_6px_#c2ff0c]" />
        </div>
        <span className="hidden xl:inline font-headline font-extrabold text-[10px] uppercase tracking-wider text-white/90">
          PWA
        </span>
      </Button>

      {/* Guide d'installation iOS Safari / Desktop */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="bg-[#140b12] border-emerald-500/30 text-white rounded-3xl p-6 max-w-md shadow-2xl space-y-4 font-body">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="text-xl font-headline font-extrabold text-[#c2ff0c] flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              Installer l&apos;application PWA
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60 font-body mt-1">
              Profitez d&apos;une expérience native sans téléchargement sur l&apos;App Store / Play Store.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-white/80">
            <p className="font-bold text-white">Pour installer l&apos;application sur votre écran d&apos;accueil :</p>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
              <Share className="h-5 w-5 text-sky-400 shrink-0" />
              <span>1. Appuyez sur le bouton <strong>Partager</strong> dans la barre de votre navigateur (Safari / Chrome).</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
              <PlusSquare className="h-5 w-5 text-[#c2ff0c] shrink-0" />
              <span>2. Faites défiler vers le bas et sélectionnez <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong>.</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>3. Confirmez pour lancer l&apos;application en mode plein écran autonome !</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowIOSModal(false)}
              className="w-full h-11 bg-[#c2ff0c] text-black font-extrabold font-headline rounded-2xl text-xs uppercase"
            >
              J&apos;ai Compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
