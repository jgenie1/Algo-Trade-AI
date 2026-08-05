import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import SidebarNav from '@/components/SidebarNav';
import LogoIcon from '@/components/icons/LogoIcon';

import MobileBottomNav from '@/components/MobileBottomNav';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true} className="min-h-screen bg-[#09070c] relative overflow-x-hidden font-body text-foreground flex max-w-full pb-28 md:pb-0">
      {/* Background ambient light blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#5d2b90]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#c2ff0c]/5 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[40%] right-[20%] w-[35%] h-[35%] bg-[#228be6]/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Floating Left Sidebar */}
      <Sidebar 
        collapsible="icon" 
        variant="floating" 
        className="border-none bg-transparent shadow-2xl [&>div]:glass-panel [&>div]:!bg-[#100d14]/45 [&>div]:rounded-2xl"
      >
        <SidebarHeader className="p-4 flex flex-row items-center justify-between gap-3 h-16 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <LogoIcon className="h-8 w-8 text-[#c2ff0c] shrink-0" />
            <span className="font-headline text-xl font-bold tracking-tight text-gradient-lime group-data-[collapsible=icon]:hidden truncate">
              AlgoTradeAI
            </span>
          </div>
          <SidebarTrigger className="text-white/60 hover:text-[#c2ff0c] group-data-[collapsible=icon]:hidden shrink-0" title="Réduire / Cacher le menu (Ctrl+B)" />
        </SidebarHeader>
        <SidebarContent className="flex-1 py-4">
          <SidebarNav />
        </SidebarContent>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="flex flex-col flex-1 min-w-0 max-w-full overflow-x-hidden bg-transparent border-none p-3 sm:p-4 md:p-6 lg:p-8">
        <Header />
        <main className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden mt-4">
          {children}
        </main>
      </SidebarInset>

      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}

