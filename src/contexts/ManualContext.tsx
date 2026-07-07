'use client'

import { createContext, useContext, useState, ReactNode } from 'react';

interface ManualContextType {
  isOpen: boolean;
  openManual: () => void;
  closeManual: () => void;
  toggleManual: () => void;
}

const ManualContext = createContext<ManualContextType | undefined>(undefined);

export function ManualProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openManual = () => setIsOpen(true);
  const closeManual = () => setIsOpen(false);
  const toggleManual = () => setIsOpen(prev => !prev);

  return (
    <ManualContext.Provider value={{ isOpen, openManual, closeManual, toggleManual }}>
      {children}
    </ManualContext.Provider>
  );
}

export function useManual() {
  const context = useContext(ManualContext);
  if (context === undefined) {
    throw new Error('useManual must be used within a ManualProvider');
  }
  return context;
}
