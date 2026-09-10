import { useCallback } from 'react';

export function useHaptics(enabled: boolean = true) {
  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore if blocked by browser policy
      }
    },
    [enabled]
  );

  const tick = useCallback(() => vibrate(8), [vibrate]);
  const click = useCallback(() => vibrate(18), [vibrate]);
  const heavy = useCallback(() => vibrate(32), [vibrate]);
  const success = useCallback(() => vibrate([12, 40, 16]), [vibrate]);
  const warning = useCallback(() => vibrate([25, 50, 25]), [vibrate]);

  return { tick, click, heavy, success, warning };
}
