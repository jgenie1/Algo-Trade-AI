import { execSync } from 'child_process';

console.log('=============== ALGOTRADE AI - AUTOMATED INTEGRATION TEST SUITE ===============\n');

try {
  console.log('▶ [1/2] Lancement des tests Cross-Chain Router & BSC Profit Storage...');
  execSync('npx tsx src/services/__tests__/crossChainRouter.test.ts', { stdio: 'inherit' });

  console.log('\n▶ [2/2] Lancement des tests Auto-Apprentissage IA (Closed-Loop Telemetry)...');
  execSync('npx tsx src/services/__tests__/aiClosedLoopLearning.test.ts', { stdio: 'inherit' });

  console.log('\n==============================================================================');
  console.log('✅ SUITE DE VALIDATION INTEGRATION RÉUSSIE SANS ERREUR ! ALL SYSTEMS GO ! 🚀');
  console.log('==============================================================================');
} catch (error: any) {
  console.error('\n❌ ÉCHEC D\'UN TEST D\'INTÉGRATION :', error.message || error);
  process.exit(1);
}
