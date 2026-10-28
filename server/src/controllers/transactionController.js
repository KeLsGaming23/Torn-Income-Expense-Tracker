import pool from '../config/db.js';
import { TRANSACTION_CATEGORIES } from '../constants/tornMuseumItems.js';

export class TransactionController {
  /**
   * GET /api/transactions
   */
  static async getTransactions(req, res) {
    try {
      const { type, category, startDate, endDate, search, limit = 50, page = 1 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      let whereConditions = [];
      let params = [];

      if (type && (type === 'INCOME' || type === 'EXPENSE')) {
        whereConditions.push('type = ?');
        params.push(type);
      }
      if (category) {
        whereConditions.push('category = ?');
        params.push(category);
      }
      if (startDate) {
        whereConditions.push('transaction_date >= ?');
        params.push(startDate);
      }
      if (endDate) {
        whereConditions.push('transaction_date <= ?');
        params.push(endDate);
      }
      if (search) {
        whereConditions.push('(description LIKE ? OR notes LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get count and aggregates
      const [summary] = await pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
           COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense,
           COUNT(*) AS total_count
         FROM financial_transactions ${whereClause}`,
        params
      );

      // Get rows
      const [rows] = await pool.query(
        `SELECT * FROM financial_transactions 
         ${whereClause} 
         ORDER BY transaction_date DESC, id DESC 
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit, 10), offset]
      );

      const totalIncome = Number(summary[0]?.total_income || 0);
      const totalExpense = Number(summary[0]?.total_expense || 0);
      const netCashflow = totalIncome - totalExpense;
      const totalCount = Number(summary[0]?.total_count || 0);

      res.json({
        success: true,
        summary: {
          totalIncome,
          totalExpense,
          netCashflow,
          totalCount,
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(totalCount / parseInt(limit, 10))
        },
        transactions: rows
      });
    } catch (err) {
      console.error('getTransactions error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/transactions
   */
  static async createTransaction(req, res) {
    try {
      const { type, category, amount, description, paymentMethod = 'Cash on Hand', transactionDate, notes } = req.body;

      if (!type || !category || !amount || !description) {
        return res.status(400).json({ success: false, message: 'Type, category, amount, and description are required.' });
      }

      const date = transactionDate ? new Date(transactionDate) : new Date();

      const [result] = await pool.query(
        `INSERT INTO financial_transactions 
         (type, category, amount, description, payment_method, transaction_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, category, parseFloat(amount), description, paymentMethod, date, notes || null]
      );

      res.json({ success: true, transactionId: result.insertId });
    } catch (err) {
      console.error('createTransaction error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * PUT /api/transactions/:id
   */
  static async updateTransaction(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const { type, category, amount, description, paymentMethod, transactionDate, notes } = req.body;

      await pool.query(
        `UPDATE financial_transactions 
         SET type = ?, category = ?, amount = ?, description = ?, payment_method = ?, transaction_date = ?, notes = ?
         WHERE id = ?`,
        [type, category, parseFloat(amount), description, paymentMethod, new Date(transactionDate), notes || null, id]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('updateTransaction error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/transactions/:id
   */
  static async deleteTransaction(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      await pool.query(`DELETE FROM financial_transactions WHERE id = ?`, [id]);
      res.json({ success: true });
    } catch (err) {
      console.error('deleteTransaction error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/transactions/categories
   */
  static async getCategories(req, res) {
    res.json({
      success: true,
      categories: TRANSACTION_CATEGORIES
    });
  }
}
