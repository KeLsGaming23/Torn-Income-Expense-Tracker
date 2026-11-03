import axios from 'axios';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

export class MasterItemsService {
  static liveMarketCache = new Map(); // itemId -> { data, timestamp }

  static getApiKey() {
    return process.env.TORN_API_KEY || 'vVZGrKSwrXNtcGKi';
  }

  /**
   * Fetch all 1,500+ master items from Torn API and cache in master_items_cache table
   */
  static async syncMasterCatalog(apiKey = this.getApiKey(), force = false) {
    if (!apiKey) {
      throw new Error('TORN_API_KEY is not configured');
    }

    try {
      // Check last sync time
      const [lastSync] = await pool.query(
        `SELECT MAX(last_synced_at) AS last_sync FROM master_items_cache`
      );
      const lastSyncTime = lastSync[0]?.last_sync ? new Date(lastSync[0].last_sync).getTime() : 0;
      const hoursSinceSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);

      // Only refresh every 4 hours unless forced or empty
      if (!force && lastSyncTime > 0 && hoursSinceSync < 4) {
        return { success: true, message: 'Master catalog is up to date', cached: true };
      }

      console.log('[MasterItems] Syncing master items catalog from Torn API...');
      const url = `https://api.torn.com/torn/?selections=items&key=${apiKey}`;
      const res = await axios.get(url, { timeout: 20000 });

      if (res.data?.error) {
        throw new Error(res.data.error.error || 'Torn API error');
      }

      const items = res.data?.items || {};
      const entries = Object.entries(items);

      if (entries.length === 0) {
        return { success: false, message: 'No items returned from Torn API' };
      }

      console.log(`[MasterItems] Ingesting ${entries.length} items into master_items_cache...`);

      // Batch insert in chunks of 150
      const chunkSize = 150;
      for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize);
        const values = [];
        const params = [];

        for (const [idStr, it] of chunk) {
          const itemId = Number(idStr);
          values.push(`(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`);
          params.push(
            itemId,
            it.name || `Item #${itemId}`,
            it.description || '',
            it.type || 'Other',
            it.weapon_type || null,
            Number(it.buy_price || 0),
            Number(it.sell_price || 0),
            Number(it.market_value || 0),
            Number(it.circulation || 0),
            it.image || `https://www.torn.com/images/items/${itemId}/large.png`,
            it.tradeable ? 1 : 0
          );
        }

        const query = `
          INSERT INTO master_items_cache 
          (item_id, name, description, item_type, weapon_type, buy_price, sell_price, market_value, circulation, image_url, is_tradeable, last_synced_at)
          VALUES ${values.join(', ')}
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            item_type = VALUES(item_type),
            weapon_type = VALUES(weapon_type),
            buy_price = VALUES(buy_price),
            sell_price = VALUES(sell_price),
            market_value = VALUES(market_value),
            circulation = VALUES(circulation),
            image_url = VALUES(image_url),
            is_tradeable = VALUES(is_tradeable),
            last_synced_at = NOW()
        `;

        await pool.query(query, params);
      }

      console.log(`[MasterItems] Successfully cached ${entries.length} master items.`);
      return { success: true, count: entries.length };
    } catch (err) {
      console.error('[MasterItems] Error syncing master catalog:', err.message);
      throw err;
    }
  }

  /**
   * Search and filter cached master items
   */
  static async searchCatalog({ query = '', type = '', sortBy = 'market_value', sortDir = 'DESC', limit = 50, offset = 0 }) {
    // Check if table is empty; if so, trigger auto-sync from Torn API
    try {
      const [tableCount] = await pool.query(`SELECT COUNT(*) AS count FROM master_items_cache`);
      if (Number(tableCount[0]?.count || 0) === 0) {
        console.log('[MasterItems] master_items_cache is empty. Auto-syncing from Torn API...');
        await this.syncMasterCatalog(this.getApiKey(), true);
      }
    } catch (e) {
      console.warn('[MasterItems] Auto-sync check notice:', e.message);
    }

    const whereClauses = ['1=1'];
    const params = [];

    if (query && query.trim().length > 0) {
      const q = `%${query.trim()}%`;
      const numQ = Number(query.trim());
      if (!isNaN(numQ) && numQ > 0) {
        whereClauses.push('(name LIKE ? OR item_id = ?)');
        params.push(q, numQ);
      } else {
        whereClauses.push('name LIKE ?');
        params.push(q);
      }
    }

    if (type && type.trim().length > 0 && type.toLowerCase() !== 'all') {
      whereClauses.push('item_type = ?');
      params.push(type.trim());
    }

    const allowedSortFields = ['market_value', 'name', 'buy_price', 'sell_price', 'circulation', 'item_id'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'market_value';
    const direction = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countQuery = `SELECT COUNT(*) AS total FROM master_items_cache WHERE ${whereClauses.join(' AND ')}`;
    const [countRows] = await pool.query(countQuery, params);
    const total = Number(countRows[0]?.total || 0);

    const dataQuery = `
      SELECT item_id, name, description, item_type, weapon_type, buy_price, sell_price, market_value, circulation, image_url, is_tradeable, last_synced_at
      FROM master_items_cache
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortField} ${direction}
      LIMIT ? OFFSET ?
    `;

    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
    const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

    const [rows] = await pool.query(dataQuery, [...params, limitNum, offsetNum]);

    // Also get distinct categories for filtering
    const [typeRows] = await pool.query(`SELECT DISTINCT item_type FROM master_items_cache ORDER BY item_type ASC`);
    const availableTypes = typeRows.map(r => r.item_type).filter(Boolean);

    return {
      items: rows,
      total,
      limit: limitNum,
      offset: offsetNum,
      availableTypes
    };
  }

  /**
   * Get single master item by ID
   */
  static async getItemById(itemId) {
    const id = Number(itemId);
    const [rows] = await pool.query(`SELECT * FROM master_items_cache WHERE item_id = ?`, [id]);
    return rows[0] || null;
  }

  /**
   * Fetch live itemmarket listings and lowest prices from Torn API v2
   * Cached in memory for 30s to respect rate limits.
   */
  static async getLiveItemMarket(itemId, apiKey = this.getApiKey()) {
    const id = Number(itemId);
    if (!id) throw new Error('Invalid item ID');

    // Check memory cache (30s)
    const cached = this.liveMarketCache.get(id);
    if (cached && (Date.now() - cached.timestamp < 30000)) {
      return cached.data;
    }

    try {
      const headers = {
        'Authorization': `ApiKey ${apiKey}`,
        'User-Agent': 'TornLedger/1.0'
      };

      const res = await axios.get(`https://api.torn.com/v2/market/${id}/itemmarket`, { headers, timeout: 12000 });
      const marketPayload = res.data?.itemmarket || {};
      const listings = marketPayload.listings || [];

      // Sort listings lowest price first
      const sortedListings = listings.map(l => ({
        price: Number(l.price || 0),
        amount: Number(l.amount || 0)
      })).filter(l => l.price > 0).sort((a, b) => a.price - b.price);

      const lowestPrice = sortedListings[0]?.price || marketPayload.item?.average_price || 0;
      const averagePrice = Number(marketPayload.item?.average_price || lowestPrice);

      const result = {
        itemId: id,
        itemName: marketPayload.item?.name || '',
        itemType: marketPayload.item?.type || '',
        averagePrice,
        lowestPrice,
        totalListingsCount: sortedListings.length,
        topListings: sortedListings.slice(0, 10),
        fetchedAt: new Date().toISOString()
      };

      this.liveMarketCache.set(id, { data: result, timestamp: Date.now() });
      return result;
    } catch (err) {
      console.warn(`[MasterItems] Could not fetch live listings for item ${id}:`, err.message);
      // Fallback to cached market_value from DB
      const dbItem = await this.getItemById(id);
      return {
        itemId: id,
        itemName: dbItem?.name || `Item #${id}`,
        itemType: dbItem?.item_type || '',
        averagePrice: Number(dbItem?.market_value || 0),
        lowestPrice: Number(dbItem?.market_value || 0),
        totalListingsCount: 0,
        topListings: [],
        fallback: true,
        fetchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate Trade Buy Offer (e.g. 90% buy price) and profit margin
   */
  static calculateTradeOffer({ marketPrice, buyPercent = 90, quantity = 1 }) {
    const price = Number(marketPrice || 0);
    const percent = Number(buyPercent || 90);
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const unitBuyOffer = Math.round(price * (percent / 100));
    const totalMarketValue = price * qty;
    const totalPayout = unitBuyOffer * qty;
    const totalFlipProfit = totalMarketValue - totalPayout;
    const profitMarginPct = totalPayout > 0 ? (totalFlipProfit / totalPayout) * 100 : 0;

    return {
      unitMarketPrice: price,
      buyPercent: percent,
      unitBuyOffer,
      quantity: qty,
      totalMarketValue,
      totalPayout,
      totalFlipProfit,
      profitMarginPct: parseFloat(profitMarginPct.toFixed(1))
    };
  }
}
