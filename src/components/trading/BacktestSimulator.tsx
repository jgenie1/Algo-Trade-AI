"use client";

import React, { useState } from 'react';
import { Play, TrendingUp, TrendingDown, BarChart2, ShieldAlert, Zap, Layers, RefreshCw } from 'lucide-react';
import { runBacktest, type BacktestResult } from '@/services/backtestService';
import { currencyPairs, timeframes } from '@/hooks/useTradingSimulation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function BacktestSimulator() {
  const [pair, setPair] = useState<string>('FX:EURUSD');
  const [strategy, setStrategy] = useState<string>('AI Autopilot (Machine à Cash)');
  const [timeframe, setTimeframe] = useState<string>('15');
  const [initialBalance, setInitialBalance] = useState<number>(10000);
  const [capitalPerTrade, setCapitalPerTrade] = useState<number>(1000);
  const [leverage, setLeverage] = useState<number>(5);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await runBacktest(pair, strategy, timeframe, initialBalance, capitalPerTrade, leverage);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du calcul du backtest.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl shadow-xl space-y-6 p-5">
      <CardHeader className="p-0">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-[#c2ff0c]" />
            <span>Simulateur de Backtest Historique</span>
          </div>
          <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded font-mono font-normal">
            Sandbox Risk-Free
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-6">
        {/* Form Controls */}
        <form onSubmit={handleRunBacktest} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Actif Cible</label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white text-xs rounded-xl">
                <SelectValue placeholder="Actif" />
              </SelectTrigger>
              <SelectContent className="bg-[#14101a] text-white border-white/10">
                {currencyPairs.filter(cp => cp.value !== 'ALL').map(cp => (
                  <SelectItem key={cp.value} value={cp.value}>{cp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Stratégie</label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white text-xs rounded-xl">
                <SelectValue placeholder="Stratégie" />
              </SelectTrigger>
              <SelectContent className="bg-[#14101a] text-white border-white/10">
                <SelectItem value="AI Autopilot (Machine à Cash)">🤖 IA Autopilot</SelectItem>
                <SelectItem value="SuperTrend Momentum">⚡ SuperTrend Momentum</SelectItem>
                <SelectItem value="VWAP Breakout">📊 VWAP Breakout</SelectItem>
                <SelectItem value="RSI Pullback">📈 RSI Pullback</SelectItem>
                <SelectItem value="EMA Cross">📉 EMA Cross</SelectItem>
                <SelectItem value="BB Mean Reversion">🌐 BB Reversion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Timeframe</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white text-xs rounded-xl">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent className="bg-[#14101a] text-white border-white/10">
                {timeframes.map(tf => (
                  <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Capital Initial ($)</label>
            <Input
              type="number"
              value={initialBalance}
              onChange={e => setInitialBalance(parseFloat(e.target.value) || 1000)}
              className="h-10 bg-white/5 border-white/10 text-white text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Effet de Levier</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={leverage}
              onChange={e => setLeverage(parseInt(e.target.value) || 1)}
              className="h-10 bg-white/5 border-white/10 text-white text-xs rounded-xl"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-headline font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Calcul...
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 fill-black" />
                  Lancer Backtest
                </div>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-body">
            {error}
          </div>
        )}

        {/* Results Metrics Dashboard */}
        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase font-headline">Profit Net ($)</span>
                <div className={`text-base font-bold font-headline ${result.netProfit >= 0 ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
                  {result.netProfit >= 0 ? '+' : ''}{result.netProfit.toFixed(2)} $
                  <span className="text-[10px] block opacity-80 font-normal">({result.returnPct >= 0 ? '+' : ''}{result.returnPct.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase font-headline">Win Rate (%)</span>
                <div className="text-base font-bold text-white font-headline">
                  {result.winRate.toFixed(1)}%
                  <span className="text-[10px] block text-white/40 font-normal">{result.winningTrades} / {result.totalTrades} Gagnants</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase font-headline">Max Drawdown</span>
                <div className="text-base font-bold text-rose-400 font-headline">
                  -{result.maxDrawdown.toFixed(2)}%
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase font-headline">Profit Factor</span>
                <div className="text-base font-bold text-white font-headline">
                  {result.profitFactor.toFixed(2)}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase font-headline">Sharpe Ratio</span>
                <div className="text-base font-bold text-amber-400 font-headline">
                  {result.sharpeRatio.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Simulated Trades Log Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 font-headline">
                Historique des Ordres Simulés ({result.trades.length})
              </h4>
              <div className="max-h-60 overflow-y-auto overflow-x-auto w-full max-w-full rounded-xl border border-white/10 bg-[#120d18] text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-headline">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Prix Entrée</th>
                      <th className="py-2.5 px-3">Prix Sortie</th>
                      <th className="py-2.5 px-3 text-right">Profit ($)</th>
                      <th className="py-2.5 px-3">Raison Clôture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="py-2 px-3 font-bold">
                          <span className={`px-2 py-0.5 text-[9px] rounded uppercase ${t.type === 'BUY' ? 'bg-[#0d3424] text-[#34d399]' : 'bg-[#3d1325] text-[#f43f5e]'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-white/80 font-mono">{t.entryPrice.toFixed(5)}</td>
                        <td className="py-2 px-3 text-white/80 font-mono">{t.exitPrice.toFixed(5)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${t.profit >= 0 ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
                          {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)} $
                        </td>
                        <td className="py-2 px-3 text-white/50 text-[10px]">{t.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
