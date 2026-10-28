import React from 'react';
import { useTornData } from '../context/TornDataContext';
import { 
  RefreshCw, 
  Coins, 
  Wallet, 
  ShieldAlert, 
  Smartphone, 
  ShieldCheck,
  Building2,
  Sparkles
} from 'lucide-react';

export default function Navbar() {
  const { commandData, syncStatus, syncing, syncTorn, installPrompt, promptPWAInstall, isInstalled } = useTornData();
  const mugRisk = commandData?.mugRisk;
  const syncState = syncStatus?.syncState;

  const formatMoney = (val) => '$' + Number(val || 0).toLocaleString();

  return (
    <header className="sticky top-0 z-30 bg-[#060911]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Branding & Tag */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[2px] shadow-lg shadow-emerald-500/20">
            <div className="h-full w-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center font-black text-emerald-400 text-lg">
              T
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
                Torn Museum Ledger
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>KeLsGaming23</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono">
                {syncState?.last_synced_at ? `Synced: ${new Date(syncState.last_synced_at).toLocaleTimeString()}` : 'Live'}
              </span>
            </p>
          </div>
        </div>

        {/* Center: Live Cash & Points pill */}
        {mugRisk && (
          <div className="hidden md:flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Cash:</span>
              <span className={`font-mono font-bold ${mugRisk.isMugRiskHigh ? 'text-rose-400' : 'text-slate-200'}`}>
                {formatMoney(mugRisk.moneyOnHand)}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] text-slate-400">Vault:</span>
              <span className="font-mono font-bold text-slate-200">{formatMoney(mugRisk.vaultAmount)}</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-400">Points:</span>
              <span className="font-mono font-bold text-amber-300">
                {commandData?.kpis?.pointsBalance?.toLocaleString() || 0} pts
              </span>
            </div>
          </div>
        )}

        {/* Right: Sync Button & PWA Install */}
        <div className="flex items-center gap-3">
          
          {/* Android PWA Install Button */}
          {!isInstalled && (
            <button
              onClick={promptPWAInstall}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md shadow-emerald-950/20 active:scale-95 transition-all"
              title="Install Web App on Android or Desktop"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Install PWA</span>
            </button>
          )}

          {/* Sync Button */}
          <button
            onClick={syncTorn}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Torn API'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
