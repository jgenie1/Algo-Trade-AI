"use client";

import React from 'react';
import { Trophy, Copy, Check, ShieldCheck, Flame, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaderboardEntry } from '@/data/leaderboardEntries';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  userEntry: LeaderboardEntry;
  copiedRank: number | null;
  onCopyStrategy: (entry: LeaderboardEntry) => void;
  tradingMode: 'DEMO' | 'REAL';
}

export default function LeaderboardTable({
  entries,
  userEntry,
  copiedRank,
  onCopyStrategy,
  tradingMode
}: LeaderboardTableProps) {
  const allEntries = [userEntry, ...entries];

  return (
    <div className="bg-[#140f1d] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-extrabold uppercase text-slate-400 font-headline tracking-wider">
              <th className="py-4 px-6 text-center">Rang</th>
              <th className="py-4 px-6">Robot / Trader</th>
              <th className="py-4 px-6">Stratégie & Modèle</th>
              <th className="py-4 px-6 text-right">PnL Mensuel</th>
              <th className="py-4 px-6 text-right">Win Rate</th>
              <th className="py-4 px-6 text-center">Risque</th>
              <th className="py-4 px-6 text-right">Copieurs</th>
              <th className="py-4 px-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-body">
            {allEntries.map((entry) => {
              const isUser = entry.rank === 0;
              const isCopied = copiedRank === entry.rank;

              return (
                <tr
                  key={entry.name}
                  className={cn(
                    "transition-colors duration-200 hover:bg-white/[0.03]",
                    isUser ? "bg-[#c2ff0c]/5 border-l-4 border-l-[#c2ff0c]" : ""
                  )}
                >
                  <td className="py-4 px-6 text-center font-black text-lg">
                    {isUser ? (
                      <span className="text-[#c2ff0c] text-xs uppercase px-2 py-1 bg-[#c2ff0c]/10 rounded-lg font-headline">
                        VOUS
                      </span>
                    ) : entry.rank === 1 ? (
                      <span className="text-amber-400 flex items-center justify-center gap-1 font-headline">
                        <Trophy className="h-5 w-5 text-amber-400" /> #1
                      </span>
                    ) : entry.rank === 2 ? (
                      <span className="text-slate-300 font-headline">#2</span>
                    ) : entry.rank === 3 ? (
                      <span className="text-amber-600 font-headline">#3</span>
                    ) : (
                      <span className="text-slate-500 font-headline">#{entry.rank}</span>
                    )}
                  </td>

                  <td className="py-4 px-6">
                    <div className="font-extrabold text-white text-base font-headline">
                      {entry.name}
                    </div>
                    <div className="text-xs text-slate-400">par {entry.creator}</div>
                  </td>

                  <td className="py-4 px-6">
                    <div className="text-sm font-semibold text-slate-200">{entry.strategy}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                      {entry.aiModel}
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right font-black text-lg font-mono text-emerald-400">
                    {entry.pnl}
                  </td>

                  <td className="py-4 px-6 text-right font-extrabold text-base font-mono text-cyan-300">
                    {entry.winRate}
                  </td>

                  <td className="py-4 px-6 text-center">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-headline",
                        entry.riskLevel === 'FAIBLE'
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : entry.riskLevel === 'MODÉRÉ'
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      )}
                    >
                      {entry.riskLevel}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right font-mono text-sm text-slate-300">
                    <span className="flex items-center justify-end gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {entry.followers.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-4 px-6 text-center">
                    {!isUser && (
                      <button
                        onClick={() => onCopyStrategy(entry)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl font-headline text-xs font-black uppercase transition-all duration-300 flex items-center gap-1.5 mx-auto",
                          isCopied
                            ? "bg-emerald-500 text-black shadow-lg"
                            : "bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 hover:scale-105 shadow-md shadow-[#c2ff0c]/20"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copié !
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copier 1-Click
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
