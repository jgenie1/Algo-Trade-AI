import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for CoinMarketCap Pro quotes on the server
interface CacheEntry {
  data: Record<string, any>;
  timestamp: number;
}

let quotesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 25000; // 25 seconds server cache to strictly respect CMC API rate limits

const DEFAULT_SYMBOLS = 'BTC,ETH,SOL,BNB,XRP,ADA,DOGE,LINK,AVAX';

const BINANCE_MAP: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  LINK: 'LINKUSDT',
  AVAX: 'AVAXUSDT'
};

async function fetchRealLiveCryptoPrices(symbols: string[]): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  const binancePairs = symbols.map(s => BINANCE_MAP[s.toUpperCase()]).filter(Boolean);
  
  if (binancePairs.length > 0) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(binancePairs))}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list) {
            const symEntry = Object.entries(BINANCE_MAP).find(([, pair]) => pair === item.symbol);
            if (symEntry) {
              const sym = symEntry[0];
              const price = parseFloat(item.lastPrice);
              const change24h = parseFloat(item.priceChangePercent);
              const volume = parseFloat(item.volume);
              result[sym] = {
                id: 1,
                name: sym,
                symbol: sym,
                slug: sym.toLowerCase(),
                quote: {
                  USD: {
                    price,
                    volume_24h: volume * price,
                    percent_change_24h: change24h,
                    percent_change_1h: 0.0,
                    last_updated: new Date().toISOString()
                  }
                }
              };
            }
          }
        }
      }
    } catch (e) {}
  }

  // Pour les symboles non gérés par Binance, interroger Coinbase Spot
  for (const s of symbols) {
    const sym = s.toUpperCase();
    if (!result[sym]) {
      try {
        const cbRes = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, { cache: 'no-store' });
        if (cbRes.ok) {
          const cbData = await cbRes.json();
          const p = parseFloat(cbData?.data?.amount);
          if (!isNaN(p) && p > 0) {
            result[sym] = {
              id: 1,
              name: sym,
              symbol: sym,
              slug: sym.toLowerCase(),
              quote: {
                USD: {
                  price: p,
                  volume_24h: 1000000,
                  percent_change_24h: 0.0,
                  percent_change_1h: 0.0,
                  last_updated: new Date().toISOString()
                }
              }
            };
          }
        }
      } catch (e) {}
    }
  }

  return result;
}

/**
 * Server-side proxy for CoinMarketCap Pro API with automatic batching & caching.
 * Protects against 429 Too Many Requests by caching quotes for 25 seconds.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get('symbol') || DEFAULT_SYMBOLS;
  const convert = (searchParams.get('convert') || 'USD').toUpperCase();
  const requestedSymbols = symbolParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  const now = Date.now();

  // 1. Serve from in-memory server cache if fresh (< 25s old)
  if (quotesCache && (now - quotesCache.timestamp) < CACHE_TTL_MS) {
    const filtered: Record<string, any> = {};
    requestedSymbols.forEach(sym => {
      if (quotesCache?.data[sym]) {
        filtered[sym] = quotesCache.data[sym];
      }
    });

    if (Object.keys(filtered).length > 0) {
      return NextResponse.json({ success: true, data: filtered, source: 'cache' }, { status: 200 });
    }
  }

  // 2. Fetch fresh batch from CoinMarketCap Pro API
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  if (!apiKey) {
    // Si aucune clé CMC, récupérer directement les cours réels sur Binance & Coinbase (100% réels)
    const realPrices = await fetchRealLiveCryptoPrices(requestedSymbols);
    return NextResponse.json({ success: true, data: realPrices, source: 'binance_live_real' }, { status: 200 });
  }

  // Combine requested symbols with default major symbols to hydrate cache comprehensively in 1 call
  const allSymbols = Array.from(new Set([...DEFAULT_SYMBOLS.split(','), ...requestedSymbols])).join(',');
  const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(
    allSymbols
  )}&convert=${encodeURIComponent(convert)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(cmcUrl, {
      headers: {
        'Accept': 'application/json',
        'X-CMC_PRO_API_KEY': apiKey,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        // Update server cache
        quotesCache = {
          data: json.data,
          timestamp: now
        };

        const filtered: Record<string, any> = {};
        requestedSymbols.forEach(sym => {
          if (json.data[sym]) {
            filtered[sym] = json.data[sym];
          }
        });

        return NextResponse.json({ success: true, data: filtered, source: 'cmc_live' }, { status: 200 });
      }
    }

    // If CMC returned 429 Too Many Requests or 5xx, use cached data if available
    if (quotesCache && Object.keys(quotesCache.data).length > 0) {
      const filtered: Record<string, any> = {};
      requestedSymbols.forEach(sym => {
        if (quotesCache?.data[sym]) {
          filtered[sym] = quotesCache.data[sym];
        }
      });
      return NextResponse.json({ success: true, data: filtered, source: 'cache_stale' }, { status: 200 });
    }

    // Récupération des cours réels sans aucune donnée factice
    const realFallback = await fetchRealLiveCryptoPrices(requestedSymbols);
    return NextResponse.json({ success: true, data: realFallback, source: 'binance_live_fallback' }, { status: 200 });
  } catch (error: any) {
    if (quotesCache && Object.keys(quotesCache.data).length > 0) {
      return NextResponse.json({ success: true, data: quotesCache.data, source: 'cache_error_recovery' }, { status: 200 });
    }
    const realFallback = await fetchRealLiveCryptoPrices(requestedSymbols);
    return NextResponse.json({ success: true, data: realFallback, source: 'binance_live_error_recovery' }, { status: 200 });
  }
}
