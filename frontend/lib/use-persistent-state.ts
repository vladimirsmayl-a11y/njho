'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Состояние, которое переживает перезагрузку и не ломает SSR-гидрацию. */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* повреждённые данные — остаёмся на initial */
    } finally {
      hydrated.current = true;
    }
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* переполнение хранилища — просто не сохраняем */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
