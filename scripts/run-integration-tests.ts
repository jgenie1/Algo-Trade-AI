import { execSync } from 'child_process';
import { executeE2ETests } from '../src/services/__tests__/e2eOnChainExecution.test';
import { runM3SecuritySuite } from '../src/services/__tests__/m3TradingEngineSecurity.test';

async function runIntegrationSuite() {
  console.log('=============== ALGOTRADE AI - AUTOMATED INTEGRATION TEST SUITE ===============\n');

  try {
    console.log('▶ [1/4] Lancement des tests Cross-Chain Router & BSC Profit Storage...');
    execSync('npx tsx src/services/__tests__/crossChainRouter.test.ts', { stdio: 'inherit' });

    console.log('\n▶ [2/4] Lancement des tests Auto-Apprentissage IA (Closed-Loop Telemetry)...');
    execSync('npx tsx src/services/__tests__/aiClosedLoopLearning.test.ts', { stdio: 'inherit' });

    console.log('\n▶ [3/4] Lancement de la suite Milestone 3 (Bot Protection & Trade Safety)...');
    const m3Passed = await runM3SecuritySuite();
    if (!m3Passed) {
      console.error('\n❌ DES TESTS DE SÉCURITÉ MILESTONE 3 ONT ÉCHOUÉ.');
      process.exit(1);
    }

    console.log('\n▶ [4/4] Lancement de la suite E2E Opaque-Box On-Chain Execution (Tiers 1-4)...');
    const e2ePassed = await executeE2ETests();

    if (!e2ePassed) {
      console.error('\n❌ DES TESTS E2E ONT ÉCHOUÉ SUR LE CODE NON SÉCURISÉ / MOCKÉ.');
      console.error('Consultez le rapport ci-dessus et TEST_READY.md pour les défauts à escalader.');
      process.exit(1);
    }

    console.log('\n==============================================================================');
    console.log('✅ SUITE DE VALIDATION INTEGRATION RÉUSSIE SANS ERREUR ! ALL SYSTEMS GO ! 🚀');
    console.log('==============================================================================');
  } catch (error: any) {
    console.error('\n❌ ÉCHEC DU TEST RUNNER :', error.message || error);
    process.exit(1);
  }
}

runIntegrationSuite();
