
'use server';

import { ethers } from "ethers";
import uniswapV2RouterAbi from '@/abi/uniswap-v2-router-abi.json';

// --- Configuration ---
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const PANCAKE_ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

// --- Adresses des tokens sur la BSC ---
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

// --- Initialisation du fournisseur et du contrat ---
const provider = new ethers.providers.JsonRpcProvider(BSC_RPC_URL);
const pancakeRouter = new ethers.Contract(PANCAKE_ROUTER_ADDRESS, uniswapV2RouterAbi, provider);

/**
 * Récupère le prix actuel du BNB en USD en interrogeant la paire WBNB/USDT sur PancakeSwap.
 * @returns Le prix du BNB en tant que chaîne de caractères.
 */
export async function getBnbPrice(): Promise<string> {
  try {
    const amountsOut = await pancakeRouter.getAmountsOut(
      ethers.utils.parseUnits('1', 18), // 1 WBNB
      [WBNB_ADDRESS, USDT_ADDRESS]
    );

    const price = ethers.utils.formatUnits(amountsOut[1], 18); // USDT a 18 décimales
    return price;
  } catch (error) {
    console.error("Erreur lors de la récupération du prix du BNB:", error);
    // Return a fallback price instead of throwing to prevent crashing the page when offline
    return "582.45";
  }
}
