import pool from '../config/db.js';
import { FIFOService } from '../services/fifoService.js';

export class AnalyticsController {
  /**
   * GET /api/analytics/dashboard
   */
  static async getDashboardOverview(req, res) {
    try {
      // 1. Torn Profile
      const [profile] = await pool.query(
        `SELECT player_id, name, level, points, money_onhand, city_bank_amount, daily_networth, travel_status, last_synced_at 
         FROM users_torn_profile ORDER BY id ASC LIMIT 1`
      );

      // 2. Financial totals
      const [finances] = await pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
           COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
         FROM financial_transactions`
      );
      const totalIncome = Number(finances[0]?.total_income || 0);
      const totalExpense = Number(finances[0]?.total_expense || 0);
      const netProfit = totalIncome - totalExpense;

      // 3. FIFO Point Ledger totals
      const [pointStats] = await pool.query(
        `SELECT 
           COALESCE(SUM(points_remaining), 0) AS available_points,
           COALESCE(SUM(points_remaining * cost_basis_per_point), 0) AS points_inventory_cost
         FROM point_ledger WHERE points_remaining > 0`
      );
      const availablePoints = Number(pointStats[0]?.available_points || 0);
      const pointsInventoryCost = Number(pointStats[0]?.points_inventory_cost || 0);
      const avgPointCostBasis = availablePoints > 0 ? pointsInventoryCost / availablePoints : 0;

      // 4. Point Sales Realized Profit
      const [saleStats] = await pool.query(
        `SELECT 
           COALESCE(SUM(points_sold), 0) AS total_points_sold,
           COALESCE(SUM(net_revenue), 0) AS total_point_revenue,
           COALESCE(SUM(fifo_cogs), 0) AS total_point_cogs,
           COALESCE(SUM(realized_profit), 0) AS total_point_profit
         FROM point_sales`
      );

      // 5. Museum sets readiness
      const flowerStatus = await FIFOService.calculateSetStatus('flower');
      const plushieStatus = await FIFOService.calculateSetStatus('plushie');

      // 6. Physical items inventory value
      const [itemValuation] = await pool.query(
        `SELECT 
           COALESCE(SUM(b.quantity_remaining), 0) AS total_items_count,
           COALESCE(SUM(b.quantity_remaining * b.unit_cost), 0) AS total_item_cost_basis,
           COALESCE(SUM(b.quantity_remaining * i.market_value), 0) AS total_item_market_value
         FROM inventory_batches b
         JOIN torn_items i ON b.item_id = i.item_id
         WHERE b.quantity_remaining > 0`
      );

      res.json({
        success: true,
        profile: profile[0] || null,
        finances: {
          totalIncome,
          totalExpense,
          netProfit,
          profitMarginPct: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
        },
        points: {
          availablePoints,
          pointsInventoryCost,
          avgPointCostBasis,
          totalPointsSold: Number(saleStats[0]?.total_points_sold || 0),
          realizedPointProfit: Number(saleStats[0]?.total_point_profit || 0)
        },
        sets: {
          flowerReady: flowerStatus.maxSets,
          flowerBottlenecks: flowerStatus.bottlenecks.map(b => b.name),
          flowerNextSetCost: flowerStatus.nextSetEstimatedCogs,
          flowerEstProfit: flowerStatus.estimatedProfitPerSet,
          plushieReady: plushieStatus.maxSets,
          plushieBottlenecks: plushieStatus.bottlenecks.map(b => b.name),
          plushieNextSetCost: plushieStatus.nextSetEstimatedCogs,
          plushieEstProfit: plushieStatus.estimatedProfitPerSet
        },
        inventory: {
          totalItemsCount: Number(itemValuation[0]?.total_items_count || 0),
          totalItemCostBasis: Number(itemValuation[0]?.total_item_cost_basis || 0),
          totalItemMarketValue: Number(itemValuation[0]?.total_item_market_value || 0)
        }
      });
    } catch (err) {
      console.error('getDashboardOverview error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/analytics/trends
   * Daily or monthly financial timeline trends for Recharts
   */
  static async getTrends(req, res) {
    try {
      const [timeline] = await pool.query(
        `SELECT 
           DATE(transaction_date) AS date,
           COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expense
         FROM financial_transactions
         WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(transaction_date)
         ORDER BY date ASC`
      );

      const formatted = timeline.map(row => ({
        date: row.date,
        income: Number(row.income),
        expense: Number(row.expense),
        net: Number(row.income) - Number(row.expense)
      }));

      res.json({ success: true, trends: formatted });
    } catch (err) {
      console.error('getTrends error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/analytics/breakdown
   * Categories breakdown for donut charts
   */
  static async getBreakdown(req, res) {
    try {
      const [expenses] = await pool.query(
        `SELECT category, SUM(amount) AS total
         FROM financial_transactions
         WHERE type = 'EXPENSE'
         GROUP BY category
         ORDER BY total DESC`
      );

      const [incomes] = await pool.query(
        `SELECT category, SUM(amount) AS total
         FROM financial_transactions
         WHERE type = 'INCOME'
         GROUP BY category
         ORDER BY total DESC`
      );

      res.json({
        success: true,
        expenses: expenses.map(e => ({ name: e.category, value: Number(e.total) })),
        incomes: incomes.map(i => ({ name: i.category, value: Number(i.total) }))
      });
    } catch (err) {
      console.error('getBreakdown error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/analytics/museum-comparison
   */
  static async getMuseumComparison(req, res) {
    try {
      const [stats] = await pool.query(
        `SELECT set_type,
                COUNT(*) AS total_runs,
                SUM(sets_converted) AS total_sets,
                SUM(points_awarded) AS total_points,
                SUM(total_cogs) AS total_cogs,
                AVG(cost_basis_per_point) AS avg_cost_per_point,
                SUM(estimated_profit) AS total_estimated_profit
         FROM museum_conversions
         GROUP BY set_type`
      );

      res.json({ success: true, stats });
    } catch (err) {
      console.error('getMuseumComparison error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
