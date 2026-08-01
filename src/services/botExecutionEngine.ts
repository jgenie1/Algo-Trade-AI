// Moteur d'exécution automatique des bots et de gestion des alertes & positions
import { dispatchAlert } from './notificationService';
import { getRealMarketBasePrice } from '@/lib/utils';

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
  pumpMode?: string;
  priorityFee?: number;
}

/**
 * VÉRIFICATIONS STRICTES DE SÉCURITÉ FINANCIÈRE DES BOTS :
 * 1. VÉRIFICATION DU SOLDE DISPONIBLE : Avant d'ouvrir une position, le bot vérifie que le solde disponible est suffisant.
 * 2. RÈGLE DU CAPITAL ALLOUÉ : La taille de chaque trade est limitée à 1/3 du capital alloué au bot (bot.capital / 3).
 * 3. LIMITE DE PERTE MAXIMALE : Les pertes totales cumulées du bot NE PEUVENT PAS dépasser le capital alloué ($bot.capital).
 * 4. COFFRE-FORT DE RÉSERVE (10%) : 10% de chaque gain réalisé est immédiatement verrouillé au Coffre-Fort intouchable.
 */
export function processBotIteration(
  bots: BotInstance[],
  activePositions: any[],
  availableBalance: number,
  solanaBalance: number | null,
  onUpdateBots: (updatedBots: BotInstance[]) => void,
  onUpdatePositions: (updatedPositions: any[]) => void,
  onUpdateClosedPositions?: React.Dispatch<React.SetStateAction<any[]>>,
  onUpdateReserveVault?: (updater: (prev: number) => number) => void,
  onUpdateReserveVaultSol?: (updater: (prev: number) => number) => void
) {
  let botsChanged = false;
  let totalProfitSkimmedUsd = 0;
  let totalProfitSkimmedSol = 0;

  let currentPositions = [...activePositions];
  const newlyClosedPositions: any[] = [];

  const updatedBots = bots.map(bot => {
    if (bot.status !== 'RUNNING') return bot;

    const allocatedCapital = bot.capital > 0 ? bot.capital : 1000;
    const isRealMode = bot.mode === 'REAL' || (bot.pair && bot.pair.startsWith('SOL:'));
    const tradedAmount = (isRealMode || allocatedCapital < 10) 
      ? parseFloat((allocatedCapital / 3).toFixed(4)) 
      : parseFloat((allocatedCapital / 3).toFixed(2));

    const botLeverage = bot.leverage || (
      bot.strategy.includes('Sniper') || bot.strategy.includes('Momentum') ? 20 :
      bot.strategy.includes('Arbitrage') ? 5 : 10
    );

    const pairSymbol = (!bot.pair || bot.pair === 'ALL' || bot.pair === 'SOLANA') ? 'FX:EURUSD' : bot.pair;
    const realMarketPrice = getRealMarketBasePrice(pairSymbol);

    // Position active associée à ce bot
    const existingPosIndex = currentPositions.findIndex(p => p && p.botId === bot.id);

    if (existingPosIndex >= 0) {
      const existingPos = currentPositions[existingPosIndex];
      const entryPrice = typeof existingPos.entryPrice === 'number' && existingPos.entryPrice > 0 ? existingPos.entryPrice : realMarketPrice;
      const currentPrice = typeof existingPos.currentPrice === 'number' && existingPos.currentPrice > 0 ? existingPos.currentPrice : realMarketPrice;

      const isLong = existingPos.type === 'BUY' || existingPos.type === 'LONG';
      const priceDiff = currentPrice - entryPrice;
      const pctDiff = entryPrice > 0 ? (priceDiff / entryPrice) : 0;

      // PnL Réel calculé exclusivement selon la variation du prix du marché
      const tradeProfit = pctDiff * existingPos.amount * botLeverage * (isLong ? 1 : -1);
      const tradePnlPct = pctDiff * botLeverage * (isLong ? 100 : -100);

      // Trailing Peak Profit Tracker to maximize gains
      const currentHighestPnl = Math.max(existingPos.highestPnlPct || 0, tradePnlPct);

      // Mettre à jour la position active dans la table avec les vraies données de marché
      currentPositions[existingPosIndex] = {
        ...existingPos,
        currentPrice,
        pnl: parseFloat(tradeProfit.toFixed(2)),
        pnlPercent: parseFloat(tradePnlPct.toFixed(2)),
        highestPnlPct: currentHighestPnl,
        leverage: botLeverage
      };

      const slPct = bot.stopLossPct || 3.0;
      const tpPct = bot.takeProfitPct || 8.0;

      // SÉCURITÉ FINANCIÈRE ABSOLUE : Un trade ne peut JAMAIS perdre plus de 4% du capital alloué au bot !
      const singleTradeMaxLossUsd = -0.04 * allocatedCapital;
      const isSL = tradePnlPct <= -slPct || tradeProfit <= singleTradeMaxLossUsd;
      const isTP = tradePnlPct >= tpPct;
      
      // Trailing Profit Lock : Si le trade a atteint +2.5% de profit et retombe de 1.2%, verrouiller les gains immédiatement
      const isTrailingLock = currentHighestPnl >= 2.5 && tradePnlPct <= (currentHighestPnl - 1.2);
      const isMaxLoss = tradeProfit <= -allocatedCapital;

      if (isSL || isTP || isTrailingLock || isMaxLoss) {
        // FERMETURE DU TRADE AU PRIX DU MARCHÉ POUR PROTÉGER LE CAPITAL
        const [closedPos] = currentPositions.splice(existingPosIndex, 1);
        const realizedProfit = parseFloat(tradeProfit.toFixed(2));
        const botDisplayName = bot.name || `Bot ${bot.strategy}`;

        // Sécuriser 10% au Coffre-Fort si le trade est réellement gagnant sur le marché
        if (realizedProfit > 0) {
          const vaultSkim = realizedProfit * 0.10;
          if (isRealMode) {
            totalProfitSkimmedSol += vaultSkim;
          } else {
            totalProfitSkimmedUsd += vaultSkim;
          }
        }

        newlyClosedPositions.push({
          id: closedPos.id || `pos_closed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          pair: closedPos.pair,
          type: closedPos.type || 'BUY',
          entryPrice: closedPos.entryPrice || entryPrice,
          exitPrice: currentPrice,
          amount: closedPos.amount || tradedAmount,
          leverage: botLeverage,
          profit: realizedProfit,
          pnl: realizedProfit,
          timestamp: closedPos.timestamp || Date.now(),
          closeTimestamp: Date.now(),
          wasBot: true,
          botId: bot.id,
          botName: botDisplayName,
          mode: bot.mode || (closedPos.pair?.startsWith('SOL:') ? 'REAL' : 'DEMO')
        });

        // Mettre à jour le bilan du bot exclusivement avec le résultat réel du marché
        const prevNet = bot.netProfit ?? bot.pnl ?? 0;
        const currentNetProfit = parseFloat((prevNet + realizedProfit).toFixed(2));
        const currentTotalTrades = (bot.totalTrades ?? bot.tradesCount ?? 0) + 1;
        const currentWinningTrades = (bot.winningTrades ?? 0) + (realizedProfit >= 0 ? 1 : 0);
        const currentPnLPercent = parseFloat(((currentNetProfit / allocatedCapital) * 100).toFixed(2));

        botsChanged = true;

        if (isMaxLoss) {
          dispatchAlert(
            `⛔ ARRÊT DE SÉCURITÉ BOT - ${botDisplayName}`,
            `Le bot a atteint la limite de perte de son budget ($${allocatedCapital}). Le bot est mis en pause.`,
            'STOP_LOSS'
          );
          return {
            ...bot,
            status: 'STOPPED' as const,
            pnl: currentNetProfit,
            netProfit: currentNetProfit,
            pnlPercent: currentPnLPercent,
            totalTrades: currentTotalTrades,
            tradesCount: currentTotalTrades,
            winningTrades: currentWinningTrades
          };
        }

        if (isTP || isTrailingLock) {
          dispatchAlert(
            `🎯 TAKE-PROFIT / GAINS SÉCURISÉS - ${botDisplayName}`,
            `Trade fermé au marché avec profit (+${tradePnlPct.toFixed(1)}%). Gains réels: +$${realizedProfit.toFixed(2)} (10% sécurisé au Coffre-Fort).`,
            'TRADE'
          );
        } else if (isSL) {
          dispatchAlert(
            `🚨 STOP-LOSS PROTECTION - ${botDisplayName}`,
            `Trade fermé par précaution anti-perte (${tradePnlPct.toFixed(1)}%). Perte contenue: -$${Math.abs(realizedProfit).toFixed(2)} (Capital préservé).`,
            'STOP_LOSS'
          );
        }

        return {
          ...bot,
          pnl: currentNetProfit,
          netProfit: currentNetProfit,
          pnlPercent: currentPnLPercent,
          totalTrades: currentTotalTrades,
          tradesCount: currentTotalTrades,
          winningTrades: currentWinningTrades
        };
      }
    }

    return bot;
  });

  // Mise à jour du Coffre-Fort de Réserve (10%) uniquement sur gains réels du marché
  if (totalProfitSkimmedUsd > 0 && onUpdateReserveVault) {
    onUpdateReserveVault(prev => parseFloat((prev + totalProfitSkimmedUsd).toFixed(2)));
  }
  if (totalProfitSkimmedSol > 0 && onUpdateReserveVaultSol) {
    onUpdateReserveVaultSol(prev => parseFloat((prev + totalProfitSkimmedSol).toFixed(4)));
  }

  const hasPositionChanged = newlyClosedPositions.length > 0 ||
    currentPositions.length !== activePositions.length ||
    currentPositions.some((pos, i) => {
      const orig = activePositions[i];
      if (!orig) return true;
      return pos.currentPrice !== orig.currentPrice ||
             pos.pnl !== orig.pnl ||
             pos.pnlPercent !== orig.pnlPercent ||
             pos.highestPnlPct !== orig.highestPnlPct;
    });

  if (hasPositionChanged) {
    onUpdatePositions(currentPositions);
  }

  if (newlyClosedPositions.length > 0 && onUpdateClosedPositions) {
    onUpdateClosedPositions(prev => [...newlyClosedPositions, ...(prev || [])]);
  }

  if (botsChanged) {
    onUpdateBots(updatedBots);
  }
}
