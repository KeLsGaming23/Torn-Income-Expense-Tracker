import React from 'react';
import { useTornData } from '../context/TornDataContext';
import StatCard from '../components/StatCard';
import { 
  ShieldAlert, 
  ShieldCheck, 
  DollarSign, 
  Coins, 
  Boxes, 
  ReceiptText, 
  TrendingUp, 
  Sparkles, 
  ArrowRight,
  Info,
  Clock,
  HelpCircle,
  Plane
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

export default function CommandCenter({ setActiveTab }) {
  const { commandData, loading } = useTornData();

  if (loading && !commandData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Command Center metrics...</p>
        </div>
      </div>
    );
  }

  const { mugRisk, kpis, setsReady, chartData } = commandData || {};

  const formatMoney = (val) => '$' + Number(val || 0).toLocaleString();

  return (
    <div className="space-y-6">

      {/* LIVE FLIGHT & TRAVEL STATUS BANNER */}
      {commandData?.travelInfo?.travel && (
        <div className="rounded-3xl p-5 border bg-sky-950/40 border-sky-500/30 shadow-lg shadow-sky-950/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl shrink-0 bg-sky-500/20 text-sky-400">
                <Plane className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    Live Flight Status: Flying to {commandData.travelInfo.travel.destination}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                    {commandData.travelInfo.status?.state || 'Traveling'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {commandData.travelInfo.status?.description || `En route to ${commandData.travelInfo.travel.destination}`}.
                  {commandData.travelInfo.travel.destination === 'Argentina' && ' Ceibo Flower stock is currently 0 in your ledger until you land and buy them abroad.'}
                  {' '}After purchasing, tap <strong className="text-emerald-400">Sync Torn API</strong> to automatically import your new inventory lots!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-sky-900/40 border border-sky-700/50 rounded-2xl px-4 py-2 shrink-0">
              <Clock className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-mono font-bold text-sky-200">
                {Math.ceil((commandData.travelInfo.travel.time_left || 0) / 60)} mins remaining
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. MUG RISK ALERT & SAFE ASSETS BANNER */}
      {mugRisk && (
        <div className={`rounded-3xl p-5 border transition-all ${
          mugRisk.isMugRiskHigh
            ? 'bg-rose-950/40 border-rose-500/30 shadow-lg shadow-rose-950/20'
            : 'bg-emerald-950/30 border-emerald-500/20'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 ${
                mugRisk.isMugRiskHigh ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {mugRisk.isMugRiskHigh ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">
                    {mugRisk.isMugRiskHigh ? 'High Mugging Risk Detected!' : 'Cash Secure in Faction Vault & Bank'}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    mugRisk.isMugRiskHigh ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {mugRisk.isMugRiskHigh ? 'Danger' : 'Safe'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                  {mugRisk.isMugRiskHigh ? (
                    <>
                      You have <span className="font-bold text-rose-300 font-mono">{formatMoney(mugRisk.moneyOnHand)}</span> cash on hand at immediate risk of muggers! Safe threshold is <span className="font-mono text-slate-200">{formatMoney(mugRisk.safeThreshold)}</span>.
                    </>
                  ) : (
                    <>
                      Cash on hand is within the safe limit. Your cash is safely stored in Faction Vault & City Bank.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('income')}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95"
              >
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Income Ledger</span>
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                  mugRisk.isMugRiskHigh 
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-950/40' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <span>{mugRisk.isMugRiskHigh ? 'Deposit to Vault' : 'View Reserves'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Asset Breakdown Strip (Hand vs Faction Vault vs City Bank) */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Cash on Hand (At Risk)</span>
                <span className={mugRisk.isMugRiskHigh ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {mugRisk.isMugRiskHigh ? 'Mug Danger' : 'Safe'}
                </span>
              </div>
              <div className={`text-base font-bold font-mono ${mugRisk.isMugRiskHigh ? 'text-rose-300' : 'text-white'}`}>
                {formatMoney(mugRisk.moneyOnHand)}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>Faction Vault (Liquid Safe)</span>
                <span className="text-emerald-400 font-bold">Safe</span>
              </div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {formatMoney(mugRisk.factionVault || mugRisk.vaultAmount || 0)}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>City Bank (Term Deposit)</span>
                <span className="text-sky-400 font-bold">Locked</span>
              </div>
              <div className="text-base font-bold font-mono text-sky-300">
                {formatMoney(mugRisk.cityBank || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="30-Day Realized Income"
          value={formatMoney(kpis?.monthlyTotalIncome || kpis?.monthlyNetProfit || 0)}
          subtitle="Trades, Points, Crimes & Bazaar"
          icon={TrendingUp}
          color="emerald"
          onClick={() => setActiveTab('income')}
        />

        <StatCard
          title="Net Cash Flow (30d)"
          value={formatMoney(kpis?.netCashflow || 0)}
          subtitle={`Income - Expenses (${formatMoney(kpis?.monthlyExpenses || 0)})`}
          icon={DollarSign}
          color={(kpis?.netCashflow || 0) >= 0 ? "emerald" : "rose"}
          onClick={() => setActiveTab('income')}
        />

        <StatCard
          title="Total Points Value"
          value={formatMoney(kpis?.totalPointsValue || 0)}
          subtitle={`${kpis?.pointsBalance?.toLocaleString() || 0} Points on hand`}
          icon={Coins}
          color="amber"
          onClick={() => setActiveTab('museum')}
        />

        <StatCard
          title="Total Monthly Expenses"
          value={formatMoney(kpis?.monthlyExpenses || 0)}
          subtitle="Rent, Upkeep & Travel Fees"
          icon={ReceiptText}
          color="rose"
          onClick={() => setActiveTab('expenses')}
        />
      </div>

      {/* 3. VISUAL CHART (COMPOSED CHART: BARS + LINE) */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Daily Realized Income vs Operational Expenses
            </h3>
            <p className="text-xs text-slate-400">
              Green line tracks realized cash inflows (Trades, Points, Crimes, Bazaar); red bars show operational expenses (Rent, Upkeep, Travel).
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth()+1}/${d.getDate()}`;
                }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} 
              />
              <Tooltip 
                formatter={(val) => formatMoney(val)}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="operational_expense" name="Operational Expenses ($)" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="daily_income" name="Realized Income ($)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. READY SETS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Plushie Set Callout */}
        <div 
          onClick={() => setActiveTab('museum')}
          className="glass-panel rounded-3xl p-5 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">
              🧸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base">13 Plushies Museum Set</h4>
                <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                  10 Pts / Set
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-emerald-400 font-extrabold">{setsReady?.plushie || 0} complete sets ready</span> to convert now
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </div>

        {/* Flower Set Callout */}
        <div 
          onClick={() => setActiveTab('museum')}
          className="glass-panel rounded-3xl p-5 border border-slate-800 hover:border-pink-500/40 cursor-pointer transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-2xl">
              🌸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base">11 Exotic Flowers Set</h4>
                <span className="text-[10px] font-bold uppercase bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full">
                  10 Pts / Set
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="text-emerald-400 font-extrabold">{setsReady?.flower || 0} complete sets ready</span> to convert now
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </div>

      </div>

    </div>
  );
}
