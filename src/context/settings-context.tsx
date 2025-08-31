
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, get, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from './auth-context';

const DEFAULT_NOTIFICATION_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const DEFAULT_WARNING_LEVEL = 90; // 90%
const DEFAULT_WARNING_WEIGHT = 35000; // 35kg in grams

export interface UserSettings {
    alertEmail: string;
    notificationInterval: number;
    warningThresholdLevel: number;
    warningThresholdWeight: number; // Stored in grams
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
      alertEmail: user?.email ?? '',
      notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
      warningThresholdLevel: DEFAULT_WARNING_LEVEL,
      warningThresholdWeight: DEFAULT_WARNING_WEIGHT,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setSettings({
            alertEmail: '',
            notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
            warningThresholdLevel: DEFAULT_WARNING_LEVEL,
            warningThresholdWeight: DEFAULT_WARNING_WEIGHT,
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
                alertEmail: data.alertEmail ?? user.email ?? '',
                notificationInterval: data.notificationInterval ?? DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: data.warningThresholdLevel ?? DEFAULT_WARNING_LEVEL,
                warningThresholdWeight: data.warningThresholdWeight ?? DEFAULT_WARNING_WEIGHT,
            });
        } else {
            const defaultSettings: UserSettings = {
                alertEmail: user.email ?? '',
                notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: DEFAULT_WARNING_LEVEL,
                warningThresholdWeight: DEFAULT_WARNING_WEIGHT,
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
