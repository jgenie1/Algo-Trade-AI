"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, RefreshCw, Flame } from 'lucide-react';
import { getBnbPrice } from '@/services/pancakeSwapService';
import { tokenList } from '@/config/tokens';
import { cn } from '@/lib/utils';

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
      // 1. Fetch real BNB price from PancakeSwap BSC Contract
      let bnbPriceNum = 582.45; // baseline fallback
      try {
        const bnbPriceStr = await getBnbPrice();
        if (bnbPriceStr) {
          bnbPriceNum = parseFloat(bnbPriceStr);
        }
      } catch (err) {
        console.error("Could not fetch BNB price from BSC contract, using fallback", err);
      }

      // 2. Setup token list with dynamically simulated prices
      const btcPrice = 98000 + (Math.random() - 0.5) * 120;
      const ethPrice = 3250 + (Math.random() - 0.5) * 8;
      const linkPrice = 18.4 + (Math.random() - 0.5) * 0.1;

      const updatedTokens: TokenDisplay[] = [
        {
          name: 'Bitcoin',
          symbol: 'BTC',
          iconUrl: tokenList.find(t => t.symbol === 'BTC')?.iconUrl || '',
          price: btcPrice,
          change24h: 2.45 + (Math.random() - 0.5) * 0.2
        },
        {
          name: 'Ethereum',
          symbol: 'ETH',
          iconUrl: tokenList.find(t => t.symbol === 'ETH')?.iconUrl || '',
          price: ethPrice,
          change24h: -1.12 + (Math.random() - 0.5) * 0.15
        },
        {
          name: 'Binance Coin',
          symbol: 'BNB',
          iconUrl: tokenList.find(t => t.symbol === 'BNB')?.iconUrl || '',
          price: bnbPriceNum,
          change24h: 4.88 + (Math.random() - 0.5) * 0.3
        },
        {
          name: 'Chainlink',
          symbol: 'LINK',
          iconUrl: tokenList.find(t => t.symbol === 'LINK')?.iconUrl || '',
          price: linkPrice,
          change24h: -0.75 + (Math.random() - 0.5) * 0.4
        }
      ];

      setTokens(updatedTokens);
    } catch (e) {
      console.error("Error fetching token prices:", e);
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
            Prix PancakeSwap & flux simulés
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