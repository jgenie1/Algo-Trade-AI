"use client";

import { useState, useEffect, useRef } from 'react';
import type { SubWallet } from '@/types';
import { 
  getRealSolanaBalance, 
  checkSolanaNetworkHealth, 
  getMultipleSolanaBalances, 
  disperseSolToSubWallets 
} from '@/services/pumpFunService';
import bs58 from 'bs58';

export function useWalletEngine(isMounted: boolean) {
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [evmBalance, setEvmBalance] = useState<number | null>(null);
  const [walletChain, setWalletChain] = useState<'Solana' | 'BSC' | 'Ethereum' | null>(null);
  const [isSolanaWalletActive, setIsSolanaWalletActive] = useState<boolean>(false);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [nodeBlockHeight, setNodeBlockHeight] = useState<number | null>(null);
  const [disperseAmount, setDisperseAmount] = useState<number>(0.02);
  const [isDispersing, setIsDispersing] = useState<boolean>(false);
  const [disperseTxHash, setDisperseTxHash] = useState<string>('');
  const [disperseError, setDisperseError] = useState<string>('');
  const [subWallets, setSubWallets] = useState<SubWallet[]>([]);

  const refreshWalletRef = useRef<() => void>(() => {});

  // Load or generate sub-wallets
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSubs = localStorage.getItem('trade_sub_wallets');
      if (storedSubs) {
        try {
          setSubWallets(JSON.parse(storedSubs));
        } catch {}
      } else {
        import('@solana/web3.js').then(({ Keypair }) => {
          const defaultSubs: SubWallet[] = Array.from({ length: 5 }).map(() => {
            const kp = Keypair.generate();
            const secretKeyBase58 = bs58.encode(kp.secretKey);
            return {
              publicKey: kp.publicKey.toBase58(),
              privateKey: secretKeyBase58,
              balance: 0
            };
          });
          localStorage.setItem('trade_sub_wallets', JSON.stringify(defaultSubs));
          setSubWallets(defaultSubs);
        }).catch(err => {
          console.warn("Could not load @solana/web3.js sub-wallets:", err);
          setSubWallets([]);
        });
      }
    }
  }, []);

  // Wallet & Network Sync (Solana + EVM MetaMask)
  useEffect(() => {
    if (!isMounted) return;

    const fetchBrowserSolanaBalance = async (): Promise<boolean> => {
      try {
        const storedWallet = localStorage.getItem('connected_web3_wallet');
        if (!storedWallet) return false;
        const parsed = JSON.parse(storedWallet) as { address: string; chain: string; name: string };
        if (!parsed || parsed.chain !== 'Solana' || !parsed.address) return false;

        setSolanaPubKey(parsed.address);
        setIsSolanaWalletActive(true);
        setWalletChain('Solana');
        setSolanaBalance(prev => (prev !== null ? prev : 0));

        const { Connection, PublicKey } = await import('@solana/web3.js');
        const pubKey = new PublicKey(parsed.address);

        const customRpc = localStorage.getItem('settings_rpc_url');
        const rpcEndpoints = [
          customRpc,
          'https://rpc.ankr.com/solana',
          'https://solana-mainnet.rpc.extrnode.com',
          'https://solana-rpc.publicnode.com'
        ].filter(Boolean) as string[];

        const accruedProfit = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('trade_accrued_profit_sol') || '0') : 0;
        const validAccrued = isNaN(accruedProfit) ? 0 : accruedProfit;

        for (const rpcUrl of rpcEndpoints) {
          try {
            const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
            const lamports = await connection.getBalance(pubKey);
            const sol = (lamports / 1e9) + validAccrued;
            setSolanaBalance(sol);
            return true;
          } catch {}
        }
        return true;
      } catch {
        return false;
      }
    };

    const fetchEvmBalance = async () => {
      try {
        const storedWallet = localStorage.getItem('connected_web3_wallet');
        if (!storedWallet) return;
        const parsed = JSON.parse(storedWallet) as { address: string; chain: 'Solana' | 'BSC' | 'Ethereum' };
        if (parsed.chain === 'Solana') return;
        const win = window as any;
        const provider = win.ethereum || win.coinbaseWalletExtension;
        if (!provider || !parsed.address) return;
        const balHex: string = await provider.request({
          method: 'eth_getBalance',
          params: [parsed.address, 'latest']
        });
        const balWei = parseInt(balHex, 16);
        const balNative = balWei / 1e18;
        setEvmBalance(balNative);
        setWalletChain(parsed.chain);
      } catch {}
    };

    const updateWalletAndStatus = async () => {
      const accruedProfit = typeof window !== 'undefined' ? parseFloat(localStorage.getItem('trade_accrued_profit_sol') || '0') : 0;
      const validAccrued = isNaN(accruedProfit) ? 0 : accruedProfit;

      const serverRes = await getRealSolanaBalance();
      if (serverRes && serverRes.success && serverRes.balance !== undefined && serverRes.publicKey) {
        setSolanaBalance(serverRes.balance + validAccrued);
        setSolanaPubKey(serverRes.publicKey);
        setIsSolanaWalletActive(true);
        setWalletChain('Solana');
      } else {
        const solanaOk = await fetchBrowserSolanaBalance();
        if (!solanaOk) {
          setIsSolanaWalletActive(false);
          await fetchEvmBalance();
        }
      }

      checkSolanaNetworkHealth().then(res => {
        if (res && res.success && res.latency !== undefined && res.blockHeight !== undefined) {
          setRpcLatency(res.latency);
          setNodeBlockHeight(res.blockHeight);
        } else {
          setRpcLatency(null);
          setNodeBlockHeight(null);
        }
      });

      const storedSubs = localStorage.getItem('trade_sub_wallets');
      if (storedSubs) {
        try {
          const subs = JSON.parse(storedSubs) as SubWallet[];
          const pubKeys = subs.map(s => s.publicKey);
          getMultipleSolanaBalances(pubKeys).then(balRes => {
            if (balRes && balRes.success && balRes.balances) {
              const updated = subs.map(s => ({
                ...s,
                balance: balRes.balances![s.publicKey] ?? 0
              }));
              localStorage.setItem('trade_sub_wallets', JSON.stringify(updated));
              setSubWallets(updated);
            }
          });
        } catch {}
      }
    };

    updateWalletAndStatus();
    refreshWalletRef.current = updateWalletAndStatus;

    if (typeof window !== 'undefined') {
      window.addEventListener('web3_wallet_updated', updateWalletAndStatus);
      window.addEventListener('storage', updateWalletAndStatus);
    }
    const interval = setInterval(updateWalletAndStatus, 10000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('web3_wallet_updated', updateWalletAndStatus);
        window.removeEventListener('storage', updateWalletAndStatus);
      }
      clearInterval(interval);
    };
  }, [isMounted]);

  const handleDisperseSOL = async () => {
    if (subWallets.length === 0) return;
    setIsDispersing(true);
    setDisperseTxHash('');
    setDisperseError('');

    try {
      const res = await disperseSolToSubWallets({
        subWalletPubKeys: subWallets.map(s => s.publicKey),
        amountPerWallet: disperseAmount
      });

      if (res && res.success) {
        setDisperseTxHash(res.txHash || 'disp_tx_' + Date.now());
        setTimeout(() => refreshWalletRef.current(), 1500);
      } else {
        setDisperseError(res.error || 'Erreur lors de la dispersion SOL.');
      }
    } catch (e: any) {
      setDisperseError(e.message || 'Erreur inconnue.');
    } finally {
      setIsDispersing(false);
    }
  };

  return {
    solanaPubKey,
    solanaBalance,
    setSolanaBalance,
    evmBalance,
    walletChain,
    isSolanaWalletActive,
    rpcLatency,
    nodeBlockHeight,
    subWallets,
    setSubWallets,
    disperseAmount,
    setDisperseAmount,
    isDispersing,
    disperseTxHash,
    disperseError,
    handleDisperseSOL,
    refreshWallet: () => refreshWalletRef.current()
  };
}
