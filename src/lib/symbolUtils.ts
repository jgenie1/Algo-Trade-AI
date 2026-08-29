/**
 * Unified Symbol Canonicalizer & Resolver for AlgoTradeAI
 * Eliminates mismatches between UI, Yahoo Finance, Binance, CoinMarketCap and Solana tokens.
 */

export function cleanSymbol(symbol: string): string {
  if (!symbol) return '';
  let s = symbol.trim();
  if (s.startsWith('SOL:')) {
    const parts = s.split(':');
    if (parts.length >= 3 && parts[2]) {
      return parts[2].toUpperCase();
    }
    if (parts.length >= 2 && parts[1]) {
      return parts[1];
    }
  }
  return s
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

  // 2. Solana format match: 'SOL:mint:symbol' or 'SOL:mint'
  if (pair.startsWith('SOL:')) {
    const parts = pair.split(':');
    const mint = parts[1];
    if (mint) {
      if (livePrices[mint] && livePrices[mint] > 0) return livePrices[mint];
      if (livePrices[`SOL:${mint}`] && livePrices[`SOL:${mint}`] > 0) return livePrices[`SOL:${mint}`];
    }
    const sym = parts[2];
    if (sym) {
      if (livePrices[sym] && livePrices[sym] > 0) return livePrices[sym];
      if (livePrices[`${sym}-USD`] && livePrices[`${sym}-USD`] > 0) return livePrices[`${sym}-USD`];
      if (livePrices[`${sym}USDT`] && livePrices[`${sym}USDT`] > 0) return livePrices[`${sym}USDT`];
    }
  }

  // 3. Canonical match
  const canonical = canonicalizePair(pair);
  if (livePrices[canonical] && livePrices[canonical] > 0) return livePrices[canonical];

  // 4. Clean symbol match
  const clean = cleanSymbol(pair);
  if (clean) {
    if (livePrices[clean] && livePrices[clean] > 0) return livePrices[clean];
    if (livePrices[`${clean}-USD`] && livePrices[`${clean}-USD`] > 0) return livePrices[`${clean}-USD`];
    if (livePrices[`FX:${clean}USD`] && livePrices[`FX:${clean}USD`] > 0) return livePrices[`FX:${clean}USD`];
    if (livePrices[`${clean}USDT`] && livePrices[`${clean}USDT`] > 0) return livePrices[`${clean}USDT`];
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

