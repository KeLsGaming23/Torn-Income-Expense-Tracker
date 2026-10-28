import React, { useState, useEffect } from 'react';
import { getInventoryLots, addManualInventoryLot, deleteInventoryLot, getMasterItems } from '../api';
import { useTornData } from '../context/TornDataContext';
import Modal from '../components/Modal';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  Layers,
  Sparkles
} from 'lucide-react';

export default function LeftoversVault() {
  const { showToast, refresh } = useTornData();
  const [lots, setLots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [leftoverOnly, setLeftoverOnly] = useState(true);
  const [search, setSearch] = useState('');

  // Manual Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [masterItems, setMasterItems] = useState({ plushies: [], flowers: [] });
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qty, setQty] = useState(10);
  const [unitCost, setUnitCost] = useState('');
  const [source, setSource] = useState('abroad');
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const res = await getInventoryLots({
        itemType: itemTypeFilter || undefined,
        leftoverOnly: leftoverOnly ? 'true' : 'false',
        search: search || undefined
      });
      if (res.success) {
        setLots(res.lots);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load inventory lots');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const res = await getMasterItems();
      if (res.success) {
        setMasterItems(res);
        if (res.plushies?.length > 0) {
          setSelectedItemId(res.plushies[0].id);
          setUnitCost(res.plushies[0].buyPrice);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLots();
  }, [itemTypeFilter, leftoverOnly, search]);

  useEffect(() => {
    fetchMasters();
  }, []);

  const handleItemChange = (e) => {
    const id = parseInt(e.target.value, 10);
    setSelectedItemId(id);
    const all = [...masterItems.plushies, ...masterItems.flowers];
    const match = all.find(it => it.id === id);
    if (match) setUnitCost(match.buyPrice);
  };

  const handleAddLot = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await addManualInventoryLot({
        itemId: selectedItemId,
        source,
        qty: parseInt(qty, 10),
        unitCost: Number(unitCost),
        purchasedAt
      });
      if (res.success) {
        showToast('success', `Added lot of ${qty} items ($${(qty * Number(unitCost)).toLocaleString()})`);
        setIsModalOpen(false);
        await fetchLots();
        await refresh(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lot?')) return;
    try {
      await deleteInventoryLot(id);
      showToast('success', 'Inventory lot removed');
      await fetchLots();
      await refresh(true);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6 text-purple-400" />
            FIFO Leftovers & Purchase History Vault
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Every batch preserves its original acquisition cost. Leftovers remain in stock for subsequent sets.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-purple-950/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Manual Purchase / Trade Entry</span>
        </button>
      </div>

      {/* Summary Valuation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-4 border border-purple-500/20 bg-purple-500/5">
          <span className="text-[10px] uppercase font-bold text-purple-400 block">Total Leftover Units On Hand</span>
          <span className="text-2xl font-black font-mono text-white">
            {summary?.totalLeftoverUnits?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Flowers & plushies ready for sets</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-purple-500/20 bg-purple-500/5">
          <span className="text-[10px] uppercase font-bold text-purple-400 block">Total Leftover Cost Basis</span>
          <span className="text-2xl font-black font-mono text-purple-300">
            ${(summary?.totalLeftoverCostBasis || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Exact capital tied up in active leftovers</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel rounded-2xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Item Types</option>
            <option value="plushie">🧸 Plushies Only</option>
            <option value="flower">🌸 Flowers Only</option>
          </select>

          {/* Leftover Toggle */}
          <label className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={leftoverOnly}
              onChange={(e) => setLeftoverOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
            />
            <span className="text-slate-300 font-semibold text-[11px]">Show Active Leftovers Only</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search item name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Lots Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Purchased Date</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-center">Initial Qty</th>
                <th className="py-3 px-4 text-center">Leftover Remaining</th>
                <th className="py-3 px-4 text-right">Unit Price Paid</th>
                <th className="py-3 px-4 text-right">Leftover Value</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(lot.purchased_at).toLocaleDateString()} {new Date(lot.purchased_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                    <span>{lot.item_type === 'flower' ? '🌸' : '🧸'}</span>
                    <span>{lot.item_name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                      {lot.source}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">{lot.qty_initial}</td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className={lot.qty_remaining > 0 ? 'text-emerald-400' : 'text-slate-600'}>
                      {lot.qty_remaining}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-200">
                    ${Number(lot.unit_cost).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-purple-300">
                    ${(Number(lot.qty_remaining) * Number(lot.unit_cost)).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(lot.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      title="Delete lot"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {lots.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No inventory lots found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL LOT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Manual Purchase or Trade Entry"
      >
        <form onSubmit={handleAddLot} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Item:
            </label>
            <select
              value={selectedItemId}
              onChange={handleItemChange}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
            >
              <optgroup label="🧸 Plushies">
                {masterItems.plushies?.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
                ))}
              </optgroup>
              <optgroup label="🌸 Flowers">
                {masterItems.flowers?.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.country})</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantity:
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unit Cost ($):
              </label>
              <input
                type="number"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Source:
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="abroad">Abroad Flight</option>
                <option value="bazaar">Player Bazaar</option>
                <option value="market">Item Market</option>
                <option value="trade">Private Trade</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date & Time:
              </label>
              <input
                type="datetime-local"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Total Batch Cost:</span>
              <span className="font-mono font-bold text-white">${(qty * Number(unitCost || 0)).toLocaleString()}</span>
            </div>
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
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
            >
              <span>{submitting ? 'Saving...' : 'Save Inventory Lot'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
