import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { startTransition } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, Loader2, AlertTriangle, Wind, Cloud, Sun, CloudRain, Thermometer, Droplets, Eye, Gauge, Compass } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
// CRITICAL: Lazy load LeafletMap to reduce initial bundle size
const LeafletMap = lazy(() => import("./LeafletMap"));
import Header from "@/components/Header";
import WindDashboard from "./WindDashboard";
import WeatherForecast from "./WeatherForecast";
import LocationPermissionBanner from "./LocationPermissionBanner";
import { useAuth } from "@/contexts/AuthContext";

// Use centralized weather store instead of useWeatherData hook
import { useWeatherStore } from "@/store/weatherStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { logGeolocation, logData } from "@/lib/logger";
import { formatTemperature, formatWindSpeed, formatHumidity, formatVisibility } from "@/lib/formatters";

// UserLocation interface is now handled by LocationData from useGeolocation hook

interface AirQualityData {
  aqi: number;
  location: string;
  timestamp: string;
}

interface WeatherStatsProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
  isDemoMode?: boolean;
}

export default function WeatherStats({ showMobileMenu, onMobileMenuToggle, isDemoMode = false }: WeatherStatsProps = {}): JSX.Element {
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  // Use new geolocation hook for proper location handling
  const {
    locationData,
    hasUserConsent,
    permissionStatus,
    requestLocation,
    getIPBasedLocationAsync,
    isRequesting: isRequestingLocation
  } = useGeolocation();

  // Handle IP-based location at component level to avoid Rules of Hooks violation
  const handleIPBasedLocation = useCallback(async () => {
    try {
      await getIPBasedLocationAsync();
    } catch (error) {
      logGeolocation.error('IP-based location failed', { error: error.message });
    }
  }, [getIPBasedLocationAsync]);

  // Memoize location object to prevent unnecessary re-renders
  const memoizedLocation = useMemo(() => {
    if (!locationData) return null;
    return {
      latitude: locationData.latitude,
      longitude: locationData.longitude
    };
  }, [locationData?.latitude, locationData?.longitude]);

  // Use centralized weather store instead of useWeatherData hook
  const { 
    weatherData: currentWeather,
    forecastData: forecast,
    isLoading: weatherLoading,
    error: weatherError,
    fetchWeatherData,
    fetchForecastData,
    setCoordinates
  } = useWeatherStore();


  // Debug logging for weather data (reduced frequency)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logGeolocation.debug('Location data changed', { city: locationData?.city, country: locationData?.country });
      logData.debug('Weather store state', {
        loading: weatherLoading,
        error: weatherError,
        hasCurrentWeather: !!currentWeather
      });
    }
  }, [locationData, weatherLoading, weatherError, currentWeather]);

  // Trigger weather data fetch only when location truly changes
  useEffect(() => {
    if (!locationData?.latitude || !locationData?.longitude) return;
    
    if (!currentWeather && !weatherLoading) {
      logGeolocation.debug('Location available, triggering weather data fetch for coordinates', { latitude: locationData.latitude, longitude: locationData.longitude });
      
      // Update weather store coordinates
      setCoordinates({ latitude: locationData.latitude, longitude: locationData.longitude });
      
      // Fetch weather and forecast data using centralized store
      const fetchData = async () => {
        try {
          await Promise.all([
            fetchWeatherData({ latitude: locationData.latitude, longitude: locationData.longitude }),
            fetchForecastData({ latitude: locationData.latitude, longitude: locationData.longitude })
          ]);
          console.log('WeatherStats: Weather and forecast data fetched successfully');
        } catch (error) {
          console.error('WeatherStats: Failed to fetch weather data:', error);
        }
      };
      
      fetchData();
    }
  }, [locationData?.latitude, locationData?.longitude, currentWeather, weatherLoading, setCoordinates, fetchWeatherData, fetchForecastData]);

  // Fetch air quality data when location is available
  useEffect(() => {
    if (locationData?.latitude && locationData?.longitude) {
      fetchAirQualityData(locationData.latitude, locationData.longitude);
    }
  }, [locationData?.latitude, locationData?.longitude]);

  // Location permissions are now handled by useGeolocation hook

  // Session storage cleanup is now handled by useGeolocation hook

  // Helper function to convert wind direction degrees to cardinal directions
  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };



  // Location handling is now managed by useGeolocation hook

  const fetchAirQualityData = async (lat: number, lon: number): Promise<void> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('fetchAQI', {
        body: { lat, lon }
      });

      if (error) {
        console.error('Error fetching air quality data:', error);
        return;
      }

      if (!response || response.error) {
        console.warn('WeatherStats: fetchAQI returned an error response');
        return;
      }

      const locationLabel = response.location ?? response.city ?? response.stationName ?? 'Unknown Location';

      // Only set air quality data if we have a valid AQI value
      if (typeof response.aqi === 'number' && response.aqi >= 0) {
        setAirQualityData({
          aqi: response.aqi,
          location: locationLabel,
          timestamp: response.timestamp ?? new Date().toISOString()
        });
      } else {
        console.warn('WeatherStats: Invalid or missing AQI value in response', response);
      }
    } catch (err) {
      console.error('Error fetching air quality data:', err);
    }
  };

  const getCityFromCoordinates = async (lat: number, lon: number): Promise<{city: string, state: string, country: string}> => {
    try {
      // Use environment variable for API key
      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
      
      // If no API key is available, skip the API call and use coordinates
      if (!apiKey || apiKey.trim() === '') {
        console.warn('OpenWeatherMap API key not configured, using coordinates as fallback');
        return {
          city: `Location`,
          state: `(${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          country: ''
        };
      }
      
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const location = data[0];
      
      return {
        city: location?.name || 'Your Location',
        state: location?.state || '',
        country: location?.country || ''
      };
    } catch (err) {
      console.error('Error getting city name:', err);
      // Fallback to coordinates if API fails
      return {
        city: `Your Location`,
        state: `(${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        country: ''
      };
    }
  };



  const getAQIColor = (aqi: number): string => {
    if (aqi <= 50) return "bg-green-500";
    if (aqi <= 100) return "bg-yellow-500";
    if (aqi <= 150) return "bg-orange-500";
    if (aqi <= 200) return "bg-red-500";
    if (aqi <= 300) return "bg-purple-500";
    return "bg-red-800";
  };

  const getAQILabel = (aqi: number): string => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  // Location permission management is now handled by useGeolocation hook

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Weather & Air Quality Stats"
          subtitle="Comprehensive environmental monitoring"
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Getting your location...</p>
            <p className="text-xs text-muted-foreground">Please allow location access when prompted</p>
          </div>
        </div>
      </div>
    );
  }

  if (!locationData && !loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Weather & Air Quality Stats"
          subtitle="Comprehensive environmental monitoring"
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <MapPin className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">
              Enable Location Services
            </h3>
            <p className="text-muted-foreground">
              Allow location access to view air quality data and nearby monitoring stations on the map.
            </p>
            
            <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
              <p><strong>What we'll show you:</strong></p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Your current location on the map</li>
                <li>Nearby air quality monitoring stations</li>
                <li>Real-time air quality data for your area</li>
                <li>Interactive map with detailed station information</li>
              </ul>
            </div>
            
            <Button onClick={() => requestLocation()} className="w-full" size="lg">
              <MapPin className="h-4 w-4 mr-2" />
              Enable Location & View Map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !locationData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Weather & Air Quality Stats"
          subtitle="Comprehensive environmental monitoring"
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Location Access Required</h3>
            <p className="text-muted-foreground max-w-sm">{error}</p>
            
            <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
              <p><strong>How to enable location access:</strong></p>
              <ol className="text-left list-decimal list-inside space-y-1">
                <li>Allow location access when prompted</li>
                <li>Check browser settings if no prompt appears</li>
                <li>On mobile: Settings → Privacy → Location Services</li>
                <li>Refresh the page after enabling location</li>
              </ol>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={() => requestLocation()} variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Try Again Now
              </Button>
              <Button 
                onClick={handleIPBasedLocation}
                variant="secondary"
                className="w-full"
              >
                Use IP-Based Location
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="secondary"
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 pb-8">
      {/* Header */}
      <Header
        title="Weather & Air Quality Stats"
        subtitle="Comprehensive environmental monitoring"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      {/* Mobile-First Bento Box Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-min">
        {/* Location Permission Banner */}
        {!isDemoMode && (
          <LocationPermissionBanner
            onLocationRequest={async () => {
              try {
                await requestLocation();
              } catch (error) {
                console.error('Location request failed:', error);
              }
            }}
            onSkip={() => {
              handleIPBasedLocation();
            }}
            permissionStatus={permissionStatus}
            locationSource={locationData?.source}
            city={locationData?.city}
            country={locationData?.country}
          />
        )}

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold">Demo Mode</h3>
                  <p className="text-sm text-blue-100">You're viewing a limited preview. Create an account to unlock all features!</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => window.location.href = "/onboarding"}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}

        {/* Hero Card: Current Weather Conditions - Full width on mobile, 2x2 on desktop */}
        <GlassCard className="floating-card lg:col-span-2 lg:row-span-2">
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-base font-semibold">Current Weather</GlassCardTitle>
            {currentWeather?.weatherCondition === 'Rain' ? (
              <CloudRain className="h-5 w-5 text-muted-foreground" />
            ) : currentWeather?.weatherCondition === 'Clouds' ? (
              <Cloud className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-muted-foreground" />
            )}
          </GlassCardHeader>
          <GlassCardContent>
            {weatherLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : currentWeather ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-5xl font-bold text-orange-600 dark:text-orange-400">
                      {currentWeather.temperature}°
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="font-medium">C</div>
                      <div>Feels like {currentWeather.feelsLikeTemperature || currentWeather.temperature}°</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm capitalize">
                    {currentWeather.weatherCondition || 'Clear'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Humidity</div>
                      <div className="text-sm font-semibold">{currentWeather.humidity}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <div>
                      <div className="text-xs text-muted-foreground">Wind</div>
                      <div className="text-sm font-semibold">{currentWeather.windSpeed} km/h</div>
                    </div>
                  </div>
                </div>
                {currentWeather?.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    Updated: {new Date(currentWeather.timestamp).toLocaleTimeString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {weatherError ? 'Weather data unavailable' : 'No Data'}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Air Quality Card - Compact on mobile, 1x2 on desktop */}
        <GlassCard className="floating-card lg:col-span-1 lg:row-span-2">
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Air Quality Index</GlassCardTitle>
            <Badge variant={airQualityData && typeof airQualityData.aqi === 'number' && airQualityData.aqi <= 50 ? "default" : "destructive"}>
              {airQualityData && typeof airQualityData.aqi === 'number' ? airQualityData.aqi : 'N/A'}
            </Badge>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-2xl font-bold">
              {airQualityData && typeof airQualityData.aqi === 'number' ? (
                airQualityData.aqi <= 50 ? 'Good' :
                airQualityData.aqi <= 100 ? 'Moderate' :
                airQualityData.aqi <= 150 ? 'Unhealthy for Sensitive Groups' :
                airQualityData.aqi <= 200 ? 'Unhealthy' :
                airQualityData.aqi <= 300 ? 'Very Unhealthy' : 'Hazardous'
              ) : 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {airQualityData?.location || 'Loading...'} • {airQualityData?.timestamp ? new Date(airQualityData.timestamp).toLocaleString() : 'N/A'}
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Location Card - Compact on mobile, 1x1 on desktop */}
        <GlassCard className="floating-card lg:col-span-1">
          <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <GlassCardTitle className="text-sm font-medium">Current Location</GlassCardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-xl font-bold">{locationData?.city || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {locationData?.country}
            </p>
            <p className="text-xs text-muted-foreground">
              {locationData?.latitude?.toFixed(4)}, {locationData?.longitude?.toFixed(4)}
            </p>
          </GlassCardContent>
        </GlassCard>

        {/* Metrics Grid - 4-column mini grid on mobile, individual cards on desktop */}
        {locationData && currentWeather && (
          <>
            {/* Temperature - Individual card on desktop */}
            <GlassCard className="floating-card lg:col-span-1 hidden lg:block">
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  Temperature
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="pt-0">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {currentWeather.temperature}°C
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Feels like {currentWeather.feelsLikeTemperature || currentWeather.temperature}°C
                </p>
              </GlassCardContent>
            </GlassCard>

            {/* Humidity - Individual card on desktop */}
            <GlassCard className="floating-card lg:col-span-1 hidden lg:block">
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  Humidity
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="pt-0">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {currentWeather.humidity}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dew point {currentWeather.airPressure || 'N/A'} hPa
                </p>
              </GlassCardContent>
            </GlassCard>

            {/* Wind - Individual card on desktop */}
            <GlassCard className="floating-card lg:col-span-1 hidden lg:block">
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  Wind
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="pt-0">
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                  {currentWeather.windSpeed} km/h
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {currentWeather.windDirection}° {getWindDirection(currentWeather.windDirection)}
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Visibility - Individual card on desktop */}
            <GlassCard className="floating-card lg:col-span-1 hidden lg:block">
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visibility
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="pt-0">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {currentWeather.visibility || 'N/A'} km
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  UV index {currentWeather.uvIndex || 'N/A'}
                </p>
              </GlassCardContent>
            </GlassCard>

            {/* Mobile: 4-column mini grid */}
            <div className="grid grid-cols-4 gap-2 lg:hidden col-span-full">
              {/* Temperature */}
              <GlassCard className="floating-card">
                <GlassCardContent className="p-3">
                  <div className="flex flex-col items-center text-center">
                    <Thermometer className="h-4 w-4 text-orange-500 mb-1" />
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {currentWeather.temperature}°
                    </div>
                    <div className="text-[10px] text-muted-foreground">Temp</div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              {/* Humidity */}
              <GlassCard className="floating-card">
                <GlassCardContent className="p-3">
                  <div className="flex flex-col items-center text-center">
                    <Droplets className="h-4 w-4 text-blue-500 mb-1" />
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {currentWeather.humidity}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">Humid</div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              {/* Wind */}
              <GlassCard className="floating-card">
                <GlassCardContent className="p-3">
                  <div className="flex flex-col items-center text-center">
                    <Wind className="h-4 w-4 text-slate-600 dark:text-slate-400 mb-1" />
                    <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {currentWeather.windSpeed}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Wind</div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              {/* Visibility */}
              <GlassCard className="floating-card">
                <GlassCardContent className="p-3">
                  <div className="flex flex-col items-center text-center">
                    <Eye className="h-4 w-4 text-purple-500 mb-1" />
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {currentWeather.visibility || 'N/A'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Vis</div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </div>
          </>
        )}

        {/* Wind Dashboard - Full width on mobile, 2x1 on desktop */}
        {locationData && (
          <div className="lg:col-span-2">
            <WindDashboard 
              latitude={locationData.latitude} 
              longitude={locationData.longitude} 
            />
          </div>
        )}

        {/* Weather Forecast - Full width on mobile, 2x2 on desktop */}
        {locationData && (
          <div className="lg:col-span-2 lg:row-span-2">
            <WeatherForecast 
              latitude={locationData.latitude} 
              longitude={locationData.longitude} 
            />
          </div>
        )}

        {/* Map Container - Reduced height on mobile, full height on desktop, spans 4 cols */}
        <GlassCard className="floating-card relative h-[400px] lg:h-[calc(100vh-200px)] lg:min-h-[600px] shadow-card overflow-hidden lg:col-span-4 lg:row-span-3">
          <GlassCardContent className="p-0 h-full relative">
            {/* Map Header - Simplified for mobile, full for desktop */}
            <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md border-b border-border/50">
              <div className="p-3 lg:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-lg lg:text-xl font-bold text-foreground">
                        Weather & Air Quality Map
                      </h1>
                      <p className="text-xs lg:text-sm text-muted-foreground">
                        {locationData ? `${locationData.city}, ${locationData.country}` : 'Loading location...'}
                      </p>
                    </div>
                    {airQualityData && (
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary"
                          className={`${getAQIColor(airQualityData.aqi)} text-white border-0 px-2 lg:px-3 py-1 text-xs lg:text-sm font-semibold`}
                        >
                          AQI {airQualityData.aqi}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden lg:inline">
                          Last updated: {airQualityData.timestamp}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 hidden lg:flex">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Layers className="h-4 w-4" />
                      Map Layers
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MapPin className="h-4 w-4" />
                      My Location
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaflet Map Integration */}
            <div className="w-full h-full pt-16 lg:pt-20">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <LeafletMap
                  userLocation={locationData}
                  airQualityData={airQualityData}
                />
              </Suspense>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Information Cards - Stacked on mobile, grid on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:col-span-4">
          {/* Location Information Card */}
          {locationData && (
            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center space-y-0 pb-2">
                <MapPin className="h-4 w-4 text-primary mr-2" />
                <GlassCardTitle className="text-sm font-medium">Location Details</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">City:</span>
                    <span className="text-sm font-medium">{locationData.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Country:</span>
                    <span className="text-sm font-medium">{locationData.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Coordinates:</span>
                    <span className="text-sm font-medium">
                      {locationData.latitude.toFixed(4)}, {locationData.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Source:</span>
                    <span className="text-sm font-medium capitalize">{locationData.source}</span>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}

          {/* Weather Summary Card */}
          {currentWeather && (
            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Cloud className="h-4 w-4 text-blue-500 mr-2" />
                <GlassCardTitle className="text-sm font-medium">Weather Summary</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-3 w-3 text-red-500" />
                    <span className="text-muted-foreground">Temp:</span>
                    <span className="font-medium">{formatTemperature(currentWeather.temperature)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    <span className="text-muted-foreground">Humidity:</span>
                    <span className="font-medium">{formatHumidity(currentWeather.humidity)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-3 w-3 text-green-500" />
                    <span className="text-muted-foreground">Wind:</span>
                    <span className="font-medium">{formatWindSpeed(currentWeather.windSpeed)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-3 w-3 text-purple-500" />
                    <span className="text-muted-foreground">Visibility:</span>
                    <span className="font-medium">{formatVisibility(currentWeather.visibility)}</span>
                  </div>
                </div>
                {currentWeather.feelsLikeTemperature && (
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground">Feels like:</span>
                    <span className="font-medium">{currentWeather.feelsLikeTemperature}°C</span>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          )}

          {/* Map Legend Card */}
          <GlassCard>
            <GlassCardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Layers className="h-4 w-4 text-muted-foreground mr-2" />
              <GlassCardTitle className="text-sm font-medium">Map Legend</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-muted-foreground">Your Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-muted-foreground">Good Air Quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-muted-foreground">Moderate Air Quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-muted-foreground">Poor Air Quality</span>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}