"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Zap, ShieldCheck, ArrowLeft, CheckCircle2, Flame } from "lucide-react";
import { useAppState } from "@/context/AppContext";

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? decodeURIComponent(params.slug) : "ai-autopilot";
  const { tradingMode, balance, reserveVault, reserveVaultSol, bots, setBots, botLearnings } = useAppState();

  const isReal = tradingMode === "REAL";
  const currentSolBal = typeof window !== "undefined" ? parseFloat(localStorage.getItem("trade_solana_balance") || "0") : 0;
  const allocatable = isReal
    ? Math.max(0, currentSolBal - (Number(reserveVaultSol) || 0))
    : Math.max(0, balance - (Number(reserveVault) || 0));

  const [capitalInput, setCapitalInput] = useState<string>(isReal ? "0.05" : "500");
  const [stopLossPct, setStopLossPct] = useState<string>("3.0");
  const [takeProfitPct, setTakeProfitPct] = useState<string>("8.0");
  const [deployed, setDeployed] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const strategyTitle = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const modeLearnings = (botLearnings || []).filter(
    (l) => !l.mode || l.mode === tradingMode
  );
  const winningPatternsCount = modeLearnings.filter((l) => (l.gainAmount || 0) > 0).length;
  const antiErrorRulesCount = modeLearnings.filter((l) => (l.lossAmount || 0) > 0).length;

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cap = parseFloat(capitalInput);
    const minReq = isReal ? 0.001 : 10;

    if (isNaN(cap) || cap < minReq) {
      setErrorMsg(`Capital minimum requis : ${minReq} ${isReal ? "SOL" : "$"}.`);
      return;
    }
    if (cap > allocatable) {
      setErrorMsg(
        `Solde disponible insuffisant (${isReal ? allocatable.toFixed(4) + " SOL" : "$" + allocatable.toFixed(2)} disponibles hors Coffre-Fort).`
      );
      return;
    }

    const newBot = {
      id: `bot_custom_${Date.now()}`,
      name: strategyTitle,
      pair: isReal ? "SOL:$WIF" : "FX:EURUSD",
      strategy: isReal ? "Pump.fun Sniper Bot" : "AI Autopilot (Machine à Cash)",
      status: "RUNNING" as const,
      pnl: 0,
      pnlPercent: 0,
      capital: cap,
      tradesCount: 0,
      winRate: 85,
      aiModel: "Gemini 2.5 Flash + Feedback Loop",
      mode: tradingMode,
      stopLossPct: parseFloat(stopLossPct) || 3.0,
      takeProfitPct: parseFloat(takeProfitPct) || 8.0,
      trailingStopPct: 2.0,
    };

    setBots([...(bots || []), newBot]);
    setDeployed(true);
    setTimeout(() => {
      router.push("/terminal?tab=bots");
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 text-white font-body">
      <div className="flex items-center justify-between">
        <Link
          href="/strategies"
          className="inline-flex items-center gap-2 text-xs font-headline font-bold text-white/60 hover:text-[#c2ff0c] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au Catalogue de Stratégies
        </Link>
        <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 font-headline text-xs uppercase">
          Mode {tradingMode}
        </Badge>
      </div>

      <Card className="bg-[#14101a] border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#c2ff0c]/15 text-[#c2ff0c] rounded-2xl border border-[#c2ff0c]/30">
              <BrainCircuit className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-headline font-extrabold text-white">
                {strategyTitle}
              </CardTitle>
              <CardDescription className="text-xs text-white/50 mt-1">
                Configuration et déploiement direct avec synchronisation du Moteur d&apos;Apprentissage &amp; Feedback IA.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] uppercase font-headline font-bold text-white/40 block">
                Capital Disponible
              </span>
              <span className="text-lg font-mono font-extrabold text-[#c2ff0c]">
                {isReal ? `${allocatable.toFixed(4)} SOL` : `$${allocatable.toFixed(2)}`}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-headline font-bold text-emerald-300/70 block">
                Motifs Gagnants IA
              </span>
              <span className="text-lg font-mono font-extrabold text-emerald-400">
                {winningPatternsCount} actif(s)
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px] uppercase font-headline font-bold text-purple-300/70 block">
                Filtres Anti-Erreurs IA
              </span>
              <span className="text-lg font-mono font-extrabold text-purple-300">
                {antiErrorRulesCount} règle(s)
              </span>
            </div>
          </div>

          <form onSubmit={handleDeploy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase font-headline text-white/60">
                  Capital Alloué ({isReal ? "SOL" : "USD"})
                </label>
                <Input
                  type="number"
                  step="any"
                  value={capitalInput}
                  onChange={(e) => setCapitalInput(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase font-headline text-white/60">
                  Stop-Loss (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 text-white font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase font-headline text-white/60">
                  Take-Profit (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={takeProfitPct}
                  onChange={(e) => setTakeProfitPct(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 text-white font-mono text-sm"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-bold">
                ⚠️ {errorMsg}
              </div>
            )}

            {deployed && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Stratégie déployée avec succès ! Redirection vers le Terminal...
              </div>
            )}

            <Button
              type="submit"
              disabled={deployed}
              className="w-full h-12 bg-[#c2ff0c] hover:bg-[#b0ec00] text-black font-headline font-extrabold uppercase text-xs rounded-2xl flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {deployed ? "Déploiement en cours..." : "Déployer et Activer la Stratégie"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
