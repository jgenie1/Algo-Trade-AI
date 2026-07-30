
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

let mockCoinsCache: PumpCoin[] = [];

function getMockCoins(): PumpCoin[] {
  const now = Date.now();
  if (mockCoinsCache.length === 0) {
    const names = ["Trump Elon Doge", "Vibe Engine", "Pepe Cosmic", "Solana Quantum", "Ai Moon", "Mars Rover", "Laser Cat", "Chill Guy", "Deep Seek AI", "Gemini Ultra", "Meme Machine"];
    const symbols = ["TED", "VIBE", "COSMIC", "QUANT", "AIM", "ROVER", "LASER", "CHILL", "DSEEK", "GEMINI", "MACHINE"];
    const descriptions = [
      "The ultimate cross-over meme on Solana. Send it!",
      "Decentralized vibe engine power. Stay chill and trade.",
      "A frog looking at stars in a cosmic universe.",
      "Quantum computer predicting meme prices on Solana.",
      "AI model that lives on the blockchain and pumps.",
      "Exploration of mars via memes and communities.",
      "Pew pew pew. Cats with lasers on their eyes.",
      "Just a chill guy on the blockchain.",
      "Deep thinking meme coin that discovers new trends.",
      "Highly intelligent coin backed by AI models.",
      "A continuous generation of memes and utility."
    ];

    for (let i = 0; i < 12; i++) {
      const mint = 'mnt_' + Math.random().toString(36).substring(2, 12);
      const solReserves = i === 0 
        ? 30000000000 + Math.random() * 3000000000  // ~30-33 SOL (PRECOCE)
        : i === 1
          ? 34000000000 + Math.random() * 10000000000 // ~34-44 SOL (MOMENTUM)
          : 68500000000 + Math.random() * 15000000000; // ~68-83 SOL (RAYDIUM Proche)

      const replies = i === 1 ? 12 + Math.floor(Math.random() * 15) : Math.floor(Math.random() * 10);
      const complete = solReserves >= 85000000000;

      mockCoinsCache.push({
        mint,
        initialized: true,
        name: names[i % names.length],
        symbol: symbols[i % symbols.length],
        description: descriptions[i % descriptions.length] + " Socials: t.me/test_coin, twitter.com/test_coin",
        image_uri: `https://picsum.photos/seed/${symbols[i % symbols.length]}/200`,
        metadata_uri: ``,
        bonding_curve: 'curve_' + Math.random().toString(36).substring(2, 10),
        associated_bonding_curve: 'assoc_' + Math.random().toString(36).substring(2, 10),
        creator: 'crt_' + Math.random().toString(36).substring(2, 10),
        created_timestamp: now - (i * 60000),
        complete,
        virtual_sol_reserves: solReserves,
        virtual_token_reserves: 1073000000000000 - (solReserves * 10),
        total_supply: 1000000000000000,
        market_cap: (solReserves / 1e9) * 1.5,
        reply_count: replies
      });
    }
  } else {
    // Periodically update reserves / replies of some coins to simulate activity
    mockCoinsCache = mockCoinsCache.map(c => {
      if (Math.random() < 0.25) {
        const increment = Math.floor(Math.random() * 1200000000); // Up to 1.2 SOL increments
        const newReserves = Math.min(85000000000, c.virtual_sol_reserves + increment);
        return {
          ...c,
          virtual_sol_reserves: newReserves,
          virtual_token_reserves: 1073000000000000 - (newReserves * 10),
          reply_count: c.reply_count + (Math.random() < 0.3 ? 1 : 0),
          market_cap: (newReserves / 1e9) * 1.5,
          complete: newReserves >= 85000000000
        };
      }
      return c;
    });

    if (Math.random() < 0.15) {
      // Add a new coin to mock stream
      const names = ["Trump Elon Doge", "Vibe Engine", "Pepe Cosmic", "Solana Quantum", "Ai Moon", "Mars Rover", "Laser Cat", "Chill Guy", "Deep Seek AI", "Gemini Ultra", "Meme Machine"];
      const symbols = ["TED", "VIBE", "COSMIC", "QUANT", "AIM", "ROVER", "LASER", "CHILL", "DSEEK", "GEMINI", "MACHINE"];
      const idx = Math.floor(Math.random() * names.length);
      const mint = 'mnt_' + Math.random().toString(36).substring(2, 12);
      const solReserves = 30000000000 + Math.random() * 3000000000;
      const newCoin: PumpCoin = {
        mint,
        initialized: true,
        name: names[idx] + " " + Math.floor(Math.random() * 100),
        symbol: symbols[idx] + Math.floor(Math.random() * 10),
        description: "Simulated newly listed token! Join the hype on t.me/test_coin, twitter.com/test_coin",
        image_uri: `https://picsum.photos/seed/${symbols[idx]}/200`,
        metadata_uri: ``,
        bonding_curve: 'curve_' + Math.random().toString(36).substring(2, 10),
        associated_bonding_curve: 'assoc_' + Math.random().toString(36).substring(2, 10),
        creator: 'crt_' + Math.random().toString(36).substring(2, 10),
        created_timestamp: now,
        complete: false,
        virtual_sol_reserves: solReserves,
        virtual_token_reserves: 1073000000000000 - (solReserves * 10),
        total_supply: 1000000000000000,
        market_cap: (solReserves / 1e9) * 1.5,
        reply_count: Math.floor(Math.random() * 3)
      };
      mockCoinsCache = [newCoin, ...mockCoinsCache.slice(0, 19)];
    }
  }
  return mockCoinsCache;
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
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return getMockCoins();
  } catch (error) {
    console.error("Error fetching latest pump.fun coins, using fallback:", error);
    return getMockCoins();
  }
}

export async function fetchPumpCoin(mint: string): Promise<PumpCoin | null> {
  if (mint.startsWith('mnt_')) {
    const coins = getMockCoins();
    return coins.find(c => c.mint === mint) || null;
  }
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
    console.error(`Error fetching pump.fun coin ${mint}, trying fallback:`, error);
    const coins = getMockCoins();
    return coins.find(c => c.mint === mint) || null;
  }
}

export async function getPumpFunWsUrl(): Promise<string> {
  return process.env.PUMPFUN_JWT_TOKEN || '';
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
        const secretKeyUint8 = new Uint8Array(Buffer.from(customPrivateKey, 'base64'));
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
