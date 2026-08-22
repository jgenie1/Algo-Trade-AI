"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { 
  Search, 
  Bell, 
  Settings, 
  ChevronDown, 
  Sparkles,
  Volume2,
  SlidersHorizontal,
  RotateCcw,
  LogOut,
  Info,
  CheckCircle2,
  AlertTriangle,
  User,
  Wallet,
  ShieldCheck,
  Check,
  ExternalLink,
  ArrowDownUp,
  Lock,
  PanelLeft,
  Bot
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppState } from '@/context/AppContext';
import { cn, getUsdHtgRate, fetchLiveUsdHtgRate } from '@/lib/utils';
import PanicKillSwitch from '@/components/layout/PanicKillSwitch';
import PWAInstallBanner from '@/components/layout/PWAInstallBanner';
import { getStoredLanguage, setStoredLanguage, Language } from '@/services/languageService';
import DEXSwapModal from '@/components/wallet/DEXSwapModal';
import BinanceAgentConnectModal from '@/components/wallet/BinanceAgentConnectModal';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { isMobile, state, toggleSidebar } = useSidebar();
  const { 
    tradingMode, 
    setTradingMode, 
    balance, 
    setBalance, 
    reserveVault,
    reserveVaultSol,
    bots, 
    closedPositions, 
    transactions,
    setTransactions 
  } = useAppState();

  const [isMounted, setIsMounted] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAvatar = localStorage.getItem('profile_avatar_url');
      if (storedAvatar) setProfileAvatarUrl(storedAvatar);
    }
  }, []);

  const [liveHtgRate, setLiveHtgRate] = useState<number>(getUsdHtgRate());

  // Connected Web3 Wallet State
  const [connectedWallet, setConnectedWallet] = useState<{
    name: string;
    address: string;
    chain: 'Solana' | 'BSC' | 'Ethereum';
  } | null>(null);

  // Settings State (persisted locally)
  const [rpcUrl, setRpcUrl] = useState('https://rpc.ankr.com/solana');
  const [slippage, setSlippage] = useState('15');
  const [priorityFee, setPriorityFee] = useState('0.001');
  const [minMarginSol, setMinMarginSol] = useState('0.001');
  const [tvWebhookUrl, setTvWebhookUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [customPubKeyInput, setCustomPubKeyInput] = useState('');

  const handleConnectCustomPubKey = () => {
    const trimmed = customPubKeyInput.trim();
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
    setConnectedWallet(w);
    setCustomPubKeyInput('');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));
  };

  useEffect(() => {
    setIsMounted(true);
    fetchLiveUsdHtgRate().then(rate => {
      if (rate && rate > 0) setLiveHtgRate(rate);
    });

    if (typeof window !== 'undefined') {
      const storedRpc = localStorage.getItem('settings_rpc_url');
      const storedSlippage = localStorage.getItem('settings_slippage');
      const storedFee = localStorage.getItem('settings_priority_fee');
      const storedMargin = localStorage.getItem('settings_min_margin_sol');
      const storedWallet = localStorage.getItem('connected_web3_wallet');
      const storedTvUrl = localStorage.getItem('settings_tv_webhook_url');

      if (storedRpc) setRpcUrl(storedRpc);
      if (storedSlippage) setSlippage(storedSlippage);
      if (storedFee) setPriorityFee(storedFee);
      if (storedMargin) setMinMarginSol(storedMargin);
      if (storedTvUrl) setTvWebhookUrl(storedTvUrl);
      if (storedWallet) {
        try { setConnectedWallet(JSON.parse(storedWallet)); } catch (e) {}
      }
    }
  }, []);

  // Real Web3 Browser Wallet Providers Connection Handlers
  const connectPhantomSolana = async () => {
    try {
      const win = window as any;

      const solanaObj =
        win.phantom?.solana ??
        win.solflare ??
        win.backpack ??
        win.okxwallet?.solana ??
        (win.solana?.isPhantom ? win.solana : null) ??
        win.solana;

      if (!solanaObj) {
        alert(
          "Extension Solana introuvable dans votre navigateur.\n\n" +
          "• Installez Phantom : https://phantom.app/\n" +
          "• Si installé, vérifiez que l'extension est activée\n" +
          "• Rafraîchissez la page après activation (F5)"
        );
        return;
      }

      let pubKey: string | undefined;

      if (solanaObj.isConnected && solanaObj.publicKey) {
        pubKey = solanaObj.publicKey.toString();
      } else {
        const resp = await solanaObj.connect();
        pubKey = (resp?.publicKey || solanaObj.publicKey)?.toString();
      }

      if (pubKey) {
        const providerName = solanaObj.isPhantom ? "Phantom Solana" : solanaObj.isSolflare ? "Solflare" : "Portefeuille Solana";
        const w = { name: providerName, address: pubKey, chain: "Solana" as const };
        localStorage.setItem('connected_web3_wallet', JSON.stringify(w));
        setConnectedWallet(w);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));
      }
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("User rejected")) {
        return;
      }
      alert(
        "Erreur de connexion Phantom : " + (err?.message ?? "Erreur inconnue") + "\n\n" +
        "Conseils :\n" +
        "• Assurez-vous que Phantom est déverrouillé\n" +
        "• Si MetaMask est installé, désactivez-le temporairement\n" +
        "• Rafraîchissez la page (F5) et réessayez"
      );
    }
  };

  const connectMetaMaskEVM = async () => {
    try {
      const win = window as any;
      const ethereumObj = win.ethereum || win.coinbaseWalletExtension;
      if (ethereumObj) {
        const accounts = await ethereumObj.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          const providerName = ethereumObj.isMetaMask ? "MetaMask EVM" : ethereumObj.isTrust ? "Trust Wallet EVM" : ethereumObj.isCoinbaseWallet ? "Coinbase Wallet" : "Portefeuille EVM";
          const w = { name: providerName, address: addr, chain: "BSC" as const };
          localStorage.setItem('connected_web3_wallet', JSON.stringify(w));
          setConnectedWallet(w);
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));
          return;
        }
      }
      alert("Extension MetaMask, Trust Wallet ou Coinbase introuvable dans votre navigateur.\n\nVeuillez installer MetaMask (https://metamask.io/) pour vous connecter.");
    } catch (err: any) {
      alert("Erreur de connexion EVM : " + (err.message || err));
    }
  };

  const connectWalletConnect = async () => {
    try {
      const win = window as any;
      if (win.solana || win.solflare) {
        await connectPhantomSolana();
      } else if (win.ethereum) {
        await connectMetaMaskEVM();
      } else {
        alert("WalletConnect Universal : Veuillez ouvrir l'application web depuis le navigateur intégré de Phantom ou MetaMask sur mobile.");
      }
    } catch (err: any) {
      alert("Erreur de connexion Universal : " + (err.message || err));
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('settings_rpc_url', rpcUrl);
    localStorage.setItem('settings_slippage', slippage);
    localStorage.setItem('settings_priority_fee', priorityFee);
    localStorage.setItem('settings_min_margin_sol', minMarginSol);
    if (tvWebhookUrl) localStorage.setItem('settings_tv_webhook_url', tvWebhookUrl.trim());
    setIsSettingsOpen(false);
    alert('Paramètres sauvegardés avec succès.');
  };

  const handleResetBalance = () => {
    if (confirm("Voulez-vous réinitialiser votre solde de démonstration à 10 000 $ ?")) {
      setBalance(10000);
      alert("Solde réinitialisé !");
    }
  };

  const handleLogout = () => {
    if (confirm("Voulez-vous réinitialiser votre session locale ?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isMounted) {
    return <div className="h-14 w-full" />;
  }

  // Construct dynamic notification list from real-time events
  const notifications: { id: string; type: 'info' | 'success' | 'warning'; text: string; time: string }[] = [];

  // 1. Check running bots
  (Array.isArray(bots) ? bots : []).forEach(b => {
    if (!b) return;
    if (b.status === 'RUNNING') {
      const pairStr = b.pair || '';
      const splitPair = pairStr.split(':');
      notifications.push({
        id: `bot_${b.id}`,
        type: 'info',
        text: `Robot "${splitPair[2] || b.strategy || 'Inconnu'}" en cours d'exécution.`,
        time: 'En direct'
      });
    }
  });

  // 2. Check recent transactions
  (Array.isArray(transactions) ? transactions : []).slice(0, 3).forEach(tx => {
    if (!tx) return;
    const txTime = tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récemment';
    notifications.push({
      id: tx.id || `tx_${Math.random()}`,
      type: 'success',
      text: `${tx.type === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} de ${tx.amount || 0} ${tx.currency || ''} complété.`,
      time: txTime
    });
  });

  // 3. Check closed positions
  (Array.isArray(closedPositions) ? closedPositions : []).slice(0, 3).forEach(pos => {
    if (!pos) return;
    const pairStr = pos.pair || '';
    const profitVal = Number(pos.profit) || 0;
    const isSol = pairStr.startsWith('SOL:');
    const posTime = pos.timestamp ? new Date(pos.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récemment';
    notifications.push({
      id: pos.id || `pos_${Math.random()}`,
      type: profitVal >= 0 ? 'success' : 'warning',
      text: `Position close ${pairStr.replace('SOL:', '').replace('FX:', '')} : ${profitVal >= 0 ? '+' : ''}${profitVal.toFixed(2)} ${isSol ? 'SOL' : '$'}`,
      time: posTime
    });
  });

  const activeNotificationsCount = notifications.length;

  return (
    <header 
      className="w-full mb-6 shrink-0 bg-[#0e0a1a]/95 backdrop-blur-2xl border border-white/12 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(194,255,12,0.06)] transition-all duration-300 relative z-30 overflow-x-auto overflow-y-visible max-w-full" 
      suppressHydrationWarning
    >
      {/* Scrollable Ribbon Wrapper for Top Menu Controls */}
      <div className="flex items-center justify-between gap-3 min-h-16 py-2.5 px-3 sm:px-5 min-w-max">
        {/* Left Zone: Sidebar Toggle, Brand Identity & Live USD-HTG Market Rate */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Bouton de réapparition / masquage du menu latéral */}
          <SidebarTrigger 
            className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-[#c2ff0c]/20 text-slate-300 hover:text-[#c2ff0c] border border-white/10 hover:border-[#c2ff0c]/40 transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer shadow-sm active:scale-95" 
            title="Afficher / Réduire le menu latéral (Ctrl+B)" 
          />

          {/* Brand Cyber Identity */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 shrink-0">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#c2ff0c]/15 border border-[#c2ff0c]/40 text-[#c2ff0c] shadow-[0_0_12px_rgba(194,255,12,0.25)]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          <div className="flex flex-col text-left leading-none">
            <span className="font-headline font-black text-xs text-white tracking-wider flex items-center gap-1">
              <span>ALGOTRADE</span> <span className="text-[#c2ff0c]">AI</span>
            </span>
            <span className="text-[8px] font-mono text-purple-300 uppercase tracking-widest font-extrabold mt-0.5">
              PRO TERMINAL
            </span>
          </div>
        </div>

        {/* Live USD -> HTG Market Rate Pill */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-950/50 via-purple-900/30 to-purple-950/50 border border-purple-500/30 text-purple-200 text-xs shadow-inner shrink-0 hover:border-[#c2ff0c]/40 transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-[10px] uppercase font-bold text-white/50 font-headline hidden sm:inline">USD ➔ HTG:</span>
          <span className="font-mono font-black text-[#c2ff0c] text-xs">
            {liveHtgRate.toFixed(2)} HTG
          </span>
        </div>
      </div>

      {/* Center / Mode Switcher & Trading Tools Zone */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-center shrink-0">
        {/* Segmented Mode Switcher (DEMO vs REAL) */}
        <div className="flex items-center p-1 bg-black/60 border border-white/12 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setTradingMode('DEMO')}
            className={cn(
              "px-3 py-1 text-[10px] font-black uppercase font-headline rounded-lg transition-all duration-200 border-none cursor-pointer active:scale-95",
              tradingMode === 'DEMO' 
                ? "bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]" 
                : "text-white/40 hover:text-white"
            )}
          >
            <span className="sm:hidden">DEMO</span>
            <span className="hidden sm:inline">DEMO (Virtuel)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!connectedWallet) {
                alert("⚠️ Attention : Aucun portefeuille Web3 (Phantom/MetaMask) connecté. Connectez votre wallet pour exécuter des trades réels.");
              }
              setTradingMode('REAL');
            }}
            className={cn(
              "px-3 py-1 text-[10px] font-black uppercase font-headline rounded-lg transition-all duration-200 border-none cursor-pointer active:scale-95",
              tradingMode === 'REAL' 
                ? "bg-purple-600/40 text-purple-200 border border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.35)]" 
                : "text-white/40 hover:text-white"
            )}
          >
            <span className="sm:hidden">⚡ RÉEL</span>
            <span className="hidden sm:inline">⚡ RÉEL (Solana)</span>
          </button>
        </div>

        {/* Panic Kill Switch 1-Clic */}
        <PanicKillSwitch />

        {/* Coffre-Fort Intouchable (10% des Gains) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[#c2ff0c] font-headline text-xs shadow-sm shrink-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[#c2ff0c]">
            <Lock className="h-3 w-3" />
          </div>
          <div className="flex flex-col text-left justify-center leading-tight">
            <span className="text-[8px] text-white/50 font-body uppercase font-bold tracking-wider whitespace-nowrap">
              Coffre-Fort
            </span>
            <span className="text-xs font-mono font-black text-[#c2ff0c]">
              {tradingMode === 'REAL' 
                ? `${(Number(reserveVaultSol) || 0).toFixed(2)} SOL` 
                : `$${(Number(reserveVault) || 0).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* DEX Swap Quick Trigger Button */}
        <Button
          onClick={() => setIsSwapOpen(true)}
          className="flex h-9 px-3 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border border-purple-500/40 text-purple-200 font-headline font-black text-xs rounded-xl shadow-md items-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95"
        >
          <ArrowDownUp className="h-3.5 w-3.5 text-[#c2ff0c]" />
          <span className="font-headline uppercase tracking-wide">Swap DEX</span>
        </Button>

        {/* DEX Swap Modal */}
        <DEXSwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />

        {/* Binance Agent OS MCP Connector */}
        <BinanceAgentConnectModal
          triggerButton={
            <Button
              className="flex h-9 px-3 bg-gradient-to-r from-[#f0b90b]/15 to-yellow-950/40 hover:from-[#f0b90b]/25 hover:to-yellow-900/50 border border-[#f0b90b]/40 text-[#f0b90b] font-headline font-black text-xs rounded-xl shadow-md items-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <Bot className="h-3.5 w-3.5 text-[#f0b90b]" />
              <span className="font-headline uppercase tracking-wide">Binance Agent OS</span>
            </Button>
          }
        />
      </div>

      {/* Right Zone: Wallet / Notifications / Settings / Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Web3 Multi-Chain Connect Wallet Button */}
        <Dialog>
          <DialogTrigger asChild>
            {connectedWallet ? (
              <Button
                className="h-9 sm:h-10 px-2.5 sm:px-3 bg-white/5 hover:bg-white/10 border border-emerald-500/40 text-white font-headline font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 sm:gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer active:scale-95"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[11px] sm:text-xs font-semibold text-emerald-400">
                  {connectedWallet.address.slice(0, 3)}..{connectedWallet.address.slice(-3)}
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-headline uppercase font-bold hidden sm:inline">
                  {connectedWallet.chain}
                </span>
              </Button>
            ) : (
              <Button
                className="h-9 sm:h-10 px-3 sm:px-4 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-headline font-black text-xs rounded-xl shadow-[0_0_20px_rgba(147,51,247,0.4)] hover:shadow-[0_0_28px_rgba(147,51,247,0.65)] flex items-center gap-2 border border-purple-400/40 transition-all cursor-pointer active:scale-95"
              >
                <Wallet className="h-4 w-4 text-[#c2ff0c] animate-pulse" />
                <span>Connecter Wallet</span>
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="bg-[#14101a] border-white/10 text-white rounded-2xl max-w-md shadow-2xl space-y-4">
            <DialogHeader>
              <DialogTitle className="font-headline text-base text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#c2ff0c]" />
                  <span>Connecteur Web3 Multi-Chain</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-headline font-bold uppercase">
                  Secured
                </span>
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs font-body">
                Connectez votre portefeuille d&apos;actifs numériques pour exécuter des ordres réels et transférer vos bénéfices.
              </DialogDescription>
            </DialogHeader>

            {connectedWallet ? (
              <div className="space-y-4 pt-1 font-body">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 font-headline uppercase">Statut : Portefeuille Connecté</span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {connectedWallet.chain}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/50 uppercase font-headline">Adresse Publique</p>
                    <p className="font-mono text-xs text-white break-all bg-black/40 p-2 rounded-lg border border-white/5">
                      {connectedWallet.address}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-white/50 uppercase font-headline">Fournisseur Web3</p>
                    <p className="text-xs font-bold text-purple-300">{connectedWallet.name}</p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    localStorage.removeItem('connected_web3_wallet');
                    setConnectedWallet(null);
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));
                  }}
                  variant="outline"
                  className="w-full h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 font-headline text-xs font-bold rounded-xl cursor-pointer"
                >
                  Déconnecter Portefeuille Web3
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-1 font-body">
                <button
                  onClick={connectPhantomSolana}
                  className="w-full p-3.5 bg-white/5 hover:bg-purple-900/30 border border-white/10 hover:border-purple-500/50 rounded-xl flex items-center justify-between transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300 text-xs shadow-md">
                      SOL
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white group-hover:text-[#c2ff0c]">Phantom / Solflare / Backpack</p>
                      <p className="text-[10px] text-white/40 font-mono">Solana Mainnet (window.phantom.solana)</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#c2ff0c]/10 text-[#c2ff0c] group-hover:bg-[#c2ff0c] group-hover:text-black font-bold px-2.5 py-1 rounded-lg transition-all">
                    Connecter
                  </span>
                </button>

                <button
                  onClick={connectMetaMaskEVM}
                  className="w-full p-3.5 bg-white/5 hover:bg-amber-900/20 border border-white/10 hover:border-amber-500/40 rounded-xl flex items-center justify-between transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-xs shadow-md">
                      BSC
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white group-hover:text-[#c2ff0c]">MetaMask / Trust Wallet</p>
                      <p className="text-[10px] text-white/40 font-mono">Binance Smart Chain (eth_requestAccounts)</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 group-hover:bg-[#c2ff0c] group-hover:text-black font-bold px-2.5 py-1 rounded-lg transition-all">
                    Connecter
                  </span>
                </button>

                <button
                  onClick={connectWalletConnect}
                  className="w-full p-3.5 bg-white/5 hover:bg-blue-900/20 border border-white/10 hover:border-blue-500/40 rounded-xl flex items-center justify-between transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-900/50 border border-blue-500/30 flex items-center justify-center font-bold text-blue-300 text-xs shadow-md">
                      WC
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white group-hover:text-[#c2ff0c]">WalletConnect Universal</p>
                      <p className="text-[10px] text-white/40 font-mono">Lien Web3 Mobile App</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-blue-500/10 text-blue-300 group-hover:bg-[#c2ff0c] group-hover:text-black font-bold px-2.5 py-1 rounded-lg transition-all">
                    Scanner
                  </span>
                </button>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <label className="text-[11px] font-bold text-emerald-400 font-headline flex items-center gap-1.5">
                    <span>🔑</span> Ou Coller une Adresse Publique Solana :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 7xKX... (Adresse Solana Base58)"
                      value={customPubKeyInput}
                      onChange={(e) => setCustomPubKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConnectCustomPubKey();
                      }}
                      className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#c2ff0c]"
                    />
                    <Button
                      type="button"
                      onClick={handleConnectCustomPubKey}
                      className="h-10 px-3.5 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-headline text-xs font-extrabold rounded-xl shrink-0 cursor-pointer"
                    >
                      Connecter
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/40 font-body">
                    Connecte n&apos;importe quel portefeuille Solana en lecture pour suivre le solde SOL en temps réel.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bouton d'Installation PWA App (Desktop & Tablet) */}
        <div className="hidden sm:block">
          <PWAInstallBanner />
        </div>

        {/* Sélecteur Multi-Langues FR / HT / EN (Desktop) */}
        <select
          value={getStoredLanguage()}
          onChange={(e) => {
            setStoredLanguage(e.target.value as Language);
            window.location.reload();
          }}
          className="hidden md:block h-9 sm:h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-2 text-xs font-bold text-white font-headline shrink-0 transition-colors cursor-pointer focus:outline-none"
        >
          <option value="FR" className="bg-[#14101a]">🇫🇷 FR</option>
          <option value="HT" className="bg-[#14101a]">🇭🇹 HT</option>
          <option value="EN" className="bg-[#14101a]">🇺🇸 EN</option>
        </select>

        {/* 1. Notification Dropdown (Bell) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200 relative shrink-0 cursor-pointer active:scale-95"
            >
              <Bell className="h-4 w-4" />
              {activeNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-black animate-pulse" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-[#14101a] border-white/10 text-white rounded-xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-white/70">Flux de Notifications</h3>
              <span className="text-[10px] bg-[#c2ff0c]/15 text-[#c2ff0c] font-bold px-2 py-0.5 rounded-full">
                {activeNotificationsCount} Événements
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6 font-body">Aucune notification récente.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="flex gap-2.5 p-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs font-body hover:bg-white/[0.04] transition-all">
                    {n.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : n.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <p className="text-white/80 leading-normal">{n.text}</p>
                      <span className="text-[9px] text-white/30 block font-mono">{n.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 2. Settings Modal (Gear) - Desktop */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="hidden sm:flex h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200 shrink-0 cursor-pointer active:scale-95"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#14101a] border-white/10 text-white rounded-2xl max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-lg text-white flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#c2ff0c]" />
                Configuration du Terminal
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs font-body">
                Ajustez les paramètres de connexion RPC et de gaz pour vos trades on-chain.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveSettings} className="space-y-4 pt-2 font-body">
              {/* RPC Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Point de terminaison RPC Solana (Mainnet)</label>
                <input
                  type="text"
                  required
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value)}
                  placeholder="Collez l'URL de votre nœud RPC"
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                />
              </div>

              {/* Slippage & Gas & Margin settings */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Slippage (%)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Frais Priorité (SOL)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={priorityFee}
                    onChange={(e) => setPriorityFee(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Marge Min (SOL)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={minMarginSol}
                    onChange={(e) => setMinMarginSol(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* TradingView Webhook URL Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-[#c2ff0c] font-headline">URL Webhook TradingView (Receveur de Signaux)</label>
                <input
                  type="text"
                  value={tvWebhookUrl}
                  onChange={(e) => setTvWebhookUrl(e.target.value)}
                  placeholder="https://votre-domaine.com/api/tradingview-webhook"
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                />
              </div>

              <div className="border-t border-white/5 pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 bg-white/5 text-white/60 hover:text-white cursor-pointer"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 font-bold cursor-pointer"
                >
                  Sauvegarder
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* 3. User Profile Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 sm:pr-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200 cursor-pointer select-none active:scale-95">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border border-white/15">
                <AvatarImage src={profileAvatarUrl} />
                <AvatarFallback className="bg-white/10 text-white text-xs font-bold">DO</AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-white leading-tight">David Owner</p>
                <p className="text-[10px] text-white/50 leading-tight font-mono">admin@trade.ai</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-white/55 hidden lg:block ml-1" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 bg-[#14101a] border-white/10 text-white rounded-xl shadow-2xl p-1.5 font-body z-50">
            <DropdownMenuLabel className="font-headline text-[10px] text-white/30 uppercase tracking-widest px-3.5 py-2">
              Menu & Contrôles Rapides
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            
            <DropdownMenuItem asChild className="px-3.5 py-2.5 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2.5">
              <Link href="/profile" className="flex items-center gap-2.5 w-full">
                <User className="h-4 w-4 text-[#c2ff0c]" />
                <span className="font-semibold">Mon Profil</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="px-3.5 py-2.5 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2.5">
              <Link href="/settings" className="flex items-center gap-2.5 w-full">
                <Settings className="h-4 w-4 text-purple-400" />
                <span>Paramètres Système</span>
              </Link>
            </DropdownMenuItem>

            {/* Quick DEX Swap trigger on mobile */}
            <DropdownMenuItem 
              onClick={() => setIsSwapOpen(true)}
              className="px-3.5 py-2.5 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2.5 md:hidden"
            >
              <ArrowDownUp className="h-4 w-4 text-sky-400" />
              <span>Swap DEX Express</span>
            </DropdownMenuItem>

            {/* Quick Settings trigger on mobile */}
            <DropdownMenuItem 
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2.5 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2.5 sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#c2ff0c]" />
              <span>Config RPC & Slippage</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            {/* Toggle Trading Mode */}
            <DropdownMenuItem 
              onClick={() => {
                if (tradingMode === 'DEMO' && !connectedWallet) {
                  alert("⚠️ Attention: Aucun portefeuille Web3 (Phantom/MetaMask) n'est actuellement connecté. Veuillez connecter votre portefeuille pour exécuter des trades réels.");
                }
                setTradingMode(prev => prev === 'DEMO' ? 'REAL' : 'DEMO');
              }}
              className="px-3.5 py-2.5 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex justify-between items-center"
            >
              <span className="font-medium">Mode de Trading</span>
              <span className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                tradingMode === 'REAL' ? "bg-purple-500/20 text-purple-300" : "bg-amber-500/20 text-amber-300"
              )}>
                {tradingMode}
              </span>
            </DropdownMenuItem>

            {/* Reset Balance */}
            <DropdownMenuItem 
              onClick={handleResetBalance}
              className="px-3.5 py-2.5 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2.5"
            >
              <RotateCcw className="h-4 w-4 text-white/40" />
              <span>Réinitialiser Solde Démo</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            {/* Logout/Reset */}
            <DropdownMenuItem 
              onClick={handleLogout}
              className="px-3.5 py-2.5 hover:bg-red-500/10 rounded-lg focus:bg-red-500/10 text-rose-400 focus:text-rose-300 cursor-pointer text-xs flex items-center gap-2.5"
            >
              <LogOut className="h-4 w-4 text-rose-400" />
              <span>Déconnexion Session</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
  );
}
