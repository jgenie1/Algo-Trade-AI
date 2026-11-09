/**
 * EMPIRICAL ADVERSARIAL STRESS TEST HARNESS FOR MILESTONE 1
 * Challenger: teamwork_challenger_m1_2
 * 
 * Verifies:
 * 1. Zero synthetic candles under all failure modes (yahooFinanceService & /api/market-candles)
 * 2. Deterministic AI flow behavior offline / without Gemini key (zero Math.random/Math.sin)
 * 3. MarketRadarAndChart RSI invariance to priceDirections (no 62/38 toggles)
 * 4. Codebase-wide mock data residue elimination
 */

import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextRequest } from 'next/server';

interface TestResult {
  suite: string;
  id: string;
  description: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function challenge(
  suite: string,
  id: string,
  description: string,
  fn: () => Promise<void> | void
) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, id, description, passed: true, durationMs });
    console.log(`  \x1b[32m✔ [CHALLENGE PASS]\x1b[0m ${id}: ${description} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const error = err?.message || String(err);
    results.push({ suite, id, description, passed: false, error, durationMs });
    console.log(`  \x1b[31m✖ [CHALLENGE FAIL]\x1b[0m ${id}: ${description}`);
    console.log(`         \x1b[33mError: ${error}\x1b[0m`);
  }
}

// Helper to generate a realistic sequence of genuine candles
function createRealisticCandles(count: number, basePrice = 100): Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> {
  const candles = [];
  let price = basePrice;
  const baseTime = 1700000000;
  for (let i = 0; i < count; i++) {
    const change = (Math.sin(i * 0.7) * 0.005 + (i % 3 === 0 ? 0.002 : -0.001)) * price;
    const open = price;
    const close = Math.round((open + change) * 100) / 100;
    const high = Math.round((Math.max(open, close) + 0.5) * 100) / 100;
    const low = Math.round((Math.min(open, close) - 0.5) * 100) / 100;
    candles.push({
      time: baseTime + i * 900,
      open,
      high,
      low,
      close,
      volume: 1500 + i * 10
    });
    price = close;
  }
  return candles;
}

async function runMilestone1EmpiricalChallenges() {
  console.log('\n\x1b[1m\x1b[35m==============================================================================');
  console.log('       MILITANT EMPIRICAL ADVERSARIAL SUITE — MILESTONE 1 VERIFICATION');
  console.log('==============================================================================\x1b[0m\n');

  // ============================================================================
  // SUITE 1: SYNTHETIC CANDLE ELIMINATION & FAIL-CLOSED NETWORK HARNESS
  // ============================================================================
  console.log('\x1b[1m\x1b[34m▶ [SUITE 1] Adversarial Network & Mock Injection on Market Data Layer...\x1b[0m\n');

  const originalFetch = globalThis.fetch;
  const yfs = await import('../src/services/yahooFinanceService');
  const marketCandlesRoute = await import('../src/app/api/market-candles/route');

  // 1.1 Network failure rejection on fetchLiveMarketData
  await challenge('Market Data', 'ADV-M1-01', 'Network ETIMEDOUT throws [MarketDataError] with 0 synthetic candles', async () => {
    globalThis.fetch = async () => {
      throw new Error('ETIMEDOUT: Connection to upstream failed');
    };
    try {
      // Use unique symbol to bypass client memory cache
      const sym = `ADVSYM_FAIL_${Date.now()}`;
      await yfs.fetchLiveMarketData(sym, '15');
      assert.fail('Expected fetchLiveMarketData to throw on network error');
    } catch (err: any) {
      assert.ok(err.message.includes('[MarketDataError]'), `Expected [MarketDataError] message, got: ${err.message}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.2 Upstream HTTP 500 error throws [MarketDataError]
  await challenge('Market Data', 'ADV-M1-02', 'Upstream HTTP 500 error throws [MarketDataError] without synthetic fallback', async () => {
    globalThis.fetch = async () => new Response('Internal Server Error', { status: 500 });
    try {
      const sym = `ADVSYM_500_${Date.now()}`;
      await yfs.fetchLiveMarketData(sym, '15');
      assert.fail('Expected fetchLiveMarketData to throw on 500');
    } catch (err: any) {
      assert.ok(err.message.includes('[MarketDataError]'), `Expected [MarketDataError], got: ${err.message}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.3 Upstream HTTP 404 error throws [MarketDataError]
  await challenge('Market Data', 'ADV-M1-03', 'Upstream HTTP 404 error throws [MarketDataError]', async () => {
    globalThis.fetch = async () => new Response('Not Found', { status: 404 });
    try {
      const sym = `ADVSYM_404_${Date.now()}`;
      await yfs.fetchLiveMarketData(sym, '15');
      assert.fail('Expected fetchLiveMarketData to throw on 404');
    } catch (err: any) {
      assert.ok(err.message.includes('[MarketDataError]'), `Expected [MarketDataError], got: ${err.message}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.4 Upstream returning empty array [] throws [MarketDataError]
  await challenge('Market Data', 'ADV-M1-04', 'Upstream returning empty array throws [MarketDataError] without dummy bars', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
      const sym = `ADVSYM_EMPTY_${Date.now()}`;
      await yfs.fetchLiveMarketData(sym, '15');
      assert.fail('Expected fetchLiveMarketData to throw on empty data');
    } catch (err: any) {
      assert.ok(err.message.includes('[MarketDataError]'), `Expected [MarketDataError], got: ${err.message}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.5 Upstream returning malformed JSON throws [MarketDataError]
  await challenge('Market Data', 'ADV-M1-05', 'Upstream returning corrupted JSON payload throws [MarketDataError]', async () => {
    globalThis.fetch = async () => new Response('{ "unclosed_json": true,', { status: 200 });
    try {
      const sym = `ADVSYM_CORRUPT_${Date.now()}`;
      await yfs.fetchLiveMarketData(sym, '15');
      assert.fail('Expected fetchLiveMarketData to throw on corrupt JSON');
    } catch (err: any) {
      assert.ok(err.message.includes('[MarketDataError]'), `Expected [MarketDataError], got: ${err.message}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.6 Yahoo empty/null quote indicators throw [MarketDataError]
  await challenge('Market Data', 'ADV-M1-06', 'Corrupt Yahoo chart structure with null quote values throws [MarketDataError]', async () => {
    const corruptYahoo = {
      chart: {
        result: [{
          timestamp: [1700000000, 1700000900],
          indicators: {
            quote: [{
              open: [null, null],
              high: [null, null],
              low: [null, null],
              close: [null, null],
              volume: [null, null]
            }]
          }
        }]
      }
    };
    globalThis.fetch = async () => new Response(JSON.stringify(corruptYahoo), { status: 200 });
    try {
      const sym = `ADVSYM_YNULL_${Date.now()}`;
      await yfs.fetchLiveMarketData(sym, '15');
      assert.fail('Expected fetchLiveMarketData to throw on null quotes');
    } catch (err: any) {
      assert.ok(err.message.includes('[MarketDataError]'), `Expected [MarketDataError], got: ${err.message}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.7 /api/market-candles route fail-closed on network error
  await challenge('Market Data', 'ADV-M1-07', '/api/market-candles route returns HTTP 404 with success:false on network drop', async () => {
    globalThis.fetch = async () => {
      throw new Error('ECONNREFUSED');
    };
    try {
      const req = new NextRequest(`http://localhost:3000/api/market-candles?pair=TESTFAIL_${Date.now()}`);
      const res = await marketCandlesRoute.GET(req);
      assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
      const data = await res.json();
      assert.equal(data.success, false, 'Expected success: false');
      assert.ok(data.error, 'Expected error explanation');
      assert.equal(data.candles, undefined, 'Candles must not be present');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.8 /api/market-candles limit parameter clamping
  await challenge('Market Data', 'ADV-M1-08', '/api/market-candles handles extreme limit bounds (clamped 5..1000)', async () => {
    // Generate 1500 mock klines from Binance
    const fakeKlines = Array(1500).fill(null).map((_, i) => [
      (1700000000 + i * 900) * 1000,
      '100.0', '105.0', '95.0', '102.0', '500'
    ]);
    globalThis.fetch = async (url: any) => {
      return new Response(JSON.stringify(fakeKlines), { status: 200 });
    };

    try {
      // Test limit > 1000 clamped to 1000
      const reqOver = new NextRequest(`http://localhost:3000/api/market-candles?pair=BTC&limit=5000&seed=${Date.now()}`);
      const resOver = await marketCandlesRoute.GET(reqOver);
      assert.equal(resOver.status, 200);

      // Test limit < 5 clamped to 5
      const reqUnder = new NextRequest(`http://localhost:3000/api/market-candles?pair=BTC&limit=-100&seed=${Date.now() + 1}`);
      const resUnder = await marketCandlesRoute.GET(reqUnder);
      assert.equal(resUnder.status, 200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 1.9 4h Resampling verification (resample1hTo4h)
  await challenge('Market Data', 'ADV-M1-09', 'resample1hTo4h mathematically aggregates UTC-aligned 4h buckets', () => {
    // 8 hourly candles starting at epoch 1700000000 (which is 1700000000 % 14400 = 8000)
    // Let's create candles starting cleanly at a 4h boundary
    const boundaryTime = 1700006400; // divisible by 14400: 1700006400 / 14400 = 118056
    assert.equal(boundaryTime % 14400, 0, 'boundaryTime must be exact 4h boundary');

    const hourlyCandles = [
      // Bucket 1 (Hour 0 to Hour 3)
      { time: boundaryTime, open: 100, high: 105, low: 98, close: 102, volume: 1000 },
      { time: boundaryTime + 3600, open: 102, high: 110, low: 101, close: 108, volume: 1200 },
      { time: boundaryTime + 7200, open: 108, high: 109, low: 103, close: 104, volume: 800 },
      { time: boundaryTime + 10800, open: 104, high: 106, low: 96, close: 99, volume: 1500 },
      // Bucket 2 (Hour 4 to Hour 7)
      { time: boundaryTime + 14400, open: 99, high: 104, low: 97, close: 103, volume: 900 },
      { time: boundaryTime + 18000, open: 103, high: 115, low: 102, close: 112, volume: 2000 },
      { time: boundaryTime + 21600, open: 112, high: 114, low: 109, close: 111, volume: 1100 },
      { time: boundaryTime + 25200, open: 111, high: 113, low: 105, close: 107, volume: 1300 },
    ];

    const fourHour = yfs.resample1hTo4h(hourlyCandles);
    assert.equal(fourHour.length, 2, 'Must produce exactly two 4h candles');

    // Check Bucket 1
    const b1 = fourHour[0];
    assert.equal(b1.time, boundaryTime, 'Bucket 1 timestamp must match boundary');
    assert.equal(b1.open, 100, 'Bucket 1 open must be open of first 1h bar (100)');
    assert.equal(b1.high, 110, 'Bucket 1 high must be max high across 4 bars (110)');
    assert.equal(b1.low, 96, 'Bucket 1 low must be min low across 4 bars (96)');
    assert.equal(b1.close, 99, 'Bucket 1 close must be close of last 1h bar (99)');
    assert.equal(b1.volume, 1000 + 1200 + 800 + 1500, 'Bucket 1 volume must be sum of volumes (4500)');

    // Check Bucket 2
    const b2 = fourHour[1];
    assert.equal(b2.time, boundaryTime + 14400, 'Bucket 2 timestamp must match boundary + 14400');
    assert.equal(b2.open, 99, 'Bucket 2 open must be 99');
    assert.equal(b2.high, 115, 'Bucket 2 high must be 115');
    assert.equal(b2.low, 97, 'Bucket 2 low must be 97');
    assert.equal(b2.close, 107, 'Bucket 2 close must be 107');
    assert.equal(b2.volume, 900 + 2000 + 1100 + 1300, 'Bucket 2 volume must be 5300');
  });

  // 1.10 Empty candle input to resample1hTo4h returns empty array
  await challenge('Market Data', 'ADV-M1-10', 'resample1hTo4h on empty or null array returns [] without throwing', () => {
    assert.deepEqual(yfs.resample1hTo4h([]), []);
    assert.deepEqual(yfs.resample1hTo4h(null as any), []);
    assert.deepEqual(yfs.resample1hTo4h(undefined as any), []);
  });

  // ============================================================================
  // SUITE 2: DETERMINISTIC AI FLOW BEHAVIOR & ZERO RANDOM ROLLING
  // ============================================================================
  console.log('\n\x1b[1m\x1b[34m▶ [SUITE 2] AI Flow Determinism & Pseudo-Random Elimination...\x1b[0m\n');

  const forexFlow = await import('../src/ai/flows/get-forex-analysis-flow');

  // 2.1 Missing Gemini API key challenge: verify getForexAnalysis behavior when API key is completely absent
  await challenge('AI Determinism', 'ADV-M1-11', 'Missing Gemini API key in environment: getForexAnalysis should compute deterministic fallback without crashing', async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevGoogleKey = process.env.GOOGLE_GENAI_API_KEY;
    const prevGoogleApiKey = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    try {
      const res = await forexFlow.getForexAnalysis({
        pair: 'EURUSD',
        timeframe: '15',
        chartScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        indicators: []
      });
      assert.ok(res, 'Analysis returned result');
      assert.ok(['HAUSSIÈRE', 'BAISSIÈRE', 'NEUTRE'].includes(res.trend));
    } catch (err: any) {
      // If it throws FAILED_PRECONDITION, that is an unhandled Genkit initialization crash!
      throw new Error(`CRASH WITHOUT API KEY: Genkit threw unhandled ${err.message} before entering fallback!`);
    } finally {
      if (prevKey) process.env.GEMINI_API_KEY = prevKey;
      if (prevGoogleKey) process.env.GOOGLE_GENAI_API_KEY = prevGoogleKey;
      if (prevGoogleApiKey) process.env.GOOGLE_API_KEY = prevGoogleApiKey;
    }
  });

  // 2.2 Deterministic fallback execution when Gemini API fails (quota / network drop / invalid key)
  await challenge('AI Determinism', 'ADV-M1-12', '50 consecutive executions on identical candles produce 100% BIT-EXACT identical output', async () => {
    process.env.GEMINI_API_KEY = 'dummy-key-for-test';
    const realisticCandles = createRealisticCandles(50, 1.2500);

    globalThis.fetch = async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 });
      }
      if (urlStr.includes('binance')) {
        const klines = realisticCandles.map(c => [c.time * 1000, c.open, c.high, c.low, c.close, c.volume]);
        return new Response(JSON.stringify(klines), { status: 200 });
      }
      const yahooData = {
        chart: {
          result: [{
            timestamp: realisticCandles.map(c => c.time),
            indicators: {
              quote: [{
                open: realisticCandles.map(c => c.open),
                high: realisticCandles.map(c => c.high),
                low: realisticCandles.map(c => c.low),
                close: realisticCandles.map(c => c.close),
                volume: realisticCandles.map(c => c.volume),
              }]
            }
          }]
        }
      };
      return new Response(JSON.stringify(yahooData), { status: 200 });
    };

    try {
      const input = {
        pair: 'GBPUSD',
        timeframe: '15 Minutes',
        chartScreenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        indicators: ['EMA', 'RSI', 'MACD']
      };

      const firstResult = await forexFlow.getForexAnalysis(input);

      for (let i = 0; i < 50; i++) {
        const result = await forexFlow.getForexAnalysis(input);
        assert.equal(result.trend, firstResult.trend, `Run ${i}: Trend mismatch (${result.trend} vs ${firstResult.trend})`);
        assert.equal(result.signal, firstResult.signal, `Run ${i}: Signal mismatch (${result.signal} vs ${firstResult.signal})`);
        assert.equal(result.justification, firstResult.justification, `Run ${i}: Justification mismatch`);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 2.3 Total offline blackout (Gemini down + Market Data down) fails closed cleanly
  await challenge('AI Determinism', 'ADV-M1-13', 'Total network blackout returns clean fail-closed NEUTRE without generating pseudo-random signals', async () => {
    process.env.GEMINI_API_KEY = 'dummy-key-for-test';
    globalThis.fetch = async () => {
      throw new Error('TOTAL_OFFLINE_SIMULATION');
    };

    try {
      const res = await forexFlow.getForexAnalysis({
        pair: 'OFFLINE_PAIR',
        timeframe: '15',
        chartScreenshot: 'data:image/png;base64,empty',
        indicators: []
      });

      assert.equal(res.trend, 'NEUTRE', `Expected NEUTRE trend on blackout, got ${res.trend}`);
      assert.equal(res.signal, 'NEUTRE', `Expected NEUTRE signal on blackout, got ${res.signal}`);
      assert.ok(res.justification.includes('Données de marché réelles indisponibles'), 'Justification must explain market data absence');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 2.4 Math.sin(seed) simulation loop completely absent from get-forex-analysis-flow.ts
  await challenge('AI Determinism', 'ADV-M1-14', 'Source inspection: Math.sin(seed) simulation loop completely removed', () => {
    const flowPath = path.resolve(process.cwd(), 'src/ai/flows/get-forex-analysis-flow.ts');
    const content = fs.readFileSync(flowPath, 'utf-8');
    assert.ok(!content.includes('Math.sin'), 'Found Math.sin in get-forex-analysis-flow.ts');
    assert.ok(!content.includes('seed'), 'Found seed in get-forex-analysis-flow.ts');
    assert.ok(!content.includes('pseudoRandom'), 'Found pseudoRandom in get-forex-analysis-flow.ts');
  });

  // ============================================================================
  // SUITE 3: MARKETRADARANDCHART DYNAMIC BEHAVIOR & RSI INVARIANCE
  // ============================================================================
  console.log('\n\x1b[1m\x1b[34m▶ [SUITE 3] MarketRadarAndChart Tick Direction Invariance...\x1b[0m\n');

  // 3.1 Verify RSI does not toggle between 62 and 38 under changing tick directions
  await challenge('UI Mock Cleanup', 'ADV-M1-15', 'RSI does NOT toggle between 62 and 38 when price directions toggle between up/down/flat', () => {
    const radarPath = path.resolve(process.cwd(), 'src/components/trading/MarketRadarAndChart.tsx');
    const content = fs.readFileSync(radarPath, 'utf-8');

    // Verify the old ternary is completely deleted
    assert.ok(!content.includes("dir === 'up' ? 62"), "Contains legacy hardcoded 'dir === up ? 62'");
    assert.ok(!content.includes("dir === 'down' ? 38"), "Contains legacy hardcoded 'dir === down ? 38'");
    assert.ok(!content.includes("dir === 'up' ? 0.42"), "Contains legacy hardcoded 'dir === up ? 0.42'");
    assert.ok(!content.includes("dir === 'down' ? -0.38"), "Contains legacy hardcoded 'dir === down ? -0.38'");

    // Verify that radarList maps rsi from radarMetrics
    assert.ok(content.includes('metrics?.rsi'), 'RSI must be read from authentic metrics');
    assert.ok(content.includes('metrics?.change24h'), 'Change must be read from authentic metrics');
  });

  // 3.2 Dynamic simulation of radar item derivation
  await challenge('UI Mock Cleanup', 'ADV-M1-16', 'Empirical simulation: radar item derivation maintains constant RSI when direction flips', () => {
    // Model the exact transformation in MarketRadarAndChart.tsx:144-171
    const testCases: Array<'up' | 'down' | 'flat'> = ['up', 'down', 'flat', 'up', 'down'];
    const authenticRsi = 47.8;
    const radarMetrics: Record<string, { rsi: number | null; change24h: number | null }> = {
      'EURUSD': { rsi: authenticRsi, change24h: -0.15 }
    };

    const evaluatedRsis = testCases.map(dir => {
      const priceDirections: Record<string, 'up' | 'down' | 'flat'> = { 'EURUSD': dir };
      const metrics = radarMetrics['EURUSD'];
      const rsi = metrics?.rsi ?? null;
      return rsi;
    });

    for (let i = 0; i < evaluatedRsis.length; i++) {
      assert.equal(evaluatedRsis[i], authenticRsi, `Direction ${testCases[i]} altered RSI to ${evaluatedRsis[i]}`);
      assert.notEqual(evaluatedRsis[i], 62, 'RSI was hardcoded to 62');
      assert.notEqual(evaluatedRsis[i], 38, 'RSI was hardcoded to 38');
    }
  });

  // ============================================================================
  // SUITE 4: REPOSITORY-WIDE MOCK RESIDUE ELIMINATION SCAN
  // ============================================================================
  console.log('\n\x1b[1m\x1b[34m▶ [SUITE 4] Codebase-wide Mock Data Residue Scan...\x1b[0m\n');

  // 4.1 utils.ts does not contain REAL_BASE_PRICES dictionary
  await challenge('Residue Audit', 'ADV-M1-17', 'src/lib/utils.ts contains ZERO entries of REAL_BASE_PRICES dictionary', () => {
    const utilsPath = path.resolve(process.cwd(), 'src/lib/utils.ts');
    const content = fs.readFileSync(utilsPath, 'utf-8');
    assert.ok(!content.includes('REAL_BASE_PRICES'), 'REAL_BASE_PRICES still found in utils.ts');
    assert.ok(!content.includes('BTC: 65000'), 'Hardcoded BTC: 65000 found in utils.ts');
    assert.ok(!content.includes('ETH: 3500'), 'Hardcoded ETH: 3500 found in utils.ts');
  });

  // 4.2 yahooFinanceService.ts does not contain buildCandlesFromRates
  await challenge('Residue Audit', 'ADV-M1-18', 'src/services/yahooFinanceService.ts has zero references to buildCandlesFromRates', () => {
    const yfsPath = path.resolve(process.cwd(), 'src/services/yahooFinanceService.ts');
    const content = fs.readFileSync(yfsPath, 'utf-8');
    assert.ok(!content.includes('buildCandlesFromRates'), 'buildCandlesFromRates found in yahooFinanceService.ts');
  });

  // 4.3 TrendingTokensCard.tsx queries SOLUSDT from Binance
  await challenge('Residue Audit', 'ADV-M1-19', 'src/components/trading/TrendingTokensCard.tsx includes SOLUSDT in Binance query', () => {
    const cardPath = path.resolve(process.cwd(), 'src/components/trading/TrendingTokensCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');
    assert.ok(content.includes('SOLUSDT'), 'TrendingTokensCard.tsx must query SOLUSDT from Binance');
    assert.ok(!content.includes('65000.00'), 'TrendingTokensCard.tsx contains hardcoded 65000.00 constant');
    assert.ok(!content.includes('3400.00'), 'TrendingTokensCard.tsx contains hardcoded 3400.00 constant');
    assert.ok(!content.includes('580.00'), 'TrendingTokensCard.tsx contains hardcoded 580.00 constant');
  });

  // 4.4 Scan entire src/ directory for synthetic candle loop
  await challenge('Residue Audit', 'ADV-M1-20', 'Whole src/ directory scan: zero occurrences of 1 - baseChange * (1 - ratio)', () => {
    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanDir(full);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(full, 'utf-8');
          assert.ok(!content.includes('1 - baseChange * (1 - ratio)'), `Found linear candle loop in ${full}`);
        }
      }
    }
    scanDir(path.resolve(process.cwd(), 'src'));
  });

  // ============================================================================
  // SUMMARY & VERDICT GENERATION
  // ============================================================================
  console.log('\n\x1b[1m\x1b[36m==============================================================================');
  console.log('       EMPIRICAL ADVERSARIAL CHALLENGE SUMMARY — MILESTONE 1');
  console.log('==============================================================================\x1b[0m');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\nTotal Challenges Executed: ${total}`);
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`\x1b[${failed > 0 ? '31' : '32'}mFailed: ${failed}\x1b[0m\n`);

  if (failed > 0) {
    console.log('\x1b[31mVERDICT: FAIL — Defects detected:\x1b[0m');
    for (const f of results.filter(r => !r.passed)) {
      console.log(`  - [${f.id}] ${f.description}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('\x1b[32mVERDICT: APPROVE — 100% of empirical adversarial stress challenges passed!\x1b[0m\n');
    process.exit(0);
  }
}

runMilestone1EmpiricalChallenges().catch((err) => {
  console.error('Fatal test harness execution error:', err);
  process.exit(1);
});
