import cron from 'node-cron';
import { TornSyncService } from './tornSyncService.js';
import dotenv from 'dotenv';

dotenv.config();

export function setupCronScheduler() {
  const syncInterval = parseInt(process.env.SYNC_INTERVAL_SECONDS || '120', 10);
  const minutes = Math.max(1, Math.round(syncInterval / 60));

  console.log(`[Scheduler] Initializing automated Torn sync job (every ${minutes} min / ${syncInterval}s)...`);

  // Run initial sync after a short delay so server has booted
  setTimeout(async () => {
    try {
      console.log('[Scheduler] Running initial boot sync with Torn API...');
      await TornSyncService.runFullSync();
      console.log('[Scheduler] Initial boot sync complete.');
    } catch (err) {
      console.warn('[Scheduler] Initial boot sync notice:', err.message);
    }
  }, 5000);

  // Schedule recurring cron job (every N minutes)
  const cronExpr = `*/${minutes} * * * *`;
  cron.schedule(cronExpr, async () => {
    try {
      console.log(`[Scheduler] Executing scheduled Torn sync (${new Date().toLocaleTimeString()})...`);
      await TornSyncService.runFullSync();
    } catch (err) {
      console.error('[Scheduler] Scheduled sync failed:', err.message);
    }
  });
}
