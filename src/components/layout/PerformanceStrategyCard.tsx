"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface PerformanceStrategyCardProps {
  strategy: {
    name: string;
    description: string;
    profit: string;
    netGains: React.ReactNode;
    winRate: string;
    risk: string;
    status: string;
    color: string;
    barColor: string;
    icon: React.ElementType;
  };
}

export default function PerformanceStrategyCard({ strategy }: PerformanceStrategyCardProps) {
  const Icon = strategy.icon;

  return (
    <div className="bg-[#14101a] border border-white/10 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0", strategy.color)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-headline text-white">{strategy.name}</h2>
            <p className="text-xs text-white/40 font-body">{strategy.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-headline">
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
            strategy.status === "ACTIF" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
            strategy.status === "PAUSE" ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
            "bg-white/5 text-white/40 border border-white/10"
          )}>
            {strategy.status}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-white/60">
            {strategy.risk}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 font-body">
        <div className="space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold font-headline block">Rendement %</span>
          <div className={cn("text-xl font-bold font-mono", strategy.color)}>{strategy.profit}</div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold font-headline block">Gains Nets</span>
          <div className="text-xl font-bold font-mono text-white">{strategy.netGains}</div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-white/40 uppercase font-bold font-headline block">Win Rate</span>
          <div className="text-xl font-bold font-mono text-emerald-400">{strategy.winRate}</div>
        </div>
      </div>
    </div>
  );
}
