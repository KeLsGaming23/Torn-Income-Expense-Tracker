import React, { useState, useEffect } from 'react';
import { 
  getInventory, 
  addInventoryBatch, 
  deleteInventoryBatch, 
  getInventoryDeductions, 
  getItemsCatalog 
} from '../api';
import { useTornData } from '../context/TornDataContext';
import Modal from '../components/Modal';
import { 
  Package, 
  Plus, 
  Trash2, 
  History, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';

export default function Inventory() {
  const { showToast, refreshData } = useTornData();
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL', 'Flower', 'Plushie'
  const [activeView, setActiveView] = useState('stock'); // 'stock', 'batches', 'deductions'

  // Modals & Forms
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [unitCost, setUnitCost] = useState('');
  const [source, setSource] = useState('Abroad');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [logExpense, setLogExpense] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Hand');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Deductions log
  const [deductions, setDeductions] = useState([]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const categoryParam = activeCategory === 'ALL' ? undefined : activeCategory;
      const res = await getInventory({ category: categoryParam });
      if (res.success) {
        setInventoryData(res);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogAndDeductions = async () => {
    try {
      const catRes = await getItemsCatalog();
      if (catRes.success) setCatalogItems(catRes.items);

      const dedRes = await getInventoryDeductions();
      if (dedRes.success) setDeductions(dedRes.deductions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [activeCategory]);

  useEffect(() => {
    fetchCatalogAndDeductions();
  }, []);

  const handleOpenAddBatch = (preselectedItem = null) => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem.item_id);
      setUnitCost(preselectedItem.buy_price || '');
    } else if (catalogItems.length > 0 && !selectedItemId) {
      setSelectedItemId(catalogItems[0].item_id);
      setUnitCost(catalogItems[0].buy_price || '');
    }
    setIsAddBatchOpen(true);
  };

  const handleItemSelectChange = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    const it = catalogItems.find(c => c.item_id === parseInt(id, 10));
    if (it) {
      setUnitCost(it.buy_price || 0);
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    try {
      setSubmittingBatch(true);
      const res = await addInventoryBatch({
        itemId: selectedItemId,
        quantity: parseInt(quantity, 10),
        unitCost: parseFloat(unitCost),
        source,
        purchaseDate,
        notes,
        logExpense,
        paymentMethod
      });
      if (res.success) {
        showToast('success', `Added batch of ${quantity} units ($${Number(res.totalCost).toLocaleString()})`);
        setIsAddBatchOpen(false);
        setNotes('');
        await fetchInventory();
        await fetchCatalogAndDeductions();
        await refreshData(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Are you sure you want to delete this inventory batch?')) return;
    try {
      const res = await deleteInventoryBatch(batchId);
      if (res.success) {
        showToast('success', 'Batch deleted successfully');
        await fetchInventory();
        await refreshData(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    }
  };

  const summary = inventoryData?.summary;
  const items = inventoryData?.items || [];
  const batches = inventoryData?.batches || [];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-purple-400" />
            FIFO Museum Inventory Batches
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Track exotic flowers and plushies by batch purchase price for accurate cost-of-goods-sold (COGS).
          </p>
        </div>

        <button
          onClick={() => handleOpenAddBatch()}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-purple-950/20 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Item Batch</span>
        </button>
      </div>

      {/* Inventory Valuation Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Units Stocked</span>
          <span className="text-2xl font-black text-white">{summary?.totalUnits?.toLocaleString() || 0}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Flowers & Plushies</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total FIFO Cost Basis</span>
          <span className="text-2xl font-black font-mono text-slate-200">
            ${(summary?.totalInventoryCost || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Actual cash invested</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Torn Market Value</span>
          <span className="text-2xl font-black font-mono text-purple-400">
            ${(summary?.totalInventoryMarketVal || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Live Bazaar / Market price</span>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Unrealized Profit</span>
          <span className={`text-2xl font-black font-mono flex items-center gap-1 ${
            (summary?.potentialUnrealizedGain || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {(summary?.potentialUnrealizedGain || 0) >= 0 ? '+' : ''}
            ${(summary?.potentialUnrealizedGain || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">If sold at retail price</span>
        </div>
      </div>

      {/* Category & View Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeCategory === 'ALL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setActiveCategory('Flower')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeCategory === 'Flower' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌸 Flowers
          </button>
          <button
            onClick={() => setActiveCategory('Plushie')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeCategory === 'Plushie' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🧸 Plushies
          </button>
        </div>

        {/* View Type Toggle */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveView('stock')}
            className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
              activeView === 'stock'
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Stock Overview
          </button>
          <button
            onClick={() => setActiveView('batches')}
            className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
              activeView === 'batches'
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveView('deductions')}
            className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
              activeView === 'deductions'
                ? 'bg-slate-800 border-slate-700 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Deductions Audit
          </button>
        </div>
      </div>

      {/* VIEW 1: STOCK OVERVIEW */}
      {activeView === 'stock' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.item_id}
              className="glass-panel rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    {item.country_origin}
                  </span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    item.quantity_on_hand > 0 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.quantity_on_hand} on hand
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm mb-1">{item.name}</h3>

                <div className="space-y-1.5 bg-slate-900/50 rounded-xl p-2.5 border border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Abroad Buy:</span>
                    <span className="font-mono text-slate-200">${item.buy_price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Market Value:</span>
                    <span className="font-mono text-purple-300 font-semibold">${item.market_value?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>Total Cost Basis:</span>
                    <span className="font-mono text-slate-200">${Number(item.total_cost_basis || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenAddBatch(item)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 rounded-xl border border-slate-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Stock</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: ACTIVE BATCHES TABLE */}
      {activeView === 'batches' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-center">Remaining / Bought</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Remaining Value</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-slate-400">#{b.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {new Date(b.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                      <span>{b.set_type === 'Flower' ? '🌸' : '🧸'}</span>
                      <span>{b.item_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-semibold">{b.source}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-emerald-400">{b.quantity_remaining}</span>
                      <span className="text-slate-500"> / {b.quantity_bought}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-200">
                      ${Number(b.unit_cost).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-300">
                      ${(Number(b.quantity_remaining) * Number(b.unit_cost)).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete unused batch"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No active inventory batches. Click "Add Item Batch" to add stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: DEDUCTIONS AUDIT LOG */}
      {activeView === 'deductions' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Reason / Type</th>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4 text-center">Deducted Qty</th>
                  <th className="py-3 px-4 text-right">FIFO Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Deducted COGS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {deductions.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(d.created_at).toLocaleDateString()} {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {d.item_name}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {d.deduction_type} #{d.reference_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">Batch #{d.batch_id}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-200">{d.quantity_deducted}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">${Number(d.unit_cost).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-purple-300">${Number(d.total_cogs).toLocaleString()}</td>
                  </tr>
                ))}
                {deductions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No deduction records yet. Deductions are recorded when sets are converted into museum points.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD INVENTORY BATCH MODAL */}
      <Modal
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        title="Add Inventory Batch (FIFO)"
      >
        <form onSubmit={handleAddBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Item:
            </label>
            <select
              value={selectedItemId}
              onChange={handleItemSelectChange}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
            >
              {catalogItems.map((it) => (
                <option key={it.item_id} value={it.item_id}>
                  [{it.set_type}] {it.name} ({it.country_origin})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantity Bought:
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
                step="any"
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
                <option value="Abroad">Abroad Flight Haul</option>
                <option value="Bazaar">Player Bazaar</option>
                <option value="Item Market">Item Market</option>
                <option value="Trade">Direct Trade</option>
                <option value="Gift">Gift / Loot</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Purchase Date:
              </label>
              <input
                type="datetime-local"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Option to record as cash outflow */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={logExpense}
                onChange={(e) => setLogExpense(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
              />
              <span className="text-xs text-slate-200 font-semibold">
                Auto-log cash outflow in Financial Expense Ledger
              </span>
            </label>

            {logExpense && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Paid From:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Cash on Hand">Cash on Hand</option>
                  <option value="City Bank">City Bank</option>
                  <option value="Vault">Vault</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes:
            </label>
            <input
              type="text"
              placeholder="e.g., South Africa private jet run"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Total Batch Value:</span>
              <span className="font-mono font-bold text-white">${(quantity * (parseFloat(unitCost) || 0)).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddBatchOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingBatch}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-purple-950/20"
            >
              <Package className="h-4 w-4" />
              <span>{submittingBatch ? 'Adding...' : 'Save Batch'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
