'use server';

export interface PumpCoin {
  mint: string;
  initialized: boolean;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  market_cap: number;
  reply_count: number;
  usd_market_cap?: number;
}

const PUMPFUN_API_URL = process.env.PUMPFUN_API_URL || 'https://frontend-api-v3.pump.fun';
const PUMPFUN_JWT_TOKEN = process.env.PUMPFUN_JWT_TOKEN || '';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  if (PUMPFUN_JWT_TOKEN) {
    headers['Authorization'] = `Bearer ${PUMPFUN_JWT_TOKEN}`;
  }
  return headers;
}

export async function fetchLatestPumpCoins(): Promise<PumpCoin[]> {
  try {
    const url = `${PUMPFUN_API_URL}/coins?offset=0&limit=12&sort=created_timestamp&order=DESC`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 0 } // Fresh real-time data
    });
    if (!res.ok) {
      throw new Error(`Pump.fun HTTP error: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching latest pump.fun coins:", error);
    return [];
  }
}

export async function fetchPumpCoin(mint: string): Promise<PumpCoin | null> {
  try {
    const url = `${PUMPFUN_API_URL}/coins/${mint}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 0 }
    });
    if (!res.ok) {
      throw new Error(`Pump.fun HTTP error for coin ${mint}: ${res.status}`);
    }
    const data = await res.json();
    return data && data.mint ? data : null;
  } catch (error) {
    console.error(`Error fetching pump.fun coin ${mint}:`, error);
    return null;
  }
}

export async function getPumpFunWsUrl(): Promise<string> {
  return process.env.PUMPFUN_JWT_TOKEN || 'wss://pumpportal.fun/api/data';
}

export async function executeRealPumpTrade(params: {
  action: 'buy' | 'sell';
  mint: string;
  amount: number | string;
  denominatedInSol: boolean;
  slippage: number;
  priorityFee: number;
  customPrivateKey?: string; // Optional private key (base64) for sub-wallets
  pool?: 'pump' | 'raydium'; // Swap pool routing
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { action, mint, amount, denominatedInSol, slippage, priorityFee, customPrivateKey, pool = 'pump' } = params;
    const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY || '';
    if (!solanaPrivateKey && !customPrivateKey) {
      throw new Error("Clé privée principale ou personnalisée manquante.");
    }

    const { Keypair, VersionedTransaction, Connection } = await import('@solana/web3.js');
    const { default: bs58 } = await import('bs58');

    // 1. Recover Keypair locally
    let signer: any;
    try {
      if (customPrivateKey) {
        const secretKeyUint8 = base64ToUint8Array(customPrivateKey);
        signer = Keypair.fromSecretKey(secretKeyUint8);
      } else {
        signer = Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
      }
    } catch (err) {
      throw new Error("Format de la clé privée invalide.");
    }
    const publicKeyStr = signer.publicKey.toBase58();

    // 2. Fetch serialized unsigned transaction from PumpPortal
    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: publicKeyStr,
        action: action, 
        mint: mint, 
        amount: amount, 
        denominatedInSol: denominatedInSol ? "true" : "false",
        slippage: slippage,
        priorityFee: priorityFee,
        pool: pool
      })
    });

    if (response.status !== 200) {
      const errorText = await response.text();
      throw new Error(`Erreur API Trade : ${errorText}`);
    }

    const transactionData = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(transactionData));

    // 3. Sign transaction locally
    tx.sign([signer]);

    // 4. Send transaction using the configured Chainstack Solana RPC
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: process.env.SOLANA_WSS_URL
    });
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    return {
      success: true,
      txHash: signature
    };
  } catch (error: any) {
    console.error("Error executing real Pump.fun trade:", error);
    return {
      success: false,
      error: error.message || "Erreur blockchain inconnue."
    };
  }
}

export async function getRealSolanaBalance(): Promise<{ success: boolean; balance?: number; publicKey?: string; error?: string }> {
  try {
    const solanaPrivateKey = process.env.SOLANA_PRIVATE_KEY || '';
    if (!solanaPrivateKey) {
      return { success: false, error: "Clé privée non configurée dans le fichier .env" };
    }
    const { Keypair, Connection } = await import('@solana/web3.js');
    const { default: bs58 } = await import('bs58');

    const signer = Keypair.fromSecretKey(bs58.decode(solanaPrivateKey));
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, 'confirmed');

    const balanceLamports = await connection.getBalance(signer.publicKey);
    return {
      success: true,
      balance: balanceLamports / 1e9,
      publicKey: signer.publicKey.toBase58()
    };
  } catch (err: any) {
    console.error("Error getting Solana balance:", err);
    return { success: false, error: err.message || "Erreur de connexion RPC" };
  }
}

export async function checkSolanaNetworkHealth(): Promise<{ success: boolean; latency?: number; blockHeight?: number; error?: string }> {
  try {
    const { Connection } = await import('@solana/web3.js');
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, 'confirmed');

    const startTime = Date.now();
    const blockHeight = await connection.getBlockHeight();
    const latency = Date.now() - startTime;

    return {
      success: true,
      latency,
      blockHeight
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Impossible de joindre le nœud RPC Solana."
    };
  }
}

export async function getMultipleSolanaBalances(pubKeys: string[]): Promise<{ success: boolean; balances?: Record<string, number>; error?: string }> {
  try {
    const { Connection, PublicKey } = await import('@solana/web3.js');
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, 'confirmed');

    const balances: Record<string, number> = {};
    for (const key of pubKeys) {
      try {
        const balance = await connection.getBalance(new PublicKey(key));
        balances[key] = balance / 1e9;
      } catch (e) {
        balances[key] = 0;
      }
    }
    return { success: true, balances };
  } catch (err: any) {
    console.error("Error getting multiple balances:", err);
    return { success: false, error: err.message };
  }
}

export async function disperseSolToSubWallets(params: {
  subWalletPubKeys: string[];
  amountPerWallet: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { Keypair, SystemProgram, Transaction, Connection, PublicKey } = await import('@solana/web3.js');
    const { default: bs58 } = await import('bs58');

    const mainKey = process.env.SOLANA_PRIVATE_KEY;
    if (!mainKey) {
      throw new Error("SOLANA_PRIVATE_KEY n'est pas configuré dans le fichier .env.");
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, 'confirmed');
    const mainSigner = Keypair.fromSecretKey(bs58.decode(mainKey));

    const transaction = new Transaction();
    for (const pubKeyStr of params.subWalletPubKeys) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: mainSigner.publicKey,
          toPubkey: new PublicKey(pubKeyStr),
          lamports: Math.round(params.amountPerWallet * 1e9),
        })
      );
    }

    const signature = await connection.sendTransaction(transaction, [mainSigner], {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    return {
      success: true,
      txHash: signature
    };
  } catch (err: any) {
    console.error("Error dispersing SOL:", err);
    return {
      success: false,
      error: err.message || "Échec du transfert collectif."
    };
  }
}

export async function withdrawSolana(params: {
  recipient: string;
  amount: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { Keypair, SystemProgram, Transaction, Connection, PublicKey } = await import('@solana/web3.js');
    const { default: bs58 } = await import('bs58');

    const mainKey = process.env.SOLANA_PRIVATE_KEY;
    if (!mainKey) {
      throw new Error("SOLANA_PRIVATE_KEY n'est pas configuré dans le fichier .env.");
    }

    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, 'confirmed');
    const mainSigner = Keypair.fromSecretKey(bs58.decode(mainKey));

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: mainSigner.publicKey,
        toPubkey: new PublicKey(params.recipient),
        lamports: Math.round(params.amount * 1e9),
      })
    );

    const signature = await connection.sendTransaction(transaction, [mainSigner], {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    return {
      success: true,
      txHash: signature
    };
  } catch (err: any) {
    console.error("Error withdrawing SOL:", err);
    return {
      success: false,
      error: err.message || "Échec du retrait."
    };
  }
}

export async function generateSubWalletsServer(): Promise<{
  success: boolean;
  wallets?: Array<{ publicKey: string; privateKey: string; balance: number }>;
  error?: string;
}> {
  try {
    const { Keypair } = await import('@solana/web3.js');
    const wallets = Array.from({ length: 5 }).map(() => {
      const kp = Keypair.generate();
      const secretKeyBase64 = uint8ArrayToBase64(kp.secretKey);
      return {
        publicKey: kp.publicKey.toBase58(),
        privateKey: secretKeyBase64,
        balance: 0
      };
    });
    return {
      success: true,
      wallets
    };
  } catch (err: any) {
    console.error("Error generating sub-wallets:", err);
    return {
      success: false,
      error: err.message || "Failed to generate sub-wallets."
    };
  }
}

// Helpers for browser-compatible base64 encoding/decoding without Node.js Buffer
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  const binString = Array.from(arr).map(val => String.fromCharCode(val)).join('');
  return btoa(binString);
}

