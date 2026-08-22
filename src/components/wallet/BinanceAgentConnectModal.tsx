"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Lock, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Activity,
  Globe,
  Sliders,
  DollarSign,
  Cpu
} from 'lucide-react';
import { 
  getBinanceAgentConfig, 
  saveBinanceAgentConfig, 
  fetchBinanceAccountInfo, 
  testBinanceAgentOsLatency,
  triggerBinanceEmergencyStop,
  BinanceAccountInfo,
  BinanceAgentConfig
} from '@/services/binanceMcpService';
import { dispatchAlert } from '@/services/notificationService';

interface BinanceAgentConnectModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  triggerButton?: React.ReactNode;
}

export default function BinanceAgentConnectModal({ isOpen, onClose, triggerButton }: BinanceAgentConnectModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isModalOpen = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = (open: boolean) => {
    if (onClose && !open) onClose();
    setInternalOpen(open);
  };

  const [config, setConfig] = useState<BinanceAgentConfig>({
    mcpEndpoint: 'https://agent.binance.com/mcp/agentic',
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
    maxAllocatedCapitalUsdt: 1000,
    emergencyStopActive: false,
    autoStopLossPercent: 4.0,
    autoTakeProfitPercent: 8.0,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [accountInfo, setAccountInfo] = useState<BinanceAccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cfg = getBinanceAgentConfig();
      setConfig(cfg);
      loadAccountData();
    }
  }, []);

  const loadAccountData = async () => {
    setIsLoading(true);
    try {
      const info = await fetchBinanceAccountInfo();
      setAccountInfo(info);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const updated = saveBinanceAgentConfig(config);
    setConfig(updated);

    const latency = await testBinanceAgentOsLatency(config.isTestnet);

    if (config.apiKey && config.apiSecret) {
      const info = await fetchBinanceAccountInfo();
      setAccountInfo(info);

      if (info.isConnected) {
        setTestResult({
          success: true,
          message: `✅ Connexion réussie à Binance Agent OS (${latency.latencyMs}ms) ! Solde USDT: $${info.totalBalanceUsdt.toFixed(2)}`
        });
        dispatchAlert(
          "Binance Agent OS Connecté",
          `Connexion établie avec succès. Vos 5 bots IA ont accès à la liquidité Binance dans la limite de ${config.maxAllocatedCapitalUsdt} $USDT.`,
          "TEST"
        );
      } else {
        setTestResult({
          success: false,
          message: info.error 
            ? `⚠️ ${info.error}` 
            : `⚠️ Clés API enregistrées mais validation échouée. Vérifiez vos restrictions d'IP et autorisations Spot.`
        });
      }
    } else {
      setTestResult({
        success: true,
        message: `✅ Point de terminaison MCP enregistré (${latency.latencyMs}ms). Ajoutez vos clés d'Agentic Sub-Account pour activer le trading réel.`
      });
    }

    setIsTesting(false);
  };

  const handleEmergencyStop = async () => {
    if (!confirm("🚨 Confirmez-vous le déclenchement de l'Arrêt d'Urgence Binance ?\nTous les ordres actifs seront instantanément annulés.")) {
      return;
    }

    setIsEmergencyStopping(true);
    const res = await triggerBinanceEmergencyStop();
    setConfig(prev => ({ ...prev, emergencyStopActive: true }));
    setIsEmergencyStopping(false);
    alert(res.message);
    loadAccountData();
  };

  const handleUnlockEmergencyStop = () => {
    saveBinanceAgentConfig({ emergencyStopActive: false });
    setConfig(prev => ({ ...prev, emergencyStopActive: false }));
    alert("✅ Arrêt d'urgence désactivé. Les bots peuvent à nouveau envoyer des ordres vers Binance.");
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="bg-[#0f0b1a]/95 backdrop-blur-2xl border border-yellow-500/30 text-white rounded-3xl max-w-xl shadow-[0_20px_70px_rgba(0,0,0,0.9),0_0_30px_rgba(240,185,11,0.15)] space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#f0b90b]/15 border border-[#f0b90b]/50 flex items-center justify-center text-[#f0b90b] shadow-[0_0_15px_rgba(240,185,11,0.3)]">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="font-headline text-lg font-black text-white flex items-center gap-2">
                  <span>Binance Agent OS</span>
                  <Badge className="bg-[#f0b90b] text-black font-black text-[9px] hover:bg-[#f0b90b] tracking-wider uppercase">
                    MCP Native
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-white/50 text-xs font-body">
                  Connecteur Officiel Model Context Protocol & Agentic Sub-Account
                </DialogDescription>
              </div>
            </div>

            {/* Statut de Connexion */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {accountInfo?.isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                )}
              </span>
              <span className="text-[11px] font-mono font-bold text-white/80">
                {accountInfo?.isConnected ? 'CONNECTÉ' : 'PRÊT (MCP)'}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Live Banner & Protocol Details */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-yellow-950/40 via-[#f0b90b]/10 to-transparent border border-[#f0b90b]/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60 font-medium flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[#f0b90b]" /> Serveur MCP Officiel :
            </span>
            <span className="font-mono text-[10px] text-[#f0b90b] bg-black/50 px-2 py-0.5 rounded-md border border-[#f0b90b]/30">
              agent.binance.com/mcp/agentic
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60 font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Sécurité Isolation :
            </span>
            <span className="text-emerald-300 text-[11px] font-semibold">
              Agentic Sub-Account (Fonds Dédiés)
            </span>
          </div>
        </div>

        {/* Formulaire de Configuration */}
        <form onSubmit={handleSaveAndConnect} className="space-y-4">
          {/* Sélection Réseau : Mainnet vs Testnet */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-black/50 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setConfig(c => ({ ...c, isTestnet: false }))}
              className={`py-2 text-xs font-bold font-headline uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !config.isTestnet 
                  ? 'bg-[#f0b90b] text-black shadow-md font-black' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Binance Mainnet (Réel)</span>
            </button>
            <button
              type="button"
              onClick={() => setConfig(c => ({ ...c, isTestnet: true }))}
              className={`py-2 text-xs font-bold font-headline uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                config.isTestnet 
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Binance Testnet (Sandbox)</span>
            </button>
          </div>

          {/* Clé API Agentic */}
          <div className="space-y-1.5">
            <label className="text-xs font-headline font-bold text-white/80 uppercase flex items-center justify-between">
              <span>Clé API Agentic (API Key)</span>
              <span className="text-[10px] text-white/40 font-normal">Fourni par Binance</span>
            </label>
            <Input
              type="text"
              placeholder="ex: 4v7yvW6c..."
              value={config.apiKey || ''}
              onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value.trim() }))}
              className="bg-black/60 border-white/12 text-white text-xs font-mono rounded-xl focus:border-[#f0b90b]"
            />
          </div>

          {/* Secret API */}
          <div className="space-y-1.5">
            <label className="text-xs font-headline font-bold text-white/80 uppercase flex items-center justify-between">
              <span>Secret API (API Secret)</span>
              <span className="text-[10px] text-white/40 font-normal">Chiffré en local</span>
            </label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder="ex: 9xKd7sLa..."
                value={config.apiSecret || ''}
                onChange={e => setConfig(c => ({ ...c, apiSecret: e.target.value.trim() }))}
                className="bg-black/60 border-white/12 text-white text-xs font-mono rounded-xl pr-10 focus:border-[#f0b90b]"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Plafond de Capital Alloué & Stop Loss */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-headline font-bold text-white/70 uppercase">
                Plafond Capital IA ($ USDT)
              </label>
              <Input
                type="number"
                min="10"
                max="100000"
                value={config.maxAllocatedCapitalUsdt}
                onChange={e => setConfig(c => ({ ...c, maxAllocatedCapitalUsdt: parseFloat(e.target.value) || 1000 }))}
                className="bg-black/60 border-white/12 text-white text-xs font-mono rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-headline font-bold text-white/70 uppercase">
                Stop-Loss Strict Auto (%)
              </label>
              <Input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={config.autoStopLossPercent}
                onChange={e => setConfig(c => ({ ...c, autoStopLossPercent: parseFloat(e.target.value) || 4 }))}
                className="bg-black/60 border-white/12 text-[#c2ff0c] text-xs font-mono font-bold rounded-xl"
              />
            </div>
          </div>

          {/* Message de résultat du test */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/40 border-red-500/40 text-rose-300'
            }`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="h-4 w-4 shrink-0 text-rose-400" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Boutons d'Action */}
          <div className="flex gap-2.5 pt-2">
            <Button
              type="submit"
              disabled={isTesting}
              className="flex-1 h-11 bg-gradient-to-r from-[#f0b90b] to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-headline font-black text-xs rounded-xl shadow-[0_0_20px_rgba(240,185,11,0.3)] transition-all cursor-pointer active:scale-95"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  <span>Enregistrer & Connecter Agent OS</span>
                </>
              )}
            </Button>

            {/* Emergency Stop Button */}
            {config.emergencyStopActive ? (
              <Button
                type="button"
                onClick={handleUnlockEmergencyStop}
                className="h-11 px-4 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-headline font-bold text-xs rounded-xl"
              >
                Déverrouiller
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleEmergencyStop}
                disabled={isEmergencyStopping}
                className="h-11 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-rose-300 font-headline font-bold text-xs rounded-xl"
                title="Arrêt d'Urgence : Annule tous les ordres Binance"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>

        {/* Soldes Réels du Sous-Compte si connecté */}
        {accountInfo && accountInfo.isConnected && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[11px] font-headline font-bold text-white/50 uppercase">
              Soldes Détectés sur Binance Agentic :
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/50">USDT Libre</span>
                <span className="text-xs font-mono font-black text-[#f0b90b]">
                  ${accountInfo.freeBalanceUsdt.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/50">Total Portefeuille</span>
                <span className="text-xs font-mono font-black text-white">
                  ${accountInfo.totalBalanceUsdt.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/50">Latence MCP</span>
                <span className="text-xs font-mono font-black text-emerald-400">
                  {accountInfo.latencyMs} ms
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
