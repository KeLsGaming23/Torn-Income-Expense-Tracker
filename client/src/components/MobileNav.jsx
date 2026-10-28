import React from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  Calculator,
  Boxes, 
  ReceiptText 
} from 'lucide-react';

export default function MobileNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Command', icon: LayoutDashboard },
    { id: 'museum', label: 'Museum', icon: Sparkles },
    { id: 'calculator', label: 'Calc', icon: Calculator },
    { id: 'leftovers', label: 'Leftovers', icon: Boxes },
    { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d19]/95 backdrop-blur-lg border-t border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 font-normal hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/10' : ''}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-400 scale-110' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
