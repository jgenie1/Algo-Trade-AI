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

// Fallback base prices in case CMC is completely down or hard rate-limited
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 92450.0,
  ETH: 3420.0,
  SOL: 184.5,
  BNB: 655.0,
  XRP: 2.15,
  ADA: 0.85,
  DOGE: 0.38,
  LINK: 18.5,
  AVAX: 34.0,
};

function generateFallbackData(symbols: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  symbols.forEach(sym => {
    const s = sym.toUpperCase();
    const price = FALLBACK_PRICES[s] || 1.0;
    result[s] = {
      id: 1,
      name: s,
      symbol: s,
      slug: s.toLowerCase(),
      quote: {
        USD: {
          price,
          volume_24h: price * 150000,
          percent_change_24h: 1.25,
          percent_change_1h: 0.15,
          last_updated: new Date().toISOString()
        }
      }
    };
  });
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
    // If no API key configured, gracefully serve realistic market fallback without error
    const fallback = generateFallbackData(requestedSymbols);
    return NextResponse.json({ success: true, data: fallback, source: 'fallback_no_key' }, { status: 200 });
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

    // If CMC returned 429 Too Many Requests or 5xx, use cached data if available or fallback with 200 OK
    if (quotesCache && Object.keys(quotesCache.data).length > 0) {
      const filtered: Record<string, any> = {};
      requestedSymbols.forEach(sym => {
        if (quotesCache?.data[sym]) {
          filtered[sym] = quotesCache.data[sym];
        }
      });
      return NextResponse.json({ success: true, data: filtered, source: 'cache_stale' }, { status: 200 });
    }

    const fallback = generateFallbackData(requestedSymbols);
    return NextResponse.json({ success: true, data: fallback, source: 'fallback_rate_limited' }, { status: 200 });
  } catch (error: any) {
    if (quotesCache && Object.keys(quotesCache.data).length > 0) {
      return NextResponse.json({ success: true, data: quotesCache.data, source: 'cache_error_recovery' }, { status: 200 });
    }
    const fallback = generateFallbackData(requestedSymbols);
    return NextResponse.json({ success: true, data: fallback, source: 'fallback_network_error' }, { status: 200 });
  }
}
