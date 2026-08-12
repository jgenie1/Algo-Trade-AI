import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Dynamic live price cache updated from real API feeds (CoinMarketCap, Binance, ExchangeRate API)
const liveMarketPricesStore: Record<string, number> = {};

/**
 * Updates the global live market price cache when an API returns a fresh quote.
 */
export function updateLiveMarketPrice(pair: string, price: number): void {
  if (typeof price === 'number' && !isNaN(price) && price > 0) {
    const cleanKey = pair.replace('FX:', '').replace('-USD', '').replace('=', '').toUpperCase();
    liveMarketPricesStore[pair] = price;
    liveMarketPricesStore[cleanKey] = price;
  }
}

/**
 * Returns the current live market price for a given pair from real API feeds.
 */
export function getRealMarketBasePrice(pair: string): number {
  if (!pair) return liveMarketPricesStore['SOL'] || liveMarketPricesStore['SOL-USD'] || 0;
  const p = pair.toUpperCase();
  const cleanKey = p.replace('FX:', '').replace('-USD', '').replace('=', '');

  if (liveMarketPricesStore[pair] && liveMarketPricesStore[pair] > 0) {
    return liveMarketPricesStore[pair];
  }
  if (liveMarketPricesStore[cleanKey] && liveMarketPricesStore[cleanKey] > 0) {
    return liveMarketPricesStore[cleanKey];
  }

  return 0;
}

/**
 * Returns the live SOL/USD price from real API feeds.
 */
export function getSolUsdRate(): number {
  return liveMarketPricesStore['SOL'] || liveMarketPricesStore['SOL-USD'] || 0;
}

export const SOL_USD_RATE = 145.0; // Legacy fallback; live market API prices are used across app

// IMPORTANT: This value must be STABLE between SSR and first client render.
// It is only updated via setClientUsdHtgRate() after React hydration completes.
// This prevents the "Hydration failed" error caused by localStorage reads during SSR.
let cachedUsdHtgRate = 130.77;
let _isClientRateLoaded = false;

/**
 * Returns the current USD→HTG rate.
 * NEVER reads localStorage directly — prevents SSR/Client hydration mismatch.
 * Use initClientUsdHtgRate() in a useEffect to load the persisted rate after hydration.
 */
export function getUsdHtgRate(): number {
  return cachedUsdHtgRate;
}

/**
 * Call this ONCE inside a useEffect (after hydration) to load the persisted rate from localStorage.
 * This must NOT be called during SSR or initial render.
 */
export function initClientUsdHtgRate(): void {
  if (_isClientRateLoaded) return;
  _isClientRateLoaded = true;
  try {
    const saved = localStorage.getItem('settings_usd_htg_rate');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        cachedUsdHtgRate = parsed;
      }
    }
  } catch (e) {
    // ignore
  }
}

// Fetch live daily USD -> HTG exchange rate from official open exchange rates API with secondary fallback
export async function fetchLiveUsdHtgRate(): Promise<number> {
  const apis = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD'
  ];

  for (const url of apis) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates && data.rates.HTG) {
          const liveRate = parseFloat(data.rates.HTG.toFixed(2));
          cachedUsdHtgRate = liveRate;
          if (typeof window !== 'undefined') {
            localStorage.setItem('settings_usd_htg_rate', liveRate.toString());
            localStorage.setItem('settings_usd_htg_updated_at', Date.now().toString());
          }
          return liveRate;
        }
      }
    } catch (e) {
      console.warn(`API Taux HTG (${url}) indisponible:`, e);
    }
  }
  return getUsdHtgRate();
}

export function formatSolToUsdAndHtg(solAmount: number | null | undefined, customSolPriceUsd?: number, customUsdHtgRate?: number) {
  const amount = solAmount == null || isNaN(solAmount) ? 0 : solAmount;
  const solPrice = customSolPriceUsd && customSolPriceUsd > 0 ? customSolPriceUsd : SOL_USD_RATE;
  const htgRate = customUsdHtgRate && customUsdHtgRate > 0 ? customUsdHtgRate : getUsdHtgRate();
  const usdVal = amount * solPrice;
  const htgVal = usdVal * htgRate;

  return {
    usd: `${usdVal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`,
    htg: `${Math.round(htgVal).toLocaleString('fr-FR')} HTG`,
    usdNum: usdVal,
    htgNum: htgVal,
    combinedLabel: `≈ ${usdVal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD / ${Math.round(htgVal).toLocaleString('fr-FR')} HTG`
  };
}

export function formatUsdToHtg(usdAmount: number | null | undefined, customUsdHtgRate?: number) {
  const amount = usdAmount == null || isNaN(usdAmount) ? 0 : usdAmount;
  const htgRate = customUsdHtgRate && customUsdHtgRate > 0 ? customUsdHtgRate : getUsdHtgRate();
  const htgVal = amount * htgRate;
  return `${Math.round(htgVal).toLocaleString('fr-FR')} HTG`;
}

/**
 * Formate un nombre de manière intelligente en adaptant dynamiquement le nombre de décimales.
 * - Valeurs >= 100 : 2 décimales (ex: 1 250,50)
 * - Valeurs 1..100 : 2 à 3 décimales (ex: 14,52)
 * - Valeurs 0.01..1 : 2 à 4 décimales (ex: 0,045)
 * - Micro-valeurs < 0.001 (Meme Coins, micro SOL) : 4 à 8 décimales sans zéros inutiles (ex: 0,000456)
 */
export function formatSmartNumber(value: number | undefined | null, symbol?: string): string {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  if (val === 0) return symbol ? `0,00 ${symbol}` : '0,00';

  const absVal = Math.abs(val);
  let maxDigits = 2;
  let minDigits = 2;

  if (absVal >= 100) {
    minDigits = 2;
    maxDigits = 2;
  } else if (absVal >= 1) {
    minDigits = 2;
    maxDigits = 3;
  } else if (absVal >= 0.01) {
    minDigits = 2;
    maxDigits = 4;
  } else if (absVal >= 0.0001) {
    minDigits = 3;
    maxDigits = 5;
  } else {
    minDigits = 4;
    maxDigits = 8;
  }

  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  });

  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Formate un solde / montant Crypto (SOL, BNB, ETH, Meme Coins) de manière intelligente.
 */
export function formatSmartCrypto(value: number | undefined | null, symbol: string = 'SOL'): string {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  if (val === 0) return `0,00 ${symbol}`;
  const absVal = Math.abs(val);

  let minDigits = 2;
  let maxDigits = 2;

  if (absVal >= 100) {
    minDigits = 2;
    maxDigits = 2;
  } else if (absVal >= 1) {
    minDigits = 2;
    maxDigits = 3;
  } else if (absVal >= 0.01) {
    minDigits = 3;
    maxDigits = 4;
  } else if (absVal >= 0.0001) {
    minDigits = 4;
    maxDigits = 6;
  } else {
    minDigits = 4;
    maxDigits = 8;
  }

  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  });

  return `${formatted} ${symbol}`;
}

/**
 * Formate un Prix de Marché intelligemment selon la classe d'actif (Forex, JPY, Crypto Majeures, Meme Coins).
 */
export function formatSmartPrice(price: number | undefined | null, pair?: string): string {
  const val = typeof price === 'number' && !isNaN(price) ? price : 0;
  if (val === 0) return '0,00';
  const absVal = Math.abs(val);

  const pairUpper = (pair || '').toUpperCase();
  const isJpy = pairUpper.includes('JPY');
  const isForex = pairUpper.startsWith('FX:') || pairUpper.includes('EURUSD') || pairUpper.includes('GBPUSD') || pairUpper.includes('AUDUSD') || pairUpper.includes('USDCAD') || pairUpper.includes('USDCHF');

  let minDigits = 2;
  let maxDigits = 2;

  if (isForex && !isJpy) {
    minDigits = 4;
    maxDigits = 5;
  } else if (isJpy) {
    minDigits = 2;
    maxDigits = 3;
  } else if (absVal >= 1000) {
    minDigits = 2;
    maxDigits = 2;
  } else if (absVal >= 1) {
    minDigits = 2;
    maxDigits = 4;
  } else if (absVal >= 0.0001) {
    minDigits = 4;
    maxDigits = 6;
  } else {
    minDigits = 4;
    maxDigits = 8;
  }

  return val.toLocaleString('fr-FR', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  });
}

/**
 * Formate un PnL/Profit/Perte avec adaptation automatique intelligente des décimales (2 à 8 chiffres).
 */
export function formatSmartPnl(value: number | undefined | null, isSol: boolean = false): string {
  const val = typeof value === 'number' && !isNaN(value) ? value : 0;
  if (val === 0) return '0,00';
  const absVal = Math.abs(val);

  let minDigits = 2;
  let maxDigits = 2;

  if (isSol || absVal < 1) {
    if (absVal >= 100) {
      minDigits = 2;
      maxDigits = 2;
    } else if (absVal >= 1) {
      minDigits = 2;
      maxDigits = 3;
    } else if (absVal >= 0.01) {
      minDigits = 2;
      maxDigits = 4;
    } else if (absVal >= 0.0001) {
      minDigits = 3;
      maxDigits = 5;
    } else {
      minDigits = 4;
      maxDigits = 7;
    }
  } else {
    minDigits = 2;
    maxDigits = 2;
  }

  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits
  });

  return val > 0 ? `+${formatted}` : formatted;
}
