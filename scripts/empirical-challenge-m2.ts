import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import uniswapV2RouterAbi from '../src/abi/uniswap-v2-router-abi.json';
import * as pancakeSwapService from '../src/services/pancakeSwapService';
import * as crossChainRouterService from '../src/services/crossChainRouterService';
import * as pumpFunService from '../src/services/pumpFunService';
import { getExplorerTxUrl } from '../src/utils/explorerLinks';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

// Valid EIP-55 Checksummed Addresses
const VALID_CHECKSUM_USER = '0x71c84179373d68c7a1bC155E385A86a9B7b7a9D6';
const LOWERCASE_USER = '0x71c84179373d68c7a1bc155e385a86a9b7b7a9d6';
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const USDT = '0x55d398326f99059fF775485246999027B3197955';
const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const VAULT_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

// --- MOCKS ---

class MockSolanaWallet {
  isPhantom = true;
  isConnected = true;
  publicKey: PublicKey | null;
  signTransactionCalls: VersionedTransaction[] = [];
  shouldReject = false;

  constructor(pubKeyStr = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU') {
    this.publicKey = new PublicKey(pubKeyStr);
  }

  async signTransaction(tx: VersionedTransaction): Promise<VersionedTransaction> {
    if (this.shouldReject) {
      const err: any = new Error('User rejected the transaction');
      err.code = 4001;
      err.name = 'UserRejectedRequestError';
      throw err;
    }
    this.signTransactionCalls.push(tx);
    return tx;
  }
}

class MockEthereumProvider {
  isMetaMask = true;
  selectedAddress: string | null = VALID_CHECKSUM_USER;
  chainId = '0x38';
  requestCalls: { method: string; params?: any[] }[] = [];
  shouldReject = false;
  shouldTimeout = false;

  async request(args: { method: string; params?: any[] }): Promise<any> {
    this.requestCalls.push(args);
    if (this.shouldTimeout) {
      throw new Error('EVM Provider Request Timeout (504)');
    }
    if (this.shouldReject) {
      const err: any = new Error('User rejected transaction in MetaMask');
      err.code = 4001;
      throw err;
    }
    switch (args.method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return this.selectedAddress ? [this.selectedAddress] : [];
      case 'eth_chainId':
        return this.chainId;
      case 'wallet_switchEthereumChain':
        this.chainId = args.params?.[0]?.chainId || '0x38';
        return null;
      case 'eth_sendTransaction':
        return '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd';
      default:
        return null;
    }
  }
}

function setupMockEnvironment(mockEth: MockEthereumProvider | null) {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  (globalThis as any).window = {
    ethereum: mockEth,
    localStorage: mockLocalStorage
  };
  (globalThis as any).localStorage = mockLocalStorage;
}

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

// Harness
let passed = 0;
let failed = 0;
const failures: string[] = [];

async function challenge(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(`${name}: ${err?.message || err}`);
    console.log(`  FAIL: ${name}`);
    console.log(`    -> ${err?.message || err}`);
  }
}

async function runEmpiricalChallenges() {
  console.log('===============================================================');
  console.log('CHALLENGER M2-2: EMPIRICAL STRESS TEST & VERIFICATION HARNESS');
  console.log('===============================================================\n');

  const iface = new ethers.utils.Interface(uniswapV2RouterAbi);

  // 1. CHECKSUM VERIFICATION OF HARDCODED CONSTANTS
  console.log('\n--- 1. Checksum Verifications of Protocol Constants ---');
  await challenge('PANCAKE_ROUTER address (0x10ED...) is valid EIP-55 checksum', async () => {
    assert.strictEqual(ethers.utils.getAddress(PANCAKE_ROUTER), PANCAKE_ROUTER);
  });

  await challenge('WBNB address (0xbb4C...) is valid EIP-55 checksum', async () => {
    assert.strictEqual(ethers.utils.getAddress(WBNB), WBNB);
  });

  await challenge('USDT address (0x55d3...) is valid EIP-55 checksum', async () => {
    assert.strictEqual(ethers.utils.getAddress(USDT), USDT);
  });

  await challenge('BUSD address (0xe9e7...) is valid EIP-55 checksum', async () => {
    assert.strictEqual(ethers.utils.getAddress(BUSD), BUSD);
  });

  await challenge('BSC Vault address (0x7a25...) is valid EIP-55 checksum', async () => {
    assert.strictEqual(ethers.utils.getAddress(VAULT_ADDRESS), VAULT_ADDRESS);
  });

  // 2. PANCAKESWAP BNB -> TOKEN
  console.log('\n--- 2. PancakeSwap BNB -> Token Swap ---');
  await challenge('BNB -> USDT: calls swapExactETHForTokens with correct calldata, value, and recipient', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.5',
      ethereumProvider: mockEth
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.txHash, '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd');
    assert.strictEqual(res.explorerUrl, 'https://bscscan.com/tx/0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd');

    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    assert.ok(sendTxCall);
    const txParams = sendTxCall.params![0];

    // Check addresses
    assert.strictEqual(txParams.to, PANCAKE_ROUTER);
    assert.strictEqual(ethers.utils.getAddress(txParams.to), PANCAKE_ROUTER);

    // Check value
    const expectedValue = ethers.utils.parseEther('0.5').toHexString();
    assert.strictEqual(txParams.value, expectedValue);

    // Decode calldata
    const parsed = iface.parseTransaction({ data: txParams.data, value: txParams.value });
    assert.strictEqual(parsed.name, 'swapExactETHForTokens');
    assert.strictEqual(parsed.args.amountOutMin.toString(), '0');
    assert.deepStrictEqual(parsed.args.path, [ethers.utils.getAddress(WBNB), ethers.utils.getAddress(USDT)]);
    assert.strictEqual(parsed.args.to, ethers.utils.getAddress(mockEth.selectedAddress!));
  });

  // 3. PANCAKESWAP TOKEN -> BNB
  console.log('\n--- 3. PancakeSwap Token -> BNB Swap ---');
  await challenge('USDT -> BNB: calls swapExactTokensForETH with correct calldata and value 0x0', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: USDT,
      tokenOut: WBNB,
      amountIn: '100',
      ethereumProvider: mockEth
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.txHash, '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd');

    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    assert.ok(sendTxCall);
    const txParams = sendTxCall.params![0];

    // Check addresses and value
    assert.strictEqual(txParams.to, PANCAKE_ROUTER);
    assert.strictEqual(txParams.value, '0x0');

    // Decode calldata
    const parsed = iface.parseTransaction({ data: txParams.data, value: txParams.value });
    assert.strictEqual(parsed.name, 'swapExactTokensForETH');
    assert.strictEqual(parsed.args.amountIn.toString(), ethers.utils.parseUnits('100', 18).toString());
    assert.strictEqual(parsed.args.amountOutMin.toString(), '0');
    assert.deepStrictEqual(parsed.args.path, [ethers.utils.getAddress(USDT), ethers.utils.getAddress(WBNB)]);
    assert.strictEqual(parsed.args.to, ethers.utils.getAddress(mockEth.selectedAddress!));
  });

  // 4. PANCAKESWAP TOKEN -> TOKEN
  console.log('\n--- 4. PancakeSwap Token -> Token Swap ---');
  await challenge('USDT -> BUSD: calls swapExactTokensForTokens with intermediary WBNB path and value 0x0', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: USDT,
      tokenOut: BUSD,
      amountIn: '250',
      ethereumProvider: mockEth
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.txHash, '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd');

    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    assert.ok(sendTxCall);
    const txParams = sendTxCall.params![0];

    // Check addresses and value
    assert.strictEqual(txParams.to, PANCAKE_ROUTER);
    assert.strictEqual(txParams.value, '0x0');

    // Decode calldata
    const parsed = iface.parseTransaction({ data: txParams.data, value: txParams.value });
    assert.strictEqual(parsed.name, 'swapExactTokensForTokens');
    assert.strictEqual(parsed.args.amountIn.toString(), ethers.utils.parseUnits('250', 18).toString());
    assert.strictEqual(parsed.args.amountOutMin.toString(), '0');
    assert.deepStrictEqual(parsed.args.path, [
      ethers.utils.getAddress(USDT),
      ethers.utils.getAddress(WBNB),
      ethers.utils.getAddress(BUSD)
    ]);
    assert.strictEqual(parsed.args.to, ethers.utils.getAddress(mockEth.selectedAddress!));
  });

  // 5. PANCAKESWAP ADVERSARIAL EDGE CASES & CHECKSUMS
  console.log('\n--- 5. PancakeSwap Adversarial Inputs & Provider Normalization ---');
  await challenge('Lowercased token addresses are accepted and checksummed in calldata path', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: USDT.toLowerCase(),
      tokenOut: BUSD.toLowerCase(),
      amountIn: '10',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, true);
    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    const parsed = iface.parseTransaction({ data: sendTxCall!.params![0].data, value: sendTxCall!.params![0].value });
    assert.deepStrictEqual(parsed.args.path, [
      ethers.utils.getAddress(USDT),
      ethers.utils.getAddress(WBNB),
      ethers.utils.getAddress(BUSD)
    ]);
  });

  await challenge('Custom toAddress recipient is honored and checksummed', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const customRecipient = '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae';
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '1',
      toAddress: customRecipient,
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, true);
    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    const parsed = iface.parseTransaction({ data: sendTxCall!.params![0].data, value: sendTxCall!.params![0].value });
    assert.strictEqual(parsed.args.to, ethers.utils.getAddress(customRecipient));
  });

  await challenge('Lowercase accounts[0] is forwarded to eth_sendTransaction as-is without EIP-55 checksumming', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);
    mockEth.selectedAddress = LOWERCASE_USER;

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, true);
    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    // Verify whether from is raw accounts[0]
    assert.strictEqual(sendTxCall!.params![0].from, LOWERCASE_USER);
  });

  await challenge('Invalid toAddress recipient throws unhandled exception rather than returning RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    let unhandledThrow = false;
    try {
      const res = await pancakeSwapService.executePancakeSwap({
        tokenIn: WBNB,
        tokenOut: USDT,
        amountIn: '1',
        toAddress: '0xinvalid_address',
        ethereumProvider: mockEth
      });
      if (!res.success) {
        // handled
      }
    } catch (err: any) {
      unhandledThrow = true;
    }
    // We document whether it threw an unhandled exception
    assert.strictEqual(unhandledThrow, true, 'Calling executePancakeSwap with invalid toAddress throws unhandled error because cleanRecipient is outside try/catch');
  });

  await challenge('Rejection (4001) during switchEthereumChain returns USER_REJECTED', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    mockEth.chainId = '0x1'; // Wrong chain: Ethereum Mainnet
    const origRequest = mockEth.request.bind(mockEth);
    mockEth.request = async (args) => {
      if (args.method === 'wallet_switchEthereumChain') {
        const err: any = new Error('User rejected chain switch');
        err.code = 4001;
        throw err;
      }
      return origRequest(args);
    };

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
  });

  await challenge('Zero address is rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: ethers.constants.AddressZero,
      tokenOut: USDT,
      amountIn: '1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
  });

  await challenge('Identical tokens are rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: USDT,
      tokenOut: USDT.toLowerCase(),
      amountIn: '1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
  });

  await challenge('Empty accounts array returns WALLET_NOT_CONNECTED', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);
    mockEth.selectedAddress = null;

    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'WALLET_NOT_CONNECTED');
  });

  // 6. BSC VAULT DEPOSITS AND WITHDRAWALS
  console.log('\n--- 6. BSC Vault Empirical Tests ---');
  await challenge('BSC Vault deposit calls eth_sendTransaction with checksummed vaultAddress & accounts[0]', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const res = await pancakeSwapService.depositProfitToBscVault(50, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.txHash, '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd');

    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    assert.ok(sendTxCall);
    const txParams = sendTxCall.params![0];
    assert.strictEqual(txParams.to, VAULT_ADDRESS);
    assert.strictEqual(ethers.utils.getAddress(txParams.to), VAULT_ADDRESS);
    assert.strictEqual(ethers.utils.getAddress(txParams.from), VALID_CHECKSUM_USER);
    assert.ok(txParams.value.startsWith('0x'));
  });

  await challenge('BSC Vault withdrawal calls eth_sendTransaction with value 0x0 and data 0x', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    // Deposit first to have balance
    await pancakeSwapService.depositProfitToBscVault(100, true);
    mockEth.requestCalls = [];

    const res = await pancakeSwapService.withdrawProfitFromBscVault(40, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.txHash, '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd');

    const sendTxCall = mockEth.requestCalls.find(c => c.method === 'eth_sendTransaction');
    assert.ok(sendTxCall);
    const txParams = sendTxCall.params![0];
    assert.strictEqual(txParams.to, VAULT_ADDRESS);
    assert.strictEqual(txParams.value, '0x0');
    assert.strictEqual(txParams.data, '0x');
    assert.strictEqual(ethers.utils.getAddress(txParams.from), VALID_CHECKSUM_USER);
  });

  await challenge('BSC Vault withdrawal exceeding balance throws immediately without calling RPC', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);
    mockEth.requestCalls = [];

    let threw = false;
    try {
      await pancakeSwapService.withdrawProfitFromBscVault(9999999, true);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.toLowerCase().includes('insuffisant') || e.message.toLowerCase().includes('solde'));
    }
    assert.strictEqual(threw, true);
    assert.strictEqual(mockEth.requestCalls.length, 0, 'Must not call eth_sendTransaction on insufficient balance');
  });

  await challenge('BSC Vault deposit rejection (4001) throws and preserves previous balance', async () => {
    const mockEth = new MockEthereumProvider();
    setupMockEnvironment(mockEth);

    const statusBefore = await pancakeSwapService.getBscProfitVaultStatus();
    mockEth.shouldReject = true;

    let threw = false;
    try {
      await pancakeSwapService.depositProfitToBscVault(100, true);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('refusé'));
    }
    assert.strictEqual(threw, true);
    const statusAfter = await pancakeSwapService.getBscProfitVaultStatus();
    assert.strictEqual(statusAfter.totalUsdtStored, statusBefore.totalUsdtStored);
  });

  // 7. EXPLORER URLS
  console.log('\n--- 7. Explorer URL Verification ---');
  await challenge('getExplorerTxUrl produces correct URLs across chains and case variations', async () => {
    const hash = '0x9b1b742a03cf1c9447385a86a9b7b7a9d60123456789abcdef0123456789abcd';
    assert.strictEqual(getExplorerTxUrl('BSC', hash), `https://bscscan.com/tx/${hash}`);
    assert.strictEqual(getExplorerTxUrl('bsc', hash), `https://bscscan.com/tx/${hash}`);
    assert.strictEqual(getExplorerTxUrl('EVM', hash), `https://bscscan.com/tx/${hash}`);
    assert.strictEqual(getExplorerTxUrl('SOL', 'mockSolSig123'), 'https://solscan.io/tx/mockSolSig123');
    assert.strictEqual(getExplorerTxUrl('SOLANA', 'mockSolSig123'), 'https://solscan.io/tx/mockSolSig123');
    assert.strictEqual(getExplorerTxUrl('BSC', ''), '');
  });

  // 8. SOLANA T2.4.2 FAIL-CLOSED ERROR HANDLING
  console.log('\n--- 8. Solana T2.4.2 Fail-Closed Error Handling ---');
  await challenge('Solana T2.4.2: RPC 500 error during sendRawTransaction returns res.success === false', async () => {
    const mockSol = new MockSolanaWallet();
    const originalFetch = globalThis.fetch;
    delete process.env.SOLANA_PRIVATE_KEY;

    (globalThis as any).window = {
      solana: mockSol,
      phantom: { solana: mockSol }
    };

    globalThis.fetch = async (url: any) => {
      if (String(url).includes('trade-local')) {
        const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
        return new Response(buffer, { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'RPC Server Error' }), { status: 500 });
    };

    try {
      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Trade MUST fail closed on RPC error');
      assert.strictEqual(res.errorCode, 'RPC_ERROR');
      assert.ok(res.error, 'Must have descriptive error');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await challenge('Solana T2.4.2: Network drop (throw) during RPC send returns res.success === false', async () => {
    const mockSol = new MockSolanaWallet();
    const originalFetch = globalThis.fetch;
    delete process.env.SOLANA_PRIVATE_KEY;

    (globalThis as any).window = {
      solana: mockSol,
      phantom: { solana: mockSol }
    };

    globalThis.fetch = async (url: any) => {
      if (String(url).includes('trade-local')) {
        const buffer = createMockVersionedTxBuffer(mockSol.publicKey!);
        return new Response(buffer, { status: 200 });
      }
      throw new Error('Connection refused / ECONNREFUSED');
    };

    try {
      const res = await pumpFunService.executeRealPumpTrade({
        action: 'buy',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        amount: 0.1,
        denominatedInSol: true,
        slippage: 5,
        priorityFee: 0.001
      });

      assert.strictEqual(res.success, false, 'Trade MUST fail closed on network drop');
      assert.strictEqual(res.errorCode, 'RPC_ERROR');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Summary
  console.log('\n===============================================================');
  console.log(`EMPIRICAL CHALLENGE RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('\nFAILURES:');
    for (const f of failures) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\nALL EMPIRICAL CHALLENGES PASSED SUCCESSFULLY! 🎯');
  }
}

runEmpiricalChallenges().catch(err => {
  console.error('Fatal challenge runner error:', err);
  process.exit(1);
});
