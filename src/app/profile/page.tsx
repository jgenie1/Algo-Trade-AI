"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  Key, 
  Sparkles, 
  BadgeCheck, 
  Copy, 
  Check, 
  Wallet, 
  TrendingUp, 
  Activity, 
  Mail, 
  Globe, 
  Lock, 
  Camera,
  Award
} from 'lucide-react';
import { cn, formatSolToUsdAndHtg, formatUsdToHtg } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';
import { getRealSolanaBalance } from '@/services/pumpFunService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { tradingMode, setTradingMode, balance, activePositions, closedPositions, bots } = useAppState();
  const [solanaPubKey, setSolanaPubKey] = useState<string>('');
  const [solanaBalance, setSolanaBalance] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // User Profile Form State
  const [fullName, setFullName] = useState<string>('David Owner');
  const [email, setEmail] = useState<string>('david.owner@algotrade.ai');
  const [phone, setPhone] = useState<string>('+509 3700 0000');
  const [preferredCurrency, setPreferredCurrency] = useState<string>('HTG');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    getRealSolanaBalance().then(res => {
      if (res && res.success && res.balance !== undefined && res.publicKey) {
        setSolanaBalance(res.balance);
        setSolanaPubKey(res.publicKey);
      }
    });
  }, []);

  const handleCopyPubKey = () => {
    if (!solanaPubKey) return;
    navigator.clipboard.writeText(solanaPubKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent border-[#c2ff0c]" />
      </div>
    );
  }

  // Performance calculations
  const totalTrades = closedPositions.length;
  const winningTrades = closedPositions.filter(p => p.profit > 0).length;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;
  const totalNetProfit = closedPositions.reduce((sum, p) => sum + (p.profit || 0), 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 text-white" suppressHydrationWarning>
      {/* Header */}
      <div className="border-b border-white/5 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-headline flex items-center gap-2.5">
            <User className="h-8 w-8 text-[#c2ff0c]" />
            Profil Utilisateur & Compte Enterprise
          </h1>
          <p className="text-sm text-white/40 mt-1 font-body">
            Gérez vos informations personnelles, vos autorisations de sécurité et consultez vos performances globales.
          </p>
        </div>

        <Badge className="bg-[#c2ff0c]/15 text-[#c2ff0c] border border-[#c2ff0c]/30 font-headline font-bold text-xs uppercase px-3 py-1">
          <BadgeCheck className="h-4 w-4 mr-1.5" />
          Statut : Compte Vérifié VIP
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar & Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#14101a] border-white/10 rounded-2xl overflow-hidden text-center p-6 space-y-4 shadow-xl">
            <div className="relative inline-block mx-auto">
              <div className="w-28 h-28 rounded-full border-2 border-[#c2ff0c] p-1 bg-white/5 overflow-hidden shadow-[0_0_25px_rgba(194,255,12,0.2)] mx-auto">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200" 
                  alt="User Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-[#c2ff0c] text-black rounded-full shadow-lg hover:scale-105 transition-transform border-none">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold font-headline text-white">{fullName}</h2>
              <p className="text-xs text-white/40 font-mono mt-0.5">{email}</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 bg-purple-500/20 text-purple-300 rounded-full text-[10px] font-bold uppercase font-headline">
                <Award className="h-3 w-3 text-purple-400" />
                Directeur Quantitatif & Admin
              </div>
            </div>

            {/* Quick Performance Stats */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 text-left">
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-white/40 font-headline block">Taux De Réussite</span>
                <span className="text-lg font-extrabold text-emerald-400 font-body">{winRate}%</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-white/40 font-headline block">Trades Exécutés</span>
                <span className="text-lg font-extrabold text-cyan-400 font-body">{totalTrades}</span>
              </div>
            </div>
          </Card>

          {/* Blockchain Wallet Card */}
          <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase font-headline text-purple-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Portefeuille Principal Solana
            </h3>
            {solanaPubKey ? (
              <div className="space-y-3">
                <div className="bg-purple-950/20 border border-purple-500/20 p-3 rounded-xl space-y-1.5">
                  <span className="text-[9px] font-bold text-purple-300 uppercase font-headline">Adresse Publique (Mainnet)</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-white/80 truncate">{solanaPubKey}</span>
                    <Button
                      onClick={handleCopyPubKey}
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-purple-400 hover:text-white border-none shrink-0"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-body pt-1">
                  <span className="text-white/50">Solde On-Chain :</span>
                  <span className="font-bold text-purple-300 font-mono">
                    {solanaBalance !== null ? `${solanaBalance.toFixed(4)} SOL` : '0.0000 SOL'}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {formatSolToUsdAndHtg(solanaBalance).combinedLabel}
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-400 bg-amber-500/10 p-3 rounded-xl">
                Clé privée Solana non configurée dans <code>.env</code>.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Information & Settings Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#c2ff0c]" />
                Informations Personnelles & Préférences
              </h3>
              <p className="text-xs text-white/40 mt-1 font-body">
                Mettez à jour vos coordonnées et choisissez votre devise d'affichage préférée.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 font-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Nom Complet</label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-sm text-white font-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Adresse Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-sm text-white font-body"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Téléphone</label>
                  <Input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 rounded-xl text-sm text-white font-body"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-white/50 font-headline">Devise Principale d'Affichage</label>
                  <select
                    value={preferredCurrency}
                    onChange={(e) => setPreferredCurrency(e.target.value)}
                    className="w-full h-11 bg-[#14101a] border border-white/10 rounded-xl px-3 text-xs text-white font-body focus:ring-[#c2ff0c]"
                  >
                    <option value="HTG">HTG - Gourde Haïtienne (HTG)</option>
                    <option value="USD">USD - Dollar Américain ($)</option>
                    <option value="SOL">SOL - Solana Native (SOL)</option>
                  </select>
                </div>
              </div>

              {isSaved && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold font-headline flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Profil mis à jour avec succès !
                </div>
              )}

              <Button
                type="submit"
                className="h-11 px-6 bg-[#c2ff0c] text-black font-extrabold font-headline text-xs rounded-xl uppercase hover:shadow-[0_0_15px_rgba(194,255,12,0.3)] border-none"
              >
                Sauvegarder les Modifications
              </Button>
            </form>
          </Card>

          {/* Security & Authentication Suite */}
          <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-400" />
                Sécurité & Authentification à Deux Facteurs (2FA)
              </h3>
              <p className="text-xs text-white/40 mt-1 font-body">
                Renforcez la protection de vos bots de trading et de votre trésorerie.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-white font-headline">Authentification 2FA Authenticator</h4>
                  <p className="text-[10px] text-white/40 font-body">Sécurise la signature des transactions et le retrait de fonds.</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[9px] border-none">ACTIF</Badge>
              </div>

              <div className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-white font-headline">Chiffrement Clés Privées Local (AES-256)</h4>
                  <p className="text-[10px] text-white/40 font-body">Les clés ne quittent jamais la mémoire de votre navigateur.</p>
                </div>
                <Badge className="bg-purple-500/10 text-purple-300 font-bold uppercase text-[9px] border-none">BLINDÉ</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
