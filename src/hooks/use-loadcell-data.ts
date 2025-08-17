"use client";

import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';

export interface LoadCellData {
  weight: number;
  level: number;
  timestamp: number;
}

export function useLoadcellData() {
  const [data, setData] = useState<LoadCellData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you might want to simulate data for development if Firebase isn't set up yet.
    // For now, we'll assume Firebase is configured.
    const loadCellRef = ref(database, 'loadcell');

    const listener = onValue(loadCellRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (typeof val.weight === 'number' && typeof val.level === 'number' && typeof val.timestamp === 'number') {
          setData(val);
          setError(null);
        } else {
          setError("Received invalid data structure from Firebase. Expected { weight: number, level: number, timestamp: number }.");
          setData(null);
        }
      } else {
        setError("No data found at '/loadcell'. Ensure data is being sent to this path in your Firebase Realtime Database.");
        setData(null);
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
      setData(null);
    });

    return () => {
      off(loadCellRef, 'value', listener);
    };
  }, []);

  return { data, loading, error };
}
