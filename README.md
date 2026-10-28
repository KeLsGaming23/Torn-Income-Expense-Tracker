# Torn Museum & Expense Ledger (Full-Stack Web App + Android PWA)

A production-ready, full-stack financial ledger and FIFO inventory management system engineered specifically for players of **Torn City** ([torn.com](https://torn.com)).

The application tracks operational expenses (flights, Switzerland rehab, Xanax drug runs, property upkeep, bazaar fees), manages flower and plushie batches using **FIFO (First-In, First-Out)** inventory accounting, computes exact cost-of-goods-sold (COGS) for Museum set conversions into Points, monitors live Torn API data, and runs as an installable **Progressive Web App (PWA)** on Android Chrome and desktop browsers.

---

## 🚀 Key Features

### 1. FIFO Museum Set Inventory & Point Conversion
- **The 11 Exotic Travel Flowers Set:** African Violet (South Africa), Banana Orchid (Cayman Islands), Ceibo Flower (Argentina), Cherry Blossom (Japan), Crocus (Canada), Dahlia (Mexico), Edelweiss (Switzerland), Heather (UK), Orchid (Hawaii), Peony (China), Tribulus Omanense (UAE).
- **The 13 Plushies Set:** Sheep Plushie, Teddy Bear Plushie, Kitten Plushie, Jaguar Plushie (Mexico), Wolverine Plushie (Canada), Nessie Plushie (UK), Red Fox Plushie (UK), Monkey Plushie (Argentina), Chamois Plushie (Switzerland), Panda Plushie (China), Lion Plushie (South Africa), Camel Plushie (UAE), Stingray Plushie (Cayman Islands).
- **FIFO Engine:** Deducts required items from the oldest purchased batches first. Calculates exact Acquisition Cost per set, cost basis per point (`Set COGS / 10`), and real-time realized profit upon point sales.
- **Bottleneck Detection:** Automatically identifies and alerts you to bottleneck items that are preventing you from completing more full sets.

### 2. Comprehensive Financial Ledger
- **Operational Expenses:** Travel flights, Switzerland rehab addiction resets, medical revives, drug training (Xanax, Ecstasy), property staff upkeep, and bazaar fees.
- **Income Streams:** Museum Point sales, item bazaar sales, mugging/bounties, city bank investments, stock dividends, and crimes.
- **Filtering & Audit:** Filter by Income/Expense, category, date range, search descriptions, and export to CSV.

### 3. Torn API Live Synchronization
- Automated background sync worker via `node-cron` every `SYNC_INTERVAL_SECONDS` (default: 120s).
- Live synchronization of:
  - User profile, level, player ID, and rank
  - Money on hand, City Bank investment amount, and daily net worth
  - Travel status (destination, method, departure time, remaining flight time)
  - Real-time Torn item market prices and foreign buy costs.

### 4. Travel Run Profitability Calculator
- Simulates travel runs across all 11 destinations.
- Configurable capacity (up to 29 items with Private Island Airstrip, Large Suitcase, and perks).
- Computes round-trip duration, profit per run, and **Profit per Hour** efficiency rating.
- 1-click batch import directly into FIFO inventory.

### 5. Interactive Visual Analytics (Recharts)
- 30-Day Cash Flow & Net Profit timeline area chart.
- Expense category distribution donut chart.
- Income streams breakdown.
- Museum Set conversion volume and historical ROI comparison.

### 6. Android Mobile PWA (Progressive Web App)
- Configured with `manifest.json` and `sw.js` (Service Worker).
- Standalone display mode with dark theme `#0a0d14` and emerald `#10b981` accents.
- Responsive touch navigation with mobile bottom navigation bar.
- Offline shell caching and prompt banner for Android Chrome "Add to Home Screen".

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js (ESM), `mysql2/promise` (connection pooling), `dotenv`, `cors`, `axios`, `node-cron`.
- **Database:** MySQL / MariaDB (complete `database/schema.sql` initialization script).
- **Frontend:** React 18 (Vite), Tailwind CSS, Lucide React (icons), Recharts (visual analytics), Axios.
- **Mobile Support:** PWA Web App Manifest, Service Worker offline caching, Android Chrome standalone install prompt.

---

## 📁 Directory Structure

```
Torn-Income-Expense-Tracker/
├── server/
│   ├── .env                       # Local backend environment variables
│   ├── .env.example               # Example template
│   ├── package.json
│   └── src/
│       ├── config/
│       │   └── db.js              # MySQL connection pool
│       ├── constants/
│       │   └── tornMuseumItems.js # 11 flowers & 13 plushies reference definitions
│       ├── controllers/
│       │   ├── analyticsController.js
│       │   ├── inventoryController.js
│       │   ├── museumController.js
│       │   ├── tornApiController.js
│       │   └── transactionController.js
│       ├── routes/
│       │   ├── analyticsRoutes.js
│       │   ├── inventoryRoutes.js
│       │   ├── museumRoutes.js
│       │   ├── tornApiRoutes.js
│       │   └── transactionRoutes.js
│       ├── services/
│       │   ├── cronService.js     # node-cron background sync scheduler
│       │   ├── fifoService.js     # First-In, First-Out ledger calculations
│       │   └── tornSyncService.js # Official Torn API integration
│       └── index.js               # Express application entrypoint
├── database/
│   └── schema.sql                 # Complete SQL schema & seed data
├── client/
│   ├── public/
│   │   ├── icon.svg
│   │   ├── icon-192.png           # Android PWA 192x192 icon
│   │   ├── icon-512.png           # Android PWA 512x512 icon
│   │   ├── manifest.json          # Web App Manifest
│   │   └── sw.js                  # Service Worker
│   ├── src/
│   │   ├── api/index.js           # Axios API service
│   │   ├── components/            # Navbar, Sidebar, MobileNav, Modal, StatCard, PWA prompt
│   │   ├── context/TornDataContext.jsx
│   │   ├── pages/
│   │   │   ├── Analytics.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── MuseumSets.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Transactions.jsx
│   │   │   └── TravelCalculator.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. Database Setup (MySQL / MariaDB)

1. Make sure your MySQL or MariaDB service is running.
2. Create the database and import `database/schema.sql`:

```bash
# Using MySQL CLI:
mysql -u root -p < database/schema.sql

# In PowerShell:
Get-Content database/schema.sql -Raw | mysql -u root -p torn_ledger_db
```

### 2. Backend Server Configuration

1. Navigate to the `/server` directory:
   ```bash
   cd server
   ```
2. Copy `.env.example` to `.env` (or verify existing `.env`):
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=torn_ledger_db
   TORN_API_KEY=your_torn_api_key_here
   SYNC_INTERVAL_SECONDS=120
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   # Or for development with live reload:
   npm run dev
   ```

### 3. Frontend Client Configuration

1. Navigate to the `/client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Or build for production:
   ```bash
   npm run build
   ```
   *(The Express backend automatically serves `client/dist` when built!)*

---

## 📱 Android PWA Installation ("Add to Home Screen")

1. Open `http://<your-server-ip>:5000` or the hosted URL in **Google Chrome** on your Android smartphone.
2. Chrome will detect the `manifest.json` and Service Worker.
3. Tap the **"Install PWA"** banner on top of the app, or tap Chrome's menu (⋮) -> **"Install app"** / **"Add to Home screen"**.
4. The Torn Ledger icon will be installed onto your home screen and run as a full-screen, standalone application.

---

## 🔌 API Endpoints Reference

### Museum Sets & Points
- `GET /api/museum/sets` - Get Flower & Plushie sets status, completion counts, bottleneck items, and FIFO cost basis.
- `POST /api/museum/convert` - Convert sets into Museum Points using atomic FIFO inventory deductions.
- `GET /api/museum/conversions` - Historical museum conversion runs and item deduction audit trail.
- `POST /api/museum/sell-points` - Sell points against FIFO point ledger batches with realized profit tracking.
- `GET /api/museum/point-ledger` - View available point batches and historical point sales.

### Inventory (FIFO)
- `GET /api/inventory` - Get inventory stock, unit cost basis, and active batches.
- `POST /api/inventory/batch` - Add a new item batch (with optional automatic expense recording).
- `DELETE /api/inventory/batch/:id` - Delete an unused batch.
- `GET /api/inventory/deductions` - Audit log of FIFO consumed items.
- `GET /api/inventory/catalog` - Catalog of all tracked Torn museum items.

### Financial Transactions & Ledger
- `GET /api/transactions` - Filterable ledger transactions (pagination, category, date range, search).
- `POST /api/transactions` - Record an income or operational expense.
- `PUT /api/transactions/:id` - Update transaction details.
- `DELETE /api/transactions/:id` - Delete transaction.
- `GET /api/transactions/categories` - Standard Torn expense and income categories.

### Analytics & Torn Sync
- `GET /api/analytics/dashboard` - Executive KPI summary metrics.
- `GET /api/analytics/trends` - 30-day cash flow timeline data for Recharts.
- `GET /api/analytics/breakdown` - Expense and income category distribution data.
- `GET /api/analytics/museum-comparison` - Flower vs Plushie conversion profitability comparison.
- `GET /api/torn/status` - Live sync status and user profile data.
- `POST /api/torn/sync` - Trigger an immediate manual sync with Torn API.
- `POST /api/torn/settings` - Update point market value default or sync polling interval.
