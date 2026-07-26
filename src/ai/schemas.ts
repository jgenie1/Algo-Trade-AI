
/**
 * @fileOverview This file contains all Zod schemas and TypeScript types for AI flows.
 * By centralizing them here, we can avoid "use server" conflicts in Next.js.
 */
import { z } from 'genkit';

// Schemas for get-forex-analysis-flow
export const GetForexAnalysisInputSchema = z.object({
  pair: z.string().describe('La paire de devises à analyser (ex: "EUR/USD").'),
  timeframe: z.string().describe('Le timeframe pour l\'analyse (ex: "15 Minutes", "4 Heures").'),
  chartScreenshot: z.string().describe("Une capture d'écran du graphique de marché sous forme de Data URI."),
  indicators: z.array(z.string()).optional().describe("Les indicateurs techniques actifs sur le graphique."),
});
export type GetForexAnalysisInput = z.infer<typeof GetForexAnalysisInputSchema>;

export const GetForexAnalysisOutputSchema = z.object({
  trend: z.enum(['HAUSSIÈRE', 'BAISSIÈRE', 'NEUTRE']).describe('La tendance générale identifiée par l\'IA.'),
  signal: z.enum(['ACHAT', 'VENTE', 'NEUTRE']).describe('Le signal de trading recommandé par l\'IA.'),
  justification: z.string().describe('L\'explication technique de l\'IA pour le signal fourni.'),
});
export type GetForexAnalysisOutput = z.infer<typeof GetForexAnalysisOutputSchema>;
