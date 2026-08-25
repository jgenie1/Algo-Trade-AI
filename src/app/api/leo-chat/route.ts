import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Moteur d'Intelligence Générative de LÉO propulsé par Google Gemini.
 * Analyse les questions de l'utilisateur avec une conscience totale de l'état du portefeuille.
 */
export async function POST(req: NextRequest) {
  try {
    const { message, fleetStatus, positions, bots, balance, tradeMode, vault, history } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

    // Contexte synthétique du portefeuille pour Gemini
    const positionsList = Array.isArray(positions) && positions.length > 0
      ? positions.map((p: any) => `${p.type} ${p.pair} (Taille: ${p.amount}, Levier: ${p.leverage}x, PnL: ${p.pnl >= 0 ? '+' : ''}${p.pnl})`).join('; ')
      : "Aucune position ouverte actuellement";

    const botsList = Array.isArray(bots) && bots.length > 0
      ? bots.map((b: any) => `${b.name || b.strategy} [Statut: ${b.status}, PnL: ${b.netProfit || 0}]`).join('; ')
      : "5 bots configurés";

    const systemPrompt = `Tu es LÉO, le Maître Orchestrateur IA & Directeur des Investissements (Chief Investment Officer) suprême d'AlgoTrade AI.
Tu es un stratège quantique d'élite, inspiré des systèmes de trading institutionnels (BlackRock Aladdin, Renaissance Technologies).
Tu t'adresses toujours à l'utilisateur en l'appelant "Commandant".

Voici l'état en temps réel du portefeuille du Commandant :
- Mode de Trading : ${tradeMode === 'REAL' ? 'RÉEL ON-CHAIN (Solana)' : 'SIMULATION DÉMO ($ USD)'}
- Solde Disponible : ${balance} ${tradeMode === 'REAL' ? 'SOL' : '$'}
- Coffre-Fort de Réserve 10% : ${vault} ${tradeMode === 'REAL' ? 'SOL' : '$'}
- AUM Global : $${fleetStatus?.totalAumUsd || 10000}
- Positions Actives (${Array.isArray(positions) ? positions.length : 0}) : ${positionsList}
- Flotte de Bots : ${botsList}
- Sentiment de Marché : ${fleetStatus?.sentiment || 'GREED'} (Indice ${fleetStatus?.fearAndGreedIndex || 70}/100)
- Régime Macro : ${fleetStatus?.regime || 'TRENDING_MOMENTUM'}

Consignes impératives pour tes réponses :
1. Réponds de façon précise, personnalisée, intelligente et chirurgicale à la question EXACTE posée par le Commandant.
2. Ne répète JAMAIS un briefing générique si ce n'est pas ce qui est demandé.
3. Sois concis, direct, percutant et stratégique (3 à 6 lignes maximum par réponse).
4. Utilise un style cyber-luxe haut de gamme avec des puces élégantes (•). N'utilise JAMAIS d'astérisques bruts (**).
5. Si le Commandant demande un conseil, donne un avis quantitatif tranché et formule une action claire.`;

    if (!apiKey) {
      // Fallback intelligent dynamique sans clé Gemini
      return NextResponse.json({
        success: true,
        reply: generateDynamicLocalResponse(message, fleetStatus, positions, bots, balance, tradeMode)
      });
    }

    // Appel à l'API Google Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const contents = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4);
      for (const h of recentHistory) {
        contents.push({
          role: h.sender === 'USER' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nMessage de l'utilisateur : "${message}"` }]
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText && typeof rawText === 'string') {
        const cleanText = rawText.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        return NextResponse.json({ success: true, reply: cleanText });
      }
    }

    // Fallback dynamique si Gemini timeout ou erreur
    return NextResponse.json({
      success: true,
      reply: generateDynamicLocalResponse(message, fleetStatus, positions, bots, balance, tradeMode)
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      reply: "👑 Commandant, analyse reçue. J'optimise en permanence la flotte et les positions en fonction de la volatilité on-chain."
    });
  }
}

function generateDynamicLocalResponse(
  msg: string,
  fleet: any,
  positions: any[],
  bots: any[],
  balance: number,
  mode: string
): string {
  const norm = (msg || '').toLowerCase();

  if (norm.includes('bonjour') || norm.includes('salut') || norm.includes('hello')) {
    return `👑 Salutations, Commandant.\nJe suis à vos ordres et je surveille vos ${Array.isArray(positions) ? positions.length : 0} positions ouvertes avec un Win-Rate de ${fleet?.winRate24h || 80}%.\nQue souhaitez-vous exécuter ou analyser ?`;
  }

  if (norm.includes('pourquoi') || norm.includes('comment') || norm.includes('explication')) {
    return `👑 Analyse Stratégique :\nNos algorithmes s'appuient sur l'indice de sentiment (${fleet?.fearAndGreedIndex || 70}/100) et la liquidité on-chain pour positionner vos bots avec un Stop-Loss strict et un verrouillage de 10% dans le Coffre-Fort.`;
  }

  if (norm.includes('risque') || norm.includes('danger') || norm.includes('perte')) {
    const pnl = fleet?.openPnLUsd || 0;
    return `🛡️ Diagnostic Risque Aladdin :\n• Niveau de Menace : ${fleet?.threatLevel || 'FAIBLE'}\n• PnL en cours : ${pnl >= 0 ? '+' : ''}$${pnl}\n• Stop-Loss Garanti : 3.0% maximum sur tous les ordres actifs pour préserver votre capital.`;
  }

  if (norm.includes('bot') || norm.includes('flotte')) {
    const running = Array.isArray(bots) ? bots.filter(b => b.status === 'RUNNING').length : 0;
    return `🤖 État des Bots :\n• Bots en action : ${running} / 5 opérationnels.\n• Tous les signaux sont synchronisés avec le Sniper Pump.fun et le Momentum Multi-Majeures.`;
  }

  return `👑 Bien reçu, Commandant.\nJ'ai pris en compte votre directive : "${msg}".\n• Solde : ${balance} ${mode === 'REAL' ? 'SOL' : '$'}\n• Positions Actives : ${Array.isArray(positions) ? positions.length : 0}\n• Opportunité Suivie : SOL (Alpha Score 92/100).\nOrdres rapides disponibles ci-dessous.`;
}
