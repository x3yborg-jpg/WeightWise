"use client";

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useBins } from '@/context/bin-context';
import { sendHighLevelNotification } from '@/ai/flows/notification-flow';
import { useToast } from './use-toast';
import { User } from 'firebase/auth';

export const MAX_DATA_POINTS = 30; // Keep the last 30 data points for the chart
const DEMO_DATA_INTERVAL = 5000; // 5 seconds for demo data
export const MAX_WEIGHT_G = 40000; // 40kg in grams
const HEARTBEAT_TIMEOUT = 1800000; // 30 minutes
const NOTIFICATION_THRESHOLD = 90; // 90%
const NOTIFICATION_COOLDOWN = 10 * 60 * 1000; // 10 minutes

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
  const lastLevel = lastData?.level ?? 10;

  // Simulate a weight change, e.g., +/- 1000g
  const newWeight = lastWeight + (Math.random() - 0.5) * 2000;
  const newLevel = Math.max(0, Math.min(100, lastLevel + (Math.random() - 0.45) * 5));

  return {
    weight: Math.max(0, Math.min(MAX_WEIGHT_G, newWeight)), // Ensure weight is within limits
    level: newLevel,
    timestamp: Date.now(),
  };
};

export function useLoadcellData(binId: string, user: User | null) {
  const [dataHistory, setDataHistory] = useState<LoadCellData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { bins } = useBins();
  const { toast } = useToast();

  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number | null>(null);
  const lastNotificationTimeRef = useRef<number>(0);

  const handleNotification = async (newData: LoadCellData) => {
    const now = Date.now();
    if (now - lastNotificationTimeRef.current < NOTIFICATION_COOLDOWN) {
        // Still in cooldown period
        return;
    }
    if (newData.level > NOTIFICATION_THRESHOLD) {
        const currentBin = bins.find(b => b.id === binId);
        if (!currentBin || !user?.email) return;

        console.log(`Bin level ${newData.level}% is over threshold. Sending notification.`);
        lastNotificationTimeRef.current = now;

        try {
            await sendHighLevelNotification({
                userEmail: user.email,
                binName: currentBin.name,
                binLocation: currentBin.location,
                level: newData.level,
                weight: newData.weight,
                timestamp: newData.timestamp
            });
            toast({
                title: "Alert Sent!",
                description: `Bin '${currentBin.name}' level is critical. An email has been sent.`,
                variant: 'destructive'
            });
        } catch (error) {
            console.error("Failed to send notification:", error);
            toast({
                title: "Notification Failed",
                description: "Could not send the high-level alert email.",
                variant: 'destructive'
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
    lastHeartbeatRef.current = null;
    lastNotificationTimeRef.current = 0;

    const dbRef = ref(database, binId);

    const listener = onValue(dbRef, (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        setIsDemoMode(false);
        const val: RawData = snapshot.val();
        
        // --- Heartbeat Logic ---
        if (typeof val.IsON === 'number') {
            setIsConnected(true);
            
            if (heartbeatTimeoutRef.current) {
                clearTimeout(heartbeatTimeoutRef.current);
            }
            
            heartbeatTimeoutRef.current = setTimeout(() => {
                setIsConnected(false);
            }, HEARTBEAT_TIMEOUT);

            if (val.IsON !== lastHeartbeatRef.current) {
                lastHeartbeatRef.current = val.IsON;
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

                    handleNotification(newDataPoint);
                }
            }
        } else {
            setIsConnected(false);
        }

      } else {
         setError(`No data found at '/${binId}'. Displaying demo data.`);
         setIsConnected(true);
         setIsDemoMode(true);
      }
    }, (err) => {
      console.error("Firebase Error:", err);
      setIsConnected(false);
      if (err.message.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Please check your Firebase Realtime Database security rules.");
      } else {
        setError("Failed to connect to Firebase. Please check your firebase.ts configuration and network connection.");
      }
      setLoading(false);
    });

    return () => {
      off(dbRef, 'value', listener);
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };
  }, [binId, user, bins, toast]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isDemoMode) {
      // Pre-fill with some initial data
      const initialData: LoadCellData[] = [];
      let lastData: LoadCellData | undefined = undefined;
      for (let i = 0; i < MAX_DATA_POINTS; i++) {
        lastData = generateSampleData(lastData);
        initialData.push(lastData);
      }
      setDataHistory(initialData);

      // Then start generating new data every few seconds
      intervalId = setInterval(() => {
        setDataHistory(prevHistory => {
          const newPoint = generateSampleData(prevHistory[prevHistory.length - 1]);
          handleNotification(newPoint);
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
  }, [isDemoMode, binId, user, bins, toast]);
  
  const latestData = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1] : null;

  return { data: latestData, history: dataHistory, loading, error, isConnected };
}
