import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { logGeolocation } from '@/lib/logger';
import { debugTracker } from '@/utils/errorTracker';

// Import hooks directly instead of lazy loading them
import { useWeatherStore } from '@/store/weatherStore';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getBackgroundImage, isNightTime, isSunriseSunsetPeriod } from '@/lib/weatherBackgrounds';

// Refresh lock mechanism for weather backgrounds
const BACKGROUND_REFRESH_LOCK_KEY = 'breath_safe_background_refresh_lock';
const BACKGROUND_REFRESH_LOCK_DURATION = 14 * 60 * 1000; // 14 minutes

type TimeOfDayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface BackgroundLockPayload {
  timestamp: number;
  userAgent: string;
  background?: string;
}

const parseTimeString = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    const fromNumber = new Date(asNumber * (value.length < 13 ? 1000 : 1));
    if (!Number.isNaN(fromNumber.getTime())) {
      return fromNumber;
    }
  }

  return null;
};

const getTimeOfDayInfo = (
  sunriseTime?: string,
  sunsetTime?: string
): { period: TimeOfDayPeriod; isSunriseWindow: boolean; isSunsetWindow: boolean } => {
  const now = new Date();
  const sunrise = parseTimeString(sunriseTime);
  const sunset = parseTimeString(sunsetTime);
  const hour = now.getHours();

  const windowMs = 45 * 60 * 1000; // 45 minutes on either side of sunrise/sunset
  const isSunriseWindow = !!(sunrise && Math.abs(now.getTime() - sunrise.getTime()) <= windowMs);
  const isSunsetWindow = !!(sunset && Math.abs(now.getTime() - sunset.getTime()) <= windowMs);

  let period: TimeOfDayPeriod;
  if (hour >= 21 || hour < 5) {
    period = 'night';
  } else if (hour < 12) {
    period = 'morning';
  } else if (hour < 17) {
    period = 'afternoon';
  } else {
    period = 'evening';
  }

  return { period, isSunriseWindow, isSunsetWindow };
};

// Helper function to check if background refresh is locked
const isBackgroundRefreshLocked = (nextBackground?: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const lockData = localStorage.getItem(BACKGROUND_REFRESH_LOCK_KEY);
    if (!lockData) return false;

    const parsed: BackgroundLockPayload = JSON.parse(lockData);
    const { timestamp, background } = parsed;
    const now = Date.now();
    const timeSinceLastRefresh = now - timestamp;

    if (timeSinceLastRefresh >= BACKGROUND_REFRESH_LOCK_DURATION) {
      return false;
    }

    if (nextBackground && background && background !== nextBackground) {
      // Allow new backgrounds through the lock window
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

// Helper function to set background refresh lock
const setBackgroundRefreshLock = (nextBackground: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const lockData = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      background: nextBackground
    };
    localStorage.setItem(BACKGROUND_REFRESH_LOCK_KEY, JSON.stringify(lockData));
  } catch (error) {
    console.warn('Failed to set background refresh lock:', error);
  }
};

// Location handling is now managed by useGeolocation hook

interface BackgroundManagerProps {
  children: React.ReactNode;
}

/**
 * BackgroundManager component that handles dynamic background changes based on weather and time.
 * Manages weather data fetching, background transitions, and error states.
 */
const DEFAULT_BACKGROUND = '/weather-backgrounds/partly-cloudy.webp';
const ERROR_BACKGROUND = '/weather-backgrounds/overcast.webp';

const bgStateTracker = { renderCount: 0 };

const resolveBackgroundDebugFlag = (): boolean => {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  const globalAny = globalThis as Record<string, unknown>;
  const explicitFlag = globalAny['__BG_DEBUG__'];
  if (typeof explicitFlag === 'boolean') {
    return explicitFlag;
  }

  const trackerFlag = globalAny['__TRACK_VARIABLES__'];
  if (typeof trackerFlag === 'boolean') {
    return trackerFlag;
  }

  return false;
};

const BackgroundManager: React.FC<BackgroundManagerProps> = React.memo(({ children }) => {
  // State
  const [currentBackground, setCurrentBackground] = useState<string>(DEFAULT_BACKGROUND);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [backgroundState, setBackgroundState] = useState<'loading' | 'error' | 'success'>('loading');

  // Hooks - all at the top level
  const { theme } = useTheme();
  const { user } = useAuth() || {};
  const {
    weatherData: currentWeather,
    isLoading: weatherLoading,
    error: weatherError,
    fetchWeatherData,
    setCoordinates
  } = useWeatherStore();

  const {
    locationData,
    hasUserConsent,
    permissionStatus,
    requestLocation,
    getIPBasedLocationAsync
  } = useGeolocation();

  bgStateTracker.renderCount += 1;
  const renderIteration = bgStateTracker.renderCount;

  // Refs for tracking state without causing re-renders
  const isMountedRef = useRef(true);
  const hasAppliedBackgroundRef = useRef(false);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const effectTimeoutRef = useRef<number | null>(null);
  // Time analysis cache to prevent duplicate logging
  const timeAnalysisCache = useRef<Record<string, string>>({});

  const shouldTrack = resolveBackgroundDebugFlag();
  const debugLog = useCallback(
    (...args: unknown[]) => {
      if (shouldTrack) {
        console.log(...args);
      }
    },
    [shouldTrack]
  );

  debugLog(`🖼️ [BG-MANAGER-${renderIteration}] Component rendering:`, {
    hasWeatherData: !!currentWeather,
    backgroundState,
    weatherLoading,
    weatherError,
    geolocationConsent: hasUserConsent,
    geolocationPermissionStatus: permissionStatus,
    hasLocationData: !!locationData,
    requestLocationAvailable: typeof requestLocation === 'function',
    getIPBasedLocationAsyncAvailable: typeof getIPBasedLocationAsync === 'function',
    timestamp: new Date().toISOString()
  });

  if (shouldTrack) {
    debugTracker.trackVariableDeclaration(`BackgroundManager#${renderIteration}`, {
      hasWeatherData: !!currentWeather,
      backgroundState,
      weatherLoading,
      weatherError
    }, 'BackgroundManager.tsx:render');
  }

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return; // Skip in non-browser environments
    }

    const iterationLabel = renderIteration;
    debugLog(`🖼️ [BG-MANAGER-${iterationLabel}] Effect running after render`);

    if (effectTimeoutRef.current) {
      window.clearTimeout(effectTimeoutRef.current);
      effectTimeoutRef.current = null;
    }

    if (!(shouldTrack && backgroundState === 'loading')) {
      return () => {
        debugLog(`🖼️ [BG-MANAGER-${iterationLabel}] Effect cleanup`);
      };
    }

    effectTimeoutRef.current = window.setTimeout(() => {
      console.warn('⚠️  [CRITICAL] BackgroundManager effect timeout - potential TDZ trigger point', {
        hasWeatherData: !!currentWeather,
        backgroundState,
        timestamp: new Date().toISOString()
      });
      if (shouldTrack) {
        debugTracker.trackVariableAccess('BackgroundManager', 'BackgroundManager.tsx:postRenderTimeout');
      }
    }, 5000);

    return () => {
      debugLog(`🖼️ [BG-MANAGER-${iterationLabel}] Effect cleanup`);
      if (effectTimeoutRef.current) {
        window.clearTimeout(effectTimeoutRef.current);
        effectTimeoutRef.current = null;
      }
    };
  }, [backgroundState, currentWeather, shouldTrack, renderIteration]);

  // Update weather store coordinates when location data changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (locationData && !hasInitialData) {
      logGeolocation.debug('Location data updated, setting coordinates', { 
        city: locationData.city, 
        country: locationData.country 
      });
      
      // Only update coordinates if they've changed
      setCoordinates({ 
        latitude: locationData.latitude, 
        longitude: locationData.longitude 
      });
    }
  }, [locationData?.latitude, locationData?.longitude, setCoordinates, hasInitialData]);

  // Implement immediate fetch on login and progressive loading
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const fetchWeather = async () => {
      if (!user || !locationData) return;
      
      logGeolocation.info('User authenticated, fetching initial weather data');
      setBackgroundState('loading');
      
      try {
        await fetchWeatherData({ 
          latitude: locationData.latitude, 
          longitude: locationData.longitude 
        });
        
        if (isMountedRef.current) {
          logGeolocation.info('Initial weather data fetched successfully');
          setBackgroundState('success');
          setHasInitialData(true);
        }
      } catch (error) {
        if (isMountedRef.current) {
          logGeolocation.warn('Initial weather data failed, using fallback', { error });
          setBackgroundState('error');
          setHasInitialData(true);
        }
      }
    };
    
    // Only fetch if we haven't loaded data yet
    if (!hasInitialData) {
      fetchWeather();
    }
    
    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [user, hasInitialData, locationData, fetchWeatherData]);

  // Update background state based on weather loading status
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // Only update state if it's actually changing
    if (weatherLoading && backgroundState !== 'loading') {
      setBackgroundState('loading');
    } else if (weatherError && backgroundState !== 'error') {
      console.warn('Weather data error:', weatherError);
      setBackgroundState('error');
    } else if (currentWeather && backgroundState !== 'success') {
      setBackgroundState('success');
    }
  }, [weatherLoading, weatherError, currentWeather, backgroundState]);

  // Determine the appropriate background image based on weather and time
  const targetBackground = useMemo(() => {
    const defaultBackground = DEFAULT_BACKGROUND;

    if (weatherLoading || weatherError) {
      debugLog(`BackgroundManager: ${weatherLoading ? 'Loading' : 'Error'}, using default background`);
      return weatherError ? ERROR_BACKGROUND : defaultBackground;
    }

    if (!currentWeather) {
      debugLog('BackgroundManager: No weather data available, using default background');
      return defaultBackground;
    }

    const { period, isSunriseWindow, isSunsetWindow } = getTimeOfDayInfo(
      currentWeather.sunriseTime,
      currentWeather.sunsetTime
    );
    const isNightPeriod = period === 'night' || isNightTime(currentWeather.sunriseTime, currentWeather.sunsetTime);
    const isSunriseSunset = isSunriseSunsetPeriod(currentWeather.sunriseTime, currentWeather.sunsetTime);

    const currentTime = new Date();
    const timeKey = `${currentTime.getHours()}:${currentTime.getMinutes()}`;
    const dayNightKey = isNightPeriod ? 'Night' : 'Day';

    if (!timeAnalysisCache.current[timeKey] || timeAnalysisCache.current[timeKey] !== dayNightKey) {
      timeAnalysisCache.current[timeKey] = dayNightKey;
      debugLog(
        `🌙 [BackgroundManager] Time: ${timeKey} (${dayNightKey}) | Sunrise: ${currentWeather.sunriseTime || 'N/A'} | Sunset: ${currentWeather.sunsetTime || 'N/A'}`
      );
    }

    let conditionCode = 1;
    const weatherCondition = currentWeather.weatherCondition?.toLowerCase();
    if (weatherCondition) {
      if (weatherCondition.includes('clear') || weatherCondition.includes('sun')) {
        conditionCode = 0;
      } else if (weatherCondition.includes('cloud') && !weatherCondition.includes('overcast')) {
        conditionCode = 2;
      } else if (weatherCondition.includes('overcast')) {
        conditionCode = 3;
      } else if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
        conditionCode = 61;
      } else if (weatherCondition.includes('snow')) {
        conditionCode = 71;
      } else if (weatherCondition.includes('fog') || weatherCondition.includes('mist')) {
        conditionCode = 45;
      }
    }

    let candidateBackground = getBackgroundImage(conditionCode);

    if (isNightPeriod) {
      candidateBackground = '/weather-backgrounds/night.webp';
    }

    if (isSunriseWindow) {
      candidateBackground = '/weather-backgrounds/sunrise.webp';
    } else if (isSunsetWindow || (period === 'evening' && conditionCode === 0)) {
      candidateBackground = '/weather-backgrounds/sunset.webp';
    } else if (isSunriseSunset && period === 'morning') {
      candidateBackground = '/weather-backgrounds/sunrise.webp';
    }

    if (isBackgroundRefreshLocked(candidateBackground) && currentBackground !== DEFAULT_BACKGROUND) {
      debugLog('BackgroundManager: Refresh locked - using current background');
      return currentBackground;
    }

    return candidateBackground;
  }, [currentWeather, currentBackground, weatherLoading, weatherError, debugLog]);

  // Update background when target changes
  useEffect(() => {
    if (!isMountedRef.current || !targetBackground) {
      return undefined;
    }

    // Only update if the background is actually changing
    if (targetBackground !== currentBackground) {
      debugLog('BackgroundManager: Changing background from', currentBackground, 'to', targetBackground);

      // Set refresh lock to prevent rapid changes
      setBackgroundRefreshLock(targetBackground);

      // Start transition
      setIsTransitioning(true);

      // Change background after transition starts
      const transitionTimer = setTimeout(() => {
        if (isMountedRef.current) {
          setCurrentBackground(targetBackground);
          setIsTransitioning(false);
          hasAppliedBackgroundRef.current = true;
        }
      }, 250); // Half of transition duration

      // Cleanup function to clear the timeout if the component unmounts
      return () => {
        clearTimeout(transitionTimer);
      };
    }

    return undefined;
  }, [targetBackground, currentBackground]);

  useEffect(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    if (currentWeather || weatherLoading) {
      return;
    }

    fallbackTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current || hasAppliedBackgroundRef.current) {
        return;
      }

      debugLog(`🖼️ [BG-MANAGER-${renderIteration}] Applying default background after timeout`);
      setCurrentBackground(DEFAULT_BACKGROUND);
      setBackgroundState((prev) => (prev === 'error' ? prev : 'success'));
      hasAppliedBackgroundRef.current = true;
    }, 3000);

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [currentWeather, weatherLoading, renderIteration]);

  // Get background based on state with fallbacks
  const getBackgroundForState = useCallback((): string => {
    const defaultBg = '/weather-backgrounds/partly-cloudy.webp';
    
    try {
      switch (backgroundState) {
        case 'loading':
          return defaultBg; // Default while loading
          
        case 'error':
          return '/weather-backgrounds/overcast.webp'; // Fallback for errors
          
        case 'success':
          // Ensure we have a valid background before returning it
          return currentBackground || defaultBg;
          
        default:
          return defaultBg;
      }
    } catch (error) {
      console.error('Error getting background for state:', error);
      return defaultBg;
    }
  }, [backgroundState, currentBackground]);

  // Get overlay opacity based on theme
  const overlayOpacity = theme === 'light' ? '0.2' : '0.4';

  try {
    const renderResult = (
      <div className="relative min-h-screen">
        {/* Weather Background */}
        <div 
          className="fixed inset-0 z-[-1] transition-opacity duration-500"
          style={{ 
            opacity: isTransitioning ? 0.3 : 1 
          }}
        >
          <img
            src={getBackgroundForState()}
            alt="Weather background"
            className="w-full h-full object-cover"
            onError={() => {
              console.warn('BackgroundManager: Failed to load background image:', getBackgroundForState());
              // Fallback to default background
              setCurrentBackground(DEFAULT_BACKGROUND);
              hasAppliedBackgroundRef.current = true;
            }}
          />
          
          {/* Overlay for better text readability */}
          <div 
            className="absolute inset-0"
            style={{ 
              backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` 
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );

    if (shouldTrack) {
      debugLog(`✅ [BG-MANAGER-${renderIteration}] Render successful`);
      debugTracker.trackVariableAccess('BackgroundManager', 'BackgroundManager.tsx:renderSuccess');
    }

    return renderResult;
  } catch (error) {
    console.error(`❌ [BG-MANAGER-${renderIteration}] Render error:`, error);
    if (shouldTrack) {
      debugTracker.dumpDebugInfo();
    }
    throw error;
  }

  // Fallback return to satisfy TypeScript control flow (should be unreachable)
  return null;
});

export default BackgroundManager;
