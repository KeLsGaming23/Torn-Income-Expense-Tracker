import axios from 'axios';
import pool from '../config/db.js';
import { ALL_MUSEUM_ITEMS_MAP, PLUSHIE_SET, FLOWER_SET } from '../constants/masterItems.js';
import dotenv from 'dotenv';

dotenv.config();

export class TornSyncService {
  static getApiKey() {
    return process.env.TORN_API_KEY || '';
  }

  /**
   * Main Sync Service:
   * Polls Torn API for User, Wallet, Points Market, Item Prices, and Logs
   * Supports incremental sync as well as 35-day historical deep sync.
   */
  static async syncAll(options = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('TORN_API_KEY is not defined in server/.env');
    }

    // 1. Get last_log_timestamp from sync_state
    const [stateRows] = await pool.query(`SELECT last_log_timestamp FROM sync_state WHERE id = 1`);
    const lastTimestamp = stateRows[0]?.last_log_timestamp ? Number(stateRows[0].last_log_timestamp) : 0;
    const isDeepSync = options.deepSync || lastTimestamp === 0;

    let importedLots = 0;
    let importedExpenses = 0;
    let newLastTimestamp = lastTimestamp;

    // 2. Fetch User Money & Profile & Travel
    let userData = null;
    try {
      const userRes = await axios.get(`https://api.torn.com/user/?selections=basic,money,travel&key=${apiKey}`, { timeout: 15000 });
      if (userRes.data?.error) {
        console.warn('[Sync] Torn API returned error for user details:', userRes.data.error);
      } else {
        userData = userRes.data;
      }
    } catch (e) {
      console.warn('[Sync] Could not fetch user basic/money:', e.message);
    }

    // 3. Fetch Live Points Market
    let lowestPointsMarketListing = 45000;
    let averageTop10Listings = 45000;
    try {
      const marketRes = await axios.get(`https://api.torn.com/market/?selections=pointsmarket&key=${apiKey}`, { timeout: 15000 });
      const pm = marketRes.data?.pointsmarket || {};
      const listings = Object.values(pm).map(l => Number(l.cost)).filter(c => c > 0).sort((a, b) => a - b);
      if (listings.length > 0) {
        lowestPointsMarketListing = listings[0];
        const top10 = listings.slice(0, 10);
        averageTop10Listings = Math.round(top10.reduce((acc, c) => acc + c, 0) / top10.length);
      }
    } catch (e) {
      console.warn('[Sync] Could not fetch pointsmarket:', e.message);
    }

    // 4. Fetch Logs (Deep Historical or Incremental Forward)
    const allLogEntries = [];

    if (isDeepSync) {
      console.log('[Sync] Performing 35-day historical deep log scan...');
      let currentTo = null;
      let pages = 0;
      const maxPages = 45;
      const cutoff = Math.floor(Date.now() / 1000) - (35 * 86400);

      while (pages < maxPages) {
        pages++;
        const url = currentTo
          ? `https://api.torn.com/user/?selections=log&to=${currentTo}&key=${apiKey}`
          : `https://api.torn.com/user/?selections=log&key=${apiKey}`;

        try {
          const logRes = await axios.get(url, { timeout: 20000 });
          const pLogs = logRes.data?.log || {};
          const keys = Object.keys(pLogs);
          if (keys.length === 0) break;

          const sortedPage = Object.entries(pLogs).sort((a, b) => b[1].timestamp - a[1].timestamp);
          const oldestInPage = sortedPage[sortedPage.length - 1][1].timestamp;

          for (const [id, log] of sortedPage) {
            allLogEntries.push([id, log]);
          }

          if (oldestInPage < cutoff) break;
          currentTo = oldestInPage - 1;
        } catch (err) {
          console.warn(`[Sync] Page ${pages} fetch notice:`, err.message);
          break;
        }
      }
    } else {
      // Incremental forward sync
      try {
        const logUrl = `https://api.torn.com/user/?selections=log&from=${lastTimestamp + 1}&key=${apiKey}`;
        const logRes = await axios.get(logUrl, { timeout: 20000 });
        const pLogs = logRes.data?.log || {};
        for (const [id, log] of Object.entries(pLogs)) {
          allLogEntries.push([id, log]);
        }
      } catch (err) {
        console.warn('[Sync] Incremental log fetch notice:', err.message);
      }
    }

    // 5. Process Logs Chronologically (Oldest First)
    if (allLogEntries.length > 0) {
      allLogEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (const [logId, entry] of allLogEntries) {
        const ts = entry.timestamp;
        if (ts > newLastTimestamp) newLastTimestamp = ts;

        const title = (entry.title || '').toLowerCase();
        const category = (entry.category || '').toLowerCase();
        const data = entry.data || {};
        const logDate = new Date(ts * 1000);

        // A. Purchases of Plushies & Flowers
        const isPurchase = title.includes('buy') || title.includes('abroad') || title.includes('bazaar') || title.includes('market');
        if (isPurchase) {
          const itemId = Number(data.item || data.item_id || data.items?.[0]?.id);
          const museumItem = itemId ? ALL_MUSEUM_ITEMS_MAP.get(itemId) : null;

          if (museumItem) {
            const qty = Number(data.quantity || data.items?.[0]?.quantity || 1);
            const unitCost = Number(
              data.cost_each || 
              (data.cost_total && qty ? Math.round(data.cost_total / qty) : 0) || 
              data.cost || 
              data.price || 
              (data.items?.[0]?.cost || 0) || 
              museumItem.buyPrice
            );
            const source = title.includes('abroad') || data.area ? 'abroad' : title.includes('bazaar') ? 'bazaar' : 'market';

            try {
              const [insertRes] = await pool.query(
                `INSERT IGNORE INTO inventory_lots 
                 (torn_log_id, item_id, item_name, item_type, source, qty_initial, qty_remaining, unit_cost, purchased_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [logId, museumItem.id, museumItem.name, museumItem.type, source, qty, qty, unitCost, logDate]
              );
              if (insertRes.affectedRows > 0) importedLots++;
            } catch (err) {
              console.warn('[Sync] Error inserting lot:', err.message);
            }
          }
        }

        // B. Trades & Outgoing Items (FIFO Deductions)
        const isOutgoing = (title.includes('trade') && (title.includes('outgoing') || title.includes('add'))) ||
                           (title.includes('item') && title.includes('send')) ||
                           (title.includes('bazaar') && title.includes('customer buy'));

        if (isOutgoing) {
          const items = data.items || (data.item ? [{ id: data.item, qty: data.quantity || 1 }] : []);
          for (const item of items) {
            const itemId = Number(item.id);
            if (ALL_MUSEUM_ITEMS_MAP.has(itemId)) {
              let needed = Number(item.qty || 1);
              const [lots] = await pool.query(
                `SELECT id, qty_remaining FROM inventory_lots 
                 WHERE item_id = ? AND qty_remaining > 0 
                 ORDER BY purchased_at ASC, id ASC`,
                [itemId]
              );
              for (const lot of lots) {
                if (needed <= 0) break;
                const take = Math.min(lot.qty_remaining, needed);
                await pool.query(
                  `UPDATE inventory_lots SET qty_remaining = qty_remaining - ? WHERE id = ?`,
                  [take, lot.id]
                );
                needed -= take;
              }
            }
          }
        }

        // C. Mugging losses / Upkeep / Happy Jumps (Xanax & eDVD) / Travel flights / Rent
        let expenseCat = null;
        let expenseAmount = Number(data.cost || data.money || data.lost || data.cost_total || data.rent || 0);

        if (title.includes('mug') || title.includes('attack') || category === 'attacking') {
          if (title.includes('lost') || data.lost > 0) {
            expenseCat = 'mug_loss';
            expenseAmount = Number(data.lost || data.money || 0);
          }
        } else if (title.includes('upkeep') || title.includes('staff')) {
          expenseCat = 'upkeep';
        } else if (title.includes('edvd') || title.includes('xanax') || (title.includes('drug') && title.includes('use')) || title.includes('ecstasy')) {
          expenseCat = 'happy_jump';
          if (!expenseAmount) {
            expenseAmount = title.includes('xanax') ? 835000 : title.includes('edvd') ? 3800000 : 70000;
          }
        } else if (title.includes('rent') || title.includes('lease') || title.includes('property rental')) {
          // Ignore pending offers or extensions, only log actual completed rental payment
          if (!title.includes('offer') && !title.includes('extension')) {
            expenseCat = 'rent';
          }
        } else if (title.includes('travel') && title.includes('fee')) {
          expenseCat = 'travel';
        } else if (title.includes('vault') && title.includes('deposit')) {
          expenseCat = 'vault_deposit';
        }

        if (expenseCat && expenseAmount > 0) {
          try {
            const [expRes] = await pool.query(
              `INSERT IGNORE INTO expenses_ledger 
               (torn_log_id, category, amount, description, logged_at)
               VALUES (?, ?, ?, ?, ?)`,
              [logId, expenseCat, expenseAmount, entry.title || `${expenseCat} expense`, logDate]
            );
            if (expRes.affectedRows > 0) importedExpenses++;
          } catch (err) {
            console.warn('[Sync] Error inserting expense:', err.message);
          }
        }
      }

      // Update sync_state with newLastTimestamp and travel status
      const travelData = userData ? { travel: userData.travel, status: userData.status } : null;
      await pool.query(
        `UPDATE sync_state SET last_log_timestamp = ?, last_synced_at = NOW(), travel_json = ? WHERE id = 1`,
        [newLastTimestamp, travelData ? JSON.stringify(travelData) : null]
      );
    } else {
      const travelData = userData ? { travel: userData.travel, status: userData.status } : null;
      await pool.query(
        `UPDATE sync_state SET last_synced_at = NOW(), travel_json = ? WHERE id = 1`,
        [travelData ? JSON.stringify(travelData) : null]
      );
    }

    // 6. Insert / Update Wallet Snapshot
    const moneyOnHand = Number(userData?.money_onhand || 0);
    const vaultAmount = Number(userData?.city_bank?.amount || userData?.vault_amount || 0);
    const pointsBalance = Number(userData?.points || 0);

    await pool.query(
      `INSERT INTO wallet_snapshots (money_onhand, vault_amount, points_balance, current_market_point_price, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [moneyOnHand, vaultAmount, pointsBalance, lowestPointsMarketListing]
    );

    return {
      success: true,
      importedLots,
      importedExpenses,
      lastLogTimestamp: newLastTimestamp,
      travel: userData?.travel || null,
      wallet: {
        moneyOnHand,
        vaultAmount,
        pointsBalance,
        lowestPointsMarketListing,
        averageTop10Listings
      }
    };
  }
}
