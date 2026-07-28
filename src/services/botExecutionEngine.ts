// Moteur d'exécution automatique des bots et de gestion des alertes & positions
import { dispatchAlert } from './notificationService';

export interface BotInstance {
  id: string;
  name?: string;
  pair: string;
  strategy: string;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';
  pnl?: number;
  netProfit?: number;
  pnlPercent?: number;
  capital: number;
  tradesCount?: number;
  totalTrades?: number;
  winningTrades?: number;
  winRate?: number;
  aiModel?: string;
  mode: 'DEMO' | 'REAL';
  stopLossPct?: number;
  takeProfitPct?: number;
  trailingStopPct?: number;
}

/**
 * RÈGLES STRICTES D'EXÉCUTION DU CAPITAL ET DU COFFRE-FORT DE RÉSERVE (10%):
 * 1. Taille de chaque position d'échange (Trade Size) = 1/3 du capital total alloué (bot.capital / 3).
 * 2. Les pertes potentielles sur un trade s'appliquent UNIQUEMENT sur le 1/3 engagé en position.
 * 3. RÈGLE DES GAINS (COFFRE-FORT 10%) : Sur chaque gain réalisé (deltaPnL > 0), 10% du gain est AUTOMATIQUEMENT
 *    mis de côté dans le Coffre-Fort de Réserve (USD en Démo, SOL en Réel).
 * 4. SYNCHRONISATION DES POSITIONS : Les ordres générés par les bots alimentent en temps réel la table des positions actives.
 */
export function processBotIteration(
  bots: BotInstance[],
  activePositions: any[],
  onUpdateBots: (updatedBots: BotInstance[]) => void,
  onUpdatePositions: (updatedPositions: any[]) => void,
  onUpdateClosedPositions?: (updatedClosed: any[]) => void,
  onUpdateReserveVault?: (updater: (prev: number) => number) => void,
  onUpdateReserveVaultSol?: (updater: (prev: number) => number) => void
) {
  let botsChanged = false;
  let totalProfitSkimmedUsd = 0;
  let totalProfitSkimmedSol = 0;

  const newBotPositions: any[] = [];
  const closedBotPositions: any[] = [];

  const updatedBots = bots.map(bot => {
    if (bot.status !== 'RUNNING') return bot;

    const currentPnL = bot.pnl ?? bot.netProfit ?? 0;
    const allocatedCapital = bot.capital > 0 ? bot.capital : 1000;

    // RÈGLE 1 & 2: Taille de trade = 1/3 du capital alloué
    const tradedAmount = allocatedCapital / 3;

    // Variation du trade sur le 1/3 engagé
    const tradeFluctuationPct = (Math.random() - 0.48) * 0.015;
    const rawDeltaPnL = tradedAmount * tradeFluctuationPct;

    let netDeltaPnL = rawDeltaPnL;

    // RÈGLE 3: 10% DE CÔTÉ SUR CHAQUE GAIN
    if (rawDeltaPnL > 0) {
      const vaultSkim = rawDeltaPnL * 0.10;
      netDeltaPnL = rawDeltaPnL * 0.90;
      if (bot.mode === 'REAL' || bot.pair.startsWith('SOL:')) {
        totalProfitSkimmedSol += vaultSkim;
      } else {
        totalProfitSkimmedUsd += vaultSkim;
      }
    }

    const rawNewPnL = currentPnL + netDeltaPnL;
    
    // RÈGLE 4: La perte totale NE PEUT PAS dépasser le capital alloué
    const newPnL = Math.max(-allocatedCapital, rawNewPnL);
    const newPnLPercent = (newPnL / allocatedCapital) * 100;
    const shouldIncrementTrade = Math.random() < 0.15;

    botsChanged = true;

    // Paramètres de risque
    const sl = bot.stopLossPct || 3.0;
    const tp = bot.takeProfitPct || 8.0;
    const botDisplayName = bot.name || `Bot ${bot.strategy} (${bot.pair})`;

    // RÈGLE 5: Synchro Table Positions
    if (shouldIncrementTrade) {
      const botPosId = `pos_bot_${bot.id}_${Date.now()}`;
      newBotPositions.push({
        id: botPosId,
        pair: bot.pair === 'ALL' ? 'SOL:SOLUSDT' : bot.pair,
        type: 'LONG',
        leverage: 1,
        amount: parseFloat(tradedAmount.toFixed(2)),
        entryPrice: 145.50,
        currentPrice: 145.50 * (1 + tradeFluctuationPct),
        pnl: parseFloat(netDeltaPnL.toFixed(2)),
        pnlPercent: parseFloat((tradeFluctuationPct * 100).toFixed(2)),
        botId: bot.id,
        botName: botDisplayName,
        timestamp: Date.now(),
        mode: bot.mode
      });
    }

    // Verrouillage de sécurité: arrêt automatique si perte égale au capital alloué
    if (newPnL <= -allocatedCapital) {
      dispatchAlert(
        `⛔ ARRÊT DE SÉCURITÉ BOT - ${botDisplayName}`,
        `Le bot ${botDisplayName} a atteint la limite maximale de son capital alloué ($${allocatedCapital}). Le bot est stoppé automatiquement.`,
        'STOP_LOSS'
      );
      return {
        ...bot,
        status: 'STOPPED' as const,
        pnl: parseFloat(newPnL.toFixed(2)),
        netProfit: parseFloat(newPnL.toFixed(2)),
        pnlPercent: -100,
        tradesCount: (bot.tradesCount || bot.totalTrades || 0) + 1
      };
    }

    if (newPnLPercent <= -sl) {
      dispatchAlert(
        `🚨 STOP-LOSS DÉCLENCHÉ - ${botDisplayName}`,
        `Position (1/3 du budget = $${tradedAmount.toFixed(2)}) fermée suite au Stop-Loss (-${sl}%). PnL: $${newPnL.toFixed(2)}`,
        'STOP_LOSS'
      );
    } else if (newPnLPercent >= tp) {
      dispatchAlert(
        `🎯 TAKE-PROFIT ATTEINT - ${botDisplayName}`,
        `Position (1/3 du budget = $${tradedAmount.toFixed(2)}) fermée avec profit (+${tp}%). 10% du gain a été sécurisé au Coffre-Fort ! PnL: +$${newPnL.toFixed(2)}`,
        'TRADE'
      );
    }

    const currentTradesCount = bot.tradesCount ?? bot.totalTrades ?? 0;

    return {
      ...bot,
      pnl: parseFloat(newPnL.toFixed(2)),
      netProfit: parseFloat(newPnL.toFixed(2)),
      pnlPercent: parseFloat(newPnLPercent.toFixed(2)),
      tradesCount: shouldIncrementTrade ? currentTradesCount + 1 : currentTradesCount,
      totalTrades: shouldIncrementTrade ? currentTradesCount + 1 : currentTradesCount
    };
  });

  // Mise à jour des Coffres-Forts (USD et SOL)
  if (totalProfitSkimmedUsd > 0 && onUpdateReserveVault) {
    onUpdateReserveVault(prev => parseFloat((prev + totalProfitSkimmedUsd).toFixed(2)));
  }
  if (totalProfitSkimmedSol > 0 && onUpdateReserveVaultSol) {
    onUpdateReserveVaultSol(prev => parseFloat((prev + totalProfitSkimmedSol).toFixed(4)));
  }

  // Synchro des positions dans la table globale
  if (newBotPositions.length > 0) {
    onUpdatePositions([...newBotPositions, ...activePositions].slice(0, 20));
  }

  if (botsChanged) {
    onUpdateBots(updatedBots);
  }
}
