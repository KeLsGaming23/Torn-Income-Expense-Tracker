import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';

import pool from './config/db.js';
import { TornSyncService } from './services/tornSyncService.js';
import { FIFOEngine } from './services/fifoEngine.js';
import { ALL_MUSEUM_ITEMS_MAP, PLUSHIE_SET, FLOWER_SET } from './constants/masterItems.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Content Security Policy header middleware
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline'; font-src * data:; img-src * data: blob:; connect-src * 'unsafe-inline' ws: wss:;"
  );
  next();
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ==========================================
// 1. TORN SYNC ENDPOINTS
// ==========================================

// Trigger manual sync or cron (supports ?deepSync=true)
app.post('/api/sync', async (req, res) => {
  try {
    const deepSync = req.body?.deepSync === true || req.query?.deepSync === 'true';
    const result = await TornSyncService.syncAll({ deepSync });
    res.json(result);
  } catch (err) {
    console.error('[Sync Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Sync Status & Current Wallet
app.get('/api/sync/status', async (req, res) => {
  try {
    const [state] = await pool.query(`SELECT * FROM sync_state WHERE id = 1`);
    const [wallet] = await pool.query(`SELECT * FROM wallet_snapshots ORDER BY id DESC LIMIT 1`);
    let travelInfo = null;
    if (state[0]?.travel_json) {
      try { travelInfo = JSON.parse(state[0].travel_json); } catch (e) {}
    }
    res.json({
      success: true,
      syncState: state[0] || null,
      travelInfo,
      wallet: wallet[0] || { money_onhand: 0, vault_amount: 0, points_balance: 0, current_market_point_price: 45000 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. MUSEUM & FIFO ENGINE ENDPOINTS
// ==========================================

// Simulate / Calculate Set Readiness & Pricing
app.get('/api/museum/simulate', async (req, res) => {
  try {
    const { setType = 'plushie', setCount } = req.query;
    const result = await FIFOEngine.simulate({ setType, setCount });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Simulate Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Execute Museum Conversion (FIFO deduction)
app.post('/api/museum/convert', async (req, res) => {
  try {
    const { setType = 'plushie', setsToConvert = 1, salePricePerPoint = 0, pointsSold = 0 } = req.body;
    const result = await FIFOEngine.convert({ setType, setsToConvert, salePricePerPoint, pointsSold });
    res.json(result);
  } catch (err) {
    console.error('[Convert Error]', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Conversion Runs History
app.get('/api/museum/conversions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM point_conversions ORDER BY converted_at DESC LIMIT 100`
    );
    res.json({ success: true, conversions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Live Points Market Listings & Metrics
app.get('/api/market/points-live', async (req, res) => {
  try {
    const apiKey = process.env.TORN_API_KEY || 'vVZGrKSwrXNtcGKi';
    let listings = [];
    try {
      const apiRes = await axios.get(`https://api.torn.com/market/?selections=pointsmarket&key=${apiKey}`, { timeout: 8000 });
      listings = Object.values(apiRes.data.pointsmarket || {});
    } catch (e) {
      console.warn('[Market] Torn API live points fetch failed:', e.message);
    }

    if (listings.length === 0) {
      const [snap] = await pool.query(`SELECT current_market_point_price FROM wallet_snapshots ORDER BY id DESC LIMIT 1`);
      const fallbackPrice = Number(snap[0]?.current_market_point_price) || 31500;
      return res.json({
        success: true,
        source: 'cached',
        lowestListing: fallbackPrice,
        averageTop10: fallbackPrice,
        topListings: []
      });
    }

    listings.sort((a, b) => Number(a.cost) - Number(b.cost));
    const lowestListing = Number(listings[0]?.cost || 31500);
    const top10 = listings.slice(0, 10);
    const avgTop10 = Math.round(top10.reduce((acc, l) => acc + Number(l.cost), 0) / top10.length);

    res.json({
      success: true,
      source: 'live',
      lowestListing,
      averageTop10: avgTop10,
      topListings: top10.map(l => ({
        cost: Number(l.cost),
        quantity: Number(l.quantity),
        totalCost: Number(l.total_cost)
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. INVENTORY LOTS & LEFTOVERS VAULT
// ==========================================

// Get all inventory lots (with leftover tracking)
app.get('/api/inventory/lots', async (req, res) => {
  try {
    const { itemType, leftoverOnly = 'true', search } = req.query;
    let query = `SELECT * FROM inventory_lots WHERE 1=1`;
    const params = [];

    if (leftoverOnly === 'true') {
      query += ` AND qty_remaining > 0`;
    }
    if (itemType) {
      query += ` AND item_type = ?`;
      params.push(itemType);
    }
    if (search) {
      query += ` AND item_name LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY purchased_at DESC, id DESC`;

    const [lots] = await pool.query(query, params);

    // Calculate leftover inventory valuation
    let totalLeftoverUnits = 0;
    let totalLeftoverCostBasis = 0;
    lots.forEach(lot => {
      totalLeftoverUnits += Number(lot.qty_remaining);
      totalLeftoverCostBasis += Number(lot.qty_remaining) * Number(lot.unit_cost);
    });

    res.json({
      success: true,
      summary: {
        totalLeftoverUnits,
        totalLeftoverCostBasis
      },
      lots
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manual Purchase / Trade Entry
app.post('/api/inventory/lots', async (req, res) => {
  try {
    const { itemId, source = 'manual', qty, unitCost, purchasedAt } = req.body;
    const museumItem = ALL_MUSEUM_ITEMS_MAP.get(parseInt(itemId, 10));

    if (!museumItem) {
      return res.status(400).json({ success: false, message: 'Invalid flower or plushie item selected.' });
    }

    const quantity = parseInt(qty, 10);
    const cost = Number(unitCost);

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than zero.' });
    }

    const date = purchasedAt ? new Date(purchasedAt) : new Date();

    const [result] = await pool.query(
      `INSERT INTO inventory_lots 
       (torn_log_id, item_id, item_name, item_type, source, qty_initial, qty_remaining, unit_cost, purchased_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [null, museumItem.id, museumItem.name, museumItem.type, source, quantity, quantity, cost, date]
    );

    res.json({ success: true, lotId: result.insertId });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete lot
app.delete('/api/inventory/lots/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM inventory_lots WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Master items reference list
app.get('/api/inventory/master-items', (req, res) => {
  res.json({
    success: true,
    plushies: PLUSHIE_SET,
    flowers: FLOWER_SET
  });
});

// ==========================================
// 4. EXPENSES LEDGER & VAULT TRACKER
// ==========================================

// Get expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const { category, startDate, endDate, limit = 100 } = req.query;
    let query = `SELECT * FROM expenses_ledger WHERE 1=1`;
    const params = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (startDate) {
      query += ` AND logged_at >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND logged_at <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY logged_at DESC, id DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);

    // Sum by category for pie/donut chart
    const [breakdown] = await pool.query(
      `SELECT category, SUM(amount) AS total 
       FROM expenses_ledger 
       GROUP BY category 
       ORDER BY total DESC`
    );

    const [totalSum] = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses_ledger`);

    res.json({
      success: true,
      totalExpenses: Number(totalSum[0]?.total || 0),
      breakdown: breakdown.map(b => ({ category: b.category, amount: Number(b.total) })),
      expenses: rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Quick-log expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { category, amount, description, loggedAt } = req.body;
    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and amount are required.' });
    }

    const date = loggedAt ? new Date(loggedAt) : new Date();

    const [result] = await pool.query(
      `INSERT INTO expenses_ledger (category, amount, description, logged_at)
       VALUES (?, ?, ?, ?)`,
      [category, Number(amount), description || `${category} expense`, date]
    );

    // If vault deposit, update snapshot
    if (category === 'vault_deposit') {
      await pool.query(
        `UPDATE wallet_snapshots 
         SET money_onhand = GREATEST(0, money_onhand - ?),
             vault_amount = vault_amount + ? 
         ORDER BY id DESC LIMIT 1`,
        [Number(amount), Number(amount)]
      );
    }

    res.json({ success: true, expenseId: result.insertId });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query(`DELETE FROM expenses_ledger WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. COMMAND CENTER (DASHBOARD)
// ==========================================

app.get('/api/dashboard/command-center', async (req, res) => {
  try {
    // 1. Wallet & Mug Risk
    const [walletRows] = await pool.query(`SELECT * FROM wallet_snapshots ORDER BY id DESC LIMIT 1`);
    const wallet = walletRows[0] || {
      money_onhand: 2558177,
      vault_amount: 73094400,
      points_balance: 34,
      current_market_point_price: 45000
    };

    const moneyOnHand = Number(wallet.money_onhand);
    const vaultAmount = Number(wallet.vault_amount);
    const pointsBalance = Number(wallet.points_balance);
    const pointPrice = Number(wallet.current_market_point_price);

    // Mug Risk calculation: threshold is $500,000 cash on hand
    const safeThreshold = 500000;
    const isMugRiskHigh = moneyOnHand > safeThreshold;
    const totalCash = moneyOnHand + vaultAmount;
    const protectedRatio = totalCash > 0 ? (vaultAmount / totalCash) * 100 : 100;

    // 2. Active Leftover Inventory Value
    const [invRows] = await pool.query(
      `SELECT COALESCE(SUM(qty_remaining), 0) AS total_units,
              COALESCE(SUM(qty_remaining * unit_cost), 0) AS total_cost_basis
       FROM inventory_lots WHERE qty_remaining > 0`
    );
    const activeLeftoverUnits = Number(invRows[0]?.total_units || 0);
    const activeLeftoverValue = Number(invRows[0]?.total_cost_basis || 0);

    // 3. Monthly Net Profit from Point Conversions
    const [profitRows] = await pool.query(
      `SELECT COALESCE(SUM(net_profit), 0) AS total_profit,
              COALESCE(SUM(points_generated), 0) AS total_points_gen
       FROM point_conversions 
       WHERE converted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const monthlyNetProfit = Number(profitRows[0]?.total_profit || 0);

    // 4. Total Monthly Expenses
    const [expRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expense 
       FROM expenses_ledger 
       WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    const monthlyExpenses = Number(expRows[0]?.total_expense || 0);

    // 5. Total Points Value
    const totalPointsValue = pointsBalance * pointPrice;

    // 6. Visual Chart: ComposedChart (Daily Museum Profit vs Operational Expenses)
    const [chartData] = await pool.query(
      `SELECT 
         dates.d AS date,
         COALESCE(p.profit, 0) AS museum_profit,
         COALESCE(e.expense, 0) AS operational_expense
       FROM (
         SELECT DATE(DATE_SUB(NOW(), INTERVAL n DAY)) AS d
         FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
               UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
               UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14) days
       ) dates
       LEFT JOIN (
         SELECT DATE(converted_at) AS cd, SUM(net_profit) AS profit
         FROM point_conversions
         GROUP BY DATE(converted_at)
       ) p ON dates.d = p.cd
       LEFT JOIN (
         SELECT DATE(logged_at) AS ld, SUM(amount) AS expense
         FROM expenses_ledger
         GROUP BY DATE(logged_at)
       ) e ON dates.d = e.ld
       ORDER BY dates.d ASC`
    );

    // 7. Check ready sets for preview
    const flowerSim = await FIFOEngine.simulate({ setType: 'flower', setCount: 1 });
    const plushieSim = await FIFOEngine.simulate({ setType: 'plushie', setCount: 1 });

    // 8. Fetch travel status
    const [stateRows] = await pool.query(`SELECT travel_json, last_synced_at FROM sync_state WHERE id = 1`);
    let travelInfo = null;
    if (stateRows[0]?.travel_json) {
      try { travelInfo = JSON.parse(stateRows[0].travel_json); } catch (e) {}
    }

    res.json({
      success: true,
      travelInfo,
      lastSyncedAt: stateRows[0]?.last_synced_at || null,
      mugRisk: {
        moneyOnHand,
        vaultAmount,
        totalCash,
        protectedRatio,
        isMugRiskHigh,
        safeThreshold
      },
      kpis: {
        monthlyNetProfit,
        totalPointsValue,
        pointsBalance,
        activeLeftoverValue,
        activeLeftoverUnits,
        monthlyExpenses,
        netCashflow: monthlyNetProfit - monthlyExpenses
      },
      setsReady: {
        flower: flowerSim.maxSets,
        plushie: plushieSim.maxSets
      },
      chartData: chartData.map(c => ({
        date: c.date,
        museum_profit: Number(c.museum_profit),
        operational_expense: Number(c.operational_expense)
      }))
    });
  } catch (err) {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend static build if exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error] Unhandled:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  let dbTarget = process.env.DB_NAME || 'torn_ledger_db';
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      dbTarget = `${u.host}${u.pathname}`;
    } catch (e) {
      dbTarget = 'Cloud Database (DATABASE_URL)';
    }
  }

  console.log(`====================================================`);
  console.log(` Torn Ledger Server running on port ${PORT}`);
  console.log(` Database: ${dbTarget}`);
  console.log(`====================================================`);

  // Background Auto-Sync Interval
  const syncIntervalSec = parseInt(process.env.SYNC_INTERVAL_SECONDS || '120', 10);
  if (syncIntervalSec > 0) {
    console.log(`[AutoSync] Background polling active every ${syncIntervalSec} seconds.`);
    setInterval(async () => {
      try {
        const res = await TornSyncService.syncAll();
        if (res.importedLots > 0 || res.importedExpenses > 0) {
          console.log(`[AutoSync] Imported ${res.importedLots} new lots, ${res.importedExpenses} new expenses.`);
        }
      } catch (e) {
        console.warn('[AutoSync] Background sync notice:', e.message);
      }
    }, syncIntervalSec * 1000);
  }
});
