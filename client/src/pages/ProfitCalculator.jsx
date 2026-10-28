import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  PlaneTakeoff, 
  DollarSign,
  Boxes,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { getLivePointsMarket, getInventoryLots } from '../api';
import { FLOWER_DEFINITIONS, PLUSHIE_DEFINITIONS } from '../constants/museumDefinitions';

export default function ProfitCalculator() {
  const [setType, setSetType] = useState('flower'); // 'flower' | 'plushie'

  // Live market data
  const [marketData, setMarketData] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [sellingPricePerPoint, setSellingPricePerPoint] = useState(31580);

  // User's actual database inventory (for 1-click loading)
  const [vaultStockMap, setVaultStockMap] = useState({});

  // Active items for selected set
  const activeDefinitions = setType === 'flower' ? FLOWER_DEFINITIONS : PLUSHIE_DEFINITIONS;

  // Custom user inputs per item: { [itemId]: { qty: number, price: number } }
  const [itemInputs, setItemInputs] = useState({});

  // 1. Fetch Live Points Market & Real Inventory
  const fetchMarketAndVault = async () => {
    try {
      setMarketLoading(true);
      const [marketRes, invRes] = await Promise.all([
        getLivePointsMarket().catch(() => null),
        getInventoryLots({ leftoverOnly: 'true' }).catch(() => null)
      ]);

      if (marketRes?.success) {
        setMarketData(marketRes);
        if (marketRes.lowestListing) {
          setSellingPricePerPoint(marketRes.lowestListing - 20);
        }
      }

      if (invRes?.success && invRes.lots) {
        const stockMap = {};
        invRes.lots.forEach(lot => {
          const id = Number(lot.item_id);
          if (!stockMap[id]) {
            stockMap[id] = { qty: 0, avgCost: 0, totalCost: 0 };
          }
          const qty = Number(lot.qty_remaining);
          const cost = Number(lot.unit_cost);
          stockMap[id].qty += qty;
          stockMap[id].totalCost += (qty * cost);
          stockMap[id].avgCost = Math.round(stockMap[id].totalCost / stockMap[id].qty);
        });
        setVaultStockMap(stockMap);
      }
    } catch (err) {
      console.error('Error fetching market/vault data:', err);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketAndVault();
  }, []);

  // Initialize or reset item inputs when setType changes (default 20 units at typical bazaar price)
  useEffect(() => {
    const initial = {};
    activeDefinitions.forEach(item => {
      initial[item.id] = {
        qty: 20,
        price: item.typicalBazaarPrice || item.abroadPrice
      };
    });
    setItemInputs(initial);
  }, [setType]);

  // Bulk Handlers
  const handleSetAllQty = (qty) => {
    setItemInputs(prev => {
      const updated = { ...prev };
      activeDefinitions.forEach(item => {
        updated[item.id] = {
          ...updated[item.id],
          qty: Math.max(0, qty)
        };
      });
      return updated;
    });
  };

  const handleApplyBazaarPrices = () => {
    setItemInputs(prev => {
      const updated = { ...prev };
      activeDefinitions.forEach(item => {
        updated[item.id] = {
          ...updated[item.id],
          price: item.typicalBazaarPrice
        };
      });
      return updated;
    });
  };

  const handleApplyAbroadPrices = () => {
    setItemInputs(prev => {
      const updated = { ...prev };
      activeDefinitions.forEach(item => {
        updated[item.id] = {
          ...updated[item.id],
          price: item.abroadPrice
        };
      });
      return updated;
    });
  };

  const handleLoadVaultStock = () => {
    setItemInputs(prev => {
      const updated = { ...prev };
      activeDefinitions.forEach(item => {
        const vault = vaultStockMap[item.id];
        updated[item.id] = {
          qty: vault?.qty || 0,
          price: vault?.avgCost || item.abroadPrice
        };
      });
      return updated;
    });
  };

  const handleResetToZero = () => {
    setItemInputs(prev => {
      const updated = { ...prev };
      activeDefinitions.forEach(item => {
        updated[item.id] = {
          ...updated[item.id],
          qty: 0
        };
      });
      return updated;
    });
  };

  // Row input changes
  const handleQtyChange = (itemId, val) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setItemInputs(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        qty
      }
    }));
  };

  const handlePriceChange = (itemId, val) => {
    const price = Math.max(0, parseInt(val, 10) || 0);
    setItemInputs(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        price
      }
    }));
  };

  // 2. Core Profit & Listing Analysis Calculations
  const analysis = useMemo(() => {
    const quantities = activeDefinitions.map(item => itemInputs[item.id]?.qty || 0);
    const completeSets = Math.min(...quantities);
    const pointsGenerated = completeSets * 10;

    let totalPurchaseCost = 0;
    let costOfCompleteSets = 0;
    let leftoverValue = 0;
    let totalUnitsBought = 0;
    let totalLeftoverUnits = 0;

    const rows = activeDefinitions.map(item => {
      const input = itemInputs[item.id] || { qty: 0, price: item.typicalBazaarPrice };
      const qty = Number(input.qty || 0);
      const price = Number(input.price || 0);
      const subtotal = qty * price;

      const usedInSets = Math.min(qty, completeSets);
      const leftover = Math.max(0, qty - completeSets);
      const itemCostForSets = usedInSets * price;
      const itemLeftoverValue = leftover * price;

      const isBottleneck = completeSets > 0 ? (qty === completeSets) : (qty === 0);

      totalPurchaseCost += subtotal;
      costOfCompleteSets += itemCostForSets;
      leftoverValue += itemLeftoverValue;
      totalUnitsBought += qty;
      totalLeftoverUnits += leftover;

      return {
        ...item,
        qty,
        price,
        subtotal,
        usedInSets,
        leftover,
        itemCostForSets,
        itemLeftoverValue,
        isBottleneck
      };
    });

    const grossPointsRevenue = pointsGenerated * sellingPricePerPoint;
    
    // Net profit on converted points vs their exact cost
    const convertedPointsNetProfit = grossPointsRevenue - costOfCompleteSets;

    // Total deal profit considering points revenue + leftover inventory value - total purchase cost
    const totalDealNetProfit = (grossPointsRevenue + leftoverValue) - totalPurchaseCost;

    // Immediate cash profit (Points revenue - cash paid for all items)
    const immediateCashProfit = grossPointsRevenue - totalPurchaseCost;

    const breakevenPerPoint = pointsGenerated > 0 ? (costOfCompleteSets / pointsGenerated) : 0;
    const overallDealBreakevenPerPoint = pointsGenerated > 0 ? (totalPurchaseCost / pointsGenerated) : 0;

    const roiPct = totalPurchaseCost > 0 ? ((totalDealNetProfit / totalPurchaseCost) * 100) : 0;
    const profitPerSet = completeSets > 0 ? Math.round(totalDealNetProfit / completeSets) : 0;
    const costPerSet = completeSets > 0 ? Math.round(costOfCompleteSets / completeSets) : 0;

    return {
      completeSets,
      pointsGenerated,
      rows,
      totalUnitsBought,
      totalLeftoverUnits,
      totalPurchaseCost,
      costOfCompleteSets,
      leftoverValue,
      costPerSet,
      grossPointsRevenue,
      convertedPointsNetProfit,
      totalDealNetProfit,
      immediateCashProfit,
      breakevenPerPoint,
      overallDealBreakevenPerPoint,
      roiPct,
      profitPerSet
    };
  }, [activeDefinitions, itemInputs, sellingPricePerPoint]);

  const formatMoney = (val) => '$' + Number(val || 0).toLocaleString();

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* 1. Header & Live Points Market Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Custom Listing & Seller Quote Calculator
              </h2>
              <p className="text-xs text-slate-400">
                Type in seller prices and item quantities to evaluate complete sets, leftover value, and exact profit.
              </p>
            </div>
          </div>
        </div>

        {/* Live Torn Points Market Telemetry Pill */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex items-center justify-between sm:justify-end gap-3 shadow-inner">
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Live Points Market (Torn)
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-slate-400">Lowest:</span>
              <strong className="text-emerald-400 font-extrabold text-sm">
                ${marketData?.lowestListing ? marketData.lowestListing.toLocaleString() : '31,600'}
              </strong>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-400">Avg Top 10:</span>
              <strong className="text-teal-300 font-bold text-xs">
                ${marketData?.averageTop10 ? marketData.averageTop10.toLocaleString() : '31,718'}
              </strong>
            </div>
          </div>

          <button
            onClick={fetchMarketAndVault}
            disabled={marketLoading}
            title="Refresh live points market prices"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${marketLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Controls & Fast Quick-Fill Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Set Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Set Type:</span>
            <button
              onClick={() => setSetType('flower')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                setType === 'flower'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>🌸</span>
              <span>11 Flowers Set</span>
            </button>
            <button
              onClick={() => setSetType('plushie')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                setType === 'plushie'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>🧸</span>
              <span>13 Plushie Set</span>
            </button>
          </div>

          {/* Point Sale Price Setting */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Point Sale Price:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono text-xs">$</span>
              <input
                type="number"
                value={sellingPricePerPoint}
                onChange={(e) => setSellingPricePerPoint(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-28 bg-slate-900 border border-slate-700 rounded-xl pl-6 pr-2 py-1 text-white font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={() => setSellingPricePerPoint((marketData?.lowestListing || 31600) - 20)}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2 py-1 rounded-lg border border-slate-700"
              title="Undercut live lowest market price by $20"
            >
              Undercut (-$20)
            </button>
          </div>

        </div>

        {/* Quick Bulk Action Buttons */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Quick Quantity Fills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mr-1">
              Quick Set All Qty:
            </span>
            {[10, 18, 20, 25, 50, 100].map(q => (
              <button
                key={q}
                onClick={() => handleSetAllQty(q)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono font-bold text-xs px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
              >
                {q}x
              </button>
            ))}
            <button
              onClick={handleResetToZero}
              className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 font-bold text-xs px-2.5 py-1 rounded-xl border border-slate-800 transition-all"
            >
              Clear (0)
            </button>
            <button
              onClick={handleLoadVaultStock}
              className="flex items-center gap-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 font-bold text-xs px-3 py-1 rounded-xl border border-blue-500/30 transition-all"
              title="Load your current real vault leftovers"
            >
              <Boxes className="h-3 w-3" />
              <span>Load My Vault Stock</span>
            </button>
          </div>

          {/* Quick Price Fills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mr-1">
              Quick Price Fills:
            </span>
            <button
              onClick={handleApplyBazaarPrices}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-purple-300 font-medium text-xs px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
            >
              <ShoppingBag className="h-3 w-3 text-purple-400" />
              <span>Typical Bazaar Prices</span>
            </button>
            <button
              onClick={handleApplyAbroadPrices}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
            >
              <PlaneTakeoff className="h-3 w-3 text-blue-400" />
              <span>Foreign Store Base</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. Deal Overview & Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Deal Purchase Cost */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Purchase Cost
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {formatMoney(analysis.totalPurchaseCost)}
          </div>
          <p className="text-[10px] text-slate-400">
            For {analysis.totalUnitsBought} items ({analysis.completeSets} complete sets)
          </p>
        </div>

        {/* Card 2: Complete Sets & Breakeven */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
            Complete Sets Yield
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
            {analysis.completeSets} Sets <span className="text-xs font-normal text-slate-400">({analysis.pointsGenerated} pts)</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Breakeven: <strong className="text-amber-400 font-mono">${analysis.breakevenPerPoint.toFixed(2)}/pt</strong>
          </p>
        </div>

        {/* Card 3: Gross Points Sales Revenue */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
            Projected Points Revenue
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-300">
            {formatMoney(analysis.grossPointsRevenue)}
          </div>
          <p className="text-[10px] text-slate-400">
            Leftover items value: <strong className="text-slate-300 font-mono">{formatMoney(analysis.leftoverValue)}</strong>
          </p>
        </div>

        {/* Card 4: Net Profit & ROI */}
        <div className={`glass-panel rounded-2xl p-4 border space-y-1 shadow-lg ${
          analysis.totalDealNetProfit >= 0
            ? 'border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/30'
            : 'border-rose-500/40 bg-rose-950/20 shadow-rose-950/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider block text-emerald-400">
              Net Deal Profit
            </span>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              analysis.roiPct >= 0 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}>
              {analysis.roiPct >= 0 ? `+${analysis.roiPct.toFixed(1)}%` : `${analysis.roiPct.toFixed(1)}%`} ROI
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${
            analysis.totalDealNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {analysis.totalDealNetProfit >= 0 ? `+${formatMoney(analysis.totalDealNetProfit)}` : formatMoney(analysis.totalDealNetProfit)}
          </div>
          <p className="text-[10px] text-slate-300">
            Profit per set: <strong className="font-mono text-white">+{formatMoney(analysis.profitPerSet)}</strong>
          </p>
        </div>

      </div>

      {/* 4. Verdict & Earnings Summary Banner */}
      <div className={`rounded-3xl p-5 border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
        analysis.totalDealNetProfit >= 0
          ? 'bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border-emerald-500/30'
          : 'bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border-rose-500/30'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl shrink-0 border ${
            analysis.totalDealNetProfit >= 0
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
          }`}>
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
              <span>Deal Verdict:</span>
              <span className={`font-mono font-black ${
                analysis.totalDealNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {analysis.totalDealNetProfit >= 0 ? `+${formatMoney(analysis.totalDealNetProfit)} Pure Profit` : `${formatMoney(analysis.totalDealNetProfit)} Loss`}
              </span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
              {analysis.completeSets > 0 ? (
                <>
                  Buying these items yields <strong className="text-emerald-400 font-mono">{analysis.completeSets} complete sets ({analysis.pointsGenerated} points)</strong>. Points sell for <strong className="text-white font-mono">{formatMoney(analysis.grossPointsRevenue)}</strong> on the Points Market.
                  {analysis.totalLeftoverUnits > 0 && (
                    <> Plus you keep <strong className="text-blue-300 font-mono">{analysis.totalLeftoverUnits} surplus items</strong> valued at <strong className="text-blue-300 font-mono">{formatMoney(analysis.leftoverValue)}</strong> for future sets!</>
                  )}
                </>
              ) : (
                <span className="text-amber-300 font-medium">
                  Enter at least 1 unit of each item in the set below to calculate complete set conversions.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-center shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Point Market Spread
          </span>
          <span className="text-base font-black font-mono text-emerald-400">
            ${sellingPricePerPoint.toLocaleString()}
            <span className="text-xs text-slate-500 font-normal"> / pt</span>
          </span>
        </div>
      </div>

      {/* 5. The Core Interactive Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60">
          <div>
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-400" />
              <span>Item-by-Item Price & Quantity Listing Table</span>
            </h3>
            <p className="text-xs text-slate-400">
              Type the exact quantity and price for each item. The calculator instantly derives complete sets, leftovers, and profit.
            </p>
          </div>

          <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            Cost per Complete Set: <strong className="text-slate-200">{formatMoney(analysis.costPerSet)}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-3 px-4">Item & Origin</th>
                <th className="py-3 px-4 text-center">Qty to Buy / Eval</th>
                <th className="py-3 px-4">Seller Unit Price ($)</th>
                <th className="py-3 px-4 text-right">Subtotal Cost</th>
                <th className="py-3 px-4 text-center">Used in Sets</th>
                <th className="py-3 px-4 text-center">Leftovers</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {analysis.rows.map((row) => {
                return (
                  <tr 
                    key={row.id} 
                    className={`transition-colors ${
                      row.isBottleneck && analysis.completeSets > 0
                        ? 'bg-amber-950/15 hover:bg-amber-950/25'
                        : row.qty === 0
                        ? 'bg-rose-950/10 hover:bg-rose-950/20'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {/* 1. Item Name & Country */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{row.flag}</span>
                        <div>
                          <div className="font-extrabold text-white text-xs">{row.name}</div>
                          <div className="text-[10px] text-slate-400">{row.country}</div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Quantity Input */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={row.qty}
                        onChange={(e) => handleQtyChange(row.id, e.target.value)}
                        className="w-20 text-center bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-2 py-1.5 text-white font-mono font-bold text-xs focus:outline-none"
                      />
                    </td>

                    {/* 3. Unit Price Input */}
                    <td className="py-3.5 px-4">
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-500 font-mono text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          value={row.price}
                          onChange={(e) => handlePriceChange(row.id, e.target.value)}
                          className="w-28 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl pl-6 pr-2 py-1.5 text-white font-mono font-bold text-xs focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* 4. Subtotal Cost */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-xs">
                      {formatMoney(row.subtotal)}
                    </td>

                    {/* 5. Used in Complete Sets */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      {row.usedInSets > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          {row.usedInSets}x
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 6. Leftovers */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      {row.leftover > 0 ? (
                        <span className="text-blue-300 font-bold bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/30 text-[11px]">
                          +{row.leftover} left
                        </span>
                      ) : (
                        <span className="text-slate-600 font-normal">0</span>
                      )}
                    </td>

                    {/* 7. Status / Bottleneck Indicator */}
                    <td className="py-3.5 px-4 text-right">
                      {row.qty === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                          <AlertCircle className="h-3 w-3" />
                          <span>0 (Missing)</span>
                        </span>
                      ) : row.isBottleneck && analysis.completeSets > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          <span>Bottleneck ({row.qty})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Ready</span>
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 font-mono font-bold border-t border-slate-700 text-slate-200">
                <td className="py-3.5 px-4">
                  Totals ({analysis.completeSets} Sets = {analysis.pointsGenerated} Points)
                </td>
                <td className="py-3.5 px-4 text-center text-xs text-slate-300">
                  {analysis.totalUnitsBought} items
                </td>
                <td className="py-3.5 px-4 text-xs text-slate-400">
                  Avg: {formatMoney(analysis.totalUnitsBought > 0 ? Math.round(analysis.totalPurchaseCost / analysis.totalUnitsBought) : 0)} / item
                </td>
                <td className="py-3.5 px-4 text-right text-sm font-black text-emerald-400">
                  {formatMoney(analysis.totalPurchaseCost)}
                </td>
                <td className="py-3.5 px-4 text-center text-xs text-emerald-300">
                  {analysis.completeSets * (setType === 'flower' ? 11 : 13)} used
                </td>
                <td className="py-3.5 px-4 text-center text-xs text-blue-300">
                  +{analysis.totalLeftoverUnits} leftover
                </td>
                <td className="py-3.5 px-4 text-right text-xs text-emerald-400">
                  Net: {formatMoney(analysis.totalDealNetProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
