import { NextRequest, NextResponse } from 'next/server';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CachedCandles {
  candles: Candle[];
  source: 'binance' | 'yahoo';
  timestamp: number;
  expiresAt: number;
}

const serverCandleCache = new Map<string, CachedCandles>();
const inFlightServerRequests = new Map<string, Promise<Candle[] | null>>();

function pruneExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of serverCandleCache.entries()) {
    if (now > entry.expiresAt) {
      serverCandleCache.delete(key);
    }
  }
}

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

const BINANCE_SYMBOL_MAP: Record<string, string> = {
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

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '60': '1h',
  '240': '4h',
  'D': '1d',
  '1d': '1d',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function resample1hTo4h(hourlyCandles: Candle[]): Candle[] {
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

function resolveYahooRange(
  timeframe: string,
  limit: number,
  explicitRange?: string
): { interval: string; range: string; needs4hResample: boolean } {
  if (timeframe === '240') {
    let range = explicitRange;
    if (!range) {
      if (limit <= 100) range = '1mo';
      else if (limit <= 500) range = '6mo';
      else range = '1y';
    }
    return { interval: '1h', range, needs4hResample: true };
  }

  let interval = '15m';
  let defaultRange = '5d';

  if (timeframe === '1') {
    interval = '1m';
    defaultRange = limit <= 300 ? '1d' : limit <= 1000 ? '5d' : '7d';
  } else if (timeframe === '5') {
    interval = '5m';
    defaultRange = limit <= 200 ? '2d' : limit <= 600 ? '5d' : '15d';
  } else if (timeframe === '15') {
    interval = '15m';
    defaultRange = limit <= 100 ? '5d' : limit <= 500 ? '15d' : '60d';
  } else if (timeframe === '60') {
    interval = '1h';
    defaultRange = limit <= 100 ? '10d' : limit <= 500 ? '1mo' : limit <= 1000 ? '3mo' : '1y';
  } else if (timeframe === 'D' || timeframe === '1d') {
    interval = '1d';
    defaultRange = limit <= 100 ? '6mo' : limit <= 500 ? '2y' : '5y';
  }

  const range = explicitRange || defaultRange;
  return { interval, range, needs4hResample: false };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPair = searchParams.get('pair') || 'EURUSD';
  const timeframe = searchParams.get('timeframe') || '15';
  const explicitRange = searchParams.get('range') || undefined;
  const rawLimit = searchParams.get('limit');
  const limit = Math.max(5, Math.min(parseInt(rawLimit || '100', 10) || 100, 1000));

  let clean = rawPair.trim().toUpperCase().replace(/^FX:/, '').replace(/\//g, '');
  if (clean.endsWith('=X')) clean = clean.slice(0, -2);
  if (clean.endsWith('=F')) clean = clean.slice(0, -2);
  if (clean.endsWith('-USD')) clean = clean.replace('-USD', '');
  clean = clean.replace('=', '');

  const cacheKey = `${clean}_${timeframe}_${limit}_${explicitRange || 'auto'}`;
  const now = Date.now();

  // 1. Check in-memory server cache
  if (serverCandleCache.size > 300) {
    pruneExpiredCache();
  }
  const cached = serverCandleCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return NextResponse.json(
      {
        success: true,
        source: cached.source,
        pair: clean,
        timeframe,
        count: cached.candles.length,
        candles: cached.candles,
        isCached: true,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45' },
      }
    );
  }

  // 2. Tier 1: Try Binance REST for Crypto
  const binanceSymbol = BINANCE_SYMBOL_MAP[clean];
  if (binanceSymbol) {
    try {
      const bInterval = BINANCE_INTERVAL_MAP[timeframe] || '15m';
      const bRes = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${bInterval}&limit=${limit}`,
        { cache: 'no-store', signal: AbortSignal.timeout(5000) }
      );
      if (bRes.ok) {
        const raw = await bRes.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const candles: Candle[] = raw.map((k: any) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5] || '0'),
          }));

          const ttlMs = limit <= 100 ? 15_000 : 300_000;
          serverCandleCache.set(cacheKey, {
            candles,
            source: 'binance',
            timestamp: now,
            expiresAt: now + ttlMs,
          });

          return NextResponse.json({
            success: true,
            source: 'binance',
            pair: clean,
            timeframe,
            count: candles.length,
            candles,
          });
        }
      }
    } catch (e) {}
  }

  // 3. Tier 2: Try Yahoo Finance Chart API with Multi-Host and Candidate Symbols (Forex, Commodities, Metals, Crypto)
  const { interval: yInterval, range: yRange, needs4hResample } = resolveYahooRange(timeframe, limit, explicitRange);

  const candidateTickers: string[] = [];
  if (YAHOO_SYMBOL_MAP[clean]) {
    candidateTickers.push(YAHOO_SYMBOL_MAP[clean]);
  }
  if (clean.length === 6 && !candidateTickers.includes(`${clean}=X`)) {
    candidateTickers.push(`${clean}=X`);
  }
  if (!candidateTickers.includes(clean)) {
    candidateTickers.push(clean);
  }

  const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];

  for (const host of hosts) {
    for (const ticker of candidateTickers) {
      try {
        const yRes = await fetch(
          `${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${yInterval}&range=${yRange}`,
          {
            headers: {
              'User-Agent': getRandomUserAgent(),
              Accept: 'application/json',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(10000),
          }
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

            if (needs4hResample) {
              validCandles = resample1hTo4h(validCandles);
            }

            if (validCandles.length > 0) {
              const sliced = validCandles.slice(-limit);
              const ttlMs = limit <= 100 ? 20_000 : 300_000;
              serverCandleCache.set(cacheKey, {
                candles: sliced,
                source: 'yahoo',
                timestamp: now,
                expiresAt: now + ttlMs,
              });

              return NextResponse.json({
                success: true,
                source: 'yahoo',
                pair: clean,
                timeframe,
                count: sliced.length,
                candles: sliced,
              });
            }
          }
        }
      } catch (e) {
        // Try next candidate ticker or host
      }
    }
  }

  // 4. Tier 3: Fail-Closed (Zero Synthetic Data)
  return NextResponse.json(
    {
      success: false,
      error: `Données de marché historiques réelles indisponibles pour ${clean} (${timeframe})`,
      pair: clean,
      timeframe,
    },
    { status: 404 }
  );
}
