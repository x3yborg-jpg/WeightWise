
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { firestore } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, updateDoc, Timestamp } from "firebase/firestore";

const DEFAULT_NOTIFICATION_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
const DEFAULT_WARNING_LEVEL = 90; // 90%
const DEFAULT_WARNING_WEIGHT = 35000; // 35kg in grams
const DEFAULT_RECIPIENT_NUMBERS = ""; // Empty string by default

export interface GlobalSettings {
    notificationInterval: number;
    warningThresholdLevel: number;
    warningThresholdWeight: number;
    recipientNumbers: string;
}

interface SettingsContextType {
  settings: GlobalSettings;
  loading: boolean;
  updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>({
      notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
      warningThresholdLevel: DEFAULT_WARNING_LEVEL,
      warningThresholdWeight: DEFAULT_WARNING_WEIGHT,
      recipientNumbers: DEFAULT_RECIPIENT_NUMBERS,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const settingsRef = doc(firestore, 'system-settings', 'global');
    
    const unsubscribe = onSnapshot(settingsRef, async (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            setSettings({
                notificationInterval: data.notificationInterval ?? DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: data.warningThresholdLevel ?? DEFAULT_WARNING_LEVEL,
                warningThresholdWeight: data.warningThresholdWeight ?? DEFAULT_WARNING_WEIGHT,
                recipientNumbers: data.recipientNumbers ?? DEFAULT_RECIPIENT_NUMBERS,
            });
        } else {
            // If no global settings, create them with defaults
            const defaultSettings = {
                notificationInterval: DEFAULT_NOTIFICATION_INTERVAL,
                warningThresholdLevel: DEFAULT_WARNING_LEVEL,
                warningThresholdWeight: DEFAULT_WARNING_WEIGHT,
                recipientNumbers: DEFAULT_RECIPIENT_NUMBERS,
                updatedAt: Timestamp.now(),
            };
            await setDoc(settingsRef, defaultSettings);
            setSettings(defaultSettings);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching global settings:", error);
        setLoading(false);
    });

    return () => {
        unsubscribe();
    }
  }, []);

  const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
    setLoading(true);
    try {
      const settingsRef = doc(firestore, 'system-settings', 'global');
      await updateDoc(settingsRef, {
        ...newSettings,
        updatedAt: Timestamp.now(),
      } as any);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
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
