import { getCrossChainRoutes, executeCrossChainTransfer, SUPPORTED_CHAINS } from '../crossChainRouterService';
import { getBscProfitVaultStatus, depositProfitToBscVault, withdrawProfitFromBscVault } from '../pancakeSwapService';

async function testCrossChainRouter() {
  console.log('--- TEST 1: Cross-Chain Transfer Routes Calculation ---');
  const routes = getCrossChainRoutes('SOLANA', 'BSC', 250, 'USDT');
  console.assert(routes.length >= 1, 'Devrait retourner au moins une route cross-chain.');
  console.assert(routes[0].recommended === true, 'La première route doit être recommandée.');
  console.assert(routes[0].fromChain === 'SOLANA', 'From chain doit être SOLANA.');
  console.assert(routes[0].toChain === 'BSC', 'To chain doit être BSC.');
  console.log('✅ Routes de transfert Cross-Chain validées avec succès !', routes[0]);

  console.log('\n--- TEST 2: Cross-Chain Transfer Execution ---');
  const transferRes = await executeCrossChainTransfer('SOLANA', 'BSC', 100, 'USDT');
  console.assert(transferRes.success === true, 'Transfert doit réussir.');
  console.assert(!!transferRes.txHash, 'Un Hash de transaction doit être généré.');
  console.log('✅ Exécution de transfert Cross-Chain validée !', transferRes.txHash);

  console.log('\n--- TEST 3: BSC Profit Vault Deposit & Withdraw ---');
  const initialStatus = await getBscProfitVaultStatus();
  console.log(`Solde initial coffre BSC: $${initialStatus.totalUsdtStored} USDT`);

  const depositRes = await depositProfitToBscVault(50);
  console.assert(depositRes.success === true, 'Dépôt BSC doit réussir.');
  console.assert(depositRes.newBalance >= 50, 'Nouveau solde BSC doit refléter le dépôt.');
  console.log('✅ Dépôt Coffre BSC validé ! Nouveau solde:', depositRes.newBalance);

  const withdrawRes = await withdrawProfitFromBscVault(20);
  console.assert(withdrawRes.success === true, 'Retrait BSC doit réussir.');
  console.assert(withdrawRes.newBalance === depositRes.newBalance - 20, 'Retrait doit être soustrait du solde.');
  console.log('✅ Retrait Coffre BSC validé ! Solde final:', withdrawRes.newBalance);

  console.log('\n🎉 TOUS LES TESTS CROSS-CHAIN ET BSC ONT RÉUSSI AVEC SUCCÈS !');
}

testCrossChainRouter().catch(err => {
  console.error('❌ ÉCHEC DU TEST CROSS-CHAIN:', err);
  process.exit(1);
});
