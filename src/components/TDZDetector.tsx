import React, { useEffect, useMemo } from 'react';
import { debugTracker } from '../utils/errorTracker';
import { useWeatherStore } from '@/store/weatherStore';

const shouldTrack = (): boolean => {
  if (typeof globalThis === 'object') {
    const globalWithFlag = globalThis as typeof globalThis & { __TRACK_VARIABLES__?: boolean };
    if (typeof globalWithFlag.__TRACK_VARIABLES__ !== 'undefined') {
      return Boolean(globalWithFlag.__TRACK_VARIABLES__);
    }
  }
  return false;
};

const TDZDetector: React.FC = () => {
  const trackingEnabled = useMemo(shouldTrack, []);
  const weatherData = useWeatherStore((state) => state.weatherData);

  useEffect(() => {
    if (!trackingEnabled) {
      return;
    }

    const checkForTDZ = () => {
      const timestamp = new Date().toISOString();

      try {
        debugTracker.trackVariableAccess('f', 'TDZDetector.tsx:checkForTDZ');
      } catch (error) {
        console.error('🎯 [TDZ-DETECTOR] TDZ violation detected', {
          error,
          timestamp,
        });
      }
    };

    checkForTDZ();
    const timeoutId = window.setTimeout(checkForTDZ, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [trackingEnabled, weatherData]);

  if (!trackingEnabled) {
    return null;
  }

  return (
    <div style={{ display: 'none' }}>
      TDZ Detector Active
    </div>
  );
};

export default TDZDetector;
