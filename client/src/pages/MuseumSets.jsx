import React, { useState, useEffect } from 'react';
import { 
  getMuseumSets, 
  convertMuseumSets, 
  sellMuseumPoints, 
  getConversionsHistory, 
  getPointLedger 
} from '../api';
import { useTornData } from '../context/TornDataContext';
import Modal from '../components/Modal';
import { 
  Sparkles, 
  Coins, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight, 
  History, 
  Layers, 
  DollarSign,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function MuseumSets() {
  const { showToast, refreshData } = useTornData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('sets'); // 'sets', 'conversions', 'pointLedger'

  // Conversion Modal State
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedSetType, setSelectedSetType] = useState('Flower');
  const [setCount, setSetCount] = useState(1);
  const [estimatedPointPrice, setEstimatedPointPrice] = useState(45000);
  const [conversionNotes, setConversionNotes] = useState('');
  const [submittingConversion, setSubmittingConversion] = useState(false);

  // Sell Points Modal State
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [pointsToSell, setPointsToSell] = useState(10);
  const [salePricePerPoint, setSalePricePerPoint] = useState(45000);
  const [buyerName, setBuyerName] = useState('');
  const [fees, setFees] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  // History & Ledger
  const [conversions, setConversions] = useState([]);
  const [pointBatches, setPointBatches] = useState([]);
  const [pointSales, setPointSales] = useState([]);
  const [expandedConvId, setExpandedConvId] = useState(null);

  const fetchSetsData = async () => {
    try {
      setLoading(true);
      const res = await getMuseumSets();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load museum sets');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const convRes = await getConversionsHistory();
      if (convRes.success) setConversions(convRes.conversions);

      const ledgerRes = await getPointLedger();
      if (ledgerRes.success) {
        setPointBatches(ledgerRes.batches);
        setPointSales(ledgerRes.sales);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSetsData();
    fetchHistory();
  }, []);

  const openConvertModal = (type) => {
    setSelectedSetType(type);
    const setObj = type === 'Flower' ? data?.sets?.flower : data?.sets?.plushie;
    const max = setObj?.maxSets || 1;
    setSetCount(Math.max(1, max));
    setEstimatedPointPrice(setObj?.pointPrice || 45000);
    setIsConvertOpen(true);
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    try {
      setSubmittingConversion(true);
      const res = await convertMuseumSets({
        setType: selectedSetType,
        setCount: parseInt(setCount, 10),
        estimatedPointPrice: parseFloat(estimatedPointPrice),
        notes: conversionNotes
      });
      if (res.success) {
        showToast('success', `Converted ${res.setsConverted} ${res.setType} set(s) for ${res.pointsAwarded} points! Total COGS: $${Number(res.totalCogs).toLocaleString()}`);
        setIsConvertOpen(false);
        setConversionNotes('');
        await fetchSetsData();
        await fetchHistory();
        await refreshData(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmittingConversion(false);
    }
  };

  const handleSellPoints = async (e) => {
    e.preventDefault();
    try {
      setSubmittingSale(true);
      const res = await sellMuseumPoints({
        pointsSold: parseInt(pointsToSell, 10),
        salePricePerPoint: parseFloat(salePricePerPoint),
        buyerName,
        fees: parseFloat(fees || 0),
        notes: saleNotes
      });
      if (res.success) {
        showToast('success', `Sold ${res.pointsSold} points for $${Number(res.netRevenue).toLocaleString()} net revenue! Realized Profit: $${Number(res.realizedProfit).toLocaleString()}`);
        setIsSellOpen(false);
        setBuyerName('');
        setSaleNotes('');
        await fetchSetsData();
        await fetchHistory();
        await refreshData(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmittingSale(false);
    }
  };

  const flowerSet = data?.sets?.flower;
  const plushieSet = data?.sets?.plushie;
  const pointLedger = data?.pointLedger;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            Torn Museum Sets & Point Conversions
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Exchange 11 Exotic Flowers or 13 Plushies for 10 Museum Points with strict FIFO cost basis.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSellOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-amber-950/20 active:scale-95 transition-all"
          >
            <Coins className="h-4 w-4" />
            <span>Sell Points (FIFO)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('sets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'sets'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Active Museum Sets</span>
        </button>

        <button
          onClick={() => setActiveSubTab('conversions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'conversions'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Conversion Runs ({conversions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pointLedger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'pointLedger'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>FIFO Point Ledger</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE SETS */}
      {activeSubTab === 'sets' && (
        <div className="space-y-8">
          
          {/* Quick Point Inventory Status Banner */}
          <div className="glass-panel rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Available Point Balance</span>
                <span className="text-xl font-black text-white">{pointLedger?.availablePoints?.toLocaleString() || 0} Points</span>
                <span className="text-xs text-slate-400 ml-2">
                  (FIFO Cost Basis: ${(pointLedger?.totalPointCogs || 0).toLocaleString()} • Avg: ${Math.round(pointLedger?.avgPointCostBasis || 0).toLocaleString()} / pt)
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSellOpen(true)}
              disabled={(pointLedger?.availablePoints || 0) <= 0}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all self-start sm:self-auto"
            >
              Log Point Sale
            </button>
          </div>

          {/* FLOWER SET CARD */}
          {flowerSet && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
              
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 p-[2px] shadow-lg shadow-pink-500/20">
                    <div className="h-full w-full bg-[#0d121f] rounded-[14px] flex items-center justify-center text-2xl">
                      🌸
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white">11 Exotic Flowers Set</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full">
                        Exotic Travel Set
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      1 of each exotic foreign flower = 10 Museum Points ($450,000 gross)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Complete Sets Ready</span>
                    <span className="text-2xl font-black text-emerald-400">{flowerSet.maxSets} Sets</span>
                  </div>
                  <button
                    onClick={() => openConvertModal('Flower')}
                    disabled={flowerSet.maxSets <= 0}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Convert Flowers</span>
                  </button>
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">FIFO Set COGS</span>
                  <span className="text-sm md:text-base font-mono font-bold text-slate-200">
                    ${flowerSet.nextSetEstimatedCogs.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cost Basis / Point</span>
                  <span className="text-sm md:text-base font-mono font-bold text-amber-400">
                    ${flowerSet.estimatedCostPerPoint.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Est. Profit / Set</span>
                  <span className="text-sm md:text-base font-mono font-bold text-emerald-400">
                    +${flowerSet.estimatedProfitPerSet.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Profit Margin</span>
                  <span className="text-sm md:text-base font-mono font-extrabold text-emerald-300">
                    {flowerSet.profitMarginPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Items Breakdown Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Required Flowers Breakdown (11 items)</span>
                  <span className="text-[11px] font-normal text-slate-500">Sorted by name</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {flowerSet.items.map((item) => {
                    const isBottleneck = item.quantity_on_hand === flowerSet.maxSets;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl p-3 border transition-all ${
                          isBottleneck
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-200 text-xs truncate max-w-[140px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                            item.quantity_on_hand > 0 
                              ? isBottleneck ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {item.quantity_on_hand} in stock
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{item.country}</span>
                          <span className="font-mono">${item.avg_unit_cost?.toLocaleString()} cost</span>
                        </div>

                        {isBottleneck && (
                          <div className="mt-2 text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Bottleneck (limits ready sets)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* PLUSHIE SET CARD */}
          {plushieSet && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-6">
              
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[2px] shadow-lg shadow-blue-500/20">
                    <div className="h-full w-full bg-[#0d121f] rounded-[14px] flex items-center justify-center text-2xl">
                      🧸
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white">13 Plushies Set</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        Full Plushie Set
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      1 of each 13 plushies = 10 Museum Points ($450,000 gross)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Complete Sets Ready</span>
                    <span className="text-2xl font-black text-blue-400">{plushieSet.maxSets} Sets</span>
                  </div>
                  <button
                    onClick={() => openConvertModal('Plushie')}
                    disabled={plushieSet.maxSets <= 0}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Convert Plushies</span>
                  </button>
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">FIFO Set COGS</span>
                  <span className="text-sm md:text-base font-mono font-bold text-slate-200">
                    ${plushieSet.nextSetEstimatedCogs.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cost Basis / Point</span>
                  <span className="text-sm md:text-base font-mono font-bold text-amber-400">
                    ${plushieSet.estimatedCostPerPoint.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Est. Profit / Set</span>
                  <span className="text-sm md:text-base font-mono font-bold text-blue-400">
                    +${plushieSet.estimatedProfitPerSet.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Profit Margin</span>
                  <span className="text-sm md:text-base font-mono font-extrabold text-blue-300">
                    {plushieSet.profitMarginPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Items Breakdown Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Required Plushies Breakdown (13 items)</span>
                  <span className="text-[11px] font-normal text-slate-500">Sorted by name</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {plushieSet.items.map((item) => {
                    const isBottleneck = item.quantity_on_hand === plushieSet.maxSets;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl p-3 border transition-all ${
                          isBottleneck
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-200 text-xs truncate max-w-[140px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                            item.quantity_on_hand > 0 
                              ? isBottleneck ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {item.quantity_on_hand} in stock
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{item.country}</span>
                          <span className="font-mono">${item.avg_unit_cost?.toLocaleString()} cost</span>
                        </div>

                        {isBottleneck && (
                          <div className="mt-2 text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>Bottleneck (limits ready sets)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: CONVERSION RUNS HISTORY */}
      {activeSubTab === 'conversions' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-400" />
              Historical Museum Conversions
            </h3>
            <span className="text-xs text-slate-400">Click a row to expand FIFO item deduction details</span>
          </div>

          {conversions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No museum conversions recorded yet.</p>
              <p className="text-xs">Convert your ready Flower or Plushie sets above to see them logged here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Set Type</th>
                    <th className="py-3 px-4 text-center">Sets Converted</th>
                    <th className="py-3 px-4 text-center">Points Awarded</th>
                    <th className="py-3 px-4 text-right">Total FIFO COGS</th>
                    <th className="py-3 px-4 text-right">Cost Basis / Pt</th>
                    <th className="py-3 px-4 text-right">Est. Profit</th>
                    <th className="py-3 px-4 text-center">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {conversions.map((conv) => {
                    const isExpanded = expandedConvId === conv.id;
                    const items = typeof conv.consumed_items === 'string' 
                      ? JSON.parse(conv.consumed_items || '[]') 
                      : (conv.consumed_items || []);

                    return (
                      <React.Fragment key={conv.id}>
                        <tr 
                          onClick={() => setExpandedConvId(isExpanded ? null : conv.id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {new Date(conv.conversion_date).toLocaleDateString()} {new Date(conv.conversion_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                            <span>{conv.set_type === 'Flower' ? '🌸' : '🧸'}</span>
                            <span>{conv.set_type} Set</span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-200">
                            {conv.sets_converted}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-amber-400">
                            +{conv.points_awarded} pts
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-200">
                            ${Number(conv.total_cogs).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-300">
                            ${Number(conv.cost_basis_per_point).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            +${Number(conv.estimated_profit).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400">
                            {isExpanded ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/60">
                            <td colSpan={8} className="p-4">
                              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                                <h5 className="text-[11px] font-bold text-slate-300 mb-2 uppercase tracking-wider">
                                  FIFO Deductions Audit (Items Consumed from Batches)
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {items.map((it, idx) => (
                                    <div key={idx} className="bg-slate-800/60 rounded-lg p-2 text-[11px]">
                                      <div className="font-semibold text-slate-200">{it.name}</div>
                                      <div className="flex justify-between text-slate-400 mt-0.5">
                                        <span>Qty: {it.quantity}</span>
                                        <span className="font-mono">${Number(it.unit_cost).toLocaleString()} ea</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {conv.notes && (
                                  <p className="text-xs text-slate-400 mt-2 italic">Note: {conv.notes}</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: POINT LEDGER & SALES */}
      {activeSubTab === 'pointLedger' && (
        <div className="space-y-6">
          
          {/* Active Point Inventory Batches */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-400" />
                Active FIFO Point Batches (On Hand)
              </h3>
              <span className="text-xs text-slate-400">Oldest points are consumed first upon sale</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Acquired Date</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-center">Initial Points</th>
                    <th className="py-3 px-4 text-center">Remaining</th>
                    <th className="py-3 px-4 text-right">FIFO Cost Basis / Pt</th>
                    <th className="py-3 px-4 text-right">Total Batch Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {pointBatches.filter(b => b.points_remaining > 0).map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-slate-400">#{batch.id}</td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {new Date(batch.acquired_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {batch.source}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">{batch.points_acquired}</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">
                        {batch.points_remaining} pts
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        ${Number(batch.cost_basis_per_point).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        ${(Number(batch.points_remaining) * Number(batch.cost_basis_per_point)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {pointBatches.filter(b => b.points_remaining > 0).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No active point batches available. Convert museum sets to generate points.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Point Sales */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-400" />
                Realized Point Sales History
              </h3>
              <span className="text-xs text-slate-400">Calculated against FIFO cost basis</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Buyer</th>
                    <th className="py-3 px-4 text-center">Points Sold</th>
                    <th className="py-3 px-4 text-right">Price / Pt</th>
                    <th className="py-3 px-4 text-right">Net Revenue</th>
                    <th className="py-3 px-4 text-right">FIFO COGS</th>
                    <th className="py-3 px-4 text-right">Realized Profit</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {pointSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {sale.buyer_name || 'Market / Trader'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">
                        {sale.points_sold} pts
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        ${Number(sale.sale_price_per_point).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-100">
                        ${Number(sale.net_revenue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ${Number(sale.fifo_cogs).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        +${Number(sale.realized_profit).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-300">
                        {Number(sale.profit_margin_pct).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {pointSales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No point sales recorded yet. Click "Sell Points" to record a sale.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* CONVERT SETS MODAL */}
      <Modal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title={`Convert ${selectedSetType} Sets at Torn Museum`}
      >
        <form onSubmit={handleConvert} className="space-y-4">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1">
            <p className="text-slate-300 font-semibold">
              Conversion Rules (Torn.com Museum):
            </p>
            <p className="text-slate-400 leading-relaxed">
              Consumes 1 of each {selectedSetType === 'Flower' ? '11 exotic flowers' : '13 plushies'} per set from your oldest inventory batches (FIFO). Awards <strong className="text-amber-400">{setCount * 10} Museum Points</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Number of Sets to Convert:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={selectedSetType === 'Flower' ? flowerSet?.maxSets : plushieSet?.maxSets}
                value={setCount}
                onChange={(e) => setSetCount(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setSetCount(selectedSetType === 'Flower' ? flowerSet?.maxSets : plushieSet?.maxSets)}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 px-3 py-2 rounded-xl shrink-0 border border-slate-700"
              >
                Max ({selectedSetType === 'Flower' ? flowerSet?.maxSets : plushieSet?.maxSets})
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Estimated Point Market Price ($):
            </label>
            <input
              type="number"
              value={estimatedPointPrice}
              onChange={(e) => setEstimatedPointPrice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g., Weekly travel haul conversion"
              value={conversionNotes}
              onChange={(e) => setConversionNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Live Preview Summary */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1.5 font-medium">
            <div className="flex justify-between text-slate-300">
              <span>Points to Receive:</span>
              <span className="font-bold text-amber-400">{setCount * 10} Points</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Gross Market Value:</span>
              <span className="font-mono text-slate-200">${(setCount * 10 * estimatedPointPrice).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsConvertOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingConversion}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="h-4 w-4" />
              <span>{submittingConversion ? 'Converting...' : `Confirm Conversion (${setCount * 10} pts)`}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* SELL POINTS MODAL */}
      <Modal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        title="Sell Torn Museum Points (FIFO)"
      >
        <form onSubmit={handleSellPoints} className="space-y-4">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs">
            <p className="text-slate-400">
              Selling points automatically deducts from your oldest points in the FIFO Point Ledger and logs a corresponding Income transaction in the ledger.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Points to Sell:
              </label>
              <input
                type="number"
                min="1"
                max={pointLedger?.availablePoints || 1}
                value={pointsToSell}
                onChange={(e) => setPointsToSell(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Available: {pointLedger?.availablePoints || 0} pts
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sale Price / Point ($):
              </label>
              <input
                type="number"
                value={salePricePerPoint}
                onChange={(e) => setSalePricePerPoint(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Buyer Name (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g., TrustedTrader [12345]"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transaction Fees / Discount ($):
              </label>
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes:
            </label>
            <input
              type="text"
              placeholder="e.g., Sold via Trade chat"
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Revenue Calculation Strip */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs space-y-1.5 font-medium">
            <div className="flex justify-between text-slate-300">
              <span>Gross Sale Revenue:</span>
              <span className="font-mono font-bold text-white">${(pointsToSell * salePricePerPoint).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Net Cash to Receive:</span>
              <span className="font-mono font-extrabold text-amber-300">
                ${((pointsToSell * salePricePerPoint) - Number(fees || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSellOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingSale}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20"
            >
              <Coins className="h-4 w-4" />
              <span>{submittingSale ? 'Processing...' : 'Confirm Point Sale'}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
