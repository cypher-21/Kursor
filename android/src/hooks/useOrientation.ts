import { useState, useEffect, useRef } from 'react';

export function useOrientation(enabled: boolean = false, onMove?: (dx: number, dy: number) => void) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const prevOrientationRef = useRef<{ gamma: number; beta: number } | null>(null);

  const requestPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        setHasPermission(response === 'granted');
        return response === 'granted';
      } catch (e) {
        setHasPermission(false);
        return false;
      }
    }
    setHasPermission(true);
    return true;
  };

  useEffect(() => {
    if (!enabled) {
      prevOrientationRef.current = null;
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;

      if (!prevOrientationRef.current) {
        prevOrientationRef.current = { gamma: e.gamma, beta: e.beta };
        return;
      }

      const dGamma = e.gamma - prevOrientationRef.current.gamma;
      const dBeta = e.beta - prevOrientationRef.current.beta;

      // Filter micro jitter
      if (Math.abs(dGamma) > 0.1 || Math.abs(dBeta) > 0.1) {
        const speed = 12.0;
        const dx = dGamma * speed;
        const dy = dBeta * speed;
        if (onMove) {
          onMove(dx, dy);
        }
      }

      prevOrientationRef.current = { gamma: e.gamma, beta: e.beta };
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enabled, onMove]);

  return { hasPermission, requestPermission };
}
