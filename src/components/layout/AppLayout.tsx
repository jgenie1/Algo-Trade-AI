import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Header from '@/components/layout/Header';
import SidebarNav from '@/components/layout/SidebarNav';
import LogoIcon from '@/components/icons/LogoIcon';

import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true} className="min-h-screen bg-[#09070c] relative font-body text-foreground flex max-w-full pb-28 md:pb-0 overflow-y-auto overflow-x-hidden">
      {/* Background ambient light blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#5d2b90]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#c2ff0c]/5 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[40%] right-[20%] w-[35%] h-[35%] bg-[#228be6]/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Floating Left Sidebar */}
      <Sidebar 
        collapsible="icon" 
        variant="floating" 
        className="border-none bg-transparent shadow-2xl [&>div]:glass-panel [&>div]:!bg-[#0e0b12]/85 [&>div]:!border-white/10 [&>div]:shadow-[0_8px_32px_rgba(0,0,0,0.6)] [&>div]:rounded-2xl [&>div]:backdrop-blur-xl"
      >
        <SidebarHeader className="p-3 flex flex-row items-center justify-between gap-2 h-16 border-b border-white/10 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 min-w-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#c2ff0c]/20 to-[#c2ff0c]/5 border border-[#c2ff0c]/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(194,255,12,0.25)]">
              <LogoIcon className="h-5 w-5 text-[#c2ff0c] shrink-0 drop-shadow-[0_0_6px_rgba(194,255,12,0.5)]" />
            </div>
            <span className="font-headline text-lg font-bold tracking-tight text-gradient-lime group-data-[collapsible=icon]:hidden truncate">
              AlgoTradeAI
            </span>
          </div>
          <SidebarTrigger className="text-white/60 hover:text-[#c2ff0c] hover:bg-white/10 group-data-[collapsible=icon]:hidden shrink-0" title="Réduire / Cacher le menu (Ctrl+B)" />
        </SidebarHeader>
        <SidebarContent className="flex-1 py-4">
          <SidebarNav />
        </SidebarContent>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="flex flex-col flex-1 min-w-0 max-w-full bg-transparent border-none p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-visible">
        <Header />
        <div className="flex-1 w-full min-w-0 max-w-full mt-2">
          {children}
        </div>
      </SidebarInset>

      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}

