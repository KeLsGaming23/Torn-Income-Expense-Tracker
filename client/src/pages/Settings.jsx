import React, { useState, useEffect } from 'react';
import { getTornStatus, updateAppSettings } from '../api';
import { useTornData } from '../context/TornDataContext';
import { 
  Settings as SettingsIcon, 
  Key, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Server,
  Save,
  Clock
} from 'lucide-react';

export default function Settings() {
  const { showToast, syncWithTorn, syncing, isInstalled, triggerInstall } = useTornData();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pointPrice, setPointPrice] = useState('45000');
  const [syncInterval, setSyncInterval] = useState('120');
  const [saving, setSaving] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getTornStatus();
      if (res.success) {
        setStatusData(res);
        if (res.settings?.default_point_market_price) {
          setPointPrice(res.settings.default_point_market_price);
        }
        if (res.settings?.sync_interval_seconds) {
          setSyncInterval(res.settings.sync_interval_seconds);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateAppSettings({
        settings: {
          default_point_market_price: pointPrice,
          sync_interval_seconds: syncInterval
        }
      });
      showToast('success', 'Settings updated successfully');
      await fetchStatus();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const user = statusData?.user;
  const logs = statusData?.latestLogs || [];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-slate-400" />
          Settings & Torn API Integration
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Configure API credentials, point valuation defaults, auto-sync intervals, and PWA options.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: API & App Settings */}
        <div className="space-y-5">
          
          {/* Torn API Connection Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-emerald-400" />
                Torn API Connection
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Connected
              </span>
            </div>

            <div className="space-y-2 bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Player Profile:</span>
                <span className="font-bold text-white">{user?.name} [{user?.player_id}]</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Level:</span>
                <span className="font-bold text-slate-200">Level {user?.level}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Last Torn Sync:</span>
                <span className="font-mono text-emerald-400">
                  {user?.last_synced_at ? new Date(user.last_synced_at).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>

            <button
              onClick={syncWithTorn}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing Torn API...' : 'Test & Sync Torn Data Now'}</span>
            </button>
          </div>

          {/* Ledger Preferences Form */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              Ledger & Point Valuation Settings
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default Point Market Value ($):
                </label>
                <input
                  type="number"
                  value={pointPrice}
                  onChange={(e) => setPointPrice(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used as default selling price when converting museum sets into points.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Background Auto-Sync Interval (Seconds):
                </label>
                <input
                  type="number"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(e.target.value)}
                  min="30"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  How often node-cron fetches live player stats and market prices (default: 120s).
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-indigo-950/20 transition-all"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Android PWA & Diagnostics */}
        <div className="space-y-5">
          
          {/* PWA Mobile Setup Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-400" />
              Android Mobile PWA Status
            </h3>

            <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Installation Mode:</span>
                <span className={`font-bold ${isInstalled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isInstalled ? 'Installed Standalone App' : 'Web Browser Tab'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Service Worker:</span>
                <span className="font-mono text-emerald-400">Active (sw.js v1.0)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Offline Shell Caching:</span>
                <span className="font-mono text-emerald-400">Enabled</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-300">How to install on Android Chrome:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Open this web page in Google Chrome on your Android device.</li>
                <li>Tap the three vertical dots (⋮) in the top-right corner.</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>The app icon will appear on your phone home screen as a native standalone application.</li>
              </ol>
            </div>

            {!isInstalled && (
              <button
                onClick={triggerInstall}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Smartphone className="h-4 w-4" />
                <span>Launch Android Install Prompt</span>
              </button>
            )}
          </div>

          {/* Recent Sync Logs */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-400" />
              Recent Synchronization Logs
            </h3>

            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="font-bold text-slate-200">{log.sync_type}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">{log.message}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {log.execution_time_ms}ms
                    </span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">No sync logs recorded yet.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
