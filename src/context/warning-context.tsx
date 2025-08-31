
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface Warning {
    binId: string;
    binName: string;
    binLocation: string;
    level: number;
    timestamp: number;
}

interface WarningContextType {
  warnings: Warning[];
  addWarning: (warning: Warning) => void;
  removeWarning: (binId: string) => void;
}

const WarningContext = createContext<WarningContextType | undefined>(undefined);

export function WarningProvider({ children }: { children: ReactNode }) {
  const [warnings, setWarnings] = useState<Warning[]>([]);

  const addWarning = useCallback((newWarning: Warning) => {
    setWarnings(prevWarnings => {
      // Avoid adding duplicate warnings for the same bin
      if (prevWarnings.some(w => w.binId === newWarning.binId)) {
        return prevWarnings;
      }
      return [...prevWarnings, newWarning];
    });
  }, []);

  const removeWarning = useCallback((binId: string) => {
    setWarnings(prevWarnings => prevWarnings.filter(w => w.binId !== binId));
  }, []);

  const value = {
    warnings,
    addWarning,
    removeWarning,
  };

  return <WarningContext.Provider value={value}>{children}</WarningContext.Provider>;
}

export function useWarnings() {
  const context = useContext(WarningContext);
  if (context === undefined) {
    throw new Error('useWarnings must be used within a WarningProvider');
  }
  return context;
}
