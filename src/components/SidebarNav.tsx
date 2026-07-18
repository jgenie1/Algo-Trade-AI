
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
  ];

  const tradingBotsItems = [
    { href: '/strategies/performance', label: 'Performance', icon: TrendingUp },
    { href: '/strategies/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const renderItem = (item: any) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href.length > 1);
    
    if (item.disabled) {
      return (
        <SidebarMenuItem key={item.label} className="opacity-70 cursor-not-allowed">
          <SidebarMenuButton
            asChild={false}
            isActive={isActive}
            disabled={item.disabled}
            className={cn(
              "w-full justify-start font-medium py-6 px-3 rounded-xl transition-all duration-300 gap-3 group/btn mb-1",
              isActive 
                ? "bg-white/5 border border-white/10 text-white font-semibold" 
                : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
            )}
            tooltip={{
              children: item.label, 
              side: "right", 
              className: "bg-popover text-popover-foreground border border-white/10 shadow-md font-body"
            }}
          >
            <div className={cn(
              "p-2 rounded-lg transition-colors duration-300 shrink-0",
              isActive 
                ? "bg-[#c2ff0c] text-black" 
                : "bg-white/5 text-white/70 group-hover/btn:bg-[#c2ff0c] group-hover/btn:text-black"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-body text-sm group-data-[collapsible=icon]:hidden">{item.label}</span>
            <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded ml-auto group-data-[collapsible=icon]:hidden">
              Bientôt
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.label}>
        <SidebarMenuButton
          asChild={true}
          isActive={isActive}
          disabled={item.disabled}
          className={cn(
            "w-full justify-start font-medium py-6 px-3 rounded-xl transition-all duration-300 gap-3 group/btn mb-1",
            isActive 
              ? "bg-white/5 border border-white/10 text-white font-semibold" 
              : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"
          )}
          tooltip={{
            children: item.label, 
            side: "right", 
            className: "bg-popover text-popover-foreground border border-white/10 shadow-md font-body"
          }}
        >
          <Link href={item.href} className="w-full flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors duration-300 shrink-0",
              isActive 
                ? "bg-[#c2ff0c] text-black" 
                : "bg-white/5 text-white/70 group-hover/btn:bg-[#c2ff0c] group-hover/btn:text-black"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-body text-sm group-data-[collapsible=icon]:hidden">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <div className="flex flex-col h-full justify-between px-2">
      <div className="space-y-6">
        <div>
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2 block group-data-[collapsible=icon]:hidden">
            Général
          </span>
          <SidebarMenu>
            {mainNavItems.map(renderItem)}
          </SidebarMenu>
        </div>

        <div>
          <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2 block group-data-[collapsible=icon]:hidden">
            Trading Bots
          </span>
          <SidebarMenu>
            {tradingBotsItems.map(renderItem)}
          </SidebarMenu>
        </div>
      </div>

      <div className="pt-6 border-t border-white/5 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start font-medium py-6 px-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200 gap-3"
              tooltip={{
                children: "Déconnexion", 
                side: "right",
                className: "bg-popover text-popover-foreground border border-white/10"
              }}
            >
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="font-body text-sm group-data-[collapsible=icon]:hidden">Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}

