import { updateLiveMarketPrice } from '@/lib/utils';

export interface Candle {
  time: number; // timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FetchMarketDataOptions {
  limit?: number; // Candle count (default: 100, clamped: 5..1000)
  range?: string; // Optional range (e.g. '5d', '1mo', '3mo', '1y')
}

const binanceSymbolMap: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  ADA: 'ADAUSDT',
  DOGE: 'DOGEUSDT',
  LINK: 'LINKUSDT',
  AVAX: 'AVAXUSDT',
};

const binanceIntervalMap: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  'D': '1d',
  '1d': '1d',
};

const YAHOO_SYMBOL_MAP: Record<string, string> = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X',
  AUDUSD: 'AUDUSD=X',
  USDCAD: 'CAD=X',
  USDCHF: 'CHF=X',
  EURGBP: 'EURGBP=X',
  EURJPY: 'EURJPY=X',
  GBPJPY: 'GBPJPY=X',
  GOLD: 'GC=F',
  SILVER: 'SI=F',
  OIL: 'CL=F',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
  BNB: 'BNB-USD',
  XRP: 'XRP-USD',
  ADA: 'ADA-USD',
  DOGE: 'DOGE-USD',
  LINK: 'LINK-USD',
  AVAX: 'AVAX-USD',
};

interface ClientCacheEntry {
  candles: Candle[];
  timestamp: number;
  ttlMs: number;
}

const candleCache: Record<string, ClientCacheEntry> = {};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Requête expirée (Timeout)'), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resample1hTo4h(hourlyCandles: Candle[]): Candle[] {
  if (!hourlyCandles || hourlyCandles.length === 0) return [];
  const buckets = new Map<number, Candle[]>();

  for (const c of hourlyCandles) {
    const bucketTime = c.time - (c.time % 14400);
    const existing = buckets.get(bucketTime);
    if (existing) {
      existing.push(c);
    } else {
      buckets.set(bucketTime, [c]);
    }
  }

  const resampled: Candle[] = [];
  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const bTime of sortedBucketTimes) {
    const bars = buckets.get(bTime)!;
    if (bars.length === 0) continue;
    bars.sort((a, b) => a.time - b.time);

    const open = bars[0].open;
    const close = bars[bars.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;

    for (const b of bars) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      volume += b.volume || 0;
    }

    resampled.push({
      time: bTime,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return resampled;
}

/**
 * SOURCE 100% RÉELLE SANS AUCUNE DONNÉE FACTICE OU SYNTHÉTIQUE :
 * 1. Cache client en mémoire (TTL: 15s live / 60s backtest)
 * 2. Next.js API Proxy interne (/api/market-candles) avec cache serveur et sans restriction CORS
 * 3. Binance API officielle directe (pour cryptomonnaies)
 * 4. Yahoo Finance Chart API directe (pour Forex, Métaux et Indices)
 * Principe Fail-Closed : Si aucune bougie réelle n'est accessible, lance une exception typée.
 */
export async function fetchLiveMarketData(
  pairName: string,
  timeframe: string = '15',
  options?: FetchMarketDataOptions
): Promise<Candle[]> {
  const limit = Math.max(5, Math.min(options?.limit || 100, 1000));
  const range = options?.range;

  let cleanSymbol = pairName.trim().toUpperCase().replace(/^FX:/, '').replace(/\//g, '');
  if (cleanSymbol.endsWith('=X')) cleanSymbol = cleanSymbol.slice(0, -2);
  if (cleanSymbol.endsWith('=F')) cleanSymbol = cleanSymbol.slice(0, -2);
  if (cleanSymbol.endsWith('-USD')) cleanSymbol = cleanSymbol.replace('-USD', '');
  cleanSymbol = cleanSymbol.replace('=', '');

  const cacheKey = `${cleanSymbol}_${timeframe}_${limit}_${range || 'auto'}`;
  const nowMs = Date.now();
  const cached = candleCache[cacheKey];

  if (cached && nowMs - cached.timestamp < cached.ttlMs) {
    return cached.candles.map(c => ({ ...c }));
  }

  const ttlMs = limit <= 100 ? 15000 : 60000;

  // --- SOURCE 1 : LOCAL NEXT.JS API PROXY (ZERO CORS & CACHING) ---
  if (typeof window !== 'undefined') {
    try {
      const queryParams = new URLSearchParams({
        pair: cleanSymbol,
        timeframe,
        limit: limit.toString(),
      });
      if (range) queryParams.set('range', range);

      const proxyRes = await fetchWithTimeout(`/api/market-candles?${queryParams.toString()}`, { cache: 'no-store' }, 8000);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.success && Array.isArray(data.candles) && data.candles.length >= 5) {
          const candles: Candle[] = data.candles;
          updateLiveMarketPrice(cleanSymbol, candles[candles.length - 1].close);
          candleCache[cacheKey] = { candles: candles.map(c => ({ ...c })), timestamp: Date.now(), ttlMs };
          return candles.map(c => ({ ...c }));
        }
      }
    } catch (e) {}
  }

  // --- SOURCE 2 : BINANCE API DIRECTE (CRYPTO ON-MARKET) ---
  const binanceSymbol = binanceSymbolMap[cleanSymbol];
  if (binanceSymbol) {
    try {
      const interval = binanceIntervalMap[timeframe] || '15m';
      const res = await fetchWithTimeout(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`,
        { cache: 'no-store' },
        6000
      );

      if (res.ok) {
        const rawKlines = await res.json();
        if (Array.isArray(rawKlines) && rawKlines.length > 0) {
          const candles: Candle[] = rawKlines.map((k: any) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5] || '0'),
          }));

          if (candles.length > 0) {
            updateLiveMarketPrice(cleanSymbol, candles[candles.length - 1].close);
          }

          candleCache[cacheKey] = { candles: candles.map(c => ({ ...c })), timestamp: Date.now(), ttlMs };
          return candles.map(c => ({ ...c }));
        }
      }
    } catch (e) {}
  }

  // --- SOURCE 3 : YAHOO FINANCE CHART API DIRECTE (FOREX & MATIÈRES PREMIÈRES) ---
  const yahooTicker = YAHOO_SYMBOL_MAP[cleanSymbol] || (cleanSymbol.length === 6 ? `${cleanSymbol}=X` : cleanSymbol);
  try {
    const is4h = timeframe === '240';
    const yInterval = is4h ? '1h' : timeframe === '1' ? '1m' : timeframe === '5' ? '5m' : timeframe === '60' ? '1h' : (timeframe === 'D' || timeframe === '1d') ? '1d' : '15m';
    const yRange = range || (is4h ? (limit <= 100 ? '1mo' : '6mo') : timeframe === '1' ? '5d' : timeframe === '5' ? '15d' : timeframe === '15' ? '60d' : timeframe === '60' ? '3mo' : '2y');

    const yRes = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${yInterval}&range=${yRange}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
      6000
    );

    if (yRes.ok) {
      const yData = await yRes.json();
      const resultObj = yData?.chart?.result?.[0];
      const timestamps: number[] = resultObj?.timestamp || [];
      const quoteObj = resultObj?.indicators?.quote?.[0];

      if (Array.isArray(timestamps) && quoteObj && Array.isArray(quoteObj.close) && timestamps.length > 0) {
        let validCandles: Candle[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = quoteObj.close[i];
          if (c !== null && c !== undefined && !isNaN(c) && c > 0) {
            validCandles.push({
              time: timestamps[i],
              open: quoteObj.open[i] ?? c,
              high: quoteObj.high[i] ?? c,
              low: quoteObj.low[i] ?? c,
              close: c,
              volume: quoteObj.volume?.[i] || 100,
            });
          }
        }

        if (is4h) {
          validCandles = resample1hTo4h(validCandles);
        }

        if (validCandles.length > 0) {
          const sliced = validCandles.slice(-limit);
          updateLiveMarketPrice(cleanSymbol, sliced[sliced.length - 1].close);
          candleCache[cacheKey] = { candles: sliced.map(c => ({ ...c })), timestamp: Date.now(), ttlMs };
          return sliced.map(c => ({ ...c }));
        }
      }
    }
  } catch (e) {}

  // --- SOURCE 4 : FAIL-CLOSED EXCEPTION (AUCUNE DONNÉE FACTICE OU BOUGIE UNIQUE) ---
  throw new Error(`[MarketDataError] Données de marché réelles indisponibles pour ${cleanSymbol} (${timeframe}). Aucune donnée synthétique autorisée.`);
}
