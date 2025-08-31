
"use client";

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useBins } from '@/context/bin-context';
import { useToast } from './use-toast';
import { useWarnings } from '@/context/warning-context';
import { useSettings } from '@/context/settings-context';
import { useAuth } from '@/context/auth-context';

export const MAX_DATA_POINTS = 30; // Keep the last 30 data points for the chart
const DEMO_DATA_INTERVAL = 5000; // 5 seconds for demo data
export const MAX_WEIGHT_G = 40000; // 40kg in grams
const HEARTBEAT_TIMEOUT = 1800000; // 30 minutes

export interface LoadCellData {
  weight: number;
  level: number;
  timestamp: number;
}

export interface RawData {
    ID?: number | string;
    weight: number;
    level: number;
    IsON?: number;
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
  };
};

export function useLoadcellData(binId: string) {
  const { user } = useAuth();
  const [dataHistory, setDataHistory] = useState<LoadCellData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const { bins } = useBins();
  const { settings } = useSettings();
  const { addWarning, removeWarning, warnings } = useWarnings();
  const { toast } = useToast();

  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string | null>(null);
  
  const isWarningActiveForThisBin = warnings.some(w => w.binId === binId);


  const handleNotificationsAndWarnings = (newData: LoadCellData) => {
    const currentBin = bins.find(b => b.id === binId);
    if (!currentBin) return;
    
    // Use custom threshold from settings
    const levelThreshold = settings.warningThresholdLevel;
    const isLevelCritical = newData.level > levelThreshold;

    if (isLevelCritical) {
        // --- Add to Global Warning State (if not already warned) ---
        if (!isWarningActiveForThisBin) {
             addWarning({
                binId: currentBin.id,
                binName: currentBin.name,
                binLocation: currentBin.location,
                level: newData.level,
                timestamp: newData.timestamp,
            });
        }
    } else {
        // Condition no longer met, clear any active warnings for this bin.
        if(isWarningActiveForThisBin) {
            removeWarning(binId);
            toast({
                title: "Bin Status OK",
                description: `The status for bin '${currentBin.name}' is now back to normal.`,
                className: 'bg-green-500/10 border-green-500/50 text-green-400'
            });
        }
    }
  };

  useEffect(() => {
    // Reset state when binId changes
    setDataHistory([]);
    setError(null);
    setLoading(true);
    setIsConnected(false);
    setIsDemoMode(false);
    if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
    lastDataRef.current = null;

    const dbRef = ref(database, binId);

    const listener = onValue(dbRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        setIsDemoMode(false);
        const val: RawData = snapshot.val();
        
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = setTimeout(() => setIsConnected(false), HEARTBEAT_TIMEOUT);

        if (typeof val.IsON === 'number') {
            setIsConnected(true);
        } else {
            setIsConnected(false);
        }

        const dataString = JSON.stringify({ w: val.weight, l: val.level });
        if (dataString !== lastDataRef.current) {
            lastDataRef.current = dataString;

             if (typeof val.weight === 'number' && typeof val.level === 'number') {
                const newDataPoint: LoadCellData = {
                    weight: val.weight,
                    level: val.level,
                    timestamp: Date.now()
                };

                setDataHistory((prevHistory) => {
                    const newHistory = [...prevHistory, newDataPoint];
                    return newHistory.length > MAX_DATA_POINTS 
                            ? newHistory.slice(newHistory.length - MAX_DATA_POINTS) 
                            : newHistory;
                });

                handleNotificationsAndWarnings(newDataPoint);
            }
        }
      } else {
         setError(`No data found at '/${binId}'. Displaying demo data.`);
         setIsConnected(true);
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
  }, [binId, user, settings]); // Rerun if user/settings change

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
          handleNotificationsAndWarnings(newPoint);
          const newHistory = [...prevHistory, newPoint];
           return newHistory.length > MAX_DATA_POINTS 
                ? newHistory.slice(newHistory.length - MAX_DATA_POINTS)
                : newHistory;
        });
      }, DEMO_DATA_INTERVAL);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [isDemoMode, binId, user, settings]);
  
  const latestData = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1] : null;

  return { data: latestData, history: dataHistory, loading, error, isConnected };
}
