# TEST_INFRA — E2E Testing Infrastructure & Architecture Specification

## 1. Test Philosophy & Design Principles

The AlgoTrading quantitative system execution engine requires the highest degree of reliability, financial accuracy, and data integrity. The test suite is designed strictly according to **Opaque-Box Testing** principles:

1. **Requirements-Driven & Contract-Grounded**: Tests validate strictly against user requirements (`ORIGINAL_REQUEST.md`) and authoritative interface contracts (`PROJECT.md § Interface Contracts`). Tests never inspect private internal state or rely on internal implementation hacks.
2. **Deterministic & Isolated**: Each test case initializes its own state, executes against cleanly bounded parameters, and has zero execution-order dependencies.
3. **No Synthetic / Facade Bypasses**: Tests enforce the absolute elimination of mock data in live execution paths. Tests themselves never use facade assertions that pass unconditionally.
4. **Dynamic Resiliency**: When run before or during active implementation milestones (M1–M4), tests dynamically detect module availability, gracefully executing implemented features while clearly surfacing specific missing interfaces as standard defect escalations.
5. **Authoritative Mathematical Derivations**:
   - Risk-to-Reward ratio: $\text{R:R} = \frac{|\text{TakeProfit} - \text{EntryPrice}|}{|\text{EntryPrice} - \text{StopLoss}|} \ge 2.0$.
   - Realized Risk-to-Reward: $\frac{\sum \text{Wins} / N_w}{\sum \text{Losses} / N_l} \ge 2.0$.
   - Profit Factor: $\text{PF} = \frac{\sum \text{Gross Profits}}{\sum \text{Gross Losses}} > 1.5$.
   - Maximum Drawdown: $\text{MaxDD} = \max_{t} \left(\frac{\text{Peak}_t - \text{Equity}_t}{\text{Peak}_t}\right) \le 15.0\%$.
   - Dynamic ATR Position Sizing: $\text{Size} = \frac{\text{Capital} \times \text{RiskPct}}{|\text{Entry} - \text{StopLoss}| \times \text{Multiplier}}$.

---

## 2. Test Suite Architecture & Tier Hierarchy

The test runner `scripts/run-e2e-tests.ts` is organized into a 4-Tier test hierarchy covering all 20 features (F1 through F20):

```
                                  =================================================
                                  AlgoTrading Opaque-Box E2E Test Suite Architecture
                                  =================================================
                                                          │
          ┌───────────────────────┬───────────────────────┼───────────────────────┐
          │                       │                       │                       │
      [ Tier 1 ]              [ Tier 2 ]              [ Tier 3 ]              [ Tier 4 ]
   Feature Coverage       Boundary & Corner       Cross-Feature Combos    Real-World Workloads
   (F1-F20, >=5/feat)     (F1-F20, >=5/feat)      (Integrated Pipelines)  (Macro Backtests)
   • Authentic candles    • Zero volatility       • Market Data -> TA     • Profit Factor > 1.5
   • Depth & sorting      • Weekend market halt   • TA -> Strategy Signal • Realized R:R >= 2.0
   • Spreads & fees       • Division by zero PF   • Signal -> Backtest    • Drawdown < 15%
   • 9 Strategies         • Gap fill beyond SL    • Signal -> MT5 Orders  • BTC, ETH, EUR, GOLD
   • MT5 bridge APIs      • Fail-closed errors    • Portfolio Rebalancing • Zero mock validation
          │                       │                       │                       │
          └───────────────────────┴───────────────────────┴───────────────────────┘
                                                          │
                                            [ Output: Clear Pass / Fail ]
                                            [ JSON & Markdown Reports   ]
```

### Tier 1: Feature Coverage (>=5 test cases per feature for F1–F20)
- **F1: Eliminate Synthetic Linear Candles**: Verifies candle generators do not produce linear price ramps ($P_i = P_0 \times (1 - c \times (1 - i/N))$).
- **F2: Eliminate Synthetic Flat Candles**: Verifies no 30-candle flat-line synthetic arrays with constant spread.
- **F3: Eliminate Dummy Single-Candle Fallbacks**: Verifies no 1-candle arrays with open=high=low=close.
- **F4: Deep Candle Ingestion API**: Verifies `limit` (up to 1,000 bars), `range` (1d to 1y), chronological ordering ($t_i < t_{i+1}$), and server caching.
- **F5: UI Mock Data Cleanup**: Verifies elimination of Math.random() AI flows and hardcoded radar indicators.
- **F6: Realistic Bid-Ask Spreads**: Verifies asset-specific spreads (Forex: 1.2 pips, Gold: $0.35, Crypto: 0.05%).
- **F7: Execution Slippage & Gap Fills**: Verifies slippage modeling and stop loss gapping at candle open during adverse price gaps.
- **F8: Broker Commissions & Fees**: Verifies round-turn commission deduction ($6/lot for Forex/CFD, 0.05% taker fee for Crypto).
- **F9: Mathematical Performance Metrics**: Verifies Profit Factor, Sharpe Ratio, Realized R:R, and Floating Equity Drawdown.
- **F10: Historical Horizon Expansion**: Verifies backtesting over 300 to 1,000 candles.
- **F11: Unified Strategy Engine**: Verifies `evaluateStrategySignal` produces valid signals for all 9 supported strategies.
- **F12: Asymmetric R:R Preservation**: Verifies $R:R \ge 2.0$ for BUY/SELL entries and prevents DCA degradation.
- **F13: Volatility-Based Position Sizing**: Verifies dynamic ATR position sizing respecting capital risk budget (1-2%).
- **F14: Trend & Volatility Filters**: Verifies macro trend filters (EMA 200), momentum (ADX >= 20), and volume confirmation.
- **F15: Strict Capital Protection**: Verifies 15% maximum portfolio drawdown circuit breaker and 3 consecutive losses halt.
- **F16: MT5 Bridge Architecture**: Verifies `IMT5Bridge` methods (`connect`, `getAccountInfo`, `placeOrder`, `closePosition`, `getOpenPositions`, `modifyOrder`).
- **F17: Headless Simulated MT5 Bridge**: Verifies `SimulatedMT5Bridge` executes trades in memory for automated CI without external broker terminals.
- **F18: Live MT5 Python Sidecar**: Verifies Python FastAPI bridge script endpoints and proxy route contract.
- **F19: Engine MT5 Order Routing**: Verifies Forex and Commodities pairs route to MT5 bridge in REAL/DEMO mode.
- **F20: Opaque-Box E2E Test Suite**: Verifies test suite self-integrity, deterministic runner execution, and accurate exit codes.

### Tier 2: Boundary & Corner Cases (>=5 test cases per feature for F1–F20)
- Empty candle arrays and single-candle inputs.
- Zero-loss and zero-win scenarios (preventing `0/0` or `1/0` uncaught NaN in Profit Factor).
- Extreme volatility spikes (ATR surge > 500%).
- Zero volatility regimes (flat market / zero ATR fallback).
- Weekend market closure quotes (spread widening or market halt).
- Gap openings past Stop Loss or Take Profit levels (verifying execution at open, not requested SL).
- Maximum account leverage boundary conditions.
- Massive lot size clamping against free margin.
- Missing or offline API endpoints (verifying fail-closed behavior rather than silent mock fallback).
- Consecutive loss threshold edge conditions (exactly 2 vs. exactly 3 consecutive losses).

### Tier 3: Cross-Feature Combinations
- Integrated end-to-end pipeline: Real Market Data -> Indicator Engine -> Strategy Signal Generation -> Backtest Simulation -> Performance Metrics Calculation.
- Signal to Order Flow: Strategy Signal -> Dynamic Position Sizing -> MT5 Bridge Order Placement -> Ticket Generation -> Open Position Tracking.
- Multi-Asset Simultaneous Backtesting: Concurrent backtest runs across BTCUSDT (Crypto), EURUSD (Forex), and XAUUSD (Commodity) with asset-specific spreads and commission models.
- Volatility Regime Transitions: Strategy response when transitioning dynamically from trending to choppy market regimes.
- Drawdown Circuit Breaker Enforcement: Interruption of backtest / order routing when cumulative floating drawdown breaches 15%.

### Tier 4: Real-World Workloads
- Full backtest runs on authentic historical datasets across multiple asset classes:
  - Bitcoin (`BTCUSDT` / `BTC-USD`): 500+ candles.
  - Ethereum (`ETHUSDT` / `ETH-USD`): 500+ candles.
  - Euro/USD (`EURUSD` / `EURUSD=X`): 500+ candles.
  - Gold (`XAUUSD` / `GC=F`): 500+ candles.
- Macro acceptance criteria verification:
  - **Profit Factor > 1.5**
  - **Realized Risk-to-Reward $\ge 1:2.0$**
  - **Maximum Portfolio Drawdown $< 15.0\%$**
  - **Zero mock data detected in pipeline**

---

## 3. Test Runner Invocation & CLI Integration

### Running the Test Suite
The complete 4-tier test suite is executed directly via `tsx`:

```bash
# Run directly with tsx
npx tsx scripts/run-e2e-tests.ts

# Or via npm script
npm run test:e2e
```

### Exit Codes & CI Invariants
- **Exit Code 0**: All executed tests passed successfully.
- **Exit Code 1**: One or more tests failed, or an unhandled exception occurred.
- Continuous Integration (`npm test`): Integrated into `scripts/run-integration-tests.ts` to guarantee quality gates before production release.

---

## 4. Feature Coverage Mapping Matrix

| Feature ID | Feature Name | Tier 1 Tests | Tier 2 Tests | Tier 3 Tests | Tier 4 Tests | Target Status |
|:----------:|:-------------|:------------:|:------------:|:------------:|:------------:|:-------------:|
| **F1** | Eliminate Synthetic Linear Candles | 5 | 5 | Combined | Validated | Covered |
| **F2** | Eliminate Synthetic Flat Candles | 5 | 5 | Combined | Validated | Covered |
| **F3** | Eliminate Dummy Single-Candle Fallbacks | 5 | 5 | Combined | Validated | Covered |
| **F4** | Deep Candle Ingestion API | 5 | 5 | Combined | Validated | Covered |
| **F5** | UI Mock Data Cleanup | 5 | 5 | Combined | Validated | Covered |
| **F6** | Realistic Bid-Ask Spreads | 5 | 5 | Combined | Validated | Covered |
| **F7** | Execution Slippage & Gap Fills | 5 | 5 | Combined | Validated | Covered |
| **F8** | Broker Commissions & Fees | 5 | 5 | Combined | Validated | Covered |
| **F9** | Mathematical Performance Metrics | 5 | 5 | Combined | Validated | Covered |
| **F10** | Historical Horizon Expansion | 5 | 5 | Combined | Validated | Covered |
| **F11** | Unified Strategy Engine | 5 | 5 | Combined | Validated | Covered |
| **F12** | Asymmetric R:R Preservation | 5 | 5 | Combined | Validated | Covered |
| **F13** | Volatility-Based Position Sizing | 5 | 5 | Combined | Validated | Covered |
| **F14** | Trend & Volatility Filters | 5 | 5 | Combined | Validated | Covered |
| **F15** | Strict Capital Protection | 5 | 5 | Combined | Validated | Covered |
| **F16** | MT5 Bridge Architecture | 5 | 5 | Combined | Validated | Covered |
| **F17** | Headless Simulated MT5 Bridge | 5 | 5 | Combined | Validated | Covered |
| **F18** | Live MT5 Python Sidecar | 5 | 5 | Combined | Validated | Covered |
| **F19** | Engine MT5 Order Routing | 5 | 5 | Combined | Validated | Covered |
| **F20** | Opaque-Box E2E Test Suite | 5 | 5 | Combined | Validated | Covered |
| **TOTAL** | **20 Features** | **100** | **100** | **12** | **10** | **222 Tests** |
