import { useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store";
import { usePerformanceMonitor, useThrottle } from "@/hooks/usePerformance";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useGlobalEnvironmentalData } from "@/hooks/useGlobalEnvironmentalData";

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
  refetch: () => Promise<void>;
  manualRefresh: () => Promise<void>;
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
      instance: `useAirQuality_${Date.now()}_${Math.random()}`
    };
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lockData));
  } catch (error) {
    console.warn('Failed to set refresh lock:', error);
  }
};

// Helper function to clear refresh lock
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

  // Get user's current location for fetching nearest environmental data
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  // Use the new global environmental data hook
  const {
    data: globalEnvironmentalData,
    isLoading: globalDataLoading,
    error: globalDataError,
    refetch: refetchGlobalData,
    lastUpdated: globalDataLastUpdated,
    dataAge: globalDataAge
  } = useGlobalEnvironmentalData({
    latitude: userCoordinates?.lat,
    longitude: userCoordinates?.lng,
    maxDistanceKm: 50,
    autoRefresh: true,
    refreshInterval: 900000 // 15 minutes
  });

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

  // Function to get user's current location
  const getUserLocation = useCallback(async () => {
    if (!hasUserConsent || !hasRequestedPermission) {
      console.log('useAirQuality: No location permission, cannot get user location');
      return null;
    }

    try {
      const location = await getCurrentLocation();
      if (location) {
        const coords = { lat: location.latitude, lon: location.longitude };
        setUserCoordinates(coords);
        return coords;
      }
    } catch (error) {
      console.error('useAirQuality: Failed to get user location:', error);
    }
    return null;
  }, [hasUserConsent, hasRequestedPermission, getCurrentLocation]);

  // Get user location on mount and when permissions change
  useEffect(() => {
    if (hasUserConsent && hasRequestedPermission) {
      getUserLocation();
    }
  }, [hasUserConsent, hasRequestedPermission, getUserLocation]);

  // Function to save air quality reading to database
  const saveReadingToDatabase = useCallback(async (readingData: any) => {
    if (!user) {
      console.log('useAirQuality: No user, skipping save');
      return null;
    }

    try {
      const { data, error } = await supabase
        .rpc('insert_air_quality_reading', {
          p_user_id: user.id,
          p_latitude: readingData.coordinates.lat,
          p_longitude: readingData.coordinates.lon,
          p_location_name: readingData.location,
          p_aqi: readingData.aqi,
          p_pm25: readingData.pollutants?.pm25 || null,
          p_pm10: readingData.pollutants?.pm10 || null,
          p_pm1: readingData.pollutants?.pm25 ? readingData.pollutants.pm25 * 0.7 : null,
          p_no2: readingData.pollutants?.no2 || null,
          p_so2: readingData.pollutants?.so2 || null,
          p_co: readingData.pollutants?.co || null,
          p_o3: readingData.pollutants?.o3 || null,
          p_temperature: readingData.environmental?.temperature || null,
          p_humidity: readingData.environmental?.humidity || null,
          p_pm003: readingData.pollutants?.pm25 ? readingData.pollutants.pm25 * 2 : null,
          p_data_source: 'Global Environmental Data System'
        });

      if (error) {
        console.error('useAirQuality: Error saving reading to database:', error);
        throw error;
      }

      console.log('useAirQuality: Air quality reading saved to database successfully, ID:', data);
      return data;
    } catch (error) {
      console.error('useAirQuality: Failed to save reading to database:', error);
      throw error;
    }
  }, [user]);

  // Transform global environmental data to AirQualityData format
  const transformGlobalDataToAirQualityData = useCallback((globalData: any): AirQualityData => {
    if (!globalData) {
      throw new Error('No global environmental data available');
    }

    // Get user location details
    const userLocation = userCoordinates ? `${userCoordinates.lat.toFixed(4)}, ${userCoordinates.lon.toFixed(4)}` : 'Unknown Location';
    const userLocationName = globalData.city_name || 'Unknown City';

    return {
      aqi: globalData.aqi,
      pm25: globalData.pm25 || 0,
      pm10: globalData.pm10 || 0,
      no2: globalData.no2 || 0,
      so2: globalData.so2 || 0,
      co: globalData.co || 0,
      o3: globalData.o3 || 0,
      location: userLocationName,
      userLocation: userLocation,
      coordinates: { lat: globalData.latitude, lon: globalData.longitude },
      userCoordinates: userCoordinates || { lat: 0, lon: 0 },
      timestamp: globalData.collection_timestamp,
      dataSource: globalData.data_source,
      environmental: {
        temperature: globalData.temperature || 0,
        humidity: globalData.humidity || 0,
        windSpeed: globalData.wind_speed || 0,
        windDirection: globalData.wind_direction || 0,
        windGust: globalData.wind_gust || 0,
        airPressure: globalData.air_pressure || 0,
        visibility: globalData.visibility || 0,
        weatherCondition: globalData.weather_condition || 'Unknown',
        feelsLikeTemperature: globalData.feels_like_temperature || 0,
        sunriseTime: globalData.sunrise_time || 'Unknown',
        sunsetTime: globalData.sunset_time || 'Unknown'
      }
    };
  }, [userCoordinates]);

  // Main data fetching function using global environmental data
  const fetchAirQualityData = useCallback(async (): Promise<AirQualityData> => {
    try {
      setLoading(true);
      setError(null);

      console.log('useAirQuality: Fetching air quality data from global environmental data system...');

      // Get user location if not available
      if (!userCoordinates && hasUserConsent && hasRequestedPermission) {
        const coords = await getUserLocation();
        if (coords) {
          setUserCoordinates(coords);
        }
      }

      // Wait for global environmental data to be available
      if (!globalEnvironmentalData) {
        throw new Error('No global environmental data available');
      }

      // Transform global data to AirQualityData format
      const airQualityData = transformGlobalDataToAirQualityData(globalEnvironmentalData);

      // Update app store
      setCurrentAQI(airQualityData.aqi);
      setCurrentLocation(airQualityData.location);
      
      // Update throttled location
      throttledLocationUpdate(airQualityData.location);

      // Save reading to database
      try {
        await saveReadingToDatabase(airQualityData);
      } catch (saveError) {
        console.warn('useAirQuality: Failed to save reading to database:', saveError);
        // Don't fail the entire request if saving fails
      }

      console.log('useAirQuality: Successfully fetched air quality data:', airQualityData);
      return airQualityData;

    } catch (error: any) {
      console.error('useAirQuality: Error fetching air quality data:', error);
      
      const errorMessage = error.message || 'Failed to fetch air quality data';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: "Air Quality Data Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setCurrentAQI, setCurrentLocation, throttledLocationUpdate, hasUserConsent, hasRequestedPermission, saveReadingToDatabase, globalEnvironmentalData, transformGlobalDataToAirQualityData, getUserLocation, toast]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    try {
      console.log('useAirQuality: Manual refresh requested');
      
      // Clear refresh lock for manual refresh
      clearRefreshLock();
      
      // Get fresh user location
      if (hasUserConsent && hasRequestedPermission) {
        await getUserLocation();
      }
      
      // Refetch global environmental data
      await refetchGlobalData();
      
      // Fetch air quality data
      const data = await fetchAirQualityData();
      
      // Set refresh lock
      setRefreshLock();
      setLastManualRefresh(Date.now());
      
      console.log('useAirQuality: Manual refresh completed successfully');
      return data;
    } catch (error) {
      console.error('useAirQuality: Manual refresh failed:', error);
      throw error;
    }
  }, [hasUserConsent, hasRequestedPermission, getUserLocation, refetchGlobalData, fetchAirQualityData]);

  // React Query for air quality data
  const query = useQuery({
    queryKey: ['airQuality', hasUserConsent, hasRequestedPermission, user?.id, globalEnvironmentalData?.id],
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
    enabled: hasUserConsent && hasRequestedPermission && !!user && !!globalEnvironmentalData, // Only run when everything is ready including global data
  });

  // Debug logging for permission states and refresh behavior
  useEffect(() => {
    console.log('useAirQuality: Permission states:', { hasUserConsent, hasRequestedPermission, isLoading: query.isLoading });
    
    // Log global data status
    if (globalEnvironmentalData) {
      console.log('useAirQuality: Global environmental data available:', {
        city: globalEnvironmentalData.city_name,
        aqi: globalEnvironmentalData.aqi,
        lastUpdated: globalDataLastUpdated,
        dataAge: globalDataAge
      });
    } else {
      console.log('useAirQuality: No global environmental data available');
    }
  }, [hasUserConsent, hasRequestedPermission, query.isLoading, globalEnvironmentalData, globalDataLastUpdated, globalDataAge]);

  // Log when data is being refetched
  useEffect(() => {
    if (query.isRefetching) {
      console.log('useAirQuality: Refreshing air quality data...');
    }
  }, [query.isRefetching]);

  // Log global data errors
  useEffect(() => {
    if (globalDataError) {
      console.error('useAirQuality: Global environmental data error:', globalDataError);
    }
  }, [globalDataError]);

  return {
    data: query.data,
    isLoading: query.isLoading || globalDataLoading,
    isRefetching: query.isRefetching,
    error: query.error || globalDataError,
    refetch: query.refetch,
    manualRefresh,
    hasUserConsent,
    hasRequestedPermission,
    isUsingCachedData,
    cachedData
  };
};
