import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SOL_USD_RATE = 145.0;
let cachedUsdHtgRate = 132.0;

// Get active rate (cached, custom override from settings, or default)
export function getUsdHtgRate(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('settings_usd_htg_rate');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return cachedUsdHtgRate;
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

// Auto-trigger initial fetch on load if in browser
if (typeof window !== 'undefined') {
  fetchLiveUsdHtgRate().catch(() => {});
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
