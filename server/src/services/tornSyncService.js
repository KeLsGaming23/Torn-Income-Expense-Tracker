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
    let importedIncomes = 0;
    let newLastTimestamp = lastTimestamp;

    // 2. Fetch User Money & Profile & Travel & Faction Vault
    let userData = null;
    let factionData = null;
    try {
      const [userRes, factionRes] = await Promise.allSettled([
        axios.get(`https://api.torn.com/user/?selections=basic,money,travel&key=${apiKey}`, { timeout: 15000 }),
        axios.get(`https://api.torn.com/faction/?selections=donations&key=${apiKey}`, { timeout: 15000 })
      ]);
      if (userRes.status === 'fulfilled' && !userRes.value.data?.error) {
        userData = userRes.value.data;
      }
      if (factionRes.status === 'fulfilled' && !factionRes.value.data?.error) {
        factionData = factionRes.value.data;
      }
    } catch (e) {
      console.warn('[Sync] Could not fetch user/faction data:', e.message);
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
          const itemsList = data.items && Array.isArray(data.items) && data.items.length > 0
            ? data.items.map(it => ({
                id: Number(it.id),
                qty: Number(it.qty || it.quantity || 1),
                unitCost: Number(data.cost_each || it.cost || (data.cost_total && it.qty ? Math.round(data.cost_total / it.qty) : 0) || 0)
              }))
            : (data.item || data.item_id ? [{
                id: Number(data.item || data.item_id),
                qty: Number(data.quantity || 1),
                unitCost: Number(data.cost_each || (data.cost_total && data.quantity ? Math.round(data.cost_total / data.quantity) : 0) || data.cost || data.price || 0)
              }] : []);

          for (const itemEntry of itemsList) {
            const museumItem = ALL_MUSEUM_ITEMS_MAP.get(itemEntry.id);
            if (museumItem) {
              const qty = itemEntry.qty;
              const unitCost = itemEntry.unitCost || museumItem.buyPrice;
              const source = title.includes('abroad') || data.area ? 'abroad' : title.includes('bazaar') ? 'bazaar' : 'market';

              try {
                const [insertRes] = await pool.query(
                  `INSERT INTO inventory_lots 
                   (torn_log_id, item_id, item_name, item_type, source, qty_initial, qty_remaining, unit_cost, purchased_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE 
                     qty_initial = VALUES(qty_initial),
                     qty_remaining = GREATEST(0, VALUES(qty_initial) - (qty_initial - qty_remaining)),
                     unit_cost = VALUES(unit_cost)`,
                  [logId, museumItem.id, museumItem.name, museumItem.type, source, qty, qty, unitCost, logDate]
                );
                if (insertRes.affectedRows > 0) importedLots++;
              } catch (err) {
                console.warn('[Sync] Error inserting lot:', err.message);
              }
            }
          }
        }

        // B. Museum Exchange (Auto Point Conversion)
        const isMuseumExchange = title.includes('museum exchange') || Number(entry.log) === 7000 || category === 'museum';
        if (isMuseumExchange) {
          const setName = (data.set || '').toLowerCase();
          const isFlower = setName.includes('flower');
          const setType = isFlower ? 'flower' : 'plushie';
          const setItemList = isFlower ? FLOWER_SET : PLUSHIE_SET;
          const setsConverted = Number(data.quantity || 1);
          const pointsGenerated = Number(data.points_received || setsConverted * 10);

          const [existingConv] = await pool.query(
            `SELECT id FROM point_conversions WHERE torn_log_id = ?`,
            [logId]
          );

          if (existingConv.length === 0) {
            // Check if there is a manual conversion already logged around this time for the same set
            const [recentManual] = await pool.query(
              `SELECT id FROM point_conversions 
               WHERE torn_log_id IS NULL 
                 AND set_type = ? 
                 AND sets_converted = ? 
                 AND converted_at >= DATE_SUB(?, INTERVAL 15 MINUTE)
                 AND converted_at <= DATE_ADD(?, INTERVAL 15 MINUTE)
               ORDER BY id DESC LIMIT 1`,
              [setType, setsConverted, logDate, logDate]
            );

            if (recentManual.length > 0) {
              await pool.query(
                `UPDATE point_conversions SET torn_log_id = ? WHERE id = ?`,
                [logId, recentManual[0].id]
              );
              console.log(`[Sync] Linked incoming Museum Exchange log ${logId} to existing manual conversion #${recentManual[0].id}. Deduplication avoided.`);
              continue;
            }

            let totalCostBasis = 0;

            for (const setItem of setItemList) {
              let unitsNeeded = setsConverted;
              const [lots] = await pool.query(
                `SELECT id, qty_remaining, unit_cost FROM inventory_lots 
                 WHERE item_id = ? AND qty_remaining > 0 
                 ORDER BY purchased_at ASC, id ASC`,
                [setItem.id]
              );

              for (const lot of lots) {
                if (unitsNeeded <= 0) break;
                const deduct = Math.min(lot.qty_remaining, unitsNeeded);
                await pool.query(
                  `UPDATE inventory_lots SET qty_remaining = qty_remaining - ? WHERE id = ?`,
                  [deduct, lot.id]
                );
                totalCostBasis += (deduct * Number(lot.unit_cost));
                unitsNeeded -= deduct;
              }

              if (unitsNeeded > 0) {
                totalCostBasis += (unitsNeeded * setItem.buyPrice);
              }
            }

            const breakevenPerPoint = pointsGenerated > 0 ? (totalCostBasis / pointsGenerated) : 0;

            await pool.query(
              `INSERT INTO point_conversions 
               (torn_log_id, set_type, sets_converted, points_generated, total_cost_basis, breakeven_per_point, points_sold, sale_price_per_point, net_profit, converted_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`,
              [logId, setType, setsConverted, pointsGenerated, totalCostBasis, breakevenPerPoint, logDate]
            );

            console.log(`[Sync] Recorded Museum Exchange: ${setsConverted}x ${setType} sets -> ${pointsGenerated} pts. FIFO Cost: $${totalCostBasis.toLocaleString()} (Breakeven: $${breakevenPerPoint.toFixed(2)}/pt)`);
          }
        }

        // C. Trades & Outgoing Items (FIFO Deductions)
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

        // D. Points Market Sell (Realized Profit Tracking & Income Ingestion)
        const isPointsMarketSell = title.includes('points market sell') || Number(entry.log) === 5011;
        if (isPointsMarketSell) {
          const qtySold = Number(data.quantity || 1);
          const unitPrice = Number(data.cost_each || data.price_each || 0);

          // Find active point conversions with unsold points
          const [convs] = await pool.query(
            `SELECT id, points_generated, points_sold, breakeven_per_point, net_profit 
             FROM point_conversions 
             WHERE points_sold < points_generated 
             ORDER BY converted_at ASC, id ASC`
          );

          let remainingToSell = qtySold;
          for (const conv of convs) {
            if (remainingToSell <= 0) break;
            const available = conv.points_generated - conv.points_sold;
            const sellCount = Math.min(available, remainingToSell);
            const batchCost = sellCount * Number(conv.breakeven_per_point);
            const batchRevenue = sellCount * unitPrice;
            const batchProfit = batchRevenue - batchCost;

            await pool.query(
              `UPDATE point_conversions 
               SET points_sold = points_sold + ?,
                   sale_price_per_point = ?,
                   net_profit = net_profit + ?
               WHERE id = ?`,
              [sellCount, unitPrice, batchProfit, conv.id]
            );
            remainingToSell -= sellCount;
            console.log(`[Sync] Realized Points Sale: ${sellCount} pts @ $${unitPrice} (Profit: +$${batchProfit.toLocaleString()})`);
          }

          // Ingest into unified income_ledger
          const totalPointsRevenue = qtySold * unitPrice;
          if (totalPointsRevenue > 0) {
            try {
              const [incRes] = await pool.query(
                `INSERT IGNORE INTO income_ledger 
                 (torn_log_id, category, amount, description, metadata_json, logged_at)
                 VALUES (?, 'points_sale', ?, ?, ?, ?)`,
                [logId, totalPointsRevenue, `Sold ${qtySold} points @ $${unitPrice.toLocaleString()}/pt`, JSON.stringify(data), logDate]
              );
              if (incRes.affectedRows > 0) importedIncomes++;
            } catch (err) {
              console.warn('[Sync] Points income insert error:', err.message);
            }
          }
        }

        // E. Crimes 2.0 Cash Gain (Log 9015)
        const isCrimeMoney = Number(entry.log) === 9015 || (title.includes('crime') && (data.money_gain > 0 || data.money > 0));
        if (isCrimeMoney) {
          const crimeMoney = Number(data.money_gain || data.money || 0);
          if (crimeMoney > 0) {
            const crimeDesc = data.crime_name ? `Crime: ${data.crime_name}` : (entry.title || 'Crimes 2.0 Gain');
            try {
              const [incRes] = await pool.query(
                `INSERT IGNORE INTO income_ledger 
                 (torn_log_id, category, amount, description, metadata_json, logged_at)
                 VALUES (?, 'crimes', ?, ?, ?, ?)`,
                [logId, crimeMoney, crimeDesc, JSON.stringify(data), logDate]
              );
              if (incRes.affectedRows > 0) importedIncomes++;
            } catch (err) {
              console.warn('[Sync] Crime income insert error:', err.message);
            }
          }
        }

        // F. Bazaar Sales (Log 1210)
        const isBazaarSale = Number(entry.log) === 1210 || (title.includes('bazaar') && title.includes('customer buy'));
        if (isBazaarSale) {
          const bazaarRevenue = Number(data.cost_total || data.cost || data.price || (data.cost_each && data.quantity ? data.cost_each * data.quantity : 0) || 0);
          if (bazaarRevenue > 0) {
            const buyer = data.buyer_name || data.player || 'Customer';
            const itemName = data.item_name || (data.item ? `Item #${data.item}` : 'Items');
            const desc = `Bazaar: ${data.quantity ? data.quantity + 'x ' : ''}${itemName} sold to ${buyer}`;
            try {
              const [incRes] = await pool.query(
                `INSERT IGNORE INTO income_ledger 
                 (torn_log_id, category, amount, description, metadata_json, logged_at)
                 VALUES (?, 'bazaar_sale', ?, ?, ?, ?)`,
                [logId, bazaarRevenue, desc, JSON.stringify(data), logDate]
              );
              if (incRes.affectedRows > 0) importedIncomes++;
            } catch (err) {
              console.warn('[Sync] Bazaar income insert error:', err.message);
            }
          }
        }

        // G. Personal Player Trades (Log 4441)
        const isTradeIncomingMoney = Number(entry.log) === 4441 || (title.includes('trade') && title.includes('money incoming'));
        if (isTradeIncomingMoney) {
          const tradeCash = Number(data.money || 0);
          if (tradeCash > 0) {
            const tradeId = data.parsed_trade_id || (data.trade_id && typeof data.trade_id === 'number' ? data.trade_id : null);
            const traderUser = data.user || 'Trader';
            const desc = `Trade #${tradeId || ''} with Player #${traderUser}`;
            try {
              const [incRes] = await pool.query(
                `INSERT IGNORE INTO income_ledger 
                 (torn_log_id, category, amount, description, metadata_json, logged_at)
                 VALUES (?, 'trade_income', ?, ?, ?, ?)`,
                [logId, tradeCash, desc, JSON.stringify(data), logDate]
              );
              if (incRes.affectedRows > 0) importedIncomes++;
            } catch (err) {
              console.warn('[Sync] Trade income insert error:', err.message);
            }
          }
        }

        // H. Mugging Cash Gain (Log 8155)
        const isMugWin = Number(entry.log) === 8155 || ((title.includes('mug') || title.includes('attack')) && (data.money_mugged > 0 || data.money_gain > 0) && !title.includes('lost') && !title.includes('receive'));
        if (isMugWin) {
          const mugCash = Number(data.money_mugged || data.money_gain || data.money || 0);
          if (mugCash > 0) {
            const target = data.target_name || data.defender_name || data.player || 'Target';
            try {
              const [incRes] = await pool.query(
                `INSERT IGNORE INTO income_ledger 
                 (torn_log_id, category, amount, description, metadata_json, logged_at)
                 VALUES (?, 'mugging_gain', ?, ?, ?, ?)`,
                [logId, mugCash, `Mugged ${target} (+$${mugCash.toLocaleString()})`, JSON.stringify(data), logDate]
              );
              if (incRes.affectedRows > 0) importedIncomes++;
            } catch (err) {
              console.warn('[Sync] Mug income insert error:', err.message);
            }
          }
        }

        // I. City Bank Maturation Interest (Log 1000 / 1001)
        const isBankInterest = (Number(entry.log) === 1000 || Number(entry.log) === 1001 || title.includes('bank investment') || title.includes('bank interest')) && (data.profit > 0 || data.interest > 0);
        if (isBankInterest) {
          const interestAmt = Number(data.profit || data.interest || 0);
          if (interestAmt > 0) {
            try {
              const [incRes] = await pool.query(
                `INSERT IGNORE INTO income_ledger 
                 (torn_log_id, category, amount, description, metadata_json, logged_at)
                 VALUES (?, 'bank_interest', ?, ?, ?, ?)`,
                [logId, interestAmt, `City Bank Maturation Profit`, JSON.stringify(data), logDate]
              );
              if (incRes.affectedRows > 0) importedIncomes++;
            } catch (err) {
              console.warn('[Sync] Bank interest insert error:', err.message);
            }
          }
        }

        // J. Expenses: Mug losses / Upkeep / Travel flights / Rent (Faction drugs excluded)
        let expenseCat = null;
        let expenseAmount = Number(data.cost || data.money || data.lost || data.cost_total || data.rent || data.money_mugged || 0);

        if (title.includes('mug') || title.includes('attack') || category === 'attacking') {
          if (title.includes('lost') || data.lost > 0 || data.money_mugged > 0) {
            expenseCat = 'mug_loss';
            expenseAmount = Number(data.money_mugged || data.lost || data.money || 0);
          }
        } else if (title.includes('upkeep') || title.includes('staff')) {
          expenseCat = 'upkeep';
        } else if (title.includes('rent') || title.includes('lease') || title.includes('property rental')) {
          // Ignore pending offers or extensions, only log actual completed rental payment
          if (!title.includes('offer') && !title.includes('extension')) {
            expenseCat = 'rent';
          }
        } else if (title.includes('travel') && title.includes('fee')) {
          expenseCat = 'travel';
        }
        // Notice: Happy jump drugs (Xanax/Ecstasy/eDVD) and vault deposits are deliberately excluded as expenses

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

    // 6. Insert / Update Wallet Snapshot with independent Faction Vault & City Bank columns
    const playerId = String(userData?.player_id || 4161786);
    const factionVaultAmount = Number(factionData?.donations?.[playerId]?.money_balance || 0);
    const cityBankAmount = Number(userData?.city_bank?.amount || 0);
    const propertyVaultAmount = Number(userData?.vault_amount || 0);
    const vaultAmount = factionVaultAmount + propertyVaultAmount;
    const moneyOnHand = Number(userData?.money_onhand || 0);
    const pointsBalance = Number(userData?.points || 0);

    await pool.query(
      `INSERT INTO wallet_snapshots (money_onhand, vault_amount, faction_vault_amount, city_bank_amount, property_vault_amount, points_balance, current_market_point_price, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [moneyOnHand, vaultAmount, factionVaultAmount, cityBankAmount, propertyVaultAmount, pointsBalance, lowestPointsMarketListing]
    );

    return {
      success: true,
      importedLots,
      importedExpenses,
      importedIncomes,
      lastLogTimestamp: newLastTimestamp,
      travel: userData?.travel || null,
      wallet: {
        moneyOnHand,
        vaultAmount,
        factionVaultAmount,
        cityBankAmount,
        propertyVaultAmount,
        pointsBalance,
        lowestPointsMarketListing,
        averageTop10Listings
      }
    };
  }
}
