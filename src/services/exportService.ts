// Service d'exportation de rapports de trading et de coffre-fort au format CSV

export function exportTransactionsToCSV(transactions: any[], filename: string = 'algo_trade_transactions.csv') {
  if (!transactions || transactions.length === 0) {
    alert("Aucune transaction à exporter.");
    return;
  }

  const headers = ['ID', 'Type', 'Montant', 'Devise', 'Statut', 'Date', 'Hash On-Chain'];
  const rows = transactions.map(tx => [
    tx.id || '',
    tx.type || '',
    tx.amount || 0,
    tx.currency || '',
    tx.status || 'COMPLETED',
    tx.timestamp ? new Date(tx.timestamp).toLocaleString('fr-FR') : '',
    tx.txHash || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, filename);
}

export function exportBotsPerformanceToCSV(bots: any[], filename: string = 'algo_trade_bots_report.csv') {
  if (!bots || bots.length === 0) {
    alert("Aucun bot à exporter.");
    return;
  }

  const headers = ['ID Bot', 'Mode', 'Devise', 'Nom/Stratégie', 'Paire', 'Statut', 'Capital Alloué', 'PnL Net', 'Trades Totaux', 'Win Rate (%)', 'Modèle IA'];
  const rows = bots.map(b => {
    const isReal = (b.mode || 'DEMO') === 'REAL';
    const currency = isReal ? 'SOL' : 'USD';
    return [
      b.id || '',
      isReal ? 'RÉEL' : 'DÉMO',
      currency,
      b.strategy || b.name || '',
      b.pair || '',
      b.status || '',
      b.capital || 0,
      b.pnl ?? b.netProfit ?? 0,
      b.tradesCount ?? b.totalTrades ?? 0,
      b.winRate || 0,
      b.aiModel || 'Gemini 2.5'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, filename);
}

function downloadCSVFile(csvContent: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
