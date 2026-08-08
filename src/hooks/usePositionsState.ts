"use client";

import { useMemo } from 'react';

export interface Position {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  sl?: number;
  tp?: number;
  timestamp: number;
  botId?: string;
  txHash?: string;
  entryRsi?: number;
  entryEmaTrend?: 'ABOVE' | 'BELOW';
  bondingCurveProgress?: number;
  replyCount?: number;
  highestPrice?: number;
  dcaCount?: number;
  mode?: 'DEMO' | 'REAL';
}

export interface ClosedPosition {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  amount: number;
  leverage: number;
  profit: number;
  timestamp: number;
  wasBot: boolean;
  buyTxHash?: string;
  sellTxHash?: string;
  mode?: 'DEMO' | 'REAL';
}

export function usePositionsState(
  activePositions: Position[],
  balance: number,
  livePrices: { [key: string]: number }
) {
  const equity = useMemo(() => {
    let totalPnl = 0;
    activePositions.forEach((pos) => {
      const currentPrice = livePrices[pos.pair] || pos.entryPrice;
      const priceDiff = pos.type === 'BUY' ? currentPrice - pos.entryPrice : pos.entryPrice - currentPrice;
      const pnl = (priceDiff / pos.entryPrice) * pos.amount * pos.leverage;
      totalPnl += pnl;
    });
    return Math.max(0, balance + totalPnl);
  }, [activePositions, balance, livePrices]);

  return {
    equity
  };
}
