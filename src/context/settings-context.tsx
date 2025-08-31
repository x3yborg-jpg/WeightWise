
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, get, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from './auth-context';

const DEFAULT_NOTIFICATION_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const DEFAULT_WARNING_LEVEL = 90; // 90%

export interface UserSettings {
    notificationInterval: number;
    warningThresholdLevel: number;
}

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
      notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
      warningThresholdLevel: DEFAULT_WARNING_LEVEL,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setSettings({
            notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
            warningThresholdLevel: DEFAULT_WARNING_LEVEL,
        });
        setLoading(false);
        return;
    }

    setLoading(true);
    const settingsRef = ref(database, `user-settings/${user.uid}`);

    const listener = onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            setSettings({
                notificationInterval: data.notificationInterval ?? DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: data.warningThresholdLevel ?? DEFAULT_WARNING_LEVEL,
            });
        } else {
            const defaultSettings: Omit<UserSettings, 'alertEmail'> = {
                notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: DEFAULT_WARNING_LEVEL,
            };
            setSettings(defaultSettings);
            set(settingsRef, defaultSettings);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user settings:", error);
        setLoading(false);
    });

    return () => {
        off(settingsRef, 'value', listener);
    }
  }, [user]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) {
        console.error("Cannot update settings: no user is signed in.");
        return;
    }
    setLoading(true);
    const settingsRef = ref(database, `user-settings/${user.uid}`);
    
    const snapshot = await get(settingsRef);
    const currentSettings = snapshot.exists() ? snapshot.val() : settings;
    
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    await set(settingsRef, updatedSettings);
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
