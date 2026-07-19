"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  LineChart, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analysis', label: 'Analyse', icon: LineChart },
    { href: '/deposit', label: 'Dépôt', icon: ArrowDownLeft },
    { href: '/withdraw', label: 'Retrait', icon: ArrowUpRight },
    { href: '/strategies/performance', label: 'Stats', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0e0a12]/80 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex justify-around items-center shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link 
            key={item.label} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200"
          >
            <div className={cn(
              "p-2 rounded-xl transition-all duration-300 relative",
              isActive 
                ? "bg-[#c2ff0c] text-black scale-110 shadow-[0_0_12px_rgba(194,255,12,0.3)]" 
                : "text-white/60 hover:text-white"
            )}>
              <Icon className="h-5 w-5" />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 bg-black rounded-full" />
              )}
            </div>
            <span className={cn(
              "text-[9px] font-medium font-headline mt-1 transition-colors duration-200",
              isActive ? "text-[#c2ff0c] font-bold" : "text-white/40"
            )}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
