
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ref, remove } from "firebase/database";
import { database, firestore } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";

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
    const binsCollection = collection(firestore, 'bins');
    const binDoc = doc(binsCollection, 'bin1');
    
    // Check if we need to initialize with default bin
    const snapshot = await new Promise<any>((resolve) => {
        const unsubscribe = onSnapshot(binsCollection, (snap) => {
            unsubscribe();
            resolve(snap);
        });
    });
    
    if (snapshot.empty) {
        console.log("No bin configuration found in Firestore, initializing with default.");
        await setDoc(binDoc, {
            ...INITIAL_BINS_CONFIG[0],
            createdAt: Timestamp.now(),
        });
        return [{ id: "bin1", ...INITIAL_BINS_CONFIG[0] }];
    }
    
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
}

export function BinProvider({ children }: { children: ReactNode }) {
  const [bins, setBins] = useState<BinConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     const binsCollection = collection(firestore, 'bins');

     initializeBinConfig().then(initialBins => {
         setBins(initialBins);
         setLoading(false);

         const unsubscribe = onSnapshot(binsCollection, (snapshot) => {
            if (!snapshot.empty) {
                const updatedBins = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data() as Omit<BinConfig, 'id'> 
                }));
                setBins(updatedBins);
            } else {
                setBins([]); // Handle case where all bins are deleted
            }
        }, (error) => {
            console.error("Error listening to bins:", error);
        });

         return () => {
            unsubscribe();
        };
     }).catch(error => {
        console.error("Error initializing bin config:", error);
        setLoading(false);
     });

  }, []);

  const updateBin = async (binId: string, data: Partial<Omit<BinConfig, 'id' | 'deviceId' | 'lastHeartbeat'>>) => {
    setLoading(true);
    try {
      const binRef = doc(firestore, 'bins', binId);
      await updateDoc(binRef, data as any);
    } catch (error) {
      console.error("Error updating bin:", error);
    }
    setLoading(false);
  };
  
  const deleteBin = async (binId: string) => {
      setLoading(true);
      try {
        // Delete from Firestore config
        const binConfigRef = doc(firestore, 'bins', binId);
        await deleteDoc(binConfigRef);
        
        // Delete the actual bin data from Realtime Database
        const binDataRef = ref(database, binId);
        await remove(binDataRef);
      } catch (error) {
        console.error("Error deleting bin:", error);
      }
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
