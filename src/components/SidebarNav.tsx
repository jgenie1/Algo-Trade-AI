
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
  LogOut,
  Building2,
  User,
  Settings
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export default function SidebarNav() {
  const pathname = usePathname();

  const mainNavItems = [
    { href: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
    { href: '/erp', label: 'Console ERP Enterprise', icon: Building2 },
    { href: '/analysis', label: 'Analyse IA Chart', icon: LineChart },
    { href: '/deposit', label: 'Dépôt', icon: ArrowDownLeft },
    { href: '/withdraw', label: 'Retrait', icon: ArrowUpRight },
    { href: '/analytics', label: 'Analyses & Stats', icon: Wallet },
    { href: '/profile', label: 'Mon Profil', icon: User },
    { href: '/settings', label: 'Paramètres', icon: Settings },
  ];

  const tradingBotsItems = [
    { href: '/strategies', label: 'Marketplace Stratégies', icon: Bot },
    { href: '/strategies/leaderboard', label: 'Classement & Copy-Trading', icon: Trophy },
    { href: '/strategies/performance', label: 'Performance', icon: TrendingUp },
  ];

  const renderItem = (item: any) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1);
    
    const content = (
      <SidebarMenuButton
        asChild={false}
        isActive={isActive}
        disabled={item.disabled}
        className={cn(
          "w-full font-medium transition-all duration-200 group/btn select-none",
          "h-11 px-3 rounded-xl gap-3 justify-start",
          "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto",
          isActive 
            ? "bg-white/[0.08] text-white font-semibold border border-white/10 shadow-[0_0_15px_rgba(194,255,12,0.08)]" 
            : "text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/5"
        )}
        tooltip={{
          children: item.label, 
          side: "right", 
          sideOffset: 14,
          className: "bg-[#14101d] text-white border border-[#c2ff0c]/30 shadow-2xl font-body text-xs py-1.5 px-3 rounded-lg font-medium z-50"
        }}
      >
        <div className={cn(
          "size-8 group-data-[collapsible=icon]:size-10 rounded-lg group-data-[collapsible=icon]:rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
          isActive 
            ? "bg-[#c2ff0c] text-black shadow-[0_0_14px_rgba(194,255,12,0.4)] font-bold scale-105" 
            : "bg-white/[0.06] text-zinc-200 border border-white/5 group-hover/btn:bg-[#c2ff0c] group-hover/btn:text-black group-hover/btn:shadow-[0_0_12px_rgba(194,255,12,0.35)] group-hover/btn:scale-105 group-hover/btn:border-[#c2ff0c]/30"
        )}>
          <Icon className="h-4 w-4 group-data-[collapsible=icon]:h-4.5 group-data-[collapsible=icon]:w-4.5 stroke-[2.25]" />
        </div>
        
        <span className="font-body text-sm text-zinc-200 group-hover/btn:text-white group-data-[collapsible=icon]:hidden truncate">
          {item.label}
        </span>

        {item.disabled && (
          <span className="text-[10px] font-semibold bg-white/10 text-white/50 px-1.5 py-0.5 rounded ml-auto group-data-[collapsible=icon]:hidden">
            Bientôt
          </span>
        )}
      </SidebarMenuButton>
    );

    if (item.disabled) {
      return (
        <SidebarMenuItem key={item.label} className="opacity-60 cursor-not-allowed list-none">
          {content}
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.label} className="list-none">
        <Link href={item.href} className="w-full no-underline text-inherit block">
          {content}
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <div className="flex flex-col h-full justify-between px-2 group-data-[collapsible=icon]:px-1">
      <div className="space-y-5 group-data-[collapsible=icon]:space-y-3">
        <div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 mb-2 block group-data-[collapsible=icon]:hidden">
            Général
          </span>
          <SidebarMenu className="list-none p-0 m-0 space-y-1 group-data-[collapsible=icon]:space-y-2 group-data-[collapsible=icon]:items-center">
            {mainNavItems.map(renderItem)}
          </SidebarMenu>
        </div>

        {/* Separator between sections in collapsed mode */}
        <div className="hidden group-data-[collapsible=icon]:block my-2 w-6 h-[1px] bg-white/10 mx-auto" />

        <div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 mb-2 block group-data-[collapsible=icon]:hidden">
            Trading Bots
          </span>
          <SidebarMenu className="list-none p-0 m-0 space-y-1 group-data-[collapsible=icon]:space-y-2 group-data-[collapsible=icon]:items-center">
            {tradingBotsItems.map(renderItem)}
          </SidebarMenu>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 mt-auto group-data-[collapsible=icon]:pt-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenu className="list-none p-0 m-0 group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem className="list-none">
            <SidebarMenuButton
              className={cn(
                "w-full font-medium transition-all duration-200 group/logout select-none",
                "h-11 px-3 rounded-xl gap-3 justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20",
                "group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center"
              )}
              tooltip={{
                children: "Déconnexion", 
                side: "right",
                sideOffset: 14,
                className: "bg-[#1f1215] text-red-200 border border-red-500/30 shadow-2xl font-body text-xs py-1.5 px-3 rounded-lg font-medium z-50"
              }}
            >
              <div className="size-8 group-data-[collapsible=icon]:size-10 rounded-lg group-data-[collapsible=icon]:rounded-xl bg-red-500/10 text-red-400 group-hover/logout:bg-red-500 group-hover/logout:text-white flex items-center justify-center shrink-0 transition-all duration-200 shadow-[0_0_10px_rgba(239,68,68,0.15)] group-hover/logout:shadow-[0_0_14px_rgba(239,68,68,0.4)]">
                <LogOut className="h-4 w-4 group-data-[collapsible=icon]:h-4.5 group-data-[collapsible=icon]:w-4.5 stroke-[2.25]" />
              </div>
              <span className="font-body text-sm group-data-[collapsible=icon]:hidden">Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
