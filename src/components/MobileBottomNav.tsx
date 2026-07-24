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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0e0a12]/90 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex justify-around items-center shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: 'rgba(14, 10, 18, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 4px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link 
            key={item.label} 
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '4px 0',
              textDecoration: 'none'
            }}
          >
            <div 
              className={cn(
                "p-2 rounded-xl transition-all duration-300 relative",
                isActive 
                  ? "bg-[#c2ff0c] text-black scale-110 shadow-[0_0_12px_rgba(194,255,12,0.3)]" 
                  : "text-white/60 hover:text-white"
              )}
              style={{
                backgroundColor: isActive ? '#c2ff0c' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#000000' : 'rgba(255, 255, 255, 0.6)',
                padding: '8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span 
              className={cn(
                "text-[9px] font-medium font-headline mt-1 transition-colors duration-200",
                isActive ? "text-[#c2ff0c] font-bold" : "text-white/40"
              )}
              style={{
                fontSize: '9px',
                marginTop: '4px',
                color: isActive ? '#c2ff0c' : 'rgba(255, 255, 255, 0.4)',
                fontWeight: isActive ? 'bold' : 'normal'
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
