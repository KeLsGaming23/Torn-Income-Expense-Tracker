import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  Calculator,
  Boxes, 
  ReceiptText,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { useTornData } from '../context/TornDataContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { commandData } = useTornData();
  const readySets = (commandData?.setsReady?.flower || 0) + (commandData?.setsReady?.plushie || 0);

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { 
      id: 'museum', 
      label: 'Museum Set Builder', 
      icon: Sparkles, 
      badge: readySets > 0 ? `${readySets} Sets Ready` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    { id: 'calculator', label: 'Profit Calculator', icon: Calculator },
    { id: 'leftovers', label: 'FIFO Leftovers Vault', icon: Boxes },
    { id: 'expenses', label: 'Expenses & Vault', icon: ReceiptText },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#080d19] border-r border-slate-800/80 p-4 shrink-0 min-h-[calc(100vh-65px)]">
      
      {/* Ready Sets Highlight */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            Complete Sets
          </span>
          <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {readySets} Sets
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {commandData?.setsReady?.flower || 0} Flowers • {commandData?.setsReady?.plushie || 0} Plushies
        </p>
      </div>

      {/* 4 Main Views Navigation */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs md:text-sm transition-all text-left ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1">
        <div className="flex justify-between items-center">
          <span>Engine:</span>
          <span className="text-slate-400 font-mono">Torn FIFO v2.0</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Torn API:</span>
          <span className="text-emerald-400 font-mono">Connected</span>
        </div>
      </div>
    </aside>
  );
}
