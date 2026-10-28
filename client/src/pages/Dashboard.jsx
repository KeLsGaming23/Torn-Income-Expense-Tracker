import React, { useState } from 'react';
import { useTornData } from '../context/TornDataContext';
import StatCard from '../components/StatCard';
import { 
  DollarSign, 
  Sparkles, 
  Coins, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Plane, 
  ShieldAlert, 
  ChevronRight, 
  PlusCircle,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function Dashboard({ setActiveTab }) {
  const { dashboardData, loading } = useTornData();

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading ledger data & FIFO calculations...</p>
        </div>
      </div>
    );
  }

  const { finances, points, sets, inventory, profile } = dashboardData || {};

  const totalReadySets = (sets?.flowerReady || 0) + (sets?.plushieReady || 0);
  const potentialPointValue = totalReadySets * 10 * 45000;

  return (
    <div className="space-y-6">
      
      {/* Welcome & Torn Player Status Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-[#0d1527]/80 to-slate-900/90 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Torn Financial Hub</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">
                {profile?.last_synced_at ? `Synced: ${new Date(profile.last_synced_at).toLocaleTimeString()}` : 'Live'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {profile?.name || 'Player'}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
              You have <span className="text-emerald-400 font-bold">{totalReadySets} museum sets</span> ready to convert into <span className="text-amber-300 font-bold">{totalReadySets * 10} points</span> (~${potentialPointValue.toLocaleString()} gross value).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('sets')}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Convert Sets</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition-all active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Operating Profit"
          value={`$${(finances?.netProfit || 0).toLocaleString()}`}
          subtitle={`Margin: ${(finances?.profitMarginPct || 0).toFixed(1)}% (Revenue: $${(finances?.totalIncome || 0).toLocaleString()})`}
          icon={DollarSign}
          color="emerald"
          onClick={() => setActiveTab('transactions')}
        />

        <StatCard
          title="Museum Sets Ready"
          value={`${totalReadySets} Sets`}
          subtitle={`${sets?.flowerReady || 0} Flowers • ${sets?.plushieReady || 0} Plushies`}
          icon={Sparkles}
          color="blue"
          onClick={() => setActiveTab('sets')}
        />

        <StatCard
          title="FIFO Point Ledger"
          value={`${(points?.availablePoints || 0).toLocaleString()} Pts`}
          subtitle={`Avg Cost: $${Math.round(points?.avgPointCostBasis || 0).toLocaleString()} / pt`}
          icon={Coins}
          color="amber"
          onClick={() => setActiveTab('sets')}
        />

        <StatCard
          title="Inventory Valuation"
          value={`$${(inventory?.totalItemMarketValue || 0).toLocaleString()}`}
          subtitle={`${inventory?.totalItemsCount || 0} items (Cost: $${(inventory?.totalItemCostBasis || 0).toLocaleString()})`}
          icon={Package}
          color="purple"
          onClick={() => setActiveTab('inventory')}
        />
      </div>

      {/* Museum Sets Live Readiness Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Flower Set Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-lg">
                🌸
              </div>
              <div>
                <h3 className="font-bold text-white text-base">11 Exotic Flowers Set</h3>
                <p className="text-xs text-slate-400">10 Museum Points per full turn-in</p>
              </div>
            </div>
            <span className="text-xs font-extrabold bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
              {sets?.flowerReady || 0} Sets Ready
            </span>
          </div>

          <div className="space-y-3 bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">FIFO Acquisition Cost / Set:</span>
              <span className="font-mono font-bold text-slate-200">
                ${(sets?.flowerNextSetCost || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Point Value (10 pts @ $45k):</span>
              <span className="font-mono font-bold text-emerald-400">$450,000</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-slate-300 font-semibold">Estimated Net Profit / Set:</span>
              <span className="font-mono font-extrabold text-emerald-300">
                +${(sets?.flowerEstProfit || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {sets?.flowerBottlenecks?.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Bottleneck item to restock: <strong>{sets.flowerBottlenecks.join(', ')}</strong></span>
            </div>
          )}

          <button
            onClick={() => setActiveTab('sets')}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2.5 rounded-xl border border-slate-700 transition-colors"
          >
            <span>Open Flower Set Builder</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Plushie Set Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                🧸
              </div>
              <div>
                <h3 className="font-bold text-white text-base">13 Plushies Set</h3>
                <p className="text-xs text-slate-400">10 Museum Points per full turn-in</p>
              </div>
            </div>
            <span className="text-xs font-extrabold bg-blue-500/15 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
              {sets?.plushieReady || 0} Sets Ready
            </span>
          </div>

          <div className="space-y-3 bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">FIFO Acquisition Cost / Set:</span>
              <span className="font-mono font-bold text-slate-200">
                ${(sets?.plushieNextSetCost || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Point Value (10 pts @ $45k):</span>
              <span className="font-mono font-bold text-emerald-400">$450,000</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-slate-300 font-semibold">Estimated Net Profit / Set:</span>
              <span className="font-mono font-extrabold text-blue-300">
                +${(sets?.plushieEstProfit || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {sets?.plushieBottlenecks?.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Bottleneck item to restock: <strong>{sets.plushieBottlenecks.join(', ')}</strong></span>
            </div>
          )}

          <button
            onClick={() => setActiveTab('sets')}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2.5 rounded-xl border border-slate-700 transition-colors"
          >
            <span>Open Plushie Set Builder</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => setActiveTab('inventory')}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">FIFO Inventory Batches</h4>
              <p className="text-xs text-slate-400">{inventory?.totalItemsCount || 0} total units in stock</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </div>

        <div 
          onClick={() => setActiveTab('transactions')}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Income & Expense Ledger</h4>
              <p className="text-xs text-slate-400">Track flight, rehab & bazaar fees</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </div>

        <div 
          onClick={() => setActiveTab('travel')}
          className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-200 text-sm">Travel Run Calculator</h4>
              <p className="text-xs text-slate-400">Calculate profit/hour per country</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </div>
      </div>

    </div>
  );
}
