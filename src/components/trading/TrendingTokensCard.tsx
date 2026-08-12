"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Flame } from 'lucide-react';
import { getBnbPrice } from '@/services/pancakeSwapService';
import { tokenList } from '@/config/tokens';
import { cn, getRealMarketBasePrice } from '@/lib/utils';

import { fetchCoinMarketCapQuotes } from '@/services/coinmarketcapService';

interface TokenDisplay {
  name: string;
  symbol: string;
  iconUrl: string;
  price: number;
  change24h: number;
}

export default function TrendingTokensCard() {
  const [tokens, setTokens] = useState<TokenDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPrices = async () => {
    setRefreshing(true);
    try {
      // Priorité 1: CoinMarketCap Pro API (Serveur Proxy Confidentiel)
      const cmcData = await fetchCoinMarketCapQuotes(['BTC', 'ETH', 'SOL', 'BNB', 'LINK']);
      if (cmcData) {
        const buildToken = (name: string, sym: string): TokenDisplay => {
          const q = cmcData[sym]?.quote?.USD;
          return {
            name,
            symbol: sym,
            iconUrl: tokenList.find(t => t.symbol === sym)?.iconUrl || '',
            price: q ? q.price : (getRealMarketBasePrice(sym) || 0),
            change24h: q ? q.percent_change_24h : 0
          };
        };

        const updatedTokens: TokenDisplay[] = [
          buildToken('Bitcoin', 'BTC'),
          buildToken('Ethereum', 'ETH'),
          buildToken('Solana', 'SOL'),
          buildToken('Binance Coin', 'BNB'),
          buildToken('Chainlink', 'LINK'),
        ];

        setTokens(updatedTokens);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Priorité 2: Binance 24h Ticker Fallback
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","BNBUSDT","LINKUSDT"]', {
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const findSymbol = (sym: string) => data.find((d: any) => d.symbol === sym);
          const btc = findSymbol('BTCUSDT');
          const eth = findSymbol('ETHUSDT');
          const bnb = findSymbol('BNBUSDT');
          const link = findSymbol('LINKUSDT');

          const updatedTokens: TokenDisplay[] = [
            {
              name: 'Bitcoin',
              symbol: 'BTC',
              iconUrl: tokenList.find(t => t.symbol === 'BTC')?.iconUrl || '',
              price: btc ? parseFloat(btc.lastPrice) : 65000.00,
              change24h: btc ? parseFloat(btc.priceChangePercent) : 0
            },
            {
              name: 'Ethereum',
              symbol: 'ETH',
              iconUrl: tokenList.find(t => t.symbol === 'ETH')?.iconUrl || '',
              price: eth ? parseFloat(eth.lastPrice) : 3400.00,
              change24h: eth ? parseFloat(eth.priceChangePercent) : 0
            },
            {
              name: 'Binance Coin',
              symbol: 'BNB',
              iconUrl: tokenList.find(t => t.symbol === 'BNB')?.iconUrl || '',
              price: bnb ? parseFloat(bnb.lastPrice) : 580.00,
              change24h: bnb ? parseFloat(bnb.priceChangePercent) : 0
            },
            {
              name: 'Chainlink',
              symbol: 'LINK',
              iconUrl: tokenList.find(t => t.symbol === 'LINK')?.iconUrl || '',
              price: link ? parseFloat(link.lastPrice) : 14.50,
              change24h: link ? parseFloat(link.priceChangePercent) : 0
            }
          ];

          setTokens(updatedTokens);
          return;
        }
      }
    } catch (e) {
      console.error("Error fetching Binance token prices:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="glass-panel border-white/5 shadow-xl h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="font-headline text-lg font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#c2ff0c] fill-[#c2ff0c]/20" />
            <span>Marché Crypto</span>
          </CardTitle>
          <CardDescription className="font-body text-white/50 text-xs">
            Flux de prix Binance & DEX en direct (24h)
          </CardDescription>
        </div>
        <button 
          onClick={fetchPrices} 
          disabled={refreshing}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors duration-200"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-3 pt-2">
        {loading ? (
          <div className="space-y-3 py-4">
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ) : (
          tokens.map((token) => {
            const isPositive = token.change24h >= 0;
            return (
              <div 
                key={token.symbol} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 bg-white/10 rounded-full flex items-center justify-center p-1 border border-white/10 overflow-hidden shrink-0">
                    <Image 
                      src={token.iconUrl} 
                      alt={token.name} 
                      width={24} 
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white leading-none">{token.name}</h4>
                    <span className="text-[10px] text-white/40 leading-none font-mono mt-1 block">{token.symbol}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-white leading-none">
                    ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className={cn(
                    "inline-flex items-center text-[10px] font-mono leading-none mt-1",
                    isPositive ? "text-green-400" : "text-red-400"
                  )}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    {isPositive ? "+" : ""}{token.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}