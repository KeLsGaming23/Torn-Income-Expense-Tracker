import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'emerald', trend = null, onClick = null }) {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-950/20'
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      glow: 'shadow-blue-950/20'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      glow: 'shadow-amber-950/20'
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      glow: 'shadow-rose-950/20'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      glow: 'shadow-purple-950/20'
    }
  }[color] || {
    bg: 'bg-slate-800/50',
    border: 'border-slate-800',
    text: 'text-slate-300',
    glow: ''
  };

  return (
    <div 
      onClick={onClick}
      className={`glass-panel rounded-2xl p-4 md:p-5 border ${colorStyles.border} transition-all shadow-lg ${colorStyles.glow} ${
        onClick ? 'cursor-pointer hover:border-opacity-60 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl ${colorStyles.bg} ${colorStyles.text}`}>
            <Icon className="h-4 w-4 md:h-5 md:w-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <h4 className="text-xl md:text-2xl font-black tracking-tight text-white">{value}</h4>
        {trend && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
            trend.isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
          }`}>
            {trend.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-400 leading-snug">{subtitle}</p>
      )}
    </div>
  );
}
