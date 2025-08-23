import React, { useState, useEffect, useMemo } from 'react';
import { useAirQuality } from '../hooks/useAirQuality';
import { useWeatherData } from '../hooks/useWeatherData';
import { useTheme } from '../contexts/ThemeContext';
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

interface BackgroundManagerProps {
  children: React.ReactNode;
}

export default function BackgroundManager({ children }: BackgroundManagerProps) {
  const { data: airQualityData } = useAirQuality();
  const { theme } = useTheme();
  const [currentBackground, setCurrentBackground] = useState<string>('/weather-backgrounds/partly-cloudy.webp');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get weather data when coordinates are available
  const { currentWeather } = useWeatherData({
    latitude: airQualityData?.coordinates?.lat,
    longitude: airQualityData?.coordinates?.lon,
    autoRefresh: true,
    refreshInterval: 900000 // 15 minutes
  });

  // Determine the appropriate background image based on weather and time
  const targetBackground = useMemo(() => {
    if (!currentWeather) {
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
      } else if (weatherCondition.includes('thunder') || weatherCondition.includes('storm')) {
        conditionCode = 95; // Thunderstorm
      } else if (weatherCondition.includes('fog') || weatherCondition.includes('mist')) {
        conditionCode = 45; // Fog (separate from overcast)
      }
    }

    const newBackground = getBackgroundImage(conditionCode, nightTime, isSunriseSunset);
    
    // Set refresh lock when background changes
    if (newBackground !== currentBackground) {
      setBackgroundRefreshLock();
      console.log('BackgroundManager: Background changed - refresh lock set');
    }

    return newBackground;
  }, [currentWeather, currentBackground]);

  // Handle background transitions
  useEffect(() => {
    if (targetBackground !== currentBackground) {
      setIsTransitioning(true);
      
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setCurrentBackground(targetBackground);
        setIsTransitioning(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [targetBackground, currentBackground]);

  return (
    <div className="relative min-h-screen">
      {/* Weather Background */}
      <div 
        className="weather-background fixed inset-0 z-[-1] transition-opacity duration-500 ease-in-out"
        style={{
          backgroundImage: `url(${currentBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: isTransitioning ? 0.7 : 1
        }}
      >
        {/* Subtle overlay for better readability */}
        <div 
          className="absolute inset-0 transition-colors duration-500"
          style={{
            backgroundColor: theme === 'dark' 
              ? 'rgba(0, 0, 0, 0.4)' 
              : 'rgba(0, 0, 0, 0.2)'
          }}
        />
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
