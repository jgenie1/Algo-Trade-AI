"use client";

import React, { useState } from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  Trash2, 
  History,
  RotateCcw
} from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg, formatSmartPnl, formatSmartCrypto, formatSmartNumber } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { saveBotLearnings } from '@/lib/firebase';
import { sweepSubWalletProfitToMaster } from '@/services/pumpFunService';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

const currencyPairs = [
  { value: 'ALL', label: '🌐 Toutes les Paires (Scan Multi-Actifs Continu)' },
  { value: 'FX:EURUSD', label: 'EUR/USD' },
  { value: 'FX:GBPUSD', label: 'GBP/USD' },
  { value: 'FX:USDJPY', label: 'USD/JPY' },
  { value: 'FX:AUDUSD', label: 'AUD/USD' },
  { value: 'FX:USDCAD', label: 'USD/CAD' },
  { value: 'FX:USDCHF', label: 'USD/CHF' },
  { value: 'FX:EURGBP', label: 'EUR/GBP' },
  { value: 'FX:EURJPY', label: 'EUR/JPY' },
  { value: 'FX:GBPJPY', label: 'GBP/JPY' },
  { value: 'BTC', label: 'BTC/USD' },
  { value: 'ETH', label: 'ETH/USD' },
  { value: 'SOL', label: 'SOL/USD' },
  { value: 'BNB', label: 'BNB/USD' },
  { value: 'XRP', label: 'XRP/USD' },
  { value: 'ADA', label: 'ADA/USD' },
  { value: 'DOGE', label: 'DOGE/USD' },
  { value: 'LINK', label: 'LINK/USD' },
  { value: 'AVAX', label: 'AVAX/USD' },
  { value: 'GOLD', label: 'GOLD/USD' },
  { value: 'SILVER', label: 'SILVER/USD' },
  { value: 'OIL', label: 'OIL/USD' },
];

const timeframes = [
  { value: '1', label: '1 min (Scalping)' },
  { value: '5', label: '5 min (Intraday Momentum)' },
  { value: '15', label: '15 min (Intraday Standard)' },
  { value: '60', label: '1 heure (Swing Trading)' },
  { value: '240', label: '4 heures (Tendance Majeure)' },
];

interface TradingBotsManagerProps {
  solanaBalance: number | null;
  setSolanaBalance: React.Dispatch<React.SetStateAction<number | null>>;
  isSolanaWalletActive: boolean;
  addBotLog: (botId: string, botName: string, message: string, type: 'info' | 'trade' | 'error') => void;
  handleToggleBot: (botId: string) => void;
  handleDeleteBot: (botId: string) => void;
  livePrices: { [key: string]: number };
}

export default function TradingBotsManager({
  solanaBalance,
  setSolanaBalance,
  isSolanaWalletActive,
  addBotLog,
  handleToggleBot,
  handleDeleteBot,
  livePrices
}: TradingBotsManagerProps) {
  const { 
    tradingMode, 
    balance, 
    setBalance, 
    reserveVault,
    setReserveVault,
    reserveVaultSol,
    setReserveVaultSol,
    bots, 
    setBots, 
    botLogs, 
    botLearnings, 
    setBotLearnings, 
    closedPositions, 
    setTransactions,
    resetDemoData,
    isLoading 
  } = useAppState();

  const handleClaimBotProfit = async (botId: string) => {
    const targetBot = bots.find((b) => b.id === botId);

    if (!targetBot) {
      return;
    }

    const profitToClaim =
      typeof targetBot.netProfit === 'number' &&
      Number.isFinite(targetBot.netProfit) &&
      targetBot.netProfit > 0
        ? targetBot.netProfit
        : typeof targetBot.pnl === 'number' &&
          Number.isFinite(targetBot.pnl) &&
          targetBot.pnl > 0
        ? targetBot.pnl
        : 0;

    if (profitToClaim <= 0) {
      alert('Aucun gain à encaisser pour ce robot.');
      return;
    }

    const isRealMode =
      (targetBot.mode || tradingMode) === 'REAL';

    /*
     * DEMO
     */
    if (!isRealMode) {
      if (
        !confirm(
          `Voulez-vous encaisser +${profitToClaim.toFixed(
            2
          )} $ ?`
        )
      ) {
        return;
      }

      setBalance((prev) => prev + profitToClaim);

      const skimUsd = profitToClaim * 0.10;

      if (setReserveVault) {
        setReserveVault(
          (prev) => (Number(prev) || 0) + skimUsd
        );
      }

      setBots((prev) =>
        prev.map((b) =>
          b.id === botId
            ? {
                ...b,
                netProfit: 0,
                pnl: 0,
              }
            : b
        )
      );

      setTransactions?.((prev) => [
        {
          id:
            'tx_claim_' +
            Math.random().toString(36).substring(2, 9),
          type: 'CLAIM',
          amount: profitToClaim,
          currency: '$',
          status: 'COMPLETED',
          timestamp: Date.now(),
          description:
            `Encaissement des bénéfices du bot ${targetBot.strategy}`,
        },
        ...(prev || []),
      ]);

      addBotLog(
        botId,
        targetBot.strategy,
        `[ENCAISSEMENT RÉUSSI] +${profitToClaim.toFixed(
          2
        )} $ encaissés.`,
        'trade'
      );

      alert(
        `✅ +${profitToClaim.toFixed(
          2
        )} $ encaissés avec succès.`
      );

      return;
    }

    /*
     * REAL / SOLANA
     */

    const storedWallet =
      typeof window !== 'undefined'
        ? localStorage.getItem('connected_web3_wallet')
        : null;

    if (!storedWallet) {
      alert(
        'Aucun portefeuille Solana connecté.'
      );
      return;
    }

    let walletData: { address?: string };

    try {
      walletData = JSON.parse(storedWallet);
    } catch {
      alert(
        'Les informations du portefeuille connecté sont invalides.'
      );
      return;
    }

    const masterPubKey = walletData.address;

    if (!masterPubKey) {
      alert(
        'Adresse du portefeuille principal introuvable.'
      );
      return;
    }

    const storedSubs =
      typeof window !== 'undefined'
        ? localStorage.getItem('trade_sub_wallets')
        : null;

    if (!storedSubs) {
      alert(
        'Aucun sous-wallet de trading trouvé.'
      );
      return;
    }

    let subWalletsArr: Array<{
      privateKey?: string;
      publicKey?: string;
    }>;

    try {
      subWalletsArr = JSON.parse(storedSubs);
    } catch {
      alert(
        'Les sous-wallets enregistrés sont invalides.'
      );
      return;
    }

    const subIdx =
      ((targetBot as any).subWallet || 1) - 1;

    const subWallet =
      subWalletsArr[subIdx];

    if (!subWallet?.privateKey) {
      alert(
        `Aucune clé privée trouvée pour le sous-wallet #${
          subIdx + 1
        }.`
      );
      return;
    }

    const amountToMaster =
      profitToClaim * 0.90;

    if (amountToMaster <= 0) {
      alert(
        'Le montant net à transférer est nul.'
      );
      return;
    }

    if (
      !confirm(
        `Transférer réellement ${amountToMaster.toFixed(
          6
        )} SOL vers votre portefeuille connecté ?\n\n` +
          `Profit: ${profitToClaim.toFixed(
            6
          )} SOL\n` +
          `Part transférée: ${amountToMaster.toFixed(
            6
          )} SOL\n` +
          `Réserve interne: ${(profitToClaim * 0.10).toFixed(
            6
          )} SOL`
      )
    ) {
      return;
    }

    /*
     * IMPORTANT:
     * On ne touche PAS au profit avant la confirmation
     * de la transaction blockchain.
     */
    try {
      addBotLog(
        botId,
        targetBot.strategy,
        `[TRANSFERT] Préparation du transfert de ${amountToMaster.toFixed(
          6
        )} SOL vers ${masterPubKey}...`,
        'info'
      );

      const result =
        await sweepSubWalletProfitToMaster({
          subWalletPrivateKey:
            subWallet.privateKey,
          masterPublicKey: masterPubKey,
          netProfitSol:
            amountToMaster,
        });

      const txHash = result.txHash || result.signature;

      if (!result.success || !txHash) {
        throw new Error(
          result.error ||
            "La transaction n'a pas été confirmée sur le réseau Solana."
        );
      }

      /*
       * SEULEMENT MAINTENANT on considère le claim réussi.
       */

      const skimSol =
        profitToClaim * 0.10;

      if (setReserveVaultSol) {
        setReserveVaultSol(
          (prev) =>
            (Number(prev) || 0) + skimSol
        );
      }

      setBots((prev) =>
        prev.map((b) =>
          b.id === botId
            ? {
                ...b,
                netProfit: 0,
                pnl: 0,
              }
            : b
        )
      );

      setTransactions?.((prev) => [
        {
          id:
            'tx_claim_' +
            Math.random().toString(36).substring(2, 9),
          type: 'CLAIM',
          amount: result.sentSol,
          currency: 'SOL',
          status: 'COMPLETED',
          timestamp: Date.now(),
          description:
            `Transfert blockchain des bénéfices du bot ${targetBot.strategy}`,
          signature: result.signature,
        },
        ...(prev || []),
      ]);

      addBotLog(
        botId,
        targetBot.strategy,
        `[BLOCKCHAIN CONFIRMÉE] ${result.sentSol.toFixed(
          6
        )} SOL transférés vers ${result.destinationAddress}. TX: ${result.signature}`,
        'trade'
      );

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new Event('web3_wallet_updated')
        );
      }

      alert(
        `✅ TRANSFERT CONFIRMÉ SUR SOLANA\n\n` +
          `${result.sentSol.toFixed(
            6
          )} SOL ont été transférés vers votre portefeuille.\n\n` +
          `Transaction:\n${result.signature}`
      );
    } catch (error) {
      console.error(
        'Erreur transfert blockchain:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Erreur inconnue';

      /*
       * TRÈS IMPORTANT:
       * Le bot conserve son netProfit.
       * On ne prétend PAS que le paiement a réussi.
       */

      addBotLog(
        botId,
        targetBot.strategy,
        `[ÉCHEC TRANSFERT] ${message}`,
        'error'
      );

      alert(
        `❌ Le transfert SOL a échoué.\n\n${message}\n\n` +
          `Aucun gain n'a été supprimé du bot.`
      );
    }
  };

  const handleClaimAllProfits = async () => {
    const botsWithProfits = filteredBots.filter(
      (b) =>
        Number(b.netProfit || b.pnl || 0) > 0
    );

    if (botsWithProfits.length === 0) {
      alert(
        'Aucun gain à encaisser pour le moment.'
      );
      return;
    }

    /*
     * DEMO
     */
    if (tradingMode !== 'REAL') {
      const totalProfit = botsWithProfits.reduce(
        (sum, bot) =>
          sum +
          Number(
            bot.netProfit || bot.pnl || 0
          ),
        0
      );

      if (
        !confirm(
          `Encaisser ${totalProfit.toFixed(2)} $ ?`
        )
      ) {
        return;
      }

      setBalance(
        (prev) => prev + totalProfit
      );

      setReserveVault?.(
        (prev) =>
          (Number(prev) || 0) +
          totalProfit * 0.10
      );

      const ids = new Set(
        botsWithProfits.map((b) => b.id)
      );

      setBots((prev) =>
        prev.map((b) =>
          ids.has(b.id)
            ? {
                ...b,
                netProfit: 0,
                pnl: 0,
              }
            : b
        )
      );

      setTransactions?.((prev) => [
        {
          id:
            'tx_claim_all_' +
            Math.random().toString(36).substring(2, 9),
          type: 'CLAIM',
          amount: totalProfit,
          currency: '$',
          status: 'COMPLETED',
          timestamp: Date.now(),
          description:
            'Encaissement global des bénéfices',
        },
        ...(prev || []),
      ]);

      alert(
        `✅ ${totalProfit.toFixed(
          2
        )} $ encaissés.`
      );

      return;
    }

    /*
     * REAL
     */

    const storedWallet =
      typeof window !== 'undefined'
        ? localStorage.getItem(
            'connected_web3_wallet'
          )
        : null;

    if (!storedWallet) {
      alert(
        'Aucun portefeuille Solana connecté.'
      );
      return;
    }

    let walletData: { address?: string };

    try {
      walletData = JSON.parse(storedWallet);
    } catch {
      alert(
        'Portefeuille connecté invalide.'
      );
      return;
    }

    const masterPubKey =
      walletData.address;

    if (!masterPubKey) {
      alert(
        'Adresse du portefeuille principal introuvable.'
      );
      return;
    }

    const storedSubs =
      typeof window !== 'undefined'
        ? localStorage.getItem(
            'trade_sub_wallets'
          )
        : null;

    if (!storedSubs) {
      alert(
        'Aucun sous-wallet de trading trouvé.'
      );
      return;
    }

    let subWalletsArr: Array<{
      privateKey?: string;
    }>;

    try {
      subWalletsArr =
        JSON.parse(storedSubs);
    } catch {
      alert(
        'Sous-wallets invalides.'
      );
      return;
    }

    if (
      !confirm(
        `Vous allez transférer les gains réellement disponibles des ${botsWithProfits.length} bots vers:\n\n${masterPubKey}\n\nContinuer ?`
      )
    ) {
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    let totalSent = 0;

    const successfulBotIds: string[] = [];

    for (const bot of botsWithProfits) {
      const profit =
        Number(
          bot.netProfit || bot.pnl || 0
        );

      if (!Number.isFinite(profit) || profit <= 0) {
        continue;
      }

      const subIdx =
        ((bot as any).subWallet || 1) - 1;

      const subWallet =
        subWalletsArr[subIdx];

      if (!subWallet?.privateKey) {
        failedCount++;

        addBotLog(
          bot.id,
          bot.strategy,
          `[ÉCHEC] Sous-wallet #${
            subIdx + 1
          } introuvable.`,
          'error'
        );

        continue;
      }

      const amountToMaster =
        profit * 0.90;

      try {
        addBotLog(
          bot.id,
          bot.strategy,
          `[TRANSFERT] ${amountToMaster.toFixed(
            6
          )} SOL vers le Master Wallet...`,
          'info'
        );

        const result =
          await sweepSubWalletProfitToMaster({
            subWalletPrivateKey:
              subWallet.privateKey,
            masterPublicKey: masterPubKey,
            netProfitSol:
              amountToMaster,
          });

        if (
          !result.success ||
          !result.signature
        ) {
          throw new Error(
            result.error ||
              'Transaction non confirmée.'
          );
        }

        successCount++;
        totalSent += result.sentSol;
        successfulBotIds.push(bot.id);

        setReserveVaultSol?.(
          (prev) =>
            (Number(prev) || 0) +
            profit * 0.10
        );

        setTransactions?.((prev) => [
          {
            id:
              'tx_claim_' +
              Math.random()
                .toString(36)
                .substring(2, 9),
            type: 'CLAIM',
            amount: result.sentSol,
            currency: 'SOL',
            status: 'COMPLETED',
            timestamp: Date.now(),
            description:
              `Transfert blockchain du bot ${bot.strategy}`,
            signature:
              result.signature,
          },
          ...(prev || []),
        ]);

        addBotLog(
          bot.id,
          bot.strategy,
          `[BLOCKCHAIN CONFIRMÉE] ${result.sentSol.toFixed(
            6
          )} SOL transférés. TX: ${result.signature}`,
          'trade'
        );
      } catch (error) {
        failedCount++;

        const message =
          error instanceof Error
            ? error.message
            : 'Erreur inconnue';

        addBotLog(
          bot.id,
          bot.strategy,
          `[ÉCHEC BLOCKCHAIN] ${message}`,
          'error'
        );
      }
    }

    /*
     * NE RESET QUE LES BOTS DONT LA TRANSACTION
     * A ÉTÉ EFFECTIVEMENT CONFIRMÉE.
     */
    if (successfulBotIds.length > 0) {
      const successIds = new Set(
        successfulBotIds
      );

      setBots((prev) =>
        prev.map((bot) =>
          successIds.has(bot.id)
            ? {
                ...bot,
                netProfit: 0,
                pnl: 0,
              }
            : bot
        )
      );
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new Event('web3_wallet_updated')
      );
    }

    if (successCount > 0) {
      alert(
        `✅ Encaissement terminé.\n\n` +
          `Bots réussis: ${successCount}\n` +
          `Bots échoués: ${failedCount}\n` +
          `SOL réellement transférés: ${totalSent.toFixed(
            6
          )} SOL\n\n` +
          `Les bots en échec ont conservé leurs gains.`
      );
    } else {
      alert(
        `❌ Aucun transfert blockchain n'a réussi.\n\n` +
          `Les gains des bots ont été conservés.`
      );
    }
  };

  const isReal = tradingMode === 'REAL';
  const rawBalance = isReal ? (solanaBalance || 0) : balance;
  const currentReserveVault = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const allocatableBalance = Math.max(0, rawBalance - currentReserveVault);

  // New Bot Form State
  const [botPair, setBotPair] = useState<string>('ALL');
  const [botStrategy, setBotStrategy] = useState<'RSI Pullback' | 'EMA Cross' | 'BB Mean Reversion' | 'SuperTrend Momentum' | 'VWAP Breakout' | 'AI Autopilot (Machine à Cash)' | 'Pump.fun Sniper Bot'>('AI Autopilot (Machine à Cash)');
  const [botTimeframe, setBotTimeframe] = useState<string>('15');
  const [botCapital, setBotCapital] = useState<number>(() => isReal ? 0.5 : 1000);
  const [botRiskProfile, setBotRiskProfile] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE');
  const [pumpSniperMode, setPumpSniperMode] = useState<'PRECOCE' | 'MOMENTUM' | 'RAYDIUM'>('PRECOCE');
  const [priorityFee, setPriorityFee] = useState<number>(0.005);
  const [autoVolume, setAutoVolume] = useState<boolean>(false);
  const [botCustomRules, setBotCustomRules] = useState<string>('');

  React.useEffect(() => {
    if (tradingMode === 'REAL' && botCapital === 1000) {
      setBotCapital(0.5);
    } else if (tradingMode === 'DEMO' && botCapital === 0.5) {
      setBotCapital(1000);
    }
  }, [tradingMode]);

  const handleStartBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (botCapital <= 0) {
      alert("Le capital du bot doit être supérieur à 0.");
      return;
    }

    if (tradingMode === 'REAL') {
      if (solanaBalance === null || botCapital > allocatableBalance) {
        alert(`Solde SOL allocable insuffisant. Requis: ${botCapital} SOL, Capital allocable (hors Coffre-Fort SOL): ${allocatableBalance.toFixed(3)} SOL (Coffre-Fort protégé: ${currentReserveVault.toFixed(3)} SOL).`);
        return;
      }
    } else {
      if (botCapital > allocatableBalance) {
        alert(`Capital insuffisant pour le bot. Requis: ${botCapital} $, Capital allocable (hors Coffre-Fort de Réserve 10%): $${allocatableBalance.toFixed(2)}. Le coffre-fort ($${currentReserveVault.toFixed(2)}) est intouchable et protégé.`);
        return;
      }
    }

    const newBot = {
      id: 'bot_' + Math.random().toString(36).substring(2, 9),
      pair: botStrategy === 'AI Autopilot (Machine à Cash)' 
        ? 'ALL' 
        : botStrategy === 'Pump.fun Sniper Bot'
          ? 'SOL:MEME'
          : botPair,
      strategy: botStrategy,
      timeframe: botStrategy === 'Pump.fun Sniper Bot' ? '0' : botTimeframe,
      capital: botCapital,
      status: 'RUNNING',
      createdAt: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      consecutiveLosses: 0,
      netProfit: 0,
      selectivityMultiplier: 1.0,
      riskProfile: botStrategy === 'AI Autopilot (Machine à Cash)' ? botRiskProfile : undefined,
      pumpMode: botStrategy === 'Pump.fun Sniper Bot' ? pumpSniperMode : undefined,
      priorityFee: botStrategy === 'Pump.fun Sniper Bot' ? priorityFee : undefined,
      autoVolume: botStrategy === 'Pump.fun Sniper Bot' ? autoVolume : undefined,
      mode: tradingMode,
      customRules: botCustomRules || undefined
    };

    setBots(prev => {
      if (prev.some(x => x.id === newBot.id)) return prev;
      return [...prev, newBot];
    });

    setBotCustomRules('');

    if (tradingMode === 'REAL') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('web3_wallet_updated'));
      }
      addBotLog(newBot.id, newBot.strategy, `Sniper Bot Solana démarré en réel avec ${newBot.capital} SOL de capital allocation.`, 'info');
    } else {
      setBalance(bal => bal - botCapital);
      const logPair = newBot.pair === 'ALL' ? 'Scan Global' : newBot.pair.replace('FX:', '').replace('-USD', '').replace('=', '');
      addBotLog(newBot.id, newBot.strategy, `Bot démarré sur ${logPair} (${newBot.timeframe}m) avec ${newBot.capital} $ de capital.`, 'info');
    }
  };

  const safeBots = Array.isArray(bots) ? bots : [];
  const safeClosedPositions = Array.isArray(closedPositions) ? closedPositions : [];
  const safeBotLogs = Array.isArray(botLogs) ? botLogs : [];
  const safeBotLearnings = Array.isArray(botLearnings) ? botLearnings : [];

  const filteredBots = safeBots.filter(b => b && (b.mode || 'DEMO') === tradingMode);
  const totalClaimableProfits = filteredBots.reduce((sum, b) => sum + ((b.netProfit || b.pnl || 0) > 0 ? (b.netProfit || b.pnl || 0) : 0), 0);

  const filteredClosed = safeClosedPositions.filter(h => h && (h.mode || 'DEMO') === tradingMode);

  const totalGains = filteredClosed.reduce((sum, h) => {
    const val = typeof h.profit === 'number' && !isNaN(h.profit) ? h.profit : (typeof h.pnl === 'number' && !isNaN(h.pnl) ? h.pnl : 0);
    return sum + (val > 0 ? val : 0);
  }, 0);

  const totalLosses = filteredClosed.reduce((sum, h) => {
    const val = typeof h.profit === 'number' && !isNaN(h.profit) ? h.profit : (typeof h.pnl === 'number' && !isNaN(h.pnl) ? h.pnl : 0);
    return sum + (val < 0 ? Math.abs(val) : 0);
  }, 0);

  const netRealizedPnL = totalGains - totalLosses;
  const winningCount = filteredClosed.filter(h => {
    const val = typeof h.profit === 'number' && !isNaN(h.profit) ? h.profit : (typeof h.pnl === 'number' && !isNaN(h.pnl) ? h.pnl : 0);
    return val >= 0;
  }).length;
  const overallWinRate = filteredClosed.length > 0 ? (winningCount / filteredClosed.length) * 100 : 0;

  const hasPrivateKey = typeof window !== 'undefined' && !!localStorage.getItem('settings_solana_private_key');

  return (
    <div className="space-y-6">
      {tradingMode === 'REAL' && (
        <div className={cn(
          "p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-body shadow-lg",
          hasPrivateKey
            ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
            : "bg-amber-950/30 border-amber-500/40 text-amber-300"
        )}>
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-base">{hasPrivateKey ? '⚡' : '⚠️'}</span>
            <div>
              <span className="font-extrabold uppercase tracking-wide font-headline block">
                {hasPrivateKey ? 'Exécution 100% Autonome Active' : 'Mode Validation Phantom Actif'}
              </span>
              <span className="text-[11px] text-white/70">
                {hasPrivateKey
                  ? 'Clé privée configurée : les robots exécutent les transactions Solana en arrière-plan sans aucune fenêtre de popup.'
                  : 'Phantom demande une validation manuelle à chaque trade. Pour un trading 100% autonome sans popup, enregistrez votre Clé Privée Solana.'}
              </span>
            </div>
          </div>
          {!hasPrivateKey && (
            <a
              href="/settings"
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-[11px] font-bold font-headline shrink-0 transition-all"
            >
              🔑 Configurer Clé Privée ↗
            </a>
          )}
        </div>
      )}

      {/* Bot Configuration Form */}
      <Card className="bg-[#150f21] border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl">

        <CardHeader className="p-0">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider font-headline">Sélectionner une Stratégie</label>
            <Select
              value={botStrategy}
              onValueChange={(val) => setBotStrategy(val as any)}
            >
              <SelectTrigger className="w-full h-11 bg-black/40 border border-white/15 rounded-xl px-4 text-sm font-bold focus:ring-[#c2ff0c] text-white font-body">
                <SelectValue placeholder="Choisir une stratégie" />
              </SelectTrigger>
              <SelectContent className="bg-[#150f21] border-white/15 text-white">
                {tradingMode === 'DEMO' ? (
                  <>
                    <SelectItem value="AI Autopilot (Machine à Cash)" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      🤖 IA Autopilot (Machine à Cash)
                    </SelectItem>
                    <SelectItem value="Pump.fun Sniper Bot" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      🎯 Pump.fun Sniper Bot (Démo Solana)
                    </SelectItem>
                    <SelectItem value="SuperTrend Momentum" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      ⚡ SuperTrend Volatility Momentum
                    </SelectItem>
                    <SelectItem value="VWAP Breakout" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      📊 VWAP Volume Weighted Breakout
                    </SelectItem>
                    <SelectItem value="RSI Pullback" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      📈 RSI Pullback Reversal
                    </SelectItem>
                    <SelectItem value="EMA Cross" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      📉 EMA Golden Cross Trend
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="AI Autopilot (Machine à Cash)" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      🤖 IA Autopilot (Machine à Cash) (Réel)
                    </SelectItem>
                    <SelectItem value="Pump.fun Sniper Bot" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      🎯 Pump.fun Sniper Bot (Solana Réel)
                    </SelectItem>
                    <SelectItem value="SuperTrend Momentum" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      ⚡ SuperTrend Volatility Momentum (Réel)
                    </SelectItem>
                    <SelectItem value="VWAP Breakout" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      📊 VWAP Volume Weighted Breakout (Réel)
                    </SelectItem>
                    <SelectItem value="RSI Pullback" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      📈 RSI Pullback Reversal (Réel)
                    </SelectItem>
                    <SelectItem value="EMA Cross" className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      📉 EMA Golden Cross Trend (Réel)
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-3">
            {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
              <div className="space-y-1 bg-white/5 border border-white/10 p-3.5 rounded-xl">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-[#c2ff0c] font-headline flex items-center gap-2">
                  <span>🤖</span> Autopilote Quantitatif IA
                </CardTitle>
                <p className="text-xs text-slate-300 font-medium font-body leading-relaxed">
                  L&apos;IA analyse le marché Forex & Crypto en temps réel pour ouvrir et gérer des positions optimales de manière 100% autonome.
                </p>
              </div>
            ) : botStrategy === 'Pump.fun Sniper Bot' ? (
              <div className="space-y-1 bg-purple-950/25 border border-purple-500/20 p-3.5 rounded-xl">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-purple-300 font-headline flex items-center gap-2">
                  <span>🎯</span> Pump.fun Solana Sniper
                </CardTitle>
                <p className="text-xs text-slate-300 font-medium font-body leading-relaxed">
                  Scanne le Launchpad Solana en temps réel. Achète les nouveaux jetons de bonding curve ayant un momentum social exceptionnel et encaisse les profits rapidement.
                </p>
              </div>
            ) : (
              <div className="space-y-1 bg-white/5 border border-white/10 p-3.5 rounded-xl">
                <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-white font-headline flex items-center gap-2">
                  <span className="text-[#c2ff0c]">📊</span> Stratégie Technique : {botStrategy}
                </CardTitle>
                <p className="text-xs text-slate-300 font-medium font-body leading-relaxed">
                  Exécute automatiquement des transactions sur l&apos;actif sélectionné en se basant sur les indicateurs techniques et la tendance du marché.
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        {/* Rest of form code */}
        <form onSubmit={handleStartBot} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider font-headline">Recherche Multi-Actifs / Sélection Actif</label>
            {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
              <div className="w-full h-11 bg-white/5 border border-[#c2ff0c]/30 rounded-xl px-4 flex items-center text-xs text-[#c2ff0c] font-body font-bold">
                <span className="h-2 w-2 rounded-full bg-[#c2ff0c] animate-pulse mr-2" />
                Tous les Actifs (Scan Global Continu)
              </div>
            ) : botStrategy === 'Pump.fun Sniper Bot' ? (
              <div className="w-full h-11 bg-purple-950/30 border border-purple-500/40 rounded-xl px-4 flex items-center text-xs text-purple-300 font-body font-bold">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse mr-2" />
                Solana Meme Coins Launchpad Stream (Pump.fun)
              </div>
            ) : (
              <Select value={botPair} onValueChange={setBotPair}>
                <SelectTrigger className="w-full h-11 bg-black/40 border border-white/15 rounded-xl px-4 text-sm text-white font-bold font-body focus:ring-[#c2ff0c]">
                  <SelectValue placeholder="Choisir un actif à scanner" />
                </SelectTrigger>
                <SelectContent className="bg-[#150f21] border-white/15 text-white">
                  {currencyPairs.map((cp) => (
                    <SelectItem key={cp.value} value={cp.value} className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                      {cp.label} ({cp.value.replace('FX:', '')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Capital allocation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider font-headline">
                {tradingMode === 'REAL' ? "Capital Allocateur (SOL)" : "Capital Allocateur (USD)"}
              </label>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                {tradingMode === 'REAL'
                  ? `Allocable: ${formatSmartCrypto(allocatableBalance, 'SOL')} (Hors Coffre ${formatSmartCrypto(currentReserveVault, 'SOL')})`
                  : `Allocable: ${formatSmartNumber(allocatableBalance, '$')} (Hors Coffre ${formatSmartNumber(currentReserveVault, '$')})`}
              </span>
            </div>
            <Input
              type="number"
              step={tradingMode === 'REAL' ? "0.1" : "10"}
              value={botCapital || ""}
              onChange={(e) => setBotCapital(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full h-11 bg-black/40 border border-white/15 rounded-xl px-4 text-sm font-bold focus:ring-[#c2ff0c] text-white font-body"
            />
          </div>

          {/* Start Button */}
          {botStrategy === 'AI Autopilot (Machine à Cash)' ? (
            <Button
              type="submit"
              className="w-full h-12 bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black font-extrabold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(194,255,12,0.5)] border-none"
            >
              <Play className="h-4 w-4 fill-black text-black" />
              Activer la Machine à Cash IA
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={tradingMode === 'REAL' && !isSolanaWalletActive}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-extrabold text-xs rounded-xl transition-all duration-300 font-headline uppercase tracking-wider mt-2 flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] border border-purple-500/40"
            >
              <Play className="h-4 w-4 fill-white animate-pulse" />
              Lancer le Sniper Bot Solana
            </Button>
          )}
        </form>
      </Card>

      {/* GRILLE 2x2 DES 4 MODULES DE MONITORING & PERFORMANCE DES BOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-full">
        {/* MODULE 1: MES BOTS */}
        <Card className="bg-[#150f21] border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <CardHeader className="p-0 mb-4 border-b border-white/10 pb-3">
            <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#c2ff0c]" />
                <span>{tradingMode === 'DEMO' ? "Mes Bots Démo" : "Mes Bots Réels"} ({filteredBots.length})</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] text-xs font-bold border-none uppercase font-headline">
                  {filteredBots.filter(b => b.status === 'RUNNING').length} En Cours
                </Badge>
                {totalClaimableProfits > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClaimAllProfits}
                    title="Encaisser tous les gains accumulés par les robots vers votre solde / Wallet Phantom."
                    className="h-7 px-2.5 text-[10px] font-extrabold uppercase rounded-lg bg-[#c2ff0c] text-black hover:bg-[#c2ff0c]/90 flex items-center gap-1 font-headline shadow-[0_0_12px_rgba(194,255,12,0.35)]"
                  >
                    💰 Tout Encaisser ({formatSmartPnl(totalClaimableProfits, tradingMode === 'REAL')} {tradingMode === 'REAL' ? 'SOL' : '$'})
                  </Button>
                )}
                {tradingMode === 'DEMO' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Êtes-vous sûr de vouloir tout réinitialiser en Mode Démo (remise du solde à 10 000 $, suppression des bots et positions démo) ?\n\n- Remarque : Les apprentissages IA accumulés seront intégralement conservés et utilisables en Mode Réel.")) {
                        resetDemoData();
                      }
                    }}
                    title="Réinitialiser les bots/positions démo. Les apprentissages IA restent conservés."
                    className="h-7 px-2.5 text-[10px] font-extrabold uppercase rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 flex items-center gap-1 font-headline"
                  >
                    <RotateCcw className="h-3 w-3 text-rose-300" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {filteredBots.length === 0 ? (
              <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-slate-300 font-body text-sm flex flex-col items-center justify-center min-h-[160px] bg-black/20">
                <Bot className="h-7 w-7 text-white/30 mb-2" />
                <span>{tradingMode === 'DEMO' ? "Aucun bot démo configuré actuellement." : "Aucun sniper SOL configuré actuellement."}</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredBots.map((b, idx) => (
                  <div key={b.id ? `${b.id}_${idx}` : `bot_${idx}`} className="bg-black/40 border border-white/15 rounded-xl p-4 space-y-3 relative overflow-hidden group">
                    <div className={cn(
                      "absolute top-0 right-0 h-2.5 w-2.5 rounded-full m-3.5",
                      b.status === 'RUNNING' ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                    )} />

                    <div className="flex justify-between items-start pr-4">
                      <div>
                        <div className="text-xs font-body font-bold flex items-center gap-1.5">
                          {b.strategy === 'Pump.fun Sniper Bot' ? (
                            <span className="text-purple-400 font-bold">🟣 Stream Solana (Pump.fun)</span>
                          ) : b.pair === 'ALL' ? (
                            <span className="text-[#c2ff0c] font-bold">🤖 Scan Multi-Actifs</span>
                          ) : (
                            <>
                              <span className="text-slate-200 font-bold">{b.pair.replace('FX:', '').replace('-USD', '').replace('=', '')}</span>
                              <span className="text-slate-400">— {b.timeframe}m</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs font-bold font-headline mt-1 flex items-center gap-1.5 text-white">
                          <span>{b.strategy}</span>
                          {b.riskProfile && (
                            <Badge className={cn(
                              "text-[9px] px-2 py-0.5 rounded font-headline uppercase font-bold border-none",
                              b.riskProfile === 'CONSERVATIVE' && "bg-emerald-500/20 text-emerald-300",
                              b.riskProfile === 'MODERATE' && "bg-amber-500/20 text-amber-300",
                              b.riskProfile === 'AGGRESSIVE' && "bg-rose-500/20 text-rose-300"
                            )}>
                              {b.riskProfile === 'CONSERVATIVE' ? 'Sûr' : b.riskProfile === 'AGGRESSIVE' ? 'Risque' : 'Modéré'}
                            </Badge>
                          )}
                          {b.customRules && (
                            <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-headline">
                              Règles IA Personnalisées
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-slate-200 font-mono mt-1">
                          Capital: {formatSmartCrypto(((b.mode || tradingMode) === 'REAL' && (b.capital || 0) > 50 ? 0.5 : (typeof b.capital === 'number' && !isNaN(b.capital) ? b.capital : 1000)), (b.mode || tradingMode) === 'REAL' ? 'SOL' : '$')}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={cn(
                          "font-extrabold font-mono text-sm block",
                          (b.netProfit || 0) >= 0 ? "text-[#c2ff0c]" : "text-rose-400"
                        )}>
                          {formatSmartPnl(b.netProfit || 0, tradingMode === 'REAL')} {tradingMode === 'REAL' ? 'SOL' : '$'}
                        </span>
                        <span className="text-xs text-slate-300 font-extrabold font-mono block">PnL Net</span>
                      </div>
                    </div>

                    {/* Claim Profit Button for Individual Bot */}
                    {(b.netProfit || b.pnl || 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClaimBotProfit(b.id)}
                        className="w-full h-8 text-[11px] font-extrabold uppercase rounded-lg bg-[#c2ff0c] hover:bg-[#c2ff0c]/90 text-black border border-[#c2ff0c]/50 shadow-[0_0_15px_rgba(194,255,12,0.3)] hover:shadow-[0_0_20px_rgba(194,255,12,0.5)] flex items-center justify-center gap-1.5 transition-all font-headline"
                      >
                        💰 Encaisser {formatSmartPnl(b.netProfit || b.pnl || 0, tradingMode === 'REAL')} {tradingMode === 'REAL' ? 'SOL' : '$'} vers Wallet Phantom
                      </Button>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleBot(b.id)}
                        className={cn(
                          "flex-1 h-8 text-xs font-extrabold uppercase rounded-lg border flex items-center justify-center gap-1.5 transition-all font-headline",
                          b.status === 'RUNNING'
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                        )}
                      >
                        {b.status === 'RUNNING' ? <Square className="h-3 w-3 fill-amber-300" /> : <Play className="h-3 w-3 fill-emerald-300" />}
                        {b.status === 'RUNNING' ? 'Pause' : 'Lancer'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBot(b.id)}
                        className="h-8 px-3 rounded-lg border border-white/15 text-slate-300 hover:text-rose-400 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MODULE 2: MOTEUR D'APPRENTISSAGE & FEEDBACK IA */}
        <Card className="bg-[#150f21] border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <CardHeader className="p-0 mb-4 border-b border-white/10 pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center gap-2">
                <span className="text-purple-400">🧠</span>
                <span>Moteur d&apos;Apprentissage & Feedback IA ({safeBotLearnings.length})</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                  ☁️ Firestore Synced
                </span>
              </CardTitle>
              {safeBotLearnings.length > 0 && (
                <Button
                  variant="link"
                  onClick={() => {
                    setBotLearnings([]);
                    saveBotLearnings([]);
                  }}
                  className="h-auto p-0 text-xs text-slate-300 hover:text-white font-extrabold underline-offset-4"
                >
                  Réinitialiser
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {safeBotLearnings.length === 0 ? (
                <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-slate-300 font-body text-sm flex flex-col items-center justify-center min-h-[160px] bg-black/20">
                  <span className="text-2xl mb-1">🧠</span>
                  <span>Aucune règle enregistrée pour l&apos;instant. Le moteur IA apprendra automatiquement de ses <strong>pertes (règles de protection)</strong> et de ses <strong>gains (motifs gagnants)</strong> et les sauvegardera dans Firestore.</span>
                </div>
              ) : (
                safeBotLearnings.map((l, idx) => {
                  const isWinRule = (l.gainAmount || 0) > 0 || (l.learningEffect && (l.learningEffect.includes('Gagnant') || l.learningEffect.includes('Gagnante')));
                  const isRealModeItem = l.mode === 'REAL';
                  const currencySymbol = isRealModeItem ? 'SOL' : '$';

                  return (
                    <div
                      key={l.id ? `${l.id}_${idx}` : `lrn_${idx}`}
                      className={cn(
                        "border rounded-xl p-3.5 flex justify-between items-center gap-3 transition-all",
                        isWinRule
                          ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50"
                          : "bg-purple-950/20 border-purple-500/25 hover:border-purple-500/40"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-headline uppercase font-extrabold flex items-center gap-2 flex-wrap">
                          <span className={isWinRule ? "text-emerald-300" : "text-purple-300"}>
                            {isWinRule ? '🚀 Motif Gagnant' : '🛡️ Règle de Protection'} #{(l.id || '').replace('lrn_', '').replace('win_', '')}
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-slate-200 font-body normal-case font-bold">
                            {isWinRule
                              ? `Gain analysé: ${formatSmartPnl(l.gainAmount || 0, isRealModeItem)} ${currencySymbol}`
                              : `Perte analysée: ${formatSmartPnl(l.lossAmount || 0, isRealModeItem)} ${currencySymbol}`}
                          </span>
                          <span className="text-white/20">•</span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase",
                            isRealModeItem ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          )}>
                            {isRealModeItem ? '⚡ Mode Réel' : '🧪 Simulation Démo'}
                          </span>
                        </div>
                        <p className="text-xs text-white font-body font-medium leading-relaxed">{l.learningEffect}</p>
                        {l.txHash ? (
                          <a
                            href={`https://solscan.io/tx/${l.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono mt-1"
                          >
                            🔗 Confirmé sur Solscan: {l.txHash.slice(0, 10)}...{l.txHash.slice(-6)}
                          </a>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                        <span className="text-xs text-slate-300 font-body block">
                          {l.timestamp ? new Date(l.timestamp).toLocaleTimeString('fr-FR') : 'Récemment'}
                        </span>
                        <Badge
                          className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold font-headline uppercase border-none",
                            isWinRule
                              ? "bg-emerald-500/30 text-emerald-200"
                              : "bg-purple-500/30 text-purple-200"
                          )}
                        >
                          {isWinRule ? 'Optimisation IA' : 'Protection IA'}
                        </Badge>
                        {isRealModeItem && isWinRule && !l.txHash && l.botId && (
                          <Button
                            size="sm"
                            onClick={() => handleClaimBotProfit(l.botId!)}
                            className="h-7 px-2.5 text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 rounded-lg transition-all"
                          >
                            💰 Encaisser
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* MODULE 3: JOURNAL D'ACTIVITÉ DES BOTS */}
        <Card className="bg-[#150f21] border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <CardHeader className="p-0 mb-4 border-b border-white/10 pb-3">
            <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-400" />
                <span>Journal d&apos;Activité des Bots</span>
              </div>
              <Badge className="bg-violet-500/25 text-violet-200 text-xs font-bold border-none uppercase font-headline">
                {safeBotLogs.length} Événements
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            <div className="h-[300px] overflow-y-auto border border-white/15 rounded-xl bg-black/50 p-3.5 font-mono text-xs space-y-2">
              {safeBotLogs.length === 0 ? (
                <div className="text-center text-slate-300 py-16 font-body text-sm font-medium">Aucune activité enregistrée.</div>
              ) : (
                safeBotLogs.map((log, idx) => (
                  <div key={log.id ? `${log.id}_${idx}` : `log_${idx}`} className="flex items-start gap-2 border-b border-white/10 pb-2 last:border-b-0 last:pb-0">
                    <span className="text-slate-300 font-bold shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                    <span className={cn(
                      "font-extrabold shrink-0",
                      log.type === 'trade' ? "text-[#c2ff0c]" :
                      log.type === 'error' ? "text-rose-400" : "text-cyan-300"
                    )}>
                      [{log.botName}]
                    </span>
                    <span className="text-slate-100 font-medium">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* MODULE 4: HISTORIQUE DES CLÔTURES */}
        <Card className="bg-[#150f21] border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <CardHeader className="p-0 mb-4 border-b border-white/10 pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center gap-2">
                <History className="h-5 w-5 text-slate-300" />
                <span>{tradingMode === 'DEMO' ? "Historique Démo" : "Historique Réel (SOL)"} ({filteredClosed.length})</span>
              </CardTitle>
              {filteredClosed.length > 0 && (
                <Badge className={cn(
                  "text-xs font-mono font-bold px-2.5 py-1 border-none",
                  netRealizedPnL >= 0 ? "bg-emerald-500/25 text-emerald-300" : "bg-rose-500/25 text-rose-300"
                )}>
                  PnL: {netRealizedPnL >= 0 ? '+' : ''}{netRealizedPnL.toFixed(2)} {tradingMode === 'REAL' ? 'SOL' : '$'}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {/* Clean 4-KPI Bar */}
            {filteredClosed.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5 p-3 bg-black/40 border border-white/15 rounded-xl text-xs font-mono">
                <div>
                  <span className="text-xs text-emerald-400 uppercase font-headline block font-extrabold">Gains</span>
                  <span className="text-sm font-black text-emerald-400">+{totalGains.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-rose-400 uppercase font-headline block font-extrabold">Pertes</span>
                  <span className="text-sm font-black text-rose-400">-{totalLosses.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-300 uppercase font-headline block font-extrabold">PnL Net</span>
                  <span className={cn("text-sm font-black", netRealizedPnL >= 0 ? "text-[#c2ff0c]" : "text-rose-400")}>
                    {netRealizedPnL >= 0 ? '+' : ''}{netRealizedPnL.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-violet-300 uppercase font-headline block font-extrabold">Win Rate</span>
                  <span className="text-sm font-black text-violet-300">{overallWinRate.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="border border-white/15 rounded-xl p-6 flex items-center gap-3 bg-black/20">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
                <span className="text-xs text-slate-300 font-medium font-body">Chargement de l&apos;historique...</span>
              </div>
            ) : filteredClosed.length === 0 ? (
              <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-slate-300 font-body text-sm flex flex-col items-center justify-center min-h-[160px] bg-black/20">
                <History className="h-7 w-7 text-white/30 mb-2" />
                <span>Aucune transaction clôturée pour le moment.</span>
              </div>
            ) : (
              <div className="max-h-[230px] overflow-y-auto space-y-2 pr-1">
                {filteredClosed.map((h, idx) => {
                  if (!h) return null;
                  const entryP = typeof h.entryPrice === 'number' && !isNaN(h.entryPrice) ? h.entryPrice : 0;
                  const exitP = typeof h.exitPrice === 'number' && !isNaN(h.exitPrice) ? h.exitPrice : entryP;
                  const profitVal = typeof h.profit === 'number' && !isNaN(h.profit) ? h.profit : 0;
                  const isProfit = profitVal >= 0;
                  const cleanPair = (h.pair || "").replace('FX:', '').replace('-USD', '').replace('=', '').replace('SOL:', '');

                  return (
                    <div key={h.id ? `${h.id}_${idx}` : `closed_${idx}`} className="bg-black/40 border border-white/15 rounded-xl p-3 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          {cleanPair}
                          <Badge className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded uppercase border-none",
                            h.type === 'BUY' ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                          )}>
                            {h.type === 'BUY' ? 'LONG' : 'SHORT'} {h.leverage || 1}x
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-300 font-mono font-medium mt-0.5">
                          Entrée: {entryP.toFixed(entryP > 100 ? 2 : 4)} | Sortie: {exitP.toFixed(entryP > 100 ? 2 : 4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-extrabold text-sm block font-mono",
                          isProfit ? "text-[#c2ff0c]" : "text-rose-400"
                        )}>
                          {isProfit ? '+' : ''}{formatSmartPnl(profitVal, tradingMode === 'REAL' || (h.pair && h.pair.startsWith('SOL:')))} {tradingMode === 'REAL' || (h.pair && h.pair.startsWith('SOL:')) ? 'SOL' : '$'}
                        </span>
                        <span className="text-xs text-slate-400 block font-body">
                          {h.timestamp ? new Date(h.timestamp).toLocaleTimeString('fr-FR') : 'Récemment'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
