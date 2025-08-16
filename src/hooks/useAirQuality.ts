import { useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store";
import { useErrorHandler } from "@/components/ErrorBoundary/ErrorBoundary";
import { usePerformanceMonitor, useThrottle } from "@/hooks/usePerformance";

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
  };
}

export const useAirQuality = () => {
  const { setCurrentAQI, setCurrentLocation, setLoading, setError } = useAppStore();
  const { handleError } = useErrorHandler();
  const [hasUserConsent, setHasUserConsent] = useState(false);
  
  // Performance monitoring
  usePerformanceMonitor("useAirQuality");
  
  // Throttled location update
  const throttledLocationUpdate = useThrottle((location: string) => {
    setCurrentLocation(location);
  }, 5000);

  // Check and restore location permission on mount
  useEffect(() => {
    const checkLocationPermission = async () => {
      // Check if we have stored permission
      const storedPermission = localStorage.getItem('breath-safe-location-permission');
      
      if (storedPermission === 'granted') {
        // Check if browser still has permission
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            if (permissionStatus.state === 'granted') {
              setHasUserConsent(true);
              return;
            } else if (permissionStatus.state === 'denied') {
              setHasUserConsent(false);
              localStorage.removeItem('breath-safe-location-permission');
              return;
            }
          } catch (error) {
            console.log('Permission API not supported, using stored permission');
          }
        }
        
        // If permission API not supported, trust stored permission
        setHasUserConsent(true);
      } else if (storedPermission === 'denied') {
        setHasUserConsent(false);
      }
    };

    checkLocationPermission();
  }, []);

  const fetchAirQualityData = useCallback(async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by your browser');
    }

    // Only proceed if user has given consent or if we're using cached coordinates
    if (!hasUserConsent) {
      throw new Error('Location access not yet granted. Please click the location button to enable.');
    }

    try {
      setLoading(true);
      setError(null);

      // Simple, reliable location detection that works on mobile
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000, // 30 seconds - mobile devices need more time
          enableHighAccuracy: false, // Disable high accuracy for mobile compatibility
          maximumAge: 10 * 60 * 1000 // Allow 10-minute old data for mobile
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('User session:', session ? 'Authenticated' : 'Not authenticated');
      
      const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
        body: { lat: latitude, lon: longitude }
      });

      if (error) {
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!response) {
        throw new Error('No response data received');
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
        
        return {
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
          canWithdraw: typedResponse.canWithdraw
        };
      } else if (response && typeof response === 'object' && 'list' in response && Array.isArray((response as any).list)) {
        // Raw OpenWeatherMap format (fallback)
        const typedResponse = response as any;
        const currentData = typedResponse.list[0];
        return {
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
      } else {
        // Fallback for unexpected format
        console.error('Unexpected response format:', response);
        throw new Error('Unexpected data format received from API');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      handleError(error, 'useAirQuality.fetchAirQualityData');
      throw error; // Re-throw to be caught by useQuery
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, handleError, setCurrentAQI, setCurrentLocation, throttledLocationUpdate, hasUserConsent]);

  // Function to request location permission (should be called on user gesture)
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      return false;
    }

    try {
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000,
          enableHighAccuracy: false,
          maximumAge: 10 * 60 * 1000
        });
      });

      if (position) {
        setHasUserConsent(true);
        // Store permission in localStorage
        localStorage.setItem('breath-safe-location-permission', 'granted');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Location permission denied:', error);
      // Store denied permission to avoid repeated prompts
      localStorage.setItem('breath-safe-location-permission', 'denied');
      return false;
    }
  }, []);

  const query = useQuery({
    queryKey: ['airQuality', hasUserConsent],
    queryFn: fetchAirQualityData,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Disable auto-refresh when user returns
    refetchOnMount: false, // Don't auto-fetch on mount
    refetchOnReconnect: false, // Don't auto-fetch on reconnect
    refetchInterval: false, // Disable automatic interval refreshing
    refetchIntervalInBackground: false, // Disable background refresh
    retry: 2, // Reduce retries for faster failure detection
    retryDelay: 500, // Faster retry delay
    enabled: hasUserConsent, // Only run query if user has consented
  });

  return {
    ...query,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isLoading: query.isLoading,
    error: query.error,
    data: query.data,
    hasUserConsent,
    requestLocationPermission
  };
};
