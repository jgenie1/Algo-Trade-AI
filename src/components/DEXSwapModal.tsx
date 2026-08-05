"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownUp, 
  RefreshCw, 
  Settings2, 
  Zap, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { POPULAR_TOKENS, SwapToken, fetchSwapQuote, SwapQuote, executeDEXSwap } from '@/services/dexSwapService';
import { useAppState } from '@/context/AppContext';
import { formatUsdToHtg } from '@/lib/utils';

interface DEXSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFromToken?: SwapToken;
  initialToToken?: SwapToken;
}

export default function DEXSwapModal({ isOpen, onClose, initialFromToken, initialToToken }: DEXSwapModalProps) {
  const { balance, setBalance, tradingMode } = useAppState();
  
  const [activeChain, setActiveChain] = useState<'SOL' | 'EVM'>('SOL');
  
  const availableTokens = POPULAR_TOKENS.filter(t => 
    activeChain === 'SOL' ? t.chain === 'SOL' : t.chain !== 'SOL'
  );

  const [fromToken, setFromToken] = useState<SwapToken>(initialFromToken || availableTokens[0] || POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState<SwapToken>(initialToToken || availableTokens[1] || POPULAR_TOKENS[1]);
  const [amount, setAmount] = useState<string>('1.0');
  const [slippage, setSlippage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('settings_slippage');
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 0.5;
  });

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapResult, setSwapResult] = useState<{ txHash: string; message: string } | null>(null);

  // Synchroniser les tokens d'entrée si fournis lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      if (initialFromToken) {
        setFromToken(initialFromToken);
        if (initialFromToken.chain !== 'SOL') setActiveChain('EVM');
        else setActiveChain('SOL');
      }
      if (initialToToken) {
        setToToken(initialToToken);
      }
    }
  }, [isOpen, initialFromToken, initialToToken]);

  // Mettre à jour les tokens par défaut au changement de réseau
  useEffect(() => {
    if (initialFromToken && initialFromToken.chain === (activeChain === 'SOL' ? 'SOL' : 'ETH')) return;
    const filtered = POPULAR_TOKENS.filter(t => 
      activeChain === 'SOL' ? t.chain === 'SOL' : t.chain !== 'SOL'
    );
    if (filtered.length >= 2) {
      setFromToken(filtered[0]);
      setToToken(filtered[1]);
    }
  }, [activeChain]);

  // Mettre à jour la cotation quand l'un des paramètres change
  useEffect(() => {
    let isCancelled = false;
    const updateQuote = async () => {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setQuote(null);
        return;
      }

      setIsQuoting(true);
      try {
        const q = await fetchSwapQuote(fromToken, toToken, numAmount, slippage);
        if (!isCancelled) {
          setQuote(q);
          setIsQuoting(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setIsQuoting(false);
        }
      }
    };

    updateQuote();
    return () => { isCancelled = true; };
  }, [fromToken, toToken, amount, slippage]);

  const handleInvertTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const getTokenUsdPrice = (token: SwapToken): number => {
    if (token.symbol === 'USDC' || token.symbol === 'USDT') return 1.0;
    if (token.symbol === 'SOL') return 145.5;
    if (token.symbol === 'ETH') return 3250.0;
    if (token.symbol === 'BNB') return 580.0;
    return 1.0;
  };

  const handleExecuteSwap = async () => {
    const numAmount = parseFloat(amount);
    if (!quote || isNaN(numAmount) || numAmount <= 0) return;

    setIsSwapping(true);
    setSwapResult(null);

    const res = await executeDEXSwap(fromToken, toToken, numAmount, quote, tradingMode === 'REAL');

    setIsSwapping(false);
    if (res.success) {
      setSwapResult({ txHash: res.txHash, message: res.message });

      // Mettre à jour le solde virtuel en mode Démo
      if (tradingMode === 'DEMO') {
        const outQty = parseFloat(quote.outAmount) || 0;
        
        let fromValueUsd = numAmount * getTokenUsdPrice(fromToken);
        let toValueUsd = outQty * getTokenUsdPrice(toToken);

        if (toToken.symbol === 'USDC' || toToken.symbol === 'USDT') {
          toValueUsd = outQty;
        }
        if (fromToken.symbol === 'USDC' || fromToken.symbol === 'USDT') {
          fromValueUsd = numAmount;
        }

        const netDiffUsd = toValueUsd - fromValueUsd;
        setBalance(prev => Math.max(0, prev + netDiffUsd));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#120d18] border-white/10 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-headline font-extrabold flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-[#c2ff0c]" />
              DEX Swap Instantané
            </DialogTitle>
            <DialogDescription className="text-xs text-white/40 font-body mt-0.5">
              Échangez vos tokens directement via Jupiter API (Solana) & Uniswap Router.
            </DialogDescription>
          </div>
          <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] border-none font-mono text-[10px]">
            {tradingMode === 'REAL' ? 'MODE RÉEL WEB3' : 'DÉMO VIRTUELE'}
          </Badge>
        </DialogHeader>

        {swapResult ? (
          <div className="py-6 space-y-4 text-center font-body">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-extrabold text-white font-headline">Transaction Confirmée !</h3>
            <p className="text-xs text-white/70">{swapResult.message}</p>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-left font-mono text-[11px] space-y-1">
              <span className="text-white/40 block uppercase font-headline">Hash Transaction On-Chain :</span>
              <span className="text-[#c2ff0c] break-all">{swapResult.txHash}</span>
            </div>

            <Button
              onClick={() => setSwapResult(null)}
              className="w-full h-11 bg-[#c2ff0c] text-black font-extrabold font-headline rounded-2xl text-xs uppercase"
            >
              Faire Un Autre Swap
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2 font-body">
            {/* Chain Selector Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveChain('SOL')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-headline font-bold transition-all ${
                  activeChain === 'SOL'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                🟣 Solana Network (Jupiter)
              </button>
              <button
                type="button"
                onClick={() => setActiveChain('EVM')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-headline font-bold transition-all ${
                  activeChain === 'EVM'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                🔷 EVM Networks (Uniswap)
              </button>
            </div>

            {/* Input Token Source */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-white/50 font-headline font-bold">
                <span>Payer avec</span>
                <span>Solde : {tradingMode === 'DEMO' ? `$${balance.toLocaleString('en-US', {maximumFractionDigits: 2})}` : 'Portefeuille'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-transparent border-none text-2xl font-bold font-mono focus-visible:ring-0 p-0 text-white placeholder:text-white/20"
                />

                <select
                  value={fromToken.symbol}
                  onChange={(e) => {
                    const selected = availableTokens.find(t => t.symbol === e.target.value);
                    if (selected) setFromToken(selected);
                  }}
                  className="bg-[#1e1728] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white font-headline"
                >
                  {availableTokens.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} ({t.chain})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Invert Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <Button
                type="button"
                onClick={handleInvertTokens}
                className="h-10 w-10 rounded-full bg-[#1e1728] border border-white/15 hover:border-[#c2ff0c] text-white hover:text-[#c2ff0c] p-0 shadow-lg"
              >
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Output Token Destination */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-white/50 font-headline font-bold">
                <span>Vous Recevez Environ</span>
                {isQuoting && <span className="text-[#c2ff0c] animate-pulse">Calcul de la route...</span>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold font-mono text-white flex-1 truncate">
                  {quote ? quote.outAmount : '0.0'}
                </div>

                <select
                  value={toToken.symbol}
                  onChange={(e) => {
                    const selected = availableTokens.find(t => t.symbol === e.target.value);
                    if (selected) setToToken(selected);
                  }}
                  className="bg-[#1e1728] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white font-headline"
                >
                  {availableTokens.map(t => (
                    <option key={t.symbol} value={t.symbol}>{t.symbol} ({t.chain})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quote details */}
            {quote && (
              <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-white/60">
                  <span>Route DEX d'exécution :</span>
                  <span className="text-purple-300 font-bold">{quote.routePlan}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Impact sur le Prix (Slippage) :</span>
                  <span className="text-emerald-400 font-bold">{quote.priceImpactPct}% (Slippage max: {slippage}%)</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Frais Réseau Estimés :</span>
                  <span className="text-amber-400 font-bold">${quote.estimatedFeeUsd} ({formatUsdToHtg(Number(quote.estimatedFeeUsd) || 0)})</span>
                </div>
              </div>
            )}

            {/* Execute Button */}
            <Button
              onClick={handleExecuteSwap}
              disabled={isSwapping || !quote || parseFloat(amount) <= 0}
              className="w-full h-12 bg-[#c2ff0c] text-black font-extrabold font-headline rounded-2xl text-xs uppercase hover:shadow-[0_0_20px_rgba(194,255,12,0.3)] border-none mt-2"
            >
              {isSwapping ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Confirmation Transaction...
                </span>
              ) : (
                `Exécuter le Swap ${fromToken.symbol} ➔ ${toToken.symbol}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
