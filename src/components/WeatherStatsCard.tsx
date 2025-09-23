import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Cloud, CloudRain, Thermometer, Droplets, Eye, RefreshCw, AlertTriangle, Wind, Gauge, Compass, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWeatherData } from "@/hooks/useWeatherData";
import { formatTemperature, formatWindSpeed, formatHumidity, formatVisibility, formatAirPressure } from "@/lib/formatters";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  rainProbability: number;
  sunrise: string;
  sunset: string;
  weatherCode: number;
  description: string;
  windSpeed?: number;
  windDirection?: number;
  airPressure?: number;
  visibility?: number;
}

interface WeatherStatsCardProps {
  latitude: number;
  longitude: number;
}

// Memoize the component to prevent unnecessary re-renders
const WeatherStatsCard = React.memo(({ 
  latitude, 
  longitude 
}: WeatherStatsCardProps): JSX.Element => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  // Memoize coordinates with explicit typing and initialization
  const memoizedCoordinates = useMemo<{ latitude: number; longitude: number }>(() => {
    return {
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0
    };
  }, [latitude, longitude]);

  // Memoize fetch function to prevent recreation on every render
  const fetchWeatherData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Validate coordinates before making API call
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('WeatherStatsCard: Fetching weather data for coordinates:', { latitude, longitude });
      }

      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
      if (!apiKey) {
        console.error('WeatherStatsCard: OpenWeatherMap API key not configured');
        throw new Error('OpenWeatherMap API key not configured');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('WeatherStatsCard: API key configured, making request to OpenWeatherMap');
        console.log('WeatherStatsCard: API key length:', apiKey.length);
        console.log('WeatherStatsCard: API key starts with:', apiKey.substring(0, 4) + '...');
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('WeatherStatsCard: API response status:', response.status);
      }

      if (response.ok) {
        const data = await response.json();
        
        setWeatherData({
          temperature: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          rainProbability: data.pop ? data.pop * 100 : 0,
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          weatherCode: data.weather[0].id,
          description: data.weather[0].description,
          windSpeed: data.wind?.speed ? data.wind.speed * 3.6 : undefined, // Convert m/s to km/h
          windDirection: data.wind?.deg,
          airPressure: data.main.pressure,
          visibility: data.visibility ? data.visibility / 1000 : undefined // Convert m to km
        });
        
        setLastUpdated(new Date().toISOString());
        toast({
          title: "Weather Updated",
          description: "Successfully fetched current weather data",
        });
      } else {
        // Provide more specific error messages based on status code
        let errorMessage = `API request failed: ${response.status}`;
        if (response.status === 400) {
          errorMessage = 'Invalid coordinates or API key';
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key';
        } else if (response.status === 429) {
          errorMessage = 'API rate limit exceeded';
        } else if (response.status >= 500) {
          errorMessage = 'Weather service temporarily unavailable';
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data');
      toast({
        title: "Weather Error",
        description: "Unable to fetch weather data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, toast]);

  // Weather icon mapping function
  const getWeatherIcon = (weatherCode: number) => {
    if (weatherCode >= 200 && weatherCode < 300) return <Cloud className="h-6 w-6 text-yellow-500" />; // Thunderstorm
    if (weatherCode >= 300 && weatherCode < 400) return <CloudRain className="h-6 w-6 text-blue-500" />; // Drizzle
    if (weatherCode >= 500 && weatherCode < 600) return <CloudRain className="h-6 w-6 text-blue-600" />; // Rain
    if (weatherCode >= 600 && weatherCode < 700) return <Cloud className="h-6 w-6 text-blue-400" />; // Snow
    if (weatherCode >= 700 && weatherCode < 800) return <Cloud className="h-6 w-6 text-slate-500" />; // Atmosphere (fog, mist)
    if (weatherCode === 800) return <Sun className="h-6 w-6 text-yellow-500" />; // Clear
    if (weatherCode >= 801 && weatherCode < 900) return <Cloud className="h-6 w-6 text-slate-400" />; // Clouds
    return <Cloud className="h-6 w-6 text-slate-500" />; // Default
  };

  // Helper function to convert wind direction degrees to cardinal directions
  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp < 0) return 'text-blue-600';
    if (temp < 15) return 'text-green-600';
    if (temp < 25) return 'text-yellow-600';
    if (temp < 35) return 'text-orange-600';
    return 'text-red-600';
  };

  // Fetch weather data when coordinates change (memoized coordinates)
  useEffect(() => {
    if (memoizedCoordinates.latitude && memoizedCoordinates.longitude && 
        !isNaN(memoizedCoordinates.latitude) && !isNaN(memoizedCoordinates.longitude)) {
      fetchWeatherData();
    }
  }, [memoizedCoordinates.latitude, memoizedCoordinates.longitude, fetchWeatherData]);

  // Auto-refresh every 15 minutes (memoized coordinates)
  useEffect(() => {
    if (!memoizedCoordinates.latitude || !memoizedCoordinates.longitude || 
        isNaN(memoizedCoordinates.latitude) || isNaN(memoizedCoordinates.longitude)) {
      return; // Don't set up auto-refresh if coordinates are invalid
    }

    const interval = setInterval(fetchWeatherData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [memoizedCoordinates.latitude, memoizedCoordinates.longitude, fetchWeatherData]);

  // Show message if coordinates are not available
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <GlassCard className="floating-card">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-blue-600" />
            <span className="font-bold">Weather Information</span>
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Weather data unavailable</p>
            <p className="text-sm">Location coordinates not available</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (loading && !weatherData) {
    return (
      <GlassCard variant="subtle">
        <GlassCardHeader>
          <GlassCardTitle className="text-sm font-medium flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Weather Data...
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="pt-0">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Fetching current weather conditions...</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (error && !weatherData) {
    return (
      <GlassCard variant="elevated">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            <span className="font-bold">Current Weather</span>
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchWeatherData} variant="outline" className="btn-modern">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-4" />
            <span className="font-bold">Current Weather</span>
          </GlassCardTitle>
          <Button onClick={fetchWeatherData} size="sm" variant="outline" className="btn-modern">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {weatherData ? (
          <div className="space-y-4">
            {/* Main Weather Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getWeatherIcon(weatherData.weatherCode)}
                <div>
                  <div className={`text-3xl font-bold ${getTemperatureColor(weatherData.temperature)}`}>
                    {formatTemperature(weatherData.temperature)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Feels like {formatTemperature(weatherData.feelsLike)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="capitalize">
                  {weatherData.description}
                </Badge>
              </div>
            </div>

            {/* Weather Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard variant="subtle" className="text-center p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold">Humidity</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {formatHumidity(weatherData.humidity)}
                </div>
              </GlassCard>

              <GlassCard variant="subtle" className="text-center p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CloudRain className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold">Rain Chance</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {formatHumidity(weatherData.rainProbability)}
                </div>
              </GlassCard>
            </div>

            {/* Additional Weather Data */}
            {(weatherData.windSpeed || weatherData.airPressure || weatherData.visibility) && (
              <div className="grid grid-cols-2 gap-4">
                {weatherData.windSpeed && (
                  <GlassCard variant="subtle" className="text-center p-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wind className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold">Wind</span>
                    </div>
                    <div className="text-lg font-semibold text-slate-600">
                      {formatWindSpeed(weatherData.windSpeed)}
                    </div>
                    {weatherData.windDirection && (
                      <div className="text-xs text-muted-foreground">
                        {weatherData.windDirection}° {getWindDirection(weatherData.windDirection)}
                      </div>
                    )}
                  </GlassCard>
                )}

                {weatherData.airPressure && (
                  <GlassCard variant="subtle" className="text-center p-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-semibold">Pressure</span>
                    </div>
                    <div className="text-lg font-semibold text-purple-600">
                      {formatAirPressure(weatherData.airPressure)}
                    </div>
                  </GlassCard>
                )}

                {weatherData.visibility && (
                  <GlassCard variant="subtle" className="text-center p-3">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-semibold">Visibility</span>
                    </div>
                    <div className="text-lg font-semibold text-indigo-600">
                      {formatVisibility(weatherData.visibility)}
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* Sunrise/Sunset */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard variant="subtle" className="text-center p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sun className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold">Sunrise</span>
                </div>
                <div className="text-lg font-semibold text-yellow-600">
                  {weatherData.sunrise}
                </div>
              </GlassCard>

              <GlassCard variant="subtle" className="text-center p-3">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sun className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold">Sunset</span>
                </div>
                <div className="text-lg font-semibold text-orange-600">
                  {weatherData.sunset}
                </div>
              </GlassCard>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-xs text-muted-foreground pt-2">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No weather data available
          </div>
        )}
              </GlassCardContent>
      </GlassCard>
  );
});

export default WeatherStatsCard;
