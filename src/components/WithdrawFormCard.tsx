"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet } from 'lucide-react';

interface WithdrawFormCardProps {
  tradingMode: 'DEMO' | 'REAL';
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  recipientAddress: string;
  setRecipientAddress: (val: string) => void;
  isLoading: boolean;
  handleWithdraw: (e: React.FormEvent) => void;
  handlePercentClick: (pct: number) => void;
  handleFillConnectedWeb3Address: () => void;
  connectedWeb3Wallet: { name: string; address: string; chain: string } | null;
  errorMsg: string;
  txHash: string;
}

export default function WithdrawFormCard({
  tradingMode,
  withdrawAmount,
  setWithdrawAmount,
  recipientAddress,
  setRecipientAddress,
  isLoading,
  handleWithdraw,
  handlePercentClick,
  handleFillConnectedWeb3Address,
  connectedWeb3Wallet,
  errorMsg,
  txHash
}: WithdrawFormCardProps) {
  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl">
      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleWithdraw} className="space-y-4">
          <h2 className="text-lg font-bold font-headline text-rose-400">Formulaire de Retrait</h2>

          {tradingMode === 'REAL' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Adresse Destinataire Solana</label>
                <button
                  type="button"
                  onClick={handleFillConnectedWeb3Address}
                  className="text-[10px] font-bold text-[#c2ff0c] hover:underline flex items-center gap-1"
                >
                  <Wallet className="h-3 w-3" /> Auto-remplir Web3
                </button>
              </div>
              <Input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Ex: Gk9...SolanaPubKey"
                className="h-11 bg-white/5 border-white/10 text-white font-mono text-xs"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-white/50 font-headline">
              Montant ({tradingMode === 'REAL' ? 'SOL' : 'USD'})
            </label>
            <Input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Montant à retirer"
              className="h-11 bg-white/5 border-white/10 text-white font-body"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map(pct => (
              <Button
                key={pct}
                type="button"
                variant="ghost"
                onClick={() => handlePercentClick(pct)}
                className="py-1.5 h-auto bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-xs font-bold font-headline border-none"
              >
                {pct}%
              </Button>
            ))}
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-body">{errorMsg}</p>}
          {txHash && (
            <p className="text-xs text-emerald-400 font-mono break-all">
              Transaction réussie ! Hash : {txHash}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-extrabold font-headline rounded-xl"
          >
            {isLoading ? 'Traitement du retrait...' : 'Confirmer le Retrait'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
