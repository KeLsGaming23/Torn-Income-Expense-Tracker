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
  faction_payout: 'Faction Payout',
  manual: 'Manual Entry'
};

export default function IncomeLedger() {
  const { showToast, refresh } = useTornData();
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
  }, [selectedCategory]);

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

      {/* QUICK PRESETS STRIP */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
          Quick Log Inflow Presets
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleQuickLog('trade_income', '', 'Player Item Trade')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <ArrowLeftRight className="h-5 w-5 text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Player Trade</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Cash Inflow</span>
          </button>

          <button
            onClick={() => handleQuickLog('crimes', '', 'Crimes 2.0 Payout')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <Target className="h-5 w-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Crime Gain</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Cash Reward</span>
          </button>

          <button
            onClick={() => handleQuickLog('bazaar_sale', '', 'Bazaar Customer Buy')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <Store className="h-5 w-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Bazaar Sale</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Item Purchase</span>
          </button>

          <button
            onClick={() => handleQuickLog('points_sale', '', 'Points Market Cashout')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <Coins className="h-5 w-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Points Sale</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Market Sell</span>
          </button>
        </div>
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

      {/* CHARTS & REVENUE BREAKDOWN */}
      {chartData.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800">
          <div className="flex items-center gap-2.5 mb-4">
            <PieChartIcon className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Income Stream Distribution
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
            <div className="h-56 w-full">
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
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={INCOME_COLORS[entry.categoryKey] || '#64748b'} 
                      />
                    ))}
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

            {/* Category Pills List */}
            <div className="space-y-2">
              {breakdown.map((item) => (
                <div 
                  key={item.category} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: INCOME_COLORS[item.category] || '#64748b' }} 
                    />
                    <span className="font-medium text-slate-200">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({item.count} {item.count === 1 ? 'entry' : 'entries'})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    +${Number(item.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FILTER BUTTONS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            selectedCategory === 'all' 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40' 
              : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Streams
        </button>

        {Object.keys(CATEGORY_LABELS).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedCategory === cat 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40' 
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Realized Inflow Transactions ({incomeData?.incomes?.length || 0})
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
