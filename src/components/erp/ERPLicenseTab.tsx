"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Cpu, 
  Key, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Server, 
  Sparkles, 
  Download, 
  Copy, 
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ERPLicenseTabProps {
  selectedOrgName?: string;
  tradingMode: 'DEMO' | 'REAL';
}

export default function ERPLicenseTab({
  selectedOrgName = 'Hedge Fund Desk Alpha',
  tradingMode
}: ERPLicenseTabProps) {
  const [copied, setCopied] = useState(false);
  const licenseKey = "ENT-SaaS-2026-99A8-4F21-SOLANA-DESK-PRO";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDFContract = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) return;

    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Contrat_SLA_Enterprise_SaaS_${selectedOrgName.replace(/\s+/g, '_')}</title>
          <style>
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background: #fff; color: #1a1a1a; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6b21a8; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 22px; font-weight: bold; color: #4c1d95; }
            .subtitle { font-size: 13px; color: #666; }
            .badge { background: #10b981; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 15px; font-weight: bold; color: #1e1b4b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .grid-item { font-size: 13px; }
            .label { font-weight: bold; color: #475569; display: block; text-transform: uppercase; font-size: 10px; }
            .val { font-size: 13px; font-family: monospace; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; font-size: 11px; color: #64748b; text-align: center; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .sig-box { width: 45%; border-top: 1px dashed #94a3b8; padding-top: 10px; font-size: 12px; text-align: center; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">CONTRAT DE LICENCE SAAS & SLA ENTERPRISE</div>
              <div class="subtitle">Console ERP SaaS v4.2 • High-Frequency Algo Trade AI</div>
            </div>
            <div class="badge">CONTRAT CERTIFIÉ ACTIF</div>
          </div>

          <div class="section">
            <div class="section-title">1. IDENTIFICATION DES PARTIES & ORGANISATION</div>
            <div class="grid">
              <div class="grid-item">
                <span class="label">Organisation Cliente:</span>
                <span class="val">${selectedOrgName}</span>
              </div>
              <div class="grid-item">
                <span class="label">Plafond d'Actifs Sous Gestion (AUM):</span>
                <span class="val">2 500 000,00 $ USD</span>
              </div>
              <div class="grid-item">
                <span class="label">Clé de Licence Organisme:</span>
                <span class="val">${licenseKey}</span>
              </div>
              <div class="grid-item">
                <span class="label">Date d'Émission:</span>
                <span class="val">${todayStr}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. ENGAGEMENTS DE SERVICE (SLA) & RESSOURCES ALLOUÉES</div>
            <table>
              <thead>
                <tr>
                  <th>Composant Infrastructures</th>
                  <th>Garantie SLA / Quota</th>
                  <th>Statut Opérationnel</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Disponibilité des Noeuds RPC & Websockets</td>
                  <td>99.99% Uptime (Cloud Privé VPC)</td>
                  <td>Conforme (Support 24/7)</td>
                </tr>
                <tr>
                  <td>Capacité d'Exécution Robots Algorithmiques</td>
                  <td>Jusqu'à 10 Noeuds d'Arbitrage Simultanés</td>
                  <td>Actif (Solana & Multi-Actifs)</td>
                </tr>
                <tr>
                  <td>Volume d'Inférence IA Gemini 3.6 Flash</td>
                  <td>5 000 Requêtes Analyse Sentimentale / Mois</td>
                  <td>Actif</td>
                </tr>
                <tr>
                  <td>Protection Risques & Coupe-Circuit ERM</td>
                  <td>Latence d'exécution &lt; 50ms (Kill-Switch)</td>
                  <td>Actif</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">3. CONDITIONS JURIDIQUES & CONFIDENTIALITÉ</div>
            <p style="font-size: 12px; color: #334155;">
              La présente licence SaaS Enterprise accorde à l'Organisation sous-mentionnée un droit exclusif d'utilisation de la suite d'arbitrage algorithmique Algo-Trade AI. Les registres comptables du grand livre sont sécurisés par signature cryptographique SHA-256 et auditables en continu.
            </p>
          </div>

          <div class="signatures">
            <div class="sig-box">
              <strong>Pour Algo-Trade AI Enterprise SaaS</strong><br/><br/>
              <em>Signature numérique certifiée SHA-256</em>
            </div>
            <div class="sig-box">
              <strong>Pour l'Organisation: ${selectedOrgName}</strong><br/><br/>
              <em>Accepté & Immuable sur Blockchain</em>
            </div>
          </div>

          <div class="footer">
            Document officiel de Contrat SaaS & SLA Enterprise • Identifiant unique: CT-${Date.now()} • Document généré automatiquement
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* License Overview Header Card */}
      <Card className="bg-[#14101a] border-purple-500/30 rounded-2xl p-6 relative overflow-hidden space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Cpu className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-headline">
                  Licence SaaS Enterprise Multi-Tenant
                </h2>
                <Badge className="bg-purple-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 font-headline border-none shadow-md">
                  STABLE v4.2
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5 font-body">
                Organisation sous contrat: <span className="text-purple-300 font-bold">{selectedOrgName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 font-mono text-xs font-extrabold">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" /> LICENCE ACTIVE
            </Badge>
          </div>
        </div>

        {/* License Key Card */}
        <div className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-bold text-white/50 font-headline block">Clé de Licence Organisme (API Key Signature)</span>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={licenseKey}
              className="bg-white/5 border-white/15 text-xs font-mono font-bold text-purple-300 h-9"
            />
            <Button
              onClick={handleCopyKey}
              size="sm"
              className="h-9 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-extrabold font-headline rounded-lg flex items-center gap-1"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quotas and Resources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-cyan-400" />
              <span className="font-bold text-white font-headline text-sm">Requêtes RPC & Websockets</span>
            </div>
            <span className="text-xs text-cyan-400 font-mono font-bold">42.5%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '42.5%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>42 500 / 100 000 requêtes</span>
              <span>Reset mensuel</span>
            </div>
          </div>
          <p className="text-[11px] text-white/40 font-body">Flux en direct Solana Mainnet HFT et Yahoo Finance multi-actifs</p>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <span className="font-bold text-white font-headline text-sm">Noeuds d&apos;Exécution Bots</span>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold">3 / 10</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '30%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>3 robots actifs</span>
              <span>7 noeuds disponibles</span>
            </div>
          </div>
          <p className="text-[11px] text-white/40 font-body">Capacité de déploiement de bots algorithmiques simultanés</p>
        </Card>

        <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="font-bold text-white font-headline text-sm">Quota d&apos;Inférence IA Gemini</span>
            </div>
            <span className="text-xs text-purple-400 font-mono font-bold">850 / 5 000</span>
          </div>
          <div className="space-y-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: '17%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>850 générations</span>
              <span>4 150 restantes</span>
            </div>
          </div>
          <p className="text-[11px] text-white/40 font-body">Analyse sentimentale et génération de stratégies par IA</p>
        </Card>
      </div>

      {/* Contract & SLA Information */}
      <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
        <h3 className="text-base font-bold text-white font-headline border-b border-white/10 pb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#c2ff0c]" />
          Engagements de Service (SLA) & Facturation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-body">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-headline block">Disponibilité Garantie</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">99.99% SLA</span>
            <p className="text-[10px] text-white/30">Support technique 24/7 dédié</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-headline block">Prochaine Échéance</span>
            <span className="text-lg font-bold text-white font-mono">31 Déc. 2026</span>
            <p className="text-[10px] text-white/30">Renouvellement automatique</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-headline block">Mode d&apos;Hébergement</span>
            <span className="text-lg font-bold text-purple-300 font-mono">Private Cloud</span>
            <p className="text-[10px] text-white/30">Cluster dédié sous isolation VPC</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-slate-400 font-headline block">Facture Contrat</span>
            <Button
              onClick={handleDownloadPDFContract}
              size="sm"
              variant="outline"
              className="h-8 w-full border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-extrabold font-headline mt-1 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-md"
            >
              <Download className="h-3.5 w-3.5" /> PDF Contrat
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
