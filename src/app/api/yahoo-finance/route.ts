import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || 'EURUSD=X';
    const interval = searchParams.get('interval') || '15m';
    const range = searchParams.get('range') || '1d';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
    const response = await fetch(url, {
      next: { revalidate: 60 } // Cache server-side for 60 seconds
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Yahoo Finance API returned ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Yahoo Finance server-side fetch error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
