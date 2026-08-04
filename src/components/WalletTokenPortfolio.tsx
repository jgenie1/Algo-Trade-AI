"use client";

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Coins, 
  ArrowRightLeft, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHead 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  fetchWalletTokenBalances, 
  executeBulkSellToUSD, 
  type WalletToken, 
  type SwapToken 
} from '@/services/dexSwapService';
import { useAppState } from '@/context/AppContext';
import { formatUsdToHtg } from '@/lib/utils';

interface WalletTokenPortfolioProps {
  solanaPubKey: string | null;
  solanaBalance: number | null;
  evmBalance: number | null;
  walletChain: 'Solana' | 'BSC' | 'Ethereum' | null;
  onOpenSwap: (fromToken?: SwapToken, toToken?: SwapToken) => void;
}

export default function WalletTokenPortfolio({
  solanaPubKey,
  solanaBalance,
  evmBalance,
  walletChain,
  onOpenSwap
}: WalletTokenPortfolioProps) {
  const { tradingMode, balance, setBalance, activePositions } = useAppState();

  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(true);

  // Vente en bloc state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState<boolean>(false);
  const [isExecutingBulk, setIsExecutingBulk] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; symbol: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ totalUsdReceived: number; txCount: number; details: string[] } | null>(null);

  const nativeBal = walletChain === 'BSC' || walletChain === 'Ethereum' ? evmBalance : solanaBalance;
  const activeChainLabel = walletChain || 'Solana';

  const loadTokens = async () => {
    setIsLoadingTokens(true);
    const data = await fetchWalletTokenBalances(
      solanaPubKey,
      walletChain,
      nativeBal,
      activePositions,
      tradingMode
    );
    setTokens(data);
    setIsLoadingTokens(false);
  };

  useEffect(() => {
    loadTokens();
  }, [solanaPubKey, walletChain, nativeBal, activePositions.length, tradingMode]);

  // Tokens pouvant être vendus en bloc (exclut les stablecoins USDC/USDT)
  const sellableTokens = tokens.filter(t => !t.isStablecoin && t.balance > 0);
  const totalSellableUsd = sellableTokens.reduce((sum, t) => sum + t.valueUsd, 0);

  const totalPortfolioUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0);

  const handleStartBulkSell = async () => {
    if (sellableTokens.length === 0) return;

    setIsExecutingBulk(true);
    setBulkResult(null);

    const res = await executeBulkSellToUSD(
      sellableTokens,
      tradingMode === 'REAL',
      (current, total, symbol) => {
        setBulkProgress({ current, total, symbol });
      }
    );

    setIsExecutingBulk(false);
    setBulkProgress(null);

    if (res.success) {
      setBulkResult({
        totalUsdReceived: res.totalUsdReceived,
        txCount: res.txCount,
        details: res.details
      });

      // Mettre à jour le solde virtuel en démo
      if (tradingMode === 'DEMO') {
        setBalance(prev => prev + res.totalUsdReceived);
      }

      // Recharger la liste des tokens après vente
      loadTokens();
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Header Banner */}
      <div className="bg-[#140b1e] border border-white/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-[#c2ff0c]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 px-3 py-1 font-mono text-xs uppercase flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-purple-400" />
                Wallet {activeChainLabel}
              </Badge>
              <Badge className="bg-white/10 text-white/70 border-white/10 font-mono text-xs">
                {solanaPubKey ? `${solanaPubKey.slice(0, 6)}...${solanaPubKey.slice(-6)}` : 'Connecté'}
              </Badge>
            </div>
            <h2 className="text-2xl font-headline font-extrabold text-white">
              Portefeuille & Solde des Tokens
            </h2>
            <p className="text-xs text-white/50 font-body max-w-xl">
              Consultez vos avoirs en temps réel, échangez chaque token individuellement en USD ou convertissez l'intégralité de vos altcoins/memecoins en une seule opération.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {/* Total Estimated Portfolio Value */}
            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex flex-col min-w-[200px]">
              <span className="text-[10px] text-white/40 font-headline uppercase tracking-wider font-bold">
                Valeur Totale Est.
              </span>
              <span className="text-2xl font-black text-[#c2ff0c] font-headline mt-0.5">
                ${totalPortfolioUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">
                ≈ {formatUsdToHtg(totalPortfolioUsd)}
              </span>
            </div>

            {/* Vendre en Bloc Action Button */}
            <Button
              onClick={() => setIsBulkDialogOpen(true)}
              disabled={sellableTokens.length === 0}
              className="h-14 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white font-headline font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-purple-600/25 border border-purple-400/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Layers className="h-4 w-4 text-[#c2ff0c]" />
              Vendre Tout en Bloc (USD)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tokens Table Card */}
      <Card className="bg-[#120d1a] border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <CardHeader className="p-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white font-headline">
              Tokens Détenus ({tokens.length})
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTokens}
            disabled={isLoadingTokens}
            className="h-8 px-3 text-xs bg-white/5 hover:bg-white/10 text-white/70 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingTokens ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingTokens ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
              <span className="text-xs text-white/50 font-body">Analyse du portefeuille et des tokens on-chain...</span>
            </div>
          ) : tokens.length === 0 ? (
            <div className="py-10 text-center text-white/40 text-xs font-body">
              Aucun token détecté sur ce portefeuille.
            </div>
          ) : (
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-white/[0.03] border-b border-white/5">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="py-3 text-[10px] uppercase font-bold text-white/40 font-headline pl-4">Token</TableHead>
                    <TableHead className="py-3 text-[10px] uppercase font-bold text-white/40 font-headline text-right">Solde</TableHead>
                    <TableHead className="py-3 text-[10px] uppercase font-bold text-white/40 font-headline text-right">Cours Unit (USD)</TableHead>
                    <TableHead className="py-3 text-[10px] uppercase font-bold text-white/40 font-headline text-right">Valeur Totale (USD)</TableHead>
                    <TableHead className="py-3 text-[10px] uppercase font-bold text-white/40 font-headline text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.symbol} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="py-3.5 pl-4 border-none">
                        <div className="flex items-center gap-3">
                          {token.logoURI ? (
                            <img src={token.logoURI} alt={token.symbol} className="h-8 w-8 rounded-full bg-black/40 border border-white/10" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-xs">
                              {token.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs font-headline">{token.symbol}</span>
                              {token.isNative && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-none text-[8px] px-1.5 py-0 font-mono">
                                  NATIVE
                                </Badge>
                              )}
                              {token.isStablecoin && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[8px] px-1.5 py-0 font-mono">
                                  STABLE
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-white/40 font-body block truncate max-w-[140px]">{token.name}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 text-right font-mono text-xs font-semibold text-white border-none">
                        {token.balance.toLocaleString('en-US', { maximumFractionDigits: token.decimals > 6 ? 4 : 2 })}
                      </TableCell>

                      <TableCell className="py-3.5 text-right font-mono text-xs text-white/70 border-none">
                        ${token.priceUsd < 0.01 ? token.priceUsd.toFixed(6) : token.priceUsd.toFixed(2)}
                      </TableCell>

                      <TableCell className="py-3.5 text-right font-headline text-xs font-bold text-[#c2ff0c] border-none">
                        ${token.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell className="py-3.5 text-right pr-4 border-none">
                        {token.isStablecoin ? (
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center justify-end gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Déjà en USD
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onOpenSwap(
                              {
                                symbol: token.symbol,
                                name: token.name,
                                address: token.address,
                                decimals: token.decimals,
                                chain: token.chain,
                                logoURI: token.logoURI
                              },
                              {
                                symbol: token.chain === 'SOL' ? 'USDC' : 'USDT',
                                name: token.chain === 'SOL' ? 'USD Coin' : 'Tether USD',
                                address: token.chain === 'SOL' ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' : '0xdac17f958d2ee523a2206206994597c13d831ec7',
                                decimals: 6,
                                chain: token.chain
                              }
                            )}
                            className="h-8 px-3 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-200 text-xs font-bold font-headline rounded-xl transition-all"
                          >
                            <ArrowRightLeft className="h-3 w-3 mr-1 text-purple-300" />
                            Échanger en USD
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendre en Bloc Confirmation Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="bg-[#140a1b] border-purple-500/30 text-white rounded-3xl p-6 max-w-lg shadow-2xl space-y-4">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-xl font-headline font-extrabold text-[#c2ff0c] flex items-center gap-2">
              <Layers className="h-6 w-6 text-[#c2ff0c]" />
              Vente en Bloc de Tokens (Bulk Sell USD)
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 font-body mt-1">
              Cette action convertira automatiquement tous vos tokens non-USD en <strong>USDC / USD</strong>.
            </DialogDescription>
          </DialogHeader>

          {bulkResult ? (
            <div className="py-6 text-center space-y-4 font-body">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white font-headline">
                  Vente en Bloc Réussie !
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  {bulkResult.txCount} transaction(s) exécutée(s) avec succès.
                </p>
              </div>

              <div className="bg-black/40 border border-emerald-500/20 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/40 font-headline">Montant Total Reçu en USD</span>
                <span className="text-2xl font-black text-[#c2ff0c] block font-headline">
                  +${bulkResult.totalUsdReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </span>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 text-left bg-white/[0.02] border border-white/5 p-3 rounded-xl text-[10px] font-mono text-white/60">
                {bulkResult.details.map((d, idx) => (
                  <p key={idx}>✅ {d}</p>
                ))}
              </div>

              <Button
                onClick={() => {
                  setIsBulkDialogOpen(false);
                  setBulkResult(null);
                }}
                className="w-full h-11 bg-purple-600 hover:bg-purple-500 text-white font-bold font-headline rounded-xl"
              >
                Fermer
              </Button>
            </div>
          ) : isExecutingBulk ? (
            <div className="py-8 text-center space-y-4 font-body">
              <RefreshCw className="h-10 w-10 text-purple-400 animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-white font-headline">
                  Vente en Bloc en Cours...
                </h4>
                {bulkProgress && (
                  <p className="text-xs text-purple-300 mt-1">
                    Conversion de {bulkProgress.symbol} ({bulkProgress.current} / {bulkProgress.total})
                  </p>
                )}
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${bulkProgress ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-body">
              <div className="bg-purple-950/30 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-300 uppercase font-headline">Récapitulatif du Lot</span>
                  <Badge className="bg-purple-500/20 text-purple-300 border-none font-mono text-[10px]">
                    {sellableTokens.length} Token(s) à Vendre
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">Valeur Totale Estimée :</span>
                  <span className="font-bold text-[#c2ff0c] font-headline">
                    ${totalSellableUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-white/40 font-headline block">
                  Tokens qui seront convertis en USD :
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 border border-white/5 p-2 rounded-xl">
                  {sellableTokens.map((t) => (
                    <div key={t.symbol} className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg text-xs">
                      <span className="font-bold text-white font-headline">{t.symbol}</span>
                      <span className="text-white/60 font-mono">
                        {t.balance.toLocaleString()} (~${t.valueUsd.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkDialogOpen(false)}
                  className="flex-1 h-11 bg-white/5 hover:bg-white/10 border-white/10 text-xs font-bold font-headline rounded-2xl"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleStartBulkSell}
                  className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold font-headline uppercase text-xs rounded-2xl shadow-lg border-none"
                >
                  Confirmer la Vente en Bloc
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
