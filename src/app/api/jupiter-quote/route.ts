import { NextResponse } from 'next/server';

/**
 * Server‑side proxy for the Jupiter Quote API.
 * It forwards the request with the same query parameters, avoiding CORS issues.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inputMint = searchParams.get('inputMint');
  const outputMint = searchParams.get('outputMint');
  const amount = searchParams.get('amount');
  const slippageBps = searchParams.get('slippageBps');

  if (!inputMint || !outputMint || !amount) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(
    inputMint
  )}&outputMint=${encodeURIComponent(outputMint)}&amount=${encodeURIComponent(
    amount
  )}${slippageBps ? `&slippageBps=${encodeURIComponent(slippageBps)}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Timeout'), 4000);
  try {
    const res = await fetch(jupiterUrl, { signal: controller.signal, cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Jupiter quote', details: (error as any).message }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const runtime = 'nodejs';
