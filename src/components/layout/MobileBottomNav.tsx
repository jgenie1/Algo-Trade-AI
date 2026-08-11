"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Bot, 
  Coins, 
  Wallet, 
  BarChart2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileQuickActionSheet from './MobileQuickActionSheet';
import { useAppState } from '@/context/AppContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);
  const { reserveVault, reserveVaultSol, tradingMode, activePositions, bots } = useAppState();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const vaultAmt = tradingMode === 'REAL' ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const activePositionsCount = (Array.isArray(activePositions) ? activePositions : []).filter(p => p && (p.mode || 'DEMO') === tradingMode).length;
  const activeBotsCount = (Array.isArray(bots) ? bots : []).filter(b => b && b.status === 'RUNNING').length;

  const leftNavItems = [
    { href: '/', label: 'Terminal', icon: Home, badge: activePositionsCount > 0 ? activePositionsCount.toString() : undefined },
    { href: '/strategies', label: 'Bots', icon: Bot, badge: activeBotsCount > 0 ? activeBotsCount.toString() : undefined },
  ];

  const rightNavItems = [
    { href: '/deposit', label: 'Dépôt', icon: Wallet, badge: vaultAmt > 0 ? (tradingMode === 'REAL' ? 'SOL' : '$') : undefined },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div 
      suppressHydrationWarning
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0a0614]/90 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_35px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {leftNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-headline font-bold transition-all duration-200 py-1.5 px-3 rounded-2xl active:scale-90 select-none",
                isActive 
                  ? "text-[#c2ff0c] bg-white/[0.06] shadow-[inset_0_0_12px_rgba(194,255,12,0.1)] border border-[#c2ff0c]/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn("h-5 w-5 transition-all duration-200", isActive ? "text-[#c2ff0c] scale-110 drop-shadow-[0_0_8px_rgba(194,255,12,0.6)]" : "text-slate-400")} />
                {isMounted && item.badge && (
                  <span className="absolute -top-2 -right-2.5 bg-[#c2ff0c] text-black font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(194,255,12,0.8)] leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Bouton d'Action Flottant Central (Quick Action Sheet) */}
        <div className="relative flex items-center justify-center -top-3">
          <MobileQuickActionSheet />
        </div>

        {rightNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-headline font-bold transition-all duration-200 py-1.5 px-3 rounded-2xl active:scale-90 select-none",
                isActive 
                  ? "text-[#c2ff0c] bg-white/[0.06] shadow-[inset_0_0_12px_rgba(194,255,12,0.1)] border border-[#c2ff0c]/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn("h-5 w-5 transition-all duration-200", isActive ? "text-[#c2ff0c] scale-110 drop-shadow-[0_0_8px_rgba(194,255,12,0.6)]" : "text-slate-400")} />
                {isMounted && item.badge && (
                  <span className="absolute -top-2 -right-2.5 bg-purple-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)] leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
