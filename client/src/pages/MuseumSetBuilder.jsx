import React, { useState, useEffect } from 'react';
import { simulateMuseumSet, convertMuseumSets } from '../api';
import { useTornData } from '../context/TornDataContext';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  TrendingUp, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Sliders,
  Layers,
  ArrowRight,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';

export default function MuseumSetBuilder() {
  const { showToast, refresh } = useTornData();

  // Active Set Type
  const [setType, setSetType] = useState('plushie'); // 'plushie' or 'flower'
  const [setCount, setSetCount] = useState(1);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' (default) or 'grid'
  const [expandedItemIds, setExpandedItemIds] = useState(new Set());

  const toggleExpand = (itemId) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Guide Collapsible
  const [showGuide, setShowGuide] = useState(true);

  // Custom Pricing State
  const [selectedPricingMode, setSelectedPricingMode] = useState('advisable'); // 'minimum', 'advisable', 'aggressive', 'custom'
  const [customPrice, setCustomPrice] = useState(45000);
  const [submitting, setSubmitting] = useState(false);

  const fetchSimulation = async () => {
    try {
      setLoading(true);
      const res = await simulateMuseumSet(setType, setCount);
      if (res.success) {
        setSimulation(res);
        if (res.pricingPresets?.advisableMarket?.price) {
          setCustomPrice(res.pricingPresets.advisableMarket.price);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to simulate museum set');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
  }, [setType, setCount]);

  const handleSliderChange = (e) => {
    setSetCount(parseInt(e.target.value, 10));
  };

  const activePrice = selectedPricingMode === 'custom' 
    ? Number(customPrice) 
    : selectedPricingMode === 'minimum'
    ? simulation?.pricingPresets?.minimumFast?.price
    : selectedPricingMode === 'aggressive'
    ? simulation?.pricingPresets?.aggressiveHigh?.price
    : simulation?.pricingPresets?.advisableMarket?.price || 45000;

  const pointsGenerated = (setCount || 1) * 10;
  const totalFifoCost = simulation?.totalFifoCost || 0;
  const projectedRevenue = activePrice * pointsGenerated;
  const projectedNetProfit = projectedRevenue - totalFifoCost;
  const projectedRoiPct = totalFifoCost > 0 ? (projectedNetProfit / totalFifoCost) * 100 : 0;

  const handleExecuteConversion = async () => {
    try {
      setSubmitting(true);
      const res = await convertMuseumSets({
        setType,
        setsToConvert: setCount,
        salePricePerPoint: activePrice,
        pointsSold: pointsGenerated // Option to record sale at chosen price
      });
      if (res.success) {
        showToast('success', `Converted ${res.setsConverted} ${setType} sets for ${res.pointsGenerated} points! Net profit: $${Number(res.netProfit).toLocaleString()}`);
        await fetchSimulation();
        await refresh(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (val) => '$' + Number(val || 0).toLocaleString();

  return (
    <div className="space-y-6">
      
      {/* 1. ONBOARDING 3-STEP GUIDE (COLLAPSIBLE) */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
        <div 
          onClick={() => setShowGuide(!showGuide)}
          className="p-4 bg-slate-900/60 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white">How It Works: 3-Step Museum Point Arbitrage Guide</h3>
          </div>
          <button className="text-slate-400 p-1">
            {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showGuide && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 text-xs">
            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Step 1</span>
              <h4 className="font-bold text-white text-sm">Sync or Log Items</h4>
              <p className="text-slate-400 leading-relaxed">
                Connect your Torn API key or log manual batches of foreign travel flowers and plushies. Every batch preserves its exact purchase cost.
              </p>
            </div>

            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">Step 2</span>
              <h4 className="font-bold text-white text-sm">Check FIFO Cost & Leftovers</h4>
              <p className="text-slate-400 leading-relaxed">
                The engine matches 1 of each required item using strict First-In, First-Out costing. Leftover items stay preserved for future complete sets.
              </p>
            </div>

            <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Step 3</span>
              <h4 className="font-bold text-white text-sm">Pick Point Price & Profit</h4>
              <p className="text-slate-400 leading-relaxed">
                Choose between Fast Turnover (+2%), Live Market Undercut, or Patient Seller high price to maximize Torn Dollar profit margins.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Set Selector Tabs (Plushies vs Flowers) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => { setSetType('plushie'); setSetCount(1); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              setType === 'plushie' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🧸 13 Plushies Set</span>
            <span className="text-[10px] bg-blue-900/60 px-2 py-0.5 rounded-full text-blue-200">
              {simulation?.maxSets || 0} Ready
            </span>
          </button>

          <button
            onClick={() => { setSetType('flower'); setSetCount(1); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              setType === 'flower' 
                ? 'bg-pink-600 text-white shadow-md shadow-pink-950/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌸 11 Flowers Set</span>
            <span className="text-[10px] bg-pink-900/60 px-2 py-0.5 rounded-full text-pink-200">
              {simulation?.maxSets || 0} Ready
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span>Live Points Market Lowest:</span>
          <span className="font-bold font-mono text-amber-300">
            {formatMoney(simulation?.liveMarketPointPrice || 45000)} / pt
          </span>
        </div>
      </div>

      {/* 2. SET READINESS BREAKDOWN: TABLE & GRID VIEWS (INVENTORY FIRST) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <span>Set Readiness Breakdown ({simulation?.items?.length || 0} items)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Showing exact real batches in stock with no averaged distortion
            </p>
          </div>

          {/* Table vs Grid Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table View (Real Batches)</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          /* ZERO-CONFUSION REAL BATCHES TABLE VIEW */
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Item & Country</th>
                    <th className="py-3.5 px-4 text-center font-bold">Stock Owned</th>
                    <th className="py-3.5 px-4 font-bold">Real Batches in Vault (Exact Cost Basis)</th>
                    <th className="py-3.5 px-4 text-right font-bold">FIFO Cost for {setCount} Set(s)</th>
                    <th className="py-3.5 px-4 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {simulation?.items?.map((item) => {
                    const hasStock = item.ownedCount > 0;
                    const isExpanded = expandedItemIds.has(item.id);
                    const batchCount = item.batches?.length || 0;
                    return (
                      <React.Fragment key={item.id}>
                        <tr 
                          className={`transition-colors ${
                            item.isBottleneck 
                              ? 'bg-amber-950/15 hover:bg-amber-950/25' 
                              : 'hover:bg-slate-900/40'
                          }`}
                        >
                          {/* 1. Item Name & Origin */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{setType === 'flower' ? '🌸' : '🧸'}</span>
                              <div>
                                <div className="font-extrabold text-white text-xs">{item.name}</div>
                                <div className="text-[10px] text-slate-400">{item.country}</div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Owned Stock */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.ownedCount >= setCount
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : item.ownedCount > 0
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {item.ownedCount} owned
                            </span>
                          </td>

                          {/* 3. Real Batches (Uniform Height with Expand Option) */}
                          <td className="py-3 px-4">
                            {batchCount > 0 ? (
                              <div className="flex items-center gap-2">
                                {/* First/Next FIFO Batch */}
                                <span className="font-mono text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-200 shrink-0">
                                  <strong className="text-emerald-400 font-extrabold">{item.batches[0].qty}x</strong> @ ${item.batches[0].unitCost.toLocaleString()}
                                  <span className="text-slate-500 text-[10px] ml-1 uppercase">({item.batches[0].source})</span>
                                </span>

                                {/* Toggle button for remaining batches */}
                                {batchCount > 1 && (
                                  <button
                                    onClick={() => toggleExpand(item.id)}
                                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 ${
                                      isExpanded
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
                                    }`}
                                    title="Click to view all batches in chronological FIFO order"
                                  >
                                    <span>+{batchCount - 1} more</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">
                                0 in stock (Store base: ${item.buyPrice.toLocaleString()})
                              </span>
                            )}
                          </td>

                          {/* 4. FIFO Deduction for Selected Sets */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            ${(item.deductionCost || (setCount * item.buyPrice)).toLocaleString()}
                          </td>

                          {/* 5. Readiness Status */}
                          <td className="py-3 px-4 text-right">
                            {item.isBottleneck ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                                <AlertCircle className="h-3 w-3" />
                                <span>{item.ownedCount === 0 ? 'Missing (0 in stock)' : `Need ${setCount - item.ownedCount} more`}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Ready ({item.ownedCount} in stock)</span>
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable FIFO Queue Sub-Row */}
                        {isExpanded && batchCount > 1 && (
                          <tr className="bg-slate-950/80 border-b border-slate-800">
                            <td colSpan="5" className="p-3.5 pl-10">
                              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2.5 shadow-inner">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-blue-400" />
                                    <span>Complete FIFO Queue for {item.name}</span>
                                    <span className="text-slate-400 font-normal">({batchCount} individual lots • {item.ownedCount} total units)</span>
                                  </span>
                                  <span className="text-slate-400 text-[11px]">
                                    Consumed in order: Batch #1 → Batch #{batchCount}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                                  {item.batches.map((b, idx) => (
                                    <div 
                                      key={idx}
                                      className={`p-2.5 rounded-xl border text-xs font-mono flex flex-col justify-between ${
                                        idx === 0 
                                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-sm' 
                                          : 'bg-slate-950/90 border-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center text-[10px] mb-1">
                                        <span className={idx === 0 ? 'font-bold text-emerald-400' : 'text-slate-500'}>
                                          Lot #{idx + 1} {idx === 0 && '(Next up)'}
                                        </span>
                                        <span className="text-slate-400 uppercase text-[9px] px-1.5 py-0.2 rounded bg-slate-800">
                                          {b.source}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-baseline pt-1">
                                        <span className="font-black text-white text-xs">{b.qty} units</span>
                                        <span className="text-slate-200 font-bold">${b.unitCost.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
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
          </div>
        ) : (
          /* CARD GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {simulation?.items?.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl p-4 border transition-all ${
                  item.isBottleneck
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-950/20'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white truncate max-w-[140px]" title={item.name}>
                    {item.name}
                  </span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    item.isBottleneck 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.ownedCount} owned
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Origin:</span>
                    <span className="text-slate-300 font-medium">{item.country}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Batches in Vault:</span>
                    {item.batches && item.batches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.batches.map((b, idx) => (
                          <span key={idx} className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                            <strong className="text-emerald-400">{b.qty}x</strong> @ ${b.unitCost.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[10px] italic">0 in stock</span>
                    )}
                  </div>
                </div>

                {item.isBottleneck && (
                  <div className="mt-2.5 pt-2 border-t border-amber-500/20 text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>Bottleneck: limits ready sets</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SET CONVERTER & POINT PRICING MATRIX (PLACED AT BOTTOM FOR EXECUTION) */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span>Convert Sets & Sell Museum Points</span>
            </h3>
            <p className="text-xs text-slate-400">
              Execute FIFO point conversion when you are ready to sell complete sets
            </p>
          </div>
          <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
            Available to convert: <strong className="text-emerald-400 font-mono">{simulation?.maxSets || 0} Sets</strong>
          </span>
        </div>

        {/* Interactive Set Calculator Slider */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Choose How Many Sets to Convert:
              </h4>
              <p className="text-xs text-slate-400">
                You can exchange up to <strong className="text-emerald-400">{simulation?.maxSets || 0} sets</strong> right now.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-black font-mono text-emerald-400">
                {setCount} <span className="text-sm font-semibold text-slate-400">Sets</span>
              </span>
              <button
                onClick={() => setSetCount(Math.max(1, simulation?.maxSets || 1))}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700"
              >
                Set Max ({simulation?.maxSets || 0})
              </button>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max={Math.max(1, simulation?.maxSets || 1)}
            value={setCount}
            onChange={handleSliderChange}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>1 Set (10 Pts)</span>
            <span>Target: {pointsGenerated} Museum Points</span>
            <span>Max: {simulation?.maxSets || 1} Sets</span>
          </div>
        </div>

        {/* Pricing & Profit Matrix Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-white text-base">Point Pricing & Profit Matrix</h4>
                <span title="The Breakeven point is the exact FIFO item cost divided by 10 points. Anything above this is pure profit." className="text-slate-400 cursor-help">
                  <HelpCircle className="h-4 w-4" />
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Total FIFO Cost for {setCount} set(s): <strong className="text-slate-200 font-mono">{formatMoney(totalFifoCost)}</strong> • Breakeven: <strong className="text-amber-400 font-mono">${simulation?.breakevenPerPoint?.toFixed(2)} / pt</strong>
              </p>
            </div>

            <div className="bg-slate-900 rounded-xl px-3 py-1.5 border border-slate-800 text-xs text-slate-300">
              <span>Points to Generate: </span>
              <strong className="text-amber-400 font-mono font-extrabold">{pointsGenerated} Points</strong>
            </div>
          </div>

          {/* 3 Preset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Preset 1: Fast Turnover (+2%) */}
            <div
              onClick={() => setSelectedPricingMode('minimum')}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                selectedPricingMode === 'minimum'
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-950/20'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase text-amber-400 block mb-1">
                Minimum / Fast Turnover
              </span>
              <div className="text-xl font-black font-mono text-white mb-1">
                ${simulation?.pricingPresets?.minimumFast?.price?.toLocaleString()}
                <span className="text-xs font-normal text-slate-400"> / pt</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">+2% above FIFO breakeven</p>
              <div className="text-xs pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-400">Net Profit:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  +${simulation?.pricingPresets?.minimumFast?.netProfit?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Preset 2: Advisable (Undercut Live Market) */}
            <div
              onClick={() => setSelectedPricingMode('advisable')}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                selectedPricingMode === 'advisable'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 block mb-1">
                Advisable / Live Market
              </span>
              <div className="text-xl font-black font-mono text-white mb-1">
                ${simulation?.pricingPresets?.advisableMarket?.price?.toLocaleString()}
                <span className="text-xs font-normal text-slate-400"> / pt</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Undercut market by $20 for instant sale</p>
              <div className="text-xs pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-400">Net Profit:</span>
                <span className="text-emerald-300 font-mono font-bold">
                  +${simulation?.pricingPresets?.advisableMarket?.netProfit?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Preset 3: Aggressive High (+1.5% Patient Seller) */}
            <div
              onClick={() => setSelectedPricingMode('aggressive')}
              className={`rounded-2xl p-4 border cursor-pointer transition-all ${
                selectedPricingMode === 'aggressive'
                  ? 'bg-purple-500/15 border-purple-500/50 shadow-lg shadow-purple-950/20'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase text-purple-400 block mb-1">
                Patient Seller / High
              </span>
              <div className="text-xl font-black font-mono text-white mb-1">
                ${simulation?.pricingPresets?.aggressiveHigh?.price?.toLocaleString()}
                <span className="text-xs font-normal text-slate-400"> / pt</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">+1.5% above top 10 market average</p>
              <div className="text-xs pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-400">Net Profit:</span>
                <span className="text-purple-300 font-mono font-bold">
                  +${simulation?.pricingPresets?.aggressiveHigh?.netProfit?.toLocaleString()}
                </span>
              </div>
            </div>

          </div>

          {/* Custom Price Input & Execution Strip */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Custom Point Price ($):
                </label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => {
                    setCustomPrice(e.target.value);
                    setSelectedPricingMode('custom');
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm w-36 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="text-xs space-y-0.5">
                <span className="text-slate-400 block">Projected Net Revenue:</span>
                <span className="font-mono font-bold text-white text-base">{formatMoney(projectedRevenue)}</span>
              </div>

              <div className="text-xs space-y-0.5">
                <span className="text-slate-400 block">Net Realized Profit:</span>
                <span className="font-mono font-black text-emerald-400 text-base">+{formatMoney(projectedNetProfit)}</span>
              </div>

              <div className="text-xs space-y-0.5 hidden sm:block">
                <span className="text-slate-400 block">ROI Margin:</span>
                <span className="font-mono font-extrabold text-emerald-300 text-base">{projectedRoiPct.toFixed(1)}%</span>
              </div>
            </div>

            <button
              onClick={handleExecuteConversion}
              disabled={submitting || (simulation?.maxSets || 0) < setCount}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
            >
              <Sparkles className="h-4 w-4" />
              <span>{submitting ? 'Converting...' : `Convert ${setCount} Set(s) for ${pointsGenerated} Points`}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
