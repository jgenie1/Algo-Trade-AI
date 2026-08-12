"use client";

import { useState, useEffect } from 'react';
import { fetchLiveMarketData } from '@/services/yahooFinanceService';
import { fetchCoinMarketCapQuotes } from '@/services/coinmarketcapService';

export function useMarketTicker() {
  const [selectedPair, setSelectedPair] = useState<string>('FX:EURUSD');
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: 'up' | 'down' | 'flat' }>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchAllLivePrices = async () => {
      const trackedPairs = [
        'FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:AUDUSD', 'FX:USDCAD',
        'FX:USDCHF', 'FX:EURGBP', 'FX:EURJPY', 'FX:GBPJPY',
        'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX',
        'GOLD', 'SILVER', 'OIL'
      ];

      const newPrices: { [key: string]: number } = {};

      // 1. Fetch Crypto prices in batch via CoinMarketCap Pro API
      try {
        const cmcData = await fetchCoinMarketCapQuotes(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX']);
        if (cmcData) {
          Object.keys(cmcData).forEach(sym => {
            const price = cmcData[sym]?.quote?.USD?.price;
            if (price && !isNaN(price) && price > 0) {
              newPrices[sym] = price;
              newPrices[`${sym}-USD`] = price;
            }
          });
        }
      } catch (e) {}

      // 2. Fetch Forex & Commodities live data
      await Promise.allSettled(
        trackedPairs.map(async (pair) => {
          if (newPrices[pair]) return; // Already loaded from CoinMarketCap
          try {
            const candles = await fetchLiveMarketData(pair, '15');
            if (candles && candles.length > 0) {
              const lastPrice = candles[candles.length - 1].close;
              if (lastPrice && !isNaN(lastPrice) && lastPrice > 0) {
                newPrices[pair] = lastPrice;
              }
            }
          } catch (e) {}
        })
      );

      if (!isMounted) return;

      const newDirections: { [key: string]: 'up' | 'down' | 'flat' } = {};
      setLivePrices(prev => {
        Object.keys(newPrices).forEach(pair => {
          const oldPrice = prev[pair];
          const newPrice = newPrices[pair];
          if (oldPrice && newPrice) {
            newDirections[pair] = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : 'flat';
          }
        });
        return { ...prev, ...newPrices };
      });

      setPriceDirections(prev => ({ ...prev, ...newDirections }));
      setIsLoadingPrice(false);
    };

    fetchAllLivePrices();
    const interval = setInterval(fetchAllLivePrices, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
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

