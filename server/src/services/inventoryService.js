import axios from 'axios';
import pool from '../config/db.js';
import dotenv from 'dotenv';
import { MasterItemsService } from './masterItemsService.js';

dotenv.config();

export class InventoryService {
  static inventoryCache = { data: null, timestamp: 0 };

  static getApiKey() {
    return process.env.TORN_API_KEY || '';
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
      axios.get(`https://api.torn.com/v2/user/inventory?cat=${cat}&key=${apiKey}`, { headers, timeout: 15000 })
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

      let unitCost = 0;
      let originSource = 'legacy';
      let originBadge = 'Legacy (Pre-Oct 1)';

      if (lots.length > 0) {
        const lot = lots[0];
        const purchaseDate = new Date(lot.purchased_at);
        if (purchaseDate < cutoffDate || lot.source === 'legacy') {
          unitCost = 0;
          originSource = 'legacy';
          originBadge = 'Legacy (Pre-Oct 1)';
        } else if (lot.source === 'crime') {
          unitCost = 0;
          originSource = 'crime';
          originBadge = 'Crimes 2.0 Loot';
        } else {
          unitCost = Number(lot.unit_cost);
          originSource = lot.source;
          originBadge = lot.source === 'abroad' ? 'Travel Abroad' : lot.source === 'bazaar' ? 'Player Bazaar' : 'Player Trade';
        }
      } else {
        // No lot exists yet - treat as pre-October 1 legacy / crime loot ($0 cost basis)
        unitCost = 0;
        originSource = 'legacy';
        originBadge = 'Legacy / Crime Loot';

        // Auto-persist into inventory_lots as pre-Oct 1 legacy
        pool.query(
          `INSERT INTO inventory_lots 
           (torn_log_id, item_id, item_name, item_type, source, qty_initial, qty_remaining, unit_cost, purchased_at)
           VALUES (NULL, ?, ?, ?, 'legacy', ?, ?, 0, '2026-09-30 23:59:59')
           ON DUPLICATE KEY UPDATE qty_remaining = VALUES(qty_remaining)`,
          [id, invItem.name, master.item_type || invItem.category, invItem.amount, invItem.amount]
        ).catch(() => {});
      }

      const marketValue = Number(master.market_value || 0);
      const totalItemValue = invItem.amount * marketValue;
      const totalItemCost = invItem.amount * unitCost;

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
