import pool from '../config/db.js';
import { FIFOService } from '../services/fifoService.js';

export class InventoryController {
  /**
   * GET /api/inventory
   * Returns items with total stock, current market value, and active FIFO batches
   */
  static async getInventory(req, res) {
    try {
      const { category } = req.query; // 'Flower', 'Plushie', or all

      let query = `
        SELECT i.item_id, i.name, i.item_type, i.country_origin, i.buy_price, i.market_value, i.set_type,
               COALESCE(SUM(b.quantity_remaining), 0) AS quantity_on_hand,
               COALESCE(SUM(b.quantity_remaining * b.unit_cost), 0) AS total_cost_basis,
               COALESCE(SUM(b.quantity_remaining * i.market_value), 0) AS total_market_value
        FROM torn_items i
        LEFT JOIN inventory_batches b ON i.item_id = b.item_id AND b.quantity_remaining > 0
      `;
      const params = [];

      if (category && (category === 'Flower' || category === 'Plushie')) {
        query += ` WHERE i.set_type = ?`;
        params.push(category);
      }

      query += ` GROUP BY i.item_id ORDER BY i.set_type ASC, i.name ASC`;

      const [items] = await pool.query(query, params);

      // Fetch active batches
      const [batches] = await pool.query(
        `SELECT b.*, i.name AS item_name, i.set_type, i.country_origin, i.market_value
         FROM inventory_batches b
         JOIN torn_items i ON b.item_id = i.item_id
         WHERE b.quantity_remaining > 0
         ORDER BY b.purchase_date DESC`
      );

      // Calculate totals
      let totalInventoryCost = 0;
      let totalInventoryMarketVal = 0;
      let totalUnits = 0;

      items.forEach(it => {
        totalInventoryCost += Number(it.total_cost_basis || 0);
        totalInventoryMarketVal += Number(it.total_market_value || 0);
        totalUnits += Number(it.quantity_on_hand || 0);
      });

      res.json({
        success: true,
        summary: {
          totalUnits,
          totalInventoryCost,
          totalInventoryMarketVal,
          potentialUnrealizedGain: totalInventoryMarketVal - totalInventoryCost
        },
        items,
        batches
      });
    } catch (err) {
      console.error('getInventory error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/inventory/batch
   */
  static async addBatch(req, res) {
    try {
      const { itemId, quantity, unitCost, source, purchaseDate, notes, logExpense, paymentMethod } = req.body;
      const result = await FIFOService.addBatch({
        itemId: parseInt(itemId, 10),
        quantity: parseInt(quantity, 10),
        unitCost: parseFloat(unitCost),
        source,
        purchaseDate,
        notes,
        logExpense: Boolean(logExpense),
        paymentMethod
      });
      res.json(result);
    } catch (err) {
      console.error('addBatch error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/inventory/batch/:id
   */
  static async deleteBatch(req, res) {
    try {
      const batchId = parseInt(req.params.id, 10);
      const result = await FIFOService.deleteBatch(batchId);
      res.json(result);
    } catch (err) {
      console.error('deleteBatch error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/inventory/deductions
   */
  static async getDeductions(req, res) {
    try {
      const [deductions] = await pool.query(
        `SELECT d.*, i.name AS item_name, i.set_type, b.source AS batch_source, b.purchase_date AS batch_purchase_date
         FROM inventory_deductions d
         JOIN torn_items i ON d.item_id = i.item_id
         JOIN inventory_batches b ON d.batch_id = b.id
         ORDER BY d.created_at DESC
         LIMIT 100`
      );
      res.json({ success: true, deductions });
    } catch (err) {
      console.error('getDeductions error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/inventory/catalog
   */
  static async getCatalog(req, res) {
    try {
      const [items] = await pool.query(
        `SELECT * FROM torn_items ORDER BY set_type ASC, name ASC`
      );
      res.json({ success: true, items });
    } catch (err) {
      console.error('getCatalog error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
