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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c0714]/95 backdrop-blur-2xl border-t border-white/15 px-3 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.85)]"
    >
      <div className="flex items-center justify-between max-w-md mx-auto">
        {leftNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-headline font-extrabold transition-all relative py-1 px-3 rounded-xl active:scale-95",
                isActive ? "text-[#c2ff0c]" : "text-white/40 hover:text-white"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive ? "text-[#c2ff0c] scale-110" : "text-white/40")} />
                {isMounted && item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-[#c2ff0c] text-black font-black text-[9px] px-1.5 py-0.2 rounded-full shadow-[0_0_8px_rgba(194,255,12,0.6)]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2ff0c] absolute -bottom-1 shadow-[0_0_8px_#c2ff0c]" />
              )}
            </Link>
          );
        })}

        {/* Bouton d'Action Flottant Central (Quick Action Sheet) */}
        <MobileQuickActionSheet />

        {rightNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-headline font-extrabold transition-all relative py-1 px-3 rounded-xl active:scale-95",
                isActive ? "text-[#c2ff0c]" : "text-white/40 hover:text-white"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive ? "text-[#c2ff0c] scale-110" : "text-white/40")} />
                {isMounted && item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-purple-500 text-white font-black text-[8px] px-1 py-0.2 rounded-full animate-pulse shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#c2ff0c] absolute -bottom-1 shadow-[0_0_8px_#c2ff0c]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
