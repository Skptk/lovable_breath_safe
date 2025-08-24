import React, { useState, useEffect, useMemo } from 'react';
import { useAirQuality } from '../hooks/useAirQuality';
import { useWeatherData } from '../hooks/useWeatherData';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
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

// Safe location handling to prevent geolocation violations
const getLocationSafely = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    // Check if we have stored location
    const storedLocation = localStorage.getItem('lastKnownLocation');
    if (storedLocation) {
      const location = JSON.parse(storedLocation);
      console.log('BackgroundManager: Using stored location:', location);
      return location;
    }

    // Only request fresh location if user gesture available
    if (navigator.userActivation?.hasBeenActive) {
      console.log('BackgroundManager: User gesture available, requesting fresh location');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });
      
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      localStorage.setItem('lastKnownLocation', JSON.stringify(location));
      console.log('BackgroundManager: Fresh location obtained:', location);
      return location;
    }

    console.log('BackgroundManager: No user gesture for geolocation, using fallback');
    // Use fallback location for Kenya
    return { lat: -1.1424, lng: 36.7088 };
  } catch (error) {
    console.log('BackgroundManager: Using fallback location due to error:', error);
    // Use fallback location for Kenya
    return { lat: -1.1424, lng: 36.7088 };
  }
};

interface BackgroundManagerProps {
  children: React.ReactNode;
}

export default function BackgroundManager({ children }: BackgroundManagerProps) {
  const { data: airQualityData } = useAirQuality();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [currentBackground, setCurrentBackground] = useState<string>('/weather-backgrounds/partly-cloudy.webp');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [safeCoordinates, setSafeCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [backgroundState, setBackgroundState] = useState<'loading' | 'error' | 'success'>('loading');

  // Get safe coordinates without violating geolocation policies
  useEffect(() => {
    const initializeSafeLocation = async () => {
      try {
        const location = await getLocationSafely();
        setSafeCoordinates(location);
      } catch (error) {
        console.warn('BackgroundManager: Failed to get safe location:', error);
        // Use fallback location
        setSafeCoordinates({ lat: -1.1424, lng: 36.7088 });
      }
    };

    // Only initialize location when component mounts and user has interacted
    if (document.hasFocus()) {
      initializeSafeLocation();
    } else {
      // Use fallback location if no user interaction
      setSafeCoordinates({ lat: -1.1424, lng: 36.7088 });
    }
  }, []);

  // Get weather data with proper refresh strategy
  const { currentWeather, isLoading: weatherLoading, error: weatherError } = useWeatherData({
    latitude: safeCoordinates?.lat || airQualityData?.coordinates?.lat,
    longitude: safeCoordinates?.lng || airQualityData?.coordinates?.lng,
    autoRefresh: hasInitialData, // Only auto-refresh after initial data
    refreshInterval: 900000 // 15 minutes
  });

  // Implement immediate fetch on login and progressive loading
  useEffect(() => {
    if (user && !hasInitialData) {
      console.log('BackgroundManager: User authenticated, fetching initial weather data...');
      setBackgroundState('loading');
      
      // Set a flag to indicate we have initial data
      setHasInitialData(true);
      
      // Start 15-minute cycle AFTER initial data is fetched
      const startAutoRefresh = () => {
        console.log('BackgroundManager: Starting 15-minute auto-refresh cycle');
        // The useWeatherData hook will handle the auto-refresh
      };
      
      // Wait for weather data to load before starting auto-refresh
      if (!weatherLoading && currentWeather) {
        console.log('BackgroundManager: Initial weather data loaded, starting auto-refresh cycle');
        setBackgroundState('success');
        startAutoRefresh();
      } else if (!weatherLoading && weatherError) {
        console.log('BackgroundManager: Initial weather data failed, using fallback');
        setBackgroundState('error');
        // Still start auto-refresh cycle even with error
        startAutoRefresh();
      }
    }
  }, [user, hasInitialData, weatherLoading, currentWeather, weatherError]);

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
    if (!currentWeather) {
      console.log('BackgroundManager: No weather data available, using default background');
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
    
    // Debug logging for time-based decisions
    console.log('BackgroundManager: Time analysis:', {
      currentTime: new Date().toLocaleTimeString(),
      sunriseTime: currentWeather.sunriseTime,
      sunsetTime: currentWeather.sunsetTime,
      isSunriseSunset,
      nightTime,
      weatherCondition: currentWeather.weatherCondition
    });
    
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
  }, [currentWeather, currentBackground]);

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
