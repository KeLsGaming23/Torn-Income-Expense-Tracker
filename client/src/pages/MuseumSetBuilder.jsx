import React, { useState, useEffect } from 'react';
import { simulateMuseumSet } from '../api';
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
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  Calculator,
  ShieldCheck,
  RefreshCw,
  Plane
} from 'lucide-react';

export default function MuseumSetBuilder({ setActiveTab }) {
  const { showToast, refresh, syncing } = useTornData();

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
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

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

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span>Points Market:</span>
            <span className="font-bold font-mono text-amber-300">
              {formatMoney(simulation?.liveMarketPointPrice || 31599)} / pt
            </span>
          </div>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab('calculator')}
              className="flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Profit Calculator</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SET READINESS BREAKDOWN: TABLE & GRID VIEWS (INVENTORY FIRST) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                Set Readiness Breakdown ({simulation?.items?.length || 0} items)
              </h3>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Strict API Sync</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sorted from shortest to longest travel time • Live inventory synchronized directly from Torn API
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await refresh(false);
                await fetchSimulation();
              }}
              disabled={syncing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all disabled:opacity-50"
              title="Poll Torn API v2 to update inventory immediately"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing || loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Live Inventory'}</span>
            </button>

            {/* Table vs Grid Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
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
        </div>

        {viewMode === 'table' ? (
          /* ZERO-CONFUSION REAL BATCHES TABLE VIEW */
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Item & Travel Time (Shortest to Longest)</th>
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
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                  <span>{item.country}</span>
                                  {item.flightFormatted && (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span className="font-mono text-sky-400 bg-sky-950/40 px-1.5 py-0.2 rounded border border-sky-800/40 inline-flex items-center gap-1">
                                        <Plane className="h-2.5 w-2.5" />
                                        <span>{item.flightFormatted}</span>
                                      </span>
                                    </>
                                  )}
                                </div>
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
                  <div className="flex justify-between items-center">
                    <span>Origin / Flight:</span>
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <span>{item.country}</span>
                      {item.flightFormatted && (
                        <span className="text-[10px] font-mono text-sky-400 bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-800/40 inline-flex items-center gap-1">
                          <Plane className="h-2.5 w-2.5" />
                          <span>{item.flightFormatted}</span>
                        </span>
                      )}
                    </span>
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

      {/* 3. PROJECTED INCOME & POINT MARKET CALCULATOR (ALL NUMBERS VISIBLE) */}
      <div className="space-y-5 pt-4 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-400" />
              <span>Projected Income & Point Market Calculator</span>
            </h3>
            <p className="text-xs text-slate-400">
              Calculate exact profit, FIFO spend, breakeven, and net income for your sets
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
              Available in Stock: <strong className="text-emerald-400 font-mono">{simulation?.maxSets || 0} Sets</strong>
            </span>
            <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
              Yield: <strong className="text-amber-400 font-mono">{(simulation?.maxSets || 0) * 10} Points</strong>
            </span>
          </div>
        </div>

        {/* Interactive Set Calculator Slider */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Select Sets to Project:
              </h4>
              <p className="text-xs text-slate-400">
                You have enough items in stock to complete <strong className="text-emerald-400">{simulation?.maxSets || 0} sets</strong> right now.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSetCount(1)}
                className="bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 px-3 py-1.5 rounded-xl border border-slate-800"
              >
                1 Set
              </button>
              {simulation?.maxSets > 1 && (
                <button
                  onClick={() => setSetCount(Math.max(1, Math.floor(simulation.maxSets / 2)))}
                  className="bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 px-3 py-1.5 rounded-xl border border-slate-800"
                >
                  Half ({Math.max(1, Math.floor(simulation.maxSets / 2))})
                </button>
              )}
              <button
                onClick={() => setSetCount(Math.max(1, simulation?.maxSets || 1))}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl border border-slate-700"
              >
                Max ({simulation?.maxSets || 0})
              </button>
              <span className="text-2xl font-black font-mono text-emerald-400 ml-2">
                {setCount} <span className="text-xs font-semibold text-slate-400">Sets</span>
              </span>
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
            <span className="text-slate-300 font-semibold">Generating {pointsGenerated} Museum Points</span>
            <span>Max: {simulation?.maxSets || 1} Sets</span>
          </div>
        </div>

        {/* Pricing Strategy Selector */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-white text-base">Point Pricing Strategy</h4>
                <span title="The Breakeven point is the exact FIFO item cost divided by 10 points. Anything above this is pure profit." className="text-slate-400 cursor-help">
                  <HelpCircle className="h-4 w-4" />
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Choose a pricing preset or enter a custom target price per point
              </p>
            </div>

            <div className="bg-slate-900 rounded-xl px-3 py-1.5 border border-slate-800 text-xs text-slate-300">
              <span>Points Yield: </span>
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
                Fast Turnover (+2%)
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
              <p className="text-[11px] text-slate-400 mb-2">+1.5% above top market average</p>
              <div className="text-xs pt-2 border-t border-slate-800 flex justify-between font-medium">
                <span className="text-slate-400">Net Profit:</span>
                <span className="text-purple-300 font-mono font-bold">
                  +${simulation?.pricingPresets?.aggressiveHigh?.netProfit?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Price Strip */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                Custom Target Price:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">$</span>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => {
                    setCustomPrice(e.target.value);
                    setSelectedPricingMode('custom');
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-mono font-bold text-sm w-36 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400">/ pt</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Quick set:</span>
              <button
                onClick={() => { setCustomPrice(32500); setSelectedPricingMode('custom'); }}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-300 font-mono"
              >
                $32,500
              </button>
              <button
                onClick={() => { setCustomPrice(45000); setSelectedPricingMode('custom'); }}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-300 font-mono"
              >
                $45,000
              </button>
              <button
                onClick={() => { setCustomPrice(47000); setSelectedPricingMode('custom'); }}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded-lg text-slate-300 font-mono"
              >
                $47,000
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. TRANSPARENT FINANCIAL BREAKDOWN (EVERY SINGLE NUMBER EXPLICITLY VISIBLE) */}
          {/* ========================================================================= */}
          <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-400" />
                <span>Financial Breakdown Ledger (All Numbers Visible)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Gross Revenue ({pointsGenerated} pts × ${Number(activePrice).toLocaleString()}) − FIFO Spend ({formatMoney(totalFifoCost)})
              </span>
            </div>

            {/* 6 Grid Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Metric 1: Sets Selected */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sets Selected</span>
                <span className="text-lg font-black font-mono text-white block">{setCount}</span>
                <span className="text-[10px] text-slate-500">10 points / set</span>
              </div>

              {/* Metric 2: Points Generated */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Points Yielded</span>
                <span className="text-lg font-black font-mono text-amber-400 block">{pointsGenerated}</span>
                <span className="text-[10px] text-slate-500">{setCount} sets × 10</span>
              </div>

              {/* Metric 3: Total FIFO Cost (Spent to complete) */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Amount Spent (FIFO)</span>
                <span className="text-lg font-black font-mono text-slate-200 block">{formatMoney(totalFifoCost)}</span>
                <span className="text-[10px] text-slate-500">Exact item cost basis</span>
              </div>

              {/* Metric 4: Breakeven Cost per Point */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Breakeven / Point</span>
                <span className="text-lg font-black font-mono text-amber-300 block">
                  ${pointsGenerated > 0 ? (totalFifoCost / pointsGenerated).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-slate-500">Spent ÷ Points</span>
              </div>

              {/* Metric 5: Sale Price per Point */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Target Sale Price</span>
                <span className="text-lg font-black font-mono text-sky-400 block">
                  ${Number(activePrice).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">per Museum point</span>
              </div>

              {/* Metric 6: Gross Revenue */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Gross Revenue</span>
                <span className="text-lg font-black font-mono text-white block">{formatMoney(projectedRevenue)}</span>
                <span className="text-[10px] text-slate-500">{pointsGenerated} pts × ${Number(activePrice).toLocaleString()}</span>
              </div>
            </div>

            {/* Bottom Equation Highlight Card */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 rounded-2xl p-4 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center md:justify-start gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>Projected Net Income / Profit</span>
                </span>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-mono text-slate-300">
                  <span className="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                    Gross: <strong className="text-white">{formatMoney(projectedRevenue)}</strong>
                  </span>
                  <span>−</span>
                  <span className="bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                    Spent: <strong className="text-slate-300">{formatMoney(totalFifoCost)}</strong>
                  </span>
                  <span>=</span>
                  <span className="bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-300 font-bold">
                    Net: +{formatMoney(projectedNetProfit)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Net Profit</span>
                  <span className="text-2xl md:text-3xl font-black font-mono text-emerald-400">
                    +{formatMoney(projectedNetProfit)}
                  </span>
                </div>

                <div className="text-right border-l border-slate-800 pl-6">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">ROI Margin</span>
                  <span className="text-2xl md:text-3xl font-black font-mono text-teal-300">
                    +{projectedRoiPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* COLLAPSIBLE DETAILED ITEM EXPENSE & PROFIT BREAKDOWN */}
          <div className="pt-1 space-y-3">
            {/* Toggle Button */}
            <button
              onClick={() => setShowCalculationDetails(prev => !prev)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                    <span>{showCalculationDetails ? 'Hide Itemized Expense & Profit Breakdown' : 'Show Details (Itemized Expense & Net Income)'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                      {simulation?.items?.length || 0} items for {setCount} set(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {showCalculationDetails 
                      ? 'Click to collapse back to the compact summary ledger' 
                      : 'View exact acquisition origin, unit purchase price, total expense, and net profit per item'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-white transition-colors bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span>{showCalculationDetails ? 'Collapse' : 'Show Details'}</span>
                {showCalculationDetails ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {/* Expanded Detailed Breakdown Table */}
            {showCalculationDetails && (
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in duration-200">
                <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Itemized Cost Basis & Projected Net Profit ({setCount} Sets)</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Based on selling {pointsGenerated} points @ ${Number(activePrice).toLocaleString()}/pt (${Math.round(projectedRevenue / (simulation?.items?.length || 1)).toLocaleString()} gross revenue per item)
                    </p>
                  </div>
                  <span className="text-[11px] font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 self-start sm:self-auto">
                    {setType === 'flower' ? '11 Flowers / Set' : '13 Plushies / Set'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-bold">Item & Where Acquired</th>
                        <th className="py-3 px-3 text-center font-bold">Qty Needed</th>
                        <th className="py-3 px-3 text-right font-bold">Unit Price / Cost</th>
                        <th className="py-3 px-4 text-right font-bold">Total Expense</th>
                        <th className="py-3 px-4 text-right font-bold">Value if Sold (@ ${Number(activePrice).toLocaleString()}/pt)</th>
                        <th className="py-3 px-4 text-right font-bold">Net Income</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium font-mono text-[11px]">
                      {simulation?.items?.map((item) => {
                        const totalItemExpense = item.deductionCost || (setCount * item.buyPrice);
                        const unitPrice = setCount > 0 ? Math.round(totalItemExpense / setCount) : item.buyPrice;
                        
                        // Revenue allocated per item in the set
                        const totalItemsInSet = simulation?.items?.length || (setType === 'flower' ? 11 : 13);
                        const allocatedItemRevenue = projectedRevenue / totalItemsInSet;
                        const netItemProfit = allocatedItemRevenue - totalItemExpense;
                        const itemRoi = totalItemExpense > 0 ? (netItemProfit / totalItemExpense) * 100 : 0;
                        
                        // Origin & Acquisition formatting
                        const isLocal = item.country?.toLowerCase().includes('torn');
                        const primaryBatchSource = item.batches?.[0]?.source;
                        const acquisitionOrigin = isLocal 
                          ? 'Local City (Bits & Bobs)' 
                          : primaryBatchSource === 'bazaar'
                          ? 'Player Bazaar'
                          : primaryBatchSource === 'market'
                          ? 'Item Market'
                          : `Abroad (${item.country})`;

                        return (
                          <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                            {/* Item & Origin */}
                            <td className="py-3 px-4 font-sans">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{setType === 'flower' ? '🌸' : '🧸'}</span>
                                <div>
                                  <div className="font-bold text-white text-xs">{item.name}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                                    <span className="text-emerald-400/90">{acquisitionOrigin}</span>
                                    {item.flightFormatted && (
                                      <>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-sky-400">✈ {item.flightFormatted}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Qty Needed */}
                            <td className="py-3 px-3 text-center">
                              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-200 font-bold">
                                {setCount}x
                              </span>
                            </td>

                            {/* Unit Cost */}
                            <td className="py-3 px-3 text-right text-slate-300">
                              ${unitPrice.toLocaleString()}
                            </td>

                            {/* Total Expense */}
                            <td className="py-3 px-4 text-right font-bold text-amber-300">
                              ${totalItemExpense.toLocaleString()}
                            </td>

                            {/* Value if Sold */}
                            <td className="py-3 px-4 text-right text-sky-300">
                              ${Math.round(allocatedItemRevenue).toLocaleString()}
                            </td>

                            {/* Net Income */}
                            <td className="py-3 px-4 text-right">
                              <div className="font-black text-emerald-400">
                                +${Math.round(netItemProfit).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-teal-300/80 font-normal">
                                +{itemRoi.toFixed(0)}% ROI
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-950 font-mono text-xs border-t-2 border-slate-800 font-bold">
                      <tr>
                        <td className="py-3 px-4 text-white uppercase text-[10px] font-sans">
                          Total ({simulation?.items?.length || 0} Items for {setCount} Sets)
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300">
                          {setCount * (simulation?.items?.length || 0)} items
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500">
                          —
                        </td>
                        <td className="py-3 px-4 text-right text-amber-400 font-black">
                          {formatMoney(totalFifoCost)}
                        </td>
                        <td className="py-3 px-4 text-right text-sky-400 font-black">
                          {formatMoney(projectedRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-black">
                          <div>+{formatMoney(projectedNetProfit)}</div>
                          <div className="text-[10px] text-teal-300 font-normal">+{projectedRoiPct.toFixed(1)}% ROI</div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
