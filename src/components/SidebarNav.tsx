"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  LineChart, 
  Wallet, 
  Bot, 
  TrendingUp, 
  Trophy, 
  Settings,
  LogOut
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export default function SidebarNav() {
  const pathname = usePathname();

  const mainNavItems = [
    { href: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
    { href: '/analysis', label: 'Analyse IA Chart', icon: LineChart },
    { href: '/deposit', label: 'Dépôt', icon: ArrowDownLeft },
    { href: '/withdraw', label: 'Retrait', icon: ArrowUpRight },
    { href: '/analytics', label: 'Analyses & Stats', icon: Wallet },
    { href: '/settings', label: 'Paramètres & Profil', icon: Settings },
  ];

  const tradingBotsItems = [
    { href: '/strategies/performance', label: 'Performance', icon: TrendingUp },
    { href: '/strategies/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const renderItem = (item: any) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1);
    
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn(
            "w-full justify-start font-medium py-3 px-3 rounded-xl transition-all duration-300 gap-3 group/btn mb-1 flex items-center",
            isActive 
              ? "bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 font-semibold" 
              : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
          )}
          style={{
            backgroundColor: isActive ? 'rgba(194, 255, 12, 0.15)' : 'transparent',
            color: isActive ? '#c2ff0c' : 'rgba(255, 255, 255, 0.7)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none'
          }}
        >
          <Link href={item.href} className="w-full flex items-center gap-3" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div 
              className={cn(
                "p-2 rounded-lg transition-colors duration-300 shrink-0",
                isActive ? "bg-[#c2ff0c] text-black" : "bg-white/5 text-white/70 group-hover/btn:bg-[#c2ff0c] group-hover/btn:text-black"
              )}
              style={{
                backgroundColor: isActive ? '#c2ff0c' : 'rgba(255, 255, 255, 0.08)',
                color: isActive ? '#000000' : '#ffffff',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-body text-sm group-data-[collapsible=icon]:hidden">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <div className="flex flex-col h-full justify-between px-2" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '0 8px' }}>
      <div className="space-y-6">
        <div>
          <span 
            className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2 block group-data-[collapsible=icon]:hidden font-headline"
            style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px', display: 'block' }}
          >
            Général
          </span>
          <SidebarMenu style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {mainNavItems.map(renderItem)}
          </SidebarMenu>
        </div>

        <div>
          <span 
            className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2 block group-data-[collapsible=icon]:hidden font-headline"
            style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', padding: '0 12px', marginBottom: '8px', display: 'block' }}
          >
            Trading Bots
          </span>
          <SidebarMenu style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {tradingBotsItems.map(renderItem)}
          </SidebarMenu>
        </div>
      </div>

      {/* Logout button at bottom */}
      <div className="pt-6 border-t border-white/5 mt-auto" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', marginTop: 'auto' }}>
        <SidebarMenu style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="h-8 text-sm w-full justify-start font-medium py-3 px-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200 gap-3"
              style={{
                color: '#f87171',
                borderRadius: '12px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '6px', borderRadius: '8px' }}>
                <LogOut className="h-4 w-4" />
              </div>
              <span className="font-body text-sm group-data-[collapsible=icon]:hidden">Réinitialiser Session</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
