
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useSettings } from '@/context/settings-context';
import { sendNotification, type NotificationInput } from '@/ai/schemas/notification-schema';

export const MAX_DATA_POINTS = 30; // Keep the last 30 data points for the chart
const DEMO_DATA_INTERVAL = 5000; // 5 seconds for demo data
export const MAX_WEIGHT_G = 40000; // 40kg in grams
export const HEARTBEAT_TIMEOUT = 1800000; // 30 minutes

export interface LoadCellData {
  weight: number;
  level: number;
  timestamp: number;
  isLevelAlarmActive?: boolean;
  isWeightAlarmActive?: boolean;
  lastSeen?: number;
}

export interface RawData {
    ID?: number | string;
    weight: number;
    level: number;
    IsON?: number;
    isLevelAlarmActive?: boolean;
    isWeightAlarmActive?: boolean;
    lastSeen?: number;
    lastUpdatedNumber?: number;
}

// Function to generate sample data
const generateSampleData = (lastData?: LoadCellData): LoadCellData => {
  const lastWeight = lastData?.weight ?? 500;
  let lastLevel = lastData?.level ?? 10;

  // Make it more likely to go up if it's not full
  const levelTrend = lastLevel > 95 ? -0.2 : 0.5;
  lastLevel = Math.max(0, Math.min(100, lastLevel + (Math.random() - levelTrend) * 5));

  const newWeight = Math.max(0, lastWeight + (Math.random() - 0.4) * 2000);

  return {
    weight: Math.max(0, Math.min(MAX_WEIGHT_G, newWeight)),
    level: lastLevel,
    timestamp: Date.now(),
    isLevelAlarmActive: false,
    isWeightAlarmActive: false,
    lastSeen: Date.now(),
  };
};

export function useLoadcellData(binId: string) {
  const [dataHistory, setDataHistory] = useState<LoadCellData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLevelAlarmActive, setIsLevelAlarmActive] = useState(false);
  const [isWeightAlarmActive, setIsWeightAlarmActive] = useState(false);
  
  const { settings, loading: settingsLoading } = useSettings();

  const checkConnection = useCallback((lastSeenTime: number) => {
      const now = Date.now();
      if (now - lastSeenTime < HEARTBEAT_TIMEOUT) {
          setIsConnected(true);
      } else {
          setIsConnected(false);
      }
  }, []);

  useEffect(() => {
    if (settingsLoading) {
        setLoading(true);
        return;
    }
    setDataHistory([]);
    setError(null);
    setLoading(true);
    setIsDemoMode(false);
    setIsLevelAlarmActive(false);
    setIsWeightAlarmActive(false);

    const dbRef = ref(database, binId);

    // Initial check for connection status
    onValue(dbRef, (snapshot) => {
        if(snapshot.exists()) {
            const val: RawData = snapshot.val();
            checkConnection(val.lastSeen ?? 0);
        }
    }, { onlyOnce: true });


    const listener = onValue(dbRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        setIsDemoMode(false);
        const val: RawData = snapshot.val();
        
        // Update local state from Firebase
        setIsLevelAlarmActive(val.isLevelAlarmActive ?? false);
        setIsWeightAlarmActive(val.isWeightAlarmActive ?? false);

        if (typeof val.weight === 'number' && typeof val.level === 'number') {
            const newDataPoint: LoadCellData = {
                weight: val.weight,
                level: val.level,
                timestamp: Date.now(),
                isLevelAlarmActive: val.isLevelAlarmActive,
                isWeightAlarmActive: val.isWeightAlarmActive,
                lastSeen: val.lastSeen
            };

            setDataHistory((prevHistory) => {
                const newHistory = [...prevHistory, newDataPoint];
                return newHistory.length > MAX_DATA_POINTS 
                        ? newHistory.slice(newHistory.length - MAX_DATA_POINTS) 
                        : newHistory;
            });
        }
        
        // Handle heartbeat and alarm logic only when new data arrives from device
        if (val.IsON !== undefined && val.IsON !== 0 && val.IsON !== val.lastUpdatedNumber) {
            const now = Date.now();
            
            const shouldLevelAlarmBeActive = val.level > settings.warningThresholdLevel;
            const shouldWeightAlarmBeActive = val.weight > settings.warningThresholdWeight;

            // Always write the current alarm states and heartbeat info.
            // This ensures the keys are created and always reflect the current status.
            const updates: Partial<RawData> = { 
                lastSeen: now,
                lastUpdatedNumber: val.IsON,
                isLevelAlarmActive: shouldLevelAlarmBeActive,
                isWeightAlarmActive: shouldWeightAlarmBeActive,
            };
            
            update(dbRef, updates);
            checkConnection(now);
        }

      } else {
         setError(`No data found for this bin. Displaying demo data.`);
         setIsConnected(true); // Demo is always "connected"
         setIsDemoMode(true);
      }
    }, (err) => {
      console.error("Firebase Error:", err);
      setIsConnected(false);
      setError(
          err.message.includes("PERMISSION_DENIED")
          ? "Permission denied. Please check your Firebase Realtime Database security rules."
          : "Failed to connect to Firebase. Check your configuration and network."
      );
      setLoading(false);
    });
    
    // Periodically check the connection status
    const intervalId = setInterval(() => {
         onValue(dbRef, (snapshot) => {
            if(snapshot.exists()) {
                const val: RawData = snapshot.val();
                checkConnection(val.lastSeen ?? 0);
            }
         }, { onlyOnce: true });
    }, 60000); // Check every minute

    return () => {
      off(dbRef, 'value', listener);
      clearInterval(intervalId);
    };
  }, [binId, settingsLoading, settings.warningThresholdLevel, settings.warningThresholdWeight, checkConnection]);

  // Demo mode effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isDemoMode) {
      const initialData: LoadCellData[] = [];
      let lastData: LoadCellData | undefined = undefined;
      for (let i = 0; i < MAX_DATA_POINTS; i++) {
        lastData = generateSampleData(lastData);
        initialData.push(lastData);
      }
      setDataHistory(initialData);

      intervalId = setInterval(() => {
        setDataHistory(prevHistory => {
          const newPoint = generateSampleData(prevHistory[prevHistory.length - 1]);
          
          const shouldLevelAlarmBeActive = newPoint.level > settings.warningThresholdLevel;
          const shouldWeightAlarmBeActive = newPoint.weight > settings.warningThresholdWeight;
          setIsLevelAlarmActive(shouldLevelAlarmBeActive);
          setIsWeightAlarmActive(shouldWeightAlarmBeActive);
          
          const newHistory = [...prevHistory, { 
              ...newPoint, 
              isLevelAlarmActive: shouldLevelAlarmBeActive,
              isWeightAlarmActive: shouldWeightAlarmBeActive,
              lastSeen: Date.now() 
            }];
           return newHistory.length > MAX_DATA_POINTS 
                ? newHistory.slice(newHistory.length - MAX_DATA_POINTS)
                : newHistory;
        });
      }, DEMO_DATA_INTERVAL);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [isDemoMode, settings.warningThresholdLevel, settings.warningThresholdWeight]);
  
  const latestData = dataHistory.length > 0 ? dataHistory[dataHistory.length-1] : null;

  return { 
      data: latestData, 
      history: dataHistory, 
      loading, 
      error, 
      isConnected, 
      isLevelAlarmActive,
      isWeightAlarmActive 
    };
}
