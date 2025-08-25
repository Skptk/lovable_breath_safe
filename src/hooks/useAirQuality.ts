import { useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";
import { useGlobalEnvironmentalData } from "@/hooks/useGlobalEnvironmentalData";

// Refresh lock mechanism to prevent duplicate pulls on manual refresh
const REFRESH_LOCK_KEY = 'breath_safe_refresh_lock';
const REFRESH_LOCK_DURATION = 14 * 60 * 1000; // 14 minutes (slightly less than 15 to ensure smooth operation)

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
      duration: REFRESH_LOCK_DURATION
    };
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify(lockData));
    console.log('🔒 [useAirQuality] Refresh lock set for 14 minutes');
  } catch (error) {
    console.warn('Failed to set refresh lock:', error);
  }
};

// Helper function to clear refresh lock
const clearRefreshLock = (): void => {
  try {
    localStorage.removeItem(REFRESH_LOCK_KEY);
    console.log('🔓 [useAirQuality] Refresh lock cleared');
  } catch (error) {
    console.warn('Failed to clear refresh lock:', error);
  }
};

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
  const { user } = useAuth();
  const { locationData } = useGeolocation();
  const { toast } = useToast();
  
  // Ref to track if we've already saved this data to prevent infinite loops
  const savedDataRef = useRef<Set<string>>(new Set());
  
  // Get coordinates from geolocation hook
  const safeCoordinates = locationData ? { lat: locationData.latitude, lng: locationData.longitude } : null;
  
  // Get global environmental data from server-side collection
  const { 
    data: globalEnvironmentalData, 
    isLoading: globalDataLoading, 
    error: globalDataError,
    refetch: refetchGlobalData 
  } = useGlobalEnvironmentalData({
    latitude: safeCoordinates?.lat,
    longitude: safeCoordinates?.lng,
    maxDistanceKm: 50,
    autoRefresh: true,
    refreshInterval: 900000 // 15 minutes
  });

  // Transform global data to AirQualityData format
  const transformGlobalData = useCallback((globalData: any): AirQualityData => {
    if (!globalData) return null;
    
    console.log('🔍 [useAirQuality] Transforming global data:', {
      dataSource: globalData.data_source,
      aqi: globalData.aqi,
      city: globalData.city_name
    });
    
    // CRITICAL FIX: Enhanced data source validation to prevent "Initial Data" contamination
    // ACCEPT: OpenWeatherMap API, OpenAQ API, and other legitimate API sources
    // REJECT: Only mock, test, placeholder, demo, fake, and initial data
    if (globalData.data_source && 
        (globalData.data_source.toLowerCase().includes('mock') ||
         globalData.data_source.toLowerCase().includes('test') ||
         globalData.data_source.toLowerCase().includes('placeholder') ||
         globalData.data_source.toLowerCase().includes('demo') ||
         globalData.data_source.toLowerCase().includes('fake') ||
         globalData.data_source === 'Initial Data' ||  // Exact match for Initial Data
         globalData.data_source.toLowerCase().includes('initial data') ||  // Case-insensitive check
         globalData.data_source.toLowerCase().includes('initial'))) {
      console.warn('🚨 [useAirQuality] Detected contaminated data source:', globalData.data_source);
      console.warn('🚨 [useAirQuality] This data will be rejected to prevent contamination');
      return null; // Reject contaminated data
    }
    
    // Validate AQI values - accept all legitimate OpenWeatherMap API values
    if (globalData.aqi !== undefined && globalData.aqi !== null) {
      // OpenWeatherMap API returns AQI values 1-5, which get converted to standard AQI (50-300)
      // These are legitimate values and should always be accepted
      if (globalData.data_source === 'OpenWeatherMap API') {
        console.log('✅ [useAirQuality] Using legitimate OpenWeatherMap API data with AQI:', globalData.aqi);
      } else if (globalData.aqi < 0 || globalData.aqi > 500) {
        // Only reject if AQI is outside valid range (0-500) and not from OpenWeatherMap
        console.warn('🚨 [useAirQuality] Detected invalid AQI value:', globalData.aqi, 'from source:', globalData.data_source);
        return null;
      }
    }
    
    console.log('✅ [useAirQuality] Using legitimate global data from:', globalData.data_source);
    
    return {
      aqi: globalData.aqi || 0,
      pm25: globalData.pm25 || 0,
      pm10: globalData.pm10 || 0,
      no2: globalData.no2 || 0,
      so2: globalData.so2 || 0,
      co: globalData.co || 0,
      o3: globalData.o3 || 0,
      location: globalData.city_name || 'Unknown City',
      userLocation: globalData.city_name || 'Unknown City',
      coordinates: { 
        lat: globalData.latitude || 0, 
        lon: globalData.longitude || 0 
      },
      userCoordinates: { 
        lat: globalData.latitude || 0, 
        lon: globalData.longitude || 0 
      },
      timestamp: globalData.collection_timestamp || new Date().toISOString(),
      dataSource: globalData.data_source || 'Server-side Collection',
      environmental: globalData.temperature ? {
        temperature: globalData.temperature,
        humidity: globalData.humidity,
        windSpeed: globalData.wind_speed,
        windDirection: globalData.wind_direction,
        windGust: globalData.wind_gust,
        airPressure: globalData.air_pressure,
        visibility: globalData.visibility,
        weatherCondition: globalData.weather_condition,
        feelsLikeTemperature: globalData.feels_like_temperature,
        sunriseTime: globalData.sunrise_time,
        sunsetTime: globalData.sunset_time
      } : undefined
    };
  }, []);

  // Use global data when available, fallback to legacy API if needed
  const airQualityData = globalEnvironmentalData ? transformGlobalData(globalEnvironmentalData) : null;
  
  // CRITICAL FIX: Enhanced debugging and user feedback for data contamination
  if (globalEnvironmentalData && !airQualityData) {
    console.warn('⚠️ [useAirQuality] Global data was rejected during transformation:', {
      originalData: globalEnvironmentalData,
      dataSource: globalEnvironmentalData.data_source,
      aqi: globalEnvironmentalData.aqi,
      city: globalEnvironmentalData.city_name,
      timestamp: globalEnvironmentalData.collection_timestamp
    });
    
    // Show user-friendly error message for contaminated data
    if (globalEnvironmentalData.data_source === 'Initial Data') {
      console.warn('🚨 [useAirQuality] Detected "Initial Data" placeholder - this indicates database needs real data');
      console.warn('🚨 [useAirQuality] The scheduled data collection system should populate the database with real OpenWeatherMap API data');
    }
  }
  
  // Enhanced fallback logic: Only use legacy API if no legitimate global data is available
  const shouldUseLegacyAPI = !globalEnvironmentalData || 
                            (globalEnvironmentalData && !airQualityData && 
                             globalEnvironmentalData.data_source === 'Initial Data');
  
  // Legacy API fallback (only when necessary)
  const legacyQuery = useQuery({
    queryKey: ['air-quality-legacy', safeCoordinates?.lat, safeCoordinates?.lng],
    queryFn: async () => {
      if (!safeCoordinates?.lat || !safeCoordinates?.lng) {
        throw new Error('Coordinates not available');
      }

      try {
        console.log('🔄 [useAirQuality] Falling back to legacy API due to contaminated global data');
        
        const { data, error } = await supabase.functions.invoke('get-air-quality', {
          body: { 
            lat: safeCoordinates.lat, 
            lon: safeCoordinates.lng 
          }
        });

        if (error) throw error;
        if (!data) throw new Error('No data received');

        // Transform legacy API response
        const transformedData: AirQualityData = {
          aqi: data.list?.[0]?.main?.aqi || 0,
          pm25: data.list?.[0]?.components?.pm2_5 || 0,
          pm10: data.list?.[0]?.components?.pm10 || 0,
          no2: data.list?.[0]?.components?.no2 || 0,
          so2: data.list?.[0]?.components?.so2 || 0,
          co: data.list?.[0]?.components?.co || 0,
          o3: data.list?.[0]?.components?.o3 || 0,
          location: data.location || 'Unknown Location',
          userLocation: data.location || 'Unknown Location',
          coordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          userCoordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          timestamp: new Date().toISOString(),
          dataSource: 'OpenWeatherMap API (Legacy)',
          environmental: data.list?.[0]?.main ? {
            temperature: data.list[0].main.temp,
            humidity: data.list[0].main.humidity,
            airPressure: data.list[0].main.pressure
          } : undefined
        };

        console.log('✅ [useAirQuality] Legacy API fallback successful:', transformedData);
        return transformedData;
      } catch (error) {
        console.error('❌ [useAirQuality] Legacy API fetch failed:', error);
        throw error;
      }
    },
    enabled: shouldUseLegacyAPI && !!safeCoordinates?.lat && !!safeCoordinates?.lng,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime)
    retry: 2,
    retryDelay: 1000,
  });

  // Combine global data with legacy fallback
  const finalData = airQualityData || legacyQuery.data;
  const isLoading = globalDataLoading || (legacyQuery.isLoading && !globalEnvironmentalData);
  const error = globalDataError || legacyQuery.error;

  // Manual refresh function
  const refreshData = useCallback(async () => {
    console.log('🔄 [useAirQuality] Manual refresh requested');
    
    // Check refresh lock
    if (isRefreshLocked()) {
      console.log('⏳ [useAirQuality] Refresh locked, waiting for cooldown');
      toast({
        title: "Refresh Cooldown",
        description: "Please wait before refreshing again",
        variant: "default",
      });
      return;
    }

    // Set refresh lock
    setRefreshLock();

    try {
      if (globalEnvironmentalData) {
        // Refresh global data
        await refetchGlobalData();
        toast({
          title: "Data Refreshed",
          description: "Air quality data has been updated",
          variant: "default",
        });
      } else {
        // Refresh legacy data
        await legacyQuery.refetch();
        toast({
          title: "Data Refreshed",
          description: "Air quality data has been updated",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('❌ [useAirQuality] Refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh air quality data",
        variant: "destructive",
      });
    } finally {
      // Clear refresh lock after successful refresh
      clearRefreshLock();
    }
  }, [globalEnvironmentalData, refetchGlobalData, legacyQuery, toast]);

  // Save reading to user history when data is available (with loop prevention)
  useEffect(() => {
    if (!user || !finalData || !safeCoordinates) return;

    // Create a stable data signature that doesn't change on every render
    // Remove environmental data from signature as it changes object references
    const dataSignature = `${user.id}-${finalData.aqi}-${finalData.pm25}-${finalData.pm10}-${finalData.dataSource}-${Math.floor(Date.now() / (5 * 60 * 1000))}`; // 5-minute window
    
    // Check if we've already saved this exact data signature
    if (savedDataRef.current.has(dataSignature)) {
      console.log('🔄 [useAirQuality] Data already saved, skipping duplicate save');
      return;
    }

    // Only save if we have meaningful data changes (not just timestamp updates)
    const hasMeaningfulData = finalData.aqi > 0 || finalData.pm25 > 0 || finalData.pm10 > 0;
    if (!hasMeaningfulData) {
      console.log('🔄 [useAirQuality] No meaningful data to save, skipping');
      return;
    }

    const saveReading = async () => {
      try {
        const { error } = await supabase
          .from('air_quality_readings')
          .insert({
            user_id: user.id,
            aqi: finalData.aqi,
            pm25: finalData.pm25,
            pm10: finalData.pm10,
            no2: finalData.no2,
            so2: finalData.so2,
            co: finalData.co,
            o3: finalData.o3,
            latitude: safeCoordinates.lat,
            longitude: safeCoordinates.lng,
            location_name: finalData.location || 'Unknown Location',
            timestamp: new Date().toISOString(),
            data_source: finalData.dataSource || 'Global Environmental Data',
            // Add weather data if available
            temperature: finalData.environmental?.temperature || null,
            humidity: finalData.environmental?.humidity || null,
            wind_speed: finalData.environmental?.windSpeed || null,
            wind_direction: finalData.environmental?.windDirection || null,
            air_pressure: finalData.environmental?.airPressure || null,
            visibility: finalData.environmental?.visibility || null,
            weather_condition: finalData.environmental?.weatherCondition || null
          });

        if (error) {
          console.error('❌ [useAirQuality] Failed to save reading:', error);
        } else {
          console.log('✅ [useAirQuality] Reading saved to history');
          // Mark this data signature as saved to prevent duplicate saves
          savedDataRef.current.add(dataSignature);
          
          // Clean up old signatures to prevent memory leaks (keep only last 50)
          if (savedDataRef.current.size > 50) {
            const signaturesArray = Array.from(savedDataRef.current);
            savedDataRef.current = new Set(signaturesArray.slice(-25));
          }
        }
      } catch (error) {
        console.error('❌ [useAirQuality] Error saving reading:', error);
      }
    };

    saveReading();
  }, [user?.id, finalData?.aqi, finalData?.pm25, finalData?.pm10, finalData?.dataSource, safeCoordinates?.lat, safeCoordinates?.lng]);

  // Set refresh lock when global environmental data is fetched
  useEffect(() => {
    if (globalEnvironmentalData && !isRefreshLocked()) {
      console.log('🔒 [useAirQuality] Setting refresh lock for new global data');
      setRefreshLock();
    }
  }, [globalEnvironmentalData]);

  return {
    data: finalData,
    isLoading,
    error,
    refreshData,
    isRefreshing: legacyQuery.isRefetching,
    lastUpdated: finalData?.timestamp,
    dataSource: finalData?.dataSource || 'Unknown',
    coordinates: finalData?.coordinates,
    userCoordinates: finalData?.userCoordinates
  };
};
