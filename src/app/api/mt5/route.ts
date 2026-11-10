import { NextRequest, NextResponse } from 'next/server';
import { getMT5Bridge } from '@/services/mt5Service';

export async function GET() {
  try {
    const bridge = getMT5Bridge();
    const [account, positions] = await Promise.all([
      bridge.getAccountInfo(),
      bridge.getOpenPositions(),
    ]);
    return NextResponse.json({
      success: true,
      account,
      positions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch MT5 status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const bridge = getMT5Bridge();
    const action = body.action || (body.symbol ? 'order' : 'status');

    if (action === 'order') {
      const { symbol, type, lots, price, stopLoss, takeProfit, comment } = body;
      if (!symbol || !type || typeof lots !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Missing required order fields: symbol, type, lots' },
          { status: 400 }
        );
      }
      const result = await bridge.placeOrder({
        symbol,
        type,
        lots,
        price,
        stopLoss,
        takeProfit,
        comment,
      });
      return NextResponse.json(result);
    }

    if (action === 'close') {
      const ticket = Number(body.ticket);
      if (!ticket || ticket <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid ticket number required' },
          { status: 400 }
        );
      }
      const closed = await bridge.closePosition(ticket);
      return NextResponse.json({ success: closed, ticket });
    }

    if (action === 'modify') {
      const ticket = Number(body.ticket);
      const stopLoss = Number(body.stopLoss);
      const takeProfit = Number(body.takeProfit);
      if (!ticket || isNaN(stopLoss) || isNaN(takeProfit)) {
        return NextResponse.json(
          { success: false, error: 'ticket, stopLoss, and takeProfit required' },
          { status: 400 }
        );
      }
      const modified = await bridge.modifyOrder(ticket, stopLoss, takeProfit);
      return NextResponse.json({ success: modified, ticket });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'MT5 operation error' },
      { status: 500 }
    );
  }
}
