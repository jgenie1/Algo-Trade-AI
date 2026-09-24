import { NextRequest, NextResponse } from 'next/server';
import { getForexAnalysis } from '@/ai/flows/get-forex-analysis-flow';
import { GetForexAnalysisInputSchema } from '@/ai/schemas';
import { rateLimiter, getClientIp } from '@/lib/rateLimiter';

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rateLimitStatus = rateLimiter.check(clientIp, 15, 60000); // 15 req/min

  if (rateLimitStatus.limited) {
    return NextResponse.json(
      { error: "Trop de requêtes d'analyse IA. Veuillez patienter avant de relancer l'analyse." },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  try {
    const rawInput = await req.json();
    const parseResult = GetForexAnalysisInputSchema.safeParse(rawInput);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Format de données invalide pour l'analyse IA.", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await getForexAnalysis(parseResult.data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in forex analysis API route:", error?.message || error);
    return NextResponse.json(
      { error: "Échec de l'analyse IA. Veuillez réessayer ultérieurement." },
      { status: 500 }
    );
  }
}

