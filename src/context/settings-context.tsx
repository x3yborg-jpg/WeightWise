
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, get, off } from "firebase/database";
import { database } from "@/lib/firebase";
import { useAuth } from './auth-context';

const DEFAULT_NOTIFICATION_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour

export interface UserSettings {
    alertEmail: string;
    notificationInterval: number;
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
      notificationInterval: DEFAULT_NOTIFICATION_INTERVAL
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        // If no user, use defaults and stop loading.
        setSettings({
            alertEmail: '',
            notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
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
            });
        } else {
            // No settings found, use defaults and set the alertEmail to the user's email
            const defaultSettings = {
                alertEmail: user.email ?? '',
                notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
            };
            setSettings(defaultSettings);
            // Optionally, save these defaults to Firebase for the user
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
    
    // Create the update object by merging with current settings
    const updatedSettings = { ...settings, ...newSettings };
    
    await set(settingsRef, updatedSettings);
    // The onValue listener will automatically update the state
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
