"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Bot, 
  BarChart2, 
  Wallet, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileQuickActionSheet from './MobileQuickActionSheet';
import { useAppState } from '@/context/AppContext';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { reserveVault, reserveVaultSol, tradingMode } = useAppState();

  const vaultAmt = tradingMode === 'REAL' ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);

  const navItems = [
    { href: '/', label: 'Accueil', icon: Home },
    { href: '/strategies', label: 'Bots', icon: Bot },
    { href: '/deposit', label: 'Dépôt', icon: Wallet, badge: vaultAmt > 0 ? '$' : undefined },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0c0d12]/95 backdrop-blur-lg border-t border-white/10 px-4 py-2 shadow-2xl">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-headline font-bold transition-all relative py-1 px-2 rounded-xl",
                isActive ? "text-[#c2ff0c]" : "text-white/40 hover:text-white"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-[#c2ff0c]" : "text-white/40")} />
              <span>{item.label}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-[#c2ff0c] absolute -bottom-1" />
              )}
            </Link>
          );
        })}

        {/* Bouton d'Action Flottant Central (Quick Action Sheet) */}
        <MobileQuickActionSheet />

        {navItems.slice(2, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-headline font-bold transition-all relative py-1 px-2 rounded-xl",
                isActive ? "text-[#c2ff0c]" : "text-white/40 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive ? "text-[#c2ff0c]" : "text-white/40")} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-[#c2ff0c] text-black font-extrabold text-[8px] px-1 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-[#c2ff0c] absolute -bottom-1" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
