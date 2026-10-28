import pool from '../config/db.js';
import { PLUSHIE_SET, FLOWER_SET } from '../constants/masterItems.js';

export class FIFOEngine {
  /**
   * Simulate Museum Set Conversion & Pricing Engine
   */
  static async simulate({ setType = 'plushie', setCount = null }) {
    const isFlower = setType.toLowerCase() === 'flower';
    const targetSet = isFlower ? FLOWER_SET : PLUSHIE_SET;
    const cleanSetType = isFlower ? 'flower' : 'plushie';
    const itemIds = targetSet.map(i => i.id);

    // Query inventory_lots for quantities and min/max costs
    const [lotsSummary] = await pool.query(
      `SELECT item_id, item_name,
              COALESCE(SUM(qty_remaining), 0) AS total_qty,
              MIN(CASE WHEN qty_remaining > 0 THEN unit_cost ELSE NULL END) AS min_cost,
              MAX(CASE WHEN qty_remaining > 0 THEN unit_cost ELSE NULL END) AS max_cost,
              COALESCE(SUM(qty_remaining * unit_cost), 0) AS total_cost_pool
       FROM inventory_lots
       WHERE item_id IN (?) AND qty_remaining > 0
       GROUP BY item_id`,
      [itemIds]
    );

    const summaryMap = new Map();
    lotsSummary.forEach(row => {
      summaryMap.set(row.item_id, {
        totalQty: Number(row.total_qty),
        minCost: Number(row.min_cost || 0),
        maxCost: Number(row.max_cost || 0),
        avgCost: Number(row.total_qty) > 0 ? Number(row.total_cost_pool) / Number(row.total_qty) : 0
      });
    });

    // Build item cards
    const itemCards = targetSet.map(item => {
      const live = summaryMap.get(item.id) || {
        totalQty: 0,
        minCost: item.buyPrice,
        maxCost: item.buyPrice,
        avgCost: item.buyPrice
      };
      return {
        ...item,
        ownedCount: live.totalQty,
        minCost: live.minCost || item.buyPrice,
        maxCost: live.maxCost || item.buyPrice,
        avgCost: Math.round(live.avgCost || item.buyPrice)
      };
    });

    const quantities = itemCards.map(i => i.ownedCount);
    const maxSets = Math.min(...quantities);

    // Identify bottlenecks
    const minQty = maxSets;
    const nextMilestone = maxSets + 5;
    const itemCardsWithBottlenecks = itemCards.map(item => {
      const isBottleneck = item.ownedCount === minQty;
      const missingForNext = Math.max(0, nextMilestone - item.ownedCount);
      return {
        ...item,
        isBottleneck,
        missingForNextMilestone: missingForNext > 0 ? `Missing ${missingForNext} to reach ${nextMilestone} sets` : null
      };
    });

    // Determine target sets to convert
    const N = setCount && Number(setCount) > 0 ? Math.min(Number(setCount), Math.max(1, maxSets)) : Math.max(1, maxSets);

    // Calculate FIFO Cost of Goods Sold for N sets
    let totalFifoCost = 0;
    const itemDeductionPlan = [];

    for (const item of itemCardsWithBottlenecks) {
      let needed = N;
      let itemCost = 0;

      const [lots] = await pool.query(
        `SELECT id, qty_remaining, unit_cost, source 
         FROM inventory_lots 
         WHERE item_id = ? AND qty_remaining > 0 
         ORDER BY purchased_at ASC, id ASC`,
        [item.id]
      );

      item.batches = lots.map(l => ({
        id: l.id,
        qty: Number(l.qty_remaining),
        unitCost: Number(l.unit_cost),
        source: l.source
      }));

      for (const lot of lots) {
        if (needed <= 0) break;
        const take = Math.min(lot.qty_remaining, needed);
        itemCost += take * Number(lot.unit_cost);
        needed -= take;
      }

      // If stock was less than N, fallback remaining to base buyPrice
      if (needed > 0) {
        itemCost += needed * item.buyPrice;
      }

      item.deductionCost = itemCost;
      totalFifoCost += itemCost;
      itemDeductionPlan.push({
        itemId: item.id,
        name: item.name,
        needed: N,
        estimatedCost: itemCost,
        batches: item.batches
      });
    }

    const pointsGenerated = 10 * N;
    const breakevenPerPoint = pointsGenerated > 0 ? totalFifoCost / pointsGenerated : 0;

    // Fetch live market point prices from wallet_snapshots
    const [snap] = await pool.query(`SELECT current_market_point_price FROM wallet_snapshots ORDER BY id DESC LIMIT 1`);
    const livePointPrice = snap[0]?.current_market_point_price ? Number(snap[0].current_market_point_price) : 45000;

    // Pricing Presets
    const minAggressivePrice = Math.round(breakevenPerPoint * 1.02); // Fast turnover +2% margin
    const advisablePrice = Math.max(minAggressivePrice, livePointPrice - 20); // Undercut live market for steady sale
    const aggressiveHighPrice = Math.round(livePointPrice * 1.015); // Patient seller +1.5%

    return {
      setType: cleanSetType,
      targetSetSize: targetSet.length,
      maxSets,
      selectedSets: N,
      pointsGenerated,
      totalFifoCost,
      breakevenPerPoint: parseFloat(breakevenPerPoint.toFixed(2)),
      liveMarketPointPrice: livePointPrice,
      pricingPresets: {
        minimumFast: {
          price: minAggressivePrice,
          label: 'Fast Turnover (+2% Margin)',
          netProfit: (minAggressivePrice * pointsGenerated) - totalFifoCost,
          roiPct: totalFifoCost > 0 ? (((minAggressivePrice * pointsGenerated) - totalFifoCost) / totalFifoCost) * 100 : 0
        },
        advisableMarket: {
          price: advisablePrice,
          label: 'Advisable (Undercut Live Market by $20)',
          netProfit: (advisablePrice * pointsGenerated) - totalFifoCost,
          roiPct: totalFifoCost > 0 ? (((advisablePrice * pointsGenerated) - totalFifoCost) / totalFifoCost) * 100 : 0
        },
        aggressiveHigh: {
          price: aggressiveHighPrice,
          label: 'Aggressive High (Patient Seller +1.5%)',
          netProfit: (aggressiveHighPrice * pointsGenerated) - totalFifoCost,
          roiPct: totalFifoCost > 0 ? (((aggressiveHighPrice * pointsGenerated) - totalFifoCost) / totalFifoCost) * 100 : 0
        }
      },
      items: itemCardsWithBottlenecks,
      itemDeductionPlan
    };
  }

  /**
   * Execute Museum Conversion (FIFO Consumption & Leftover Preservation)
   */
  static async convert({ setType = 'plushie', setsToConvert = 1, salePricePerPoint = 0, pointsSold = 0 }) {
    const count = parseInt(setsToConvert, 10);
    if (!count || count <= 0) {
      throw new Error('Sets to convert must be greater than 0.');
    }

    const isFlower = setType.toLowerCase() === 'flower';
    const targetSet = isFlower ? FLOWER_SET : PLUSHIE_SET;
    const cleanSetType = isFlower ? 'flower' : 'plushie';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check stock with row-level locks
      for (const item of targetSet) {
        const [stock] = await conn.query(
          `SELECT COALESCE(SUM(qty_remaining), 0) AS total 
           FROM inventory_lots 
           WHERE item_id = ? AND qty_remaining > 0 FOR UPDATE`,
          [item.id]
        );
        const available = Number(stock[0]?.total || 0);
        if (available < count) {
          throw new Error(`Insufficient stock for ${item.name}. Required: ${count}, Available: ${available}`);
        }
      }

      // Deduct items FIFO and sum exact COGS
      let totalCostBasis = 0;

      for (const item of targetSet) {
        let remainingNeeded = count;

        const [lots] = await conn.query(
          `SELECT id, qty_remaining, unit_cost 
           FROM inventory_lots 
           WHERE item_id = ? AND qty_remaining > 0 
           ORDER BY purchased_at ASC, id ASC FOR UPDATE`,
          [item.id]
        );

        for (const lot of lots) {
          if (remainingNeeded <= 0) break;

          const lotQty = Number(lot.qty_remaining);
          const take = Math.min(lotQty, remainingNeeded);
          const cost = take * Number(lot.unit_cost);

          totalCostBasis += cost;
          remainingNeeded -= take;

          // Deduct from lot (leftovers remain untouched)
          await conn.query(
            `UPDATE inventory_lots 
             SET qty_remaining = qty_remaining - ? 
             WHERE id = ?`,
            [take, lot.id]
          );
        }
      }

      const pointsGenerated = count * 10;
      const breakevenPerPoint = totalCostBasis / pointsGenerated;

      const pSold = pointsSold ? parseInt(pointsSold, 10) : 0;
      const pricePerPt = salePricePerPoint ? Number(salePricePerPoint) : 0;
      const netProfit = pSold > 0 ? (pSold * pricePerPt) - totalCostBasis : 0;

      // Insert into point_conversions
      const [convRes] = await conn.query(
        `INSERT INTO point_conversions 
         (set_type, sets_converted, points_generated, total_cost_basis, breakeven_per_point, points_sold, sale_price_per_point, net_profit, converted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [cleanSetType, count, pointsGenerated, totalCostBasis, breakevenPerPoint, pSold, pricePerPt, netProfit]
      );

      // If points sold, also log into wallet snapshots
      if (pSold > 0) {
        await conn.query(
          `UPDATE wallet_snapshots 
           SET money_onhand = money_onhand + ?, 
               points_balance = GREATEST(0, points_balance + ? - ?) 
           ORDER BY id DESC LIMIT 1`,
          [pSold * pricePerPt, pointsGenerated, pSold]
        );
      } else {
        await conn.query(
          `UPDATE wallet_snapshots 
           SET points_balance = points_balance + ? 
           ORDER BY id DESC LIMIT 1`,
          [pointsGenerated]
        );
      }

      await conn.commit();

      return {
        success: true,
        conversionId: convRes.insertId,
        setType: cleanSetType,
        setsConverted: count,
        pointsGenerated,
        totalCostBasis,
        breakevenPerPoint: parseFloat(breakevenPerPoint.toFixed(2)),
        pointsSold: pSold,
        netProfit
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
