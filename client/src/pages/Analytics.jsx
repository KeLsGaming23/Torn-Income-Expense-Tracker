import React, { useState, useEffect } from 'react';
import { getTrends, getBreakdown, getMuseumComparison } from '../api';
import { useTornData } from '../context/TornDataContext';
import { 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  DollarSign, 
  Sparkles,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];

export default function Analytics() {
  const { showToast } = useTornData();
  const [trends, setTrends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [museumStats, setMuseumStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [trendRes, breakRes, museumRes] = await Promise.all([
          getTrends(),
          getBreakdown(),
          getMuseumComparison()
        ]);

        if (trendRes.success) setTrends(trendRes.trends);
        if (breakRes.success) {
          setExpenses(breakRes.expenses);
          setIncomes(breakRes.incomes);
        }
        if (museumRes.success) setMuseumStats(museumRes.stats);
      } catch (err) {
        console.error(err);
        showToast('error', 'Failed to load visual analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTooltipMoney = (value) => `$${Number(value || 0).toLocaleString()}`;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <LineChartIcon className="h-6 w-6 text-emerald-400" />
          Financial & Museum Analytics
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Visual performance insights into cash flow trends, expense distributions, and museum set ROI.
        </p>
      </div>

      {/* Chart 1: 30-Day Cash Flow & Profit Trend */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Cash Flow & Profit Trend (Last 30 Days)
            </h3>
            <p className="text-xs text-slate-400">Daily breakdown of Incomes, Operational Expenses, and Net Profits</p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {trends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No trend data available for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="#10b981" stop-opacity={0.4} />
                    <stop offset="95%" stop-color="#10b981" stop-opacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stop-color="#ef4444" stop-opacity={0.3} />
                    <stop offset="95%" stop-color="#ef4444" stop-opacity={0} />
                  </linearGradient>
                </defs>
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
                  formatter={formatTooltipMoney}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#1f293d', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="income" name="Income ($)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" name="Expense ($)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Expense Breakdown & Income Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Expenses Distribution */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-rose-400" />
              Expense Distribution by Category
            </h3>
          </div>

          <div className="h-64 w-full">
            {expenses.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No expense data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={formatTooltipMoney}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1f293d', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Income Sources */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-emerald-400" />
              Income Distribution by Category
            </h3>
          </div>

          <div className="h-64 w-full">
            {incomes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No income data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomes}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {incomes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={formatTooltipMoney}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1f293d', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Museum Sets Conversion ROI Comparison */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Museum Sets Performance (Flower vs Plushie)
            </h3>
            <p className="text-xs text-slate-400">Total conversion volume, average point cost basis, and estimated profit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {museumStats.map((stat) => (
            <div key={stat.set_type} className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>{stat.set_type === 'Flower' ? '🌸' : '🧸'}</span>
                  <span>{stat.set_type} Sets</span>
                </span>
                <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {stat.total_sets || 0} Sets Converted
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Total Points Awarded:</span>
                  <span className="font-mono font-bold text-amber-300">+{stat.total_points || 0} pts</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Total FIFO COGS:</span>
                  <span className="font-mono font-bold text-slate-200">${Number(stat.total_cogs || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Avg Cost / Point:</span>
                  <span className="font-mono font-bold text-slate-200">${Number(stat.avg_cost_per_point || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Est. Conversion Profit:</span>
                  <span className="font-mono font-bold text-emerald-400">+${Number(stat.total_estimated_profit || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}

          {museumStats.length === 0 && (
            <div className="col-span-2 py-8 text-center text-slate-500 text-xs">
              No museum conversions logged yet. Convert sets in the Museum Sets tab to view historical ROI.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
