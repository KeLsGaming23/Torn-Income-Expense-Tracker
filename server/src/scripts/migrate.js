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

    // 4. Create master_items_cache
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_items_cache (
        item_id INT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        description TEXT NULL,
        item_type VARCHAR(40) NOT NULL,
        weapon_type VARCHAR(40) NULL,
        buy_price BIGINT NOT NULL DEFAULT 0,
        sell_price BIGINT NOT NULL DEFAULT 0,
        market_value BIGINT NOT NULL DEFAULT 0,
        circulation BIGINT NOT NULL DEFAULT 0,
        image_url VARCHAR(255) NULL,
        is_tradeable BOOLEAN NOT NULL DEFAULT TRUE,
        last_synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_master_type (item_type),
        INDEX idx_master_name (name),
        INDEX idx_market_value (market_value)
      ) ENGINE=InnoDB;
    `);
    console.log('[Migration] Table `master_items_cache` ready.');

    // 5. Update inventory_lots schema
    try {
      await pool.query(`ALTER TABLE inventory_lots MODIFY COLUMN item_type VARCHAR(40) NOT NULL`);
      await pool.query(`ALTER TABLE inventory_lots MODIFY COLUMN source ENUM('abroad', 'bazaar', 'market', 'trade', 'crime', 'legacy', 'manual') NOT NULL`);
      console.log('[Migration] `inventory_lots` columns expanded.');
    } catch (e) {
      console.log('[Migration] `inventory_lots` update notice:', e.message);
    }

    // 6. Update sync_state
    try {
      const [syncCols] = await pool.query(`SHOW COLUMNS FROM sync_state`);
      const syncColNames = syncCols.map(c => c.Field);
      if (!syncColNames.includes('legacy_cutoff_date')) {
        await pool.query(`ALTER TABLE sync_state ADD COLUMN legacy_cutoff_date DATETIME NOT NULL DEFAULT '2026-10-01 00:00:00' AFTER last_synced_at`);
        console.log('[Migration] Added column `legacy_cutoff_date`.');
      }
    } catch (syncErr) {
      // Ignore if already added
    }

    // 7. Enforce October 1st Cutoff Rule on existing inventory lots
    const [legacyRes] = await pool.query(`
      UPDATE inventory_lots 
      SET source = 'legacy', unit_cost = 0 
      WHERE purchased_at < '2026-10-01 00:00:00' AND source != 'legacy'
    `);
    console.log(`[Migration] Tagged ${legacyRes.affectedRows} pre-Oct 1 items as legacy ($0 cost basis).`);

    console.log('[Migration] All migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  }
}

migrate();
