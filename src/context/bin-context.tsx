
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, onValue, set, get, off, remove } from "firebase/database";
import { database } from "@/lib/firebase";

export interface BinConfig {
    id: string;
    name: string;
    deviceId: string;
    location: string;
    lastHeartbeat?: number;
}

interface BinContextType {
  bins: BinConfig[];
  loading: boolean;
  updateBin: (binId: string, data: Partial<Omit<BinConfig, 'id'>>) => Promise<void>;
  deleteBin: (binId: string) => Promise<void>;
}

const BinContext = createContext<BinContextType | undefined>(undefined);

const INITIAL_BINS_CONFIG: Omit<BinConfig, 'id'>[] = [
    { name: "Tree Side", deviceId: "DEV-1001", location: "Kallambalam", lastHeartbeat: 0 },
];

async function initializeBinConfig() {
    const binConfigRef = ref(database, 'bins-config');
    const snapshot = await get(binConfigRef);
    if (!snapshot.exists()) {
        console.log("No bin configuration found in Firebase, initializing with default.");
        await set(binConfigRef, {
            "bin1": INITIAL_BINS_CONFIG[0]
        });
        return [{ id: "bin1", ...INITIAL_BINS_CONFIG[0] }];
    }
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
}

export function BinProvider({ children }: { children: ReactNode }) {
  const [bins, setBins] = useState<BinConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     const binConfigRef = ref(database, 'bins-config');

     initializeBinConfig().then(initialBins => {
         setBins(initialBins);
         setLoading(false);

         const listener = onValue(binConfigRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updatedBins = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setBins(updatedBins);
            } else {
                setBins([]); // Handle case where all bins are deleted
            }
        });

         return () => {
            off(binConfigRef, 'value', listener);
        };
     }).catch(error => {
        console.error("Error initializing bin config:", error);
        setLoading(false);
     });

  }, []);

  const updateBin = async (binId: string, data: Partial<Omit<BinConfig, 'id' | 'deviceId' | 'lastHeartbeat'>>) => {
    setLoading(true);
    const binRef = ref(database, `bins-config/${binId}`);
    const snapshot = await get(binRef);
    if(snapshot.exists()) {
        const currentData = snapshot.val();
        await update(binRef, { ...currentData, ...data });
    }
    setLoading(false);
  };
  
  const deleteBin = async (binId: string) => {
      setLoading(true);
      // Delete from config
      const binConfigRef = ref(database, `bins-config/${binId}`);
      await remove(binConfigRef);
      // Delete the actual bin data
      const binDataRef = ref(database, binId);
      await remove(binDataRef);
      setLoading(false);
  }

  const value = {
    bins,
    loading,
    updateBin,
    deleteBin,
  };

  return <BinContext.Provider value={value}>{children}</BinContext.Provider>;
}

export function useBins() {
  const context = useContext(BinContext);
  if (context === undefined) {
    throw new Error('useBins must be used within a BinProvider');
  }
  return context;
}
