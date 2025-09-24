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

// Helper function to check if background refresh is locked
const isBackgroundRefreshLocked = (): boolean => {
  try {
    const lockData = localStorage.getItem(BACKGROUND_REFRESH_LOCK_KEY);
    if (!lockData) return false;
    
    const { timestamp } = JSON.parse(lockData);
    const now = Date.now();
    const timeSinceLastRefresh = now - timestamp;
    
    return timeSinceLastRefresh < BACKGROUND_REFRESH_LOCK_DURATION;
  } catch {
    return false;
  }
};

// Helper function to set background refresh lock
const setBackgroundRefreshLock = (): void => {
  try {
    const lockData = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent
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
const bgStateTracker = { renderCount: 0 };

const BackgroundManager: React.FC<BackgroundManagerProps> = React.memo(({ children }) => {
  // State
  const [currentBackground, setCurrentBackground] = useState<string>('/weather-backgrounds/partly-cloudy.webp');
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
  
  // Refs for tracking state without causing re-renders
  const isMountedRef = useRef(true);
  
  // Time analysis cache to prevent duplicate logging
  const timeAnalysisCache = useRef<Record<string, string>>({});

  bgStateTracker.renderCount += 1;
  const renderIteration = bgStateTracker.renderCount;

  const shouldTrack = typeof __TRACK_VARIABLES__ === 'undefined' || __TRACK_VARIABLES__;

  console.log(`🖼️ [BG-MANAGER-${renderIteration}] Component rendering:`, {
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

    console.log(`🖼️ [BG-MANAGER-${renderIteration}] Effect running after render`);

    const timeoutId = window.setTimeout(() => {
      console.log('⚠️  [CRITICAL] BackgroundManager effect timeout - potential TDZ trigger point', {
        hasWeatherData: !!currentWeather,
        backgroundState,
        timestamp: new Date().toISOString()
      });
      if (shouldTrack) {
        debugTracker.trackVariableAccess('BackgroundManager', 'BackgroundManager.tsx:postRenderTimeout');
      }
    }, 0);

    return () => {
      console.log(`🖼️ [BG-MANAGER-${renderIteration}] Effect cleanup`);
      clearTimeout(timeoutId);
    };
  }, [backgroundState, currentWeather, renderIteration]);

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
    // Default fallback background
    const defaultBackground = '/weather-backgrounds/partly-cloudy.webp';
    
    // If we're still loading or have an error, use the default background
    if (weatherLoading || weatherError) {
      console.log(`BackgroundManager: ${weatherLoading ? 'Loading' : 'Error'}, using default background`);
      return defaultBackground;
    }
    
    // If we don't have weather data, use the default background
    if (!currentWeather) {
      console.log('BackgroundManager: No weather data available, using default background');
      return defaultBackground;
    }

    // Check if background refresh is locked to prevent duplicate updates
    if (isBackgroundRefreshLocked()) {
      console.log('BackgroundManager: Refresh locked - using current background');
      return currentBackground;
    }

    // Check if it's within sunrise/sunset period (highest priority)
    const isSunriseSunset = isSunriseSunsetPeriod(currentWeather.sunriseTime, currentWeather.sunsetTime);
    
    // Check if it's night time
    const nightTime = isNightTime(currentWeather.sunriseTime, currentWeather.sunsetTime);
    
    // Simplified time analysis logging - only log on significant changes
    const currentTime = new Date();
    const timeKey = `${currentTime.getHours()}:${currentTime.getMinutes()}`;
    const dayNightKey = nightTime ? 'Night' : 'Day';
    
    // Only log if this is a new time period or day/night transition
    if (!timeAnalysisCache.current[timeKey] || timeAnalysisCache.current[timeKey] !== dayNightKey) {
      timeAnalysisCache.current[timeKey] = dayNightKey;
      
      // Single summary log instead of verbose analysis
      console.log(`🌙 [BackgroundManager] Time: ${timeKey} (${dayNightKey}) | Sunrise: ${currentWeather.sunriseTime || 'N/A'} | Sunset: ${currentWeather.sunsetTime || 'N/A'}`);
    }
    
    // For OpenWeatherMap, we need to map the weather condition to Open-Meteo codes
    // OpenWeatherMap uses text descriptions, so we'll map them to our background system
    let conditionCode = 1; // Default to partly cloudy
    
    const weatherCondition = currentWeather.weatherCondition?.toLowerCase();
    if (weatherCondition) {
      if (weatherCondition.includes('clear') || weatherCondition.includes('sun')) {
        conditionCode = 0; // Clear sky
      } else if (weatherCondition.includes('cloud') && !weatherCondition.includes('overcast')) {
        conditionCode = 2; // Partly cloudy
      } else if (weatherCondition.includes('overcast')) {
        conditionCode = 3; // Overcast
      } else if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
        conditionCode = 61; // Rain
      } else if (weatherCondition.includes('snow')) {
        conditionCode = 71; // Snow
      } else if (weatherCondition.includes('fog') || weatherCondition.includes('mist')) {
        conditionCode = 45; // Fog
      }
    }
    
    // Priority order: sunrise/sunset > night time > weather conditions
    if (isSunriseSunset) {
      const isSunrise = new Date().getHours() < 12;
      return isSunrise ? '/weather-backgrounds/sunrise.webp' : '/weather-backgrounds/sunset.webp';
    } else if (nightTime) {
      return '/weather-backgrounds/night.webp';
    } else {
      // Map weather condition codes to background images
      return getBackgroundImage(conditionCode);
    }
  }, [currentWeather, currentBackground, weatherLoading]); // Add weatherLoading dependency

  // Update background when target changes
  useEffect(() => {
    if (!isMountedRef.current || !targetBackground) {
      return undefined;
    }

    // Only update if the background is actually changing
    if (targetBackground !== currentBackground) {
      console.log('BackgroundManager: Changing background from', currentBackground, 'to', targetBackground);

      // Set refresh lock to prevent rapid changes
      setBackgroundRefreshLock();

      // Start transition
      setIsTransitioning(true);

      // Change background after transition starts
      const transitionTimer = setTimeout(() => {
        if (isMountedRef.current) {
          setCurrentBackground(targetBackground);
          setIsTransitioning(false);
        }
      }, 250); // Half of transition duration

      // Cleanup function to clear the timeout if the component unmounts
      return () => {
        clearTimeout(transitionTimer);
      };
    }

    return undefined;
  }, [targetBackground, currentBackground]);

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
              setCurrentBackground('/weather-backgrounds/partly-cloudy.webp');
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
      console.log(`✅ [BG-MANAGER-${renderIteration}] Render successful`);
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
