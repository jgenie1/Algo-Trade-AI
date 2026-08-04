import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SOL_USD_RATE = 145.0;

// IMPORTANT: This value must be STABLE between SSR and first client render.
// It is only updated via setClientUsdHtgRate() after React hydration completes.
// This prevents the "Hydration failed" error caused by localStorage reads during SSR.
let cachedUsdHtgRate = 132.0;
let _isClientRateLoaded = false;

export function getRealMarketBasePrice(pair: string): number {
  if (!pair) return 145.50;
  const p = pair.toUpperCase();
  if (p.includes('EURUSD')) return 1.0850;
  if (p.includes('GBPUSD')) return 1.3300;
  if (p.includes('USDJPY')) return 154.50;
  if (p.includes('AUDUSD')) return 0.6550;
  if (p.includes('USDCAD')) return 1.3750;
  if (p.includes('USDCHF')) return 0.8850;
  if (p.includes('EURGBP')) return 0.8520;
  if (p.includes('EURJPY')) return 167.50;
  if (p.includes('GBPJPY')) return 196.50;
  if (p.includes('BTC')) return 65000.00;
  if (p.includes('ETH')) return 3400.00;
  if (p.includes('SOL')) return 145.50;
  if (p.includes('BNB')) return 580.00;
  if (p.includes('XRP')) return 0.58;
  if (p.includes('ADA')) return 0.38;
  if (p.includes('DOGE')) return 0.12;
  if (p.includes('LINK')) return 14.50;
  if (p.includes('AVAX')) return 28.50;
  if (p.includes('GOLD')) return 2400.00;
  if (p.includes('SILVER')) return 28.50;
  if (p.includes('OIL')) return 78.50;
  return 145.50;
}

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

// Fetch live daily USD -> HTG exchange rate from official open exchange rates API
export async function fetchLiveUsdHtgRate(): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
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
    console.warn("API Taux du Jour HTG indisponible, utilisation du taux en cache:", e);
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
