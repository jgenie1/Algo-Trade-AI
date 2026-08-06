import { 
  recordTradeTelemetry, 
  getLearningTelemetrySummary, 
  getRecordedTelemetryEvents,
  clearTelemetryHistory 
} from '../aiClosedLoopLearningService';

async function testAiClosedLoopLearning() {
  console.log('--- TEST 1: Baseline Telemetry Summary ---');
  clearTelemetryHistory();
  const baseSummary = getLearningTelemetrySummary();
  console.assert(baseSummary.totalTradesRecorded === 0, 'Le total de trades doit être 0 au départ.');
  console.log('✅ Baseline validé:', baseSummary.recommendedPromptTuning);

  console.log('\n--- TEST 2: Recording Winning & Loss Telemetry Events ---');
  recordTradeTelemetry({
    strategyName: 'AI Autopilot',
    symbol: 'FX:EURUSD',
    type: 'WIN',
    pnlUsd: 45.2,
    pnlPercentage: 4.5
  });

  recordTradeTelemetry({
    strategyName: 'AI Autopilot',
    symbol: 'FX:EURUSD',
    type: 'STOP_LOSS_HIT',
    pnlUsd: -15.0,
    pnlPercentage: -1.5
  });

  recordTradeTelemetry({
    strategyName: 'AI Autopilot',
    symbol: 'FX:EURUSD',
    type: 'STOP_LOSS_HIT',
    pnlUsd: -15.0,
    pnlPercentage: -1.5
  });

  recordTradeTelemetry({
    strategyName: 'AI Autopilot',
    symbol: 'FX:EURUSD',
    type: 'STOP_LOSS_HIT',
    pnlUsd: -15.0,
    pnlPercentage: -1.5
  });

  const updatedSummary = getLearningTelemetrySummary();
  console.log('Summary après télémétrie:', updatedSummary);

  console.assert(updatedSummary.totalTradesRecorded === 4, '4 événements enregistrés.');
  console.assert(updatedSummary.winCount === 1, '1 victoire enregistrée.');
  console.assert(updatedSummary.stopLossCount === 3, '3 stop loss enregistrés.');
  console.assert(updatedSummary.suggestedStopLossAdjustment < 0, 'Stop-loss doit être ajusté (resserré) suite aux pertes.');
  console.assert(updatedSummary.suggestedRsiAdjustment > 0, 'Critères d\'entrée RSI doivent être durcis.');

  console.log('✅ Auto-calibration de la télémétrie IA validée !');
  console.log('Ajustement RSI suggéré:', updatedSummary.suggestedRsiAdjustment);
  console.log('Ajustement Stop Loss suggéré:', updatedSummary.suggestedStopLossAdjustment);

  console.log('\n🎉 TOUS LES TESTS D\'AUTO-APPRENTISSAGE IA ONT RÉUSSI AVEC SUCCÈS !');
}

testAiClosedLoopLearning().catch(err => {
  console.error('❌ ÉCHEC DU TEST D\'AUTO-APPRENTISSAGE IA:', err);
  process.exit(1);
});
