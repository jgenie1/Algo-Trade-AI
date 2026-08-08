"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, ShieldCheck, Info } from 'lucide-react';

const GUIDE_TABS = [
  { id: 'exchanges', label: 'Depuis un Exchange' },
  { id: 'wallets', label: 'Depuis Phantom' },
  { id: 'security', label: 'Sécurité Blockchain' }
] as const;

type GuideTab = typeof GUIDE_TABS[number]['id'];

interface DepositGuidesCardProps {
  solanaPubKey: string;
}

export default function DepositGuidesCard({ solanaPubKey }: DepositGuidesCardProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>('exchanges');

  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Info className="h-4 w-4 text-[#c2ff0c]" />
          <h2 className="text-sm font-bold text-white font-headline">Guide de Dépôt On-Chain</h2>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl gap-1">
          {GUIDE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all font-headline ${
                activeTab === tab.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-white/60 space-y-3 font-body pt-2 leading-relaxed">
          {activeTab === 'exchanges' && (
            <>
              <p>1. Connectez-vous sur votre compte Binance, Coinbase ou Bybit.</p>
              <p>2. Allez dans Retrait / Withdraw ➔ Sélectionnez la crypto SOL (Solana).</p>
              <p>3. Collez votre adresse unique ci-dessus : <span className="font-mono text-[#c2ff0c]">{solanaPubKey ? `${solanaPubKey.slice(0, 8)}...` : 'Chargement...'}</span></p>
              <p>4. Validez l'envoi. La transaction est confirmée sur Solana en moins de 3 secondes.</p>
            </>
          )}

          {activeTab === 'wallets' && (
            <>
              <p>1. Ouvrez votre extension Phantom ou Solflare.</p>
              <p>2. Cliquez sur Envoyez / Send ➔ Choisissez SOL.</p>
              <p>3. Entrez l'adresse de votre bot et indiquez le montant.</p>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold font-headline">
                <ShieldCheck className="h-4 w-4" /> Vos fonds restent 100% sous votre contrôle
              </div>
              <p className="text-white/50 text-[11px]">
                Le dépôt s'effectue directement sur le réseau Solana Mainnet. Aucun intermédiaire centralisé ne bloque vos retraits.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
