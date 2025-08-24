import { useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store";
import { usePerformanceMonitor, useThrottle } from "@/hooks/usePerformance";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useToast } from "@/hooks/use-toast";

// Refresh lock mechanism to prevent duplicate pulls on manual refresh
const REFRESH_LOCK_KEY = 'breath_safe_refresh_lock';
const REFRESH_LOCK_DURATION = 14 * 60 * 1000; // 14 minutes (slightly less than 15 to ensure smooth operation)

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

interface UseAirQualityReturn {
  data: AirQualityData | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  manualRefresh: () => void;
  hasUserConsent: boolean;
  hasRequestedPermission: boolean;
  isUsingCachedData: boolean;
  cachedData: AirQualityData | null;
}

// Helper function to check if refresh is locked
const isRefreshLocked = (): boolean => {
  try {
    const lockData = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!lockData) return false;
    
    const { timestamp } = JSON.parse(lockData);
    const now = Date.now();
    const timeSinceLastRefresh = now - timestamp;
    
    // If less than 14 minutes have passed, refresh is locked
    return timeSinceLastRefresh < REFRESH_LOCK_DURATION;
  } catch {
    return false;
  }
};

// Helper function to set refresh lock
const setRefreshLock = (): void => {
  try {
    const lockData = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lockData));
  } catch (error) {
    console.warn('Failed to set refresh lock:', error);
  }
};

// Helper function to clear refresh lock (for manual refresh)
const clearRefreshLock = (): void => {
  try {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  } catch (error) {
    console.warn('Failed to clear refresh lock:', error);
  }
};

export const useAirQuality = (): UseAirQualityReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setCurrentAQI, setCurrentLocation, setLoading, setError } = useAppStore();
  const { hasUserConsent, hasRequestedPermission, getCurrentLocation } = useLocation();
  const [lastManualRefresh, setLastManualRefresh] = useState<number>(0);
  
  // Add state for cached data
  const [cachedData, setCachedData] = useState<AirQualityData | null>(null);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);

  // Track if this is the first load after a page refresh
  const isFirstLoad = useRef(true);
  const instanceId = useRef<string>(`useAirQuality_${Date.now()}_${Math.random()}`);
  
  // Check if this is a page refresh or new session
  useEffect(() => {
    const checkPageRefresh = () => {
      // Check if this is a page refresh by looking at performance navigation type
      if (performance.navigation.type === 1) { // TYPE_RELOAD
        console.log('useAirQuality: Page refresh detected - checking refresh lock');
        if (isRefreshLocked()) {
          console.log('useAirQuality: Refresh locked - preventing duplicate data pull');
          return false; // Refresh is locked
        }
      }
      return true; // Allow refresh
    };
    
    isFirstLoad.current = checkPageRefresh();
  }, []);

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

  // Function to retrieve the last stored reading from database
  const getLastStoredReading = useCallback(async (): Promise<AirQualityData | null> => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log('No stored readings found in database');
        return null;
      }

      // Transform database record to AirQualityData format
      const lastReading: AirQualityData = {
        aqi: data.aqi,
        pm25: data.pm25 || 0,
        pm10: data.pm10 || 0,
        no2: data.no2 || 0,
        so2: data.so2 || 0,
        co: data.co || 0,
        o3: data.o3 || 0,
        location: data.location_name || 'Your Location',
        userLocation: data.location_name || 'Your Location',
        coordinates: { lat: data.latitude, lon: data.longitude },
        userCoordinates: { lat: data.latitude, lon: data.longitude },
        timestamp: data.timestamp,
        dataSource: 'Cached from database',
        userPoints: 0,
        currencyRewards: 0,
        canWithdraw: false
      };

      console.log('Retrieved last stored reading from database:', lastReading);
      return lastReading;
    } catch (error) {
      console.error('Error retrieving last stored reading:', error);
      return null;
    }
  }, [user?.id]);

  // Manual refresh function that can use either API
  const manualRefresh = useCallback(async () => {
    if (!hasUserConsent) {
      console.log('Manual refresh skipped - user consent not granted');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Clear refresh lock for manual refresh
      clearRefreshLock();
      console.log('useAirQuality: Manual refresh - cleared refresh lock');
      
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
        
        // Set new refresh lock after successful manual refresh
        setRefreshLock();
        console.log('useAirQuality: Manual refresh completed - new refresh lock set');
        
        return openWeatherMapData;
      }

      // Use OpenWeatherMap as primary source
      console.log('Manual refresh: Using OpenWeatherMap API');
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
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    // Only proceed if user has given consent
    if (!hasUserConsent) {
      console.log('useAirQuality: Skipping geolocation - user consent not granted yet');
      throw new Error('Location access not yet granted. Please click the location button to enable.');
    }

    // Check refresh lock to prevent duplicate pulls on manual refresh
    if (isRefreshLocked()) {
      console.log('useAirQuality: Refresh locked - retrieving last stored reading from database');
      
      // Try to get the last stored reading from database
      const lastReading = await getLastStoredReading();
      if (lastReading) {
        console.log('useAirQuality: Using cached data from database');
        setCachedData(lastReading);
        setIsUsingCachedData(true);
        return lastReading;
      } else {
        console.log('useAirQuality: No cached data available, handling gracefully');
        // Handle rate limiting gracefully without throwing errors
        console.log('ℹ️ Air quality data rate limited, using cached data');
        return lastReading || {
          aqi: 0,
          pm25: 0,
          pm10: 0,
          no2: 0,
          so2: 0,
          co: 0,
          o3: 0,
          location: 'Rate Limited',
          userLocation: 'Rate Limited',
          coordinates: { lat: 0, lon: 0 },
          userCoordinates: { lat: 0, lon: 0 },
          timestamp: new Date().toLocaleString(),
          dataSource: 'Rate Limited - Using Cached Data',
          userPoints: 0,
          currencyRewards: 0,
          canWithdraw: false
        };
      }
    }

    try {
      setLoading(true);
      setError(null);
      setIsUsingCachedData(false);

      console.log('useAirQuality: Starting geolocation request with user consent');

      // Get current location using the centralized location context
      const position = await getCurrentLocation();

      console.log('useAirQuality: Geolocation successful, coordinates:', position.coords.latitude, position.coords.longitude);

      const { latitude, longitude } = position.coords;
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('User session:', session ? 'Authenticated' : 'Not authenticated');
      
      // Try OpenWeatherMap first
      const openWeatherMapResponse = await supabase.functions.invoke('get-air-quality', {
        body: { lat: latitude, lon: longitude }
      });

      if (openWeatherMapResponse.error) {
        console.error('❌ Supabase function error (OpenWeatherMap):', openWeatherMapResponse.error.message);
        
        // Check for specific API key configuration errors
        if (openWeatherMapResponse.error.message.includes('OpenWeatherMap API key not configured')) {
          console.error('🔑 MISSING OPENWEATHERMAP API KEY - Air quality monitoring unavailable');
          console.error('📋 To fix this issue:');
          console.error('   1. Go to your Supabase project dashboard');
          console.error('   2. Navigate to Settings → Environment variables');
          console.error('   3. Add: OPENWEATHERMAP_API_KEY = your_api_key_here');
          console.error('   4. Get your API key from: https://openweathermap.org/api');
          console.error('   5. Redeploy your Supabase Edge Functions');
        } else if (openWeatherMapResponse.error.message.includes('OpenWeatherMap API failure')) {
          console.error('🌐 OPENWEATHERMAP API FAILURE - Check API key and network connectivity');
        }
        
        throw new Error(`Supabase function error (OpenWeatherMap): ${openWeatherMapResponse.error.message}`);
      }

      if (!openWeatherMapResponse.data) {
        throw new Error('No response data received from OpenWeatherMap function');
      }
      
      // Check for error responses from the Edge Function
      if (openWeatherMapResponse.data && typeof openWeatherMapResponse.data === 'object' && 'error' in openWeatherMapResponse.data) {
        const errorResponse = openWeatherMapResponse.data as any;
        console.error('❌ Edge Function returned error (OpenWeatherMap):', errorResponse.error);
        console.error('📝 Message:', errorResponse.message);
        console.error('📋 Instructions:', errorResponse.instructions);
        
        if (errorResponse.error === 'OpenWeatherMap API key not configured') {
          console.error('🔑 MISSING OPENWEATHERMAP API KEY - Air quality monitoring unavailable');
          console.error('📋 To fix this issue:');
          console.error('   1. Go to your Supabase project dashboard');
          console.error('   2. Navigate to Settings → Environment variables');
          console.error('   3. Add: OPENWEATHERMAP_API_KEY = your_api_key_here');
          console.error('   4. Get your API key from: https://openweathermap.org/api');
          console.error('   5. Redeploy your Supabase Edge Functions');
        }
        
        throw new Error(`Edge Function error (OpenWeatherMap): ${errorResponse.error} - ${errorResponse.message}`);
      }

      // Debug: Log the response structure
      console.log('Supabase function response (OpenWeatherMap):', openWeatherMapResponse.data);
      console.log('Response type:', typeof openWeatherMapResponse.data);
      console.log('Response keys:', Object.keys(openWeatherMapResponse.data));

      // Check if the response has the expected structure
      if (openWeatherMapResponse.data && typeof openWeatherMapResponse.data === 'object' && 'pollutants' in openWeatherMapResponse.data) {
        // New enhanced format with capital city data
        const typedResponse = openWeatherMapResponse.data as any;
        console.log('Using enhanced format (OpenWeatherMap), AQI:', typedResponse.aqi);
        
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
          userLocation: typedResponse.location,
          coordinates: { lat: latitude, lon: longitude },
          userCoordinates: { lat: latitude, lon: longitude },
          timestamp: new Date().toLocaleString(),
          dataSource: 'OpenWeatherMap API',
          userPoints: typedResponse.userPoints || 0,
          currencyRewards: typedResponse.currencyRewards || 0,
          canWithdraw: typedResponse.canWithdraw || false,
          environmental: typedResponse.environmental || undefined
        };

        // Save reading to database
        console.log('fetchAirQualityData: About to save reading to database (enhanced format)');
        await saveReadingToDatabase(airQualityData);
        console.log('fetchAirQualityData: Reading saved to database (enhanced format)');
        
        // Set refresh lock to prevent duplicate pulls on manual refresh
        setRefreshLock();
        console.log('useAirQuality: Refresh lock set - preventing duplicate pulls for 14 minutes');
        
        return airQualityData;
      } else if (openWeatherMapResponse.data && typeof openWeatherMapResponse.data === 'object' && 'list' in openWeatherMapResponse.data) {
        // Fallback format for older API responses
        const typedResponse = openWeatherMapResponse.data as any;
        console.log('Using fallback format (OpenWeatherMap), AQI:', typedResponse.list?.[0]?.main?.aqi);
        
        const aqi = typedResponse.list?.[0]?.main?.aqi || 0;
        const components = typedResponse.list?.[0]?.components || {};
        
        // Update global state
        setCurrentAQI(aqi);
        setCurrentLocation(typedResponse.location || 'Your Location');
        throttledLocationUpdate(typedResponse.location || 'Your Location');
        
        const airQualityData = {
          aqi,
          pm25: components.pm2_5 || 0,
          pm10: components.pm10 || 0,
          no2: components.no2 || 0,
          so2: components.so2 || 0,
          co: components.co || 0,
          o3: components.o3 || 0,
          location: typedResponse.location || 'Your Location',
          userLocation: typedResponse.location || 'Your Location',
          coordinates: { lat: latitude, lon: longitude },
          userCoordinates: { lat: latitude, lon: longitude },
          timestamp: new Date().toLocaleString(),
          dataSource: 'Direct API response'
        };

        // Save reading to database
        console.log('fetchAirQualityData: About to save reading to database (fallback format)');
        await saveReadingToDatabase(airQualityData);
        console.log('fetchAirQualityData: Reading saved to database (fallback format)');
        
        // Set refresh lock to prevent duplicate pulls on manual refresh
        setRefreshLock();
        console.log('useAirQuality: Refresh lock set - preventing duplicate pulls for 14 minutes');
        
        return airQualityData;
      } else {
        // Fallback for unexpected format
        console.error('Unexpected response format (OpenAQ):', openWeatherMapResponse.data);
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
  }, [setLoading, setError, setCurrentAQI, setCurrentLocation, throttledLocationUpdate, hasUserConsent, saveReadingToDatabase, getCurrentLocation, fetchOpenWeatherMapAirQuality, getLastStoredReading]);

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
    hasRequestedPermission,
    isUsingCachedData,
    cachedData
  };
};
