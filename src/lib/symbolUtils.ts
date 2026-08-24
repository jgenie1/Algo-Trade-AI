/**
 * Unified Symbol Canonicalizer & Resolver for AlgoTradeAI
 * Eliminates mismatches between UI, Yahoo Finance, Binance, CoinMarketCap and Solana tokens.
 */

export function cleanSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol
    .replace('FX:', '')
    .replace('-USD', '')
    .replace('USD', '')
    .replace('=X', '')
    .replace('=F', '')
    .replace('SOL:', '')
    .replace('/', '')
    .trim()
    .toUpperCase();
}

export function canonicalizePair(pair: string): string {
  if (!pair) return '';
  const trimmed = pair.trim();

  // Meme Coin or Solana on-chain address
  if (trimmed.startsWith('SOL:') || (trimmed.length >= 32 && trimmed.length <= 44)) {
    return trimmed;
  }

  // Forex Pairs
  if (trimmed.startsWith('FX:') || trimmed.includes('=X')) {
    const raw = trimmed.replace('FX:', '').replace('=X', '').replace('/', '').toUpperCase();
    return `FX:${raw}`;
  }

  // Commodities
  if (trimmed === 'GC=F' || trimmed === 'GOLD') return 'GOLD';
  if (trimmed === 'SI=F' || trimmed === 'SILVER') return 'SILVER';
  if (trimmed === 'CL=F' || trimmed === 'OIL') return 'OIL';

  // Crypto Pairs
  const clean = cleanSymbol(trimmed);
  return clean || trimmed;
}

/**
 * Résout le prix d'une paire à travers tous les formats de clés possibles dans livePrices
 */
export function resolveLivePrice(pair: string, livePrices: Record<string, number>): number {
  if (!pair || !livePrices) return 0;

  // 1. Direct match
  if (livePrices[pair] && livePrices[pair] > 0) return livePrices[pair];

  // 2. Canonical match
  const canonical = canonicalizePair(pair);
  if (livePrices[canonical] && livePrices[canonical] > 0) return livePrices[canonical];

  // 3. Clean symbol match
  const clean = cleanSymbol(pair);
  if (livePrices[clean] && livePrices[clean] > 0) return livePrices[clean];
  if (livePrices[`${clean}-USD`] && livePrices[`${clean}-USD`] > 0) return livePrices[`${clean}-USD`];
  if (livePrices[`FX:${clean}USD`] && livePrices[`FX:${clean}USD`] > 0) return livePrices[`FX:${clean}USD`];
  if (livePrices[`${clean}USDT`] && livePrices[`${clean}USDT`] > 0) return livePrices[`${clean}USDT`];

  // 4. Solana format match
  if (pair.startsWith('SOL:')) {
    const mint = pair.replace('SOL:', '');
    if (livePrices[mint] && livePrices[mint] > 0) return livePrices[mint];
  }

  return 0;
}

export function slugifyStrategy(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9]+/g, '-')     // Remplace les caractères non alphanumériques par des tirets
    .replace(/^-+|-+$/g, '');        // Supprime les tirets au début et à la fin
}

export function getDisplayPairLabel(pair: string): { symbol: string; badge: string; isSolana: boolean } {
  if (!pair) return { symbol: 'N/A', badge: 'FX', isSolana: false };
  const trimmed = pair.trim();

  if (trimmed.startsWith('SOL:')) {
    const parts = trimmed.split(':');
    const ticker = parts[parts.length - 1] || 'MEME';
    return { symbol: ticker.toUpperCase(), badge: 'SOLANA', isSolana: true };
  }

  if (trimmed.startsWith('FX:')) {
    return { symbol: trimmed.replace('FX:', '').replace('=X', ''), badge: 'FOREX', isSolana: false };
  }

  return { symbol: cleanSymbol(trimmed) || trimmed, badge: 'CRYPTO', isSolana: false };
}

