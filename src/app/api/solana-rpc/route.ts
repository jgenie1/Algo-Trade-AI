import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

const RPC_FALLBACKS = [
  process.env.SOLANA_RPC_URL,
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana'
].filter(Boolean) as string[];

/**
 * Server-side proxy for Solana JSON-RPC requests.
 * Completely eliminates browser CORS and HTTP 403 Forbidden errors by
 * proxying RPC calls from the Next.js server to the Solana network.
 */
export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimitStatus = rateLimiter.check(clientIp, 60, 60000); // 60 RPC calls/min

  if (rateLimitStatus.limited) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32005, message: 'Too many RPC requests. Rate limit exceeded.' }, id: 1 },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  try {
    const body = await req.json();

    if (!body || typeof body !== 'object' || !body.method || typeof body.method !== 'string') {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid JSON-RPC Request structure' }, id: body?.id || 1 },
        { status: 400 }
      );
    }

    for (const rpcUrl of RPC_FALLBACKS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AlgoTradeAI-Server/1.0',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          return NextResponse.json(json, { status: 200 });
        }
      } catch (rpcErr) {
        // Try next fallback endpoint
      }
    }

    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'All Solana RPC fallbacks failed' }, id: body?.id || 1 },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: error?.message || 'Parse error' }, id: 1 },
      { status: 400 }
    );
  }
}
