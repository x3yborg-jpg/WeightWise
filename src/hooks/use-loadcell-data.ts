"use client";

import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';

const MAX_DATA_POINTS = 30; // Keep the last 30 data points for the chart

export interface LoadCellData {
  weight: number;
  level: number;
  timestamp: number;
}

export function useLoadcellData() {
  const [dataHistory, setDataHistory] = useState<LoadCellData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCellRef = ref(database, 'loadcell');

    const listener = onValue(loadCellRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (typeof val.weight === 'number' && typeof val.level === 'number' && typeof val.timestamp === 'number') {
          setDataHistory((prevHistory) => {
            const newHistory = [...prevHistory, val];
            if (newHistory.length > MAX_DATA_POINTS) {
              return newHistory.slice(newHistory.length - MAX_DATA_POINTS);
            }
            return newHistory;
          });
          setError(null);
        } else {
          setError("Received invalid data structure from Firebase. Expected { weight: number, level: number, timestamp: number }.");
        }
      } else {
         setError("No data found at '/loadcell'. Ensure data is being sent to this path in your Firebase Realtime Database.");
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase Error:", error);
      if (error.message.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Please check your Firebase Realtime Database security rules.");
      } else {
        setError("Failed to connect to Firebase. Please check your firebase.ts configuration and network connection.");
      }
      setLoading(false);
    });

    return () => {
      off(loadCellRef, 'value', listener);
    };
  }, []);
  
  const latestData = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1] : null;

  return { data: latestData, history: dataHistory, loading, error };
}
