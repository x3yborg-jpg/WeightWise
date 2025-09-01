
"use client";

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useSettings } from '@/context/settings-context';

export const MAX_DATA_POINTS = 30; // Keep the last 30 data points for the chart
const DEMO_DATA_INTERVAL = 5000; // 5 seconds for demo data
export const MAX_WEIGHT_G = 40000; // 40kg in grams
const HEARTBEAT_TIMEOUT = 1800000; // 30 minutes

export interface LoadCellData {
  weight: number;
  level: number;
  timestamp: number;
  isAlarmActive?: boolean;
  lastSeen?: number;
}

export interface RawData {
    ID?: number | string;
    weight: number;
    level: number;
    IsON?: number;
    isAlarmActive?: boolean;
    lastSeen?: number;
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
    isAlarmActive: false,
    lastSeen: Date.now(),
  };
};

export function useLoadcellData(binId: string) {
  const [dataHistory, setDataHistory] = useState<LoadCellData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  
  const { settings, loading: settingsLoading } = useSettings();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Reset state when binId changes or settings are not loaded
    if (settingsLoading) {
        setLoading(true);
        return;
    }
    setDataHistory([]);
    setError(null);
    setLoading(true);
    setIsConnected(false);
    setIsDemoMode(false);
    setIsAlarmActive(false);
    if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);

    const dbRef = ref(database, binId);

    const listener = onValue(dbRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        setIsDemoMode(false);
        const val: RawData = snapshot.val();
        
        // Always update lastSeen timestamp on any data received
        update(dbRef, { lastSeen: Date.now() });

        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = setTimeout(() => setIsConnected(false), HEARTBEAT_TIMEOUT);

        setIsConnected(!!val.IsON && val.IsON !== 0);
        
        const alarmState = val.isAlarmActive ?? false;
        setIsAlarmActive(alarmState);

        if (typeof val.weight === 'number' && typeof val.level === 'number') {
            const newDataPoint: LoadCellData = {
                weight: val.weight,
                level: val.level,
                timestamp: Date.now(),
                isAlarmActive: alarmState,
                lastSeen: val.lastSeen
            };

            setDataHistory((prevHistory) => {
                const newHistory = [...prevHistory, newDataPoint];
                return newHistory.length > MAX_DATA_POINTS 
                        ? newHistory.slice(newHistory.length - MAX_DATA_POINTS) 
                        : newHistory;
            });
            
            // Centralized logic to update alarm status in Firebase
            const shouldBeAlarmActive = newDataPoint.level > settings.warningThresholdLevel;
            if (alarmState !== shouldBeAlarmActive) {
                update(dbRef, { isAlarmActive: shouldBeAlarmActive });
            }
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

    return () => {
      off(dbRef, 'value', listener);
      if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
    };
  }, [binId, settingsLoading, settings.warningThresholdLevel]);

  // Demo mode effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isDemoMode) {
      // Initialize with a full set of data points
      const initialData: LoadCellData[] = [];
      let lastData: LoadCellData | undefined = undefined;
      for (let i = 0; i < MAX_DATA_POINTS; i++) {
        lastData = generateSampleData(lastData);
        initialData.push(lastData);
      }
      setDataHistory(initialData);

      // Start interval to add new points
      intervalId = setInterval(() => {
        setDataHistory(prevHistory => {
          const newPoint = generateSampleData(prevHistory[prevHistory.length - 1]);
          
          const shouldBeAlarmActive = newPoint.level > settings.warningThresholdLevel;
          setIsAlarmActive(shouldBeAlarmActive); // Update local state for demo

          const newHistory = [...prevHistory, { ...newPoint, isAlarmActive: shouldBeAlarmActive }];
           return newHistory.length > MAX_DATA_POINTS 
                ? newHistory.slice(newHistory.length - MAX_DATA_POINTS)
                : newHistory;
        });
      }, DEMO_DATA_INTERVAL);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [isDemoMode, settings.warningThresholdLevel]);
  
  const latestData = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1] : null;

  return { data: latestData, history: dataHistory, loading, error, isConnected, isAlarmActive };
}

    