import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'torn_ledger_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: '+00:00'
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME || 'torn_ledger_db'})`);
    connection.release();
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
  }
})();

export default pool;
