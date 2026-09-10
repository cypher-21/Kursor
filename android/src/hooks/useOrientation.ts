import { useState, useEffect, useRef } from 'react';

export function useOrientation(
  enabled: boolean = false,
  onMove?: (dx: number, dy: number) => void,
  speed: number = 7.0
) {
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

    const getOrientationAngle = (): number => {
      if (typeof window === 'undefined') return 0;
      if (window.screen?.orientation?.angle !== undefined) {
        return window.screen.orientation.angle;
      }
      if (typeof (window as any).orientation === 'number') {
        return (window as any).orientation;
      }
      return 0;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;

      if (!prevOrientationRef.current) {
        // Calibration / zeroing on initial reading
        prevOrientationRef.current = { gamma: e.gamma, beta: e.beta };
        return;
      }

      const dGamma = e.gamma - prevOrientationRef.current.gamma;
      const dBeta = e.beta - prevOrientationRef.current.beta;

      // Filter sudden massive jumps (crossing boundary or sensor glitch)
      if (Math.abs(dGamma) > 40 || Math.abs(dBeta) > 40) {
        prevOrientationRef.current = { gamma: e.gamma, beta: e.beta };
        return;
      }

      // Filter micro jitter (threshold: 0.25 deg)
      if (Math.abs(dGamma) >= 0.25 || Math.abs(dBeta) >= 0.25) {
        const angle = getOrientationAngle();
        const rad = (-angle * Math.PI) / 180;

        // Transform device coords to screen orientation
        const rawDx = dGamma;
        const rawDy = dBeta;

        const rotatedDx = rawDx * Math.cos(rad) - rawDy * Math.sin(rad);
        const rotatedDy = rawDx * Math.sin(rad) + rawDy * Math.cos(rad);

        const dx = Math.round(rotatedDx * speed);
        const dy = Math.round(rotatedDy * speed);

        if (onMove && (dx !== 0 || dy !== 0)) {
          onMove(dx, dy);
        }

        prevOrientationRef.current = { gamma: e.gamma, beta: e.beta };
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [enabled, onMove, speed]);

  return { hasPermission, requestPermission };
}
