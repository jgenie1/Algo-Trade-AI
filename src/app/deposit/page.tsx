"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  Copy, 
  Check, 
  Coins, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  History,
  QrCode,
  HelpCircle,
  ArrowUpRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRealSolanaBalance } from '@/services/pumpFunService';
import { useAppState } from '@/context/AppContext';

export default function DepositPage() {
  const { tradingMode, setTradingMode, balance, setBalance, transactions, setTransactions } = useAppState();
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('1000');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'exchanges' | 'wallets' | 'security'>('exchanges');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (tradingMode === 'REAL') {
      getRealSolanaBalance().then(res => {
        if (res.success && res.balance !== undefined && res.publicKey) {
          setSolanaBalance(res.balance);
          setSolanaPubKey(res.publicKey);
        }
      });
    }
  }, [tradingMode, isMounted]);

  const handleCopyAddress = () => {
    if (!solanaPubKey) return;
    navigator.clipboard.writeText(solanaPubKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDemoDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    setIsLoading(true);

    setTimeout(() => {
      const nextBal = balance + amt;
      setBalance(nextBal);
      
      // Save transaction to global state
      const newTx = {
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        type: 'DEPOSIT',
        amount: amt,
        currency: 'USD',
        timestamp: Date.now(),
        status: 'COMPLETED'
      };
      
      setTransactions(prev => [newTx, ...(prev || [])]);
      
      setIsLoading(false);
      setDepositAmount('1000');
    }, 800);
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
          <span className="text-sm text-white/50">Chargement...</span>
        </div>
      </div>
    );
  }

  // Filter transactions for display
  const currentTxs = (transactions || []).filter(tx => 
    tradingMode === 'REAL' ? tx.currency === 'SOL' : tx.currency === 'USD'
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ArrowDownLeft className="h-8 w-8 text-[#c2ff0c]" />
            Créditer le Compte
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">Ajoutez du capital USD simulé en mode Démo, ou déposez des SOL réels pour alimenter vos bots on-chain.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setTradingMode('DEMO')}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'DEMO'
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Démo (Simulé)
          </button>
          <button
            onClick={() => setTradingMode('REAL')}
            className={cn(
              "px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 font-headline flex items-center gap-1.5",
              tradingMode === 'REAL'
                ? "bg-purple-600/25 text-purple-300 border border-purple-500/20"
                : "text-white/40 hover:text-white/80"
            )}
          >
            Mode Réel (Solana)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Action Card */}
        <div className="md:col-span-7 bg-[#14101a] border border-white/10 rounded-2xl p-6 space-y-6 relative overflow-hidden">
          {tradingMode === 'DEMO' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold font-headline text-amber-400">Générateur de Fonds Fictifs</h2>
                <p className="text-xs text-white/40 mt-1 font-body leading-relaxed">
                  Augmentez instantanément votre réserve de démonstration pour tester l'impact de transactions à plus fort capital avec vos algorithmes de trading.
                </p>
              </div>

              <form onSubmit={handleDemoDeposit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Montant à créditer (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">$</span>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Ex: 5000"
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 text-sm focus:ring-[#c2ff0c] text-white font-body focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['1000', '5000', '10000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDepositAmount(val)}
                      className="py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold font-headline transition-all"
                    >
                      +{parseFloat(val).toLocaleString()} $
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#c2ff0c] text-black font-bold text-xs rounded-xl font-headline uppercase transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(194,255,12,0.3)] mt-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Créditement...
                    </>
                  ) : (
                    "Créditer le Compte Démo"
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold font-headline text-purple-400">Adresse de Dépôt SOL (Solana)</h2>
                <p className="text-xs text-white/40 mt-1 font-body leading-relaxed">
                  Envoyez des jetons SOL vers cette adresse unique. Le crédit sera détecté automatiquement sur la blockchain Solana.
                </p>
              </div>

              {solanaPubKey ? (
                <div className="space-y-4">
                  {/* Address Display Box */}
                  <div className="bg-purple-950/10 border border-purple-500/15 rounded-xl p-4 space-y-2">
                    <span className="text-[9px] font-bold text-purple-300 uppercase font-headline">Adresse de Réception Publique</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={solanaPubKey}
                        className="flex-1 bg-black/45 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/80 focus:outline-none select-all"
                      />
                      <button
                        onClick={handleCopyAddress}
                        className="p-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-all flex items-center justify-center shrink-0"
                      >
                        {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Warning banner */}
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 font-body leading-relaxed space-y-1">
                    <p className="font-semibold">⚠️ Attention :</p>
                    <p>Déposez uniquement des jetons <strong>SOL (Native SOL)</strong> sur le réseau principal Solana. Tout autre jeton ou autre blockchain causera la perte irréversible de vos actifs.</p>
                  </div>

                  <a
                    href={`https://solscan.io/account/${solanaPubKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-body hover:underline"
                  >
                    Vérifier les transactions récentes sur Solscan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center text-xs text-amber-400 font-body">
                  ⚠️ Clé privée Solana non configurée dans le fichier <code>.env</code>.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Balance Card & QR Code Card */}
        <div className="md:col-span-5 space-y-6">
          {/* Balance Preview Card */}
          <div className="bg-gradient-to-br from-[#1b1527] to-[#120d1c] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#c2ff0c]/10 rounded-full blur-xl pointer-events-none" />

            <div className="space-y-4 relative">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-headline block">Solde Courant</span>
              
              {tradingMode === 'DEMO' ? (
                <div className="space-y-2">
                  <div className="text-3xl font-extrabold text-amber-400 font-body">
                    {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $
                  </div>
                  <div className="text-[10px] text-white/30 font-body leading-relaxed">
                    Fonds virtuels simulés. Parfait pour tester les stratégies de bots sans risque de pertes réelles.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl font-extrabold text-purple-300 font-body flex items-center gap-2">
                    <Coins className="h-7 w-7 text-purple-400" />
                    <span>{solanaBalance !== null ? `${solanaBalance.toFixed(4)} SOL` : '0.0000 SOL'}</span>
                  </div>
                  <div className="text-[10px] text-white/30 font-body leading-relaxed">
                    Fonds on-chain réels reliés à votre clé privée. Les frais de gaz de trading sont payés en SOL.
                  </div>
                </div>
              )}

              <div className="border-t border-white/5 pt-4 flex items-center gap-2.5 text-[10px] text-white/40 font-body leading-relaxed">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>Sécurité : Les clés privées sont stockées localement et chiffrées. Aucune clé ne transite en clair.</span>
              </div>
            </div>
          </div>

          {/* QR Code Card (Only visible in Real Mode with a valid public key) */}
          {tradingMode === 'REAL' && solanaPubKey && (
            <div className="bg-[#14101a] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider font-headline self-start">Scanner le QR Code</span>
              <div className="p-3 bg-white rounded-xl flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${solanaPubKey}`}
                  alt="Solana Deposit QR Code"
                  className="w-36 h-36"
                />
              </div>
              <span className="text-[9px] text-white/40 text-center font-body max-w-[200px]">
                Scannez ce QR Code depuis votre portefeuille mobile (Phantom, Solflare) pour effectuer un envoi rapide.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Guide & Help Section */}
      <div className="bg-[#14101a] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-white">
          <HelpCircle className="h-5 w-5 text-[#c2ff0c]" />
          Comment approvisionner votre compte réel ?
        </h2>
        
        {/* Help Tabs */}
        <div className="flex border-b border-white/5 pb-2 gap-4">
          {[
            { id: 'exchanges', label: 'Depuis un Exchange (Binance, Coinbase)' },
            { id: 'wallets', label: 'Depuis un Web3 Wallet (Phantom)' },
            { id: 'security', label: 'Règles de Sécurité blockchain' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveGuideTab(tab.id as any)}
              className={cn(
                "pb-2 text-xs font-semibold font-headline transition-all relative",
                activeGuideTab === tab.id ? "text-[#c2ff0c]" : "text-white/40 hover:text-white/80"
              )}
            >
              {tab.label}
              {activeGuideTab === tab.id && (
                <span className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[#c2ff0c]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="text-xs text-white/60 font-body leading-relaxed pt-2">
          {activeGuideTab === 'exchanges' && (
            <ol className="list-decimal pl-4 space-y-2">
              <li>Achetez du <strong>Solana (SOL)</strong> sur votre plateforme préférée.</li>
              <li>Allez dans votre portefeuille sur l'exchange et cliquez sur <strong>Retirer</strong>.</li>
              <li>Collez l'adresse publique affichée ci-dessus comme adresse de destination.</li>
              <li>Sélectionnez obligatoirement le réseau <strong>Solana (SOL)</strong>.</li>
              <li>Validez l'envoi. La transaction prend généralement moins de 30 secondes pour être créditée.</li>
            </ol>
          )}

          {activeGuideTab === 'wallets' && (
            <ol className="list-decimal pl-4 space-y-2">
              <li>Ouvrez votre extension de portefeuille web3 (Phantom, Solflare, Backpack).</li>
              <li>Sélectionnez vos jetons SOL et cliquez sur <strong>Envoyer</strong>.</li>
              <li>Scannez le QR Code ou copiez-collez l'adresse de réception ci-dessus.</li>
              <li>Saisissez le montant de SOL et confirmez le transfert.</li>
            </ol>
          )}

          {activeGuideTab === 'security' && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-rose-400">
                <Info className="h-4 w-4 shrink-0" />
                Ne déposez jamais de jetons provenant d'autres chaînes comme Ethereum ou BSC sans pont (bridge).
              </p>
              <p>Chaque transaction nécessite des frais de réseau minimes payés en SOL. Nous vous recommandons de toujours laisser au moins 0.05 SOL sur le portefeuille pour payer les frais de gaz lors des trades futurs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-[#14101a]/80 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2 text-white">
          <History className="h-5 w-5 text-purple-400" />
          Historique des Mouvements ({tradingMode === 'DEMO' ? 'Démo' : 'Réel'})
        </h2>

        {currentTxs.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl font-body">
            Aucun dépôt ou retrait n'a été enregistré pour le moment en mode {tradingMode === 'DEMO' ? 'Démo' : 'Réel'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-white/40 uppercase font-headline text-[9px] tracking-wider">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Montant</th>
                  <th className="pb-3">Devise</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Statut</th>
                  {tradingMode === 'REAL' && <th className="pb-3 pr-2 text-right">Blockchain</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentTxs.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pl-2 font-mono text-white/40">{tx.id}</td>
                    <td className="py-3">
                      {tx.type === 'DEPOSIT' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          Dépôt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Retrait
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      {tx.type === 'DEPOSIT' ? '+' : '-'} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-white/60 font-medium">{tx.currency}</td>
                    <td className="py-3 text-white/40">
                      {new Date(tx.timestamp).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        {tx.status}
                      </span>
                    </td>
                    {tradingMode === 'REAL' && (
                      <td className="py-3 pr-2 text-right">
                        {tx.txHash ? (
                          <a
                            href={`https://solscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline font-medium"
                          >
                            Détails
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
