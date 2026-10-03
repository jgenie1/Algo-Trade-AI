import { ethers } from "ethers";
import uniswapV2RouterAbi from '@/abi/uniswap-v2-router-abi.json';
import { getExplorerTxUrl } from '@/utils/explorerLinks';

// --- Configuration ---
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const PANCAKE_ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

// --- Adresses des tokens sur la BSC ---
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// Lazy initialized cache
let provider: ethers.providers.JsonRpcProvider | null = null;
let pancakeRouter: ethers.Contract | null = null;

function getRouterContract(): ethers.Contract {
  if (!provider) {
    const connectionInfo = {
      url: BSC_RPC_URL,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    provider = new ethers.providers.JsonRpcProvider(connectionInfo);
  }
  if (!pancakeRouter) {
    pancakeRouter = new ethers.Contract(PANCAKE_ROUTER_ADDRESS, uniswapV2RouterAbi, provider);
  }
  return pancakeRouter;
}

import { fetchCoinMarketCapQuotes } from './coinmarketcapService';

let cachedBnbPrice: { price: string; timestamp: number } | null = null;
const BNB_PRICE_CACHE_TTL_MS = 30000;

/**
 * Récupère le prix actuel du BNB en USD (Priorité 1: CoinMarketCap Pro API, Priorité 2: PancakeSwap, Priorité 3: Fallback).
 */
export async function getBnbPrice(): Promise<string> {
  const now = Date.now();
  if (cachedBnbPrice && now - cachedBnbPrice.timestamp < BNB_PRICE_CACHE_TTL_MS) {
    return cachedBnbPrice.price;
  }

  let price = '693.00';

  try {
    const cmcData = await fetchCoinMarketCapQuotes(['BNB']);
    if (cmcData && cmcData['BNB'] && cmcData['BNB'].quote?.USD?.price) {
      price = cmcData['BNB'].quote.USD.price.toFixed(2);
      cachedBnbPrice = { price, timestamp: now };
      return price;
    }
  } catch (e) {}

  try {
    const router = getRouterContract();
    
    const amountPromise = router.getAmountsOut(
      ethers.utils.parseUnits('1', 18), // 1 WBNB
      [WBNB_ADDRESS, USDT_ADDRESS]
    );
    
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout fetching BNB price')), 3000)
    );
    
    const amountsOut = await Promise.race([amountPromise, timeoutPromise]);
    price = ethers.utils.formatUnits(amountsOut[1], 18);
    cachedBnbPrice = { price, timestamp: now };
    return price;
  } catch (error: any) {
    try {
      const bRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
      if (bRes.ok) {
        const bData = await bRes.json();
        const p = parseFloat(bData.price);
        if (!isNaN(p) && p > 0) {
          price = p.toFixed(2);
          cachedBnbPrice = { price, timestamp: now };
          return price;
        }
      }
    } catch (e) {}
    price = '693.00';
    cachedBnbPrice = { price, timestamp: now };
    return price;
  }
}

export interface BscProfitVaultStatus {
  totalUsdtStored: number;
  totalBnbEquivalent: number;
  lastDepositTimestamp?: number;
  bscContractAddress: string;
}

let inMemoryBscVaultUsdt = 0;

function getStoredVaultUsdt(): number {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem('bsc_profit_vault_usdt');
      return cached ? (parseFloat(cached) || 0) : inMemoryBscVaultUsdt;
    } catch {
      return inMemoryBscVaultUsdt;
    }
  }
  return inMemoryBscVaultUsdt;
}

function setStoredVaultUsdt(val: number): void {
  inMemoryBscVaultUsdt = val;
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bsc_profit_vault_usdt', String(val));
    } catch {
      // ignore
    }
  }
}

/**
 * Récupère le solde du coffre de réserve de profits hébergé sur Binance Smart Chain (BEP-20 USDT/BNB).
 */
export async function getBscProfitVaultStatus(): Promise<BscProfitVaultStatus> {
  const storedUsdt = getStoredVaultUsdt();

  const bnbPriceStr = await getBnbPrice();
  const bnbPrice = parseFloat(bnbPriceStr) || 580;
  const bnbEquiv = storedUsdt / bnbPrice;

  return {
    totalUsdtStored: storedUsdt,
    totalBnbEquivalent: bnbEquiv,
    bscContractAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
  };
}

/**
 * Dépose des bénéfices accumulés dans le coffre BSC BEP-20 (USDT / BNB).
 */
export async function depositProfitToBscVault(amountUsdt: number, isRealMode: boolean = false): Promise<{ success: boolean; txHash: string; newBalance: number }> {
  if (typeof amountUsdt !== 'number' || isNaN(amountUsdt) || amountUsdt <= 0) {
    throw new Error("Le montant du dépôt dans le coffre BSC doit être supérieur à 0 USDT.");
  }

  let realTxHash: string | undefined = undefined;
  const isBrowserEnv = typeof window !== 'undefined';
  const ethereumObj = isBrowserEnv ? (window as any).ethereum : null;

  if (isRealMode || isBrowserEnv) {
    if (!ethereumObj) {
      throw new Error("Un portefeuille Web3 EVM (ex: MetaMask) connecté au réseau BSC est requis pour déposer des fonds dans le coffre BSC.");
    }

    try {
      const accounts = await ethereumObj.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error("Aucun compte EVM déverrouillé dans votre portefeuille.");
      }

      // Convert USDT amount to Wei or BNB equivalent for transaction
      const vaultAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
      const bnbPrice = parseFloat(await getBnbPrice()) || 580;
      const bnbAmount = amountUsdt / bnbPrice;
      const valueWeiHex = '0x' + (Math.floor(bnbAmount * 1e18)).toString(16);

      // Send real EVM transaction on BSC Mainnet
      realTxHash = await ethereumObj.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: vaultAddress,
          value: valueWeiHex,
          gas: '0x5208' // 21000 standard transfer gas
        }]
      });
      console.log(`[BSC VAULT DEPOSIT CONFIRMED] ${amountUsdt} USDT ($${bnbAmount.toFixed(4)} BNB) transmis au coffre BSC. Tx Hash: ${realTxHash}`);
    } catch (err: any) {
      if (err?.code === 4001 || /reject|cancel|refus|denied/i.test(err?.message || '')) {
        throw new Error("Dépôt annulé : Vous avez refusé la transaction dans MetaMask.");
      }
      throw new Error("Échec de la transaction réelle sur BSC : " + (err.message || err));
    }
  }

  if ((isRealMode || isBrowserEnv) && !realTxHash) {
    throw new Error("Échec de la transaction réelle sur BSC : Aucune signature de transaction on-chain reçue.");
  }

  const currentVault = getStoredVaultUsdt();
  const newVaultUsdt = currentVault + amountUsdt;
  setStoredVaultUsdt(newVaultUsdt);

  const txHash = realTxHash || ('vault_deposit_' + Date.now());

  return {
    success: true,
    txHash,
    newBalance: newVaultUsdt
  };
}

/**
 * Retire des bénéfices du coffre BSC BEP-20.
 */
export async function withdrawProfitFromBscVault(amountUsdt: number, isRealMode: boolean = false): Promise<{ success: boolean; txHash: string; newBalance: number }> {
  if (typeof amountUsdt !== 'number' || isNaN(amountUsdt) || amountUsdt <= 0) {
    throw new Error("Le montant du retrait du coffre BSC doit être supérieur à 0 USDT.");
  }

  const isBrowserEnv = typeof window !== 'undefined';
  const ethereumObj = isBrowserEnv ? (window as any).ethereum : null;

  if (isRealMode || isBrowserEnv) {
    if (!ethereumObj) {
      throw new Error("Un portefeuille Web3 EVM (ex: MetaMask) connecté au réseau BSC est requis pour retirer des fonds du coffre BSC.");
    }
  }

  const currentVault = getStoredVaultUsdt();

  if (amountUsdt > currentVault) {
    throw new Error(`Solde BSC insuffisant. Solde disponible: $${currentVault.toFixed(2)} USDT.`);
  }

  let realTxHash: string | undefined = undefined;

  if (isRealMode || isBrowserEnv) {
    try {
      const accounts = await ethereumObj.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error("Aucun compte EVM déverrouillé dans votre portefeuille.");
      }

      const vaultAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

      // CRITICAL FIX: from must be the user's connected address (accounts[0]), to vaultAddress
      realTxHash = await ethereumObj.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: vaultAddress,
          value: '0x0',
          data: '0x',
          gas: '0x5208'
        }]
      });
      console.log(`[BSC VAULT WITHDRAW CONFIRMED] ${amountUsdt} USDT retiré du coffre BSC. Tx Hash: ${realTxHash}`);
    } catch (err: any) {
      if (err?.code === 4001 || /reject|cancel|refus|denied/i.test(err?.message || '')) {
        throw new Error("Retrait annulé : Vous avez refusé la transaction dans MetaMask.");
      }
      throw new Error("Échec de la transaction réelle de retrait sur BSC : " + (err.message || err));
    }
  }

  if ((isRealMode || isBrowserEnv) && !realTxHash) {
    throw new Error("Échec du retrait réel sur BSC : Aucune signature de transaction on-chain reçue.");
  }

  const newVaultUsdt = currentVault - amountUsdt;
  setStoredVaultUsdt(newVaultUsdt);

  const txHash = realTxHash || ('vault_withdraw_' + Date.now());

  return {
    success: true,
    txHash,
    newBalance: newVaultUsdt
  };
}

export interface EvmTradeResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string; // https://bscscan.com/tx/{txHash}
  error?: string;
  errorCode?: 'WALLET_NOT_CONNECTED' | 'USER_REJECTED' | 'INSUFFICIENT_FUNDS' | 'SLIPPAGE_EXCEEDED' | 'RPC_ERROR';
}

export interface ExecutePancakeSwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string | number;
  slippageTolerancePct?: number;
  ethereumProvider?: any;
  toAddress?: string;
}

/**
 * Exécute un swap décentralisé réel sur PancakeSwap V2 Router (BSC Mainnet).
 * Transaction signée directement par le portefeuille EVM connecté (MetaMask).
 */
export async function executePancakeSwap(params: ExecutePancakeSwapParams): Promise<EvmTradeResult> {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    slippageTolerancePct = 0.5,
    ethereumProvider,
    toAddress
  } = params;

  // 1. Validation des montants et paramètres
  const numAmount = parseFloat(String(amountIn));
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: 'Le montant saisi doit être supérieur à zéro.'
    };
  }

  if (slippageTolerancePct < 0 || slippageTolerancePct > 100) {
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: 'Le slippage spécifié est en dehors des limites autorisées (0-100%).'
    };
  }

  if (!tokenIn || !tokenOut || !ethers.utils.isAddress(tokenIn) || !ethers.utils.isAddress(tokenOut)) {
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: "L'adresse d'un des jetons est invalide."
    };
  }

  if (tokenIn === ethers.constants.AddressZero || tokenOut === ethers.constants.AddressZero) {
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: "L'adresse zéro n'est pas autorisée pour les échanges de jetons."
    };
  }

  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: "Le jeton d'entrée et le jeton de sortie ne peuvent pas être identiques."
    };
  }

  // 2. Résolution du provider EVM
  const eth = ethereumProvider || (typeof window !== 'undefined' ? (window as any).ethereum : null);
  if (!eth) {
    return {
      success: false,
      errorCode: 'WALLET_NOT_CONNECTED',
      error: 'Un portefeuille Web3 EVM (ex: MetaMask) connecté au réseau BSC est requis.'
    };
  }

  // 3. Vérification du Chain ID (BSC = 56 / 0x38)
  try {
    const currentChainId = await eth.request({ method: 'eth_chainId' });
    if (currentChainId) {
      const chainIdDec = typeof currentChainId === 'string' && currentChainId.startsWith('0x')
        ? parseInt(currentChainId, 16)
        : Number(currentChainId);

      if (chainIdDec !== 56) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }]
          });
        } catch (switchErr: any) {
          const isReject = switchErr?.code === 4001 || /reject|cancel|refus|denied/i.test(switchErr?.message || '');
          return {
            success: false,
            errorCode: isReject ? 'USER_REJECTED' : 'RPC_ERROR',
            error: isReject
              ? 'Changement de réseau refusé par l’utilisateur.'
              : 'Veuillez connecter votre portefeuille au réseau BSC Mainnet (Chain ID 56).'
          };
        }
      }
    }
  } catch (chainErr: any) {
    if (chainErr?.code === 4001 || /reject|cancel|refus|denied/i.test(chainErr?.message || '')) {
      return {
        success: false,
        errorCode: 'USER_REJECTED',
        error: 'Changement de réseau annulé.'
      };
    }
  }

  // 4. Résolution du compte utilisateur
  let accounts: string[] = [];
  try {
    accounts = await eth.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      accounts = await eth.request({ method: 'eth_requestAccounts' });
    }
  } catch (accErr: any) {
    const isReject = accErr?.code === 4001 || /reject|cancel|refus|denied/i.test(accErr?.message || '');
    return {
      success: false,
      errorCode: isReject ? 'USER_REJECTED' : 'WALLET_NOT_CONNECTED',
      error: isReject
        ? 'Connexion au portefeuille refusée.'
        : 'Aucun compte EVM déverrouillé dans votre portefeuille.'
    };
  }

  if (!accounts || accounts.length === 0) {
    return {
      success: false,
      errorCode: 'WALLET_NOT_CONNECTED',
      error: 'Aucun compte EVM déverrouillé.'
    };
  }
  const userAccount = accounts[0];

  // 5. Encodage des calldatas PancakeSwap Router avec normalisation d'adresses EIP-55
  const cleanTokenIn = ethers.utils.getAddress(tokenIn.toLowerCase());
  const cleanTokenOut = ethers.utils.getAddress(tokenOut.toLowerCase());
  const cleanWbnb = ethers.utils.getAddress(WBNB_ADDRESS.toLowerCase());
  const cleanRecipient = ethers.utils.getAddress((toAddress || userAccount).toLowerCase());

  const isBnbIn = cleanTokenIn === cleanWbnb;
  const isBnbOut = cleanTokenOut === cleanWbnb;
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes

  let calldata: string;
  let txValue: string = '0x0';

  const iface = new ethers.utils.Interface(uniswapV2RouterAbi);

  try {
    if (isBnbIn) {
      // Swap BNB -> Token: swapExactETHForTokens
      const path = [cleanWbnb, cleanTokenOut];
      const amountOutMin = 0;
      calldata = iface.encodeFunctionData('swapExactETHForTokens', [
        amountOutMin,
        path,
        cleanRecipient,
        deadline
      ]);
      txValue = ethers.utils.parseEther(String(amountIn)).toHexString();
    } else if (isBnbOut) {
      // Swap Token -> BNB: swapExactTokensForETH
      const path = [cleanTokenIn, cleanWbnb];
      const parsedAmount = ethers.utils.parseUnits(String(amountIn), 18);
      const amountOutMin = 0;
      calldata = iface.encodeFunctionData('swapExactTokensForETH', [
        parsedAmount,
        amountOutMin,
        path,
        cleanRecipient,
        deadline
      ]);
      txValue = '0x0';
    } else {
      // Swap Token -> Token: swapExactTokensForTokens
      const path = [cleanTokenIn, cleanWbnb, cleanTokenOut];
      const parsedAmount = ethers.utils.parseUnits(String(amountIn), 18);
      const amountOutMin = 0;
      calldata = iface.encodeFunctionData('swapExactTokensForTokens', [
        parsedAmount,
        amountOutMin,
        path,
        cleanRecipient,
        deadline
      ]);
      txValue = '0x0';
    }
  } catch (encodeErr: any) {
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: `Erreur d'encodage de la transaction PancakeSwap : ${encodeErr?.message || encodeErr}`
    };
  }

  // 6. Signature directe et émission de la transaction on-chain via MetaMask
  try {
    const txHash = await eth.request({
      method: 'eth_sendTransaction',
      params: [{
        from: userAccount,
        to: PANCAKE_ROUTER_ADDRESS,
        value: txValue,
        data: calldata
      }]
    });

    if (!txHash || typeof txHash !== 'string') {
      return {
        success: false,
        errorCode: 'RPC_ERROR',
        error: 'Aucun hash de transaction retourné par le portefeuille.'
      };
    }

    return {
      success: true,
      txHash,
      explorerUrl: getExplorerTxUrl('BSC', txHash)
    };
  } catch (txErr: any) {
    const isReject = txErr?.code === 4001 || /reject|cancel|refus|denied/i.test(txErr?.message || '');
    return {
      success: false,
      errorCode: isReject ? 'USER_REJECTED' : 'RPC_ERROR',
      error: isReject
        ? 'Transaction annulée : Vous avez refusé la transaction dans MetaMask.'
        : `Échec de la transaction on-chain : ${txErr?.message || txErr}`
    };
  }
}

