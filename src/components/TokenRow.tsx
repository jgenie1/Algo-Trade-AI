
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  iconUrl: string;
  price: number;
  change24h: number;
}

interface TokenRowProps {
  token: TokenData;
}

export default function TokenRow({ token }: TokenRowProps) {
  const isPositiveChange = token.change24h >= 0;

  return (
    <Card className="flex flex-col items-center justify-between p-4 transition-colors hover:bg-muted/50 rounded-lg text-center h-full border border-border/70 w-full">
        <CardHeader className="p-0 mb-3 flex flex-col items-center">
            <Image
            src={token.iconUrl}
            alt={`${token.name} logo`}
            width={40}
            height={40}
            className="rounded-full mb-2"
            />
            <CardTitle className="text-base font-bold font-body text-foreground truncate w-full">{token.name}</CardTitle>
            <p className="text-sm text-muted-foreground font-mono">{token.symbol}</p>
        </CardHeader>
      
        <CardContent className="p-0 mb-4">
            <p className="font-semibold font-mono text-lg text-foreground">${token.price.toFixed(4)}</p>
            <p className={cn("text-sm font-mono", isPositiveChange ? 'text-green-500' : 'text-red-500')}>
                {isPositiveChange ? '+' : ''}{token.change24h.toFixed(2)}%
            </p>
        </CardContent>

        <CardFooter className="p-0 mt-auto w-full">
            <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/analyze/${token.symbol}`}>
                <Search className="mr-2 h-4 w-4" />
                Analyser
            </Link>
            </Button>
      </CardFooter>
    </Card>
  );
}
