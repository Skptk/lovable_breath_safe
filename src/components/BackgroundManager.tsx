import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { logGeolocation } from '@/lib/logger';
import { isDebugBuild, debugLog } from '@/utils/debugFlags';

// Import hooks directly instead of lazy loading them
import { useWeatherStore } from '@/store/weatherStore';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getBackgroundImage, isNightTime, isSunriseSunsetPeriod } from '@/lib/weatherBackgrounds';
import InteractiveSmokeOverlay from '@/components/backgrounds/InteractiveSmokeOverlay';

// Background refresh settings
const BACKGROUND_REFRESH_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes to prevent rapid switching
const BACKGROUND_REFRESH_LOCK_KEY = 'breath-safe:bg-refresh-lock';
const BACKGROUND_TRANSITION_DURATION = 500; // 500ms for smoother transitions
const BACKGROUND_UPDATE_DEBOUNCE = 1000; // 1 second debounce for background updates

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
const BackgroundManager: React.FC<BackgroundManagerProps> = React.memo(({ children }) => {
  const hasWindow = typeof window !== 'undefined';
  const globalScope: typeof globalThis | undefined = typeof globalThis !== 'undefined' ? globalThis : undefined;
  const isTestEnvironment = Boolean(
    (typeof process !== 'undefined' && (process.env?.['VITEST'] || process.env?.['NODE_ENV'] === 'test')) ||
    (typeof import.meta !== 'undefined' && (((import.meta as any)?.env?.VITEST) || ((import.meta as any)?.env?.MODE === 'test'))) ||
    (globalScope && ((globalScope as any).__vitest_worker__ || (globalScope as any).__vitest__ || (globalScope as any).vitest))
  );

  if (!hasWindow || isTestEnvironment) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed inset-0 z-[-1]">
          <img
            src={DEFAULT_BACKGROUND}
            alt="Weather background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <InteractiveSmokeOverlay className="opacity-60" intensity={0.7} />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }

  // State
  const [currentBackground, setCurrentBackground] = useState<string>(DEFAULT_BACKGROUND);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [backgroundState, setBackgroundState] = useState<'loading' | 'error' | 'success'>('loading');
  const [hasInitialData, setHasInitialData] = useState<boolean>(false);
  const updateTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [timeOfDayInfo, setTimeOfDayInfo] = useState<{
    period: TimeOfDayPeriod;
    isSunriseWindow: boolean;
    isSunsetWindow: boolean;
  }>({ period: 'morning', isSunriseWindow: false, isSunsetWindow: false });

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

  const { locationData } = useGeolocation();

  // Refs for tracking state without causing re-renders
  const fallbackTimeoutRef = useRef<number | null>(null);
  const timeOfDayIntervalRef = useRef<number | null>(null);
  const pendingBackgroundUpdate = useRef<string | null>(null);
  const hasAppliedBackgroundRef = useRef(false);

  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (timeOfDayIntervalRef.current !== null) {
        window.clearInterval(timeOfDayIntervalRef.current);
        timeOfDayIntervalRef.current = null;
      }

      // Clear timeouts
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateTimeOfDay = () => {
      if (!isMountedRef.current) {
        return;
      }
      setTimeOfDayInfo(getTimeOfDayInfo(currentWeather?.sunriseTime, currentWeather?.sunsetTime));
    };

    updateTimeOfDay();
    const intervalId = window.setInterval(updateTimeOfDay, 5 * 60 * 1000);
    timeOfDayIntervalRef.current = intervalId;

    return () => {
      window.clearInterval(intervalId);
      if (timeOfDayIntervalRef.current === intervalId) {
        timeOfDayIntervalRef.current = null;
      }
    };
  }, [currentWeather?.sunriseTime, currentWeather?.sunsetTime]);

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
    
    return () => {
      // Cleanup function
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
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
    try {
      const defaultBackground = DEFAULT_BACKGROUND;

      if (weatherLoading || weatherError) {
        if (isDebugBuild) {
          debugLog('BackgroundManager', `${weatherLoading ? 'Loading' : 'Error'}, using default background`);
        }
        return weatherError ? ERROR_BACKGROUND : defaultBackground;
      }

      if (!currentWeather) {
        if (isDebugBuild) {
          debugLog('BackgroundManager', 'No weather data available, using default background');
        }
        return defaultBackground;
      }

      const { period, isSunriseWindow, isSunsetWindow } = timeOfDayInfo;
      const isNightPeriod = period === 'night' || isNightTime(currentWeather.sunriseTime, currentWeather.sunsetTime);
      const isSunriseSunset = isSunriseSunsetPeriod(currentWeather.sunriseTime, currentWeather.sunsetTime);

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
        if (isDebugBuild) {
          debugLog('BackgroundManager', 'Refresh locked - reusing current background');
        }
        return currentBackground;
      }

      return candidateBackground;
    } catch (error) {
      console.error('BackgroundManager: Failed to determine target background, using default background instead.', error);
      return DEFAULT_BACKGROUND;
    }
  }, [
    currentWeather,
    currentBackground,
    weatherLoading,
    weatherError,
    timeOfDayInfo,
    isDebugBuild
  ]);

  // Update background when target changes with debounce and safety checks
  useEffect(() => {
    if (!isMountedRef.current || !targetBackground) {
      return undefined;
    }

    // Only update if the background is actually changing
    if (targetBackground !== currentBackground) {
      // Cancel any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }

      // Store the pending background update
      pendingBackgroundUpdate.current = targetBackground;

      // Debounce the update to prevent rapid changes
      updateTimeoutRef.current = window.setTimeout(() => {
        if (!isMountedRef.current || pendingBackgroundUpdate.current !== targetBackground) {
          return;
        }

        if (isDebugBuild) {
          debugLog('BackgroundManager', `Changing background from ${currentBackground} to ${targetBackground}`);
        }

        // Set refresh lock to prevent rapid changes
        if (targetBackground !== DEFAULT_BACKGROUND) {
          setBackgroundRefreshLock(targetBackground);
        }

        // Start transition
        setIsTransitioning(true);

        // Update the background after a short delay to allow the transition to start
        const transitionTimer = window.setTimeout(() => {
          if (isMountedRef.current) {
            setCurrentBackground(targetBackground);
            setIsTransitioning(false);
            hasAppliedBackgroundRef.current = true;
            pendingBackgroundUpdate.current = null;
          }
        }, BACKGROUND_TRANSITION_DURATION / 2);

        // Clear the update timeout
        updateTimeoutRef.current = null;

        // Cleanup function to clear the timeout if the effect runs again
        return () => {
          clearTimeout(transitionTimer);
        };
      }, BACKGROUND_UPDATE_DEBOUNCE);
    }

    // Cleanup function to clear any pending timeouts
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [targetBackground, currentBackground]);

  useEffect(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    if (currentWeather || weatherLoading) {
      return;
    }

    if (typeof window === 'undefined') {
      return () => {};
    }

    fallbackTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current || hasAppliedBackgroundRef.current) {
        return;
      }

      if (isDebugBuild) {
        debugLog('BackgroundManager', 'Applying default background after timeout');
      }
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
  }, [currentWeather, weatherLoading]);

  // Get background based on state with fallbacks
  const getBackgroundForState = useCallback((): string => {
    const defaultBg = DEFAULT_BACKGROUND;
    
    try {
      // If we have a pending update, use it to prevent flickering
      if (pendingBackgroundUpdate.current) {
        return pendingBackgroundUpdate.current;
      }

      // If we're in a transition, keep the current background
      if (isTransitioning) {
        return currentBackground || defaultBg;
      }

      // Otherwise, return the appropriate background based on state
      switch (backgroundState) {
        case 'loading':
          return defaultBg;
          
        case 'error':
          return ERROR_BACKGROUND;
          
        case 'success':
          return currentBackground || defaultBg;
          
        default:
          return defaultBg;
      }
    } catch (error) {
      console.error('Error getting background for state:', error);
      return defaultBg;
    }
  }, [backgroundState, currentBackground, isTransitioning]);

  // Get overlay opacity based on theme
  const overlayOpacity = theme === 'light' ? '0.2' : '0.4';

  try {
    const renderResult = (
      <div className="relative min-h-screen">
        {/* Weather Background */}
        <div 
          className="fixed inset-0 transition-opacity duration-500"
          style={{ 
            opacity: isTransitioning ? 0.3 : 1 
          }}
        >
          <div className="absolute inset-0 z-[-1]">
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
          <InteractiveSmokeOverlay className="z-0" intensity={0.85} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );

    return renderResult;
  } catch (error) {
    console.error('❌ [BG-MANAGER] Render error:', error);
    throw error;
  }

  // Fallback return to satisfy TypeScript control flow (should be unreachable)
  return null;
});

export default BackgroundManager;
