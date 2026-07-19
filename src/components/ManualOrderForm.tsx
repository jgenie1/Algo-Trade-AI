"use client";

import React, { useState, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { executeRealPumpTrade } from '@/services/pumpFunService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const currencyPairs = [
  { value: 'FX:EURUSD', label: 'EUR/USD' },
  { value: 'FX:GBPUSD', label: 'GBP/USD' },
  { value: 'FX:USDJPY', label: 'USD/JPY' },
  { value: 'FX:AUDUSD', label: 'AUD/USD' },
  { value: 'FX:USDCAD', label: 'USD/CAD' },
  { value: 'FX:USDCHF', label: 'USD/CHF' },
  { value: 'BNB', label: 'BNB/USD' },
  { value: 'BTC', label: 'BTC/USD' },
  { value: 'ETH', label: 'ETH/USD' },
  { value: 'LINK', label: 'LINK/USD' },
  { value: 'GOLD', label: 'GOLD/USD' },
];

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
  const { tradingMode, balance, setBalance, setActivePositions, activePositions } = useAppState();

  // Local Form States
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderAmount, setOrderAmount] = useState<number>(500);
  const [leverage, setLeverage] = useState<number>(10);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');

  const isSubmittingOrderRef = useRef(false);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrderRef.current) return;
    isSubmittingOrderRef.current = true;

    setTimeout(() => {
      isSubmittingOrderRef.current = false;
    }, 500);

    const currentPrice = livePrices[selectedPair] || 0.0001;

    if (tradingMode === 'REAL') {
      if (!selectedPair.startsWith('SOL:')) {
        alert("Veuillez sélectionner un jeton Solana valide ou renseigner un CA.");
        return;
      }
      const parts = selectedPair.split(':');
      const mintAddress = parts[1];
      if (!mintAddress || mintAddress.startsWith('ukhh')) {
        alert("Adresse de contrat Solana invalide.");
        return;
      }
      if (orderAmount <= 0) {
        alert("Le montant doit être supérieur à 0.");
        return;
      }
      if (solanaBalance === null || orderAmount > solanaBalance) {
        alert(`Solde SOL insuffisant. Requis: ${orderAmount} SOL, Disponible: ${solanaBalance?.toFixed(3)} SOL`);
        return;
      }

      const tokenSymbol = parts[2] || 'TOKEN';
      addBotLog("manual", "Manuel", `Envoi d'un ordre d'achat réel de ${orderAmount} SOL pour $${tokenSymbol}...`, 'info');
      
      executeRealPumpTrade({
        action: 'buy',
        mint: mintAddress,
        amount: orderAmount,
        denominatedInSol: true,
        slippage: 15,
        priorityFee: 0.005
      }).then((res) => {
        if (res.success && res.txHash) {
          addBotLog("manual", "Manuel", `[ACHAT MANUEL RÉEL RÉUSSI] Transaction confirmée ! Hash: ${res.txHash.slice(0, 16)}...`, 'trade');
          
          const newRealPos = {
            id: 'pos_' + Math.random().toString(36).substring(2, 9),
            pair: selectedPair,
            type: 'BUY',
            entryPrice: currentPrice,
            currentPrice: currentPrice,
            amount: orderAmount,
            leverage: 1,
            timestamp: Date.now(),
            txHash: res.txHash
          };
          
          setActivePositions(prev => [...prev, newRealPos]);
        } else {
          addBotLog("manual", "Manuel", `[ÉCHEC ACHAT MANUEL RÉEL] ${res.error || 'Erreur réseau/RPC Solana.'}`, 'error');
          alert(`Échec de l'achat réel : ${res.error}`);
        }
      });
      return;
    }

    if (!livePrices[selectedPair]) {
      alert("Le prix en direct n'est pas encore disponible. Veuillez patienter.");
      return;
    }

    if (orderAmount <= 0) {
      alert("Le montant doit être supérieur à 0.");
      return;
    }

    const marginRequired = orderAmount;
    if (marginRequired > balance) {
      alert(`Solde insuffisant. Marge requise: ${marginRequired} $, Solde disponible: ${balance.toFixed(2)} $`);
      return;
    }

    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    const newPos = {
      id: 'pos_' + Math.random().toString(36).substring(2, 9),
      pair: selectedPair,
      type: orderType,
      entryPrice: currentPrice,
      currentPrice: currentPrice,
      amount: orderAmount,
      leverage: leverage,
      sl,
      tp,
      timestamp: Date.now()
    };

    setActivePositions(prev => {
      if (prev.some(x => x.id === newPos.id)) return prev;
      return [...prev, newPos];
    });
    setBalance(bal => bal - marginRequired);
    
    setStopLoss('');
    setTakeProfit('');
  };

  const activePairPrice = livePrices[selectedPair] || 0;

  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-5 shadow-xl">
      <CardHeader className="p-0 flex flex-row justify-between items-center space-y-0">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline">
          Passer un Ordre
        </CardTitle>
        <div className="flex items-center gap-1.5 text-xs text-white/40 font-body">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          Flux direct
        </div>
      </CardHeader>

      <form onSubmit={handlePlaceOrder} className="space-y-4">
        {tradingMode === 'DEMO' ? (
          <>
            {/* Pair Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Paire de devises (Démo)</label>
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body">
                  <SelectValue placeholder="Choisir une paire" />
                </SelectTrigger>
                <SelectContent className="bg-[#14101a] border-white/10 text-white">
                  {currencyPairs.map(c => (
                    <SelectItem key={c.value} value={c.value} className="focus:bg-white/10 focus:text-white cursor-pointer">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Display */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex justify-between items-center">
              <span className="text-xs text-white/50 font-body">Prix Actuel :</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xl font-bold font-body transition-colors duration-300",
                  priceDirections[selectedPair] === 'up' ? 'text-emerald-400' :
                  priceDirections[selectedPair] === 'down' ? 'text-rose-400' : 'text-white'
                )}>
                  {activePairPrice ? activePairPrice.toFixed(5) : 'Chargement...'}
                </span>
                {priceDirections[selectedPair] === 'up' && <TrendingUp className="h-4 w-4 text-emerald-400" />}
                {priceDirections[selectedPair] === 'down' && <TrendingDown className="h-4 w-4 text-rose-400" />}
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
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Montant (Marge en USD)</label>
                <span className="text-[10px] text-white/40 font-body">Max: {balance.toFixed(0)} $</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input
                  type="number"
                  value={orderAmount || ""}
                  onChange={(e) => setOrderAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Stop Loss (Prix)</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  placeholder={activePairPrice ? (orderType === 'BUY' ? (activePairPrice * 0.985).toFixed(5) : (activePairPrice * 1.015).toFixed(5)) : 'Facultatif'}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase font-headline">Take Profit (Prix)</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={takeProfit}
                  placeholder={activePairPrice ? (orderType === 'BUY' ? (activePairPrice * 1.03).toFixed(5) : (activePairPrice * 0.97).toFixed(5)) : 'Facultatif'}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                />
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
                <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Sélection Jeton Solana (Réel)</label>
                <Select
                  value={selectedPair.startsWith('SOL:') && !selectedPair.split(':')[1].startsWith('ukhh') ? 'SOL:custom' : selectedPair}
                  onValueChange={(val) => {
                    if (val !== 'SOL:custom') {
                      setSelectedPair(val);
                    } else {
                      setSelectedPair('SOL:custom_mint:Token');
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm focus:ring-[#c2ff0c] text-white font-body">
                    <SelectValue placeholder="Choisir un jeton" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#14101a] border-white/10 text-white">
                    <SelectItem value="SOL:ukhh55555555555555555555555555555555555:SOL" className="focus:bg-white/10 focus:text-white cursor-pointer">
                      Sélectionner un jeton...
                    </SelectItem>
                    <SelectItem value="SOL:ukhh11111111111111111111111111111111111:$WIFUN" className="focus:bg-white/10 focus:text-white cursor-pointer">
                      $WIFUN
                    </SelectItem>
                    <SelectItem value="SOL:ukhh22222222222222222222222222222222222:$PEPEFUN" className="focus:bg-white/10 focus:text-white cursor-pointer">
                      $PEPEFUN
                    </SelectItem>
                    <SelectItem value="SOL:ukhh33333333333333333333333333333333333:$BONKFUN" className="focus:bg-white/10 focus:text-white cursor-pointer">
                      $BONKFUN
                    </SelectItem>
                    <SelectItem value="SOL:custom" className="focus:bg-white/10 focus:text-white cursor-pointer">
                      Autre Jeton (Saisir adresse)...
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

            {/* Amount in SOL */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-purple-300 uppercase font-headline">Montant à Acheter (SOL)</label>
                <span className="text-[10px] text-white/40 font-body">Disponible : {solanaBalance !== null ? `${solanaBalance.toFixed(3)} SOL` : '0.00 SOL'}</span>
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
                <div className="text-[10px] text-purple-400 font-semibold font-body mt-1 text-right animate-in fade-in duration-200">
                  ≈ ${(orderAmount * (livePrices['SOL'] || 140)).toFixed(2)} USD / {(orderAmount * (livePrices['SOL'] || 140) * 130).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} HTG
                </div>
              )}
            </div>

            {/* Disclaimer & Execution button */}
            <div className="p-3 bg-purple-950/10 border border-purple-500/10 rounded-xl text-[9px] text-purple-300/70 leading-normal font-body">
              ⚡ Les ordres manuels en Mode Réel sont acheminés en direct via votre nœud Chainstack et s'exécutent sur la blockchain Solana. Le levier est forcé à 1x (Spot).
            </div>

            <Button
              type="submit"
              disabled={!isSolanaWalletActive}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/40"
            >
              Exécuter l'Achat Réel sur Solana
            </Button>
          </>
        )}
      </form>
    </Card>
  );
}
