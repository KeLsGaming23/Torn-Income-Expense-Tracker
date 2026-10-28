import React, { useState, useEffect } from 'react';
import { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction, 
  getTransactionCategories 
} from '../api';
import { useTornData } from '../context/TornDataContext';
import Modal from '../components/Modal';
import { 
  ReceiptText, 
  Plus, 
  Filter, 
  Search, 
  Trash2, 
  Edit2, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Calendar 
} from 'lucide-react';

export default function Transactions() {
  const { showToast, refreshData } = useTornData();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState({ INCOME: [], EXPENSE: [] });

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    category: 'Travel Expense',
    amount: '',
    description: '',
    paymentMethod: 'Cash on Hand',
    transactionDate: new Date().toISOString().slice(0, 16),
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTxList = async () => {
    try {
      setLoading(true);
      const res = await getTransactions({
        type: typeFilter || undefined,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
        limit: 100
      });
      if (res.success) {
        setTransactions(res.transactions);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCats = async () => {
    try {
      const res = await getTransactionCategories();
      if (res.success) setCategories(res.categories);
    } catch (e) {}
  };

  useEffect(() => {
    fetchTxList();
  }, [typeFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchCats();
  }, []);

  const openCreateModal = () => {
    setEditingTx(null);
    setFormData({
      type: 'EXPENSE',
      category: 'Travel Expense',
      amount: '',
      description: '',
      paymentMethod: 'Cash on Hand',
      transactionDate: new Date().toISOString().slice(0, 16),
      notes: ''
    });
    setIsAddOpen(true);
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setFormData({
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      description: tx.description,
      paymentMethod: tx.payment_method || 'Cash on Hand',
      transactionDate: new Date(tx.transaction_date).toISOString().slice(0, 16),
      notes: tx.notes || ''
    });
    setIsAddOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingTx) {
        await updateTransaction(editingTx.id, formData);
        showToast('success', 'Transaction updated successfully');
      } else {
        await createTransaction(formData);
        showToast('success', 'Transaction logged successfully');
      }
      setIsAddOpen(false);
      await fetchTxList();
      await refreshData(true);
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteTransaction(id);
      showToast('success', 'Transaction deleted');
      await fetchTxList();
      await refreshData(true);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const exportCSV = () => {
    if (!transactions.length) return;
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Description', 'Payment Method', 'Notes'];
    const rows = transactions.map(t => [
      t.id,
      new Date(t.transaction_date).toISOString(),
      t.type,
      t.category,
      t.amount,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.payment_method,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `torn_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-emerald-400" />
            Income & Operational Expense Ledger
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Track flight fees, Switzerland rehab, Xanax drug runs, bazaar sales, and point payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-700 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Total Income (Gross)</span>
          <span className="text-2xl font-black font-mono text-emerald-300">
            ${(summary?.totalIncome || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Point sales, bazaar, investments</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
          <span className="text-[10px] uppercase font-bold text-rose-400 block">Total Operational Expenses</span>
          <span className="text-2xl font-black font-mono text-rose-300">
            ${(summary?.totalExpense || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Flights, rehab, drugs, staff fees</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-blue-500/20 bg-blue-500/5">
          <span className="text-[10px] uppercase font-bold text-blue-400 block">Net Cash Flow</span>
          <span className={`text-2xl font-black font-mono ${
            (summary?.netCashflow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {(summary?.netCashflow || 0) >= 0 ? '+' : ''}
            ${(summary?.netCashflow || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Surplus realized</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCategoryFilter('');
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Types (Income & Expense)</option>
            <option value="INCOME">Income Only</option>
            <option value="EXPENSE">Expenses Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {typeFilter === 'INCOME' && categories.INCOME?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {typeFilter === 'EXPENSE' && categories.EXPENSE?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {!typeFilter && [
              ...categories.INCOME || [],
              ...categories.EXPENSE || []
            ].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search description or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Payment Source</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      tx.type === 'INCOME' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {tx.type === 'INCOME' ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {tx.category}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={tx.description}>
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-slate-400">{tx.payment_method}</td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${
                    tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'INCOME' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center space-x-1">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No transactions found. Click "Log Transaction" to record an income or expense.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingTx ? 'Edit Transaction' : 'Log Financial Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transaction Type:
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-700 p-0.5 bg-slate-900">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INCOME', category: categories.INCOME?.[0] || 'Point Sale' })}
                  className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    formData.type === 'INCOME' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: categories.EXPENSE?.[0] || 'Travel Expense' })}
                  className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    formData.type === 'EXPENSE' ? 'bg-rose-500 text-white' : 'text-slate-400'
                  }`}
                >
                  Expense
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category:
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                {(formData.type === 'INCOME' ? categories.INCOME : categories.EXPENSE)?.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Amount ($):
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g., 35000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Source:
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="Cash on Hand">Cash on Hand</option>
                <option value="City Bank">City Bank</option>
                <option value="Vault">Vault</option>
                <option value="Cayman Bank">Cayman Bank</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description:
            </label>
            <input
              type="text"
              placeholder="e.g., Round trip private jet to Switzerland"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date & Time:
              </label>
              <input
                type="datetime-local"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes (Optional):
              </label>
              <input
                type="text"
                placeholder="Additional details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all ${
                formData.type === 'INCOME'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : editingTx ? 'Save Changes' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
