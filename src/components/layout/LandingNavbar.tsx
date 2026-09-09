"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Zap, Bot, Building2, LineChart, Trophy, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LogoIcon from '@/components/icons/LogoIcon';

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Terminal Quant', href: '/terminal', icon: Zap },
    { label: 'Bots & Stratégies', href: '/strategies', icon: Bot },
    { label: 'Console ERP', href: '/erp', icon: Building2 },
    { label: 'Analyse IA', href: '/analysis', icon: LineChart },
    { label: 'Leaderboard', href: '/strategies/leaderboard', icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-[#08050e]/85 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#c2ff0c]/25 to-[#c2ff0c]/5 border border-[#c2ff0c]/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(194,255,12,0.3)] group-hover:scale-105 transition-transform">
            <LogoIcon className="h-6 w-6 text-[#c2ff0c] drop-shadow-[0_0_8px_rgba(194,255,12,0.6)]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline text-xl font-black tracking-tight text-white group-hover:text-[#c2ff0c] transition-colors">
                AlgoTrade<span className="text-[#c2ff0c]">AI</span>
              </span>
              <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] border-[#c2ff0c]/30 text-[9px] font-extrabold uppercase px-1.5 py-0.2">
                v2.4
              </Badge>
            </div>
            <span className="text-[10px] font-mono text-slate-400 -mt-0.5">Quant & On-Chain Solana</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] border border-white/10 p-1.5 rounded-2xl shadow-inner">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-headline font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 text-[#c2ff0c]" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link href="/erp">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 bg-white/5 hover:bg-white/10 text-white border-white/15 text-xs font-headline font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="h-4 w-4 text-purple-400" />
              <span>ERP Enterprise</span>
            </Button>
          </Link>

          <Link href="/terminal">
            <Button
              size="sm"
              className="h-10 px-5 bg-[#c2ff0c] hover:bg-[#b0ec00] text-black font-headline font-black text-xs uppercase rounded-xl shadow-[0_0_20px_rgba(194,255,12,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Zap className="h-4 w-4 fill-black" />
              <span>Lancer le Terminal</span>
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/terminal">
            <Button
              size="sm"
              className="h-9 px-3.5 bg-[#c2ff0c] text-black font-headline font-extrabold text-[11px] uppercase rounded-xl shadow-[0_0_12px_rgba(194,255,12,0.3)]"
            >
              Terminal
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0c0817] px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-headline font-bold text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-[#c2ff0c]" />
                  <span>{link.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-white/40" />
              </Link>
            );
          })}
          <div className="pt-2">
            <Link href="/terminal" onClick={() => setMobileMenuOpen(false)} className="block w-full">
              <Button className="w-full h-11 bg-[#c2ff0c] text-black font-headline font-black text-xs uppercase rounded-xl">
                Ouvrir le Terminal de Trading
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
