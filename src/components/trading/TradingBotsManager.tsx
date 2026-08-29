"use client";

import React, { useState } from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  Trash2, 
  History,
  RotateCcw,
  AlertTriangle,
  Zap,
  RefreshCw,
  Wallet,
  Copy,
  CheckCircle2,
  ExternalLink,
  Check,
  Download,
  Eye,
  EyeOff,
  Send,
  Activity,
  TrendingUp,
  Layers,
  Coins,
  Scale,
  Sparkles,
  FileSpreadsheet,
  Lock,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import type { SubWallet, BotInstance } from '@/types';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg, formatSmartPnl, formatSmartCrypto, formatSmartNumber } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { saveBotLearnings } from '@/lib/firebase';
import { 
  sweepSubWalletProfitToMaster, 
  disperseSolToSubWallets, 
  getMultipleSolanaBalances, 
  reclaimAllSubWalletsToMaster,
  rebalanceFleetSubWallets,
  closeEmptyTokenAccountsAndRefundRent
} from '@/services/pumpFunService';
import { fetchCoinMarketCapQuotes } from '@/services/coinmarketcapService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
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
  subWallets?: SubWallet[];
  handleDisperseSOL?: () => Promise<void>;
  isDispersing?: boolean;
}

export default function TradingBotsManager({
  solanaBalance,
  setSolanaBalance,
  isSolanaWalletActive,
  addBotLog,
  handleToggleBot,
  handleDeleteBot,
  livePrices,
  subWallets: propSubWallets,
  handleDisperseSOL,
  isDispersing = false
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
    activePositions,
    closedPositions, 
    setTransactions,
    resetDemoData,
    isLoading 
  } = useAppState();

  const isReal = tradingMode === 'REAL';
  const rawBalance = isReal ? (solanaBalance || 0) : balance;
  const currentReserveVault = isReal ? (Number(reserveVaultSol) || 0) : (Number(reserveVault) || 0);
  const allocatableBalance = Math.max(0, rawBalance - currentReserveVault);

  // Local sub-wallets fallback
  const [localSubWallets, setLocalSubWallets] = useState<SubWallet[]>([]);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('trade_sub_wallets');
        if (stored) setLocalSubWallets(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const effectiveSubWallets: SubWallet[] = (propSubWallets && propSubWallets.length > 0) ? propSubWallets : localSubWallets;
  const totalSubWalletBalance = effectiveSubWallets.reduce((acc: number, w: SubWallet) => acc + (w.balance || 0), 0);

  // Disperse Modal States
  const [isDisperseModalOpen, setIsDisperseModalOpen] = useState<boolean>(false);
  const [customDisperseAmount, setCustomDisperseAmount] = useState<number>(0.02);
  const [isLocalDispersing, setIsLocalDispersing] = useState<boolean>(false);
  const [localDisperseError, setLocalDisperseError] = useState<string>('');
  const [localDisperseTx, setLocalDisperseTx] = useState<string>('');
  const [copiedSubIndex, setCopiedSubIndex] = useState<number | null>(null);

  const handleCopySubAddress = (addr: string, idx: number) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(addr);
      setCopiedSubIndex(idx);
      setTimeout(() => setCopiedSubIndex(null), 2000);
    }
  };

  const handleFundDemoFleet = (solAmount = 0.5) => {
    const updated: SubWallet[] = effectiveSubWallets.map((w: SubWallet) => ({
      ...w,
      balance: solAmount
    }));
    localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
    setLocalSubWallets(updated);
    addBotLog('system', 'System', `[FLOTTE DÉMO ACTIVÉE] 5 Sous-Wallets virtuels approvisionnés avec ${solAmount} SOL chacun pour tester les robots sans risque !`, 'trade');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('web3_wallet_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const [isRefreshingBalances, setIsRefreshingBalances] = useState<boolean>(false);

  const handleRefreshOnChainBalances = async () => {
    if (effectiveSubWallets.length === 0) return;
    setIsRefreshingBalances(true);
    try {
      const pubKeys = effectiveSubWallets.map((w: SubWallet) => w.publicKey);
      const res = await getMultipleSolanaBalances(pubKeys);
      if (res && res.success && res.balances) {
        const updated: SubWallet[] = effectiveSubWallets.map((w: SubWallet) => ({
          ...w,
          balance: res.balances![w.publicKey] ?? w.balance ?? 0
        }));
        localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
        setLocalSubWallets(updated);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch (e) {
      console.warn("Could not refresh balances:", e);
    } finally {
      setIsRefreshingBalances(false);
    }
  };

  const handleExecuteRealDisperse = async () => {
    if (effectiveSubWallets.length === 0) return;
    setIsLocalDispersing(true);
    setLocalDisperseError('');
    setLocalDisperseTx('');

    try {
      const pubKeys = effectiveSubWallets.map((w: SubWallet) => w.publicKey);
      const res = await disperseSolToSubWallets({
        subWalletPubKeys: pubKeys,
        amountPerWallet: customDisperseAmount
      });

      if (res && res.success && res.txHash) {
        setLocalDisperseTx(res.txHash);
        const updated: SubWallet[] = effectiveSubWallets.map((w: SubWallet) => ({
          ...w,
          balance: res.balances ? (res.balances[w.publicKey] ?? (w.balance || 0) + customDisperseAmount) : ((w.balance || 0) + customDisperseAmount)
        }));
        localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
        setLocalSubWallets(updated);
        addBotLog('system', 'System', `[DISPERSE SOL CONFIRMÉ] ${customDisperseAmount} SOL distribué avec succès vers les 5 sous-portefeuilles ! Tx: ${res.txHash.slice(0, 12)}...`, 'trade');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        setLocalDisperseError(res.error || 'Erreur lors de la distribution on-chain.');
      }
    } catch (err: any) {
      setLocalDisperseError(err.message || 'Erreur de distribution');
    } finally {
      setIsLocalDispersing(false);
    }
  };

  const [isLocalReclaiming, setIsLocalReclaiming] = useState<boolean>(false);
  const [reclaimSuccessMsg, setReclaimSuccessMsg] = useState<string>('');
  const [reclaimErrorMsg, setReclaimErrorMsg] = useState<string>('');

  const getConnectedSolanaAddress = (): string => {
    if (typeof window === 'undefined') return '';
    const phantom = (window as any)?.phantom?.solana || (window as any)?.solana;
    if (phantom?.publicKey) return phantom.publicKey.toBase58();
    return localStorage.getItem('settings_solana_address') || localStorage.getItem('solana_connected_address') || '';
  };

  const handleReclaimAllSubWallets = async () => {
    const destAddr = getConnectedSolanaAddress();
    if (!destAddr) {
      alert("Veuillez d'abord connecter votre portefeuille Phantom.");
      return;
    }
    setIsLocalReclaiming(true);
    setReclaimSuccessMsg('');
    setReclaimErrorMsg('');

    try {
      const res = await reclaimAllSubWalletsToMaster({ destinationPubKey: destAddr });
      if (res.success && res.totalReclaimed > 0) {
        setReclaimSuccessMsg(`✅ ${res.totalReclaimed.toFixed(4)} SOL rapatriés avec succès vers votre Phantom !`);
        addBotLog('system', 'System', `[RAPATRIEMENT SOL CONFIRMÉ] ${res.totalReclaimed.toFixed(4)} SOL récupérés et renvoyés vers le Master Wallet (${destAddr.slice(0, 8)}...) !`, 'trade');
        await handleRefreshOnChainBalances();
      } else {
        const errMsg = res.errors && res.errors.length > 0 ? res.errors.join(' | ') : "Aucun SOL à rapatrier (les sous-wallets ont moins de 0.00001 SOL).";
        setReclaimErrorMsg(errMsg);
      }
    } catch (err: any) {
      setReclaimErrorMsg(err.message || 'Erreur lors du rapatriement');
    } finally {
      setIsLocalReclaiming(false);
    }
  };

  const handleReclaimSingleSubWallet = async (subWallet: SubWallet) => {
    const destAddr = getConnectedSolanaAddress();
    if (!destAddr) {
      alert("Veuillez connecter votre portefeuille Phantom.");
      return;
    }
    if (!subWallet.privateKey) {
      alert("Clé privée du sous-wallet introuvable.");
      return;
    }

    setIsLocalReclaiming(true);
    setReclaimSuccessMsg('');
    setReclaimErrorMsg('');

    try {
      const { Keypair, SystemProgram, Transaction, PublicKey } = await import('@solana/web3.js');
      const { default: bs58 } = await import('bs58');
      const { getWorkingConnection } = await import('@/services/pumpFunService');
      const connection = await getWorkingConnection();

      const kp = Keypair.fromSecretKey(bs58.decode(subWallet.privateKey));
      const bal = await connection.getBalance(kp.publicKey, 'confirmed');
      const fee = 5000;
      const sendAmount = bal - fee;

      if (sendAmount <= 10000) {
        alert("Ce sous-wallet n'a pas assez de SOL à rapatrier (solde trop faible).");
        return;
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: kp.publicKey,
          toPubkey: new PublicKey(destAddr),
          lamports: sendAmount
        })
      );
      tx.feePayer = kp.publicKey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.sign(kp);

      const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');

      const solReclaimed = sendAmount / 1e9;
      setReclaimSuccessMsg(`✅ ${solReclaimed.toFixed(4)} SOL rapatriés depuis Sous-Wallet vers Phantom ! (Tx: ${sig.slice(0, 10)}...)`);
      addBotLog('system', 'System', `[RAPATRIEMENT SOL] ${solReclaimed.toFixed(4)} SOL récupérés du Sous-Wallet (${kp.publicKey.toBase58().slice(0, 8)}...) !`, 'trade');
      await handleRefreshOnChainBalances();
    } catch (err: any) {
      setReclaimErrorMsg(err.message || 'Erreur de rapatriement');
    } finally {
      setIsLocalReclaiming(false);
    }
  };

  const [activeSubWalletTab, setActiveSubWalletTab] = useState<number>(1);
  const [revealedKeyIndex, setRevealedKeyIndex] = useState<number | null>(null);
  const [fundAmountInput, setFundAmountInput] = useState<{ [key: number]: number }>({
    1: 0.02, 2: 0.02, 3: 0.02, 4: 0.02, 5: 0.02
  });
  const [isFundingSpecific, setIsFundingSpecific] = useState<boolean>(false);

  const handleFundSpecificSubWallet = async (subNum: number, amount: number) => {
    const subIdx = subNum - 1;
    const targetSub = effectiveSubWallets[subIdx];
    if (!targetSub || !targetSub.publicKey) {
      alert("Sous-portefeuille introuvable.");
      return;
    }

    if (tradingMode === 'DEMO') {
      const updated = effectiveSubWallets.map((w, i) => i === subIdx ? ({
        ...w,
        balance: (w.balance || 0) + amount
      }) : w);
      localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
      setLocalSubWallets(updated);
      addBotLog('system', 'System', `[DÉMO] ${amount} SOL alloué au Sous-Wallet #${subNum} !`, 'trade');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('web3_wallet_updated'));
        window.dispatchEvent(new Event('storage'));
      }
      return;
    }

    if (solanaBalance !== null && solanaBalance < amount + 0.001) {
      alert(`Solde insuffisant dans votre portefeuille principal (${solanaBalance.toFixed(3)} SOL). Requis: ${amount.toFixed(3)} SOL.`);
      return;
    }

    setIsFundingSpecific(true);
    try {
      const res = await disperseSolToSubWallets({
        subWalletPubKeys: [targetSub.publicKey],
        amountPerWallet: amount
      });

      if (res && res.success && res.txHash) {
        const updated = effectiveSubWallets.map((w, i) => i === subIdx ? ({
          ...w,
          balance: res.balances ? (res.balances[w.publicKey] ?? (w.balance || 0) + amount) : ((w.balance || 0) + amount)
        }) : w);
        localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
        setLocalSubWallets(updated);
        addBotLog('system', 'System', `[TRANSFERT SOL RÉUSSI] ${amount} SOL transféré vers le Sous-Wallet #${subNum} ! Tx: ${res.txHash.slice(0, 12)}...`, 'trade');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        alert(res.error || "Erreur lors du transfert vers le sous-portefeuille.");
      }
    } catch (err: any) {
      alert(err.message || "Erreur de transfert.");
    } finally {
      setIsFundingSpecific(false);
    }
  };

  // Section 2: Contrôles Globaux de la Flotte de Robots
  const handleStartAllBots = () => {
    if (bots.length === 0) return;
    const updated = bots.map(b => ({ ...b, status: 'RUNNING' as const }));
    setBots(updated);
    addBotLog('system', 'System', `⚡ TOUS LES ROBOTS ONT ÉTÉ DÉMARRÉS (${bots.length} bots actifs) !`, 'trade');
  };

  const handlePauseAllBots = () => {
    if (bots.length === 0) return;
    const updated = bots.map(b => ({ ...b, status: 'STOPPED' as const }));
    setBots(updated);
    addBotLog('system', 'System', `⏸️ TOUS LES ROBOTS ONT ÉTÉ MIS EN PAUSE.`, 'info');
  };

  const handleClearAllBots = () => {
    if (bots.length === 0) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer tous les robots de trading configurés ?")) {
      setBots([]);
      addBotLog('system', 'System', `🗑️ Tous les robots de trading ont été réinitialisés.`, 'info');
    }
  };

  // Section 3: Rééquilibrage & Récupération des Loyers On-Chain
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);
  const [isRefundingRent, setIsRefundingRent] = useState<boolean>(false);

  const handleRebalanceFleet = async () => {
    if (tradingMode === 'DEMO') {
      const total = effectiveSubWallets.reduce((acc, w) => acc + (w.balance || 0), 0);
      const avg = total / 5;
      const updated = effectiveSubWallets.map(w => ({ ...w, balance: avg }));
      localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
      setLocalSubWallets(updated);
      setReclaimSuccessMsg(`⚖️ Flotte Démo rééquilibrée : ${avg.toFixed(3)} SOL par sous-portefeuille.`);
      addBotLog('system', 'System', `[RÉÉQUILIBRAGE DÉMO] 5 sous-portefeuilles rééquilibrés à ${avg.toFixed(3)} SOL chacun.`, 'trade');
      return;
    }

    setIsRebalancing(true);
    setReclaimSuccessMsg('');
    setReclaimErrorMsg('');
    try {
      const res = await rebalanceFleetSubWallets();
      if (res.success) {
        setReclaimSuccessMsg(`⚖️ Flotte rééquilibrée avec succès (${res.averageSol.toFixed(4)} SOL moyen, ${res.transfersCount} transferts) !`);
        addBotLog('system', 'System', `[RÉÉQUILIBRAGE SOL] Flotte rééquilibrée (${res.averageSol.toFixed(4)} SOL moyen) !`, 'trade');
        await handleRefreshOnChainBalances();
      } else {
        setReclaimErrorMsg(res.error || "Impossible de rééquilibrer (soldes trop faibles ou équilibrés).");
      }
    } catch (err: any) {
      setReclaimErrorMsg(err.message || "Erreur de rééquilibrage");
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleRefundRent = async () => {
    const destAddr = getConnectedSolanaAddress();
    if (!destAddr) {
      alert("Veuillez connecter votre portefeuille Phantom.");
      return;
    }
    setIsRefundingRent(true);
    setReclaimSuccessMsg('');
    setReclaimErrorMsg('');
    try {
      const res = await closeEmptyTokenAccountsAndRefundRent({ destinationMasterPubKey: destAddr });
      if (res.success && res.closedAccountsCount > 0) {
        setReclaimSuccessMsg(`🧹 ${res.closedAccountsCount} comptes vides fermés ! +${res.refundedSol.toFixed(4)} SOL de loyer récupérés vers votre Phantom.`);
        addBotLog('system', 'System', `[LOYER SOL RÉCUPÉRÉ] ${res.closedAccountsCount} comptes fermés, +${res.refundedSol.toFixed(4)} SOL restitués !`, 'trade');
      } else {
        setReclaimSuccessMsg(`🧹 Aucun compte de jeton vide à fermer (loyers déjà optimisés).`);
      }
    } catch (err: any) {
      setReclaimErrorMsg(err.message || "Erreur récupération loyers");
    } finally {
      setIsRefundingRent(false);
    }
  };

  // Section 4: Export CSV & Sécurisation des Gains dans le Coffre-Fort
  const [isSweepingProfits, setIsSweepingProfits] = useState<boolean>(false);

  const handleExportCsv = () => {
    const rows = [
      ['Date/Heure', 'Paire', 'Type', 'Prix Entree', 'Prix Sortie', 'Levier', 'Profit/Perte', 'Devise']
    ];

    closedPositions.forEach(p => {
      rows.push([
        p.timestamp ? new Date(p.timestamp).toLocaleString('fr-FR') : 'N/A',
        (p.pair || '').replace('FX:', '').replace('-USD', '').replace('=', ''),
        p.type || 'BUY',
        (p.entryPrice || 0).toString(),
        (p.exitPrice || 0).toString(),
        (p.leverage || 1).toString(),
        (p.profit || 0).toString(),
        isReal ? 'SOL' : '$'
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trading_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSweepProfitsToVault = () => {
    const totalBotProfit = bots.reduce((acc, b) => acc + Math.max(0, b.netProfit || 0), 0);
    if (totalBotProfit <= 0) {
      alert("Aucun profit positif cumulé à sécuriser dans le coffre-fort pour le moment.");
      return;
    }

    if (isReal) {
      setReserveVaultSol(prev => (Number(prev) || 0) + totalBotProfit);
      addBotLog('system', 'System', `🔒 +${totalBotProfit.toFixed(4)} SOL de profits sécurisés dans le Coffre-Fort anti-liquidation !`, 'trade');
      alert(`🔒 +${totalBotProfit.toFixed(4)} SOL de gains verrouillés dans le Coffre-Fort !`);
    } else {
      setReserveVault(prev => (Number(prev) || 0) + totalBotProfit);
      addBotLog('system', 'System', `🔒 +${totalBotProfit.toFixed(2)} $ de profits sécurisés dans le Coffre-Fort virtuel !`, 'trade');
      alert(`🔒 +${totalBotProfit.toFixed(2)} $ de gains verrouillés dans le Coffre-Fort !`);
    }
  };

  const [fundingBotId, setFundingBotId] = useState<string | null>(null);

  const handleFundBotSubWallet = async (bot: BotInstance) => {
    const subIdx = (bot.subWallet || 1) - 1;
    const targetSub = effectiveSubWallets[subIdx];
    if (!targetSub || !targetSub.publicKey) {
      alert("Sous-portefeuille introuvable.");
      return;
    }
    const amountToTransfer = typeof bot.capital === 'number' && bot.capital > 0 ? bot.capital : 0.05;

    if (solanaBalance !== null && solanaBalance < amountToTransfer + 0.001) {
      alert(`Solde insuffisant dans votre portefeuille principal (${solanaBalance.toFixed(3)} SOL). Requis: ${amountToTransfer.toFixed(3)} SOL.`);
      return;
    }

    setFundingBotId(bot.id);
    try {
      const res = await disperseSolToSubWallets({
        subWalletPubKeys: [targetSub.publicKey],
        amountPerWallet: amountToTransfer
      });

      if (res && res.success && res.txHash) {
        const updated = effectiveSubWallets.map((w, i) => i === subIdx ? ({
          ...w,
          balance: res.balances ? (res.balances[w.publicKey] ?? (w.balance || 0) + amountToTransfer) : ((w.balance || 0) + amountToTransfer)
        }) : w);
        localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
        setLocalSubWallets(updated);
        addBotLog(bot.id, bot.strategy, `[TRANSFERT SOL RÉUSSI] ${amountToTransfer} SOL alloué et transféré vers le Sous-Wallet #${bot.subWallet || 1} ! Tx: ${res.txHash.slice(0, 12)}...`, 'trade');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('web3_wallet_updated'));
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        alert(res.error || "Erreur lors du transfert vers le sous-portefeuille.");
      }
    } catch (err: any) {
      alert(err.message || "Erreur de transfert.");
    } finally {
      setFundingBotId(null);
    }
  };

  const handleFundBotSubWalletDemo = (bot: BotInstance) => {
    const subIdx = (bot.subWallet || 1) - 1;
    const amountToTransfer = typeof bot.capital === 'number' && bot.capital > 0 ? (bot.capital > 50 ? 0.5 : bot.capital) : 0.5;
    const updated = effectiveSubWallets.map((w, i) => i === subIdx ? ({
      ...w,
      balance: (w.balance || 0) + amountToTransfer
    }) : w);
    localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
    setLocalSubWallets(updated);
    addBotLog(bot.id, bot.strategy, `[FLOTTE DÉMO] ${amountToTransfer} SOL virtuel alloué au Sous-Wallet #${bot.subWallet || 1} !`, 'trade');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('web3_wallet_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  // New Bot Form State
  const [botPair, setBotPair] = useState<string>('ALL');
  const [botStrategy, setBotStrategy] = useState<'RSI Pullback' | 'EMA Cross' | 'BB Mean Reversion' | 'SuperTrend Momentum' | 'VWAP Breakout' | 'AI Autopilot (Machine à Cash)' | 'Pump.fun Sniper Bot'>('AI Autopilot (Machine à Cash)');
  const [botTimeframe, setBotTimeframe] = useState<string>('15');
  const [botCapital, setBotCapital] = useState<number>(() => isReal ? 0.5 : 1000);
  const [botSubWallet, setBotSubWallet] = useState<number>(1);
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
      status: 'RUNNING' as const,
      createdAt: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      consecutiveLosses: 0,
      netProfit: 0,
      selectivityMultiplier: 1.0,
      riskProfile: botStrategy === 'AI Autopilot (Machine à Cash)' ? botRiskProfile : undefined,
      pumpMode: botStrategy === 'Pump.fun Sniper Bot' ? pumpSniperMode : undefined,
      priorityFee: botStrategy === 'Pump.fun Sniper Bot' ? priorityFee : undefined,
      subWallet: botSubWallet,
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
  const pendingSweepProfits = filteredBots.reduce((sum, b) => sum + ((b.netProfit || b.pnl || 0) > 0 ? (b.netProfit || b.pnl || 0) : 0), 0);

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

      {/* Multi-Wallet Fleet Status Banner */}
      {/* CENTRE DE CONTRÔLE & SUPERVISION DE LA FLOTTE MULTI-WALLET SOLANA */}
      <Card className="bg-[#150f21] border border-white/20 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* EN-TÊTE PRINCIPAL DE LA FLOTTE */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base uppercase tracking-wider font-headline text-white flex items-center gap-2">
                  <span>Flotte Multi-Wallet Solana</span>
                  <Badge className={cn(
                    "text-[10px] uppercase font-headline font-bold border-none px-2.5 py-0.5 rounded",
                    effectiveSubWallets.some((w: SubWallet) => (w.balance || 0) >= 0.005)
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  )}>
                    {effectiveSubWallets.filter((w: SubWallet) => (w.balance || 0) >= 0.005).length}/5 Wallets Actifs
                  </Badge>
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 flex-wrap">
                <span className="font-mono font-bold text-white">
                  Solde Total: {totalSubWalletBalance.toFixed(4)} {isReal ? 'SOL Réel' : 'SOL Démo'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-purple-300 font-mono text-[11px]">
                  {formatSolToUsdAndHtg(totalSubWalletBalance).combinedLabel}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIONS GLOBALES RAPIDES */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshOnChainBalances}
              disabled={isRefreshingBalances}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 text-slate-200 border-white/15 text-xs font-bold font-headline uppercase rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingBalances && "animate-spin text-purple-400")} />
              Actualiser RPC
            </Button>

            {!isReal && totalSubWalletBalance < 0.005 && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleFundDemoFleet(0.5)}
                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl uppercase font-headline flex items-center gap-1.5 border border-emerald-500/40"
              >
                <Zap className="h-3.5 w-3.5 fill-white" />
                Alimenter Démo
              </Button>
            )}

            {/* BOUTON RÉÉQUILIBRER LA FLOTTE */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRebalanceFleet}
              disabled={isRebalancing}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 text-slate-200 border-white/15 text-xs font-bold font-headline uppercase rounded-xl flex items-center gap-1.5"
              title="Équilibrer les soldes entre les 5 sous-portefeuilles"
            >
              <Scale className={cn("h-3.5 w-3.5 text-blue-400", isRebalancing && "animate-spin")} />
              {isRebalancing ? "Équilibrage..." : "⚖️ Rééquilibrer"}
            </Button>

            {/* BOUTON RÉCUPÉRER LES LOYERS SOLANA */}
            {isReal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefundRent}
                disabled={isRefundingRent}
                className="h-9 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-bold font-headline uppercase rounded-xl flex items-center gap-1.5"
                title="Fermer les comptes de tokens vides et récupérer les ~0.00204 SOL de loyer par compte vers Phantom"
              >
                <Sparkles className={cn("h-3.5 w-3.5 text-emerald-400", isRefundingRent && "animate-spin")} />
                {isRefundingRent ? "Récupération..." : "🧹 Loyers (Rent)"}
              </Button>
            )}

            {/* BOUTON SÉCURISER LES GAINS */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSweepProfitsToVault}
              className="h-9 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-bold font-headline uppercase rounded-xl flex items-center gap-1.5"
              title="Sécuriser les profits cumulés des robots dans le Coffre-Fort"
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              🔒 Sécuriser Gains
            </Button>

            {isReal && (
              <Button
                type="button"
                size="sm"
                onClick={handleReclaimAllSubWallets}
                disabled={isLocalReclaiming || isLocalDispersing}
                className="h-9 px-3 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-extrabold uppercase font-headline rounded-xl flex items-center gap-1.5 transition-all"
              >
                {isLocalReclaiming ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-300" />
                    Rapatriement...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    📥 Tout Rapatrier
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => setIsDisperseModalOpen(true)}
              className="h-9 px-3.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl uppercase font-headline flex items-center gap-1.5 border border-purple-500/40 shadow-lg shadow-purple-900/30"
            >
              <Zap className="h-3.5 w-3.5 fill-white" />
              ⚡ Distribuer SOL
            </Button>
          </div>
        </div>

        {/* ALERTES RAPATRIEMENT DIRECTES */}
        {reclaimSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-body flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="font-bold">{reclaimSuccessMsg}</span>
            </div>
            <button onClick={() => setReclaimSuccessMsg('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {reclaimErrorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-body flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{reclaimErrorMsg}</span>
            </div>
            <button onClick={() => setReclaimErrorMsg('')} className="text-rose-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* ONGLETS DE SÉLECTION DU SOUS-WALLET */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveSubWalletTab(0)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase font-headline transition-all flex items-center gap-1.5 shrink-0",
              activeSubWalletTab === 0
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                : "bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Vue d&apos;Ensemble (5 Wallets)
          </button>

          {[1, 2, 3, 4, 5].map((num) => {
            const w = effectiveSubWallets[num - 1];
            const bal = w?.balance || 0;
            const isFunded = bal >= 0.005;
            const assignedBot = bots.find(b => (b.subWallet || 1) === num);

            return (
              <button
                key={num}
                type="button"
                onClick={() => setActiveSubWalletTab(num)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold font-headline transition-all flex items-center gap-2 shrink-0 border",
                  activeSubWalletTab === num
                    ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/40"
                    : "bg-black/40 text-slate-300 hover:bg-white/10 hover:text-white border-white/10"
                )}
              >
                <span>Wallet #{num}</span>
                <span className="font-mono text-[11px] font-bold text-purple-200">
                  {bal.toFixed(3)} SOL
                </span>
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  isFunded ? "bg-emerald-400" : "bg-amber-400"
                )} />
                {assignedBot && (
                  <Badge className="bg-white/10 text-[9px] px-1 py-0 rounded uppercase font-headline border-none">
                    Bot Actif
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENU VUE DÉTAILLÉE : SOIT UN SOUS-WALLET SPÉCIFIQUE, SOIT VUE D'ENSEMBLE */}
        {activeSubWalletTab > 0 ? (
          (() => {
            const num = activeSubWalletTab;
            const w = effectiveSubWallets[num - 1];
            const bal = w?.balance || 0;
            const isFunded = bal >= 0.005;
            const isCopied = copiedSubIndex === (num - 1);
            const isKeyRevealed = revealedKeyIndex === (num - 1);
            const assignedBots = bots.filter(b => (b.subWallet || 1) === num);
            const walletPositions = activePositions.filter(p => p.botId && assignedBots.some(b => b.id === p.botId));
            const walletClosed = closedPositions.filter(p => p.botId && assignedBots.some(b => b.id === p.botId));
            const currentFundInput = fundAmountInput[num] || 0.02;

            return (
              <div className="bg-black/40 border border-white/15 rounded-xl p-5 space-y-5">
                {/* 1. CARTE D'IDENTITÉ DU SOUS-WALLET */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-purple-600/30 text-purple-300 font-extrabold flex items-center justify-center text-xs font-headline">
                        #{num}
                      </span>
                      <h4 className="text-base font-extrabold text-white uppercase font-headline">
                        Sous-Portefeuille #{num}
                      </h4>
                      <Badge className={cn(
                        "text-[10px] uppercase font-headline font-bold border-none px-2 py-0.5 rounded",
                        isFunded ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      )}>
                        {isFunded ? "✅ Actif & Prêt au Trading" : "⚠️ Non Renfloué (0.00 SOL)"}
                      </Badge>
                    </div>

                    {/* ADRESSE PUBLIQUE SOLSCAN */}
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-300 pt-1 flex-wrap">
                      <span className="text-slate-400">Adresse Publique:</span>
                      <span className="font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-white/10">
                        {w?.publicKey || 'En attente de génération'}
                      </span>
                      {w?.publicKey && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopySubAddress(w.publicKey, num - 1)}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[11px]"
                            title="Copier l'adresse publique"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Copié' : 'Copier'}</span>
                          </button>
                          <a
                            href={`https://solscan.io/account/${w.publicKey}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-white/10 rounded text-purple-300 hover:text-white transition-all flex items-center gap-1 text-[11px] underline"
                          >
                            <span>Solscan</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </div>

                    {/* CLÉ PRIVÉE SÉCURISÉE */}
                    {w?.privateKey && (
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pt-1 flex-wrap">
                        <span>Clé Secrète (Phantom):</span>
                        <span className="font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded border border-white/10 text-[11px]">
                          {isKeyRevealed ? w.privateKey : '••••••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealedKeyIndex(isKeyRevealed ? null : (num - 1))}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all flex items-center gap-1 text-[11px]"
                        >
                          {isKeyRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span>{isKeyRevealed ? 'Masquer' : 'Révéler'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SOLDE EN DIRECT */}
                  <div className="text-left md:text-right bg-purple-950/20 border border-purple-500/20 p-3 rounded-xl shrink-0">
                    <span className="text-xs text-slate-400 font-bold uppercase font-headline block">Solde On-Chain</span>
                    <span className="font-extrabold text-xl text-white font-mono block">
                      {bal.toFixed(4)} SOL
                    </span>
                    <span className="text-xs text-purple-300 font-mono font-bold block">
                      {formatSolToUsdAndHtg(bal).combinedLabel}
                    </span>
                  </div>
                </div>

                {/* 2. ACTIONS DE TRANSFERT RAPIDE SUR CE SOUS-WALLET */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-extrabold text-xs uppercase font-headline text-white flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-purple-400" />
                      Alimenter ce Sous-Wallet #{num}
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Envoyez du SOL depuis votre portefeuille Phantom connecté vers ce sous-portefeuille pour le financer individuellement.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.005"
                      value={currentFundInput}
                      onChange={(e) => setFundAmountInput(prev => ({ ...prev, [num]: parseFloat(e.target.value) || 0.01 }))}
                      className="w-28 h-10 bg-black/60 border border-white/15 rounded-xl px-3 text-xs font-mono font-bold text-white focus:ring-[#c2ff0c]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleFundSpecificSubWallet(num, currentFundInput)}
                      disabled={isFundingSpecific}
                      className="h-10 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl uppercase font-headline flex items-center gap-1.5 shrink-0"
                    >
                      <Zap className="h-3.5 w-3.5 fill-white" />
                      Envoyer {currentFundInput} SOL
                    </Button>

                    {isReal && bal > 0.0005 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => w && handleReclaimSingleSubWallet(w)}
                        disabled={isLocalReclaiming}
                        className="h-10 px-3 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 font-bold text-xs rounded-xl uppercase font-headline flex items-center gap-1.5 shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Rapatrier ce Solde
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. LE TRAVAIL DU SOUS-WALLET : ROBOTS ASSIGNÉS & POSITIONS ACTIVES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ROBOT(S) ACTIF(S) */}
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-extrabold text-xs uppercase font-headline text-white flex items-center gap-1.5">
                        <Bot className="h-4 w-4 text-[#c2ff0c]" />
                        Robot Assigné à ce Wallet ({assignedBots.length})
                      </span>
                    </div>

                    {assignedBots.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-300 bg-purple-950/20 rounded-lg border border-purple-500/30 space-y-3">
                        <p className="font-semibold text-white">
                          Aucun robot n&apos;est actuellement assigné au Sous-Wallet #{num}.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const newBot: BotInstance = {
                              id: 'bot_' + Math.random().toString(36).substring(2, 9),
                              pair: num === 1 ? 'SOL:MEME' : 'BTC',
                              strategy: num === 1 ? 'Pump.fun Sniper Bot' : 'AI Autopilot (Machine à Cash)',
                              timeframe: num === 1 ? '0' : '5',
                              capital: parseFloat((Math.min(0.25, Math.max(0.01, (bal || 0.05) * 0.9))).toFixed(4)),
                              status: 'RUNNING',
                              createdAt: Date.now(),
                              totalTrades: 0,
                              winningTrades: 0,
                              consecutiveLosses: 0,
                              netProfit: 0,
                              selectivityMultiplier: 1.0,
                              pumpMode: 'PRECOCE',
                              priorityFee: 0.001,
                              subWallet: num,
                              mode: tradingMode
                            };
                            setBots(prev => [...(Array.isArray(prev) ? prev : []), newBot]);
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new Event('web3_wallet_updated'));
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg uppercase px-3 py-1.5 h-8 font-headline flex items-center gap-1.5 mx-auto"
                        >
                          <Zap className="h-3.5 w-3.5 fill-white" />
                          ⚡ Assigner & Démarrer Bot #{num} Immédiatement
                        </Button>
                      </div>
                    ) : (
                      assignedBots.map(b => (
                        <div key={b.id} className="p-3 bg-black/50 border border-white/10 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs text-white">
                              {b.strategy}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "text-[9px] font-bold uppercase border-none px-2 py-0.5 rounded",
                                b.status === 'RUNNING' ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                              )}>
                                {b.status === 'RUNNING' ? 'En Cours' : 'En Pause'}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setBots(prev => prev.map(item => item.id === b.id ? { ...item, status: b.status === 'RUNNING' ? 'STOPPED' : 'RUNNING' } : item))}
                                className="h-6 px-2 text-[10px] font-bold text-purple-300 hover:bg-white/10"
                              >
                                {b.status === 'RUNNING' ? 'Mettre en pause' : '▶️ Démarrer'}
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                            <span>Paire: {b.pair === 'ALL' ? 'Scan Multi-Actifs' : b.pair}</span>
                            <span className={cn(
                              "font-bold",
                              (b.netProfit || 0) >= 0 ? "text-[#c2ff0c]" : "text-rose-400"
                            )}>
                              PnL: {formatSmartPnl(b.netProfit || 0, isReal)} {isReal ? 'SOL' : '$'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* POSITIONS ACTIVES DE CE SOUS-WALLET */}
                  <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-extrabold text-xs uppercase font-headline text-white flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-purple-400" />
                        Positions Actives en Cours ({walletPositions.length})
                      </span>
                    </div>

                    {walletPositions.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-black/20 rounded-lg border border-dashed border-white/10">
                        Aucune position ouverte actuellement pour le Sous-Wallet #{num}.
                        <p className="text-[11px] text-slate-500 mt-1">Le robot analyse les flux de marché pour détecter un signal d&apos;entrée.</p>
                      </div>
                    ) : (
                      walletPositions.map(p => {
                        const currentP = livePrices[p.pair] || p.entryPrice;
                        const pnlVal = (currentP - p.entryPrice) * p.amount * (p.type === 'BUY' ? 1 : -1);
                        return (
                          <div key={p.id} className="p-3 bg-black/50 border border-white/10 rounded-lg space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white uppercase">{p.pair.replace('SOL:', '')}</span>
                              <span className={cn(
                                "font-mono font-bold",
                                pnlVal >= 0 ? "text-[#c2ff0c]" : "text-rose-400"
                              )}>
                                {pnlVal >= 0 ? '+' : ''}{pnlVal.toFixed(4)} SOL
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                              <span>Entrée: {p.entryPrice.toFixed(4)}</span>
                              <span>Actuel: {currentP.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          /* VUE D'ENSEMBLE DES 5 SOUS-WALLETS EN GRILLE */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {effectiveSubWallets.map((w: SubWallet, idx: number) => {
              const num = idx + 1;
              const bal = w?.balance || 0;
              const isFunded = bal >= 0.005;
              const assignedBots = bots.filter(b => (b.subWallet || 1) === num);
              const walletPos = activePositions.filter(p => p.botId && assignedBots.some(b => b.id === p.botId));

              return (
                <div
                  key={w.publicKey ? `${w.publicKey}_${idx}` : `sw_card_${idx}`}
                  className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3 hover:border-purple-500/40 transition-all cursor-pointer"
                  onClick={() => setActiveSubWalletTab(num)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-purple-600/30 text-purple-300 font-bold flex items-center justify-center text-xs font-headline">
                        #{num}
                      </span>
                      <span className="font-extrabold text-sm text-white font-headline">
                        Wallet #{num}
                      </span>
                    </div>
                    <Badge className={cn(
                      "text-[9px] uppercase font-headline font-bold border-none px-2 py-0.5 rounded",
                      isFunded ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    )}>
                      {isFunded ? "✅ Actif" : "⚠️ 0.00 SOL"}
                    </Badge>
                  </div>

                  <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-headline block">Solde en direct</span>
                    <span className="font-extrabold text-base text-white font-mono block">
                      {bal.toFixed(4)} SOL
                    </span>
                    <span className="text-[11px] text-purple-300 font-mono block">
                      {formatSolToUsdAndHtg(bal).combinedLabel}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Robot Assigné:</span>
                      <span className="font-bold text-white">
                        {assignedBots.length > 0 ? assignedBots[0].strategy : 'Aucun'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Trades en cours:</span>
                      <span className="font-bold text-purple-300 font-mono">
                        {walletPos.length} position{walletPos.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubWalletTab(num);
                      }}
                      className="flex-1 h-8 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 text-[11px] font-bold uppercase font-headline rounded-lg"
                    >
                      Détails & Actions
                    </Button>
                    {isReal && bal > 0.0005 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReclaimSingleSubWallet(w);
                        }}
                        disabled={isLocalReclaiming}
                        className="h-8 px-2.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/30 text-[11px] font-bold uppercase font-headline rounded-lg"
                        title="Rapatrier vers Phantom"
                      >
                        📥 Rapatrier
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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

          {/* Multi-Wallet Sub-Wallet Selector */}
          {tradingMode === 'REAL' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider font-headline">
                  Sous-Portefeuille Dédié au Bot (Multi-Wallet)
                </label>
                <span className="text-xs text-purple-300 font-mono font-bold">
                  Solde: {formatSmartCrypto(effectiveSubWallets[botSubWallet - 1]?.balance || 0, 'SOL')}
                </span>
              </div>
              <Select value={botSubWallet.toString()} onValueChange={(v) => setBotSubWallet(parseInt(v, 10))}>
                <SelectTrigger className="w-full h-11 bg-black/40 border border-white/15 rounded-xl px-4 text-sm text-white font-bold font-body focus:ring-[#c2ff0c]">
                  <SelectValue placeholder="Choisir le sous-wallet du bot" />
                </SelectTrigger>
                <SelectContent className="bg-[#150f21] border-white/15 text-white">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const bal = effectiveSubWallets[num - 1]?.balance || 0;
                    const isFunded = bal >= 0.005;
                    return (
                      <SelectItem key={num} value={num.toString()} className="focus:bg-white/10 focus:text-white cursor-pointer font-semibold text-xs">
                        Sous-Wallet #{num} — {formatSmartCrypto(bal, 'SOL')} {isFunded ? '✅ (Actif)' : '⚠️ (0.00 SOL - Non renfloué)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

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
              <div className="flex items-center gap-2 flex-wrap">
                {filteredBots.length > 0 && (
                  <>
                    {filteredBots.some(b => b.status === 'STOPPED') ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleStartAllBots}
                        className="h-7 px-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 font-headline"
                        title="Démarrer tous les robots en simultané"
                      >
                        <PlayCircle className="h-3 w-3" />
                        Tout Démarrer
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handlePauseAllBots}
                        className="h-7 px-2.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 font-headline"
                        title="Mettre en pause tous les robots"
                      >
                        <PauseCircle className="h-3 w-3" />
                        Tout Mettre en Pause
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleClearAllBots}
                      className="h-7 px-2 text-[10px] font-bold uppercase rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 flex items-center gap-1 font-headline"
                      title="Supprimer tous les robots configurés"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}

                <Badge className="bg-[#c2ff0c]/20 text-[#c2ff0c] text-xs font-bold border-none uppercase font-headline">
                  {filteredBots.filter(b => b.status === 'RUNNING').length} En Cours
                </Badge>
                {pendingSweepProfits > 0 && tradingMode === 'REAL' && (
                  <div className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-headline uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ⏳ Transfert on-chain automatique…
                  </div>
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
                        {tradingMode === 'REAL' && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono font-bold flex items-center gap-1">
                              <Wallet className="h-2.5 w-2.5" />
                              Sous-Wallet #{b.subWallet || 1}
                            </span>
                            {((effectiveSubWallets[(b.subWallet || 1) - 1]?.balance || 0) < 0.002) ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-headline font-bold uppercase flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                                0.00 SOL (Non renfloué)
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                                {(effectiveSubWallets[(b.subWallet || 1) - 1]?.balance || 0).toFixed(3)} SOL (Actif)
                              </span>
                            )}
                          </div>
                        )}
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

                    {/* Bouton direct pour transférer les fonds alloués au sous-wallet */}
                    {tradingMode === 'REAL' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleFundBotSubWallet(b)}
                        disabled={fundingBotId === b.id}
                        className="w-full h-8 px-2.5 text-[11px] font-extrabold uppercase rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 flex items-center justify-center gap-1.5 font-headline transition-all"
                      >
                        {fundingBotId === b.id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin text-purple-300" />
                            Transfert de {b.capital || 0.05} SOL en cours...
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3 text-purple-300 fill-purple-300" />
                            ⚡ Transférer {b.capital || 0.05} SOL vers Sous-Wallet #{b.subWallet || 1}
                          </>
                        )}
                      </Button>
                    )}

                    {tradingMode === 'DEMO' && ((effectiveSubWallets[(b.subWallet || 1) - 1]?.balance || 0) < 0.005) && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleFundBotSubWalletDemo(b)}
                        className="w-full h-8 px-2.5 text-[11px] font-extrabold uppercase rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 flex items-center justify-center gap-1.5 font-headline transition-all"
                      >
                        <Zap className="h-3 w-3 text-emerald-300 fill-emerald-300" />
                        ⚡ Allouer {typeof b.capital === 'number' && b.capital < 50 ? b.capital : 0.5} SOL Démo vers Sous-Wallet #{b.subWallet || 1}
                      </Button>
                    )}

                    {/* Auto-transfer status indicator — no manual action needed */}
                    {tradingMode === 'REAL' && (b.netProfit || b.pnl || 0) > 0.000001 && (
                      <div className="w-full h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center gap-2 text-[11px] font-bold font-headline text-amber-300 uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        ⏳ Sweep on-chain en attente — financer le sous-wallet pour activer
                      </div>
                    )}
                    {tradingMode === 'REAL' && (b.netProfit || b.pnl || 0) === 0 && (b.totalTrades || 0) > 0 && (
                      <div className="w-full h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-[11px] font-bold font-headline text-emerald-400 uppercase">
                        <span className="text-emerald-400">✅</span>
                        Gains transférés automatiquement on-chain
                      </div>
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
                        {isRealModeItem && isWinRule && (
                          <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Gains On-Chain Automatisés
                          </span>
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
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle className="text-base font-extrabold uppercase tracking-wider text-white font-headline flex items-center gap-2">
                <History className="h-5 w-5 text-slate-300" />
                <span>{tradingMode === 'DEMO' ? "Historique Démo" : "Historique Réel (SOL)"} ({filteredClosed.length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                {filteredClosed.length > 0 && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleExportCsv}
                      className="h-7 px-2.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1 font-headline"
                      title="Télécharger l'historique en fichier CSV / Excel"
                    >
                      <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                      Exporter CSV
                    </Button>
                    <Badge className={cn(
                      "text-xs font-mono font-bold px-2.5 py-1 border-none",
                      netRealizedPnL >= 0 ? "bg-emerald-500/25 text-emerald-300" : "bg-rose-500/25 text-rose-300"
                    )}>
                      PnL: {netRealizedPnL >= 0 ? '+' : ''}{netRealizedPnL.toFixed(2)} {tradingMode === 'REAL' ? 'SOL' : '$'}
                    </Badge>
                  </>
                )}
              </div>
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
                          {formatSmartPnl(profitVal, Boolean(tradingMode === 'REAL' || (h.pair && h.pair.startsWith('SOL:'))))} {tradingMode === 'REAL' || (h.pair && h.pair.startsWith('SOL:')) ? 'SOL' : '$'}
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

      {/* MODAL DE GESTION & DISTRIBUTION DE LA FLOTTE MULTI-WALLET */}
      <Dialog open={isDisperseModalOpen} onOpenChange={setIsDisperseModalOpen}>
        <DialogContent className="bg-[#150f21] border border-white/20 text-white max-w-xl rounded-2xl p-6 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1.5 border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-extrabold uppercase tracking-wide font-headline flex items-center gap-2 text-white">
                <Wallet className="h-5 w-5 text-purple-400" />
                <span>Flotte Multi-Wallet Solana ({effectiveSubWallets.filter((w: SubWallet) => (w.balance || 0) >= 0.005).length}/5 Actifs)</span>
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRefreshOnChainBalances}
                disabled={isRefreshingBalances}
                className="h-8 px-2.5 text-xs text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 rounded-lg flex items-center gap-1.5 border border-purple-500/20"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingBalances && "animate-spin")} />
                Actualiser
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-300 font-body leading-relaxed">
              Distribuez du SOL vers vos 5 sous-portefeuilles pour permettre aux robots de sniper, moyenner et prendre des profits en parallèle sans bloquer votre portefeuille principal.
            </DialogDescription>
          </DialogHeader>

          {/* TABLEAU DES 5 SOUS-WALLETS */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {effectiveSubWallets.map((w: SubWallet, idx: number) => {
              const num = idx + 1;
              const isFunded = (w.balance || 0) >= 0.005;
              const isCopied = copiedSubIndex === idx;

              return (
                <div 
                  key={w.publicKey ? `${w.publicKey}_${idx}` : `sw_${idx}`}
                  className="p-2.5 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs font-headline">
                      #{num}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-bold text-xs">
                          {w.publicKey ? `${w.publicKey.slice(0, 6)}...${w.publicKey.slice(-6)}` : 'Non généré'}
                        </span>
                        {w.publicKey && (
                          <button
                            type="button"
                            onClick={() => handleCopySubAddress(w.publicKey, idx)}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all"
                            title="Copier l'adresse publique"
                          >
                            {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs">
                      {(w.balance || 0).toFixed(3)} SOL
                    </span>
                    <Badge className={cn(
                      "text-[9px] uppercase font-headline font-bold border-none px-2 py-0.5 rounded",
                      isFunded ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    )}>
                      {isFunded ? "✅ Actif" : "⚠️ Vide"}
                    </Badge>
                    {(w.balance || 0) > 0.0005 && isReal && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReclaimSingleSubWallet(w)}
                        disabled={isLocalReclaiming}
                        className="h-7 px-2 text-[10px] font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg font-headline uppercase transition-all"
                        title="Rapatrier ce solde vers Phantom"
                      >
                        📥 Rapatrier
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FORMULAIRE DE MONTANT AVEC MAX AUTO */}
          {(() => {
            const totalRequired = customDisperseAmount * 5;
            const availableSol = solanaBalance ?? 0;
            const maxAutoPerWallet = Math.max(0.001, parseFloat(((Math.max(0, availableSol - 0.006)) / 5).toFixed(3)));
            const isInsufficient = isReal && availableSol > 0 && availableSol < totalRequired + 0.001;

            return (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3 font-body">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-200 uppercase font-headline tracking-wide">
                    Montant par Sous-Wallet (SOL)
                  </label>
                  <div className="flex items-center gap-2">
                    {availableSol > 0.008 && (
                      <button
                        type="button"
                        onClick={() => setCustomDisperseAmount(maxAutoPerWallet)}
                        className="px-2 py-0.5 rounded bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 text-[10px] font-bold uppercase tracking-wide font-headline transition-all"
                      >
                        ⚡ Max Auto ({maxAutoPerWallet.toFixed(3)}/w)
                      </button>
                    )}
                    <span className="font-mono text-purple-300 font-bold">
                      Total: {totalRequired.toFixed(3)} SOL
                    </span>
                  </div>
                </div>

                <Input
                  type="number"
                  step="0.005"
                  min="0.001"
                  value={customDisperseAmount}
                  onChange={(e) => setCustomDisperseAmount(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                  className="w-full h-11 bg-black/50 border border-white/15 rounded-xl px-4 text-sm font-bold text-white font-mono focus:ring-[#c2ff0c]"
                />

                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Solde de votre Wallet Connecté :</span>
                  <span className="font-mono font-bold text-slate-200">
                    {solanaBalance !== null ? `${solanaBalance.toFixed(3)} SOL` : 'Non connecté'}
                  </span>
                </div>

                {isInsufficient && (
                  <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 font-body flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p><strong>Solde insuffisant :</strong> Vous avez <strong>{availableSol.toFixed(3)} SOL</strong> mais <strong>{totalRequired.toFixed(3)} SOL</strong> sont demandés.</p>
                      <button
                        type="button"
                        onClick={() => setCustomDisperseAmount(maxAutoPerWallet)}
                        className="underline text-purple-300 font-bold mt-1 block hover:text-white"
                      >
                        Ajuster automatiquement à {maxAutoPerWallet.toFixed(3)} SOL par wallet ({ (maxAutoPerWallet * 5).toFixed(3) } SOL au total)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* RETOUR ERREUR / SUCCÈS */}
          {localDisperseError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-body flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{localDisperseError}</span>
            </div>
          )}

          {localDisperseTx && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-body space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>SOL Distribué avec succès on-chain !</span>
              </div>
              <a
                href={`https://solscan.io/tx/${localDisperseTx}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-200 underline flex items-center gap-1 hover:text-white"
              >
                Voir sur Solscan ({localDisperseTx.slice(0, 16)}...) <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* RETOUR RAPATRIEMENT */}
          {reclaimErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-body flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{reclaimErrorMsg}</span>
            </div>
          )}

          {reclaimSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-body flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span className="font-bold">{reclaimSuccessMsg}</span>
            </div>
          )}

          {/* BOUTONS D'ACTION */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={() => {
                  handleFundDemoFleet(0.5);
                  setIsDisperseModalOpen(false);
                }}
                variant="outline"
                className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-slate-200 border-white/15 text-xs font-extrabold uppercase tracking-wider font-headline"
              >
                🧪 Démo Virtuelle (0.50 SOL)
              </Button>

              <Button
                type="button"
                onClick={handleExecuteRealDisperse}
                disabled={isLocalDispersing || isLocalReclaiming || Boolean(isReal && solanaBalance !== null && solanaBalance < (customDisperseAmount * 5 + 0.001))}
                className="flex-1 h-11 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white text-xs font-extrabold uppercase tracking-wider font-headline flex items-center justify-center gap-2 border border-purple-500/40"
              >
                {isLocalDispersing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Distribution On-Chain...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-white" />
                    ⚡ Distribuer SOL Réel
                  </>
                )}
              </Button>
            </div>

            {/* BOUTON RAPATRIER TOUS LES FONDS VERS LE MASTER WALLET */}
            {isReal && (
              <Button
                type="button"
                onClick={handleReclaimAllSubWallets}
                disabled={isLocalReclaiming || isLocalDispersing}
                className="w-full h-11 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded-xl font-bold font-headline uppercase text-xs flex items-center justify-center gap-2 transition-all mt-1"
              >
                {isLocalReclaiming ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-rose-300" />
                    Rapatriement on-chain vers Phantom en cours...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    📥 Tout Rapatrier vers mon Portefeuille Principal (Phantom)
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

