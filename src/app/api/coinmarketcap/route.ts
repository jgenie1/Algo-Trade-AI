import { NextResponse } from 'next/server';

export const revalidate = 0; // Disable caching for live market data

/**
 * Server-side proxy for CoinMarketCap Pro API.
 * The API key (COINMARKETCAP_API_KEY) is kept 100% confidential on the server
 * (Hostinger / Node.js env) and is NEVER exposed to the client browser.
 */
export async function GET(request: Request) {
  const apiKey = process.env.COINMARKETCAP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'COINMARKETCAP_API_KEY non configurée dans l\'environnement Hostinger.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC,ETH,SOL,BNB';
  const convert = searchParams.get('convert') || 'USD';

  const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(
    symbol.toUpperCase()
  )}&convert=${encodeURIComponent(convert.toUpperCase())}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(cmcUrl, {
      headers: {
        'Accept': 'application/json',
        'X-CMC_PRO_API_KEY': apiKey,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: `Erreur CoinMarketCap API (${res.status})`, details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data }, { status: 200 });
  } catch (error: any) {
    clearTimeout(timeoutId);
    return NextResponse.json(
      { success: false, error: 'Impossible d\'atteindre les serveurs CoinMarketCap.', details: error?.message },
      { status: 502 }
    );
  }
}

export const runtime = 'nodejs';
