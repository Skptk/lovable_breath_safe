import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  airPressure?: number;
  rainProbability?: number;
  uvIndex?: number;
  visibility?: number;
  weatherCondition: string;
  feelsLikeTemperature?: number;
  sunriseTime?: string;
  sunsetTime?: string;
  timestamp: string;
  dataSource: string;
}

export interface ForecastData {
  date: string;
  temperature: {
    min: number;
    max: number;
    avg: number;
  };
  humidity: number;
  windSpeed: number;
  windDirection: number;
  rainProbability: number;
  weatherCondition: string;
  uvIndex?: number;
}

export interface ComprehensiveReading {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  aqi: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  windGust?: number;
  airPressure?: number;
  rainProbability?: number;
  uvIndex?: number;
  visibility?: number;
  forecastSummary?: any;
  weatherCondition?: string;
  feelsLikeTemperature?: number;
  sunriseTime?: string;
  sunsetTime?: string;
  timestamp: string;
  dataSource: string;
  createdAt: string;
}

export interface UseWeatherDataOptions {
  latitude?: number;
  longitude?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWeatherData(options: UseWeatherDataOptions = {}) {
  const { autoRefresh = true, refreshInterval = 900000 } = options; // 15 minutes default
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for current weather data
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current weather from OpenWeatherMap
  const fetchCurrentWeather = useCallback(async (lat: number, lon: number): Promise<WeatherData> => {
    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed * 3.6, // Convert m/s to km/h
      windDirection: data.wind.deg,
      windGust: data.wind.gust ? data.wind.gust * 3.6 : undefined,
      airPressure: data.main.pressure,
      rainProbability: data.rain ? data.rain['1h'] : undefined,
      uvIndex: undefined, // OpenWeatherMap doesn't provide UV index in basic plan
      visibility: data.visibility / 1000, // Convert m to km
      weatherCondition: data.weather[0].main,
      feelsLikeTemperature: data.main.feels_like,
      sunriseTime: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      sunsetTime: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      timestamp: new Date().toISOString(),
      dataSource: 'OpenWeatherMap API'
    };
  }, []);

  // Fetch forecast from Open-Meteo
  const fetchForecast = useCallback(async (lat: number, lon: number): Promise<ForecastData[]> => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`
    );

    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.daily.time.map((date: string, index: number) => ({
      date,
      temperature: {
        min: data.daily.temperature_2m_min[index],
        max: data.daily.temperature_2m_max[index],
        avg: data.daily.temperature_2m_mean[index]
      },
      humidity: 70, // Open-Meteo doesn't provide humidity in daily forecast
      windSpeed: data.daily.wind_speed_10m_max[index],
      windDirection: data.daily.wind_direction_10m_dominant[index],
      rainProbability: data.daily.precipitation_probability_max[index],
      weatherCondition: 'Unknown', // Open-Meteo doesn't provide weather conditions
      uvIndex: undefined
    }));
  }, []);

  // Fetch wind data from Open-Meteo
  const fetchWindData = useCallback(async (lat: number, lon: number) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`
    );

    if (!response.ok) {
      throw new Error(`Wind API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windGust: data.current.wind_gusts_10m
    };
  }, []);

  // Save comprehensive reading to database
  const saveComprehensiveReading = useCallback(async (
    aqiData: any,
    weatherData: WeatherData,
    forecastData: ForecastData[],
    lat: number,
    lon: number
  ) => {
    if (!user) {
      console.log('No user, skipping save');
      return null;
    }

    try {
      const reading = {
        user_id: user.id,
        latitude: lat,
        longitude: lon,
        location_name: aqiData.location || 'Unknown Location',
        aqi: aqiData.aqi,
        pm25: aqiData.pollutants?.pm2_5,
        pm10: aqiData.pollutants?.pm10,
        no2: aqiData.pollutants?.no2,
        so2: aqiData.pollutants?.so2,
        co: aqiData.pollutants?.co,
        o3: aqiData.pollutants?.o3,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        wind_speed: weatherData.windSpeed,
        wind_direction: weatherData.windDirection,
        wind_gust: weatherData.windGust,
        air_pressure: weatherData.airPressure,
        rain_probability: weatherData.rainProbability,
        uv_index: weatherData.uvIndex,
        visibility: weatherData.visibility,
        forecast_summary: forecastData,
        weather_condition: weatherData.weatherCondition,
        feels_like_temperature: weatherData.feelsLikeTemperature,
        sunrise_time: weatherData.sunriseTime,
        sunset_time: weatherData.sunsetTime,
        data_source: 'Integrated Weather System'
      };

      const { data, error } = await supabase
        .from('air_quality_readings')
        .insert(reading)
        .select()
        .single();

      if (error) {
        console.error('Error saving comprehensive reading:', error);
        throw error;
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['weather-readings', user.id] });
      queryClient.invalidateQueries({ queryKey: ['air-quality-readings', user.id] });

      return data;
    } catch (error) {
      console.error('Error saving comprehensive reading:', error);
      throw error;
    }
  }, [user, queryClient]);

  // Main function to fetch all weather data
  const fetchAllWeatherData = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [weatherData, forecastData, windData] = await Promise.all([
        fetchCurrentWeather(lat, lon),
        fetchForecast(lat, lon),
        fetchWindData(lat, lon)
      ]);

      // Merge wind data with weather data
      const comprehensiveWeather: WeatherData = {
        ...weatherData,
        windSpeed: windData.windSpeed,
        windDirection: windData.windDirection,
        windGust: windData.windGust
      };

      setCurrentWeather(comprehensiveWeather);
      setForecast(forecastData);

      return {
        weather: comprehensiveWeather,
        forecast: forecastData
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      toast({
        title: 'Weather Data Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentWeather, fetchForecast, fetchWindData, toast]);

  // React Query for weather data
  const weatherQuery = useQuery({
    queryKey: ['weather-data', options.latitude, options.longitude],
    queryFn: () => {
      if (!options.latitude || !options.longitude) {
        throw new Error('Latitude and longitude are required');
      }
      return fetchAllWeatherData(options.latitude, options.longitude);
    },
    enabled: !!(options.latitude && options.longitude),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 300000, // 5 minutes
    gcTime: 900000, // 15 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // React Query for user's weather readings
  const userReadingsQuery = useQuery({
    queryKey: ['weather-readings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('comprehensive_weather_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ComprehensiveReading[];
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });

  // Mutation for saving comprehensive readings
  const saveReadingMutation = useMutation({
    mutationFn: ({ aqiData, weatherData, forecastData, lat, lon }: {
      aqiData: any;
      weatherData: WeatherData;
      forecastData: ForecastData[];
      lat: number;
      lon: number;
    }) => saveComprehensiveReading(aqiData, weatherData, forecastData, lat, lon),
    onSuccess: () => {
      toast({
        title: 'Data Saved',
        description: 'Weather and air quality data saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Save Error',
        description: `Failed to save data: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !options.latitude || !options.longitude) return;

    const interval = setInterval(() => {
      if (options.latitude && options.longitude) {
        fetchAllWeatherData(options.latitude, options.longitude);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, options.latitude, options.longitude, fetchAllWeatherData]);

  // Handle coordinate changes and trigger data fetch
  useEffect(() => {
    if (options.latitude && options.longitude) {
      console.log('useWeatherData: Coordinates changed, triggering data fetch:', options.latitude, options.longitude);
      // Reset state when coordinates change
      setCurrentWeather(null);
      setForecast([]);
      setError(null);
      // Trigger the query to fetch new data
      weatherQuery.refetch();
    }
  }, [options.latitude, options.longitude, weatherQuery.refetch]);

  // Memoized values
  const weatherSummary = useMemo(() => {
    if (!currentWeather) return null;

    return {
      current: currentWeather,
      forecast: forecast.slice(0, 7), // Next 7 days
      lastUpdated: currentWeather.timestamp
    };
  }, [currentWeather, forecast]);

  return {
    // Current state
    currentWeather,
    forecast,
    loading: loading || weatherQuery.isLoading,
    error: error || weatherQuery.error?.message,
    
    // Queries
    weatherQuery,
    userReadingsQuery,
    
    // Actions
    fetchAllWeatherData,
    saveReadingMutation,
    
    // Computed values
    weatherSummary,
    
    // Utilities
    refetch: weatherQuery.refetch,
    isStale: weatherQuery.isStale
  };
}
