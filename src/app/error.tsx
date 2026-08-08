"use client";

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js Application Error caught by ErrorBoundary:", error);
  }, [error]);

  const handleSafeReset = () => {
    if (typeof window !== 'undefined') {
      try {
        ['trade_positions', 'trade_closed', 'trade_bots', 'trade_transactions', 'trade_learnings', 'trade_logs'].forEach(k => {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              if (!Array.isArray(JSON.parse(raw))) localStorage.removeItem(k);
            } catch (e) {
              localStorage.removeItem(k);
            }
          }
        });
      } catch (e) {}

      try {
        reset();
      } catch (e) {}

      window.location.href = '/';
    }
  };

  const handleHardReset = () => {
    if (typeof window !== 'undefined') {
      if (confirm("Réinitialiser les données locales et rouvrir le terminal ?")) {
        try {
          ['trade_positions', 'trade_closed', 'trade_bots', 'trade_transactions', 'trade_logs'].forEach(k => localStorage.removeItem(k));
        } catch (e) {}
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-white text-center">
      <div className="bg-[#140f1d] border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
        <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl w-fit mx-auto border border-amber-500/20">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-headline text-white">Rechargement du Terminal</h2>
          <p className="text-xs text-white/50 font-body leading-relaxed">
            Le terminal s'est interrompu lors de l'initialisation. Cliquez ci-dessous pour recharger l'interface en toute sécurité.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={handleSafeReset}
            className="w-full h-11 bg-[#c2ff0c] text-black font-extrabold text-xs uppercase rounded-xl font-headline flex items-center justify-center gap-2 hover:bg-[#c2ff0c]/90 border-none transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Recharger l'Interface
          </button>
          <button
            onClick={handleHardReset}
            className="w-full h-10 bg-white/5 hover:bg-white/10 text-white/70 font-bold text-xs uppercase rounded-xl font-headline flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 text-amber-400" />
            Réinitialiser Données et Ouvrir
          </button>
          <Link
            href="/"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/';
            }}
            className="w-full h-10 bg-transparent hover:bg-white/5 text-white/40 font-bold text-[11px] uppercase rounded-xl font-headline flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" />
            Retour à l'Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

