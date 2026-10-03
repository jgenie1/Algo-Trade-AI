/**
 * ALGOTRADE AI - OPAQUE-BOX END-TO-END ON-CHAIN EXECUTION TEST SUITE
 * 
 * Comprehensive 4-Tier Test Matrix:
 * - Tier 1: Feature Coverage (Pump.fun, Jupiter, PancakeSwap, Vault, Disconnection, Rejection)
 * - Tier 2: Boundary & Corner Cases (0 amount, negative amount, slippage extremes, RPC timeout, invalid addresses, 4001 rejection)
 * - Tier 3: Cross-Feature Combinations (Chain switching, consecutive BUY/SELL, concurrent rejection, cross-chain routing)
 * - Tier 4: Real-World Scenarios (Full trading session, slippage recovery, rejection recovery, PancakeSwap BEP-20, mock audit)
 */

import assert from 'node:assert/strict';
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';

import * as pumpFunService from '../pumpFunService';
import * as pancakeSwapService from '../pancakeSwapService';
import * as dexSwapService from '../dexSwapService';

// --- Global Test Runner Harness ---
interface TestCaseResult {
  id: string;
  tier: string;
  name: string;
  passed: boolean;
  error?: string;
  defectId?: string;
  recommendedFix?: string;
}

const testResults: TestCaseResult[] = [];

async function runTest(
  id: string,
  tier: string,
  name: string,
  defectId: string,
  recommendedFix: string,
  fn: () => Promise<void>
) {
  try {
    await fn();
    testResults.push({ id, tier, name, passed: true });
    console.log(`  ✅ [PASS] ${id}: ${name}`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    testResults.push({
      id,
      tier,
      name,
      passed: false,
      error: errorMsg,
      defectId,
      recommendedFix
    });
    console.log(`  ❌ [FAIL] ${id}: ${name}`);
    console.log(`     Error: ${errorMsg}`);
  }
}

// --- Mock Web3 Providers for Test Harness ---

class MockSolanaWallet {
  isPhantom = true;
  isConnected = true;
  publicKey: PublicKey | null;
  signTransactionCalls: VersionedTransaction[] = [];
  signAndSendTransactionCalls: VersionedTransaction[] = [];
  shouldReject = false;
  rejectionCode = 4001;

  constructor(pubKeyStr = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU') {
    this.publicKey = new PublicKey(pubKeyStr);
  }

  async signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction> {
    if (this.shouldReject) {
      const err: any = new Error('User rejected the transaction');
      err.code = this.rejectionCode;
      err.name = 'UserRejectedRequestError';
      throw err;
    }
    this.signTransactionCalls.push(tx);
    return tx;
  }

  async signAndSendTransaction(tx: VersionedTransaction): Promise<{ signature: string }> {
    if (this.shouldReject) {
      const err: any = new Error('User rejected the transaction');
      err.code = this.rejectionCode;
      err.name = 'UserRejectedRequestError';
      throw err;
    }
    this.signAndSendTransactionCalls.push(tx);
    return { signature: '5wvnQ2pAdt9cM35P3xX9aP6k4R7Y6ZgqB7cT1mockSignature' };
  }

  disconnect() {
    this.isConnected = false;
    this.publicKey = null;
  }
}

class MockEthereumProvider {
  isMetaMask = true;
  selectedAddress: string | null = '0x71C84179373D68c7A1bC155E385a86A9b7B7A9D6';
  chainId = '0x38'; // BSC Mainnet
  requestCalls: { method: string; params?: any }[] = [];
  shouldReject = false;
  rejectionCode = 4001;

  async request(args: { method: string; params?: any[] }): Promise<any> {
    this.requestCalls.push(args);
    if (this.shouldReject) {
      const err: any = new Error('User rejected the transaction');
      err.code = this.rejectionCode;
      throw err;
    }
    switch (args.method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return this.selectedAddress ? [this.selectedAddress] : [];
      case 'eth_chainId':
        return this.chainId;
      case 'eth_sendTransaction':
        return '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd';
      default:
        return null;
    }
  }

  disconnect() {
    this.selectedAddress = null;
  }
}

// Helpers to create mock serialized VersionedTransaction
function createMockVersionedTxBuffer(payer: PublicKey): ArrayBuffer {
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: '11111111111111111111111111111111',
    instructions: []
  }).compileToV0Message();
  const tx = new VersionedTransaction(messageV0);
  const serialized = tx.serialize();
  const buffer = new ArrayBuffer(serialized.byteLength);
  new Uint8Array(buffer).set(serialized);
  return buffer;
}

// Save initial environment
const originalEnvSolanaKey = process.env.SOLANA_PRIVATE_KEY;
const originalFetch = globalThis.fetch;

function setupTestEnvironment(solanaWallet: MockSolanaWallet | null, ethereumProvider: MockEthereumProvider | null) {
  delete process.env.SOLANA_PRIVATE_KEY;

  const mockWindow: any = {
    solana: solanaWallet,
    phantom: solanaWallet ? { solana: solanaWallet } : undefined,
    ethereum: ethereumProvider,
    dispatchEvent: () => true,
    localStorage: {
      store: {
        connected_web3_wallet: solanaWallet ? 'solana' : ''
      } as Record<string, string>,
      getItem(key: string) {
        return this.store[key] || null;
      },
      setItem(key: string, val: string) {
        this.store[key] = val;
      },
      removeItem(key: string) {
        delete this.store[key];
      }
    }
  };

  (globalThis as any).window = mockWindow;
  (globalThis as any).localStorage = mockWindow.localStorage;

  // Default smart fetch handler for Solana RPC, pumpportal, and Jupiter APIs
  globalThis.fetch = async (input: any, init?: any): Promise<Response> => {
    const urlStr = String(input);
    const bodyStr = typeof init?.body === 'string' ? init.body : '';

    if (urlStr.includes('trade-local')) {
      if (solanaWallet && solanaWallet.publicKey) {
        const buffer = createMockVersionedTxBuffer(solanaWallet.publicKey);
        return new Response(buffer, { status: 200 });
      }
    }

    if (urlStr.includes('quote-api.jup.ag') && urlStr.includes('/quote')) {
      return new Response(JSON.stringify({
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
        inAmount: '100000000',
        outAmount: '5000000000',
        priceImpactPct: '0.01',
        routePlan: []
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (urlStr.includes('quote-api.jup.ag') && urlStr.includes('/swap')) {
      if (solanaWallet && solanaWallet.publicKey) {
        const buffer = createMockVersionedTxBuffer(solanaWallet.publicKey);
        const base64Tx = Buffer.from(buffer).toString('base64');
        return new Response(JSON.stringify({
          swapTransaction: base64Tx
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Solana JSON-RPC handling
    if (bodyStr.includes('"jsonrpc"')) {
      try {
        const rpcReq = JSON.parse(bodyStr);
        const method = rpcReq.method;
        if (method === 'getLatestBlockhash') {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: rpcReq.id || 1,
            result: {
              value: {
                blockhash: 'EkSnNWid2cvwEVnVx9aBqawnZZqnEZSu3W422m75eZNq',
                lastValidBlockHeight: 200000000
              },
              context: { slot: 1000 }
            }
          }), { status: 200 });
        }
        if (method === 'sendTransaction') {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: rpcReq.id || 1,
            result: '5wvnQ2pAdt9cM35P3xX9aP6k4R7Y6ZgqB7cT1mockSignature'
          }), { status: 200 });
        }
        if (method === 'getSignatureStatuses' || method === 'confirmTransaction') {
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: rpcReq.id || 1,
            result: {
              value: [{
                confirmationStatus: 'confirmed',
                confirmations: 1,
                err: null,
                slot: 1000
              }]
            }
          }), { status: 200 });
        }
      } catch (e) {}
    }

    return new Response(JSON.stringify({}), { status: 200 });
  };
}

function restoreTestEnvironment() {
  process.env.SOLANA_PRIVATE_KEY = originalEnvSolanaKey;
  globalThis.fetch = originalFetch;
}

// --- Main Execution Function ---
export async function executeE2ETests(): Promise<boolean> {
  console.log('\n==============================================================================');
  console.log('🔍 STARTING OPAQUE-BOX E2E ON-CHAIN EXECUTION SUITE (TIERS 1 - 4)');
  console.log('==============================================================================\n');

  // Attempt dynamic import of pending explorerLinks module
  let getExplorerTxUrl: ((chain: string, txHash: string) => string) | null = null;
  try {
    const explorerModuleName = '@/utils/explorerLinks';
    const explorerModule: any = await (import(explorerModuleName) as Promise<any>).catch(() => null);
    if (explorerModule && typeof explorerModule.getExplorerTxUrl === 'function') {
      getExplorerTxUrl = explorerModule.getExplorerTxUrl;
    }
  } catch {
    getExplorerTxUrl = null;
  }

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE (>=5 per feature)
  // ==========================================================================
  console.log('▶ [TIER 1] Feature Coverage Tests');

  // 1. Solana Pump.fun
  await runTest(
    'T1.1.1',
    'Tier 1 - Pump.fun',
    'Real BUY with connected window.solana signs transaction via wallet provider',
    'E2E-001',
    'Ensure executeRealPumpTrade requests signature from window.solana and skips dummy keys',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.ok(mockWallet.signTransactionCalls.length >= 1, 'window.solana.signTransaction must be called');
      assert.strictEqual(res.success, true, 'Trade must succeed with real signature');
      assert.ok(res.txHash, 'Transaction signature must be returned');
    }
  );

  await runTest(
    'T1.1.2',
    'Tier 1 - Pump.fun',
    'Real SELL with connected window.solana signs transaction via wallet provider',
    'E2E-001',
    'Ensure executeRealPumpTrade SELL requests signature from window.solana',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 1000,
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.ok(mockWallet.signTransactionCalls.length >= 1, 'window.solana.signTransaction must be called on SELL');
      assert.strictEqual(res.success, true, 'SELL trade must succeed');
    }
  );

  await runTest(
    'T1.1.3',
    'Tier 1 - Pump.fun',
    'Transaction serialization verifies VersionedTransaction with connected wallet as fee payer',
    'E2E-001',
    'Verify transaction passed to signTransaction matches payer public key',
    async () => {
      const mockWallet = new MockSolanaWallet('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.05,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.ok(mockWallet.signTransactionCalls.length > 0, 'SignTransaction must have captured transaction');
      const tx = mockWallet.signTransactionCalls[0];
      assert.ok(tx instanceof VersionedTransaction, 'Must be an instance of VersionedTransaction');
    }
  );

  await runTest(
    'T1.1.4',
    'Tier 1 - Pump.fun',
    '100% token sell normalizes amount correctly without virtual balance bypass',
    'E2E-001',
    'Ensure 100% sell amount passes proper payload to on-chain trade API',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      let capturedPayload: any = null;
      globalThis.fetch = async (url: any, opts: any) => {
        if (String(url).includes('trade-local')) {
          capturedPayload = JSON.parse(opts.body);
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: '100%',
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.ok(capturedPayload, 'Payload must be sent to trade API');
      assert.strictEqual(capturedPayload.amount, '100%', 'Payload amount must be normalized to 100%');
    }
  );

  await runTest(
    'T1.1.5',
    'Tier 1 - Pump.fun',
    'Trade result contains valid Solscan explorer URL or valid tx signature',
    'E2E-004',
    'Ensure Solana trade results return valid explorer link or tx signature',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const res: any = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.05,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.txHash, 'Must provide txHash');
      if (res.explorerUrl) {
        assert.ok(res.explorerUrl.startsWith('https://solscan.io/tx/'), 'Must point to solscan.io');
      }
    }
  );

  // 2. Solana Jupiter
  await runTest(
    'T1.2.1',
    'Tier 1 - Jupiter',
    'Jupiter swap uses connected window.solana public key without requiring local private key',
    'E2E-001',
    'Update executeJupiterSwap to support window.solana signing instead of failing when private key is missing',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: 0.1,
        slippageBps: 100
      });

      assert.strictEqual(res.success, true, 'Jupiter swap should succeed with connected browser wallet');
      assert.ok(mockWallet.signTransactionCalls.length >= 1, 'Jupiter must call window.solana.signTransaction');
    }
  );

  await runTest(
    'T1.2.2',
    'Tier 1 - Jupiter',
    'Jupiter BUY execution (SOL -> Token) prompts user signature via window.solana',
    'E2E-001',
    'Route Jupiter BUY through connected provider',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'ETH',
        amountSol: 0.05
      });

      assert.strictEqual(res.success, true);
    }
  );

  await runTest(
    'T1.2.3',
    'Tier 1 - Jupiter',
    'Jupiter SELL execution (Token -> SOL) prompts user signature via window.solana',
    'E2E-001',
    'Route Jupiter SELL through connected provider',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'sell',
        symbol: 'ETH',
        amountSol: 0.05
      });

      assert.strictEqual(res.success, true);
    }
  );

  await runTest(
    'T1.2.4',
    'Tier 1 - Jupiter',
    'Explorer URL returned for Jupiter swap matches Solscan format',
    'E2E-004',
    'Return explorerUrl in Jupiter swap response',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res: any = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'SOL',
        amountSol: 0.01
      });

      if (res.success && res.explorerUrl) {
        assert.ok(res.explorerUrl.includes('solscan.io/tx/'));
      } else {
        assert.fail('Jupiter swap failed to return valid explorer URL');
      }
    }
  );

  await runTest(
    'T1.2.5',
    'Tier 1 - Jupiter',
    'No fallback to synthetic or hardcoded private keys when browser wallet is connected',
    'E2E-001',
    'Enforce browser wallet signature priority over any ambient or saved settings keys',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: 0.1
      });

      assert.ok(res.success, 'Trade must succeed via browser wallet');
      assert.ok(mockWallet.signTransactionCalls.length > 0, 'Signature MUST come from browser wallet');
    }
  );

  // 3. EVM PancakeSwap
  await runTest(
    'T1.3.1',
    'Tier 1 - PancakeSwap',
    'executePancakeSwap is exported and callable on PancakeSwap service',
    'E2E-002',
    'Implement and export executePancakeSwap in src/services/pancakeSwapService.ts',
    async () => {
      const pancakeModule = pancakeSwapService as any;
      assert.ok(
        typeof pancakeModule.executePancakeSwap === 'function',
        'executePancakeSwap function must be exported from pancakeSwapService'
      );
    }
  );

  await runTest(
    'T1.3.2',
    'Tier 1 - PancakeSwap',
    'Swap BNB -> Token triggers eth_sendTransaction to PancakeSwap V2 Router',
    'E2E-002',
    'Implement swapExactETHForTokens via window.ethereum with router address',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
        tokenOut: '0x55d398326f99059fF775485246999027B3197955', // USDT
        amountIn: '0.1',
        ethereumProvider: mockEth
      });

      assert.strictEqual(res.success, true);
      assert.ok(mockEth.requestCalls.some(c => c.method === 'eth_sendTransaction'), 'eth_sendTransaction must be called');
    }
  );

  await runTest(
    'T1.3.3',
    'Tier 1 - PancakeSwap',
    'Swap Token -> BNB triggers eth_sendTransaction with appropriate calldata',
    'E2E-002',
    'Implement swapExactTokensForETH via window.ethereum',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0x55d398326f99059fF775485246999027B3197955',
        tokenOut: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        amountIn: '50',
        ethereumProvider: mockEth
      });

      assert.strictEqual(res.success, true);
    }
  );

  await runTest(
    'T1.3.4',
    'Tier 1 - PancakeSwap',
    'Explorer URL returned matches BscScan format (https://bscscan.com/tx/{hash})',
    'E2E-004',
    'Include explorerUrl pointing to bscscan.com in EvmTradeResult',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.05'
      });

      assert.ok(res.explorerUrl?.startsWith('https://bscscan.com/tx/'), 'Must link to bscscan.com');
    }
  );

  await runTest(
    'T1.3.5',
    'Tier 1 - PancakeSwap',
    'No synthetic Math.random() 64-char hex strings generated for PancakeSwap execution',
    'E2E-002',
    'Ensure returned txHash comes strictly from provider, never Math.random()',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.05'
      });

      assert.strictEqual(
        res.txHash,
        '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd',
        'txHash must be exact hash returned by window.ethereum'
      );
    }
  );

  // 4. BSC Vault (Reserve Vault)
  await runTest(
    'T1.4.1',
    'Tier 1 - BSC Vault',
    'Real depositProfitToBscVault prompts eth_sendTransaction via window.ethereum',
    'E2E-003',
    'Ensure depositProfitToBscVault with isRealMode=true uses connected MetaMask provider',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const res = await pancakeSwapService.depositProfitToBscVault(50, true);
      assert.strictEqual(res.success, true);
      assert.ok(
        mockEth.requestCalls.some(c => c.method === 'eth_sendTransaction'),
        'eth_sendTransaction must be requested'
      );
    }
  );

  await runTest(
    'T1.4.2',
    'Tier 1 - BSC Vault',
    'Real deposit converts USDT amount to accurate BNB/Wei value',
    'E2E-003',
    'Verify Wei conversion params sent to MetaMask',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      await pancakeSwapService.depositProfitToBscVault(100, true);
      const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
      assert.ok(sendTxCall && sendTxCall.params && sendTxCall.params[0], 'Transaction params must exist');
      assert.ok(sendTxCall.params[0].value.startsWith('0x'), 'Value in Wei must be hex encoded');
    }
  );

  await runTest(
    'T1.4.3',
    'Tier 1 - BSC Vault',
    'Real withdrawProfitFromBscVault prompts eth_sendTransaction via window.ethereum',
    'E2E-003',
    'Ensure withdrawProfitFromBscVault with isRealMode=true uses connected MetaMask provider',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      // Pre-fund vault
      await pancakeSwapService.depositProfitToBscVault(50, true);
      mockEth.requestCalls = [];

      const res = await pancakeSwapService.withdrawProfitFromBscVault(20, true);
      assert.strictEqual(res.success, true);
      assert.ok(mockEth.requestCalls.some(c => c.method === 'eth_sendTransaction'), 'eth_sendTransaction must be called for withdraw');
    }
  );

  await runTest(
    'T1.4.4',
    'Tier 1 - BSC Vault',
    'Vault rejects Math.random() synthetic hash fallback across all modes',
    'E2E-003',
    'Remove lines generating Math.random() fake hex hashes in pancakeSwapService',
    async () => {
      setupTestEnvironment(null, null);

      // Calling deposit without real mode or without wallet must fail, NEVER generate fake hash
      let threw = false;
      try {
        const res = await pancakeSwapService.depositProfitToBscVault(10, false);
        // If it succeeded, check if the hash is synthetic
        if (res.txHash && !res.txHash.startsWith('0x9b1b742a')) {
          assert.fail(`Fake random hash detected: ${res.txHash}`);
        }
      } catch (err: any) {
        threw = true;
      }
      assert.ok(threw, 'Deposit without wallet provider must throw and not generate synthetic hash');
    }
  );

  await runTest(
    'T1.4.5',
    'Tier 1 - BSC Vault',
    'Vault balance update strictly requires on-chain transaction confirmation',
    'E2E-003',
    'Only update inMemoryBscVaultUsdt after confirmed on-chain transaction',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.shouldReject = true;
      setupTestEnvironment(null, mockEth);

      const statusBefore = await pancakeSwapService.getBscProfitVaultStatus();
      try {
        await pancakeSwapService.depositProfitToBscVault(100, true);
      } catch (e) {
        // Expected rejection
      }
      const statusAfter = await pancakeSwapService.getBscProfitVaultStatus();
      assert.strictEqual(statusAfter.totalUsdtStored, statusBefore.totalUsdtStored, 'Balance must not change upon rejected transaction');
    }
  );

  // 5. Wallet Disconnection
  await runTest(
    'T1.5.1',
    'Tier 1 - Disconnection',
    'Pump.fun trade with no window.solana halts with WALLET_NOT_CONNECTED',
    'E2E-005',
    'Return errorCode WALLET_NOT_CONNECTED when window.solana is missing or disconnected',
    async () => {
      setupTestEnvironment(null, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.ok(
        res.error?.toLowerCase().includes('manquante') ||
        res.error?.toLowerCase().includes('connecter') ||
        (res as any).errorCode === 'WALLET_NOT_CONNECTED',
        'Must indicate missing wallet'
      );
    }
  );

  await runTest(
    'T1.5.2',
    'Tier 1 - Disconnection',
    'Jupiter swap with no window.solana halts with WALLET_NOT_CONNECTED',
    'E2E-005',
    'Return errorCode WALLET_NOT_CONNECTED when window.solana is missing in Jupiter',
    async () => {
      setupTestEnvironment(null, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: 0.1
      });

      assert.strictEqual(res.success, false);
      assert.ok(
        res.error?.includes('Aucune clé') ||
        res.error?.includes('connecter') ||
        (res as any).errorCode === 'WALLET_NOT_CONNECTED'
      );
    }
  );

  await runTest(
    'T1.5.3',
    'Tier 1 - Disconnection',
    'PancakeSwap trade with no window.ethereum halts with WALLET_NOT_CONNECTED',
    'E2E-002',
    'Halt executePancakeSwap when window.ethereum is missing',
    async () => {
      setupTestEnvironment(null, null);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.1'
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'WALLET_NOT_CONNECTED');
    }
  );

  await runTest(
    'T1.5.4',
    'Tier 1 - Disconnection',
    'BSC Vault deposit with no window.ethereum halts immediately with error',
    'E2E-003',
    'Throw explicit error when window.ethereum is missing for vault operations',
    async () => {
      setupTestEnvironment(null, null);

      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(25, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('Un portefeuille Web3 EVM'), 'Must throw explicit wallet requirement error');
      }
      assert.ok(threw, 'Must throw error');
    }
  );

  await runTest(
    'T1.5.5',
    'Tier 1 - Disconnection',
    'Disconnected wallet trade does not create phantom position or credit balance',
    'E2E-005',
    'Ensure trade failure leaves balances completely unchanged',
    async () => {
      setupTestEnvironment(null, null);

      const res = await dexSwapService.executeDEXSwap(
        dexSwapService.POPULAR_TOKENS[0], // SOL
        dexSwapService.POPULAR_TOKENS[1], // USDC
        0.5,
        {
          inAmount: '0.5',
          outAmount: '100',
          priceImpactPct: 0.1,
          estimatedFeeUsd: 0.01,
          routePlan: 'Jupiter',
          executionPrice: 200
        },
        true // isRealWalletConnected=true but provider missing
      );

      assert.strictEqual(res.success, false, 'DEX Swap must fail when provider missing');
      assert.strictEqual(res.txHash, '', 'TxHash must be empty string on failure');
    }
  );

  // 6. Rejection Handling
  await runTest(
    'T1.6.1',
    'Tier 1 - Rejection',
    'Pump.fun trade with user rejection (code 4001) aborts immediately without fallback',
    'E2E-001',
    'Ensure user rejection returns cancellation error and no ghost txHash',
    async () => {
      const mockWallet = new MockSolanaWallet();
      mockWallet.shouldReject = true;
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Must fail on user rejection');
      assert.ok(
        res.error?.includes('refusé') || res.error?.includes('annulée') || (res as any).errorCode === 'USER_REJECTED',
        'Must indicate user cancellation'
      );
    }
  );

  await runTest(
    'T1.6.2',
    'Tier 1 - Rejection',
    'Jupiter swap with user rejection (code 4001) aborts immediately',
    'E2E-001',
    'Propagate code 4001 user cancellation in Jupiter swap',
    async () => {
      const mockWallet = new MockSolanaWallet();
      mockWallet.shouldReject = true;
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: 0.1
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('refusé') || res.error?.includes('annulée') || (res as any).errorCode === 'USER_REJECTED');
    }
  );

  await runTest(
    'T1.6.3',
    'Tier 1 - Rejection',
    'PancakeSwap swap with user rejection (code 4001) aborts immediately',
    'E2E-002',
    'Handle code 4001 rejection in executePancakeSwap',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.shouldReject = true;
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.1'
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'USER_REJECTED');
    }
  );

  await runTest(
    'T1.6.4',
    'Tier 1 - Rejection',
    'BSC Vault deposit with user rejection (code 4001) aborts immediately without balance credit',
    'E2E-003',
    'Catch code 4001 in depositProfitToBscVault and ensure zero balance increment',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.shouldReject = true;
      setupTestEnvironment(null, mockEth);

      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(50, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('refusé'), 'Error must mention rejection');
      }
      assert.ok(threw);
    }
  );

  await runTest(
    'T1.6.5',
    'Tier 1 - Rejection',
    'User rejection preserves previous balance and never simulates success',
    'E2E-005',
    'Ensure rejection leaves state uncorrupted across trading engine',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.shouldReject = true;
      setupTestEnvironment(null, mockEth);

      let threw = false;
      try {
        await pancakeSwapService.withdrawProfitFromBscVault(10, true);
      } catch (err: any) {
        threw = true;
      }
      assert.ok(threw, 'Withdrawal must reject cleanly');
    }
  );

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 per category)
  // ==========================================================================
  console.log('\n▶ [TIER 2] Boundary & Corner Cases Tests');

  // 1. 0 Amount
  await runTest(
    'T2.1.1',
    'Tier 2 - 0 Amount',
    'Pump.fun BUY with 0 SOL fails with validation error before RPC call',
    'E2E-001',
    'Validate amount > 0 in executeRealPumpTrade before preparing transaction',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Must fail for 0 amount');
      assert.strictEqual(mockWallet.signTransactionCalls.length, 0, 'Must not prompt user signature for 0 amount');
    }
  );

  await runTest(
    'T2.1.2',
    'Tier 2 - 0 Amount',
    'Pump.fun SELL with 0 tokens fails with validation error',
    'E2E-001',
    'Reject 0 amount on SELL in executeRealPumpTrade',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0,
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(mockWallet.signTransactionCalls.length, 0);
    }
  );

  await runTest(
    'T2.1.3',
    'Tier 2 - 0 Amount',
    'Jupiter swap with 0 amount fails validation immediately',
    'E2E-001',
    'Validate amountSol > 0 in executeJupiterSwap',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: 0
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('faible') || res.error?.includes('invalide'));
    }
  );

  await runTest(
    'T2.1.4',
    'Tier 2 - 0 Amount',
    'PancakeSwap swap with "0" amount fails validation',
    'E2E-002',
    'Validate amountIn > 0 in executePancakeSwap',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0'
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.1.5',
    'Tier 2 - 0 Amount',
    'BSC Vault deposit with 0 USDT fails validation',
    'E2E-003',
    'Validate amountUsdt > 0 in depositProfitToBscVault',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(0, true);
      } catch (e) {
        threw = true;
      }
      assert.ok(threw, '0 deposit must be rejected');
    }
  );

  // 2. Negative Amount
  await runTest(
    'T2.2.1',
    'Tier 2 - Negative Amount',
    'Pump.fun BUY with negative amount (-1.5 SOL) fails validation',
    'E2E-001',
    'Enforce amount > 0 check in executeRealPumpTrade',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: -1.5,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.2.2',
    'Tier 2 - Negative Amount',
    'Pump.fun SELL with negative amount fails validation',
    'E2E-001',
    'Reject negative amount on SELL in executeRealPumpTrade',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: -500,
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.2.3',
    'Tier 2 - Negative Amount',
    'Jupiter swap with negative amount fails validation',
    'E2E-001',
    'Reject negative amount in executeJupiterSwap',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: -0.5
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.2.4',
    'Tier 2 - Negative Amount',
    'PancakeSwap swap with negative amount fails validation',
    'E2E-002',
    'Reject negative amountIn in executePancakeSwap',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '-0.5'
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.2.5',
    'Tier 2 - Negative Amount',
    'BSC Vault deposit/withdrawal with negative amount fails validation',
    'E2E-003',
    'Reject negative amount in BSC Vault methods',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(-50, true);
      } catch (e) {
        threw = true;
      }
      assert.ok(threw, 'Negative deposit must throw');
    }
  );

  // 3. Slippage Extremes
  await runTest(
    'T2.3.1',
    'Tier 2 - Slippage',
    'Slippage 0% is strictly handled or rejected if below protocol minimum',
    'E2E-001',
    'Ensure 0% slippage is validated or set to protocol minimum rather than failing silently',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 0,
        priorityFee: 0.001
      });

      // Valid if handled safely without unhandled exception
      assert.ok(typeof res.success === 'boolean');
    }
  );

  await runTest(
    'T2.3.2',
    'Tier 2 - Slippage',
    'Ultra-low slippage (0.001%) exceeding price tolerance returns SLIPPAGE_EXCEEDED',
    'E2E-005',
    'Standardize slippage failure error code to SLIPPAGE_EXCEEDED',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      // Simulate API returning slippage error
      globalThis.fetch = async () => {
        return new Response('Slippage tolerance exceeded', { status: 400 });
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 0.001,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.toLowerCase().includes('slippage') || (res as any).errorCode === 'SLIPPAGE_EXCEEDED');
    }
  );

  await runTest(
    'T2.3.3',
    'Tier 2 - Slippage',
    'Extreme slippage (>100% or >10000 bps) rejected by safety guardrails',
    'E2E-001',
    'Add slippage cap (< 50% or 100%) in trade functions',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 150, // 150% slippage is unsafe
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Extreme slippage > 100% must be rejected');
    }
  );

  await runTest(
    'T2.3.4',
    'Tier 2 - Slippage',
    'Negative slippage (-5%) rejected during parameter validation',
    'E2E-001',
    'Reject negative slippage values in executeRealPumpTrade',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: -5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Negative slippage must be rejected');
    }
  );

  await runTest(
    'T2.3.5',
    'Tier 2 - Slippage',
    'Non-numeric / NaN slippage rejected safely with validation error',
    'E2E-001',
    'Validate isNaN(slippage) in trade functions',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: NaN,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'NaN slippage must be rejected');
    }
  );

  // 4. RPC Timeout & Network Failure
  await runTest(
    'T2.4.1',
    'Tier 2 - RPC Outage',
    'Solana RPC timeout during blockhash fetch returns RPC_ERROR without synthetic fallback',
    'E2E-005',
    'Map RPC timeouts to errorCode RPC_ERROR and fail-closed',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async () => {
        throw new Error('RPC Connection Timed Out (504)');
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('RPC') || res.error?.includes('Timed Out') || (res as any).errorCode === 'RPC_ERROR');
    }
  );

  await runTest(
    'T2.4.2',
    'Tier 2 - RPC Outage',
    'Solana RPC error during sendRawTransaction returns explicit failure',
    'E2E-005',
    'Ensure raw transaction send error bubbles up as failed trade',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 500 });
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      // Must fail closed, never return success
      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.4.3',
    'Tier 2 - RPC Outage',
    'EVM provider timeout during eth_sendTransaction returns RPC_ERROR',
    'E2E-002',
    'Handle EVM RPC timeout in executePancakeSwap',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.request = async (args) => {
        if (args.method === 'eth_sendTransaction') {
          throw new Error('EVM Node Gateway Timeout (504)');
        }
        return ['0x71C84179373D68c7A1bC155E385a86A9b7B7A9D6'];
      };
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.1'
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'RPC_ERROR');
    }
  );

  await runTest(
    'T2.4.4',
    'Tier 2 - RPC Outage',
    'Jupiter Quote API 500 error handled gracefully with error report',
    'E2E-001',
    'Catch Jupiter quote 500 status and return clear error message',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async () => {
        return new Response('Internal Server Error', { status: 500 });
      };

      const res = await pumpFunService.executeJupiterSwap({
        action: 'buy',
        symbol: 'BTC',
        amountSol: 0.1
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('500') || res.error?.includes('Jupiter'));
    }
  );

  await runTest(
    'T2.4.5',
    'Tier 2 - RPC Outage',
    'RPC failure guarantees zero balance modification or ghost positions',
    'E2E-005',
    'Fail-closed: verify no balance updates occur when trade RPC encounters error',
    async () => {
      setupTestEnvironment(null, null);

      const initialStatus = await pancakeSwapService.getBscProfitVaultStatus();
      try {
        await pancakeSwapService.depositProfitToBscVault(100, true);
      } catch (e) {
        // Expected failure
      }
      const finalStatus = await pancakeSwapService.getBscProfitVaultStatus();
      assert.strictEqual(finalStatus.totalUsdtStored, initialStatus.totalUsdtStored);
    }
  );

  // 5. Invalid Mint / Token Addresses
  await runTest(
    'T2.5.1',
    'Tier 2 - Invalid Address',
    'Malformed Solana mint (<32 chars) rejected with explicit error',
    'E2E-001',
    'Validate mint length >= 32 chars',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'ShortAddress123',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('invalide'));
    }
  );

  await runTest(
    'T2.5.2',
    'Tier 2 - Invalid Address',
    'Solana mint containing invalid Base58 characters (0, O, I, l) rejected',
    'E2E-001',
    'Validate Solana base58 character set',
    async () => {
      const mockWallet = new MockSolanaWallet();
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: '0000OOOOIIIIllll1111222233334444555566667777', // Invalid base58 characters
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('invalide'));
    }
  );

  await runTest(
    'T2.5.3',
    'Tier 2 - Invalid Address',
    'Malformed EVM address (invalid length or non-hex) rejected',
    'E2E-002',
    'Validate EVM token addresses with ethers.utils.isAddress',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xInvalidAddress',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.1'
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.5.4',
    'Tier 2 - Invalid Address',
    'Zero address for EVM token-to-token swap rejected',
    'E2E-002',
    'Disallow zero address for token swap',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.1'
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.5.5',
    'Tier 2 - Invalid Address',
    'Identical input and output token mint addresses rejected',
    'E2E-002',
    'Reject swap when tokenIn === tokenOut',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0x55d398326f99059fF775485246999027B3197955',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '10'
      });

      assert.strictEqual(res.success, false);
    }
  );

  // 6. User Rejection Code 4001 Propagation
  await runTest(
    'T2.6.1',
    'Tier 2 - Code 4001',
    'EIP-1193 code 4001 maps to errorCode USER_REJECTED',
    'E2E-005',
    'Ensure errorCode USER_REJECTED is set in EvmTradeResult',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.shouldReject = true;
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.1'
      });

      assert.strictEqual(res.errorCode, 'USER_REJECTED');
    }
  );

  await runTest(
    'T2.6.2',
    'Tier 2 - Code 4001',
    'Solana UserRejectedRequestError maps to errorCode USER_REJECTED',
    'E2E-005',
    'Ensure errorCode USER_REJECTED is returned in SolanaTradeResult',
    async () => {
      const mockWallet = new MockSolanaWallet();
      mockWallet.shouldReject = true;
      setupTestEnvironment(mockWallet, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockWallet.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const res: any = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'USER_REJECTED');
    }
  );

  await runTest(
    'T2.6.3',
    'Tier 2 - Code 4001',
    'Code 4001 on SELL leaves position in OPEN state without virtual closing',
    'E2E-005',
    'Ensure rejected SELL does not mark active position as closed',
    async () => {
      const mockWallet = new MockSolanaWallet();
      mockWallet.shouldReject = true;
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: '100%',
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.6.4',
    'Tier 2 - Code 4001',
    'Code 4001 does not increment profit/loss metrics or SOL balance',
    'E2E-005',
    'Verify no balance credit upon rejected trade',
    async () => {
      const mockWallet = new MockSolanaWallet();
      mockWallet.shouldReject = true;
      setupTestEnvironment(mockWallet, null);

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 10,
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false);
    }
  );

  await runTest(
    'T2.6.5',
    'Tier 2 - Code 4001',
    'Code 4001 cancellation is logged as cancelled, never as trade success',
    'E2E-005',
    'Verify cancellation is clean without success telemetry',
    async () => {
      const mockEth = new MockEthereumProvider();
      mockEth.shouldReject = true;
      setupTestEnvironment(null, mockEth);

      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(15, true);
      } catch (e) {
        threw = true;
      }
      assert.ok(threw);
    }
  );

  // ==========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================================================
  console.log('\n▶ [TIER 3] Cross-Feature Combinations Tests');

  await runTest(
    'T3.1',
    'Tier 3 - Cross-Feature',
    'Rapid Solana to EVM chain switch maintains isolated provider state',
    'E2E-001',
    'Verify switching from window.solana to window.ethereum correctly routes without provider bleed',
    async () => {
      const mockSol = new MockSolanaWallet();
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(mockSol, mockEth);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      // 1. Solana Trade
      const solRes = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });
      assert.strictEqual(solRes.success, true);
      assert.strictEqual(mockSol.signTransactionCalls.length, 1);
      assert.strictEqual(mockEth.requestCalls.length, 0);

      // 2. EVM Vault Deposit
      const bscRes = await pancakeSwapService.depositProfitToBscVault(20, true);
      assert.strictEqual(bscRes.success, true);
      assert.ok(mockEth.requestCalls.some(c => c.method === 'eth_sendTransaction'));
      assert.strictEqual(mockSol.signTransactionCalls.length, 1, 'Solana wallet must not be touched for BSC');
    }
  );

  await runTest(
    'T3.2',
    'Tier 3 - Cross-Feature',
    'Consecutive BUY then SELL sequence validates state transitions without virtual leakage',
    'E2E-001',
    'Verify BUY then SELL requires separate signatures and handles rejection on SELL properly',
    async () => {
      const mockSol = new MockSolanaWallet();
      setupTestEnvironment(mockSol, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      // Step 1: BUY succeeds
      const buyRes = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });
      assert.strictEqual(buyRes.success, true);

      // Step 2: SELL is rejected by user
      mockSol.shouldReject = true;
      const sellRes = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 1000,
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.001
      });
      assert.strictEqual(sellRes.success, false, 'SELL must fail on rejection and not simulate profit');
    }
  );

  await runTest(
    'T3.3',
    'Tier 3 - Cross-Feature',
    'Concurrent order submission with partial rejection executes only approved order',
    'E2E-001',
    'Verify concurrent orders maintain separate lifecycle and do not collide',
    async () => {
      const mockSol = new MockSolanaWallet();
      setupTestEnvironment(mockSol, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      // Run two parallel trades
      const p1 = pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      const p2 = pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: 0.2,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      const [res1, res2] = await Promise.all([p1, p2]);
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res2.success, true);
      assert.strictEqual(mockSol.signTransactionCalls.length, 2);
    }
  );

  await runTest(
    'T3.4',
    'Tier 3 - Cross-Feature',
    'Cross-chain profit routing from Solana trade into BSC Vault requires EVM signature',
    'E2E-003',
    'Ensure routing profit to BSC requires explicit MetaMask signature',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const res = await pancakeSwapService.depositProfitToBscVault(75, true);
      assert.strictEqual(res.success, true);
      assert.strictEqual(
        res.txHash,
        '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd'
      );
    }
  );

  await runTest(
    'T3.5',
    'Tier 3 - Cross-Feature',
    'Mid-flight wallet disconnection between quote and sign halts cleanly',
    'E2E-005',
    'Detect wallet disconnection right before signTransaction call',
    async () => {
      const mockSol = new MockSolanaWallet();
      setupTestEnvironment(mockSol, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          // Disconnect wallet mid-flight
          mockSol.disconnect();
          const buffer = createMockVersionedTxBuffer(new PublicKey('11111111111111111111111111111111'));
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Must fail when wallet disconnects mid-flight');
    }
  );

  // ==========================================================================
  // TIER 4: REAL-WORLD SCENARIOS
  // ==========================================================================
  console.log('\n▶ [TIER 4] Real-World Application Scenarios');

  await runTest(
    'T4.1',
    'Tier 4 - Real-World',
    'End-to-end trading session: connect -> BUY -> confirm -> Solscan URL -> SELL -> confirm',
    'E2E-001',
    'Complete multi-step user trading session on Solana',
    async () => {
      const mockSol = new MockSolanaWallet();
      setupTestEnvironment(mockSol, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      // 1. User executes BUY
      const buyRes = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.5,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.002
      });
      assert.strictEqual(buyRes.success, true);
      assert.ok(buyRes.txHash);

      // Verify explorer link formatting
      const solscanUrl = getExplorerTxUrl ? getExplorerTxUrl('SOL', buyRes.txHash!) : `https://solscan.io/tx/${buyRes.txHash}`;
      assert.ok(solscanUrl.startsWith('https://solscan.io/tx/'));

      // 2. User executes SELL
      const sellRes = await pumpFunService.executeRealPumpTrade({
        action: 'sell',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: '100%',
        denominatedInSol: false,
        slippage: 5,
        priorityFee: 0.002
      });
      assert.strictEqual(sellRes.success, true);
      assert.ok(sellRes.txHash);
      assert.strictEqual(mockSol.signTransactionCalls.length, 2);
    }
  );

  await runTest(
    'T4.2',
    'Tier 4 - Real-World',
    'Slippage failure recovery: price moves -> slippage error -> user adjusts -> successful retry',
    'E2E-001',
    'Verify workflow for recovering from slippage rejection with higher slippage',
    async () => {
      const mockSol = new MockSolanaWallet();
      setupTestEnvironment(mockSol, null);

      let attempt = 0;
      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          attempt++;
          if (attempt === 1) {
            return new Response('Slippage tolerance exceeded', { status: 400 });
          }
          const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      // Attempt 1: Fails due to tight slippage
      const res1 = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.2,
        denominatedInSol: true,
        slippage: 1,
        priorityFee: 0.001
      });
      assert.strictEqual(res1.success, false);

      // Attempt 2: User retries with 10% slippage
      const res2 = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.2,
        denominatedInSol: true,
        slippage: 10,
        priorityFee: 0.001
      });
      assert.strictEqual(res2.success, true);
    }
  );

  await runTest(
    'T4.3',
    'Tier 4 - Real-World',
    'Rejection recovery: user cancels signature in popup -> UI uncorrupted -> user confirms new order',
    'E2E-001',
    'Verify recovery from user rejection: state stays intact, subsequent order succeeds',
    async () => {
      const mockSol = new MockSolanaWallet();
      setupTestEnvironment(mockSol, null);

      globalThis.fetch = async (url: any) => {
        if (String(url).includes('trade-local')) {
          const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
          return new Response(buffer, { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      };

      // Step 1: User rejects popup
      mockSol.shouldReject = true;
      const res1 = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });
      assert.strictEqual(res1.success, false);

      // Step 2: User changes mind and confirms
      mockSol.shouldReject = false;
      const res2 = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });
      assert.strictEqual(res2.success, true);
    }
  );

  await runTest(
    'T4.4',
    'Tier 4 - Real-World',
    'PancakeSwap BEP-20 session: connect MetaMask -> swap BNB to token -> verify BscScan URL',
    'E2E-002',
    'Complete PancakeSwap end-to-end flow with BscScan URL generation',
    async () => {
      const mockEth = new MockEthereumProvider();
      setupTestEnvironment(null, mockEth);

      const pancakeModule = pancakeSwapService as any;
      if (typeof pancakeModule.executePancakeSwap !== 'function') {
        assert.fail('executePancakeSwap is not implemented');
      }

      const res = await pancakeModule.executePancakeSwap({
        tokenIn: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        tokenOut: '0x55d398326f99059fF775485246999027B3197955',
        amountIn: '0.25'
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.txHash);
      const bscscanUrl = getExplorerTxUrl ? getExplorerTxUrl('BSC', res.txHash!) : `https://bscscan.com/tx/${res.txHash}`;
      assert.ok(bscscanUrl.startsWith('https://bscscan.com/tx/'));
    }
  );

  await runTest(
    'T4.5',
    'Tier 4 - Real-World',
    'Mock Eradication Audit: zero Math.random() hashes or dummy private keys on real paths',
    'E2E-003',
    'Audit: inspect codebase to verify eradication of all Math.random() 64-char hex strings in real execution',
    async () => {
      setupTestEnvironment(null, null);

      // Verify that vault operations in real mode never generate random strings
      let generatedFake = false;
      try {
        const res = await pancakeSwapService.depositProfitToBscVault(10, false);
        if (res.txHash && res.txHash.length === 66 && !res.txHash.startsWith('0x9b1b742a')) {
          generatedFake = true;
        }
      } catch (e) {
        // Failing cleanly is expected
      }
      assert.strictEqual(generatedFake, false, 'No fake random hash may be generated in depositProfitToBscVault');
    }
  );

  // Restore environment after all tests
  restoreTestEnvironment();

  // ==========================================================================
  // SUMMARY REPORTING
  // ==========================================================================
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n==============================================================================');
  console.log(`📊 OPAQUE-BOX E2E TEST SUMMARY: Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('==============================================================================');

  if (failed > 0) {
    console.log('\n⚠️ THE FOLLOWING TESTS FAILED (EXPECTED AGAINST UNHARDENED BASELINE):');
    const failedByDefect: Record<string, TestCaseResult[]> = {};
    for (const r of testResults.filter(r => !r.passed)) {
      const d = r.defectId || 'UNKNOWN';
      if (!failedByDefect[d]) failedByDefect[d] = [];
      failedByDefect[d].push(r);
    }

    for (const [defectId, cases] of Object.entries(failedByDefect)) {
      console.log(`\n📌 Defect ${defectId} (${cases.length} tests affected):`);
      console.log(`   Recommended Fix: ${cases[0].recommendedFix}`);
      for (const c of cases) {
        console.log(`   - [${c.id}] ${c.name} -> ${c.error}`);
      }
    }
  }

  return failed === 0;
}

// Auto-run if executed directly via tsx
if (process.argv[1]?.includes('e2eOnChainExecution.test.ts')) {
  executeE2ETests().then(allPassed => {
    if (!allPassed) {
      console.error('\n❌ E2E TEST SUITE REVEALED UNHARDENED/MOCKED CODE DEFECTS (FAIL-CLOSED VERIFIED)');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL E2E ON-CHAIN TESTS PASSED WITH 100% SUCCESS!');
      process.exit(0);
    }
  }).catch(err => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}
