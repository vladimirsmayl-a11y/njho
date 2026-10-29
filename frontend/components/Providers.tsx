'use client';

import { MotionConfig } from 'framer-motion';

export function Providers({ children }: { children: React.ReactNode }) {
  // reducedMotion="user": при включённой системной настройке «уменьшить движение» анимации сдвига отключаются
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
