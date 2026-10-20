"use client";

import { Button } from '@/components/ui/button';
import { Card,CardHeader,CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAppState } from '@/context/AppContext';
import { resolveLivePrice } from '@/lib/symbolUtils';
import { cn,formatSolToUsdAndHtg,getRealMarketBasePrice } from '@/lib/utils';
import { executeJupiterSwap,executeRealPumpTrade,fetchRealPumpCoins,SOLANA_TOKEN_MINTS } from '@/services/pumpFunService';
import { getExplorerTxUrl } from '@/utils/explorerLinks';
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Zap
} from 'lucide-react';
import React,{ useRef,useState } from 'react';

import PositionRiskCalculator from '@/components/trading/PositionRiskCalculator';
import { currencyPairs as allCurrencyPairs } from '@/hooks/useTradingEngine';
import type { Position } from '@/types';
const currencyPairs = allCurrencyPairs.filter(c => c.value !== 'ALL');

interface ManualOrderFormProps {
  livePrices: { [key: string]: number };
  priceDirections: { [key: string]: 'up' | 'down' | 'flat' };
  solanaBalance: number | null;
  solanaPubKey: string;
  isSolanaWalletActive: boolean;
  addBotLog: (botId: string, botName: string, message: string, type: 'info' | 'trade' | 'error') => void;
  selectedPair: string;
  setSelectedPair: (pair: string) => void;
}

export default function ManualOrderForm({
  livePrices,
  priceDirections,
  solanaBalance,
  solanaPubKey,
  isSolanaWalletActive,
  addBotLog,
  selectedPair,
  setSelectedPair
}: ManualOrderFormProps) {
  const { tradingMode, balance, setBalance, reserveVault, reserveVaultSol, setActivePositions, botLearnings } = useAppState();

  // Local Form States
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderAmount, setOrderAmount] = useState<number>(500);
  const [leverage, setLeverage] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [trendingCoins, setTrendingCoins] = useState<any[]>([]);
  const [trendingCoinsError, setTrendingCoinsError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isSubmittingOrderRef = useRef(false);

  const matchingCoin = trendingCoins.find(c => {
    if (!selectedPair.startsWith('SOL:')) return false;
    const parts = selectedPair.split(':');
    const mint = parts[1];
    return c.mint === mint || selectedPair.includes(c.mint);
  });

  const curveProgress = matchingCoin 
    ? Math.max(0, Math.min(100, (((matchingCoin.virtual_sol_reserves / 1e9) - 30) / 55) * 100))
    : undefined;
  const replyCount = matchingCoin ? (matchingCoin.reply_count || 0) : undefined;

  const safeLearnings = Array.isArray(botLearnings) ? botLearnings : [];

  const aiMatch = React.useMemo(() => {
    let blockedReason: string | null = null;
    let boostedReason: string | null = null;

    for (const l of safeLearnings) {
      if (selectedPair.startsWith('SOL:')) {
        if (l.pair === selectedPair && (l.lossAmount ?? 0) > 0) {
          blockedReason = l.learningEffect || "Règle de protection active : perte passée enregistrée sur ce jeton.";
          break;
        }
        if (curveProgress !== undefined && l.bondingCurveProgress !== undefined && (l.lossAmount ?? 0) > 0) {
          const delta = Math.abs(curveProgress - l.bondingCurveProgress);
          const isLowReplies = (replyCount ?? 0) <= (l.replyCount ?? 0) + 1;
          if (delta <= 8 && isLowReplies) {
            blockedReason = l.learningEffect || `Risque structurel : Bonding Curve ~${l.bondingCurveProgress.toFixed(0)}% avec faible engagement`;
            break;
          }
        }
        if ((l.gainAmount ?? 0) > 0 || (l.learningEffect && (l.learningEffect.includes('Gagnant') || l.learningEffect.includes('Gagnante')))) {
          if (l.pair === selectedPair) {
            boostedReason = l.learningEffect || "Motif gagnant validé sur ce jeton";
          } else if (curveProgress !== undefined && l.bondingCurveProgress !== undefined) {
            const delta = Math.abs(curveProgress - l.bondingCurveProgress);
            if (delta <= 12 && (replyCount ?? 0) >= Math.max(5, (l.replyCount ?? 3))) {
              boostedReason = `Configuration similaire à un gain passé (Bonding Curve ~${l.bondingCurveProgress.toFixed(0)}%)`;
            }
          }
        }
      } else {
        if (l.pair === selectedPair && (l.type === orderType || !l.type)) {
          if ((l.lossAmount ?? 0) > 0) {
            blockedReason = l.learningEffect || `Règle de protection active sur ${selectedPair}`;
          } else if ((l.gainAmount ?? 0) > 0 || (l.learningEffect && (l.learningEffect.includes('Gagnant') || l.learningEffect.includes('Gagnante')))) {
            boostedReason = l.learningEffect || `Motif gagnant validé sur ${selectedPair}`;
          }
        }
      }
    }

    return { blockedReason, boostedReason };
  }, [safeLearnings, selectedPair, orderType, curveProgress, replyCount]);

  // Fetch live trending coins from Pump.fun (real mints only in REAL mode)
  React.useEffect(() => {
    if ((tradingMode as string) !== 'REAL') return;
    const loadCoins = async () => {
      try {
        setTrendingCoinsError('');
        const coins = await fetchRealPumpCoins();
        if (coins && coins.length > 0) {
          setTrendingCoins(coins.slice(0, 15));
        }
      } catch (e: any) {
        setTrendingCoinsError(e.message || 'API Pump.fun inaccessible.');
        setTrendingCoins([]);
      }
    };
    loadCoins();
    const interval = setInterval(loadCoins, 10000);
    return () => clearInterval(interval);
  }, [tradingMode]);

  // Synchronisation automatique de la paire sélectionnée lors du basculement Démo <-> Réel
  React.useEffect(() => {
    if (tradingMode === 'REAL') {
      if (!selectedPair.startsWith('SOL:')) {
        if (trendingCoins.length > 0) {
          setSelectedPair(`SOL:${trendingCoins[0].mint}:${trendingCoins[0].symbol}`);
        } else {
          setSelectedPair('SOL:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263:BONK');
        }
      }
    } else if (tradingMode === 'DEMO') {
      if (selectedPair.startsWith('SOL:')) {
        setSelectedPair('FX:EURUSD');
      }
    }
  }, [tradingMode, trendingCoins, selectedPair, setSelectedPair]);

  // Réinitialiser les champs SL/TP manuels lors d'un changement d'actif ou de sens (BUY <-> SELL)
  React.useEffect(() => {
    setStopLoss('');
    setTakeProfit('');
  }, [selectedPair, orderType]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrderRef.current || isSubmitting) return;
    isSubmittingOrderRef.current = true;
    setIsSubmitting(true);

    const resolvedPrice = resolveLivePrice(selectedPair, livePrices);
    const currentPrice = (resolvedPrice && resolvedPrice > 0) 
      ? resolvedPrice 
      : getRealMarketBasePrice(selectedPair);

    try {
      const parsedSl = stopLoss ? parseFloat(stopLoss) : undefined;
      const parsedTp = takeProfit ? parseFloat(takeProfit) : undefined;
      const effectiveOrderType: 'BUY' | 'SELL' = (tradingMode === 'REAL' && selectedPair.startsWith('SOL:')) ? 'BUY' : orderType;

      if (parsedSl !== undefined && !isNaN(parsedSl) && currentPrice > 0) {
        if (effectiveOrderType === 'BUY' && parsedSl >= currentPrice) {
          alert(`Stop Loss invalide pour un ordre d'achat (LONG) : le Stop Loss (${parsedSl}) doit être strictement inférieur au prix actuel (${currentPrice}).`);
          return;
        }
        if (effectiveOrderType === 'SELL' && parsedSl <= currentPrice) {
          alert(`Stop Loss invalide pour un ordre de vente (SHORT) : le Stop Loss (${parsedSl}) doit être strictement supérieur au prix actuel (${currentPrice}).`);
          return;
        }
      }
      if (parsedTp !== undefined && !isNaN(parsedTp) && currentPrice > 0) {
        if (effectiveOrderType === 'BUY' && parsedTp <= currentPrice) {
          alert(`Take Profit invalide pour un ordre d'achat (LONG) : le Take Profit (${parsedTp}) doit être strictement supérieur au prix actuel (${currentPrice}).`);
          return;
        }
        if (effectiveOrderType === 'SELL' && parsedTp >= currentPrice) {
          alert(`Take Profit invalide pour un ordre de vente (SHORT) : le Take Profit (${parsedTp}) doit être strictement inférieur au prix actuel (${currentPrice}).`);
          return;
        }
      }

      const isMemePair = selectedPair.startsWith('SOL:');
      const isBoostedOrder = !!aiMatch.boostedReason && !aiMatch.blockedReason;
      const defaultSlRatio = isMemePair ? (isBoostedOrder ? 0.065 : 0.075) : (isBoostedOrder ? 0.014 : 0.016);
      const defaultTpRatio = isMemePair ? (isBoostedOrder ? 0.22 : 0.16) : (isBoostedOrder ? 0.032 : 0.026);
      const computedSl = (parsedSl !== undefined && !isNaN(parsedSl))
        ? parsedSl
        : (currentPrice > 0 ? (effectiveOrderType === 'BUY' ? currentPrice * (1 - defaultSlRatio) : currentPrice * (1 + defaultSlRatio)) : undefined);
      const computedTp = (parsedTp !== undefined && !isNaN(parsedTp))
        ? parsedTp
        : (currentPrice > 0 ? (effectiveOrderType === 'BUY' ? currentPrice * (1 + defaultTpRatio) : currentPrice * (1 - defaultTpRatio)) : undefined);

      if (tradingMode === 'REAL') {
        // R1 & R2: Vérification obligatoire du wallet connecté
        if (!isSolanaWalletActive || !solanaPubKey) {
          alert("Aucun portefeuille Solana connecté. Veuillez connecter Phantom ou Solflare pour passer un ordre réel on-chain.");
          addBotLog("manual", "Manuel", "[ORDRE REJETÉ] Aucun portefeuille Solana connecté en Mode Réel.", 'error');
          return;
        }

        const currentSolBal = solanaBalance !== null ? solanaBalance : 0;
        const vaultSol = Number(reserveVaultSol) || 0;
        const allocatableSol = Math.max(0, currentSolBal - vaultSol);
        const reserveGas = 0.0015;
        const maxTradeableSol = Math.max(0, allocatableSol - reserveGas);

        if (orderAmount <= 0) {
          alert("Le montant doit être supérieur à 0.");
          return;
        }

        if (orderAmount > maxTradeableSol) {
          alert(`Solde SOL allocable insuffisant en tenant compte de la réserve obligatoire pour les frais de gaz réseau (0.0015 SOL protégés). Requis: ${orderAmount} SOL, Disponible: ${maxTradeableSol.toFixed(4)} SOL (Coffre-Fort protégé: ${vaultSol.toFixed(4)} SOL)`);
          return;
        }

        // Branche 1: Jeton Pump.fun (SOL:mint:symbol)
        if (selectedPair.startsWith('SOL:')) {
          const parts = selectedPair.split(':');
          const mintAddress = parts[1];
          if (!mintAddress || mintAddress.startsWith('ukhh')) {
            alert("Adresse de contrat Solana (Mint CA) invalide.");
            return;
          }

          const tokenSymbol = parts[2] || 'TOKEN';
          addBotLog("manual", "Manuel", `Envoi d'un ordre d'achat réel de ${orderAmount} SOL pour $${tokenSymbol}...`, 'info');

          const res = await executeRealPumpTrade({
            action: 'buy',
            mint: mintAddress,
            amount: orderAmount,
            denominatedInSol: true,
            slippage: 15,
            priorityFee: 0.005,
            walletProvider: typeof window !== 'undefined' ? (window as any).solana : undefined
          });

          if (res && res.success && res.txHash) {
            const explorerUrl = res.explorerUrl || getExplorerTxUrl('SOL', res.txHash);
            addBotLog("manual", "Manuel", `[ACHAT MANUEL RÉEL RÉUSSI] Transaction confirmée ! Hash: ${res.txHash.slice(0, 16)}... Solscan: ${explorerUrl}`, 'trade');

            const newRealPos: Position = {
              id: 'pos_' + Math.random().toString(36).substring(2, 9),
              pair: selectedPair,
              type: 'BUY',
              entryPrice: currentPrice,
              currentPrice: currentPrice,
              highestPrice: currentPrice,
              amount: orderAmount,
              leverage: 1,
              sl: computedSl,
              tp: computedTp,
              trailingTier: 0,
              timestamp: Date.now(),
              txHash: res.txHash,
              mint: mintAddress,
              bondingCurveProgress: curveProgress,
              replyCount: replyCount,
              isAiPatternBoosted: isBoostedOrder,
              aiBoostReason: isBoostedOrder ? aiMatch.boostedReason! : undefined,
              isCustomSl: parsedSl !== undefined && !isNaN(parsedSl),
              isCustomTp: parsedTp !== undefined && !isNaN(parsedTp),
              mode: 'REAL' as const
            };

            setActivePositions(prev => [...prev, newRealPos]);
            window.dispatchEvent(new Event('web3_wallet_updated'));
            setStopLoss('');
            setTakeProfit('');
          } else {
            const errMsg = res?.error || 'Erreur réseau RPC Solana ou signature refusée par l\'utilisateur.';
            addBotLog("manual", "Manuel", `[ÉCHEC ACHAT MANUEL RÉEL] ${errMsg}`, 'error');
            alert(`Échec de la transaction on-chain Solana : ${errMsg}`);
          }
          setStopLoss('');
          setTakeProfit('');
          return;
        }

        // Branche 2: Jeton Crypto Majeur via Jupiter Aggregator (SOLANA_TOKEN_MINTS)
        const pairSymbol = selectedPair.replace('FX:', '').replace('-USD', '').replace('=X', '').replace('SOL:', '').split(':').pop()?.split('/')[0]?.toUpperCase() || '';
        const isCryptoOnChain = !!SOLANA_TOKEN_MINTS[pairSymbol];

        if (isCryptoOnChain) {
          addBotLog("manual", "Manuel", `Envoi d'un ordre réel ${orderType} de ${orderAmount} SOL pour ${pairSymbol} via Jupiter DEX (Solana Mainnet)...`, 'info');

          const res = await executeJupiterSwap({
            action: orderType.toLowerCase() as 'buy' | 'sell',
            symbol: pairSymbol,
            amountSol: orderAmount,
            slippageBps: 150,
            walletProvider: typeof window !== 'undefined' ? (window as any).solana : undefined
          });

          if (res && res.success && res.txHash) {
            const explorerUrl = res.explorerUrl || getExplorerTxUrl('SOL', res.txHash);
            addBotLog("manual", "Manuel", `[ORDRE JUPITER CONFIRMÉ ON-CHAIN] Hash: ${res.txHash.slice(0, 16)}... Solscan: ${explorerUrl}`, 'trade');

            const newRealPos: Position = {
              id: 'pos_' + Math.random().toString(36).substring(2, 9),
              pair: selectedPair,
              type: orderType,
              entryPrice: currentPrice,
              currentPrice: currentPrice,
              highestPrice: orderType === 'BUY' ? currentPrice : undefined,
              lowestPrice: orderType === 'SELL' ? currentPrice : undefined,
              amount: orderAmount,
              leverage: 1,
              sl: computedSl,
              tp: computedTp,
              trailingTier: 0,
              timestamp: Date.now(),
              txHash: res.txHash,
              isAiPatternBoosted: isBoostedOrder,
              aiBoostReason: isBoostedOrder ? aiMatch.boostedReason! : undefined,
              isCustomSl: parsedSl !== undefined && !isNaN(parsedSl),
              isCustomTp: parsedTp !== undefined && !isNaN(parsedTp),
              mode: 'REAL' as const
            };

            setActivePositions(prev => [...prev, newRealPos]);
            window.dispatchEvent(new Event('web3_wallet_updated'));
          } else {
            const errMsg = res?.error || 'Erreur réseau RPC Solana ou signature refusée.';
            addBotLog("manual", "Manuel", `[ÉCHEC ORDRE JUPITER RÉEL] ${errMsg}`, 'error');
            alert(`Échec de la transaction on-chain Solana : ${errMsg}`);
          }

          setStopLoss('');
          setTakeProfit('');
          return;
        }

        // Branche 3: PAIRES NON SUPPORTÉES ON-CHAIN EN MODE RÉEL -> FAIL-CLOSED STRICT
        // AUCUN FALLTHROUGH VERS DES POSITIONS SIMULÉES EN MODE RÉEL
        alert(`[REJET ORDRE RÉEL] La paire "${selectedPair}" n'est pas négociable on-chain sur Solana. Veuillez sélectionner un jeton Solana (Pump.fun ou Jupiter) ou basculer en Mode Démo.`);
        addBotLog("manual", "Manuel", `[ORDRE REJETÉ] Paire "${selectedPair}" non supportée on-chain en mode réel.`, 'error');
        return;
      }

      // --- MODE DEMO (Paper Trading) UNIQUEMENT ---
      if (orderAmount <= 0) {
        alert("Le montant doit être supérieur à 0.");
        return;
      }

      const marginRequired = orderAmount;
      const allocatableBalance = Math.max(0, balance - (reserveVault || 0));
      if (marginRequired > allocatableBalance) {
        alert(`Capital allocable insuffisant (hors Coffre-Fort 10%). Marge requise: $${marginRequired}, Capital allocable: $${allocatableBalance.toFixed(2)}. Coffre-Fort protégé: $${(Number(reserveVault) || 0).toFixed(2)}`);
        return;
      }

      const newPos: Position = {
        id: 'pos_' + Math.random().toString(36).substring(2, 9),
        pair: selectedPair,
        type: orderType,
        entryPrice: currentPrice,
        currentPrice: currentPrice,
        highestPrice: orderType === 'BUY' ? currentPrice : undefined,
        lowestPrice: orderType === 'SELL' ? currentPrice : undefined,
        amount: orderAmount,
        leverage: leverage,
        sl: computedSl,
        tp: computedTp,
        trailingTier: 0,
        timestamp: Date.now(),
        bondingCurveProgress: curveProgress,
        replyCount: replyCount,
        isAiPatternBoosted: isBoostedOrder,
        aiBoostReason: isBoostedOrder ? aiMatch.boostedReason! : undefined,
        isCustomSl: parsedSl !== undefined && !isNaN(parsedSl),
        isCustomTp: parsedTp !== undefined && !isNaN(parsedTp),
        mode: 'DEMO'
      };

      setActivePositions(prev => {
        if (prev.some(x => x.id === newPos.id)) return prev;
        return [...prev, newPos];
      });
      setBalance(bal => bal - orderAmount);

      setStopLoss('');
      setTakeProfit('');
    } catch (err: any) {
      const errMsg = err?.message || 'Erreur imprévue lors de la transmission de l\'ordre.';
      addBotLog("manual", "Manuel", `[EXCEPTION ORDRE] ${errMsg}`, 'error');
      alert(`Erreur : ${errMsg}`);
    } finally {
      isSubmittingOrderRef.current = false;
      setIsSubmitting(false);
    }
  };

  const activePairPrice = resolveLivePrice(selectedPair, livePrices) || getRealMarketBasePrice(selectedPair) || 0;

  return (
    <Card className="bg-[#150f21] border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl">
      <CardHeader className="p-0 flex flex-row justify-between items-center space-y-0 border-b border-white/10 pb-3">
        <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline">
          Passer un Ordre
        </CardTitle>
        <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 font-body">
          <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          Flux Direct Live
        </div>
      </CardHeader>

      <div className="mb-4">
        <PositionRiskCalculator solanaBalance={solanaBalance} />
      </div>

      <form onSubmit={handlePlaceOrder} noValidate className="space-y-4">
        {tradingMode === 'DEMO' ? (
          <>
            {/* Pair Selection */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider font-headline">Paire de Devises (Démo)</label>
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger className="w-full h-11 bg-black/40 border border-white/15 rounded-xl px-4 text-sm font-bold focus:ring-[#c2ff0c] text-white font-body">
                  <SelectValue placeholder="Choisir une paire" />
                </SelectTrigger>
                <SelectContent className="bg-[#150f21] border-white/15 text-white">
                  {currencyPairs.map(c => (
                    <SelectItem key={c.value} value={c.value} className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Learning Intelligence Banner (Demo) */}
            {aiMatch.blockedReason && (
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold font-headline">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>⚠️ PROTECTION ANTI-ERREUR IA ACTIVE</span>
                </div>
                <p className="text-white/80 font-body text-[11px] leading-relaxed">
                  {aiMatch.blockedReason}
                </p>
                <p className="text-[10px] text-rose-300/80 font-mono">
                  L&apos;IA a identifié ce motif suite à une perte passée et recommande d&apos;éviter ou d&apos;ajuster votre risque.
                </p>
              </div>
            )}

            {aiMatch.boostedReason && !aiMatch.blockedReason && (
              <div className="p-3 bg-emerald-950/30 border border-[#c2ff0c]/30 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#c2ff0c] font-bold font-headline">
                  <Zap className="h-4 w-4 text-[#c2ff0c] shrink-0" />
                  <span>⚡ MOTIF GAGNANT IA DÉTECTÉ</span>
                </div>
                <p className="text-white/80 font-body text-[11px] leading-relaxed">
                  {aiMatch.boostedReason}
                </p>
                <p className="text-[10px] text-emerald-300/80 font-mono">
                  Configuration statistiquement rentable. R:R optimisé suggéré.
                </p>
              </div>
            )}

            {/* Price Display */}
            <div className="bg-black/40 border border-white/15 rounded-xl p-4 flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase text-slate-200 font-body">Prix Actuel :</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-2xl font-black font-mono transition-colors duration-300",
                  priceDirections[selectedPair] === 'up' ? 'text-emerald-400' :
                  priceDirections[selectedPair] === 'down' ? 'text-rose-400' : 'text-white'
                )}>
                  {activePairPrice ? activePairPrice.toFixed(5) : 'Chargement...'}
                </span>
                {priceDirections[selectedPair] === 'up' && <TrendingUp className="h-5 w-5 text-emerald-400" />}
                {priceDirections[selectedPair] === 'down' && <TrendingDown className="h-5 w-5 text-rose-400" />}
              </div>
            </div>

            {/* Order Type Toggle */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOrderType('BUY')}
                className={cn(
                  "h-11 rounded-xl font-bold text-xs transition-all duration-300 font-headline uppercase",
                  orderType === 'BUY' 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:bg-emerald-500/30 hover:text-emerald-300" 
                    : "bg-white/5 text-white/40 border border-white/5 hover:text-white hover:bg-white/10"
                )}
              >
                ACHAT (LONG)
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOrderType('SELL')}
                className={cn(
                  "h-11 rounded-xl font-bold text-xs transition-all duration-300 font-headline uppercase",
                  orderType === 'SELL' 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)] hover:bg-rose-500/30 hover:text-rose-300" 
                    : "bg-white/5 text-white/40 border border-white/5 hover:text-white hover:bg-white/10"
                )}
              >
                VENTE (SHORT)
              </Button>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase font-headline">Montant ({(tradingMode as string) === 'REAL' ? 'Marge en SOL' : 'Marge en USD'})</label>
                <span className="text-[10px] text-slate-400 font-body">Max: {(tradingMode as string) === 'REAL' ? `${(solanaBalance || 0).toFixed(3)} SOL` : `${balance.toFixed(0)} $`}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{(tradingMode as string) === 'REAL' ? 'SOL' : '$'}</span>
                <Input
                  type="number"
                  value={orderAmount || ""}
                  onChange={(e) => setOrderAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                />
              </div>

              {/* Quick % Buttons for Mobile & Desktop */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[0.25, 0.50, 0.75, 1.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const allocatable = Math.max(0, balance - (reserveVault || 0));
                      const calculated = Math.max(0, Math.floor(allocatable * pct * 100) / 100);
                      setOrderAmount(calculated);
                    }}
                    className="py-1.5 px-2 text-[10px] font-mono font-extrabold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-all active:scale-95 select-none"
                  >
                    {pct === 1.0 ? 'MAX' : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage Slider */}
            <div className="space-y-1.5 bg-white/5 border border-white/10 rounded-xl p-3.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Effet de Levier</label>
                <span className="text-xs font-bold text-[#c2ff0c] font-body">{leverage}x</span>
              </div>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[leverage]}
                onValueChange={(val) => setLeverage(val[0])}
                className="w-full mt-2"
              />
              <div className="flex justify-between text-[8px] text-white/20 font-body px-0.5 mt-1">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
              </div>
            </div>

            {/* SL / TP inputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase font-headline">Protection Stop Loss / Take Profit</span>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Scalp', slPct: 0.015, tpPct: 0.035 },
                    { label: 'Standard', slPct: 0.03, tpPct: 0.06 },
                    { label: 'Swing', slPct: 0.05, tpPct: 0.12 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const base = activePairPrice || getRealMarketBasePrice(selectedPair);
                        if (base > 0) {
                          const decimals = base >= 100 ? 2 : base >= 1 ? 4 : 6;
                          const nextSl = orderType === 'BUY' ? base * (1 - preset.slPct) : base * (1 + preset.slPct);
                          const nextTp = orderType === 'BUY' ? base * (1 + preset.tpPct) : base * (1 - preset.tpPct);
                          setStopLoss(nextSl.toFixed(decimals));
                          setTakeProfit(nextTp.toFixed(decimals));
                        }
                      }}
                      className="px-2 py-0.5 text-[9px] font-mono font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded text-slate-300 hover:text-[#c2ff0c] transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-rose-300/80 uppercase font-headline">Stop Loss (Prix)</label>
                  <Input
                    type="number"
                    step="any"
                    value={stopLoss}
                    placeholder={activePairPrice ? (orderType === 'BUY' ? (activePairPrice * 0.97).toFixed(5) : (activePairPrice * 1.03).toFixed(5)) : 'Auto -3%'}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-300/80 uppercase font-headline">Take Profit (Prix)</label>
                  <Input
                    type="number"
                    step="any"
                    value={takeProfit}
                    placeholder={activePairPrice ? (orderType === 'BUY' ? (activePairPrice * 1.06).toFixed(5) : (activePairPrice * 0.94).toFixed(5)) : 'Auto +6%'}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Place Order Button */}
            <Button
              type="submit"
              className={cn(
                "w-full h-12 rounded-xl text-black font-semibold text-xs transition-all duration-300 font-headline uppercase tracking-wider mt-2 border-none",
                orderType === 'BUY' 
                  ? "bg-emerald-400 hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] text-emerald-950"
                  : "bg-rose-400 hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(251,113,133,0.3)] text-rose-955"
              )}
            >
              Ouvrir la Position {orderType === 'BUY' ? 'LONG' : 'SHORT'}
            </Button>
          </>
        ) : (
          <>
            {/* Solana Custom CA Input */}
            <div className="space-y-3 bg-purple-950/10 border border-purple-500/15 p-4 rounded-xl">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Sélection Jeton Solana en Temps Réel</label>
                  <span className="text-[9px] text-[#c2ff0c] font-mono animate-pulse">● Live Stream On-Chain</span>
                </div>
                <Select
                  value={selectedPair}
                  onValueChange={(val) => {
                    setSelectedPair(val);
                  }}
                >
                  <SelectTrigger className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body">
                    <SelectValue placeholder="Sélectionner un jeton en temps réel..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14101a] border-white/10 text-white max-h-64">
                    {trendingCoinsError ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-xs text-rose-400 font-bold">⚠️ API Pump.fun indisponible</p>
                        <p className="text-[10px] text-white/40 mt-1">{trendingCoinsError}</p>
                        <p className="text-[10px] text-white/40 mt-1">Saisissez le Mint Address manuellement ci-dessous.</p>
                      </div>
                    ) : trendingCoins.length > 0 ? (
                      trendingCoins.map(coin => (
                        <SelectItem key={coin.mint} value={`SOL:${coin.mint}:${coin.symbol}`} className="focus:bg-white/10 focus:text-white cursor-pointer text-xs">
                          ${coin.symbol} — {coin.name} ({Math.max(0, Math.min(100, (((coin.virtual_sol_reserves / 1e9) - 30) / 55) * 100)).toFixed(0)}% Curve)
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-purple-400 mx-auto mb-2" />
                        <p className="text-[10px] text-white/40">Chargement des jetons Pump.fun en live...</p>
                      </div>
                    )}
                    <SelectItem value="SOL:custom_mint:Token" className="focus:bg-white/10 focus:text-white cursor-pointer text-xs font-bold text-[#c2ff0c]">
                      ➕ Saisir un autre Mint Address (CA)...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(!selectedPair.startsWith('SOL:') || selectedPair.split(':')[1].startsWith('ukhh') || selectedPair.includes('custom_mint')) && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Adresse du Contrat du Jeton (Mint CA)</label>
                  <Input
                    type="text"
                    placeholder="Collez le Mint Address (ex: FNt55...)"
                    value={selectedPair.startsWith('SOL:') && !selectedPair.split(':')[1].startsWith('ukhh') && !selectedPair.includes('custom_mint') ? selectedPair.split(':')[1] : ''}
                    onChange={(e) => {
                      const ca = e.target.value.trim();
                      if (ca) {
                        setSelectedPair(`SOL:${ca}:Token`);
                      }
                    }}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* AI Learning Intelligence Banner (Real) */}
            {aiMatch.blockedReason && (
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold font-headline">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>⚠️ PROTECTION ANTI-ERREUR IA ACTIVE</span>
                </div>
                <p className="text-white/80 font-body text-[11px] leading-relaxed">
                  {aiMatch.blockedReason}
                </p>
                <p className="text-[10px] text-rose-300/80 font-mono">
                  L&apos;IA a identifié ce motif suite à une perte passée et recommande d&apos;éviter ou d&apos;ajuster votre risque.
                </p>
              </div>
            )}

            {aiMatch.boostedReason && !aiMatch.blockedReason && (
              <div className="p-3 bg-emerald-950/30 border border-[#c2ff0c]/30 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#c2ff0c] font-bold font-headline">
                  <Zap className="h-4 w-4 text-[#c2ff0c] shrink-0" />
                  <span>⚡ MOTIF GAGNANT IA DÉTECTÉ</span>
                </div>
                <p className="text-white/80 font-body text-[11px] leading-relaxed">
                  {aiMatch.boostedReason}
                </p>
                <p className="text-[10px] text-emerald-300/80 font-mono">
                  Configuration statistiquement rentable. R:R optimisé suggéré.
                </p>
              </div>
            )}

            {/* Amount in SOL */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Montant à Acheter (SOL)</label>
                <span className="text-[10px] text-[#c2ff0c] font-mono font-semibold">
                  Disponible : {solanaBalance !== null ? `${Math.max(0, solanaBalance - (Number(reserveVaultSol) || 0)).toFixed(4)} SOL (${formatSolToUsdAndHtg(Math.max(0, solanaBalance - (Number(reserveVaultSol) || 0))).combinedLabel})` : '0.0000 SOL'}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 text-xs font-mono">SOL</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={orderAmount || ""}
                  onChange={(e) => setOrderAmount(Math.max(0.001, parseFloat(e.target.value) || 0))}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-12 pr-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                />
              </div>
              {orderAmount > 0 && (
                <span className="text-[10px] text-purple-300/80 font-mono block pl-1">
                  {formatSolToUsdAndHtg(orderAmount).combinedLabel}
                </span>
              )}

              {/* Quick % Buttons for Solana in REAL mode */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[0.25, 0.50, 0.75].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const avail = Math.max(0, (solanaBalance || 0) - (Number(reserveVaultSol) || 0) - 0.002);
                      const calculated = Math.max(0.001, Math.floor(avail * pct * 10000) / 10000);
                      setOrderAmount(calculated);
                    }}
                    className="py-1.5 px-2 text-[10px] font-mono font-extrabold bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/20 rounded-lg text-purple-200 hover:text-white transition-all active:scale-95 select-none"
                  >
                    {pct * 100}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const avail = Math.max(0.001, Math.floor(Math.max(0, (solanaBalance || 0) - (Number(reserveVaultSol) || 0) - 0.002) * 10000) / 10000);
                    setOrderAmount(avail);
                  }}
                  className="py-1.5 px-2 text-[10px] font-mono font-extrabold bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-[#c2ff0c] hover:text-white transition-all active:scale-95 select-none"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Optional Stop Loss & Take Profit for Solana */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-300/80 uppercase font-headline">Protection SL / TP On-Chain</span>
                <div className="flex items-center gap-1">
                  {[
                    { label: 'Sniper (-6% / +15%)', slPct: 0.06, tpPct: 0.15 },
                    { label: 'Auto (-8% / +25%)', slPct: 0.08, tpPct: 0.25 },
                    { label: 'Moon (-8% / +50%)', slPct: 0.08, tpPct: 0.50 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const base = activePairPrice || getRealMarketBasePrice(selectedPair);
                        if (base > 0) {
                          const decimals = base >= 1 ? 4 : base >= 0.001 ? 6 : 8;
                          setStopLoss((base * (1 - preset.slPct)).toFixed(decimals));
                          setTakeProfit((base * (1 + preset.tpPct)).toFixed(decimals));
                        }
                      }}
                      className="px-2 py-0.5 text-[9px] font-mono font-bold bg-purple-950/40 hover:bg-purple-800/40 border border-purple-500/30 rounded text-purple-200 hover:text-[#c2ff0c] transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-300 uppercase font-headline">Stop Loss (Prix / $)</label>
                  <Input
                    type="number"
                    step="any"
                    value={stopLoss}
                    placeholder={activePairPrice > 0 ? (activePairPrice * 0.92).toFixed(6) : "Auto -8%"}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase font-headline">Take Profit (Prix / $)</label>
                  <Input
                    type="number"
                    step="any"
                    value={takeProfit}
                    placeholder={activePairPrice > 0 ? (activePairPrice * 1.25).toFixed(6) : "Auto +25%"}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Disclaimer & Execution button */}
            <div className="p-3 bg-purple-950/10 border border-purple-500/10 rounded-xl text-[9px] text-purple-300/70 leading-normal font-body">
              ⚡ Les ordres manuels en Mode Réel sont acheminés en direct via votre nœud Chainstack et s&apos;exécutent sur la blockchain Solana. Le levier est forcé à 1x (Spot).
            </div>

            <Button
              type="submit"
              disabled={!isSolanaWalletActive || isSubmitting}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/40"
            >
              {isSubmitting ? "Signature & Validation On-Chain..." : "Exécuter l'Achat Réel sur Solana"}
            </Button>
          </>
        )}
      </form>
    </Card>
  );
}
