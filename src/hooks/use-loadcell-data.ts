"use client";

import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';

const MAX_DATA_POINTS = 30; // Keep the last 30 data points for the chart
const DEMO_DATA_INTERVAL = 5000; // 5 seconds
const MAX_WEIGHT_G = 10000; // 10kg in grams

export interface LoadCellData {
  weight: number;
  level: number;
  timestamp: number;
  isConnected: boolean;
}

// Function to generate sample data
const generateSampleData = (lastData?: LoadCellData): LoadCellData => {
  const lastWeight = lastData?.weight ?? 500;
  const lastLevel = lastData?.level ?? 50;

  // Simulate a weight change, e.g., +/- 500g
  const newWeight = lastWeight + (Math.random() - 0.5) * 1000;
  const newLevel = Math.max(0, Math.min(100, lastLevel + (Math.random() - 0.45) * 10)); // Tend to fill up slightly

  return {
    weight: Math.max(0, Math.min(MAX_WEIGHT_G, newWeight)), // Ensure weight is between 0 and 10kg
    level: newLevel,
    timestamp: Date.now(),
    isConnected: true, // For demo purposes, we'll assume it's connected
  };
};

export function useLoadcellData() {
  const [dataHistory, setDataHistory] = useState<LoadCellData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const dbRef = ref(database); // Reference the root of the database

    const listener = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsDemoMode(false);
        const val = snapshot.val();
        // Client will add the timestamp, it's no longer expected from firebase
        if (
          typeof val.weight === 'number' && 
          typeof val.level === 'number' && 
          typeof val.isConnected === 'boolean'
        ) {
          setIsConnected(val.isConnected);
          
          if(val.isConnected) {
            const newDataPoint: LoadCellData = {
              ...val,
              timestamp: Date.now() // Add timestamp on arrival
            };

            setDataHistory((prevHistory) => {
              const newHistory = [...prevHistory, newDataPoint];
              if (newHistory.length > MAX_DATA_POINTS) {
                return newHistory.slice(newHistory.length - MAX_DATA_POINTS);
              }
              return newHistory;
            });
          }
          setError(null);
        } else {
          setIsConnected(false);
          setError("Received invalid data structure from Firebase. Expected { weight: number, level: number, isConnected: boolean } at the root.");
        }
      } else {
         setError("No data found at the root of your database. Displaying demo data. Connect a device to see live data.");
         setIsConnected(true); // For demo
         setIsDemoMode(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      setIsConnected(false);
      if (error.message.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Please check your Firebase Realtime Database security rules.");
      } else {
        setError("Failed to connect to Firebase. Please check your firebase.ts configuration and network connection.");
      }
      setLoading(false);
    });

    return () => {
      off(dbRef, 'value', listener);
    };
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isDemoMode) {
      // Pre-fill with some initial data
      const initialData: LoadCellData[] = [];
      let lastData: LoadCellData | undefined = undefined;
      for (let i = 0; i < 10; i++) {
        lastData = generateSampleData(lastData);
        initialData.push(lastData);
      }
      setDataHistory(initialData);

      // Then start generating new data every few seconds
      intervalId = setInterval(() => {
        setDataHistory(prevHistory => {
          const newPoint = generateSampleData(prevHistory[prevHistory.length - 1]);
          const newHistory = [...prevHistory, newPoint];
           if (newHistory.length > MAX_DATA_POINTS) {
              return newHistory.slice(newHistory.length - MAX_DATA_POINTS);
            }
            return newHistory;
        });
      }, DEMO_DATA_INTERVAL);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    }
  }, [isDemoMode]);
  
  const latestData = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1] : null;

  return { data: latestData, history: dataHistory, loading, error, isConnected };
}
