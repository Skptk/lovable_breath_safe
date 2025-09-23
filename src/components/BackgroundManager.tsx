import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { logGeolocation } from '@/lib/logger';

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

export default function BackgroundManager({ children }: BackgroundManagerProps) {
  const { theme } = useTheme();
  const [currentBackground, setCurrentBackground] = useState<string>('/weather-backgrounds/partly-cloudy.webp');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [backgroundState, setBackgroundState] = useState<'loading' | 'error' | 'success'>('loading');
  
  // Use hooks directly
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
  
  // Time analysis cache to prevent duplicate logging
  const timeAnalysisCache = useRef<Record<string, string>>({});

  // Update weather store coordinates when location data changes
  useEffect(() => {
    if (locationData && !hasInitialData) {
      logGeolocation.debug('Location data updated, setting coordinates', { city: locationData.city, country: locationData.country });
      setCoordinates({ 
        latitude: locationData.latitude, 
        longitude: locationData.longitude 
      });
    }
  }, [locationData?.latitude, locationData?.longitude, setCoordinates, hasInitialData]);

  // Implement immediate fetch on login and progressive loading
  useEffect(() => {
    if (user && !hasInitialData && locationData) {
      logGeolocation.info('User authenticated, fetching initial weather data');
      setBackgroundState('loading');
      
      // Set a flag to indicate we have initial data
      setHasInitialData(true);
      
      // Fetch initial weather data using centralized store
      const fetchInitialWeather = async () => {
        try {
          await fetchWeatherData({ 
            latitude: locationData.latitude, 
            longitude: locationData.longitude 
          });
          logGeolocation.info('Initial weather data fetched successfully');
          setBackgroundState('success');
        } catch (error) {
          logGeolocation.warn('Initial weather data failed, using fallback');
          setBackgroundState('error');
        }
      };
      
      fetchInitialWeather();
    }
  }, [user, hasInitialData, locationData?.latitude, locationData?.longitude, fetchWeatherData]);

  // Update background state based on weather loading status
  useEffect(() => {
    if (weatherLoading) {
      setBackgroundState('loading');
    } else if (weatherError) {
      setBackgroundState('error');
    } else if (currentWeather) {
      setBackgroundState('success');
    }
  }, [weatherLoading, weatherError, currentWeather]);

  // Determine the appropriate background image based on weather and time
  const targetBackground = useMemo(() => {
    // Wait for WeatherStore to complete loading before making decisions
    if (weatherLoading) {
      console.log('BackgroundManager: WeatherStore still loading, using default background');
      return '/weather-backgrounds/partly-cloudy.webp';
    }
    
    if (!currentWeather) {
      // Only log "no weather data" if we're not loading and truly have no data
      if (!weatherLoading) {
        console.log('BackgroundManager: No weather data available after loading completed, using default background');
      }
      return '/weather-backgrounds/partly-cloudy.webp';
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
    if (targetBackground !== currentBackground) {
      console.log('BackgroundManager: Changing background from', currentBackground, 'to', targetBackground);
      
      // Set refresh lock to prevent rapid changes
      setBackgroundRefreshLock();
      
      // Start transition
      setIsTransitioning(true);
      
      // Change background after transition starts
      setTimeout(() => {
        setCurrentBackground(targetBackground);
        setIsTransitioning(false);
      }, 250); // Half of transition duration
    }
  }, [targetBackground, currentBackground]);

  // Get overlay opacity based on theme
  const overlayOpacity = theme === 'light' ? '0.2' : '0.4';

  // Get background based on state
  const getBackgroundForState = () => {
    switch (backgroundState) {
      case 'loading':
        return '/weather-backgrounds/partly-cloudy.webp'; // Default while loading
      case 'error':
        return '/weather-backgrounds/overcast.webp'; // Fallback for errors
      case 'success':
        return currentBackground; // Weather-based background
      default:
        return '/weather-backgrounds/partly-cloudy.webp';
    }
  };

  return (
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
          onError={(e) => {
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
}

