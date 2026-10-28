-- ========================================================
-- Torn Museum & Expense Ledger Database Schema
-- Compatible with MySQL 8.0+ and MariaDB 10.4+
-- ========================================================

CREATE DATABASE IF NOT EXISTS `torn_ledger_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `torn_ledger_db`;

-- 1. App Configuration & Settings
CREATE TABLE IF NOT EXISTS `app_settings` (
    `setting_key` VARCHAR(50) PRIMARY KEY,
    `setting_value` TEXT NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Torn User Profile Cache
CREATE TABLE IF NOT EXISTS `users_torn_profile` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `player_id` INT NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `level` INT DEFAULT 1,
    `gender` VARCHAR(20) DEFAULT 'Unknown',
    `points` INT DEFAULT 0,
    `money_onhand` BIGINT DEFAULT 0,
    `city_bank_amount` BIGINT DEFAULT 0,
    `daily_networth` BIGINT DEFAULT 0,
    `travel_status` JSON NULL,
    `last_synced_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Catalog of Torn Museum & Travel Items (Flowers, Plushies, etc.)
CREATE TABLE IF NOT EXISTS `torn_items` (
    `item_id` INT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `item_type` ENUM('Flower', 'Plushie', 'Drug', 'Booster', 'Medical', 'Other') NOT NULL DEFAULT 'Other',
    `buy_price` INT DEFAULT 0,
    `market_value` INT DEFAULT 0,
    `country_origin` VARCHAR(100) DEFAULT 'Torn',
    `set_type` ENUM('Flower', 'Plushie', 'None') NOT NULL DEFAULT 'None',
    `image_url` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. FIFO Inventory Batches (Purchased Flowers & Plushies)
CREATE TABLE IF NOT EXISTS `inventory_batches` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `item_id` INT NOT NULL,
    `quantity_bought` INT NOT NULL,
    `quantity_remaining` INT NOT NULL,
    `unit_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `source` ENUM('Abroad', 'Bazaar', 'Item Market', 'Trade', 'Gift', 'Import', 'Other') NOT NULL DEFAULT 'Abroad',
    `purchase_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`item_id`) REFERENCES `torn_items`(`item_id`) ON DELETE RESTRICT,
    INDEX `idx_item_remaining` (`item_id`, `quantity_remaining`),
    INDEX `idx_purchase_date` (`purchase_date`)
) ENGINE=InnoDB;

-- 5. Museum Conversion Runs (Sets converted to Points)
CREATE TABLE IF NOT EXISTS `museum_conversions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `set_type` ENUM('Flower', 'Plushie') NOT NULL,
    `sets_converted` INT NOT NULL,
    `points_awarded` INT NOT NULL, -- 10 points per set
    `total_cogs` DECIMAL(14, 2) NOT NULL, -- FIFO Cost of Goods Sold
    `cost_basis_per_point` DECIMAL(14, 4) NOT NULL, -- total_cogs / points_awarded
    `estimated_point_price` DECIMAL(14, 2) NOT NULL DEFAULT 45000.00,
    `estimated_profit` DECIMAL(14, 2) NOT NULL,
    `conversion_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. FIFO Item Deductions Audit Log (Tracks which batch supplied each conversion or sale)
CREATE TABLE IF NOT EXISTS `inventory_deductions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_id` INT NOT NULL,
    `item_id` INT NOT NULL,
    `deduction_type` ENUM('MUSEUM_CONVERSION', 'SALE', 'LOSS', 'ADJUSTMENT') NOT NULL,
    `reference_id` INT NULL, -- e.g. museum_conversions.id or financial_transactions.id
    `quantity_deducted` INT NOT NULL,
    `unit_cost` DECIMAL(14, 2) NOT NULL,
    `total_cogs` DECIMAL(14, 2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`item_id`) REFERENCES `torn_items`(`item_id`) ON DELETE RESTRICT,
    INDEX `idx_ref_type` (`deduction_type`, `reference_id`)
) ENGINE=InnoDB;

-- 7. Point Inventory Ledger (FIFO tracking of museum points and other points)
CREATE TABLE IF NOT EXISTS `point_ledger` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `source` ENUM('MUSEUM_CONVERSION', 'PURCHASE', 'INITIAL_SYNC', 'OTHER') NOT NULL,
    `reference_id` INT NULL, -- e.g. museum_conversions.id
    `points_acquired` INT NOT NULL,
    `points_remaining` INT NOT NULL,
    `cost_basis_per_point` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    `total_cost_basis` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `acquired_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_points_remaining` (`points_remaining`)
) ENGINE=InnoDB;

-- 8. Point Sales (Tracking realized profit against FIFO point cost basis)
CREATE TABLE IF NOT EXISTS `point_sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `points_sold` INT NOT NULL,
    `sale_price_per_point` DECIMAL(14, 2) NOT NULL,
    `gross_revenue` DECIMAL(14, 2) NOT NULL,
    `fees` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `net_revenue` DECIMAL(14, 2) NOT NULL,
    `fifo_cogs` DECIMAL(14, 2) NOT NULL, -- Total cost of points from point_ledger
    `realized_profit` DECIMAL(14, 2) NOT NULL,
    `profit_margin_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `buyer_name` VARCHAR(100) NULL,
    `sale_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. General Income & Operational Expenses
CREATE TABLE IF NOT EXISTS `financial_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `payment_method` ENUM('Cash on Hand', 'City Bank', 'Cayman Bank', 'Vault', 'Other') NOT NULL DEFAULT 'Cash on Hand',
    `reference_type` VARCHAR(50) NULL, -- 'POINT_SALE', 'INVENTORY_PURCHASE', 'TRAVEL', etc.
    `reference_id` INT NULL,
    `transaction_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_tx_date` (`transaction_date`),
    INDEX `idx_tx_type_cat` (`type`, `category`)
) ENGINE=InnoDB;

-- 10. Synchronization Logs
CREATE TABLE IF NOT EXISTS `sync_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sync_type` VARCHAR(50) NOT NULL, -- 'TORN_USER', 'ITEM_PRICES', 'ALL'
    `status` ENUM('SUCCESS', 'WARNING', 'ERROR') NOT NULL,
    `records_affected` INT DEFAULT 0,
    `message` TEXT NULL,
    `execution_time_ms` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ========================================================
-- SEED DATA: 11 EXOTIC FLOWERS & 13 PLUSHIES
-- ========================================================

-- Insert standard Museum Flowers (11 Exotic Travel Flowers)
INSERT INTO `torn_items` (`item_id`, `name`, `item_type`, `buy_price`, `market_value`, `country_origin`, `set_type`) VALUES
(282, 'African Violet', 'Flower', 2000, 50970, 'South Africa', 'Flower'),
(617, 'Banana Orchid', 'Flower', 4000, 7934, 'Cayman Islands', 'Flower'),
(271, 'Ceibo Flower', 'Flower', 500, 30908, 'Argentina', 'Flower'),
(277, 'Cherry Blossom', 'Flower', 500, 35780, 'Japan', 'Flower'),
(263, 'Crocus', 'Flower', 600, 3513, 'Canada', 'Flower'),
(260, 'Dahlia', 'Flower', 300, 2327, 'Mexico', 'Flower'),
(272, 'Edelweiss', 'Flower', 900, 16008, 'Switzerland', 'Flower'),
(267, 'Heather', 'Flower', 5000, 34376, 'United Kingdom', 'Flower'),
(264, 'Orchid', 'Flower', 700, 3424, 'Hawaii', 'Flower'),
(276, 'Peony', 'Flower', 5000, 53083, 'China', 'Flower'),
(385, 'Tribulus Omanense', 'Flower', 6000, 59816, 'United Arab Emirates', 'Flower')
ON DUPLICATE KEY UPDATE 
    `name`=VALUES(`name`), `country_origin`=VALUES(`country_origin`), `set_type`=VALUES(`set_type`);

-- Insert standard Museum Plushies (13 Plushies)
INSERT INTO `torn_items` (`item_id`, `name`, `item_type`, `buy_price`, `market_value`, `country_origin`, `set_type`) VALUES
(186, 'Sheep Plushie', 'Plushie', 25, 484, 'Torn (General)', 'Plushie'),
(187, 'Teddy Bear Plushie', 'Plushie', 30, 482, 'Torn (General)', 'Plushie'),
(215, 'Kitten Plushie', 'Plushie', 50, 501, 'Torn (General)', 'Plushie'),
(258, 'Jaguar Plushie', 'Plushie', 10000, 13082, 'Mexico', 'Plushie'),
(261, 'Wolverine Plushie', 'Plushie', 30, 4057, 'Canada', 'Plushie'),
(266, 'Nessie Plushie', 'Plushie', 200, 29607, 'United Kingdom', 'Plushie'),
(268, 'Red Fox Plushie', 'Plushie', 1000, 30379, 'United Kingdom', 'Plushie'),
(269, 'Monkey Plushie', 'Plushie', 400, 31058, 'Argentina', 'Plushie'),
(273, 'Chamois Plushie', 'Plushie', 400, 14089, 'Switzerland', 'Plushie'),
(274, 'Panda Plushie', 'Plushie', 400, 51869, 'China', 'Plushie'),
(281, 'Lion Plushie', 'Plushie', 400, 50499, 'South Africa', 'Plushie'),
(384, 'Camel Plushie', 'Plushie', 14000, 69931, 'United Arab Emirates', 'Plushie'),
(618, 'Stingray Plushie', 'Plushie', 400, 4710, 'Cayman Islands', 'Plushie')
ON DUPLICATE KEY UPDATE 
    `name`=VALUES(`name`), `country_origin`=VALUES(`country_origin`), `set_type`=VALUES(`set_type`);

-- Seed Default Settings
INSERT INTO `app_settings` (`setting_key`, `setting_value`, `description`) VALUES
('default_point_market_price', '45000', 'Default market selling price per Torn Museum Point'),
('point_refill_value', '45000', 'Value of point for refills comparison'),
('sync_interval_seconds', '120', 'Automatic background sync polling interval in seconds'),
('theme', 'dark', 'User interface theme')
ON DUPLICATE KEY UPDATE `setting_key`=`setting_key`;

-- Seed Sample Data for initial realistic preview
-- 1. Initial User Profile
INSERT INTO `users_torn_profile` (`player_id`, `name`, `level`, `points`, `money_onhand`, `daily_networth`, `last_synced_at`)
VALUES (4161786, 'KeLsGaming23', 34, 34, 2558177, 208417216, NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `points`=VALUES(`points`);

-- 2. Initial Sample Flower Batches
INSERT INTO `inventory_batches` (`item_id`, `quantity_bought`, `quantity_remaining`, `unit_cost`, `total_cost`, `source`, `purchase_date`, `notes`) VALUES
(282, 10, 10, 2000.00, 20000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 3 DAY), 'South Africa run'),
(617, 12, 12, 4000.00, 48000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Cayman run'),
(271, 15, 15, 500.00, 7500.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Argentina run'),
(277, 10, 10, 500.00, 5000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Japan run'),
(263, 10, 10, 600.00, 6000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Canada run'),
(260, 20, 20, 300.00, 6000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Mexico run'),
(272, 10, 10, 900.00, 9000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Switzerland run'),
(267, 8, 8, 5000.00, 40000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 1 DAY), 'UK run'),
(264, 14, 14, 700.00, 9800.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Hawaii run'),
(276, 7, 7, 5000.00, 35000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 12 HOUR), 'China run'),
(385, 9, 9, 6000.00, 54000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 6 HOUR), 'UAE run');

-- 3. Initial Sample Plushie Batches
INSERT INTO `inventory_batches` (`item_id`, `quantity_bought`, `quantity_remaining`, `unit_cost`, `total_cost`, `source`, `purchase_date`, `notes`) VALUES
(186, 25, 25, 25.00, 625.00, 'Bazaar', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Bits n Bobs'),
(187, 25, 25, 30.00, 750.00, 'Bazaar', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Bits n Bobs'),
(215, 25, 25, 50.00, 1250.00, 'Bazaar', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Bits n Bobs'),
(258, 8, 8, 10000.00, 80000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Mexico plushie'),
(261, 15, 15, 30.00, 450.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 4 DAY), 'Canada plushie'),
(266, 6, 6, 200.00, 1200.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 3 DAY), 'UK Nessie'),
(268, 6, 6, 1000.00, 6000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 3 DAY), 'UK Red Fox'),
(269, 10, 10, 400.00, 4000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Argentina monkey'),
(273, 9, 9, 400.00, 3600.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Switzerland chamois'),
(274, 5, 5, 400.00, 2000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 2 DAY), 'China panda'),
(281, 7, 7, 400.00, 2800.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 1 DAY), 'South Africa lion'),
(384, 5, 5, 14000.00, 70000.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 1 DAY), 'UAE camel'),
(618, 11, 11, 400.00, 4400.00, 'Abroad', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Cayman stingray');

-- 4. Initial Sample Transactions (Operational Expenses & Incomes)
INSERT INTO `financial_transactions` (`type`, `category`, `amount`, `description`, `payment_method`, `transaction_date`, `notes`) VALUES
('EXPENSE', 'Travel Expense', 35000.00, 'Private Jet Flight to South Africa', 'Cash on Hand', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Round trip travel'),
('EXPENSE', 'Travel Expense', 30000.00, 'Flight to UAE', 'Cash on Hand', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Camel & Tribulus run'),
('EXPENSE', 'Rehab Switzerland', 250000.00, 'Rehab in Switzerland (10% Addiction)', 'Cash on Hand', DATE_SUB(NOW(), INTERVAL 2 DAY), 'Addiction wipe'),
('EXPENSE', 'Drugs & Boosters', 840000.00, 'Purchased 1x Xanax for training', 'Cash on Hand', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Item market purchase'),
('EXPENSE', 'Property Upkeep', 150000.00, 'Private Island Daily Staff & Upkeep', 'City Bank', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Daily estate fees'),
('INCOME', 'Point Sale', 900000.00, 'Sold 20 Museum Points @ $45,000 each', 'Cash on Hand', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Direct trade with buyer'),
('INCOME', 'Item Sale', 320000.00, 'Bazaar Sale: 8x African Violet', 'Cash on Hand', DATE_SUB(NOW(), INTERVAL 12 HOUR), 'Bazaar customer sale'),
('INCOME', 'Bank Interest', 1250000.00, 'City Bank 2-Week Investment Interest', 'City Bank', DATE_SUB(NOW(), INTERVAL 6 HOUR), 'Matured bank deposit');
