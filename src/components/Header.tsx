"use client";

import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppState } from '@/context/AppContext';
import { cn } from '@/lib/utils';
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
  const { isMobile } = useSidebar();
  const { 
    tradingMode, 
    setTradingMode, 
    balance, 
    setBalance, 
    bots, 
    closedPositions, 
    transactions,
    setTransactions 
  } = useAppState();

  const [isMounted, setIsMounted] = useState(false);

  // Settings State (persisted locally)
  const [rpcUrl, setRpcUrl] = useState('https://solana-mainnet.core.chainstack.com/39a622a578bd62b');
  const [slippage, setSlippage] = useState('15');
  const [priorityFee, setPriorityFee] = useState('0.005');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const storedRpc = localStorage.getItem('settings_rpc_url');
      const storedSlippage = localStorage.getItem('settings_slippage');
      const storedFee = localStorage.getItem('settings_priority_fee');
      if (storedRpc) setRpcUrl(storedRpc);
      if (storedSlippage) setSlippage(storedSlippage);
      if (storedFee) setPriorityFee(storedFee);
    }
  }, []);

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
    const rawProfit = pos.profit;
    const profitVal = typeof rawProfit === 'number' ? rawProfit : parseFloat(rawProfit) || 0;
    const isSol = pairStr.startsWith('SOL:');
    const posTime = pos.timestamp ? new Date(pos.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récemment';
    notifications.push({
      id: pos.id || `pos_${Math.random()}`,
      type: profitVal >= 0 ? 'success' : 'warning',
      text: `Position close ${pairStr.replace('SOL:', '').replace('FX:', '')} : ${profitVal >= 0 ? '+' : ''}${profitVal.toFixed(2)} ${isSol ? 'SOL' : '$'}`,
      time: posTime
    });
  });

  // Sort notification list
  const activeNotificationsCount = notifications.length;

  return (
    <header className="flex h-16 items-center justify-between bg-transparent border-none px-0 w-full mb-6 shrink-0" suppressHydrationWarning>
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="block md:hidden">
          <SidebarTrigger className="text-white/80 hover:text-[#c2ff0c] h-11 w-11 [&_svg]:h-5 [&_svg]:w-5 bg-white/5 border border-white/10 rounded-xl transition-all duration-200" />
        </div>
        
        <div className="relative w-full hidden md:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Rechercher ici..." 
            className="w-full h-11 pl-10 pr-12 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#c2ff0c]/50 transition-all duration-200"
            disabled
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium bg-white/10 border border-white/15 rounded text-white/50 pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side: Actions, Notifications, Settings, Profile */}
      <div className="flex items-center gap-4">
        {/* Premium badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c2ff0c]/10 border border-[#c2ff0c]/20 text-[#c2ff0c] text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-[#c2ff0c]" />
          <span>Mode IA Actif</span>
        </div>

        {/* 1. Notification Dropdown (Bell) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200 relative"
            >
              <Bell className="h-4.5 w-4.5" />
              {activeNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-black animate-pulse" />
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
              className="h-11 w-11 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200"
            >
              <Settings className="h-4.5 w-4.5" />
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
            
            {/* Toggle Trading Mode directly */}
            <DropdownMenuItem 
              onClick={() => setTradingMode(prev => prev === 'DEMO' ? 'REAL' : 'DEMO')}
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
