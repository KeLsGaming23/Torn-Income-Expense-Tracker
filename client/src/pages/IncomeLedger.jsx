import React, { useState, useEffect } from 'react';
import { getIncome, logIncome, deleteIncome } from '../api';
import { useTornData } from '../context/TornDataContext';
import Modal from '../components/Modal';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  ExternalLink,
  Target, 
  Store, 
  ArrowLeftRight, 
  Coins, 
  ShieldAlert, 
  Landmark, 
  Briefcase,
  DollarSign,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

const INCOME_COLORS = {
  trade_income: '#38bdf8', // sky
  points_sale: '#10b981',  // emerald
  bazaar_sale: '#f59e0b',  // amber
  crimes: '#a855f7',       // purple
  mugging_gain: '#f43f5e', // rose
  bank_interest: '#06b6d4',// cyan
  company_pay: '#6366f1',  // indigo
  faction_payout: '#14b8a6', // teal
  manual: '#94a3b8'        // slate
};

const CATEGORY_LABELS = {
  trade_income: 'Personal Trade',
  points_sale: 'Points Market',
  bazaar_sale: 'Bazaar Sale',
  crimes: 'Crimes 2.0',
  mugging_gain: 'Mugging Cash',
  bank_interest: 'City Bank Interest',
  company_pay: 'Company Paycheck',
  faction_payout: 'Faction Payout'
};

export default function IncomeLedger() {
  const { showToast, refresh, syncStatus } = useTornData();
  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Quick Log Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('trade_income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  const fetchIncomeList = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const res = await getIncome(params);
      if (res.success) setIncomeData(res);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load income data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeList();
  }, [selectedCategory, syncStatus?.syncState?.last_synced_at]);

  const handleQuickLog = (presetCat, defaultAmt, defaultDesc) => {
    setCategory(presetCat);
    setAmount(defaultAmt || '');
    setDescription(defaultDesc || '');
    setLoggedAt(new Date().toISOString().slice(0, 16));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await logIncome({
        category,
        amount: Number(amount),
        description,
        loggedAt
      });
      if (res.success) {
        showToast('success', `Logged ${CATEGORY_LABELS[category] || category} of $${Number(amount).toLocaleString()}`);
        setIsModalOpen(false);
        await fetchIncomeList();
        await refresh(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return;
    try {
      const res = await deleteIncome(id);
      if (res.success) {
        showToast('success', 'Income entry removed');
        await fetchIncomeList();
        await refresh(true);
      }
    } catch (err) {
      showToast('error', 'Failed to delete entry');
    }
  };

  // Stats calculation
  const total30d = incomeData?.totalIncome30d || 0;
  const breakdown = incomeData?.breakdown || [];
  const totalSum = incomeData?.totalIncome || breakdown.reduce((acc, b) => acc + Number(b.amount || 0), 0);
  const totalCount = breakdown.reduce((acc, b) => acc + Number(b.count || 0), 0);
  
  const tradesTotal = breakdown.find(b => b.category === 'trade_income')?.amount || 0;
  const pointsTotal = breakdown.find(b => b.category === 'points_sale')?.amount || 0;
  const crimesTotal = breakdown.find(b => b.category === 'crimes')?.amount || 0;
  const bazaarTotal = breakdown.find(b => b.category === 'bazaar_sale')?.amount || 0;

  const chartData = breakdown.map(b => ({
    name: CATEGORY_LABELS[b.category] || b.category,
    value: Number(b.amount),
    categoryKey: b.category
  }));

  return (
    <div className="space-y-6">
      {/* HEADER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
            <span>Income & Cash Inflows Ledger</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Track multi-source earnings: Personal Trades, Points Sales, Crimes 2.0, Bazaar, & Mugging.
          </p>
        </div>

        <button
          onClick={() => handleQuickLog('trade_income', '', '')}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Log Income</span>
        </button>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">30-Day Realized Income</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
            ${total30d.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total revenue across all streams</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Personal Trades</span>
            <ArrowLeftRight className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-sky-300 font-mono">
            ${tradesTotal.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Player trade cash receipts</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Points Market</span>
            <Coins className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-300 font-mono">
            ${pointsTotal.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Museum points market sales</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Crimes & Bazaar</span>
            <Target className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl md:text-2xl font-black text-purple-300 font-mono">
            ${(crimesTotal + bazaarTotal).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Crimes 2.0 cash & shop sales</p>
        </div>
      </div>

      {/* CHARTS & INTERACTIVE STREAM FILTER */}
      {chartData.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <PieChartIcon className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Income Stream Distribution
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedCategory === 'all' 
                    ? 'Click any stream below or pie slice to filter transactions' 
                    : `Filtered by: ${CATEGORY_LABELS[selectedCategory] || selectedCategory} • Click to reset`}
                </p>
              </div>
            </div>

            {/* Quick All Streams Reset Pill */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto ${
                selectedCategory === 'all'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>All Streams</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {totalCount}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            {/* Donut Chart */}
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    cursor="pointer"
                    onClick={(entry) => {
                      if (entry && entry.categoryKey) {
                        setSelectedCategory(selectedCategory === entry.categoryKey ? 'all' : entry.categoryKey);
                      }
                    }}
                  >
                    {chartData.map((entry, index) => {
                      const isSelected = selectedCategory === entry.categoryKey;
                      const isFaded = selectedCategory !== 'all' && !isSelected;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={INCOME_COLORS[entry.categoryKey] || '#64748b'} 
                          opacity={isFaded ? 0.35 : 1}
                          stroke={isSelected ? '#ffffff' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#334155', 
                    borderRadius: '1rem',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }} 
                  formatter={(val) => `$${Number(val).toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

            {/* Interactive Stream Cards (No Overflow, Active Only) */}
            <div className="space-y-2">
              {breakdown.map((item) => {
                const isSelected = selectedCategory === item.category;
                const color = INCOME_COLORS[item.category] || '#64748b';
                const pct = totalSum > 0 ? ((Number(item.amount) / totalSum) * 100).toFixed(1) : 0;

                return (
                  <button 
                    key={item.category}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? 'all' : item.category)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs transition-all text-left group ${
                      isSelected 
                        ? 'bg-slate-800/95 border-2 shadow-lg' 
                        : 'bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800/80 hover:border-slate-700'
                    }`}
                    style={{
                      borderColor: isSelected ? color : undefined,
                      boxShadow: isSelected ? `0 4px 20px -2px ${color}33` : undefined
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className={`w-3.5 h-3.5 rounded-full transition-transform ${isSelected ? 'scale-125' : 'group-hover:scale-110'}`} 
                        style={{ backgroundColor: color }} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Active Filter
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                        +${Number(item.amount).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {pct}% of income
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONS TABLE */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Realized Inflow Transactions ({incomeData?.incomes?.length || 0})
            </span>
            {selectedCategory !== 'all' && (
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                <span>Filtered: {CATEGORY_LABELS[selectedCategory] || selectedCategory}</span>
                <button 
                  onClick={() => setSelectedCategory('all')} 
                  className="text-slate-400 hover:text-white font-bold ml-1"
                  title="Clear filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Sorted by latest logged date
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Stream</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-mono">
                    Loading income ledger...
                  </td>
                </tr>
              ) : incomeData?.incomes?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No income transactions found for this selection.
                  </td>
                </tr>
              ) : (
                incomeData?.incomes?.map((entry) => {
                  let metadata = null;
                  if (entry.metadata_json) {
                    try {
                      metadata = typeof entry.metadata_json === 'string' ? JSON.parse(entry.metadata_json) : entry.metadata_json;
                    } catch (e) {}
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(entry.logged_at).toLocaleDateString()}{' '}
                        <span className="text-[10px] text-slate-600">
                          {new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span 
                          className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-block"
                          style={{
                            backgroundColor: `${INCOME_COLORS[entry.category] || '#64748b'}15`,
                            color: INCOME_COLORS[entry.category] || '#cbd5e1',
                            borderColor: `${INCOME_COLORS[entry.category] || '#64748b'}40`
                          }}
                        >
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{entry.description}</span>
                          {metadata?.comment?.includes('receipt') && (
                            <a 
                              href={metadata.comment} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 text-[11px] font-mono bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/60"
                            >
                              <span>Receipt</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        +${Number(entry.amount).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-slate-600 hover:text-rose-400 transition-colors p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK LOG MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Inflow / Income">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Stream Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Amount ($ Cash)</label>
            <input
              type="number"
              placeholder="e.g. 5000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Description / Memo</label>
            <input
              type="text"
              placeholder="e.g. Sold plushie batch or completed mug"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Income'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
