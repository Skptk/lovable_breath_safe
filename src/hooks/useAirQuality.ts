import { useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store";

import { usePerformanceMonitor, useThrottle } from "@/hooks/usePerformance";
import { useAuth } from "@/hooks/useAuth";

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
  const [hasUserConsent, setHasUserConsent] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false); // Prevent multiple simultaneous requests
  
  // Use refs to prevent multiple permission checks
  const permissionCheckedRef = useRef(false);
  const permissionCheckInProgressRef = useRef(false);
  const hookInstanceRef = useRef<string>(''); // Track hook instance
  
  // Performance monitoring
  usePerformanceMonitor("useAirQuality");
  
  // Throttled location update
  const throttledLocationUpdate = useThrottle((location: string) => {
    setCurrentLocation(location);
  }, 5000);

  // Check and restore location permission on mount
  useEffect(() => {
    // Generate unique instance ID for this hook call
    if (!hookInstanceRef.current) {
      hookInstanceRef.current = `hook_${Date.now()}_${Math.random()}`;
      console.log('useAirQuality: Hook instance created:', hookInstanceRef.current);
    }
    
    // Prevent multiple permission checks
    if (permissionCheckedRef.current || permissionCheckInProgressRef.current) {
      console.log('useAirQuality: Permission check already completed or in progress, skipping');
      return;
    }
    
    permissionCheckInProgressRef.current = true;
    console.log('useAirQuality: Starting permission check for instance:', hookInstanceRef.current);
    
    const checkLocationPermission = async () => {
      try {
        // Check if we have stored permission
        const storedPermission = localStorage.getItem('breath-safe-location-permission');
        
        if (storedPermission === 'granted') {
          // Check if browser still has permission
          if (navigator.permissions && navigator.permissions.query) {
            try {
              const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
              if (permissionStatus.state === 'granted') {
                setHasUserConsent(true);
                setHasRequestedPermission(true);
                permissionCheckedRef.current = true;
                console.log('useAirQuality: Permission check completed - user has consent');
                return;
              } else if (permissionStatus.state === 'denied') {
                setHasUserConsent(false);
                setHasRequestedPermission(true);
                localStorage.removeItem('breath-safe-location-permission');
                permissionCheckedRef.current = true;
                console.log('useAirQuality: Permission check completed - user denied consent');
                return;
              }
            } catch (error) {
              console.log('Permission API not supported, using stored permission');
            }
          }
          
          // If permission API not supported, trust stored permission
          setHasUserConsent(true);
          setHasRequestedPermission(true);
          permissionCheckedRef.current = true;
          console.log('useAirQuality: Permission check completed - using stored permission');
        } else if (storedPermission === 'denied') {
          setHasUserConsent(false);
          setHasRequestedPermission(true);
          permissionCheckedRef.current = true;
          console.log('useAirQuality: Permission check completed - stored permission denied');
        } else {
          // No stored permission, mark as checked but not consented
          setHasUserConsent(false);
          setHasRequestedPermission(true);
          permissionCheckedRef.current = true;
          console.log('useAirQuality: Permission check completed - no stored permission');
        }
      } finally {
        permissionCheckInProgressRef.current = false;
      }
    };

    checkLocationPermission();
  }, []);

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

  const fetchAirQualityData = useCallback(async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    // Only proceed if user has given consent or if we're using cached coordinates
    if (!hasUserConsent) {
      console.log('useAirQuality: Skipping geolocation - user consent not granted yet');
      throw new Error('Location access not yet granted. Please click the location button to enable.');
    }

    // Prevent multiple simultaneous location requests
    if (isRequestingLocation) {
      console.log('useAirQuality: Location request already in progress, skipping duplicate request');
      throw new Error('Location request already in progress. Please wait.');
    }

    try {
      setIsRequestingLocation(true);
      setLoading(true);
      setError(null);

      console.log('useAirQuality: Starting geolocation request with user consent');

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out after 45 seconds')), 45000);
      });

      // Simple, reliable location detection that works on mobile
      const positionPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000, // 30 seconds - mobile devices need more time
          enableHighAccuracy: false, // Disable high accuracy for mobile compatibility
          maximumAge: 10 * 60 * 1000 // Allow 10-minute old data for mobile
        });
      });

      // Race between timeout and geolocation
      const position = await Promise.race([positionPromise, timeoutPromise]);

      console.log('useAirQuality: Geolocation successful, coordinates:', position.coords.latitude, position.coords.longitude);

      const { latitude, longitude } = position.coords;
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('User session:', session ? 'Authenticated' : 'Not authenticated');
      
      const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
        body: { lat: latitude, lon: longitude }
      });

      if (error) {
        console.error('❌ Supabase function error:', error.message);
        
        // Check for specific API key configuration errors
        if (error.message.includes('OpenAQ API key not configured')) {
          console.error('🔑 MISSING OPENAQ API KEY - Air quality monitoring unavailable');
          console.error('📋 To fix this issue:');
          console.error('   1. Go to your Supabase project dashboard');
          console.error('   2. Navigate to Settings → Environment variables');
          console.error('   3. Add: OPENAQ_API_KEY = your_api_key_here');
          console.error('   4. Get your API key from: https://docs.openaq.org/docs/getting-started');
          console.error('   5. Redeploy your Supabase Edge Functions');
        } else if (error.message.includes('OpenAQ API failure')) {
          console.error('🌐 OPENAQ API FAILURE - Check API key and network connectivity');
        }
        
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!response) {
        throw new Error('No response data received');
      }
      
      // Check for error responses from the Edge Function
      if (response && typeof response === 'object' && 'error' in response) {
        const errorResponse = response as any;
        console.error('❌ Edge Function returned error:', errorResponse.error);
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
        
        throw new Error(`Edge Function error: ${errorResponse.error} - ${errorResponse.message}`);
      }

      // Debug: Log the response structure
      console.log('Supabase function response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));

      // Check if the response has the expected structure
      if (response && typeof response === 'object' && 'pollutants' in response) {
        // New enhanced format with capital city data
        const typedResponse = response as any;
        console.log('Using enhanced format, AQI:', typedResponse.aqi);
        
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
      } else if (response && typeof response === 'object' && 'list' in response && Array.isArray((response as any).list)) {
        // Raw OpenWeatherMap format (fallback)
        const typedResponse = response as any;
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
        console.error('Unexpected response format:', response);
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
      setIsRequestingLocation(false);
    }
  }, [setLoading, setError, setCurrentAQI, setCurrentLocation, throttledLocationUpdate, hasUserConsent, saveReadingToDatabase, isRequestingLocation]);

  // Function to request location permission (should be called on user gesture)
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      console.log('useAirQuality: Geolocation not supported by browser');
      return false;
    }

    // Prevent multiple simultaneous permission requests
    if (isRequestingLocation) {
      console.log('useAirQuality: Location permission request already in progress, skipping duplicate request');
      return false;
    }

    try {
      setIsRequestingLocation(true);
      console.log('useAirQuality: Starting location permission request for instance:', hookInstanceRef.current);
      
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000,
          enableHighAccuracy: false,
          maximumAge: 10 * 60 * 1000
        });
      });

      if (position) {
        console.log('useAirQuality: Location permission granted successfully for instance:', hookInstanceRef.current);
        setHasUserConsent(true);
        // Store permission in localStorage
        localStorage.setItem('breath-safe-location-permission', 'granted');
        return true;
      }
      return false;
    } catch (error) {
      // Only log specific error types, reduce console noise
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            console.log('useAirQuality: Location permission denied by user for instance:', hookInstanceRef.current);
            break;
          case 2: // POSITION_UNAVAILABLE
            console.log('useAirQuality: Location position unavailable for instance:', hookInstanceRef.current);
            break;
          case 3: // TIMEOUT
            console.log('useAirQuality: Location request timed out for instance:', hookInstanceRef.current);
            break;
          default:
            console.log('useAirQuality: Location permission error for instance:', hookInstanceRef.current, error.message);
        }
      } else {
        console.log('useAirQuality: Location permission request failed for instance:', hookInstanceRef.current, error);
      }
      
      // Store denied permission to avoid repeated prompts
      localStorage.setItem('breath-safe-location-permission', 'denied');
      return false;
    } finally {
      setIsRequestingLocation(false);
    }
  }, [isRequestingLocation]);

  const query = useQuery({
    queryKey: ['airQuality', hasUserConsent, permissionCheckedRef.current, hookInstanceRef.current],
    queryFn: fetchAirQualityData,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Disable auto-refresh when user returns to tab to prevent loops
    refetchOnMount: false, // Disable auto-fetch on mount to prevent loops
    refetchOnReconnect: false, // Disable auto-fetch on reconnect to prevent loops
    refetchInterval: false, // Disable automatic refresh to prevent loops
    refetchIntervalInBackground: false, // Disable background refresh to save battery
    retry: 1, // Reduce retries to prevent loops
    retryDelay: 1000, // Increase retry delay
    enabled: hasUserConsent && hasRequestedPermission && permissionCheckedRef.current && hookInstanceRef.current !== '', // Only run when everything is ready
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
    ...query,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isLoading: query.isLoading,
    error: query.error,
    data: query.data,
    hasUserConsent,
    hasRequestedPermission,
    requestLocationPermission,
    // Add manual refresh function for user control
    manualRefresh: () => {
      if (hasUserConsent && permissionCheckedRef.current) {
        console.log('Manual refresh requested by user');
        return query.refetch();
      } else {
        console.log('Manual refresh skipped - user consent or permission check not ready');
        return Promise.resolve({ data: undefined, error: null });
      }
    }
  };
};
