import pool from '../config/db.js';
import { TornSyncService } from '../services/tornSyncService.js';

export class TornApiController {
  /**
   * GET /api/torn/status
   */
  static async getStatus(req, res) {
    try {
      const [profile] = await pool.query(
        `SELECT * FROM users_torn_profile ORDER BY id ASC LIMIT 1`
      );
      const [latestLog] = await pool.query(
        `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 5`
      );
      const [settings] = await pool.query(
        `SELECT * FROM app_settings`
      );

      res.json({
        success: true,
        user: profile[0] || null,
        latestLogs: latestLog,
        settings: settings.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }), {})
      });
    } catch (err) {
      console.error('getStatus error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/torn/sync
   */
  static async triggerSync(req, res) {
    try {
      const result = await TornSyncService.runFullSync();
      res.json({ success: true, message: 'Synchronization completed successfully.', ...result });
    } catch (err) {
      console.error('triggerSync error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/torn/settings
   */
  static async updateSettings(req, res) {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, message: 'Settings object is required.' });
      }

      for (const [key, val] of Object.entries(settings)) {
        await pool.query(
          `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(val)]
        );
      }

      res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (err) {
      console.error('updateSettings error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
