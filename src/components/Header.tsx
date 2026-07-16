
"use client";
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Search, Bell, Settings, ChevronDown, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Header() {
  const { isMobile } = useSidebar();

  return (
    <header className="flex h-16 items-center justify-between bg-transparent border-none px-0 w-full mb-6 shrink-0">
      {/* Left side: Mobile trigger or fake search bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        {isMobile && <SidebarTrigger className="text-white/60 hover:text-white mr-2" />}
        
        <div className="relative w-full hidden md:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input 
            type="text" 
            placeholder="Rechercher ici..." 
            className="w-full h-11 pl-10 pr-12 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-[#c2ff0c]/50 transition-all duration-200"
            disabled
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium bg-white/10 border border-white/15 rounded text-white/50 pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side: Actions, Notifications, Profile */}
      <div className="flex items-center gap-4">
        {/* Premium badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c2ff0c]/10 border border-[#c2ff0c]/20 text-[#c2ff0c] text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-[#c2ff0c]" />
          <span>Mode IA Actif</span>
        </div>

        {/* Notification Icon */}
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200"
        >
          <Bell className="h-4.5 w-4.5" />
        </Button>

        {/* Settings Icon */}
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-[#c2ff0c] transition-all duration-200"
        >
          <Settings className="h-4.5 w-4.5" />
        </Button>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200 cursor-pointer">
          <Avatar className="h-8 w-8 rounded-lg border border-white/15">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100&h=100" />
            <AvatarFallback className="bg-white/10 text-white text-xs">DO</AvatarFallback>
          </Avatar>
          <div className="text-left hidden lg:block">
            <p className="text-xs font-semibold text-white leading-tight">David Owner</p>
            <p className="text-[10px] text-white/50 leading-tight font-mono">admin@trade.ai</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-white/55 hidden lg:block ml-1" />
        </div>
      </div>
    </header>
  );
}

