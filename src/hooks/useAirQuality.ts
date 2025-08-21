import { useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store";
import { usePerformanceMonitor, useThrottle } from "@/hooks/usePerformance";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";

export interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  location: string;
  userLocation: string;
  coordinates: { lat: number; lon: number };
  userCoordinates: { lat: number; lon: number };
  timestamp: string;
  dataSource: string;
  userPoints?: number;
  currencyRewards?: number;
  canWithdraw?: boolean;
  environmental?: {
    temperature: number;
    humidity: number;
    windSpeed?: number;
    windDirection?: number;
    windGust?: number;
    airPressure?: number;
    rainProbability?: number;
    uvIndex?: number;
    visibility?: number;
    weatherCondition?: string;
    feelsLikeTemperature?: number;
    sunriseTime?: string;
    sunsetTime?: string;
  };
}

export const useAirQuality = () => {
  const { setCurrentAQI, setCurrentLocation, setLoading, setError } = useAppStore();
  const { user } = useAuth();
  const { hasUserConsent, hasRequestedPermission, getCurrentLocation } = useLocation();
  
  // Performance monitoring
  usePerformanceMonitor("useAirQuality");
  
  // Throttled location update
  const throttledLocationUpdate = useThrottle((location: string) => {
    setCurrentLocation(location);
  }, 5000);

  // Function to save air quality reading to database
  const saveReadingToDatabase = useCallback(async (data: AirQualityData) => {
    // Wait a bit for user to be fully loaded
    if (!user) {
      console.log('saveReadingToDatabase: No user, skipping save');
      return;
    }

    // Additional check to ensure user is fully authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('saveReadingToDatabase: No active session, skipping save');
      return;
    }

    try {
      console.log('saveReadingToDatabase: Starting to save reading for user:', user.id);
      
      const reading = {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        location_name: data.userLocation || data.location,
        latitude: data.userCoordinates.lat || data.coordinates.lat,
        longitude: data.userCoordinates.lon || data.coordinates.lon,
        aqi: data.aqi,
        pm25: data.pm25,
        pm10: data.pm10,
        no2: data.no2,
        so2: data.so2,
        co: data.co,
        o3: data.o3,
        temperature: data.environmental?.temperature || null,
        humidity: data.environmental?.humidity || null,
        data_source: data.dataSource,
        created_at: new Date().toISOString()
      };

      // Add comprehensive weather data if available
      if (data.environmental) {
        Object.assign(reading, {
          wind_speed: data.environmental.windSpeed || null,
          wind_direction: data.environmental.windDirection || null,
          wind_gust: data.environmental.windGust || null,
          air_pressure: data.environmental.airPressure || null,
          rain_probability: data.environmental.rainProbability || null,
          uv_index: data.environmental.uvIndex || null,
          visibility: data.environmental.visibility || null,
          weather_condition: data.environmental.weatherCondition || null,
          feels_like_temperature: data.environmental.feelsLikeTemperature || null,
          sunrise_time: data.environmental.sunriseTime || null,
          sunset_time: data.environmental.sunsetTime || null,
        });
      }

      console.log('saveReadingToDatabase: Attempting to insert reading:', reading);

      const { error } = await supabase
        .from('air_quality_readings')
        .insert(reading);

      if (error) {
        console.error('Error saving reading to database:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      } else {
        console.log('Air quality reading saved to database successfully');
      }
    } catch (error) {
      console.error('Error saving reading:', error);
    }
  }, [user]);

  // Function to fetch air quality data from OpenWeatherMap Air Pollution API
  const fetchOpenWeatherMapAirQuality = useCallback(async (latitude: number, longitude: number) => {
    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      console.log('OpenWeatherMap API key not configured, skipping air pollution data fetch');
      return null;
    }

    try {
      console.log('Fetching air quality data from OpenWeatherMap Air Pollution API...');
      
      const response = await fetch(
        `http://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`OpenWeatherMap API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OpenWeatherMap Air Pollution API response:', data);

      if (data.list && data.list.length > 0) {
        const currentData = data.list[0];
        const components = currentData.components;
        const main = currentData.main;

        // Convert OpenWeatherMap AQI to standard scale (1-5 to 0-500)
        const aqiMap = {
          1: 50,   // Good
          2: 100,  // Fair
          3: 150,  // Moderate
          4: 200,  // Poor
          5: 300   // Very Poor
        };

        const standardAQI = aqiMap[main.aqi] || main.aqi * 50;

        return {
          aqi: standardAQI,
          pm25: components.pm2_5,
          pm10: components.pm10,
          no2: components.no2,
          so2: components.so2,
          co: components.co,
          o3: components.o3,
          location: 'OpenWeatherMap Air Pollution API',
          userLocation: 'Current Location',
          coordinates: { lat: latitude, lon: longitude },
          userCoordinates: { lat: latitude, lon: longitude },
          timestamp: new Date().toLocaleString(),
          dataSource: 'OpenWeatherMap Air Pollution API',
          userPoints: 0,
          currencyRewards: 0,
          canWithdraw: false
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching OpenWeatherMap air quality data:', error);
      return null;
    }
  }, []);

  // Manual refresh function that can use either API
  const manualRefresh = useCallback(async () => {
    if (!hasUserConsent) {
      console.log('Manual refresh skipped - user consent not granted');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const location = await getCurrentLocation();
      if (!location) {
        throw new Error('Unable to get current location');
      }

      // Try OpenWeatherMap first if available
      const openWeatherMapData = await fetchOpenWeatherMapAirQuality(location.coords.latitude, location.coords.longitude);
      if (openWeatherMapData) {
        console.log('Manual refresh: Using OpenWeatherMap Air Pollution API');
        // Update global state
        setCurrentAQI(openWeatherMapData.aqi);
        setCurrentLocation(openWeatherMapData.location);
        throttledLocationUpdate(openWeatherMapData.location);
        
        // Save reading to database
        await saveReadingToDatabase(openWeatherMapData);
        return openWeatherMapData;
      }

      // Fallback to OpenAQ if OpenWeatherMap is not available
      console.log('Manual refresh: Falling back to OpenAQ API');
      // We'll handle this in the main fetch function
      return null;
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh air quality data');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [hasUserConsent, getCurrentLocation, fetchOpenWeatherMapAirQuality, setCurrentAQI, setCurrentLocation, throttledLocationUpdate, saveReadingToDatabase, setLoading, setError]);

  // Enhanced fetch function that tries both APIs
  const fetchAirQualityData = useCallback(async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    // Only proceed if user has given consent
    if (!hasUserConsent) {
      console.log('useAirQuality: Skipping geolocation - user consent not granted yet');
      throw new Error('Location access not yet granted. Please click the location button to enable.');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('useAirQuality: Starting geolocation request with user consent');

      // Get current location using the centralized location context
      const position = await getCurrentLocation();

      console.log('useAirQuality: Geolocation successful, coordinates:', position.coords.latitude, position.coords.longitude);

      const { latitude, longitude } = position.coords;
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('User session:', session ? 'Authenticated' : 'Not authenticated');
      
      // Try OpenAQ first
      const openAQResponse = await supabase.functions.invoke('get-air-quality', {
        body: { lat: latitude, lon: longitude }
      });

      if (openAQResponse.error) {
        console.error('❌ Supabase function error (OpenAQ):', openAQResponse.error.message);
        
        // Check for specific API key configuration errors
        if (openAQResponse.error.message.includes('OpenAQ API key not configured')) {
          console.error('🔑 MISSING OPENAQ API KEY - Air quality monitoring unavailable');
          console.error('📋 To fix this issue:');
          console.error('   1. Go to your Supabase project dashboard');
          console.error('   2. Navigate to Settings → Environment variables');
          console.error('   3. Add: OPENAQ_API_KEY = your_api_key_here');
          console.error('   4. Get your API key from: https://docs.openaq.org/docs/getting-started');
          console.error('   5. Redeploy your Supabase Edge Functions');
        } else if (openAQResponse.error.message.includes('OpenAQ API failure')) {
          console.error('🌐 OPENAQ API FAILURE - Check API key and network connectivity');
        }
        
        // Fallback to OpenWeatherMap if OpenAQ fails
        const openWeatherMapData = await fetchOpenWeatherMapAirQuality(latitude, longitude);
        if (openWeatherMapData) {
          console.log('Using OpenWeatherMap Air Pollution API as fallback for OpenAQ failure');
          // Update global state
          setCurrentAQI(openWeatherMapData.aqi);
          setCurrentLocation(openWeatherMapData.location);
          throttledLocationUpdate(openWeatherMapData.location);
          
          // Save reading to database
          console.log('fetchAirQualityData: About to save reading to database (OpenWeatherMap fallback)');
          await saveReadingToDatabase(openWeatherMapData);
          console.log('fetchAirQualityData: Reading saved to database (OpenWeatherMap fallback)');
          
          return openWeatherMapData;
        }
        
        throw new Error(`Supabase function error (OpenAQ): ${openAQResponse.error.message}`);
      }

      if (!openAQResponse.data) {
        throw new Error('No response data received from OpenAQ function');
      }
      
      // Check for error responses from the Edge Function
      if (openAQResponse.data && typeof openAQResponse.data === 'object' && 'error' in openAQResponse.data) {
        const errorResponse = openAQResponse.data as any;
        console.error('❌ Edge Function returned error (OpenAQ):', errorResponse.error);
        console.error('📝 Message:', errorResponse.message);
        console.error('📋 Instructions:', errorResponse.instructions);
        
        if (errorResponse.error === 'OpenAQ API key not configured') {
          console.error('🔑 MISSING OPENAQ API KEY - Air quality monitoring unavailable');
          console.error('📋 To fix this issue:');
          console.error('   1. Go to your Supabase project dashboard');
          console.error('   2. Navigate to Settings → Environment variables');
          console.error('   3. Add: OPENAQ_API_KEY = your_api_key_here');
          console.error('   4. Get your API key from: https://docs.openaq.org/docs/getting-started');
          console.error('   5. Redeploy your Supabase Edge Functions');
        }
        
        // Fallback to OpenWeatherMap if OpenAQ fails
        const openWeatherMapData = await fetchOpenWeatherMapAirQuality(latitude, longitude);
        if (openWeatherMapData) {
          console.log('Using OpenWeatherMap Air Pollution API as fallback for OpenAQ failure');
          // Update global state
          setCurrentAQI(openWeatherMapData.aqi);
          setCurrentLocation(openWeatherMapData.location);
          throttledLocationUpdate(openWeatherMapData.location);
          
          // Save reading to database
          console.log('fetchAirQualityData: About to save reading to database (OpenWeatherMap fallback)');
          await saveReadingToDatabase(openWeatherMapData);
          console.log('fetchAirQualityData: Reading saved to database (OpenWeatherMap fallback)');
          
          return openWeatherMapData;
        }
        
        throw new Error(`Edge Function error (OpenAQ): ${errorResponse.error} - ${errorResponse.message}`);
      }

      // Debug: Log the response structure
      console.log('Supabase function response (OpenAQ):', openAQResponse.data);
      console.log('Response type:', typeof openAQResponse.data);
      console.log('Response keys:', Object.keys(openAQResponse.data));

      // Check if the response has the expected structure
      if (openAQResponse.data && typeof openAQResponse.data === 'object' && 'pollutants' in openAQResponse.data) {
        // New enhanced format with capital city data
        const typedResponse = openAQResponse.data as any;
        console.log('Using enhanced format (OpenAQ), AQI:', typedResponse.aqi);
        
        // Update global state
        setCurrentAQI(typedResponse.aqi);
        setCurrentLocation(typedResponse.location);
        throttledLocationUpdate(typedResponse.location);
        
        const airQualityData = {
          aqi: typedResponse.aqi,
          pm25: typedResponse.pollutants.pm25,
          pm10: typedResponse.pollutants.pm10,
          no2: typedResponse.pollutants.no2,
          so2: typedResponse.pollutants.so2,
          co: typedResponse.pollutants.co,
          o3: typedResponse.pollutants.o3,
          location: typedResponse.location,
          userLocation: typedResponse.userLocation || 'Unknown Location',
          coordinates: typedResponse.coordinates || { lat: 0, lon: 0 },
          userCoordinates: typedResponse.userCoordinates || { lat: 0, lon: 0 },
          timestamp: new Date(typedResponse.timestamp).toLocaleString(),
          dataSource: typedResponse.dataSource || 'Unknown Source',
          userPoints: typedResponse.userPoints,
          currencyRewards: typedResponse.currencyRewards,
          canWithdraw: typedResponse.canWithdraw,
          environmental: typedResponse.environmental || null
        };

        // Save reading to database
        console.log('fetchAirQualityData: About to save reading to database (enhanced format)');
        await saveReadingToDatabase(airQualityData);
        console.log('fetchAirQualityData: Reading saved to database (enhanced format)');
        
        return airQualityData;
      } else if (openAQResponse.data && typeof openAQResponse.data === 'object' && 'list' in openAQResponse.data && Array.isArray((openAQResponse.data as any).list)) {
        // Raw OpenWeatherMap format (fallback)
        const typedResponse = openAQResponse.data as any;
        const currentData = typedResponse.list[0];
        
        const airQualityData = {
          aqi: currentData.main.aqi,
          pm25: currentData.components.pm2_5,
          pm10: currentData.components.pm10,
          no2: currentData.components.no2,
          so2: currentData.components.so2,
          co: currentData.components.co,
          o3: currentData.components.o3,
          location: typedResponse.location || 'Unknown Location',
          userLocation: 'Location data unavailable',
          coordinates: { lat: 0, lon: 0 },
          userCoordinates: { lat: 0, lon: 0 },
          timestamp: new Date().toLocaleString(),
          dataSource: 'Direct API response'
        };

        // Save reading to database
        console.log('fetchAirQualityData: About to save reading to database (fallback format)');
        await saveReadingToDatabase(airQualityData);
        console.log('fetchAirQualityData: Reading saved to database (fallback format)');
        
        return airQualityData;
      } else {
        // Fallback for unexpected format
        console.error('Unexpected response format (OpenAQ):', openAQResponse.data);
        throw new Error('Unexpected data format received from API');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      
      // Only log geolocation errors if user has actually granted consent
      if (hasUserConsent && err instanceof GeolocationPositionError) {
        // Reduce console noise for common geolocation errors
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            console.log('Location permission denied - user needs to enable location access');
            break;
          case 2: // POSITION_UNAVAILABLE
            console.log('Position unavailable - this may be a temporary issue with location services');
            break;
          case 3: // TIMEOUT
            console.log('Location request timed out - please try again');
            break;
          default:
            console.error('Geolocation error after user consent:', err);
        }
      } else if (!hasUserConsent && err instanceof GeolocationPositionError) {
        // Don't log errors when user hasn't consented yet
        console.log('Geolocation skipped - user consent not granted yet');
      } else {
        console.error('Error in fetchAirQualityData:', err);
      }
      
      console.error('useAirQuality.fetchAirQualityData error:', error);
      throw error; // Re-throw to be caught by useQuery
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentAQI, setCurrentLocation, throttledLocationUpdate, hasUserConsent, saveReadingToDatabase, getCurrentLocation, fetchOpenWeatherMapAirQuality]);

  const query = useQuery({
    queryKey: ['airQuality', hasUserConsent, hasRequestedPermission, user?.id],
    queryFn: fetchAirQualityData,
    gcTime: 2 * 60 * 1000, // Cache for 2 minutes
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: false, // Disable auto-refresh when user returns to tab to prevent loops
    refetchOnMount: true, // Enable mount fetch when conditions are met
    refetchOnReconnect: false, // Disable auto-fetch on reconnect to prevent loops
    refetchInterval: false, // Disable automatic refresh to prevent loops
    refetchIntervalInBackground: false, // Disable background refresh to save battery
    retry: 1, // Reduce retries to prevent loops
    retryDelay: 2000, // Increase retry delay
    enabled: hasUserConsent && hasRequestedPermission && !!user, // Only run when everything is ready including user
  });

  // Debug logging for permission states and refresh behavior
  useEffect(() => {
    console.log('useAirQuality: Permission states:', { hasUserConsent, hasRequestedPermission, isLoading: query.isLoading });
    
    // Log refresh interval status
    if (hasUserConsent) {
      console.log('useAirQuality: Auto-refresh enabled - data will refresh every 15 minutes');
    } else {
      console.log('useAirQuality: Auto-refresh disabled - user consent required');
    }
  }, [hasUserConsent, hasRequestedPermission, query.isLoading]);

  // Log when data is being refetched
  useEffect(() => {
    if (query.isRefetching) {
      console.log('useAirQuality: Refreshing air quality data...');
    }
  }, [query.isRefetching]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    manualRefresh,
    hasUserConsent,
    hasRequestedPermission
  };
};
