import pool from '../config/db.js';
import { FIFOService } from '../services/fifoService.js';

export class MuseumController {
  /**
   * GET /api/museum/sets
   */
  static async getSets(req, res) {
    try {
      const flowers = await FIFOService.calculateSetStatus('flower');
      const plushies = await FIFOService.calculateSetStatus('plushie');

      // Fetch user profile points and money
      const [profile] = await pool.query(
        `SELECT player_id, name, points, money_onhand, daily_networth, last_synced_at 
         FROM users_torn_profile ORDER BY id ASC LIMIT 1`
      );

      // Fetch points in FIFO point ledger
      const [pointPool] = await pool.query(
        `SELECT COALESCE(SUM(points_remaining), 0) AS available_points,
                COALESCE(SUM(points_remaining * cost_basis_per_point), 0) AS total_point_cogs
         FROM point_ledger WHERE points_remaining > 0`
      );

      const availablePoints = Number(pointPool[0]?.available_points || 0);
      const totalPointCogs = Number(pointPool[0]?.total_point_cogs || 0);
      const avgPointCostBasis = availablePoints > 0 ? totalPointCogs / availablePoints : 0;

      res.json({
        success: true,
        user: profile[0] || null,
        pointLedger: {
          availablePoints,
          totalPointCogs,
          avgPointCostBasis
        },
        sets: {
          flower: flowers,
          plushie: plushies
        }
      });
    } catch (err) {
      console.error('getSets error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/museum/convert
   */
  static async convertSets(req, res) {
    try {
      const { setType, setCount, estimatedPointPrice, notes } = req.body;
      const result = await FIFOService.executeMuseumConversion({
        setType,
        setCount: parseInt(setCount, 10),
        estimatedPointPrice: estimatedPointPrice ? parseFloat(estimatedPointPrice) : 45000,
        notes
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('convertSets error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/museum/conversions
   */
  static async getConversions(req, res) {
    try {
      const [conversions] = await pool.query(
        `SELECT c.*,
                (SELECT JSON_ARRAYAGG(
                   JSON_OBJECT(
                     'item_id', d.item_id,
                     'name', i.name,
                     'quantity', d.quantity_deducted,
                     'unit_cost', d.unit_cost,
                     'total_cogs', d.total_cogs
                   )
                 )
                 FROM inventory_deductions d
                 JOIN torn_items i ON d.item_id = i.item_id
                 WHERE d.reference_id = c.id AND d.deduction_type = 'MUSEUM_CONVERSION'
                ) AS consumed_items
         FROM museum_conversions c
         ORDER BY c.conversion_date DESC
         LIMIT 50`
      );
      res.json({ success: true, conversions });
    } catch (err) {
      console.error('getConversions error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/museum/sell-points
   */
  static async sellPoints(req, res) {
    try {
      const { pointsSold, salePricePerPoint, buyerName, fees, notes } = req.body;
      const result = await FIFOService.executePointSale({
        pointsSold: parseInt(pointsSold, 10),
        salePricePerPoint: parseFloat(salePricePerPoint),
        buyerName,
        fees: fees ? parseFloat(fees) : 0,
        notes
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('sellPoints error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/museum/point-ledger
   */
  static async getPointLedger(req, res) {
    try {
      const [batches] = await pool.query(
        `SELECT * FROM point_ledger ORDER BY acquired_date DESC LIMIT 50`
      );
      const [sales] = await pool.query(
        `SELECT * FROM point_sales ORDER BY sale_date DESC LIMIT 50`
      );
      res.json({ success: true, batches, sales });
    } catch (err) {
      console.error('getPointLedger error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
