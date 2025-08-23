import { useEffect, useState, useMemo } from 'react';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useAirQuality } from '@/hooks/useAirQuality';
import { getBackgroundImage, isNightTime, isSunriseSunsetPeriod } from '@/lib/weatherBackgrounds';
import { useTheme } from '@/contexts/ThemeContext';

interface BackgroundManagerProps {
  children: React.ReactNode;
}

export default function BackgroundManager({ children }: BackgroundManagerProps) {
  const { data: airQualityData } = useAirQuality();
  const { theme } = useTheme();
  const [currentBackground, setCurrentBackground] = useState<string>('/weather-backgrounds/partly-cloudy.jpg');
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
      return '/weather-backgrounds/partly-cloudy.jpg';
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

    return getBackgroundImage(conditionCode, nightTime, isSunriseSunset);
  }, [currentWeather]);

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
