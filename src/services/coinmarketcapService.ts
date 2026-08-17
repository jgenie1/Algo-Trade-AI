/**
 * Service pour interagir avec CoinMarketCap de manière sécurisée.
 * Les requêtes passent par l'API Route interne (/api/coinmarketcap)
 * afin de masquer la clé d'API dans les variables d'environnement du serveur (Hostinger).
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

export async function fetchCoinMarketCapQuotes(
  symbols: string[] = ['BTC', 'ETH', 'SOL', 'BNB'],
  convert: string = 'USD'
): Promise<Record<string, CoinMarketCapQuote> | null> {
  try {
    const symbolQuery = symbols.join(',');
    const url = `/api/coinmarketcap?symbol=${encodeURIComponent(symbolQuery)}&convert=${encodeURIComponent(convert)}`;
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

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
      return quotes;
    }
  } catch (error) {
    console.warn('[CoinMarketCap Service] Erreur lors de la récupération des prix:', error);
  }
  return null;
}
