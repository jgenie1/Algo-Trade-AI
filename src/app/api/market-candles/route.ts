import { NextRequest, NextResponse } from 'next/server';

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
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pair = searchParams.get('pair') || 'EURUSD';
  const timeframe = searchParams.get('timeframe') || '15';

  const clean = pair.replace('FX:', '').replace('-USD', '').replace('=', '').toUpperCase();

  // 1. Try Binance for Crypto first (real on-market klines)
  const binanceSymbol = BINANCE_SYMBOL_MAP[clean];
  if (binanceSymbol) {
    try {
      const interval = BINANCE_INTERVAL_MAP[timeframe] || '15m';
      const bRes = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=60`,
        { cache: 'no-store' }
      );
      if (bRes.ok) {
        const raw = await bRes.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const candles = raw.map((k: any) => ({
            time: Math.floor(k[0] / 1000),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5] || '0'),
          }));
          return NextResponse.json({ success: true, source: 'binance', candles });
        }
      }
    } catch (e) {}
  }

  // 2. Fetch from Yahoo Finance Server-Side (No CORS restrictions)
  const yahooTicker = YAHOO_SYMBOL_MAP[clean] || (clean.length === 6 ? `${clean}=X` : clean);
  try {
    const yInterval = timeframe === '1' ? '1m' : timeframe === '5' ? '5m' : timeframe === '60' ? '1h' : '15m';
    const yRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${yInterval}&range=3d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      }
    );

    if (yRes.ok) {
      const yData = await yRes.json();
      const resultObj = yData?.chart?.result?.[0];
      const timestamps: number[] = resultObj?.timestamp || [];
      const quoteObj = resultObj?.indicators?.quote?.[0];

      if (Array.isArray(timestamps) && quoteObj && Array.isArray(quoteObj.close) && timestamps.length > 0) {
        const candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = quoteObj.close[i];
          if (c !== null && c !== undefined && !isNaN(c) && c > 0) {
            candles.push({
              time: timestamps[i],
              open: quoteObj.open[i] ?? c,
              high: quoteObj.high[i] ?? c,
              low: quoteObj.low[i] ?? c,
              close: c,
              volume: quoteObj.volume?.[i] || 100,
            });
          }
        }
        if (candles.length > 0) {
          return NextResponse.json({ success: true, source: 'yahoo', candles: candles.slice(-60) });
        }
      }
    }
  } catch (e) {}

  return NextResponse.json({ success: false, error: 'Could not fetch live market candles' }, { status: 404 });
}
