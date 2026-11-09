/**
 * @fileOverview Un flux IA qui analyse le marché Forex et fournit des signaux de trading.
 */

import { ai } from '@/ai/genkit';
import { GetForexAnalysisInputSchema, GetForexAnalysisOutputSchema, type GetForexAnalysisInput, type GetForexAnalysisOutput } from '@/ai/schemas';
import { calculateIndicators } from '@/services/technicalAnalysisService';
import { fetchLiveMarketData } from '@/services/yahooFinanceService';

// Le prompt pour l'analyse
const analysisPrompt = ai.definePrompt(
  {
    name: 'forexAnalysisPrompt',
    input: { schema: GetForexAnalysisInputSchema },
    output: { schema: GetForexAnalysisOutputSchema },
    prompt: `Agis en tant qu'analyste de marché Forex expert. Analyse l'image du graphique de marché suivante pour la paire {{pair}} sur un timeframe de {{timeframe}}.
{{#if indicators}}Les indicateurs techniques actifs affichés sur le graphique sont : {{indicators}}.{{else}}Le graphique contient des indicateurs techniques par défaut.{{/if}}
L'image contient le graphique des prix avec les indicateurs techniques actifs correspondants.

{{media url=chartScreenshot}}

Ton analyse doit être très poussée et basée sur ce que tu vois dans l'image.
1.  **Analyse de la tendance** : Identifie la tendance générale (HAUSSIÈRE, BAISSIÈRE, NEUTRE) en te basant sur la structure du marché (sommets et creux) et la position des prix par rapport aux moyennes mobiles visibles.
2.  **Analyse des bougies** : Repère les figures de bougies pertinentes (avalement, doji, marteau, etc.) qui indiquent une continuation ou un retournement.
3.  **Analyse des Indicateurs** : Interprète spécifiquement les signaux des indicateurs techniques actifs mentionnés (ex: RSI pour surachat/survente/divergence, moyennes mobiles pour croisements/supports, etc.).
4.  **Signal de trading** : Sur la base de ton analyse visuelle complète, fournis une recommandation claire et unique : 'ACHAT' (pour une position longue), 'VENTE' (pour une position courte), ou 'NEUTRE' (s'il n'y a pas d'opportunité claire).
5.  **Justification** : Fournis une explication technique concise (2-3 phrases) pour justifier ton signal, en mentionnant les éléments clés de ton analyse visuelle (ex: "Tendance haussière confirmée par un avalement haussier au-dessus de la moyenne mobile, avec un RSI sortant de la zone de survente.").

Ne fournis que le résultat structuré attendu.`,
  },
);

/**
 * Moteur d'analyse technique déterministe autonome.
 * Évalue les indicateurs algorithmiques (EMA, RSI, MACD, Bollinger Bands) sur des bougies de marché authentiques.
 * Calcul purement déterministe basé exclusivement sur les cotations réelles.
 */
export async function executeDeterministicAnalysis(input: GetForexAnalysisInput): Promise<GetForexAnalysisOutput> {
  try {
    // Normaliser le timeframe ("15 Minutes", "1h", "4 Heures" -> "1", "5", "15", "60", "240")
    let tf = '15';
    const tfLower = (input.timeframe || '').toLowerCase();
    if (tfLower.includes('1m') || tfLower.includes('1 min')) tf = '1';
    else if (tfLower.includes('5m') || tfLower.includes('5 min')) tf = '5';
    else if (tfLower.includes('60') || tfLower.includes('1h') || tfLower.includes('1 heure') || tfLower.includes('heure')) tf = '60';
    else if (tfLower.includes('240') || tfLower.includes('4h') || tfLower.includes('4 heures')) tf = '240';

    // Récupération des bougies réelles de marché
    const candles = await fetchLiveMarketData(input.pair, tf);
    if (Array.isArray(candles) && candles.length >= 15) {
      const indicators = calculateIndicators(candles, ['EMA', 'SMA', 'RSI', 'MACD', 'Bollinger Bands']);
      const lastCandle = candles[candles.length - 1];
      const lastClose = lastCandle.close;

      const rsiVal = indicators.rsi ? indicators.rsi[indicators.rsi.length - 1] : 50;
      const emaVal = indicators.ema ? indicators.ema[indicators.ema.length - 1] : lastClose;
      const macdHist = indicators.macd?.histogram ? indicators.macd.histogram[indicators.macd.histogram.length - 1] : 0;
      const bbLower = indicators.bollingerBands?.lower ? indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1] : lastClose * 0.98;
      const bbUpper = indicators.bollingerBands?.upper ? indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1] : lastClose * 1.02;

      // Détermination déterministe de la tendance
      const trend: 'HAUSSIÈRE' | 'BAISSIÈRE' | 'NEUTRE' =
        lastClose > emaVal ? 'HAUSSIÈRE' : lastClose < emaVal ? 'BAISSIÈRE' : 'NEUTRE';

      // Détermination déterministe du signal
      let signal: 'ACHAT' | 'VENTE' | 'NEUTRE' = 'NEUTRE';
      if (rsiVal < 35 && lastClose <= bbLower * 1.002) {
        signal = 'ACHAT';
      } else if (rsiVal > 65 && lastClose >= bbUpper * 0.998) {
        signal = 'VENTE';
      } else if (trend === 'HAUSSIÈRE' && macdHist > 0 && rsiVal >= 50 && rsiVal <= 65) {
        signal = 'ACHAT';
      } else if (trend === 'BAISSIÈRE' && macdHist < 0 && rsiVal <= 50 && rsiVal >= 35) {
        signal = 'VENTE';
      }

      const rsiComment = `RSI(14) à ${rsiVal.toFixed(1)} (${rsiVal < 35 ? 'survente' : rsiVal > 65 ? 'surachat' : 'neutre'})`;
      const emaComment = `cours (${lastClose.toFixed(4)}) ${lastClose >= emaVal ? 'au-dessus' : 'sous'} EMA 20 (${emaVal.toFixed(4)})`;
      const macdComment = macdHist !== 0 ? `, MACD histogramme ${macdHist > 0 ? 'positif' : 'négatif'} (${macdHist.toFixed(4)})` : '';

      const justification = `Analyse algorithmique déterministe (Fallback IA) basée sur les données de marché réelles de ${input.pair} (${input.timeframe}). Structure de marché ${trend.toLowerCase()} : ${emaComment}, ${rsiComment}${macdComment}. Recommandation algorithmique : ${signal}.`;

      return {
        trend,
        signal,
        justification
      };
    }
  } catch (calcError: any) {
    console.warn("Échec du calcul technique déterministe de secours:", calcError?.message || calcError);
  }

  // Protection fail-closed si aucune bougie réelle n'est disponible
  return {
    trend: 'NEUTRE',
    signal: 'NEUTRE',
    justification: `Données de marché réelles indisponibles pour ${input.pair}. Impossible de formuler une analyse technique sans flux de cotation vérifié.`
  };
}

// Le flux principal qui exécute l'analyse
const getForexAnalysisFlow = ai.defineFlow(
  {
    name: 'getForexAnalysisFlow',
    inputSchema: GetForexAnalysisInputSchema,
    outputSchema: GetForexAnalysisOutputSchema,
  },
  async (input): Promise<GetForexAnalysisOutput> => {
    try {
      const { output } = await analysisPrompt(input);
      if (!output) {
        throw new Error("L'analyse IA n'a pas pu générer de résultat.");
      }
      return output;
    } catch (e: any) {
      console.warn("L'appel à l'API Gemini a échoué (limite de quota ou clé absente), bascule sur analyse technique déterministe. Erreur:", e.message);
      return executeDeterministicAnalysis(input);
    }
  }
);

/**
 * Fonction wrapper exportée pour être utilisée par les composants serveur Next.js.
 * Enveloppe l'appel Genkit d'un try/catch pour intercepter toute exception d'initialisation
 * (ex: FAILED_PRECONDITION en l'absence de clé API GEMINI_API_KEY) et basculer gracieusement
 * sur l'analyse technique déterministe.
 */
export async function getForexAnalysis(input: GetForexAnalysisInput): Promise<GetForexAnalysisOutput> {
  try {
    return await getForexAnalysisFlow(input);
  } catch (err: any) {
    console.warn("Délégation Genkit échouée (clé API absente ou erreur d'initialisation), exécution du fallback technique déterministe:", err?.message || err);
    return executeDeterministicAnalysis(input);
  }
}
