'use client';

import { createContext, useContext } from 'react';
import type { Me } from './types';

interface MeContextValue {
  me: Me;
  refresh: () => Promise<void>;
}

export const MeContext = createContext<MeContextValue | null>(null);

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe должен вызываться внутри CabinetShell');
  return ctx;
}
