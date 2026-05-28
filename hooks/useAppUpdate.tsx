import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchUpdateInfo, UpdateInfo, UpdateStatus } from '@/lib/remoteConfig';
import { DISMISSED_UPDATE_KEY } from '@/lib/storage-keys';
import { UpdateModal } from '@/components/UpdateModal';

interface AppUpdateContextType {
  /** True while a check is in flight (auto or manual). */
  checking: boolean;
  /**
   * Runs a manual check and returns the resolved status. A relevant result
   * (forced/optional) pops the modal; 'none' lets the caller report
   * "up to date".
   */
  checkForUpdate: () => Promise<UpdateStatus>;
}

const AppUpdateContext = createContext<AppUpdateContextType>({
  checking: false,
  checkForUpdate: async () => 'none',
});

export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);

  const run = useCallback(async (manual: boolean): Promise<UpdateStatus> => {
    setChecking(true);
    try {
      const result = await fetchUpdateInfo();
      setInfo(result);

      if (result.status === 'forced') {
        setVisible(true);
      } else if (result.status === 'optional') {
        if (manual) {
          setVisible(true);
        } else {
          // Auto-check: only prompt once per latest_version.
          const dismissed = await AsyncStorage.getItem(DISMISSED_UPDATE_KEY).catch(() => null);
          if (dismissed !== result.latestVersion) setVisible(true);
        }
      } else {
        setVisible(false);
      }
      return result.status;
    } catch (e) {
      // Native module missing (pre-rebuild), offline, or web — never fatal.
      console.warn('[update] check failed:', e);
      return 'none';
    } finally {
      setChecking(false);
    }
  }, []);

  // Check once on app open.
  useEffect(() => {
    run(false);
  }, [run]);

  const handleDismiss = useCallback(async () => {
    if (info?.status === 'optional' && info.latestVersion) {
      await AsyncStorage.setItem(DISMISSED_UPDATE_KEY, info.latestVersion).catch(() => {});
    }
    setVisible(false);
  }, [info]);

  const checkForUpdate = useCallback(() => run(true), [run]);

  return (
    <AppUpdateContext.Provider value={{ checking, checkForUpdate }}>
      {children}
      {info && info.status !== 'none' && (
        <UpdateModal
          visible={visible}
          info={info}
          onDismiss={info.status === 'forced' ? undefined : handleDismiss}
        />
      )}
    </AppUpdateContext.Provider>
  );
}

export const useAppUpdate = () => useContext(AppUpdateContext);
