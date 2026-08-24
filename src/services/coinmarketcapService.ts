/**
 * Service pour interagir avec CoinMarketCap de manière sécurisée.
 * Les requêtes passent par l'API Route interne (/api/coinmarketcap)
 * afin de masquer la clé d'API dans les variables d'environnement du serveur (Hostinger).
 * Inclut un dédoublonnage en vol (In-Flight deduplication) pour éviter les requêtes redondantes.
 */

export interface CoinMarketCapQuote {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  last_updated: string;
  quote: {
    [currency: string]: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
}

import { updateLiveMarketPrice } from '@/lib/utils';

// In-flight promise deduplication to prevent multiple simultaneous duplicate fetch calls
let inFlightRequest: Promise<Record<string, CoinMarketCapQuote> | null> | null = null;
let lastFetchTime = 0;
let lastCachedQuotes: Record<string, CoinMarketCapQuote> | null = null;
const CLIENT_CACHE_TTL = 10000; // 10 seconds client-side throttle

export async function fetchCoinMarketCapQuotes(
  symbols: string[] = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX'],
  convert: string = 'USD'
): Promise<Record<string, CoinMarketCapQuote> | null> {
  const now = Date.now();

  // Return fresh client cache if requested within last 10 seconds
  if (lastCachedQuotes && (now - lastFetchTime) < CLIENT_CACHE_TTL) {
    return lastCachedQuotes;
  }

  // Reuse existing in-flight promise if a request is already running
  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const symbolQuery = symbols.join(',');
      const url = `/api/coinmarketcap?symbol=${encodeURIComponent(symbolQuery)}&convert=${encodeURIComponent(convert)}`;
      
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        return lastCachedQuotes;
      }

      const json = await res.json();
      if (json && json.success && json.data) {
        const quotes = json.data as Record<string, CoinMarketCapQuote>;
        for (const [sym, quoteObj] of Object.entries(quotes)) {
          const p = quoteObj?.quote?.[convert]?.price;
          if (typeof p === 'number' && !isNaN(p) && p > 0) {
            updateLiveMarketPrice(sym, p);
            if (sym.toUpperCase() === 'SOL' && typeof window !== 'undefined') {
              localStorage.setItem('cmc_live_sol_price', p.toString());
              window.dispatchEvent(new CustomEvent('live_sol_price_updated', { detail: p }));
            }
          }
        }
        lastCachedQuotes = quotes;
        lastFetchTime = Date.now();
        return quotes;
      }
      return lastCachedQuotes;
    } catch (err) {
      return lastCachedQuotes;
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}

export async function getLiveCryptoPrice(symbol: string): Promise<number | null> {
  const quotes = await fetchCoinMarketCapQuotes([symbol]);
  if (!quotes || !quotes[symbol.toUpperCase()]) return null;
  return quotes[symbol.toUpperCase()]?.quote?.USD?.price || null;
}
