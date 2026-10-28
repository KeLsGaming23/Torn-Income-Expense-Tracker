import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { triggerSync, getSyncStatus, getCommandCenterData } from '../api';

const TornDataContext = createContext();

export const TornDataProvider = ({ children }) => {
  const [commandData, setCommandData] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Capture Android PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('[PWA] beforeinstallprompt event captured');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      showToast('success', 'Torn Ledger installed as standalone PWA app!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchStatusAndData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [cmdRes, syncRes] = await Promise.all([
        getCommandCenterData(),
        getSyncStatus()
      ]);

      if (cmdRes.success) setCommandData(cmdRes);
      if (syncRes.success) setSyncStatus(syncRes);
    } catch (err) {
      console.error('Error fetching command center data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const handleSyncTorn = async () => {
    try {
      setSyncing(true);
      const res = await triggerSync();
      if (res.success) {
        showToast('success', `Torn API Sync Complete: ${res.importedLots} new lots, ${res.importedExpenses} new expenses.`);
        await fetchStatusAndData(true);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      showToast('error', `Torn API Sync Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const promptPWAInstall = async () => {
    if (!installPrompt) {
      showToast('info', 'To install on Android: Tap Chrome menu (⋮) -> "Install App" or "Add to Home screen".');
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  useEffect(() => {
    fetchStatusAndData();
    const interval = setInterval(() => {
      fetchStatusAndData(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchStatusAndData]);

  return (
    <TornDataContext.Provider
      value={{
        commandData,
        syncStatus,
        loading,
        syncing,
        toast,
        showToast,
        syncTorn: handleSyncTorn,
        refresh: fetchStatusAndData,
        installPrompt,
        isInstalled,
        promptPWAInstall
      }}
    >
      {children}
    </TornDataContext.Provider>
  );
};

export const useTornData = () => useContext(TornDataContext);
