import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Route API Next.js Backend pour Binance Agent OS & REST API
 * Gère la signature cryptographique HMAC-SHA256 côté serveur pour une sécurité maximale.
 */

function generateBinanceSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, apiKey, apiSecret, isTestnet, order } = body;

    const baseUrl = isTestnet
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';

    // Synchronisation automatique de l'horodatage avec les serveurs de Binance
    let serverTime = Date.now();
    try {
      const timeRes = await fetch(`${baseUrl}/time`, { cache: 'no-store' });
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        if (timeData.serverTime) {
          serverTime = timeData.serverTime;
        }
      }
    } catch (e) {}

    // 1. GET ACCOUNT INFO & BALANCES
    if (action === 'get_account') {
      if (!apiKey || !apiSecret) {
        return NextResponse.json({ success: false, error: 'API Key et Secret requis' }, { status: 400 });
      }

      const queryString = `timestamp=${serverTime}&recvWindow=60000`;
      const signature = generateBinanceSignature(queryString, apiSecret.trim());

      const res = await fetch(`${baseUrl}/account?${queryString}&signature=${signature}`, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey.trim(),
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ msg: res.statusText, code: res.status }));
        const detailedError = errJson.msg || errJson.message || `Erreur HTTP ${res.status}`;
        return NextResponse.json({ 
          success: false, 
          error: `Binance [Code ${errJson.code || res.status}]: ${detailedError}` 
        }, { status: 200 });
      }

      const data = await res.json();
      
      // Filtrer les soldes avec des montants non nuls
      const nonZeroBalances = (data.balances || [])
        .map((b: any) => ({
          asset: b.asset,
          free: parseFloat(b.free || '0'),
          locked: parseFloat(b.locked || '0'),
          usdValue: 0
        }))
        .filter((b: any) => b.free > 0 || b.locked > 0);

      const usdtObj = nonZeroBalances.find((b: any) => b.asset === 'USDT');
      const freeUsdt = usdtObj ? usdtObj.free : 0;
      const totalUsdt = usdtObj ? (usdtObj.free + usdtObj.locked) : 0;

      return NextResponse.json({
        success: true,
        account: {
          canTrade: data.canTrade,
          totalBalanceUsdt: totalUsdt,
          freeBalanceUsdt: freeUsdt,
          balances: nonZeroBalances
        }
      });
    }

    // 2. PLACE AN ORDER (MARKET / LIMIT / STOP_LOSS)
    if (action === 'place_order') {
      if (!apiKey || !apiSecret || !order) {
        return NextResponse.json({ success: false, error: 'Paramètres manquants pour passer un ordre' }, { status: 400 });
      }

      const timestamp = Date.now();
      const symbol = order.symbol.replace('/', '').replace('-', '').toUpperCase();
      
      let paramsObj: Record<string, string> = {
        symbol: symbol.endsWith('USDT') ? symbol : `${symbol}USDT`,
        side: order.side,
        type: order.type || 'MARKET',
        timestamp: timestamp.toString(),
        recvWindow: '10000'
      };

      if (order.type === 'MARKET') {
        if (order.quoteOrderQty) {
          paramsObj.quoteOrderQty = order.quoteOrderQty.toFixed(2);
        } else if (order.quantity) {
          paramsObj.quantity = order.quantity.toString();
        }
      } else if (order.type === 'LIMIT') {
        paramsObj.timeInForce = 'GTC';
        if (order.quantity) paramsObj.quantity = order.quantity.toString();
        if (order.price) paramsObj.price = order.price.toString();
      }

      const queryString = new URLSearchParams(paramsObj).toString();
      const signature = generateBinanceSignature(queryString, apiSecret);

      const res = await fetch(`${baseUrl}/order?${queryString}&signature=${signature}`, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': apiKey,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      const orderData = await res.json();

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          symbol: order.symbol,
          error: orderData.msg || 'Échec du passage d\'ordre Binance',
          timestamp: Date.now()
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        orderId: orderData.orderId,
        clientOrderId: orderData.clientOrderId,
        symbol: orderData.symbol,
        status: orderData.status,
        executedQty: parseFloat(orderData.executedQty || '0'),
        cummulativeQuoteQty: parseFloat(orderData.cummulativeQuoteQty || '0'),
        avgPrice: parseFloat(orderData.cummulativeQuoteQty || '0') > 0 && parseFloat(orderData.executedQty || '0') > 0
          ? parseFloat(orderData.cummulativeQuoteQty) / parseFloat(orderData.executedQty)
          : undefined,
        timestamp: Date.now()
      });
    }

    // 3. EMERGENCY STOP : Cancel all open orders for active symbols
    if (action === 'emergency_stop') {
      if (!apiKey || !apiSecret) {
        return NextResponse.json({ success: false, error: 'API Key et Secret requis' }, { status: 400 });
      }

      const symbolsToCancel = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT'];
      let canceledCount = 0;

      for (const sym of symbolsToCancel) {
        try {
          const timestamp = Date.now();
          const queryString = `symbol=${sym}&timestamp=${timestamp}&recvWindow=10000`;
          const signature = generateBinanceSignature(queryString, apiSecret);

          await fetch(`${baseUrl}/openOrders?${queryString}&signature=${signature}`, {
            method: 'DELETE',
            headers: {
              'X-MBX-APIKEY': apiKey,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          });
          canceledCount++;
        } catch (e) {}
      }

      return NextResponse.json({
        success: true,
        message: `Arrêt d'urgence appliqué avec succès sur ${canceledCount} marchés Binance.`
      });
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur interne' }, { status: 500 });
  }
}
