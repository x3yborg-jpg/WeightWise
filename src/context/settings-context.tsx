
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, get, off } from "firebase/database";
import { database } from "@/lib/firebase";

const DEFAULT_NOTIFICATION_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const DEFAULT_WARNING_LEVEL = 90; // 90%

export interface GlobalSettings {
    notificationInterval: number;
    warningThresholdLevel: number;
}

interface SettingsContextType {
  settings: GlobalSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const settingsRef = ref(database, 'global-settings');

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>({
      notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
      warningThresholdLevel: DEFAULT_WARNING_LEVEL,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    const listener = onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            setSettings({
                notificationInterval: data.notificationInterval ?? DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: data.warningThresholdLevel ?? DEFAULT_WARNING_LEVEL,
            });
        } else {
            // If no global settings, create them with defaults
            const defaultSettings = {
                notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: DEFAULT_WARNING_LEVEL,
            };
            set(settingsRef, defaultSettings);
            setSettings(defaultSettings);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching global settings:", error);
        setLoading(false);
    });

    return () => {
        off(settingsRef, 'value', listener);
    }
  }, []);

  const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
    setLoading(true);
    
    const snapshot = await get(settingsRef);
    const currentSettings = snapshot.exists() ? snapshot.val() : settings;
    
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    await set(settingsRef, updatedSettings);
    // The onValue listener will update the state, so we just set loading to false.
    setLoading(false);
  };

  const value = {
    settings,
    loading,
    updateSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
