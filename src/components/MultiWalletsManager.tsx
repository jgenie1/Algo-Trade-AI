"use client";

import React from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  TableHead 
} from '@/components/ui/table';

interface SubWallet {
  publicKey: string;
  privateKey: string;
  balance: number | null;
}

interface MultiWalletsManagerProps {
  subWallets: SubWallet[];
  isSolanaWalletActive: boolean;
  disperseAmount: number;
  setDisperseAmount: (val: number) => void;
  isDispersing: boolean;
  disperseTxHash: string;
  disperseError: string;
  handleDisperseSOL: () => Promise<void>;
}

export default function MultiWalletsManager({
  subWallets,
  isSolanaWalletActive,
  disperseAmount,
  setDisperseAmount,
  isDispersing,
  disperseTxHash,
  disperseError,
  handleDisperseSOL
}: MultiWalletsManagerProps) {
  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl p-5 space-y-5 shadow-xl">
      <CardHeader className="p-0">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white/70 font-headline">
          Gestionnaire de Sous-Portefeuilles
        </CardTitle>
        <p className="text-[10px] text-white/40 mt-1 font-body leading-relaxed">
          Gerez vos portefeuilles secondaires de Market Making. Ces adresses sont générées localement et sont utilisées pour simuler de multiples acheteurs réels on-chain (Auto-Bump).
        </p>
      </CardHeader>

      <CardContent className="p-0 space-y-5">
        {/* Disperse SOL Panel */}
        <div className="bg-purple-950/15 border border-purple-500/15 rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 font-headline">Distribuer du SOL (Disperse)</span>
            <span className="text-[10px] text-white/40 font-body">Portefeuille principal connecté</span>
          </div>
          
          {!isSolanaWalletActive && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300 font-body leading-relaxed space-y-1">
              <p>⚠️ <strong>Clé principale manquante</strong> :</p>
              <p>Votre clé <code>SOLANA_PRIVATE_KEY</code> n'est pas encore configurée dans le fichier <code>.env</code>.</p>
              <p className="text-white/40">Veuillez la renseigner et relancer le serveur de dev pour pouvoir distribuer du SOL en réel.</p>
            </div>
          )}
          
          <div className="space-y-2 font-body">
            <label className="text-[10px] font-bold text-white/50 uppercase font-headline">Montant par Portefeuille (SOL)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.005"
                min="0.001"
                value={disperseAmount}
                onChange={(e) => setDisperseAmount(Math.max(0.001, parseFloat(e.target.value) || 0))}
                className="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs focus:outline-none text-white"
              />
              <Button
                onClick={handleDisperseSOL}
                disabled={isDispersing || !isSolanaWalletActive}
                className="h-10 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold text-xs rounded-xl transition-all border border-purple-500/30"
              >
                {isDispersing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin mr-1.5" />
                    Envoi...
                  </>
                ) : (
                  "Distribuer SOL"
                )}
              </Button>
            </div>
          </div>

          {disperseError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-body">
              ❌ {disperseError}
            </div>
          )}

          {disperseTxHash && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-body space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                SOL Distribué avec succès !
              </p>
              <a
                href={`https://solscan.io/tx/${disperseTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-emerald-300 block font-mono"
              >
                Hash: {disperseTxHash.slice(0, 20)}...
              </a>
            </div>
          )}
        </div>

        {/* Sub-wallets list */}
        <div className="border border-white/5 rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-white/[0.02] border-b border-white/5">
              <TableRow className="border-b border-white/5 hover:bg-transparent">
                <TableHead className="py-2 text-[9px] uppercase font-bold text-white/40 font-headline pl-3">Portefeuille</TableHead>
                <TableHead className="py-2 text-[9px] uppercase font-bold text-white/40 font-headline">Adresse Publique (Solana)</TableHead>
                <TableHead className="py-2 text-[9px] uppercase font-bold text-white/40 font-headline text-right pr-3">Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subWallets.map((w, index) => (
                <TableRow key={w.publicKey} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <TableCell className="py-2.5 pl-3 font-semibold text-white text-xs border-none font-body">
                    Sous-Wallet #{index + 1}
                  </TableCell>
                  <TableCell className="py-2.5 font-mono text-[9px] text-white/60 border-none">
                    <span className="block">{w.publicKey.slice(0, 8)}...{w.publicKey.slice(-8)}</span>
                    <span className="block text-[8px] text-purple-400/50 mt-0.5 truncate max-w-[120px]">
                      PK: {w.privateKey.slice(0, 6)}...
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right pr-3 font-bold text-purple-300 font-body text-xs border-none">
                    {w.balance !== null ? `${w.balance.toFixed(4)} SOL` : '0.0000 SOL'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
