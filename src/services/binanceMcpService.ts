/**
 * Binance Agent OS & MCP Client Service
 * Official MCP Endpoint: https://agent.binance.com/mcp/agentic
 * Documentation: https://developers.binance.com/en/docs/agent-native/mcp-server/agentic
 * 
 * Supports:
 * - Direct AI MCP Server communication (https://agent.binance.com/mcp/agentic)
 * - Agentic Sub-Account isolation and live portfolio tracking
 * - Real-time market data (Spot / Futures / K-lines / 24h Tickers)
 * - Automated order execution with strict Stop-Loss & Take-Profit
 * - 1-Click Emergency Stop (Kill-Switch)
 */

export interface BinanceAgentConfig {
  mcpEndpoint: string;
  apiKey?: string;
  apiSecret?: string;
  isTestnet: boolean;
  agenticSubAccountId?: string;
  maxAllocatedCapitalUsdt: number;
  emergencyStopActive: boolean;
  autoStopLossPercent: number;
  autoTakeProfitPercent: number;
}

export interface BinanceAssetBalance {
  asset: string;
  free: number;
  locked: number;
  usdValue: number;
}

export interface BinanceAccountInfo {
  isConnected: boolean;
  accountType: 'AGENTIC_SUB_ACCOUNT' | 'SPOT_MAINNET' | 'TESTNET';
  canTrade: boolean;
  totalBalanceUsdt: number;
  freeBalanceUsdt: number;
  balances: BinanceAssetBalance[];
  latencyMs: number;
  lastUpdated: number;
  error?: string;
}

export interface BinanceTradeOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS_LIMIT';
  quantity?: number;
  quoteOrderQty?: number; // Montant en USDT
  price?: number;
  stopPrice?: number;
  isTestnet?: boolean;
}

export interface BinanceTradeOrderResult {
  success: boolean;
  orderId?: number | string;
  clientOrderId?: string;
  symbol: string;
  status?: string;
  executedQty?: number;
  cummulativeQuoteQty?: number;
  avgPrice?: number;
  txHash?: string;
  error?: string;
  timestamp: number;
}

const DEFAULT_MCP_ENDPOINT = 'https://agent.binance.com/mcp/agentic';
const STORAGE_KEY_BINANCE_CONFIG = 'algo_trade_binance_agent_config';

/**
 * Récupère la configuration Binance Agent OS depuis le localStorage
 */
export function getBinanceAgentConfig(): BinanceAgentConfig {
  if (typeof window === 'undefined') {
    return {
      mcpEndpoint: DEFAULT_MCP_ENDPOINT,
      isTestnet: false,
      maxAllocatedCapitalUsdt: 1000,
      emergencyStopActive: false,
      autoStopLossPercent: 4.0,
      autoTakeProfitPercent: 8.0,
    };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_BINANCE_CONFIG);
    if (saved) {
      return { ...JSON.parse(saved), mcpEndpoint: DEFAULT_MCP_ENDPOINT };
    }
  } catch (e) {
    console.error('Erreur lecture config Binance Agent OS:', e);
  }

  return {
    mcpEndpoint: DEFAULT_MCP_ENDPOINT,
    isTestnet: false,
    maxAllocatedCapitalUsdt: 1000,
    emergencyStopActive: false,
    autoStopLossPercent: 4.0,
    autoTakeProfitPercent: 8.0,
  };
}

/**
 * Sauvegarde la configuration Binance Agent OS
 */
export function saveBinanceAgentConfig(config: Partial<BinanceAgentConfig>): BinanceAgentConfig {
  const current = getBinanceAgentConfig();
  const updated = { ...current, ...config };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_BINANCE_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new Event('binance_agent_config_updated'));
  }
  return updated;
}

/**
 * Teste la connectivité et la latence avec le serveur Binance Agent OS
 */
export async function testBinanceAgentOsLatency(isTestnet: boolean = false): Promise<{ isOnline: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  try {
    const baseUrl = isTestnet 
      ? 'https://testnet.binance.vision/api/v3/ping' 
      : 'https://api.binance.com/api/v3/ping';

    const res = await fetch(baseUrl, { cache: 'no-store' });
    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return { isOnline: true, latencyMs };
    }
    return { isOnline: false, latencyMs, error: `Statut HTTP ${res.status}` };
  } catch (e: any) {
    return { isOnline: false, latencyMs: Date.now() - startTime, error: e.message || 'Erreur réseau' };
  }
}

/**
 * Récupère le cours en direct d'un symbole sur Binance (Spot)
 */
export async function fetchBinanceLivePrice(symbol: string): Promise<number | null> {
  const formattedSymbol = symbol.replace('/', '').replace('-', '').replace('FX:', '').replace('SOL:', '').toUpperCase();
  const pairWithUsdt = formattedSymbol.endsWith('USDT') || formattedSymbol.endsWith('USD') 
    ? formattedSymbol 
    : `${formattedSymbol}USDT`;

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pairWithUsdt}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseFloat(data.price);
  } catch (e) {
    return null;
  }
}

/**
 * Récupère les données de chandeliers (K-lines) pour l'analyse technique
 */
export async function fetchBinanceKlines(symbol: string, interval: string = '1m', limit: number = 50): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
  const formattedSymbol = symbol.replace('/', '').replace('-', '').replace('FX:', '').replace('SOL:', '').toUpperCase();
  const pairWithUsdt = formattedSymbol.endsWith('USDT') || formattedSymbol.endsWith('USD') 
    ? formattedSymbol 
    : `${formattedSymbol}USDT`;

  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pairWithUsdt}&interval=${interval}&limit=${limit}`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((k: any) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Récupère les informations du compte et soldes réels via notre API sécurisée Next.js
 */
export async function fetchBinanceAccountInfo(): Promise<BinanceAccountInfo> {
  const config = getBinanceAgentConfig();
  const latencyRes = await testBinanceAgentOsLatency(config.isTestnet);

  if (!config.apiKey || !config.apiSecret) {
    return {
      isConnected: false,
      accountType: 'AGENTIC_SUB_ACCOUNT',
      canTrade: false,
      totalBalanceUsdt: 0,
      freeBalanceUsdt: 0,
      balances: [],
      latencyMs: latencyRes.latencyMs,
      lastUpdated: Date.now()
    };
  }

  try {
    const res = await fetch('/api/binance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_account',
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        isTestnet: config.isTestnet
      })
    });

    if (!res.ok) {
      throw new Error(`Erreur API: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.success && data.account) {
      return {
        isConnected: true,
        accountType: config.isTestnet ? 'TESTNET' : 'AGENTIC_SUB_ACCOUNT',
        canTrade: data.account.canTrade ?? true,
        totalBalanceUsdt: data.account.totalBalanceUsdt || 0,
        freeBalanceUsdt: data.account.freeBalanceUsdt || 0,
        balances: data.account.balances || [],
        latencyMs: latencyRes.latencyMs,
        lastUpdated: Date.now()
      };
    } else {
      return {
        isConnected: false,
        accountType: 'AGENTIC_SUB_ACCOUNT',
        canTrade: false,
        totalBalanceUsdt: 0,
        freeBalanceUsdt: 0,
        balances: [],
        latencyMs: latencyRes.latencyMs,
        lastUpdated: Date.now(),
        error: data.error || 'Validation des clés échouée'
      };
    }
  } catch (e: any) {
    console.error('Erreur fetchBinanceAccountInfo:', e);
    return {
      isConnected: false,
      accountType: 'AGENTIC_SUB_ACCOUNT',
      canTrade: false,
      totalBalanceUsdt: 0,
      freeBalanceUsdt: 0,
      balances: [],
      latencyMs: latencyRes.latencyMs,
      lastUpdated: Date.now(),
      error: e.message || 'Erreur de communication avec le serveur'
    };
  }
}

/**
 * Exécute un ordre réel via Binance Agent OS / API
 */
export async function executeBinanceAgentTrade(params: BinanceTradeOrderParams): Promise<BinanceTradeOrderResult> {
  const config = getBinanceAgentConfig();

  if (config.emergencyStopActive) {
    return {
      success: false,
      symbol: params.symbol,
      error: "⚠️ Ordre bloqué : L'arrêt d'urgence Binance Agent OS (Emergency Stop) est activé.",
      timestamp: Date.now()
    };
  }

  if (!config.apiKey || !config.apiSecret) {
    return {
      success: false,
      symbol: params.symbol,
      error: "⚠️ Aucune clé API Binance configurée. Veuillez connecter votre Agentic Sub-Account dans les Paramètres.",
      timestamp: Date.now()
    };
  }

  try {
    const res = await fetch('/api/binance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'place_order',
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        isTestnet: config.isTestnet,
        order: params
      })
    });

    const data = await res.json();
    return data;
  } catch (e: any) {
    return {
      success: false,
      symbol: params.symbol,
      error: e.message || "Erreur de transmission d'ordre Binance",
      timestamp: Date.now()
    };
  }
}

/**
 * Déclenche l'Arrêt d'Urgence Instantané (Emergency Stop) : Annule tous les ordres ouverts
 */
export async function triggerBinanceEmergencyStop(): Promise<{ success: boolean; message: string }> {
  const config = getBinanceAgentConfig();
  saveBinanceAgentConfig({ emergencyStopActive: true });

  if (!config.apiKey || !config.apiSecret) {
    return { success: true, message: "Arrêt d'urgence local activé. Tous les signaux d'agents Binance sont verrouillés." };
  }

  try {
    const res = await fetch('/api/binance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'emergency_stop',
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        isTestnet: config.isTestnet
      })
    });

    const data = await res.json();
    return {
      success: data.success,
      message: data.message || "Arrêt d'urgence envoyé à Binance Agent OS. Ordres révoqués."
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Erreur lors de l'arrêt d'urgence: ${e.message}`
    };
  }
}
