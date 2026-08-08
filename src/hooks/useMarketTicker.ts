"use client";

import { useState, useEffect } from 'react';
import { getRealMarketBasePrice } from '@/lib/utils';
import { fetchLiveMarketData } from '@/services/yahooFinanceService';

export function useMarketTicker() {
  const [selectedPair, setSelectedPair] = useState<string>('FX:EURUSD');
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: 'up' | 'down' | 'flat' }>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  // Initialize prices with real market base prices
  useEffect(() => {
    const initialPrices: { [key: string]: number } = {
      'FX:EURUSD': getRealMarketBasePrice('FX:EURUSD'),
      'FX:GBPUSD': getRealMarketBasePrice('FX:GBPUSD'),
      'FX:USDJPY': getRealMarketBasePrice('FX:USDJPY'),
      'FX:AUDUSD': getRealMarketBasePrice('FX:AUDUSD'),
      'FX:USDCAD': getRealMarketBasePrice('FX:USDCAD'),
      'FX:USDCHF': getRealMarketBasePrice('FX:USDCHF'),
      'FX:EURGBP': getRealMarketBasePrice('FX:EURGBP'),
      'FX:EURJPY': getRealMarketBasePrice('FX:EURJPY'),
      'FX:GBPJPY': getRealMarketBasePrice('FX:GBPJPY'),
      'BTC': getRealMarketBasePrice('BTC'),
      'ETH': getRealMarketBasePrice('ETH'),
      'SOL': getRealMarketBasePrice('SOL'),
      'BNB': getRealMarketBasePrice('BNB'),
      'XRP': getRealMarketBasePrice('XRP'),
      'ADA': getRealMarketBasePrice('ADA'),
      'DOGE': getRealMarketBasePrice('DOGE'),
      'LINK': getRealMarketBasePrice('LINK'),
      'AVAX': getRealMarketBasePrice('AVAX'),
      'GOLD': getRealMarketBasePrice('GOLD'),
      'SILVER': getRealMarketBasePrice('SILVER'),
      'OIL': getRealMarketBasePrice('OIL'),
    };
    setLivePrices(initialPrices);
  }, []);

  // Price Simulation Tick Loop (Every 2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrices((prevPrices) => {
        const updated = { ...prevPrices };
        const updatedDirections: { [key: string]: 'up' | 'down' | 'flat' } = {};

        Object.keys(updated).forEach((pair) => {
          const currentPrice = updated[pair];
          if (!currentPrice || isNaN(currentPrice)) return;

          // Micro volatility simulation (between -0.15% and +0.15%)
          const changePercent = (Math.random() - 0.495) * 0.003;
          const newPrice = Math.max(0.000001, currentPrice * (1 + changePercent));
          
          updatedDirections[pair] = newPrice > currentPrice ? 'up' : newPrice < currentPrice ? 'down' : 'flat';
          updated[pair] = parseFloat(newPrice.toFixed(pair.includes('BTC') || pair.includes('GOLD') ? 2 : 4));
        });

        setPriceDirections(updatedDirections);
        return updated;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    selectedPair,
    setSelectedPair,
    livePrices,
    setLivePrices,
    priceDirections,
    isLoadingPrice,
    setIsLoadingPrice
  };
}
