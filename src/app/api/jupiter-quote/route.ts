import { NextResponse } from 'next/server';

/**
 * Server-side proxy for the Jupiter Quote API.
 * When Jupiter is unreachable (e.g. server-side network restrictions), returns
 * a graceful fallback estimate so the client doesn't log 502 errors.
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
  const timeoutId = setTimeout(() => controller.abort('Timeout'), 5000);
  try {
    const res = await fetch(jupiterUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // Jupiter returned an error — fall back gracefully
      return NextResponse.json(buildFallback(inputMint, outputMint, amount), { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    clearTimeout(timeoutId);
    // Network error (DNS, timeout, etc.) — return a 200 fallback so the client
    // doesn't log 502 errors; it will use the simulated price instead.
    return NextResponse.json(buildFallback(inputMint, outputMint, amount), { status: 200 });
  }
}

/**
 * Build a lightweight fallback quote when Jupiter is unreachable.
 * Uses approximate SOL/USDC rate; the client has its own getRealMarketBasePrice fallback
 * and will override this with a live price when possible.
 */
function buildFallback(inputMint: string, outputMint: string, rawAmount: string) {
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const amountLamports = parseInt(rawAmount, 10) || 0;

  // Approximate conversion: 1 SOL ≈ 145 USDC  (server-side, no live price)
  const SOL_USDC_RATE = 145;
  let outAmount = '0';

  if (inputMint === SOL_MINT) {
    // SOL → USDC: lamports (1e9) → micro-USDC (1e6)
    const solAmount = amountLamports / 1e9;
    const usdcMicro = Math.floor(solAmount * SOL_USDC_RATE * 1e6);
    outAmount = usdcMicro.toString();
  } else if (outputMint === SOL_MINT) {
    // USDC → SOL
    const usdcAmount = amountLamports / 1e6;
    const solLamports = Math.floor((usdcAmount / SOL_USDC_RATE) * 1e9);
    outAmount = solLamports.toString();
  } else {
    outAmount = rawAmount; // 1:1 passthrough for unknown pairs
  }

  return {
    inputMint,
    outputMint,
    inAmount: rawAmount,
    outAmount,
    otherAmountThreshold: outAmount,
    swapMode: 'ExactIn',
    slippageBps: 50,
    priceImpactPct: '0.01',
    routePlan: [{ swapInfo: { label: 'Jupiter Estimate (offline)' } }],
    _fallback: true, // so client can detect this is estimated
  };
}

export const runtime = 'nodejs';
