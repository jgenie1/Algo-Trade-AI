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
  PanelLeft
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppState } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import PanicKillSwitch from '@/components/PanicKillSwitch';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { getStoredLanguage, setStoredLanguage, Language } from '@/services/languageService';
import DEXSwapModal from '@/components/DEXSwapModal';
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

  // Connected Web3 Wallet State
  const [connectedWallet, setConnectedWallet] = useState<{
    name: string;
    address: string;
    chain: 'Solana' | 'BSC' | 'Ethereum';
  } | null>(null);

  // Settings State (persisted locally)
  const [rpcUrl, setRpcUrl] = useState('https://solana-mainnet.core.chainstack.com/39a622a578bd62b');
  const [slippage, setSlippage] = useState('15');
  const [priorityFee, setPriorityFee] = useState('0.005');
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
    if (typeof window !== 'undefined') {
      const storedRpc = localStorage.getItem('settings_rpc_url');
      const storedSlippage = localStorage.getItem('settings_slippage');
      const storedFee = localStorage.getItem('settings_priority_fee');
      const storedWallet = localStorage.getItem('connected_web3_wallet');

      if (storedRpc) setRpcUrl(storedRpc);
      if (storedSlippage) setSlippage(storedSlippage);
      if (storedFee) setPriorityFee(storedFee);
      if (storedWallet) {
        try { setConnectedWallet(JSON.parse(storedWallet)); } catch (e) {}
      }
    }
  }, []);

  // Real Web3 Browser Wallet Providers Connection Handlers
  const connectPhantomSolana = async () => {
    try {
      const win = window as any;

      // Priority: window.phantom.solana first (Phantom's safe namespace).
      // window.solana can be overridden by MetaMask Snaps — always check window.phantom?.solana first.
      const solanaObj =
        win.phantom?.solana ??         // Phantom's own namespace (most reliable)
        win.solflare ??                 // Solflare
        win.backpack ??                 // Backpack
        win.okxwallet?.solana ??        // OKX Wallet
        (win.solana?.isPhantom ? win.solana : null) ?? // window.solana only if it's really Phantom
        win.solana;                     // last resort

      if (!solanaObj) {
        alert(
          "Extension Solana introuvable dans votre navigateur.\n\n" +
          "• Installez Phantom : https://phantom.app/\n" +
          "• Si installé, vérifiez que l'extension est activée\n" +
          "• Rafraîchissez la page après activation (F5)"
        );
        return;
      }

      // Step 1: if already connected, read publicKey directly (no popup needed)
      // Step 2: otherwise call connect() with NO options — { onlyIfTrusted } is deprecated and causes errors
      let pubKey: string | undefined;

      if (solanaObj.isConnected && solanaObj.publicKey) {
        // Already authorized — just read the key
        pubKey = solanaObj.publicKey.toString();
      } else {
        let resp: any;
        try {
          resp = await solanaObj.connect();
        } catch (connectErr: any) {
          const code = connectErr?.code ?? connectErr?.error?.code;
          const msg = (connectErr?.message ?? '').toLowerCase();
          if (code === 4001 || msg.includes('user rejected') || msg.includes('cancelled') || msg.includes('denied')) {
            return; // User closed/rejected popup — silent ignore
          }
          throw connectErr;
        }
        if (resp?.publicKey) {
          pubKey = resp.publicKey.toString();
        } else if (solanaObj.publicKey) {
          pubKey = solanaObj.publicKey.toString();
        }
      }

      if (!pubKey) {
        alert("Connexion réussie mais clé publique introuvable. Vérifiez que votre compte Phantom est actif puis réessayez.");
        return;
      }

      const providerName = solanaObj.isPhantom
        ? "Phantom Solana"
        : solanaObj.isSolflare
        ? "Solflare Solana"
        : solanaObj.isBackpack
        ? "Backpack Solana"
        : "Solana Web3 Wallet";

      const w = { name: providerName, address: pubKey, chain: "Solana" as const };
      localStorage.setItem('connected_web3_wallet', JSON.stringify(w));
      setConnectedWallet(w);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));

    } catch (err: any) {
      console.error('[Wallet] Phantom connection error:', err);
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
  (bots || []).forEach(b => {
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
  (transactions || []).slice(0, 3).forEach(tx => {
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
  (closedPositions || []).slice(0, 3).forEach(pos => {
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
      className="flex h-16 items-center justify-between gap-2 max-w-full bg-[#100d16]/80 backdrop-blur-xl border border-white/10 rounded-2xl px-2.5 sm:px-4 w-full mb-6 shrink-0 shadow-xl shadow-black/40 overflow-x-auto no-scrollbar" 
      suppressHydrationWarning
    >
      {/* Left Zone: Navigation Toggle / Search / Live Status */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Explicit Sidebar Show/Hide Toggle Button */}
        <Button
          type="button"
          onClick={toggleSidebar}
          className={cn(
            "h-10 px-3 font-headline font-bold text-xs rounded-xl flex items-center gap-2 transition-all shrink-0 shadow-sm border",
            state === "expanded"
              ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white"
              : "bg-[#c2ff0c]/15 hover:bg-[#c2ff0c]/25 border-[#c2ff0c]/50 text-[#c2ff0c] shadow-[0_0_15px_rgba(194,255,12,0.3)] animate-pulse"
          )}
          title={state === "expanded" ? "Masquer le menu latéral (Ctrl+B)" : "Afficher le menu latéral (Ctrl+B)"}
        >
          <PanelLeft className="h-4 w-4 text-[#c2ff0c]" />
          <span className="hidden sm:inline font-headline text-[11px] uppercase tracking-wider font-extrabold">
            {state === "expanded" ? "Masquer" : "Afficher Menu"}
          </span>
        </Button>
        
        {/* Search Bar */}
        <div className="relative w-32 md:w-44 lg:w-56 hidden sm:block shrink-0">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="w-full h-10 pl-10 pr-10 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#c2ff0c]/50 transition-all duration-200"
            disabled
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-medium bg-white/10 border border-white/15 rounded text-white/50 pointer-events-none hidden md:inline">
            ⌘K
          </kbd>
        </div>

        {/* Live AI Mode Status Badge */}
        <div className="hidden 2xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#c2ff0c]/10 border border-[#c2ff0c]/25 text-[#c2ff0c] text-xs font-semibold shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c2ff0c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c2ff0c]"></span>
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[#c2ff0c]" />
          <span className="font-headline text-[11px] uppercase tracking-wider font-extrabold">Mode IA Actif</span>
        </div>
      </div>

      {/* Center / Trading & Security Controls Zone */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Panic Kill Switch 1-Clic */}
        <PanicKillSwitch />

        {/* Coffre-Fort Intouchable (10% des Gains) */}
        <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[#c2ff0c] font-headline text-xs shadow-sm shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[#c2ff0c]">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col text-left justify-center leading-tight">
            <span className="text-[9px] text-white/50 font-body uppercase font-bold tracking-wider whitespace-nowrap">
              Coffre-Fort ({tradingMode === 'REAL' ? 'SOL' : 'USD'})
            </span>
            <span className="text-xs font-mono font-extrabold text-[#c2ff0c]">
              {tradingMode === 'REAL' 
                ? `${(Number(reserveVaultSol) || 0).toFixed(2)} SOL` 
                : `$${(Number(reserveVault) || 0).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* DEX Swap Quick Trigger Button */}
        <Button
          onClick={() => setIsSwapOpen(true)}
          className="h-10 px-3 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/80 hover:to-indigo-900/80 border border-purple-500/35 text-purple-200 font-headline font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0"
        >
          <ArrowDownUp className="h-4 w-4 text-[#c2ff0c]" />
          <span className="hidden md:inline font-headline uppercase tracking-wide">Swap DEX</span>
        </Button>

        {/* DEX Swap Modal */}
        <DEXSwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />
      </div>

      {/* Right Zone: Wallet / Language / Notifications / Settings / Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Web3 Multi-Chain Connect Wallet Button */}
        <Dialog>
          <DialogTrigger asChild>
            {connectedWallet ? (
              <Button
                className="h-10 px-3 bg-white/5 hover:bg-white/10 border border-emerald-500/40 text-white font-headline font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {connectedWallet.address.slice(0, 4)}...{connectedWallet.address.slice(-4)}
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-headline uppercase font-bold hidden md:inline">
                  {connectedWallet.chain}
                </span>
              </Button>
            ) : (
              <Button
                className="h-10 px-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-headline font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.35)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] flex items-center gap-2 border border-purple-400/30 transition-all transform hover:-translate-y-0.5"
              >
                <Wallet className="h-4 w-4 text-[#c2ff0c] animate-pulse" />
                <span className="hidden sm:inline">Web3</span>
                <span className="text-[9px] bg-black/40 text-[#c2ff0c] px-1.5 py-0.5 rounded font-mono font-normal">
                  Multi
                </span>
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
                Connectez votre portefeuille d'actifs numériques pour exécuter des ordres réels et transférer vos bénéfices.
              </DialogDescription>
            </DialogHeader>

            {connectedWallet ? (
              <div className="space-y-4 pt-1 font-body">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-headline">Portefeuille Actif</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">
                      Connecté • {connectedWallet.chain}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{connectedWallet.name}</p>
                    <p className="text-xs font-mono text-emerald-400 break-all mt-1">{connectedWallet.address}</p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    localStorage.removeItem('connected_web3_wallet');
                    setConnectedWallet(null);
                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('web3_wallet_updated'));
                  }}
                  className="w-full h-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-headline font-bold text-xs rounded-xl"
                >
                  Déconnecter le Portefeuille
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-2 font-body">
                <button
                  onClick={connectPhantomSolana}
                  className="w-full p-3.5 bg-white/5 hover:bg-purple-900/20 border border-white/10 hover:border-purple-500/40 rounded-xl flex items-center justify-between transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-xs shadow-md">
                      SOL
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white group-hover:text-[#c2ff0c]">Phantom / Solflare</p>
                      <p className="text-[10px] text-white/40 font-mono">Réseau Solana Mainnet (Direct Provider)</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 group-hover:bg-[#c2ff0c] group-hover:text-black font-bold px-2.5 py-1 rounded-lg transition-all">
                    Connecter
                  </span>
                </button>

                <button
                  onClick={connectMetaMaskEVM}
                  className="w-full p-3.5 bg-white/5 hover:bg-amber-900/20 border border-white/10 hover:border-amber-500/40 rounded-xl flex items-center justify-between transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-900/50 border border-amber-500/30 flex items-center justify-center font-bold text-amber-300 text-xs shadow-md">
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
                  className="w-full p-3.5 bg-white/5 hover:bg-blue-900/20 border border-white/10 hover:border-blue-500/40 rounded-xl flex items-center justify-between transition-all duration-200 group"
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
                      className="h-10 px-3.5 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-headline text-xs font-extrabold rounded-xl shrink-0"
                    >
                      Connecter
                    </Button>
                  </div>
                  <p className="text-[10px] text-white/40 font-body">
                    Connecte n'importe quel portefeuille Solana en lecture pour suivre le solde SOL en temps réel.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bouton d'Installation PWA App */}
        <PWAInstallBanner />

        {/* Sélecteur Multi-Langues FR / HT / EN */}
        <select
          value={getStoredLanguage()}
          onChange={(e) => {
            setStoredLanguage(e.target.value as Language);
            window.location.reload();
          }}
          className="h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-2 text-xs font-bold text-white font-headline shrink-0 transition-colors cursor-pointer focus:outline-none"
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
              className="h-10 w-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200 relative shrink-0"
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

        {/* 2. Settings Modal (Gear) */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200 shrink-0"
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

              {/* Slippage & Gas settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Slippage Tolerance (%)</label>
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
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Frais Prioritaires (SOL)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={priorityFee}
                    onChange={(e) => setPriorityFee(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 bg-white/5 text-white/60 hover:text-white"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 font-bold"
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
            <div className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200 cursor-pointer select-none">
              <Avatar className="h-8 w-8 rounded-lg border border-white/15">
                <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" />
                <AvatarFallback className="bg-white/10 text-white text-xs">DO</AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-white leading-tight">David Owner</p>
                <p className="text-[10px] text-white/50 leading-tight font-mono">admin@trade.ai</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-white/55 hidden lg:block ml-1" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#14101a] border-white/10 text-white rounded-xl shadow-xl p-1 font-body">
            <DropdownMenuLabel className="font-headline text-[10px] text-white/30 uppercase tracking-widest px-3.5 py-2">
              Menu Utilisateur
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            
            <DropdownMenuItem asChild className="px-3.5 py-2 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2">
              <Link href="/profile" className="flex items-center gap-2 w-full">
                <User className="h-3.5 w-3.5 text-[#c2ff0c]" />
                <span>Mon Profil</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="px-3.5 py-2 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="h-3.5 w-3.5 text-purple-400" />
                <span>Paramètres Système</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            {/* Toggle Trading Mode directly */}
            <DropdownMenuItem 
              onClick={() => {
                if (tradingMode === 'DEMO' && !connectedWallet) {
                  alert("⚠️ Attention: Aucun portefeuille Web3 (Phantom/MetaMask) n'est actuellement connecté. Veuillez connecter votre portefeuille pour exécuter des trades réels.");
                }
                setTradingMode(prev => prev === 'DEMO' ? 'REAL' : 'DEMO');
              }}
              className="px-3.5 py-2 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex justify-between items-center"
            >
              <span>Mode de Trading</span>
              <span className={cn(
                "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                tradingMode === 'REAL' ? "bg-purple-500/20 text-purple-300" : "bg-amber-500/20 text-amber-300"
              )}>
                {tradingMode}
              </span>
            </DropdownMenuItem>

            {/* Reset Balance */}
            <DropdownMenuItem 
              onClick={handleResetBalance}
              className="px-3.5 py-2 hover:bg-white/5 rounded-lg focus:bg-white/5 focus:text-[#c2ff0c] cursor-pointer text-xs flex items-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5 text-white/40" />
              <span>Réinitialiser Solde Démo</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            {/* Logout/Reset */}
            <DropdownMenuItem 
              onClick={handleLogout}
              className="px-3.5 py-2 hover:bg-red-500/10 rounded-lg focus:bg-red-500/10 text-rose-400 focus:text-rose-300 cursor-pointer text-xs flex items-center gap-2"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400" />
              <span>Déconnexion Session</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
