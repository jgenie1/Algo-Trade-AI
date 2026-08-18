"use client";

import { useState, useEffect } from 'react';
import { getRealMarketBasePrice } from '@/lib/utils';
import { fetchLiveMarketData } from '@/services/yahooFinanceService';
import { fetchCoinMarketCapQuotes } from '@/services/coinmarketcapService';

export const currencyPairs = [
  { value: 'ALL', label: '🌐 Toutes les Paires (Scan Multi-Actifs Continu)', ticker: 'ALL' },
  { value: 'FX:EURUSD', label: 'EUR/USD', ticker: 'EURUSD=X' },
  { value: 'FX:GBPUSD', label: 'GBP/USD', ticker: 'GBPUSD=X' },
  { value: 'FX:USDJPY', label: 'USD/JPY', ticker: 'JPY=X' },
  { value: 'FX:AUDUSD', label: 'AUD/USD', ticker: 'AUDUSD=X' },
  { value: 'FX:USDCAD', label: 'USD/CAD', ticker: 'CAD=X' },
  { value: 'FX:USDCHF', label: 'USD/CHF', ticker: 'CHF=X' },
  { value: 'FX:EURGBP', label: 'EUR/GBP', ticker: 'EURGBP=X' },
  { value: 'FX:EURJPY', label: 'EUR/JPY', ticker: 'EURJPY=X' },
  { value: 'FX:GBPJPY', label: 'GBP/JPY', ticker: 'GBPJPY=X' },
  { value: 'BTC', label: 'BTC/USD', ticker: 'BTC-USD' },
  { value: 'ETH', label: 'ETH/USD', ticker: 'ETH-USD' },
  { value: 'SOL', label: 'SOL/USD', ticker: 'SOL-USD' },
  { value: 'BNB', label: 'BNB/USD', ticker: 'BNB-USD' },
  { value: 'XRP', label: 'XRP/USD', ticker: 'XRP-USD' },
  { value: 'ADA', label: 'ADA/USD', ticker: 'ADA-USD' },
  { value: 'DOGE', label: 'DOGE/USD', ticker: 'DOGE-USD' },
  { value: 'LINK', label: 'LINK/USD', ticker: 'LINK-USD' },
  { value: 'AVAX', label: 'AVAX/USD', ticker: 'AVAX-USD' },
  { value: 'GOLD', label: 'GOLD/USD', ticker: 'GC=F' },
  { value: 'SILVER', label: 'SILVER/USD', ticker: 'SI=F' },
  { value: 'OIL', label: 'OIL/USD', ticker: 'CL=F' },
];

export const timeframes = [
  { value: '1', label: '1 min (Scalping)' },
  { value: '5', label: '5 min (Intraday Momentum)' },
  { value: '15', label: '15 min (Intraday Standard)' },
  { value: '60', label: '1 heure (Swing Trading)' },
  { value: '240', label: '4 heures (Tendance Majeure)' },
];

export function useMarketPriceFeeds(isMounted: boolean, selectedPair: string) {
  const [livePrices, setLivePrices] = useState<{ [key: string]: number }>({});
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: 'up' | 'down' | 'flat' }>({});
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  // Initialize base prices
  useEffect(() => {
    if (!isMounted) return;
    const initial: { [key: string]: number } = {};
    currencyPairs.forEach(p => {
      if (p.value !== 'ALL') {
        initial[p.value] = getRealMarketBasePrice(p.value);
      }
    });
    setLivePrices(prev => ({ ...initial, ...prev }));
  }, [isMounted]);

  // 1. Live Binance WebSocket Ticker for Crypto
  useEffect(() => {
    if (!isMounted) return;

    let bws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    const connectBinanceWs = () => {
      try {
        const streams = [
          'btcusdt@miniTicker',
          'ethusdt@miniTicker',
          'solusdt@miniTicker',
          'bnbusdt@miniTicker',
          'xrpusdt@miniTicker',
          'adausdt@miniTicker',
          'dogeusdt@miniTicker',
          'linkusdt@miniTicker',
          'avaxusdt@miniTicker'
        ].join('/');

        bws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

        bws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw && raw.s && raw.c) {
              const pairSymbol = raw.s.toLowerCase();
              const BINANCE_MAP: Record<string, string> = {
                'btcusdt': 'BTC',
                'ethusdt': 'ETH',
                'solusdt': 'SOL',
                'bnbusdt': 'BNB',
                'xrpusdt': 'XRP',
                'adausdt': 'ADA',
                'dogeusdt': 'DOGE',
                'linkusdt': 'LINK',
                'avaxusdt': 'AVAX',
              };

              const pairKey = BINANCE_MAP[pairSymbol];
              if (pairKey) {
                const livePrice = parseFloat(raw.c);
                if (!isNaN(livePrice) && livePrice > 0) {
                  setLivePrices(prev => {
                    const oldPrice = prev[pairKey];
                    if (oldPrice === livePrice) return prev;
                    if (oldPrice) {
                      setPriceDirections(dirs => ({
                        ...dirs,
                        [pairKey]: livePrice > oldPrice ? 'up' : livePrice < oldPrice ? 'down' : 'flat'
                      }));
                    }
                    return { ...prev, [pairKey]: livePrice };
                  });
                }
              }
            }
          } catch {}
        };

        bws.onerror = () => {};
        bws.onclose = () => {
          reconnectTimer = setTimeout(connectBinanceWs, 3000);
        };
      } catch {}
    };

    connectBinanceWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (bws) {
        bws.onclose = null;
        bws.close();
      }
    };
  }, [isMounted]);

  // 2. CoinMarketCap PRO Quotes Polling
  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;
    const fetchCMC = async () => {
      try {
        const quotes = await fetchCoinMarketCapQuotes(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX']);
        if (!isSubscribed || !quotes) return;

        setLivePrices(prev => {
          const updated = { ...prev };
          let changed = false;
          Object.entries(quotes).forEach(([sym, data]) => {
            const price = data?.quote?.['USD']?.price;
            if (typeof price === 'number' && price > 0) {
              const old = prev[sym];
              if (old !== price) {
                updated[sym] = price;
                changed = true;
                if (old) {
                  setPriceDirections(dirs => ({
                    ...dirs,
                    [sym]: price > old ? 'up' : price < old ? 'down' : 'flat'
                  }));
                }
              }
            }
          });
          return changed ? updated : prev;
        });
      } catch {}
    };

    fetchCMC();
    const cmcInterval = setInterval(fetchCMC, 30000);

    return () => {
      isSubscribed = false;
      clearInterval(cmcInterval);
    };
  }, [isMounted]);

  // 3. Yahoo Finance Polling for Forex & Commodities
  useEffect(() => {
    if (!isMounted) return;

    let isSubscribed = true;
    const updateSelectedPairPrice = async () => {
      if (selectedPair === 'ALL') return;
      const pairConfig = currencyPairs.find(p => p.value === selectedPair);
      if (!pairConfig || !pairConfig.ticker) return;

      setIsLoadingPrice(true);
      try {
        const candles = await fetchLiveMarketData(pairConfig.ticker, '1m');
        if (isSubscribed && candles && candles.length > 0) {
          const latestClose = candles[candles.length - 1].close;
          if (latestClose && latestClose > 0) {
            setLivePrices(prev => {
              const old = prev[selectedPair];
              if (old && old !== latestClose) {
                setPriceDirections(dirs => ({
                  ...dirs,
                  [selectedPair]: latestClose > old ? 'up' : 'down'
                }));
              }
              return { ...prev, [selectedPair]: latestClose };
            });
          }
        }
      } catch {} finally {
        if (isSubscribed) setIsLoadingPrice(false);
      }
    };

    updateSelectedPairPrice();
    const interval = setInterval(updateSelectedPairPrice, 15000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isMounted, selectedPair]);

  return {
    livePrices,
    setLivePrices,
    priceDirections,
    isLoadingPrice
  };
}
