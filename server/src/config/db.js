import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../server/.env') });
dotenv.config(); // fallback to cwd

let poolConfig;

if (process.env.DATABASE_URL) {
  const isSslDisabled = process.env.DB_SSL === 'false';
  poolConfig = {
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: '+00:00',
    ssl: isSslDisabled ? undefined : {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true
    }
  };
} else {
  const isCloudHost = process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST.toLowerCase());
  const useSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require' || isCloudHost;

  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'torn_ledger_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: '+00:00',
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined
  };
}

const pool = mysql.createPool(poolConfig);

// Auto-initialize schema if tables do not exist
async function initSchema(connection) {
  try {
    const [tables] = await connection.query(`SHOW TABLES LIKE 'sync_state'`);
    if (tables.length === 0) {
      console.log('[Database] New database detected. Initializing schema from schema.sql...');
      const schemaPath = path.resolve(__dirname, '../../schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        // Split by semicolon ignoring comments
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

        for (const statement of statements) {
          try {
            await connection.query(statement);
          } catch (stmtErr) {
            console.warn('[Database Init] Warning on statement:', stmtErr.message);
          }
        }
        console.log('[Database] Schema initialization complete!');
      }
    }

    // Incremental migrations check: Ensure income_ledger exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS income_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        torn_log_id VARCHAR(64) UNIQUE NULL,
        category ENUM(
          'crimes',
          'bazaar_sale',
          'trade_income',
          'points_sale',
          'mugging_gain',
          'bank_interest',
          'company_pay',
          'faction_payout',
          'manual'
        ) NOT NULL,
        amount BIGINT NOT NULL,
        description VARCHAR(255) NOT NULL,
        metadata_json JSON NULL,
        logged_at DATETIME NOT NULL,
        INDEX idx_inc_category (category),
        INDEX idx_inc_logged_at (logged_at)
      ) ENGINE=InnoDB;
    `);

    // Ensure wallet_snapshots has new columns
    const [cols] = await connection.query(`SHOW COLUMNS FROM wallet_snapshots`);
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('faction_vault_amount')) {
      await connection.query(`ALTER TABLE wallet_snapshots ADD COLUMN faction_vault_amount BIGINT NOT NULL DEFAULT 0 AFTER vault_amount`);
    }
    if (!colNames.includes('city_bank_amount')) {
      await connection.query(`ALTER TABLE wallet_snapshots ADD COLUMN city_bank_amount BIGINT NOT NULL DEFAULT 0 AFTER faction_vault_amount`);
    }
    if (!colNames.includes('property_vault_amount')) {
      await connection.query(`ALTER TABLE wallet_snapshots ADD COLUMN property_vault_amount BIGINT NOT NULL DEFAULT 0 AFTER city_bank_amount`);
    }
  } catch (err) {
    console.warn('[Database] Schema check error:', err.message);
  }
}

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME || 'torn_ledger_db'})`);
    await initSchema(connection);
    connection.release();
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
  }
})();

export default pool;
