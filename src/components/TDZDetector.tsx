import React, { useEffect, useState } from 'react';
import { debugTracker } from '../utils/errorTracker';
import { useWeatherStore } from '@/store/weatherStore';

const TDZDetector: React.FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  const renderRef = React.useRef(0);
  const weatherData = useWeatherStore((state) => state.weatherData);

  useEffect(() => {
    renderRef.current += 1;
    const next = renderRef.current;
    setRenderCount(next);
    console.log(`🕵️ [TDZ-DETECTOR-${next}] Mounted/Updated`, {
      timestamp: new Date().toISOString(),
      hasWeatherData: !!weatherData,
    });

    const checkForTDZ = () => {
      const timestamp = new Date().toISOString();
      console.log(`🕵️ [TDZ-DETECTOR] Checking for TDZ conditions...`, {
        timestamp,
        hasWeatherData: !!weatherData,
      });

      try {
        if (typeof window !== 'undefined' && 'f' in window) {
          const globalF = (window as Record<string, unknown>)['f'];
          console.log('Found global f:', typeof globalF);
        }

        debugTracker.trackVariableAccess('f', 'TDZDetector.tsx:checkForTDZ');
      } catch (error) {
        if (error instanceof Error) {
          console.error('🎯 [TDZ-DETECTOR] CAUGHT THE ERROR!', {
            error: error.message,
            stack: error.stack,
            renderCount,
            timestamp,
          });
        } else {
          console.error('🎯 [TDZ-DETECTOR] CAUGHT NON-ERROR VALUE!', {
            value: error,
            renderCount,
            timestamp,
          });
        }
      }
    };

    checkForTDZ();
    const timeoutId = window.setTimeout(checkForTDZ, 0);

    return () => {
      console.log(`🕵️ [TDZ-DETECTOR] Cleanup after render`, {
        renderCount,
        timestamp: new Date().toISOString(),
      });
      clearTimeout(timeoutId);
    };
  }, [weatherData]);

  useEffect(() => {
    console.log(`🕵️ [TDZ-DETECTOR] Weather data effect triggered`, {
      timestamp: new Date().toISOString(),
      hasWeatherData: !!weatherData,
    });
  }, [weatherData]);

  return (
    <div style={{ display: 'none' }}>
      TDZ Detector Active (Render: {renderCount})
    </div>
  );
};

export default TDZDetector;
