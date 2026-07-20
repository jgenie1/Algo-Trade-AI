import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');

    if (mint) {
      const url = `https://frontend-api-v3.pump.fun/coins/${mint}`;
      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json({ error: `Coin fetch failed: ${response.status}` }, { status: response.status });
      }
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const limit = searchParams.get('limit') || '12';
      const sort = searchParams.get('sort') || 'created_timestamp';
      const order = searchParams.get('order') || 'DESC';

      const url = `https://frontend-api-v3.pump.fun/coins?offset=0&limit=${limit}&sort=${sort}&order=${order}`;
      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json({ error: `Coins list fetch failed: ${response.status}` }, { status: response.status });
      }
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("Pump.fun proxy fetch error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
