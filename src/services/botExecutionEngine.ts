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
  leverage?: number;
}

/**
 * RÈGLES STRICTES D'EXÉCUTION DU CAPITAL ET DU COFFRE-FORT DE RÉSERVE (10%):
 * 1. Taille de chaque position d'échange (Trade Size) = 1/3 du capital total alloué (bot.capital / 3).
 * 2. Le levier est déterminé selon la stratégie (5x Arbitrage, 10x Scalping/Grid, 20x Sniper/Momentum).
 * 3. Chaque bot maintient UNE SEULE position active à la fois dans la table des positions (mise à jour en temps réel).
 * 4. RÈGLE DES GAINS (COFFRE-FORT 10%) : Sur chaque gain réalisé (deltaPnL > 0), 10% du gain est mis de côté.
 */
export function processBotIteration(
  bots: BotInstance[],
  activePositions: any[],
  onUpdateBots: (updatedBots: BotInstance[]) => void,
  onUpdatePositions: (updatedPositions: any[]) => void,
  onUpdateClosedPositions?: React.Dispatch<React.SetStateAction<any[]>>,
  onUpdateReserveVault?: (updater: (prev: number) => number) => void,
  onUpdateReserveVaultSol?: (updater: (prev: number) => number) => void
) {
  let botsChanged = false;
  let totalProfitSkimmedUsd = 0;
  let totalProfitSkimmedSol = 0;

  // Copie de travail des positions actives
  let currentPositions = [...activePositions];
  const newlyClosedPositions: any[] = [];

  const updatedBots = bots.map(bot => {
    if (bot.status !== 'RUNNING') return bot;

    const currentPnL = bot.pnl ?? bot.netProfit ?? 0;
    const allocatedCapital = bot.capital > 0 ? bot.capital : 1000;

    // Levier adapté à la stratégie
    const botLeverage = bot.leverage || (
      bot.strategy.includes('Sniper') || bot.strategy.includes('Momentum') ? 20 :
      bot.strategy.includes('Arbitrage') ? 5 : 10
    );

    // RÈGLE 1: Taille de trade = 1/3 du capital alloué
    const tradedAmount = allocatedCapital / 3;

    // Fluctuation simulée sur la position engagée
    const tradeFluctuationPct = (Math.random() - 0.48) * 0.015;
    const rawDeltaPnL = tradedAmount * tradeFluctuationPct * (botLeverage / 10);

    let netDeltaPnL = rawDeltaPnL;

    // RÈGLE 4: 10% DE CÔTÉ SUR CHAQUE GAIN (COFFRE-FORT)
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
    const newPnL = Math.max(-allocatedCapital, rawNewPnL);
    const newPnLPercent = (newPnL / allocatedCapital) * 100;

    botsChanged = true;

    // Paramètres de risque
    const sl = bot.stopLossPct || 3.0;
    const tp = bot.takeProfitPct || 8.0;
    const botDisplayName = bot.name || `Bot ${bot.strategy} (${bot.pair})`;

    // Recherche de la position existante pour ce bot
    const existingPosIndex = currentPositions.findIndex(p => p.botId === bot.id);
    const pairSymbol = bot.pair === 'ALL' ? 'SOL:SOLUSDT' : bot.pair;
    const basePrice = 145.50;
    const currentPrice = basePrice * (1 + tradeFluctuationPct);

    if (existingPosIndex >= 0) {
      // Mettre à jour la position existante du bot
      currentPositions[existingPosIndex] = {
        ...currentPositions[existingPosIndex],
        currentPrice: parseFloat(currentPrice.toFixed(4)),
        pnl: parseFloat(newPnL.toFixed(2)),
        pnlPercent: parseFloat(newPnLPercent.toFixed(2)),
        leverage: botLeverage
      };
    } else {
      // Créer UNE SEULE position initiale pour ce bot avec ID unique
      const botPosId = `pos_bot_${bot.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      currentPositions.unshift({
        id: botPosId,
        pair: pairSymbol,
        type: 'LONG',
        leverage: botLeverage,
        amount: parseFloat(tradedAmount.toFixed(2)),
        entryPrice: basePrice,
        currentPrice: parseFloat(currentPrice.toFixed(4)),
        pnl: parseFloat(newPnL.toFixed(2)),
        pnlPercent: parseFloat(newPnLPercent.toFixed(2)),
        botId: bot.id,
        botName: botDisplayName,
        timestamp: Date.now(),
        mode: bot.mode
      });
    }

    const isStopped = newPnL <= -allocatedCapital;
    const isSL = newPnLPercent <= -sl;
    const isTP = newPnLPercent >= tp;

    // Fermeture de la position du bot si SL, TP ou Stop
    if (isStopped || isSL || isTP) {
      const closedPosIndex = currentPositions.findIndex(p => p.botId === bot.id);
      if (closedPosIndex >= 0) {
        const [closedPos] = currentPositions.splice(closedPosIndex, 1);
        newlyClosedPositions.push({
          ...closedPos,
          closeTimestamp: Date.now(),
          profit: closedPos.pnl
        });
      }
    }

    // Gestion des alertes
    if (isStopped) {
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

    if (isSL) {
      dispatchAlert(
        `🚨 STOP-LOSS DÉCLENCHÉ - ${botDisplayName}`,
        `Position (1/3 du budget = $${tradedAmount.toFixed(2)}, Levier ${botLeverage}x) fermée suite au Stop-Loss (-${sl}%). PnL: $${newPnL.toFixed(2)}`,
        'STOP_LOSS'
      );
    } else if (isTP) {
      dispatchAlert(
        `🎯 TAKE-PROFIT ATTEINT - ${botDisplayName}`,
        `Position (1/3 du budget = $${tradedAmount.toFixed(2)}, Levier ${botLeverage}x) fermée avec profit (+${tp}%). 10% du gain sécurisé au Coffre-Fort ! PnL: +$${newPnL.toFixed(2)}`,
        'TRADE'
      );
    }

    const currentTradesCount = bot.tradesCount ?? bot.totalTrades ?? 0;

    return {
      ...bot,
      leverage: botLeverage,
      pnl: parseFloat(newPnL.toFixed(2)),
      netProfit: parseFloat(newPnL.toFixed(2)),
      pnlPercent: parseFloat(newPnLPercent.toFixed(2)),
      tradesCount: currentTradesCount + 1,
      totalTrades: currentTradesCount + 1
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
  onUpdatePositions(currentPositions);

  if (newlyClosedPositions.length > 0 && onUpdateClosedPositions) {
    onUpdateClosedPositions(prev => [...newlyClosedPositions, ...(prev || [])]);
  }

  if (botsChanged) {
    onUpdateBots(updatedBots);
  }
}
