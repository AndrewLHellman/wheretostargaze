'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR-safe default guess (can be false or true; we adjust on mount)
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);

  return isMobile;
}
