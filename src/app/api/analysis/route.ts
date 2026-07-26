import { NextRequest, NextResponse } from 'next/server';
import { getForexAnalysis } from '@/ai/flows/get-forex-analysis-flow';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const result = await getForexAnalysis(input);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in forex analysis API route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run forex analysis" },
      { status: 500 }
    );
  }
}
