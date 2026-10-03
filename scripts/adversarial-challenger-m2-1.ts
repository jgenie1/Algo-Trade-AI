import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import * as pancakeSwapService from '../src/services/pancakeSwapService';
import * as crossChainRouterService from '../src/services/crossChainRouterService';

// --- MOCK ETHEREUM PROVIDER ---
class MockEthereumProvider {
  isMetaMask = true;
  selectedAddress: string | null = '0x71C84179373D68c7A1bC155E385a86A9b7B7A9D6';
  chainId = '0x38'; // 56
  requestCalls: { method: string; params?: any[] }[] = [];
  rejectionConfig: {
    rejectOnMethod?: string;
    code?: number;
    message?: string;
  } | null = null;
  shouldTimeout = false;
  accountsOverride: string[] | null = null;

  async request(args: { method: string; params?: any[] }): Promise<any> {
    this.requestCalls.push(args);

    if (this.shouldTimeout) {
      throw new Error('EVM Provider Timeout (504)');
    }

    if (this.rejectionConfig) {
      if (!this.rejectionConfig.rejectOnMethod || this.rejectionConfig.rejectOnMethod === args.method) {
        const err: any = new Error(this.rejectionConfig.message || 'User rejected the request');
        if (this.rejectionConfig.code !== undefined) {
          err.code = this.rejectionConfig.code;
        }
        throw err;
      }
    }

    switch (args.method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        if (this.accountsOverride !== null) {
          return this.accountsOverride;
        }
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

let passedCount = 0;
let failedCount = 0;
const failureDetails: string[] = [];

async function testCase(id: string, description: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    passedCount++;
    console.log(`  [PASS] ${id}: ${description}`);
  } catch (err: any) {
    failedCount++;
    failureDetails.push(`${id} - ${description}: ${err?.message || err}`);
    console.error(`  [FAIL] ${id}: ${description}`);
    console.error(`         Error: ${err?.message || err}`);
  }
}

async function runAdversarialSuite() {
  console.log('================================================================');
  console.log('ADVERSARIAL EMPIRICAL CHALLENGE SUITE: CHALLENGER_M2_1');
  console.log('Focus: Disconnected Wallets, User Rejections (4001), Zero/Neg Amounts, Invalid Addresses');
  console.log('================================================================\n');

  const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const USDT = '0x55d398326f99059fF775485246999027B3197955';
  const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';

  // --------------------------------------------------------------------------
  // SECTION 1: DISCONNECTED WALLETS (T1.5.3, T1.5.4 & ADVERSARIAL VARIANTS)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Disconnected Wallets ---');

  await testCase('T1.5.3', 'PancakeSwap swap with no ethereumProvider and no window.ethereum returns WALLET_NOT_CONNECTED', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      const res = await pancakeSwapService.executePancakeSwap({
        tokenIn: WBNB,
        tokenOut: USDT,
        amountIn: '0.1'
      });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'WALLET_NOT_CONNECTED');
      assert.strictEqual(res.txHash, undefined);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('T1.5.3-B', 'PancakeSwap swap with explicit null ethereumProvider and no window.ethereum', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      const res = await pancakeSwapService.executePancakeSwap({
        tokenIn: WBNB,
        tokenOut: USDT,
        amountIn: '0.1',
        ethereumProvider: null
      });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'WALLET_NOT_CONNECTED');
      assert.strictEqual(res.txHash, undefined);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('T1.5.3-C', 'PancakeSwap swap when ethereumProvider returns empty accounts array []', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.accountsOverride = []; // No unlocked account
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'WALLET_NOT_CONNECTED');
    assert.strictEqual(res.txHash, undefined);
  });

  await testCase('T1.5.3-D', 'PancakeSwap swap when accounts request throws non-rejection connection error', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.request = async (args) => {
      if (args.method === 'eth_accounts' || args.method === 'eth_requestAccounts') {
        throw new Error('Connection lost to Ethereum node');
      }
      return '0x38';
    };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'WALLET_NOT_CONNECTED');
    assert.strictEqual(res.txHash, undefined);
  });

  await testCase('T1.5.4', 'BSC Vault deposit with missing window.ethereum halts immediately with error', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(25, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('Un portefeuille Web3 EVM'), 'Must mention EVM wallet requirement');
      }
      assert.strictEqual(threw, true, 'depositProfitToBscVault must throw when wallet missing');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('T1.5.4-B', 'BSC Vault deposit when ethereum returns empty accounts [] throws unlocked account error', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      const mockEth = new MockEthereumProvider();
      mockEth.accountsOverride = [];
      (globalThis as any).window = { ethereum: mockEth };

      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(25, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('Aucun compte EVM déverrouillé'), 'Must mention no unlocked account');
      }
      assert.strictEqual(threw, true);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('T1.5.4-C', 'BSC Vault withdrawal with missing window.ethereum halts immediately with error', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      let threw = false;
      try {
        await pancakeSwapService.withdrawProfitFromBscVault(10, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('Un portefeuille Web3 EVM'), 'Must mention EVM wallet requirement');
      }
      assert.strictEqual(threw, true, 'withdrawProfitFromBscVault must throw when wallet missing');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('T1.5.4-D', 'CrossChainRouter real transfer from BSC without ethereum wallet halts with error message', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      const res = await crossChainRouterService.executeCrossChainTransfer('BSC', 'SOLANA', 100, 'USDT', true);
      assert.strictEqual(res.success, false);
      assert.ok(res.message.includes('portefeuille EVM'));
      assert.strictEqual(res.txHash, undefined);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 2: USER REJECTIONS (CODE 4001 & TEXTUAL REJECTIONS)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: User Rejections (code 4001, T1.6.3, T1.6.4, T2.6.1) ---');

  await testCase('T1.6.3', 'PancakeSwap swap with user rejection (code 4001 at eth_sendTransaction) aborts immediately', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', code: 4001, message: 'User rejected transaction' };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
    assert.strictEqual(res.txHash, undefined);
    assert.ok(res.error?.includes('refusé') || res.error?.includes('annulée'));
  });

  await testCase('T2.6.1', 'EIP-1193 code 4001 strictly maps to errorCode USER_REJECTED in EvmTradeResult', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', code: 4001, message: 'User rejected the request.' };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.5',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
    assert.strictEqual(res.success, false);
  });

  await testCase('T2.6.1-B', 'User rejection at wallet_switchEthereumChain (code 4001) maps to USER_REJECTED', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.chainId = '0x1'; // Not BSC
    mockEth.rejectionConfig = { rejectOnMethod: 'wallet_switchEthereumChain', code: 4001, message: 'User rejected chain switch' };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.5',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
    assert.strictEqual(res.txHash, undefined);
  });

  await testCase('T2.6.1-C', 'User rejection at eth_requestAccounts (code 4001) maps to USER_REJECTED', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.selectedAddress = null; // Forces eth_requestAccounts
    mockEth.rejectionConfig = { rejectOnMethod: 'eth_requestAccounts', code: 4001, message: 'User rejected connection' };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.5',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
    assert.strictEqual(res.txHash, undefined);
  });

  await testCase('T2.6.1-D', 'Textual rejection without code 4001 ("User denied transaction signature") maps to USER_REJECTED', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', message: 'User denied transaction signature' };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.5',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
    assert.strictEqual(res.txHash, undefined);
  });

  await testCase('T2.6.1-E', 'French textual rejection ("Transaction annulée par refus") maps to USER_REJECTED', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', message: 'Opération refusée par le signataire' };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0.5',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'USER_REJECTED');
    assert.strictEqual(res.txHash, undefined);
  });

  await testCase('T1.6.4', 'BSC Vault deposit with user rejection (code 4001) throws mentioning refusé and balance untouched', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      const mockEth = new MockEthereumProvider();
      mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', code: 4001, message: 'User cancelled' };
      (globalThis as any).window = { ethereum: mockEth };

      const statusBefore = await pancakeSwapService.getBscProfitVaultStatus();
      let threw = false;
      try {
        await pancakeSwapService.depositProfitToBscVault(50, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('refusé') || err.message.includes('annulé'), 'Error message must mention refusal/cancellation');
      }
      assert.strictEqual(threw, true);
      const statusAfter = await pancakeSwapService.getBscProfitVaultStatus();
      assert.strictEqual(statusAfter.totalUsdtStored, statusBefore.totalUsdtStored, 'Vault balance MUST remain unchanged on rejection');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('T1.6.4-B', 'BSC Vault withdrawal with user rejection (code 4001) throws and preserves balance', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      const mockEth = new MockEthereumProvider();
      (globalThis as any).window = { ethereum: mockEth };

      // Deposit first
      await pancakeSwapService.depositProfitToBscVault(100, true);
      const statusBefore = await pancakeSwapService.getBscProfitVaultStatus();

      mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', code: 4001, message: 'User cancelled' };
      let threw = false;
      try {
        await pancakeSwapService.withdrawProfitFromBscVault(40, true);
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('refusé') || err.message.includes('annulé'), 'Error message must mention refusal');
      }
      assert.strictEqual(threw, true);
      const statusAfter = await pancakeSwapService.getBscProfitVaultStatus();
      assert.strictEqual(statusAfter.totalUsdtStored, statusBefore.totalUsdtStored, 'Vault balance MUST remain unchanged on rejection');
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 3: ZERO AND NEGATIVE AMOUNTS (T2.1.4, T2.1.5, T2.2.4, T2.2.5)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Zero and Negative Amounts ---');

  await testCase('T2.1.4', 'PancakeSwap swap with "0" amount fails validation before any RPC call', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '0',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.ok(res.error?.includes('supérieur à zéro'));
    assert.strictEqual(mockEth.requestCalls.length, 0, 'Zero RPC calls must be made');
  });

  await testCase('T2.1.4-B', 'PancakeSwap swap with numeric 0 amount fails validation', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: 0,
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.1.5', 'BSC Vault deposit with 0 USDT throws before RPC call and leaves balance intact', async () => {
    const mockEth = new MockEthereumProvider();
    (globalThis as any).window = { ethereum: mockEth };
    const statusBefore = await pancakeSwapService.getBscProfitVaultStatus();

    let threw = false;
    try {
      await pancakeSwapService.depositProfitToBscVault(0, true);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('supérieur à 0'));
    }
    assert.strictEqual(threw, true);
    assert.strictEqual(mockEth.requestCalls.length, 0);
    const statusAfter = await pancakeSwapService.getBscProfitVaultStatus();
    assert.strictEqual(statusAfter.totalUsdtStored, statusBefore.totalUsdtStored);
  });

  await testCase('T2.1.5-B', 'BSC Vault withdrawal with 0 USDT throws before RPC call', async () => {
    const mockEth = new MockEthereumProvider();
    (globalThis as any).window = { ethereum: mockEth };

    let threw = false;
    try {
      await pancakeSwapService.withdrawProfitFromBscVault(0, true);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('supérieur à 0'));
    }
    assert.strictEqual(threw, true);
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.2.4', 'PancakeSwap swap with negative amount ("-0.5") fails validation before RPC call', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '-0.5',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.2.4-B', 'PancakeSwap swap with negative numeric amount (-10) fails validation', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: -10,
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.2.4-C', 'PancakeSwap swap with NaN and non-numeric strings fails validation', async () => {
    const mockEth = new MockEthereumProvider();
    const res1 = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: 'not-a-number',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res1.success, false);
    assert.strictEqual(res1.errorCode, 'RPC_ERROR');

    const res2 = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: NaN,
      ethereumProvider: mockEth
    });
    assert.strictEqual(res2.success, false);
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.2.5', 'BSC Vault deposit with negative amount (-50) throws before RPC call', async () => {
    const mockEth = new MockEthereumProvider();
    (globalThis as any).window = { ethereum: mockEth };

    let threw = false;
    try {
      await pancakeSwapService.depositProfitToBscVault(-50, true);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('supérieur à 0'));
    }
    assert.strictEqual(threw, true);
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.2.5-B', 'BSC Vault withdrawal with negative amount (-50) throws before RPC call', async () => {
    const mockEth = new MockEthereumProvider();
    (globalThis as any).window = { ethereum: mockEth };

    let threw = false;
    try {
      await pancakeSwapService.withdrawProfitFromBscVault(-50, true);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('supérieur à 0'));
    }
    assert.strictEqual(threw, true);
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  // --------------------------------------------------------------------------
  // SECTION 4: INVALID ADDRESSES (T2.5.3 - T2.5.5 & ADVERSARIAL VARIANTS)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Invalid Addresses (T2.5.3 - T2.5.5) ---');

  await testCase('T2.5.3', 'Malformed EVM address (short hex string 0xInvalidAddress) rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: '0xInvalidAddress',
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.ok(res.error?.includes('invalide'));
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.5.3-B', 'Malformed EVM address (non-hex characters in 40-char string) rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: '0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.5.3-C', 'Empty string or null as tokenIn rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: '',
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.5.4', 'Zero address (0x000...000) for EVM token-to-token swap rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: ethers.constants.AddressZero,
      tokenOut: USDT,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.ok(res.error?.includes('adresse zéro'));
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.5.4-B', 'Zero address as tokenOut rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: ethers.constants.AddressZero,
      amountIn: '0.1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.ok(res.error?.includes('adresse zéro'));
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.5.5', 'Identical input and output token addresses rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: USDT,
      tokenOut: USDT,
      amountIn: '10',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.ok(res.error?.includes('identiques'));
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  await testCase('T2.5.5-B', 'Identical input and output with mixed casing (e.g. lowercase vs checksum) rejected with RPC_ERROR', async () => {
    const mockEth = new MockEthereumProvider();
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: USDT.toLowerCase(),
      tokenOut: ethers.utils.getAddress(USDT),
      amountIn: '10',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.errorCode, 'RPC_ERROR');
    assert.ok(res.error?.includes('identiques'));
    assert.strictEqual(mockEth.requestCalls.length, 0);
  });

  // --------------------------------------------------------------------------
  // SECTION 5: CONFIRM ZERO SIMULATED FALLBACKS ON DISCONNECTION OR REJECTION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Zero Simulated Fallbacks Confirmation ---');

  await testCase('ZERO_FALLBACK_1', 'executePancakeSwap NEVER generates or returns synthetic txHash on failure', async () => {
    const mockEth = new MockEthereumProvider();
    mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', code: 4001 };
    const res = await pancakeSwapService.executePancakeSwap({
      tokenIn: WBNB,
      tokenOut: USDT,
      amountIn: '1',
      ethereumProvider: mockEth
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.txHash, undefined, 'txHash must be undefined on failure');
    assert.strictEqual(res.explorerUrl, undefined, 'explorerUrl must be undefined on failure');
  });

  await testCase('ZERO_FALLBACK_2', 'executeCrossChainTransfer in real mode NEVER returns demo/paper hash when wallet missing', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      const res = await crossChainRouterService.executeCrossChainTransfer('BSC', 'SOLANA', 100, 'USDT', true);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.txHash, undefined);
      assert.strictEqual(res.amountTransferred, 0);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('ZERO_FALLBACK_3', 'executeCrossChainTransfer in real mode NEVER returns demo/paper hash on user rejection', async () => {
    const originalWindow = (globalThis as any).window;
    try {
      const mockEth = new MockEthereumProvider();
      mockEth.rejectionConfig = { rejectOnMethod: 'eth_sendTransaction', code: 4001, message: 'User denied' };
      (globalThis as any).window = { ethereum: mockEth };

      const res = await crossChainRouterService.executeCrossChainTransfer('BSC', 'SOLANA', 100, 'USDT', true);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.txHash, undefined);
      assert.strictEqual(res.amountTransferred, 0);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  await testCase('ZERO_FALLBACK_4', 'Static regex audit of pancakeSwapService: zero Math.random() or synthetic 0x hex', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve('src/services/pancakeSwapService.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    const randomMatches = content.match(/Math\.random\(\)/g);
    assert.strictEqual(randomMatches, null, 'Must contain zero Math.random() occurrences');

    // Check for fake hex hash generator patterns like '0x' + Array(64)
    const fakeHashPattern = /0x[a-fA-F0-9]{64}/g;
    // Hardcoded addresses are 40 hex chars, router is 40 hex chars, transaction hashes are 64 hex chars
    const matches64 = content.match(fakeHashPattern) || [];
    assert.strictEqual(matches64.length, 0, 'Must contain zero hardcoded 64-char fake hex hashes');
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`CHALLENGER_M2_1 RESULTS: Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('================================================================');

  if (failedCount > 0) {
    console.error('\nDETECTED FAILURES:');
    for (const f of failureDetails) {
      console.error(`- ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\nALL ADVERSARIAL CHALLENGES COMPLETED SUCCESSFULLY WITH 0 FAILURES! 🎯');
    process.exit(0);
  }
}

runAdversarialSuite().catch(err => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
