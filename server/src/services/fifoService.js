import pool from '../config/db.js';
import { MUSEUM_FLOWERS, MUSEUM_PLUSHIES } from '../constants/tornMuseumItems.js';

export class FIFOService {
  /**
   * Calculate Museum Set Availability, Bottlenecks, and FIFO Set Costs
   */
  static async calculateSetStatus(setType) {
    const isFlower = setType.toLowerCase() === 'flower';
    const targetItems = isFlower ? MUSEUM_FLOWERS : MUSEUM_PLUSHIES;
    const itemIds = targetItems.map(item => item.id);

    // Fetch live items with inventory batches
    const [dbItems] = await pool.query(
      `SELECT i.item_id, i.name, i.country_origin, i.buy_price, i.market_value,
              COALESCE(SUM(b.quantity_remaining), 0) AS quantity_on_hand,
              COALESCE(SUM(b.quantity_remaining * b.unit_cost), 0) AS total_inventory_cost
       FROM torn_items i
       LEFT JOIN inventory_batches b ON i.item_id = b.item_id AND b.quantity_remaining > 0
       WHERE i.item_id IN (?)
       GROUP BY i.item_id`,
      [itemIds]
    );

    const itemsMap = new Map();
    dbItems.forEach(item => {
      itemsMap.set(item.item_id, {
        ...item,
        quantity_on_hand: Number(item.quantity_on_hand),
        total_inventory_cost: Number(item.total_inventory_cost),
        avg_unit_cost: Number(item.quantity_on_hand) > 0 
          ? Number(item.total_inventory_cost) / Number(item.quantity_on_hand) 
          : Number(item.buy_price)
      });
    });

    const itemDetails = targetItems.map(base => {
      const live = itemsMap.get(base.id) || {
        item_id: base.id,
        name: base.name,
        country_origin: base.country,
        buy_price: base.buyPrice,
        market_value: 0,
        quantity_on_hand: 0,
        total_inventory_cost: 0,
        avg_unit_cost: base.buyPrice
      };
      return {
        ...base,
        ...live
      };
    });

    // Max complete sets is limited by the item with minimum quantity
    const quantities = itemDetails.map(it => it.quantity_on_hand);
    const maxSets = Math.min(...quantities);

    // Find bottlenecks (items with lowest quantity)
    const minQuantity = maxSets;
    const bottlenecks = itemDetails.filter(it => it.quantity_on_hand === minQuantity);

    // Calculate FIFO Cost of Goods Sold for next 1 complete set
    let nextSetEstimatedCogs = 0;
    let nextSetMarketValue = 0;

    for (const item of targetItems) {
      nextSetMarketValue += (itemsMap.get(item.id)?.market_value || 0);

      // Fetch oldest available batch for 1 item
      const [oldestBatch] = await pool.query(
        `SELECT unit_cost FROM inventory_batches 
         WHERE item_id = ? AND quantity_remaining > 0 
         ORDER BY purchase_date ASC, id ASC LIMIT 1`,
        [item.id]
      );

      if (oldestBatch && oldestBatch.length > 0) {
        nextSetEstimatedCogs += Number(oldestBatch[0].unit_cost);
      } else {
        // Fallback to foreign buy price
        nextSetEstimatedCogs += Number(item.buyPrice);
      }
    }

    // Default point price: 45,000 Torn Dollars
    const [pointSetting] = await pool.query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'default_point_market_price' LIMIT 1`
    );
    const pointPrice = pointSetting.length > 0 ? Number(pointSetting[0].setting_value) : 45000;
    const pointValuePerSet = 10 * pointPrice; // 10 points per set
    const estimatedProfitPerSet = pointValuePerSet - nextSetEstimatedCogs;
    const estimatedCostPerPoint = nextSetEstimatedCogs / 10;
    const profitMarginPct = pointValuePerSet > 0 ? (estimatedProfitPerSet / pointValuePerSet) * 100 : 0;

    return {
      setType: isFlower ? 'Flower' : 'Plushie',
      totalRequiredItems: targetItems.length,
      maxSets,
      bottlenecks,
      nextSetEstimatedCogs,
      nextSetMarketValue,
      pointPrice,
      pointValuePerSet,
      estimatedCostPerPoint,
      estimatedProfitPerSet,
      profitMarginPct,
      items: itemDetails
    };
  }

  /**
   * Execute Museum Conversion using FIFO inventory consumption
   */
  static async executeMuseumConversion({ setType, setCount, estimatedPointPrice = 45000, notes = '' }) {
    if (!setCount || setCount <= 0) {
      throw new Error('Number of sets must be greater than zero.');
    }

    const isFlower = setType.toLowerCase() === 'flower';
    const targetItems = isFlower ? MUSEUM_FLOWERS : MUSEUM_PLUSHIES;
    const cleanSetType = isFlower ? 'Flower' : 'Plushie';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check stock availability with row-level locks
      for (const item of targetItems) {
        const [stock] = await conn.query(
          `SELECT COALESCE(SUM(quantity_remaining), 0) AS total 
           FROM inventory_batches 
           WHERE item_id = ? AND quantity_remaining > 0 FOR UPDATE`,
          [item.id]
        );
        const available = Number(stock[0]?.total || 0);
        if (available < setCount) {
          throw new Error(`Insufficient inventory for ${item.name}. Required: ${setCount}, Available: ${available}`);
        }
      }

      // Deduct items FIFO and sum COGS
      let totalCogs = 0;
      const deductions = [];

      for (const item of targetItems) {
        let remainingToDeduct = setCount;

        const [batches] = await conn.query(
          `SELECT id, quantity_remaining, unit_cost 
           FROM inventory_batches 
           WHERE item_id = ? AND quantity_remaining > 0 
           ORDER BY purchase_date ASC, id ASC FOR UPDATE`,
          [item.id]
        );

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;

          const batchRemaining = Number(batch.quantity_remaining);
          const deductQty = Math.min(batchRemaining, remainingToDeduct);
          const unitCost = Number(batch.unit_cost);
          const cogs = deductQty * unitCost;

          totalCogs += cogs;
          remainingToDeduct -= deductQty;

          // Update batch
          await conn.query(
            `UPDATE inventory_batches 
             SET quantity_remaining = quantity_remaining - ? 
             WHERE id = ?`,
            [deductQty, batch.id]
          );

          deductions.push({
            batch_id: batch.id,
            item_id: item.id,
            quantity: deductQty,
            unit_cost: unitCost,
            total_cogs: cogs
          });
        }
      }

      const pointsAwarded = setCount * 10;
      const costBasisPerPoint = totalCogs / pointsAwarded;
      const grossEstimatedValue = pointsAwarded * estimatedPointPrice;
      const estimatedProfit = grossEstimatedValue - totalCogs;

      // 1. Insert into museum_conversions
      const [convResult] = await conn.query(
        `INSERT INTO museum_conversions 
         (set_type, sets_converted, points_awarded, total_cogs, cost_basis_per_point, estimated_point_price, estimated_profit, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [cleanSetType, setCount, pointsAwarded, totalCogs, costBasisPerPoint, estimatedPointPrice, estimatedProfit, notes]
      );
      const conversionId = convResult.insertId;

      // 2. Insert deduction audit records
      for (const ded of deductions) {
        await conn.query(
          `INSERT INTO inventory_deductions 
           (batch_id, item_id, deduction_type, reference_id, quantity_deducted, unit_cost, total_cogs)
           VALUES (?, ?, 'MUSEUM_CONVERSION', ?, ?, ?, ?)`,
          [ded.batch_id, ded.item_id, conversionId, ded.quantity, ded.unit_cost, ded.total_cogs]
        );
      }

      // 3. Add to point_ledger for FIFO point tracking
      await conn.query(
        `INSERT INTO point_ledger 
         (source, reference_id, points_acquired, points_remaining, cost_basis_per_point, total_cost_basis, notes)
         VALUES ('MUSEUM_CONVERSION', ?, ?, ?, ?, ?, ?)`,
        [conversionId, pointsAwarded, pointsAwarded, costBasisPerPoint, totalCogs, `Converted ${setCount} ${cleanSetType} Set(s)`]
      );

      // 4. Update user profile points
      await conn.query(
        `UPDATE users_torn_profile SET points = points + ? ORDER BY id ASC LIMIT 1`,
        [pointsAwarded]
      );

      await conn.commit();

      return {
        success: true,
        conversionId,
        setType: cleanSetType,
        setsConverted: setCount,
        pointsAwarded,
        totalCogs,
        costBasisPerPoint,
        estimatedProfit
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Execute Point Sale using FIFO point_ledger consumption
   */
  static async executePointSale({ pointsSold, salePricePerPoint, buyerName = '', fees = 0, notes = '' }) {
    if (!pointsSold || pointsSold <= 0) {
      throw new Error('Points sold must be greater than zero.');
    }
    if (!salePricePerPoint || salePricePerPoint <= 0) {
      throw new Error('Sale price per point must be greater than zero.');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check available points in FIFO ledger
      const [pointPool] = await conn.query(
        `SELECT COALESCE(SUM(points_remaining), 0) AS total_available 
         FROM point_ledger 
         WHERE points_remaining > 0 FOR UPDATE`
      );
      const availablePoints = Number(pointPool[0]?.total_available || 0);

      if (availablePoints < pointsSold) {
        throw new Error(`Insufficient points in ledger. Required: ${pointsSold}, Available: ${availablePoints}`);
      }

      // Consume points FIFO
      let remainingPointsToDeduct = pointsSold;
      let totalPointCogs = 0;

      const [pointBatches] = await conn.query(
        `SELECT id, points_remaining, cost_basis_per_point 
         FROM point_ledger 
         WHERE points_remaining > 0 
         ORDER BY acquired_date ASC, id ASC FOR UPDATE`
      );

      for (const batch of pointBatches) {
        if (remainingPointsToDeduct <= 0) break;

        const batchRemaining = Number(batch.points_remaining);
        const deductQty = Math.min(batchRemaining, remainingPointsToDeduct);
        const costBasis = Number(batch.cost_basis_per_point);
        const cogs = deductQty * costBasis;

        totalPointCogs += cogs;
        remainingPointsToDeduct -= deductQty;

        await conn.query(
          `UPDATE point_ledger 
           SET points_remaining = points_remaining - ? 
           WHERE id = ?`,
          [deductQty, batch.id]
        );
      }

      const grossRevenue = pointsSold * salePricePerPoint;
      const netRevenue = grossRevenue - Number(fees || 0);
      const realizedProfit = netRevenue - totalPointCogs;
      const profitMarginPct = netRevenue > 0 ? (realizedProfit / netRevenue) * 100 : 0;

      // 1. Insert into point_sales
      const [saleResult] = await conn.query(
        `INSERT INTO point_sales 
         (points_sold, sale_price_per_point, gross_revenue, fees, net_revenue, fifo_cogs, realized_profit, profit_margin_pct, buyer_name, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pointsSold, salePricePerPoint, grossRevenue, fees, netRevenue, totalPointCogs, realizedProfit, profitMarginPct, buyerName, notes]
      );
      const saleId = saleResult.insertId;

      // 2. Automatically log to financial_transactions as INCOME
      await conn.query(
        `INSERT INTO financial_transactions 
         (type, category, amount, description, payment_method, reference_type, reference_id, notes)
         VALUES ('INCOME', 'Point Sale', ?, ?, 'Cash on Hand', 'POINT_SALE', ?, ?)`,
        [netRevenue, `Sold ${pointsSold} Museum Points to ${buyerName || 'Trader'} @ $${Number(salePricePerPoint).toLocaleString()}`, saleId, notes]
      );

      // 3. Deduct points from user profile if recorded
      await conn.query(
        `UPDATE users_torn_profile 
         SET points = GREATEST(0, points - ?),
             money_onhand = money_onhand + ? 
         ORDER BY id ASC LIMIT 1`,
        [pointsSold, netRevenue]
      );

      await conn.commit();

      return {
        success: true,
        saleId,
        pointsSold,
        salePricePerPoint,
        grossRevenue,
        fees,
        netRevenue,
        fifoCogs: totalPointCogs,
        realizedProfit,
        profitMarginPct
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Add a new Inventory Batch
   */
  static async addBatch({ itemId, quantity, unitCost, source = 'Abroad', purchaseDate = null, notes = '', logExpense = false, paymentMethod = 'Cash on Hand' }) {
    if (!itemId || !quantity || quantity <= 0) {
      throw new Error('Valid item ID and positive quantity are required.');
    }
    const cost = Number(unitCost) >= 0 ? Number(unitCost) : 0;
    const totalCost = cost * quantity;
    const date = purchaseDate ? new Date(purchaseDate) : new Date();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.query(
        `INSERT INTO inventory_batches 
         (item_id, quantity_bought, quantity_remaining, unit_cost, total_cost, source, purchase_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, quantity, quantity, cost, totalCost, source, date, notes]
      );
      const batchId = res.insertId;

      // Optionally record financial transaction
      if (logExpense && totalCost > 0) {
        const [item] = await conn.query(`SELECT name FROM torn_items WHERE item_id = ?`, [itemId]);
        const itemName = item[0]?.name || `Item #${itemId}`;
        await conn.query(
          `INSERT INTO financial_transactions 
           (type, category, amount, description, payment_method, reference_type, reference_id, transaction_date, notes)
           VALUES ('EXPENSE', 'Item Purchase', ?, ?, ?, 'INVENTORY_PURCHASE', ?, ?, ?)`,
          [totalCost, `Purchased ${quantity}x ${itemName} via ${source}`, paymentMethod, batchId, date, notes]
        );
      }

      await conn.commit();
      return { success: true, batchId, totalCost };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Delete batch if unused
   */
  static async deleteBatch(batchId) {
    const [deductions] = await pool.query(
      `SELECT COUNT(*) AS count FROM inventory_deductions WHERE batch_id = ?`,
      [batchId]
    );
    if (deductions[0].count > 0) {
      throw new Error('Cannot delete this batch because items have already been consumed by museum conversions or sales.');
    }
    await pool.query(`DELETE FROM inventory_batches WHERE id = ?`, [batchId]);
    return { success: true };
  }
}
