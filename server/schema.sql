-- ========================================================
-- Torn Museum & Expense Ledger - MySQL Schema
-- ========================================================

CREATE DATABASE IF NOT EXISTS `torn_ledger_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `torn_ledger_db`;

-- 1. Sync State: Tracks last_log_timestamp (BIGINT) to prevent duplicate log imports
CREATE TABLE IF NOT EXISTS `sync_state` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `last_log_timestamp` BIGINT NOT NULL DEFAULT 0,
    `last_synced_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `legacy_cutoff_date` DATETIME NOT NULL DEFAULT '2026-10-01 00:00:00',
    `travel_json` TEXT NULL
) ENGINE=InnoDB;

-- 2. Inventory Lots (FIFO Batches)
CREATE TABLE IF NOT EXISTS `inventory_lots` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `torn_log_id` VARCHAR(64) UNIQUE NULL, -- prevents duplicate API entries
    `item_id` INT NOT NULL,
    `item_name` VARCHAR(100) NOT NULL,
    `item_type` VARCHAR(40) NOT NULL,
    `source` ENUM('abroad', 'bazaar', 'market', 'trade', 'crime', 'legacy', 'manual') NOT NULL,
    `qty_initial` INT NOT NULL,
    `qty_remaining` INT NOT NULL,
    `unit_cost` BIGINT NOT NULL,
    `purchased_at` DATETIME NOT NULL,
    INDEX `idx_item_remaining` (`item_id`, `qty_remaining`),
    INDEX `idx_purchased_at` (`purchased_at`),
    INDEX `idx_item_type` (`item_type`)
) ENGINE=InnoDB;

-- 3. Point Conversions
CREATE TABLE IF NOT EXISTS `point_conversions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `torn_log_id` VARCHAR(64) UNIQUE NULL,
    `set_type` ENUM('plushie', 'flower') NOT NULL,
    `sets_converted` INT NOT NULL,
    `points_generated` INT NOT NULL, -- 10 points per set
    `total_cost_basis` BIGINT NOT NULL, -- exact FIFO cost of items consumed
    `breakeven_per_point` DECIMAL(12,2) NOT NULL,
    `points_sold` INT DEFAULT 0,
    `sale_price_per_point` BIGINT DEFAULT 0,
    `net_profit` BIGINT DEFAULT 0,
    `converted_at` DATETIME NOT NULL,
    INDEX `idx_converted_at` (`converted_at`)
) ENGINE=InnoDB;

-- 4. Income Ledger
CREATE TABLE IF NOT EXISTS `income_ledger` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `torn_log_id` VARCHAR(64) UNIQUE NULL,
    `category` ENUM(
        'crimes',          -- Crimes 2.0 cash gain only (Log 9015)
        'bazaar_sale',     -- Bazaar customer purchases (Log 1210)
        'trade_income',    -- Personal player trades (Log 4441)
        'points_sale',     -- Points market proceeds (Log 5011)
        'mugging_gain',    -- Attack mug cash (Log 8155)
        'bank_interest',   -- City bank maturation payout (Log 1000/1001)
        'company_pay',     -- Job paycheck
        'faction_payout',  -- Faction bank payouts
        'manual'           -- Custom entry
    ) NOT NULL,
    `amount` BIGINT NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `metadata_json` JSON NULL,
    `logged_at` DATETIME NOT NULL,
    INDEX `idx_inc_category` (`category`),
    INDEX `idx_inc_logged_at` (`logged_at`)
) ENGINE=InnoDB;

-- 5. Expenses Ledger
CREATE TABLE IF NOT EXISTS `expenses_ledger` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `torn_log_id` VARCHAR(64) UNIQUE NULL,
    `category` ENUM('rent', 'upkeep', 'happy_jump', 'mug_loss', 'travel', 'vault_deposit', 'other') NOT NULL,
    `amount` BIGINT NOT NULL,
    `description` VARCHAR(255),
    `logged_at` DATETIME NOT NULL,
    INDEX `idx_category` (`category`),
    INDEX `idx_logged_at` (`logged_at`)
) ENGINE=InnoDB;

-- 6. Wallet Snapshots
CREATE TABLE IF NOT EXISTS `wallet_snapshots` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `money_onhand` BIGINT NOT NULL DEFAULT 0,
    `vault_amount` BIGINT NOT NULL DEFAULT 0,
    `faction_vault_amount` BIGINT NOT NULL DEFAULT 0,
    `city_bank_amount` BIGINT NOT NULL DEFAULT 0,
    `property_vault_amount` BIGINT NOT NULL DEFAULT 0,
    `points_balance` INT NOT NULL DEFAULT 0,
    `current_market_point_price` INT NOT NULL DEFAULT 45000,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB;

-- 7. Pending Trade Review Queue
CREATE TABLE IF NOT EXISTS `pending_trades` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `torn_log_id` VARCHAR(64) UNIQUE NULL,
    `trader_name` VARCHAR(100),
    `total_cash_paid` BIGINT NOT NULL,
    `items_json` JSON NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. Master Items Cache (all 1,503 Torn items with live market value)
CREATE TABLE IF NOT EXISTS `master_items_cache` (
    `item_id` INT PRIMARY KEY,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `item_type` VARCHAR(40) NOT NULL,
    `weapon_type` VARCHAR(40) NULL,
    `buy_price` BIGINT NOT NULL DEFAULT 0,
    `sell_price` BIGINT NOT NULL DEFAULT 0,
    `market_value` BIGINT NOT NULL DEFAULT 0,
    `circulation` BIGINT NOT NULL DEFAULT 0,
    `image_url` VARCHAR(255) NULL,
    `is_tradeable` BOOLEAN NOT NULL DEFAULT TRUE,
    `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_master_type` (`item_type`),
    INDEX `idx_master_name` (`name`),
    INDEX `idx_market_value` (`market_value`)
) ENGINE=InnoDB;

-- ========================================================
-- INITIAL STATE
-- ========================================================

-- Initialize Sync State (starts at timestamp 0 to import full history on first sync)
INSERT INTO `sync_state` (`id`, `last_log_timestamp`) VALUES (1, 0)
ON DUPLICATE KEY UPDATE `id`=`id`;

