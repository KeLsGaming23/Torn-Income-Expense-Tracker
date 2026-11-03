import axios from 'axios';
import pool from '../config/db.js';
import dotenv from 'dotenv';
import { MasterItemsService } from './masterItemsService.js';

dotenv.config();

export class InventoryService {
  static inventoryCache = { data: null, timestamp: 0 };

  static getApiKey() {
    return process.env.TORN_API_KEY || 'vVZGrKSwrXNtcGKi';
  }

  /**
   * Fetch all user inventory items across all categories from Torn API v2
   * and enrich with master item data, origin tracking, cost basis, and bazaar pricing.
   */
  static async getPlayerInventory({ apiKey = this.getApiKey(), force = false, category = 'all' } = {}) {
    if (!apiKey) {
      throw new Error('TORN_API_KEY is not configured');
    }

    // Check 20-second cache unless forced
    const now = Date.now();
    if (!force && this.inventoryCache.data && (now - this.inventoryCache.timestamp < 20000)) {
      let filtered = this.inventoryCache.data;
      if (category && category !== 'all') {
        filtered = filtered.filter(i => i.itemType?.toLowerCase() === category.toLowerCase());
      }
      return { items: filtered, totalValue: this.inventoryCache.totalValue, totalProfit: this.inventoryCache.totalProfit, cached: true };
    }

    const headers = {
      'Authorization': `ApiKey ${apiKey}`,
      'User-Agent': 'TornLedger/1.0'
    };

    // Categories to scan
    const categoriesToFetch = [
      'Drug', 'Booster', 'Medical', 'Temporary', 'Supply Pack', 
      'Plushie', 'Flower', 'Special', 'Other', 
      'Melee', 'Primary', 'Secondary', 'Defensive', 'Energy Drink', 'Candy', 'Alcohol'
    ];

    console.log('[InventoryService] Polling Torn API v2 for all user inventory categories...');

    const categoryRequests = categoriesToFetch.map(cat => 
      axios.get(`https://api.torn.com/v2/user/inventory?cat=${encodeURIComponent(cat)}&key=${apiKey}`, { headers, timeout: 15000 })
        .then(res => ({ cat, items: res.data?.inventory?.items || [] }))
        .catch(err => {
          console.warn(`[InventoryService] Error fetching category ${cat}:`, err.message);
          return { cat, items: [] };
        })
    );

    const categoryResults = await Promise.all(categoryRequests);

    // Flatten all items and aggregate by item id (for weapons/armors with unique uids)
    const aggregatedItemsMap = new Map();

    for (const { cat, items } of categoryResults) {
      for (const item of items) {
        const id = Number(item.id);
        const amount = Number(item.amount || 1);
        if (aggregatedItemsMap.has(id)) {
          const existing = aggregatedItemsMap.get(id);
          existing.amount += amount;
        } else {
          aggregatedItemsMap.set(id, {
            id,
            name: item.name,
            amount,
            category: cat
          });
        }
      }
    }

    // Ensure master items cache is populated
    await MasterItemsService.syncMasterCatalog(apiKey).catch(() => {});

    // Fetch master item data for all aggregated items
    const itemIds = Array.from(aggregatedItemsMap.keys());
    if (itemIds.length === 0) {
      return { items: [], totalValue: 0, totalProfit: 0 };
    }

    const [masterRows] = await pool.query(
      `SELECT item_id, name, item_type, buy_price, sell_price, market_value, image_url 
       FROM master_items_cache 
       WHERE item_id IN (?)`,
      [itemIds]
    );

    const masterMap = new Map();
    masterRows.forEach(r => masterMap.set(r.item_id, r));

    // Fetch existing inventory lots for cost basis and origin tracking
    const [lotRows] = await pool.query(
      `SELECT item_id, qty_remaining, unit_cost, source, purchased_at 
       FROM inventory_lots 
       WHERE item_id IN (?) AND qty_remaining > 0 
       ORDER BY purchased_at DESC`,
      [itemIds]
    );

    const lotsByItem = new Map();
    lotRows.forEach(lot => {
      if (!lotsByItem.has(lot.item_id)) lotsByItem.set(lot.item_id, []);
      lotsByItem.get(lot.item_id).push(lot);
    });

    // Enforce October 1, 2026 Cutoff Date
    const cutoffDate = new Date('2026-10-01T00:00:00Z');

    let overallInventoryValue = 0;
    let overallProjectedProfit = 0;
    let overallCostBasis = 0;

    const enrichedItems = [];

    for (const [id, invItem] of aggregatedItemsMap.entries()) {
      const master = masterMap.get(id) || {};
      const lots = lotsByItem.get(id) || [];

      let totalItemCost = 0;
      let accountedQty = 0;
      const distinctSources = new Set();
      const lotBreakdown = [];

      // Walk through lots chronologically or by remaining stock to calculate blended multi-lot cost pool
      if (lots.length > 0) {
        for (const lot of lots) {
          if (accountedQty >= invItem.amount) break;
          const take = Math.min(Number(lot.qty_remaining || 0), invItem.amount - accountedQty);
          if (take <= 0) continue;

          const purchaseDate = new Date(lot.purchased_at);
          const isFree = purchaseDate < cutoffDate || lot.source === 'legacy' || lot.source === 'crime';
          const lotUnitCost = isFree ? 0 : Number(lot.unit_cost || 0);

          totalItemCost += take * lotUnitCost;
          accountedQty += take;

          const srcType = isFree ? (lot.source === 'crime' ? 'crime' : 'legacy') : lot.source;
          distinctSources.add(srcType);
          lotBreakdown.push({
            qty: take,
            source: srcType,
            unitCost: lotUnitCost
          });
        }
      }

      // If user holds more inventory than tracked in post-Oct 1 lots, excess is pre-Oct 1 legacy ($0 cost basis)
      if (accountedQty < invItem.amount) {
        const remaining = invItem.amount - accountedQty;
        distinctSources.add('legacy');
        lotBreakdown.push({
          qty: remaining,
          source: 'legacy',
          unitCost: 0
        });
        accountedQty += remaining;
      }

      // Blended weighted average unit cost across all active batches
      const unitCost = invItem.amount > 0 ? Math.round(totalItemCost / invItem.amount) : 0;

      // Determine descriptive origin badge
      let originSource = 'legacy';
      let originBadge = 'Legacy (Pre-Oct 1)';

      if (distinctSources.size > 1) {
        originSource = 'mixed';
        originBadge = 'Multi-Source (Blended)';
      } else if (distinctSources.has('abroad')) {
        originSource = 'abroad';
        originBadge = 'Travel Abroad';
      } else if (distinctSources.has('trade')) {
        originSource = 'trade';
        originBadge = 'Player Trade (90%)';
      } else if (distinctSources.has('bazaar')) {
        originSource = 'bazaar';
        originBadge = 'Player Bazaar';
      } else if (distinctSources.has('crime')) {
        originSource = 'crime';
        originBadge = 'Crimes 2.0 Loot';
      } else if (distinctSources.has('market')) {
        originSource = 'market';
        originBadge = 'Item Market';
      } else {
        originSource = 'legacy';
        originBadge = 'Legacy (Pre-Oct 1)';
      }

      const marketValue = Number(master.market_value || 0);
      const totalItemValue = invItem.amount * marketValue;

      // Pricing Recommendations
      const fastTurnoverPrice = Math.max(1, marketValue - 1); // Undercut by $1
      const marketPrice = marketValue;
      const patientPrice = Math.round(marketValue * 1.02); // +2% premium

      const projectedRevenue = invItem.amount * fastTurnoverPrice;
      const netProfit = projectedRevenue - totalItemCost;
      const roiPct = totalItemCost > 0 ? (netProfit / totalItemCost) * 100 : 100;

      overallInventoryValue += totalItemValue;
      overallCostBasis += totalItemCost;
      overallProjectedProfit += netProfit;

      enrichedItems.push({
        id,
        name: invItem.name,
        amount: invItem.amount,
        itemType: master.item_type || invItem.category,
        imageUrl: master.image_url || `https://www.torn.com/images/items/${id}/large.png`,
        marketValue,
        unitCost,
        totalItemCost,
        totalItemValue,
        originSource,
        originBadge,
        batches: lotBreakdown,
        pricing: {
          fastTurnoverPrice,
          marketPrice,
          patientPrice
        },
        projectedRevenue,
        netProfit,
        roiPct: parseFloat(roiPct.toFixed(1))
      });
    }

    // Sort by Total Market Value descending (highest value items first)
    enrichedItems.sort((a, b) => b.totalItemValue - a.totalItemValue);

    this.inventoryCache = {
      data: enrichedItems,
      totalValue: overallInventoryValue,
      totalProfit: overallProjectedProfit,
      totalCost: overallCostBasis,
      timestamp: Date.now()
    };

    let filteredItems = enrichedItems;
    if (category && category !== 'all') {
      filteredItems = enrichedItems.filter(i => i.itemType?.toLowerCase() === category.toLowerCase());
    }

    return {
      items: filteredItems,
      totalCount: enrichedItems.length,
      totalValue: overallInventoryValue,
      totalProfit: overallProjectedProfit,
      totalCost: overallCostBasis,
      cached: false
    };
  }
}
