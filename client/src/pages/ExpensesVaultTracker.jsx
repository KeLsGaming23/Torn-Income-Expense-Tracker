import React, { useState, useEffect } from 'react';
import { getExpenses, logExpense, deleteExpense } from '../api';
import { useTornData } from '../context/TornDataContext';
import Modal from '../components/Modal';
import { 
  ReceiptText, 
  Plus, 
  Trash2, 
  Building2, 
  Flame, 
  ShieldAlert, 
  Plane, 
  Home, 
  PieChart as PieChartIcon, 
  ArrowDownRight,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

const EXPENSE_COLORS = {
  rent: '#3b82f6', // blue
  upkeep: '#8b5cf6', // purple
  happy_jump: '#f59e0b', // amber
  mug_loss: '#f43f5e', // rose
  travel: '#06b6d4', // cyan
  vault_deposit: '#10b981', // emerald
  other: '#64748b' // slate
};

export default function ExpensesVaultTracker() {
  const { showToast, refresh } = useTornData();
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick Log Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('upkeep');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenseList = async () => {
    try {
      setLoading(true);
      const res = await getExpenses({ limit: 100 });
      if (res.success) setExpenseData(res);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenseList();
  }, []);

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
      const res = await logExpense({
        category,
        amount: Number(amount),
        description,
        loggedAt
      });
      if (res.success) {
        showToast('success', `Logged ${category} expense of $${Number(amount).toLocaleString()}`);
        setIsModalOpen(false);
        await fetchExpenseList();
        await refresh(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      showToast('success', 'Expense deleted');
      await fetchExpenseList();
      await refresh(true);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const expenses = expenseData?.expenses || [];
  const breakdown = expenseData?.breakdown || [];
  const totalExpenses = expenseData?.totalExpenses || 0;

  const pieData = breakdown.map(b => ({
    name: b.category.replace('_', ' ').toUpperCase(),
    value: b.amount,
    color: EXPENSE_COLORS[b.category] || '#64748b'
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-rose-400" />
            Personal Expenses & Vault Tracker
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Monitor money leaks: rent, upkeep, happy jumps (Xanax/eDVD), muggings, and vault deposits.
          </p>
        </div>

        <button
          onClick={() => handleQuickLog('upkeep', '', '')}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-rose-950/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Log New Expense</span>
        </button>
      </div>

      {/* QUICK LOG BUTTONS STRIP */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
          1-Click Quick Expense Presets
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => handleQuickLog('upkeep', '150000', 'Daily Private Island Staff & Upkeep')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <Building2 className="h-5 w-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Daily Upkeep</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">$150,000</span>
          </button>

          <button
            onClick={() => handleQuickLog('happy_jump', '840000', '1x Xanax for Training')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <Flame className="h-5 w-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Happy Jump</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Xanax / eDVD</span>
          </button>

          <button
            onClick={() => handleQuickLog('rent', '500000', 'Weekly Property Lease Payment')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <Home className="h-5 w-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Property Rent</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Lease Fee</span>
          </button>

          <button
            onClick={() => handleQuickLog('mug_loss', '', 'Mugged outside Bazaar')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group"
          >
            <ShieldAlert className="h-5 w-5 text-rose-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Mugged Loss</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Loss Log</span>
          </button>

          <button
            onClick={() => handleQuickLog('vault_deposit', '', 'Deposit Cash to Vault')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all text-center group col-span-2 sm:col-span-1"
          >
            <DollarSign className="h-5 w-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Vault Deposit</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Protect Cash</span>
          </button>
        </div>
      </div>

      {/* PIE/DONUT CHART & CATEGORIES BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Pie/Donut Chart */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-rose-400" />
              Where Money is Leaking (Monthly Breakdown)
            </h3>
          </div>

          <div className="h-64 w-full">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No expense data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => '$' + Number(val).toLocaleString()}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Categories Summary List */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Total Outflows</h3>
            <span className="text-lg font-black font-mono text-rose-400">
              ${totalExpenses.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            {breakdown.map((b) => (
              <div key={b.category} className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[b.category] || '#64748b' }} />
                  <span className="font-bold text-white capitalize">{b.category.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-200">${Number(b.amount).toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {totalExpenses > 0 ? ((Number(b.amount) / totalExpenses) * 100).toFixed(1) : 0}% of expenses
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* EXPENSES HISTORY TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Expenses Ledger History</h3>
          <span className="text-xs text-slate-400">{expenses.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(exp.logged_at).toLocaleDateString()} {new Date(exp.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <span 
                      className="px-2.5 py-0.5 rounded-full font-bold text-[10px] capitalize"
                      style={{ 
                        backgroundColor: `${EXPENSE_COLORS[exp.category] || '#64748b'}20`, 
                        color: EXPENSE_COLORS[exp.category] || '#64748b' 
                      }}
                    >
                      {exp.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 max-w-sm truncate" title={exp.description}>
                    {exp.description}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                    -${Number(exp.amount).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    No expenses logged yet. Use the 1-click presets above to record expenses.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK LOG MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Personal Expense"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Category:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500 capitalize"
            >
              <option value="upkeep">Daily Upkeep</option>
              <option value="happy_jump">Happy Jump (Xanax / eDVD)</option>
              <option value="rent">Property Rent</option>
              <option value="mug_loss">Mugged Loss</option>
              <option value="travel">Travel Flight Fees</option>
              <option value="vault_deposit">Vault Deposit</option>
              <option value="other">Other Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Amount ($):
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="e.g., 150000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Daily staff and upkeep fees"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Date & Time:
            </label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
            >
              <span>{submitting ? 'Saving...' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
