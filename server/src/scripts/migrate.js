import pool from '../config/db.js';

async function migrate() {
  try {
    console.log('[Migration] Starting database migration...');

    // 1. Create income_ledger
    await pool.query(`
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
    console.log('[Migration] Table `income_ledger` ready.');

    // 2. Check and add columns on wallet_snapshots
    const [cols] = await pool.query(`SHOW COLUMNS FROM wallet_snapshots`);
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('faction_vault_amount')) {
      await pool.query(`ALTER TABLE wallet_snapshots ADD COLUMN faction_vault_amount BIGINT NOT NULL DEFAULT 0 AFTER vault_amount`);
      console.log('[Migration] Added column `faction_vault_amount`.');
    }

    if (!colNames.includes('city_bank_amount')) {
      await pool.query(`ALTER TABLE wallet_snapshots ADD COLUMN city_bank_amount BIGINT NOT NULL DEFAULT 0 AFTER faction_vault_amount`);
      console.log('[Migration] Added column `city_bank_amount`.');
    }

    if (!colNames.includes('property_vault_amount')) {
      await pool.query(`ALTER TABLE wallet_snapshots ADD COLUMN property_vault_amount BIGINT NOT NULL DEFAULT 0 AFTER city_bank_amount`);
      console.log('[Migration] Added column `property_vault_amount`.');
    }

    // 3. Purge fake happy_jump drug expenses (faction benefits)
    const [purgeRes] = await pool.query(`DELETE FROM expenses_ledger WHERE category = 'happy_jump'`);
    console.log(`[Migration] Purged ${purgeRes.affectedRows} faction drug expenses from expenses_ledger.`);

    console.log('[Migration] All migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  }
}

migrate();
