import React, { useState } from 'react';
import { useTornData } from './context/TornDataContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// 5 Main Views
import CommandCenter from './pages/CommandCenter';
import MuseumSetBuilder from './pages/MuseumSetBuilder';
import ProfitCalculator from './pages/ProfitCalculator';
import LeftoversVault from './pages/LeftoversVault';
import ExpensesVaultTracker from './pages/ExpensesVaultTracker';

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toast } = useTornData();

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slideDown max-w-sm">
          <div className={`rounded-2xl p-4 shadow-2xl border flex items-start gap-3 backdrop-blur-xl ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200' 
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            )}
            <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar />

      {/* PWA Install Banner (Android Chrome) */}
      <PWAInstallPrompt />

      {/* Main Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 lg:pb-8">
        {/* Desktop Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Views Container */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <CommandCenter setActiveTab={setActiveTab} />}
          {activeTab === 'museum' && <MuseumSetBuilder setActiveTab={setActiveTab} />}
          {activeTab === 'calculator' && <ProfitCalculator />}
          {activeTab === 'leftovers' && <LeftoversVault />}
          {activeTab === 'expenses' && <ExpensesVaultTracker />}
        </main>
      </div>

      {/* Mobile-First Bottom Navigation (Android Chrome) */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
