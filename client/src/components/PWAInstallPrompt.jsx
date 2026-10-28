import React, { useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { useTornData } from '../context/TornDataContext';

export default function PWAInstallPrompt() {
  const { installPrompt, triggerInstall, isInstalled } = useTornData();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-b border-emerald-500/20 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl hidden sm:flex">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Install Torn Ledger on your Android or Mobile device
            </p>
            <p className="text-[11px] text-slate-400">
              Fast standalone experience, offline FIFO caching, and instant access from your Home Screen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={triggerInstall}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-md"
            title="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
