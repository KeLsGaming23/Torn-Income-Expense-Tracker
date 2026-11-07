import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Coins, 
  ShieldCheck, 
  Sliders, 
  Package, 
  ExternalLink, 
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Tag,
  AlertCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getItemsCatalog, 
  syncItemsCatalog, 
  getLiveItemMarket, 
  calculateTradeOffer, 
  getPlayerInventoryItems 
} from '../api';
import { useTornData } from '../context/TornDataContext';

export default function ItemTradeHub({ setActiveTab }) {
  const { showToast, commandData } = useTornData();
  const readyPlushies = commandData?.setsReady?.plushie || 0;
  const readyFlowers = commandData?.setsReady?.flower || 0;

  // Active Sub-Tab: 'pricer' | 'bazaar' | 'catalog'
  const [activeSubTab, setActiveSubTab] = useState('pricer');

  // =========================================================================
  // SUB-TAB 1: TRADE BUY PRICER STATE
  // =========================================================================
  const [pricerSearch, setPricerSearch] = useState('');
  const [pricerCatalogResults, setPricerCatalogResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [liveMarket, setLiveMarket] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [buyPercent, setBuyPercent] = useState(90);
  const [quantity, setQuantity] = useState(1);
  const [customPriceInput, setCustomPriceInput] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Quick Pick Popular Trade Items
  const popularTradeItems = [
    { id: 206, name: 'Xanax', type: 'Drug' },
    { id: 366, name: 'Feathery Hotel Coupon', type: 'Booster' },
    { id: 367, name: 'Can of Munster', type: 'Energy Drink' },
    { id: 383, name: 'Erotic DVD', type: 'Booster' },
    { id: 281, name: 'Lion Plushie', type: 'Plushie' },
    { id: 384, name: 'Camel Plushie', type: 'Plushie' },
    { id: 260, name: 'Dahlia', type: 'Flower' },
    { id: 264, name: 'Orchid', type: 'Flower' }
  ];

  // Search catalog for trade pricer autocomplete
  useEffect(() => {
    if (!pricerSearch || pricerSearch.trim().length < 2) {
      setPricerCatalogResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await getItemsCatalog({ query: pricerSearch.trim(), limit: 12, tradeableOnly: true });
        if (res.success) {
          setPricerCatalogResults(res.items || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pricerSearch]);

  // When an item is selected for the Trade Pricer, fetch live market listings
  const handleSelectItemForPricer = async (item) => {
    setSelectedItem(item);
    setPricerSearch('');
    setPricerCatalogResults([]);
    try {
      setMarketLoading(true);
      const res = await getLiveItemMarket(item.item_id || item.id);
      if (res.success) {
        setLiveMarket(res);
        setCustomPriceInput(res.lowestPrice || item.market_value || 0);
      } else {
        setLiveMarket({
          itemId: item.item_id || item.id,
          itemName: item.name,
          averagePrice: item.market_value || 0,
          lowestPrice: item.market_value || 0,
          topListings: []
        });
        setCustomPriceInput(item.market_value || 0);
      }
    } catch (err) {
      console.error(err);
      setLiveMarket({
        itemId: item.item_id || item.id,
        itemName: item.name,
        averagePrice: item.market_value || 0,
        lowestPrice: item.market_value || 0,
        topListings: []
      });
      setCustomPriceInput(item.market_value || 0);
    } finally {
      setMarketLoading(false);
    }
  };

  // Default to Xanax on initial load
  useEffect(() => {
    if (!selectedItem) {
      handleSelectItemForPricer({ item_id: 206, name: 'Xanax', market_value: 859850, item_type: 'Drug' });
    }
  }, []);

  // Trade calculations
  const activeMarketPrice = Number(customPriceInput || liveMarket?.lowestPrice || selectedItem?.market_value || 0);
  const tradeCalculation = useMemo(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const percent = Number(buyPercent || 90);
    const unitOffer = Math.round(activeMarketPrice * (percent / 100));
    const totalPayout = unitOffer * qty;
    const totalMarketVal = activeMarketPrice * qty;
    const flipProfit = totalMarketVal - totalPayout;
    const marginPct = totalPayout > 0 ? (flipProfit / totalPayout) * 100 : 0;
    return {
      qty,
      percent,
      unitOffer,
      totalPayout,
      totalMarketVal,
      flipProfit,
      marginPct
    };
  }, [activeMarketPrice, buyPercent, quantity]);

  // Copy trade receipt to clipboard
  const handleCopyReceipt = () => {
    if (!selectedItem) return;
    const receipt = `[Torn Trade Receipt]\nItem: ${tradeCalculation.qty}x ${selectedItem.name}\nMarket Value: $${activeMarketPrice.toLocaleString()} ($${tradeCalculation.totalMarketVal.toLocaleString()} total)\nBuy Offer (${tradeCalculation.percent}%): $${tradeCalculation.unitOffer.toLocaleString()}/ea\nTotal Cash Payout: $${tradeCalculation.totalPayout.toLocaleString()}`;
    navigator.clipboard.writeText(receipt);
    setCopiedReceipt(true);
    showToast('success', 'Trade receipt copied to clipboard!');
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  // =========================================================================
  // SUB-TAB 2: INVENTORY & BAZAAR OPTIMIZER STATE
  // =========================================================================
  const [inventoryData, setInventoryData] = useState(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invCategoryFilter, setInvCategoryFilter] = useState('all');
  const [invSearch, setInvSearch] = useState('');
  const [pricingMarkup, setPricingMarkup] = useState(2); // 0 (Market Value) | 2 | 3 | 4 | 5 | 6 | 7% profit markup
  const [invSortField, setInvSortField] = useState('profit'); // 'name' | 'stock' | 'cost' | 'market' | 'bazaarPrice' | 'profit'
  const [invSortOrder, setInvSortOrder] = useState('desc'); // 'asc' | 'desc'

  const calculateItemBazaarPrice = (marketValue, markupPct) => {
    const base = Number(marketValue || 0);
    if (!markupPct || markupPct <= 0) return base;
    return Math.round(base * (1 + markupPct / 100));
  };

  const [expandedItemBatches, setExpandedItemBatches] = useState(new Set());

  const toggleExpandBatches = (itemId) => {
    setExpandedItemBatches(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleInvSort = (field) => {
    if (invSortField === field) {
      setInvSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInvSortField(field);
      setInvSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const renderInvSortIcon = (field) => {
    if (invSortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />;
    }
    return invSortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-emerald-400 shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-400 shrink-0" />
    );
  };

  const fetchInventory = async (force = false) => {
    try {
      setInvLoading(true);
      const res = await getPlayerInventoryItems({ force });
      if (res.success) {
        setInventoryData(res);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load user inventory');
    } finally {
      setInvLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'bazaar' && !inventoryData) {
      fetchInventory(false);
    }
  }, [activeSubTab]);

  // Filter and sort inventory items
  const filteredInventoryItems = useMemo(() => {
    if (!inventoryData?.items) return [];
    const filtered = inventoryData.items.filter(item => {
      let matchesCat = false;
      if (invCategoryFilter === 'all') {
        matchesCat = true;
      } else if (invCategoryFilter === 'surplus') {
        const isPlushie = item.itemType?.toLowerCase() === 'plushie';
        const isFlower = item.itemType?.toLowerCase() === 'flower';
        matchesCat = (isPlushie && (item.amount || 0) > readyPlushies) || (isFlower && (item.amount || 0) > readyFlowers);
      } else {
        matchesCat = item.itemType?.toLowerCase() === invCategoryFilter.toLowerCase();
      }
      const matchesSearch = !invSearch || item.name.toLowerCase().includes(invSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (invSortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (invSortField === 'stock') {
        comparison = (a.amount || 0) - (b.amount || 0);
      } else if (invSortField === 'cost') {
        comparison = (a.unitCost || 0) - (b.unitCost || 0);
      } else if (invSortField === 'market') {
        comparison = (a.marketValue || 0) - (b.marketValue || 0);
      } else if (invSortField === 'bazaarPrice') {
        const priceA = calculateItemBazaarPrice(a.marketValue, pricingMarkup);
        const priceB = calculateItemBazaarPrice(b.marketValue, pricingMarkup);
        comparison = priceA - priceB;
      } else if (invSortField === 'profit') {
        const priceA = calculateItemBazaarPrice(a.marketValue, pricingMarkup);
        const profitA = ((a.amount || 0) * priceA) - (a.totalItemCost || 0);

        const priceB = calculateItemBazaarPrice(b.marketValue, pricingMarkup);
        const profitB = ((b.amount || 0) * priceB) - (b.totalItemCost || 0);

        comparison = profitA - profitB;
      }

      return invSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [inventoryData, invCategoryFilter, invSearch, invSortField, invSortOrder, pricingMarkup]);

  // Calculate dynamic totals based on chosen pricing markup (Market Base or +2% to +7%)
  const inventoryTotals = useMemo(() => {
    if (!filteredInventoryItems.length) return { revenue: 0, cost: 0, profit: 0, roi: 0 };
    let rev = 0;
    let cost = 0;
    filteredInventoryItems.forEach(item => {
      const price = calculateItemBazaarPrice(item.marketValue, pricingMarkup);
      rev += (item.amount || 0) * price;
      cost += (item.totalItemCost || 0);
    });
    return {
      revenue: rev,
      cost,
      profit: rev - cost,
      roi: cost > 0 ? ((rev - cost) / cost) * 100 : (rev > 0 ? 100 : 0)
    };
  }, [filteredInventoryItems, pricingMarkup]);

  // =========================================================================
  // SUB-TAB 3: MASTER ITEM CATALOG BROWSER STATE
  // =========================================================================
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogType, setCatalogType] = useState('all');
  const [catalogTradeableOnly, setCatalogTradeableOnly] = useState(true);
  const [catalogSortBy, setCatalogSortBy] = useState('market_value');
  const [catalogSortDir, setCatalogSortDir] = useState('DESC');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [catalogPage, setCatalogPage] = useState(0);
  const pageSize = 48;

  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true);
      const res = await getItemsCatalog({
        query: catalogSearch,
        type: catalogType !== 'all' ? catalogType : undefined,
        sortBy: catalogSortBy,
        sortDir: catalogSortDir,
        tradeableOnly: catalogTradeableOnly ? true : undefined,
        limit: pageSize,
        offset: catalogPage * pageSize
      });
      if (res.success) {
        setCatalogItems(res.items || []);
        setCatalogTotal(res.total || 0);
        if (res.availableTypes) setAvailableTypes(res.availableTypes);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load master item catalog');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSyncCatalog = async () => {
    try {
      setSyncingCatalog(true);
      showToast('info', 'Syncing master items catalog from Torn API...');
      const res = await syncItemsCatalog();
      if (res.success) {
        showToast('success', `Master catalog synced successfully! (${res.count || 0} items)`);
        await fetchCatalog();
      } else {
        showToast('error', res.message || 'Catalog sync failed');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to sync catalog');
    } finally {
      setSyncingCatalog(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeSubTab, catalogType, catalogSortBy, catalogSortDir, catalogPage, catalogTradeableOnly]);

  // Debounce catalog search
  useEffect(() => {
    if (activeSubTab !== 'catalog') return;
    const timer = setTimeout(() => {
      setCatalogPage(0);
      fetchCatalog();
    }, 300);
    return () => clearTimeout(timer);
  }, [catalogSearch]);

  const formatMoney = (val) => '$' + Number(val || 0).toLocaleString();

  return (
    <div className="space-y-6">

      {/* 1. HEADER & SUB-NAVIGATION BAR */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                <Package className="h-6 w-6 text-emerald-400" />
                <span>Item Market & Trade Hub</span>
              </h2>
              <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Oct 1 Cutoff Active</span>
              </span>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1" title="Equipped combat loadout, faction armory loans, and untradeable items like books are hidden from trade/bazaar lists">
                <ShieldCheck className="h-3 w-3" />
                <span>Equipped & Untradeable Excluded</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live Trade Pricer (90% Buy Offer), Bazaar Profit Optimizer, and Full 1,500+ Master Item Catalog
            </p>
          </div>

          {/* Quick Metrics Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Cutoff Rule</span>
              <span className="text-emerald-400 font-mono font-black">Pre-Oct 1 = $0 Cost Basis</span>
            </div>
          </div>
        </div>

        {/* 3 Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('pricer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'pricer'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Trade Buy Pricer (90% Offer)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bazaar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'bazaar'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>My Inventory & Bazaar Optimizer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'catalog'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Master Item Browser (1,500+)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TRADE BUY PRICER & FLIP MARGIN CALCULATOR */}
      {/* ========================================================================= */}
      {activeSubTab === 'pricer' && (
        <div className="space-y-6">
          {/* Item Selector & Autocomplete Bar */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  <span>Select Item to Value for Trade:</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Search any item in Torn or click a popular trade asset below
                </p>
              </div>

              {/* Autocomplete Input */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item name (e.g. Xanax, FHC)..."
                  value={pricerSearch}
                  onChange={(e) => setPricerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                {/* Dropdown Results */}
                {pricerCatalogResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-800">
                    {pricerCatalogResults.map((item) => (
                      <div
                        key={item.item_id}
                        onClick={() => handleSelectItemForPricer(item)}
                        className="p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <img src={item.image_url} alt="" className="h-6 w-6 object-contain" />
                          <div>
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-[10px] text-slate-400">{item.item_type}</div>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">${Number(item.market_value).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Pick Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap">Quick Picks:</span>
              {popularTradeItems.map((pop) => (
                <button
                  key={pop.id}
                  onClick={() => handleSelectItemForPricer({ item_id: pop.id, name: pop.name, item_type: pop.type })}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                    selectedItem?.item_id === pop.id || selectedItem?.id === pop.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  {pop.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Calculation & Live Pricing Matrix */}
          {selectedItem && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Item Profile & Config */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 shrink-0">
                    <img 
                      src={selectedItem.image_url || `https://www.torn.com/images/items/${selectedItem.item_id || selectedItem.id}/large.png`} 
                      alt="" 
                      className="h-full w-full object-contain" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      {selectedItem.item_type || selectedItem.category || 'Item'}
                    </span>
                    <h3 className="text-lg font-black text-white">{selectedItem.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">Market Value:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ${Number(selectedItem.market_value || liveMarket?.averagePrice || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lowest Live Listing Indicator */}
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Lowest Active Listing:</span>
                    <span className="font-mono font-bold text-sky-400">
                      ${Number(liveMarket?.lowestPrice || activeMarketPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Market Average:</span>
                    <span className="font-mono font-bold text-slate-300">
                      ${Number(liveMarket?.averagePrice || selectedItem.market_value || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Discount Percentage Preset Strip */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex justify-between items-center">
                    <span>Trader Buy Rate:</span>
                    <span className="text-emerald-400 font-mono text-sm font-extrabold">{buyPercent}% of Market</span>
                  </label>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[85, 88, 90, 92, 95].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setBuyPercent(pct)}
                        className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                          buyPercent === pct
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="75"
                    max="99"
                    value={buyPercent}
                    onChange={(e) => setBuyPercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Quantity Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Quantity to Buy:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm w-full focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => setQuantity(10)}
                      className="bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 px-3 py-2 rounded-xl border border-slate-800"
                    >
                      10x
                    </button>
                    <button
                      onClick={() => setQuantity(50)}
                      className="bg-slate-900 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 px-3 py-2 rounded-xl border border-slate-800"
                    >
                      50x
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Columns: Financial Ledger & Copyable Receipt */}
              <div className="lg:col-span-2 space-y-6">

                {/* 4-Metric High Contrast Output Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Buy Offer / Unit</span>
                    <span className="text-lg font-black font-mono text-emerald-400 block">${tradeCalculation.unitOffer.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">{buyPercent}% of ${activeMarketPrice.toLocaleString()}</span>
                  </div>

                  <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Payout</span>
                    <span className="text-lg font-black font-mono text-white block">${tradeCalculation.totalPayout.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">To seller ({tradeCalculation.qty} units)</span>
                  </div>

                  <div className="glass-panel rounded-2xl p-4 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Market Value</span>
                    <span className="text-lg font-black font-mono text-sky-400 block">${tradeCalculation.totalMarketVal.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">Total bazaar value</span>
                  </div>

                  <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/15">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Projected Flip Profit</span>
                    <span className="text-lg font-black font-mono text-emerald-300 block">+${tradeCalculation.flipProfit.toLocaleString()}</span>
                    <span className="text-[10px] text-teal-300 font-mono">+{(tradeCalculation?.marginPct || 0).toFixed(1)}% Margin</span>
                  </div>
                </div>

                {/* Equation Card */}
                <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>Flip Profit Equation Breakdown</span>
                  </span>

                  <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Resale Value:</span>
                      <strong className="text-white">${tradeCalculation.totalMarketVal.toLocaleString()}</strong>
                    </div>
                    <span>−</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Trade Cost ({buyPercent}%):</span>
                      <strong className="text-amber-400">${tradeCalculation.totalPayout.toLocaleString()}</strong>
                    </div>
                    <span>=</span>
                    <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-xl">
                      <span className="text-slate-400">Net Flip Gain:</span>
                      <strong className="text-emerald-300 text-sm font-black">+${tradeCalculation.flipProfit.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Copyable Trade Receipt Box */}
                <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">Copyable Trade Receipt</h4>
                      <p className="text-xs text-slate-400">Paste directly into Torn trade chat or discord</p>
                    </div>

                    <button
                      onClick={handleCopyReceipt}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      {copiedReceipt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedReceipt ? 'Copied!' : 'Copy Receipt'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-line select-all">
                    {`[Torn Trade Receipt]
Item: ${tradeCalculation.qty}x ${selectedItem.name}
Market Value: $${activeMarketPrice.toLocaleString()} ($${tradeCalculation.totalMarketVal.toLocaleString()} total)
Buy Offer (${tradeCalculation.percent}%): $${tradeCalculation.unitOffer.toLocaleString()}/ea
Total Cash Payout: $${tradeCalculation.totalPayout.toLocaleString()}`}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INVENTORY & BAZAAR SELLING OPTIMIZER */}
      {/* ========================================================================= */}
      {activeSubTab === 'bazaar' && (
        <div className="space-y-6">

          {/* Top Inventory Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-3xl p-5 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Items in Inventory</span>
              <span className="text-2xl font-black font-mono text-white block">
                {inventoryTotals ? filteredInventoryItems.length : 0} <span className="text-xs text-slate-400 font-sans font-normal">unique assets</span>
              </span>
              <span className="text-[10px] text-slate-500">Across active filters</span>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Market Value</span>
              <span className="text-2xl font-black font-mono text-sky-400 block">
                {formatMoney(inventoryTotals.revenue)}
              </span>
              <span className="text-[10px] text-slate-500">At live bazaar price</span>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Acquisition Cost</span>
              <span className="text-2xl font-black font-mono text-amber-400 block">
                {formatMoney(inventoryTotals.cost)}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Pre-Oct 1 & Crime = $0</span>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-500/30 bg-emerald-950/15">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Projected Net Profit</span>
              <span className="text-2xl font-black font-mono text-emerald-400 block">
                +{formatMoney(inventoryTotals.profit)}
              </span>
              <span className="text-[10px] text-teal-300 font-mono">+{(inventoryTotals?.roi || 0).toFixed(1)}% Net ROI</span>
            </div>
          </div>

          {/* Pricing Strategy Selector & Controls Bar */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-sm">Suggested Bazaar Pricing Strategy</h4>
                <p className="text-xs text-slate-400">Select market baseline or profit markup (+2% to +7%) to maximize income</p>
              </div>

              {/* Pricing Strategy Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setPricingMarkup(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    pricingMarkup === 0 
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Market Value (0%)
                </button>
                {[2, 3, 4, 5, 6, 7].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setPricingMarkup(pct)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      pricingMarkup === pct 
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Filter & Search Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter inventory items..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={() => fetchInventory(true)}
                  disabled={invLoading}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-800 shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${invLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
                {['all', 'surplus', 'Drug', 'Supply Pack', 'Temporary', 'Melee', 'Primary', 'Secondary', 'Defensive', 'Plushie', 'Flower', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInvCategoryFilter(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                      invCategoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-900'
                    }`}
                  >
                    {cat === 'all' ? 'All Items' : cat === 'surplus' ? '📦 Surplus Leftovers' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    {/* Item & Origin */}
                    <th 
                      onClick={() => handleInvSort('name')}
                      className={`py-3.5 px-4 font-bold cursor-pointer select-none transition-colors group ${
                        invSortField === 'name' ? 'text-emerald-400 bg-slate-800/50' : 'hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                      title="Sort alphabetically by Item Name (A-Z / Z-A)"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Item & Origin</span>
                        {renderInvSortIcon('name')}
                      </div>
                    </th>

                    {/* Stock */}
                    <th 
                      onClick={() => handleInvSort('stock')}
                      className={`py-3.5 px-3 font-bold text-center cursor-pointer select-none transition-colors group ${
                        invSortField === 'stock' ? 'text-emerald-400 bg-slate-800/50' : 'hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                      title="Sort by Stock Quantity (High to Low / Low to High)"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Stock</span>
                        {renderInvSortIcon('stock')}
                      </div>
                    </th>

                    {/* Cost Basis */}
                    <th 
                      onClick={() => handleInvSort('cost')}
                      className={`py-3.5 px-3 font-bold text-right cursor-pointer select-none transition-colors group ${
                        invSortField === 'cost' ? 'text-emerald-400 bg-slate-800/50' : 'hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                      title="Sort by Cost Basis (High to Low / Low to High)"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Cost Basis</span>
                        {renderInvSortIcon('cost')}
                      </div>
                    </th>

                    {/* Market Price */}
                    <th 
                      onClick={() => handleInvSort('market')}
                      className={`py-3.5 px-4 font-bold text-right cursor-pointer select-none transition-colors group ${
                        invSortField === 'market' ? 'text-emerald-400 bg-slate-800/50' : 'hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                      title="Sort by Market Price (High to Low / Low to High)"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Market Price</span>
                        {renderInvSortIcon('market')}
                      </div>
                    </th>

                    {/* Suggested Bazaar Price */}
                    <th 
                      onClick={() => handleInvSort('bazaarPrice')}
                      className={`py-3.5 px-4 font-bold text-right cursor-pointer select-none transition-colors group ${
                        invSortField === 'bazaarPrice' ? 'text-emerald-400 bg-slate-800/50' : 'hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                      title="Sort by Suggested Bazaar Price (High to Low / Low to High)"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Suggested Bazaar Price</span>
                        {renderInvSortIcon('bazaarPrice')}
                      </div>
                    </th>

                    {/* Total Projected Profit */}
                    <th 
                      onClick={() => handleInvSort('profit')}
                      className={`py-3.5 px-4 font-bold text-right cursor-pointer select-none transition-colors group ${
                        invSortField === 'profit' ? 'text-emerald-400 bg-slate-800/50' : 'hover:text-slate-200 hover:bg-slate-800/20'
                      }`}
                      title="Sort by Total Projected Profit (High to Low / Low to High)"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Total Projected Profit</span>
                        {renderInvSortIcon('profit')}
                      </div>
                    </th>

                    {/* Action */}
                    <th className="py-3.5 px-3 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {invLoading && filteredInventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-400 mb-2" />
                        <span>Loading live player inventory...</span>
                      </td>
                    </tr>
                  ) : filteredInventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        No items found matching the selected category filter.
                      </td>
                    </tr>
                  ) : (
                    filteredInventoryItems.map((item) => {
                      const sellingPrice = calculateItemBazaarPrice(item.marketValue, pricingMarkup);
                      const itemRev = (item.amount || 0) * sellingPrice;
                      const itemCost = Number(item.totalItemCost || 0);
                      const itemNet = itemRev - itemCost;
                      const itemRoi = itemCost > 0 ? (itemNet / itemCost) * 100 : 100;
                      const batchCount = item.batches?.length || 0;
                      const isExpanded = expandedItemBatches.has(item.id);
                      const isPlushie = item.itemType?.toLowerCase() === 'plushie';
                      const isFlower = item.itemType?.toLowerCase() === 'flower';
                      const surplusCount = isPlushie 
                        ? Math.max(0, (item.amount || 0) - readyPlushies) 
                        : isFlower 
                        ? Math.max(0, (item.amount || 0) - readyFlowers) 
                        : 0;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-900/40 transition-colors">
                            {/* Item & Origin Badge */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img src={item.imageUrl} alt="" className="h-7 w-7 object-contain shrink-0" />
                                <div>
                                  <div className="font-extrabold text-white text-xs">{item.name}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span 
                                      className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-bold ${
                                        item.originSource === 'legacy'
                                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                          : item.originSource === 'crime'
                                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                                          : item.originSource === 'city_find'
                                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                          : item.originSource === 'dump'
                                          ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-500/30'
                                          : item.originSource === 'special'
                                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                                          : item.originSource === 'shop'
                                          ? 'bg-teal-950/60 text-teal-300 border border-teal-500/30'
                                          : item.originSource === 'receive'
                                          ? 'bg-lime-950/60 text-lime-300 border border-lime-500/30'
                                          : item.originSource === 'abroad'
                                          ? 'bg-sky-950/60 text-sky-300 border border-sky-500/30'
                                          : item.originSource === 'trade'
                                          ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                                          : item.originSource === 'bazaar'
                                          ? 'bg-orange-950/60 text-orange-300 border border-orange-500/30'
                                          : item.originSource === 'mixed'
                                          ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
                                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                                      }`}
                                      title={item.batches?.length > 1 ? item.batches.map(b => `${b.qty}x ${b.source} ($${b.unitCost.toLocaleString()})`).join(' + ') : undefined}
                                    >
                                      {item.originBadge}
                                    </span>
                                    {surplusCount > 0 && (
                                      <span 
                                        className="text-[10px] font-mono px-2 py-0.2 rounded-full font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30"
                                        title={`${surplusCount} extra units owned beyond complete sets`}
                                      >
                                        +{surplusCount} Surplus
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500">{item.itemType}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Stock Owned */}
                            <td className="py-3 px-3 text-center">
                              <span className="bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-white font-mono font-bold">
                                {item.amount}x
                              </span>
                            </td>

                            {/* Cost Basis */}
                            <td className="py-3 px-3 text-right font-mono">
                              <div className="flex flex-col items-end gap-1">
                                <div className={item.unitCost === 0 ? 'text-emerald-400 font-bold' : 'text-slate-200 font-bold'}>
                                  ${item.unitCost.toLocaleString()}
                                </div>
                                {item.unitCost === 0 ? (
                                  <span className="text-[9px] text-emerald-500/80 font-bold uppercase">100% Free</span>
                                ) : null}

                                {/* Toggle button for multiple acquisition batches (just like Museum Set Builder) */}
                                {batchCount > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandBatches(item.id);
                                    }}
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                                      isExpanded
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
                                    }`}
                                    title="Click to view all acquisition lots in FIFO order"
                                  >
                                    <span>+{batchCount - 1} more</span>
                                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Market Value */}
                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-300">
                              ${item.marketValue.toLocaleString()}
                            </td>

                            {/* Suggested Bazaar Price */}
                            <td className="py-3 px-4 text-right font-mono">
                              <span className="font-bold text-sky-400 bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-800/40">
                                ${sellingPrice.toLocaleString()}
                              </span>
                              {pricingMarkup > 0 && (
                                <span className="text-[9px] text-sky-400/80 block font-mono mt-0.5">+{pricingMarkup}%</span>
                              )}
                            </td>

                            {/* Projected Profit */}
                            <td className="py-3 px-4 text-right font-mono">
                              <div className="font-black text-emerald-400 text-xs">
                                +${Math.round(itemNet).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-teal-300/80 font-normal">
                                +{Number(itemRoi || 0).toFixed(0)}% ROI
                              </div>
                            </td>

                            {/* Action Button: Load in Trade Pricer */}
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  handleSelectItemForPricer({
                                    item_id: item.id,
                                    name: item.name,
                                    item_type: item.itemType,
                                    market_value: item.marketValue,
                                    image_url: item.imageUrl
                                  });
                                  setQuantity(item.amount);
                                  setActiveSubTab('pricer');
                                }}
                                className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                                title="Value in Trade Pricer"
                              >
                                Price Buy
                              </button>
                            </td>
                          </tr>

                          {/* Expandable FIFO Queue Sub-Row */}
                          {isExpanded && batchCount > 1 && (
                            <tr className="bg-slate-950/80 border-b border-slate-800">
                              <td colSpan="7" className="p-3.5 pl-6 sm:pl-10">
                                <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2.5 shadow-inner">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                      <Layers className="h-3.5 w-3.5 text-blue-400" />
                                      <span>Complete FIFO Queue for {item.name}</span>
                                      <span className="text-slate-400 font-normal">
                                        ({batchCount} individual lots • {item.amount} total units • Blended Avg: ${item.unitCost.toLocaleString()}/ea)
                                      </span>
                                    </span>
                                    <span className="text-slate-400 text-[11px] font-mono">
                                      Consumed in order: Batch #1 → Batch #{batchCount}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
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
                                          <span className="text-slate-200 font-bold">
                                            ${Number(b.unitCost || 0).toLocaleString()}
                                          </span>
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: MASTER ITEM CATALOG BROWSER (ALL 1,500+ ITEMS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">

          {/* Catalog Filter & Controls Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-400" />
                  <span>Master Item Catalog ({catalogTotal} items in database)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Search every item in Torn City with live market value and circulation stats
                </p>
              </div>

              {/* Search & Sync Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by item name or ID..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  onClick={handleSyncCatalog}
                  disabled={syncingCatalog}
                  className="shrink-0 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-400 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold transition-colors"
                  title="Force re-sync catalog from Torn API"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingCatalog ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{syncingCatalog ? 'Syncing...' : 'Sync Catalog'}</span>
                </button>
              </div>
            </div>

            {/* Category Pills & Sorting Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {['all', 'Drug', 'Booster', 'Medical', 'Temporary', 'Melee', 'Primary', 'Secondary', 'Defensive', 'Plushie', 'Flower', 'Energy Drink', 'Special', 'Supply Pack', 'Other'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCatalogType(cat);
                      setCatalogPage(0);
                    }}
                    className={`text-[11px] px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                      catalogType.toLowerCase() === cat.toLowerCase()
                        ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-900'
                    }`}
                  >
                    {cat === 'all' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>

              {/* Sort & Filter Controls */}
              <div className="flex items-center gap-2 shrink-0 text-xs">
                <button
                  onClick={() => {
                    setCatalogTradeableOnly(prev => !prev);
                    setCatalogPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    catalogTradeableOnly 
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Toggle between only tradeable items and all items (including books/collectibles)"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{catalogTradeableOnly ? 'Tradeable Only' : 'All Items'}</span>
                </button>

                <span className="text-slate-400 text-xs ml-1">Sort:</span>
                <select
                  value={catalogSortBy}
                  onChange={(e) => setCatalogSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="market_value">Market Value (High to Low)</option>
                  <option value="circulation">Circulation</option>
                  <option value="name">Item Name</option>
                  <option value="buy_price">Store Buy Price</option>
                </select>
              </div>
            </div>
          </div>

          {/* Item Grid */}
          {catalogLoading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-400 mb-3" />
              <span className="text-xs font-semibold">Loading Torn catalog...</span>
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {catalogSearch ? `No items found matching "${catalogSearch}"` : 'Master Catalog is Empty or Initializing'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Sync all 1,500+ Torn City items directly from the official Torn API to browse items, live prices, and circulation stats.
                </p>
              </div>
              <button
                onClick={handleSyncCatalog}
                disabled={syncingCatalog}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                <RefreshCw className={`h-4 w-4 ${syncingCatalog ? 'animate-spin' : ''}`} />
                <span>{syncingCatalog ? 'Syncing Catalog...' : 'Sync Master Catalog Now'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {catalogItems.map((item) => (
                <div
                  key={item.item_id}
                  className="glass-panel rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-center p-2 shrink-0 group-hover:border-slate-700 transition-colors">
                      <img src={item.image_url} alt="" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block truncate">
                        {item.item_type}
                      </span>
                      <h4 className="font-extrabold text-white text-xs truncate" title={item.name}>
                        {item.name}
                      </h4>
                      <div className="text-[11px] font-mono font-bold text-emerald-400 mt-1">
                        ${Number(item.market_value).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Circ: {Number(item.circulation).toLocaleString()}</span>
                    <button
                      onClick={() => {
                        handleSelectItemForPricer(item);
                        setActiveSubTab('pricer');
                      }}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                      <span>Trade Pricer</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {catalogTotal > pageSize && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCatalogPage(prev => Math.max(0, prev - 1))}
                disabled={catalogPage === 0}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-xs font-bold text-slate-300 px-4 py-2 rounded-xl border border-slate-800"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 font-mono px-3">
                Page {catalogPage + 1} of {Math.ceil(catalogTotal / pageSize)}
              </span>
              <button
                onClick={() => setCatalogPage(prev => Math.min(Math.ceil(catalogTotal / pageSize) - 1, prev + 1))}
                disabled={(catalogPage + 1) * pageSize >= catalogTotal}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-xs font-bold text-slate-300 px-4 py-2 rounded-xl border border-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
