import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';
import { useToast } from './use-toast';
import useGlobalEnvironmentalData from './useGlobalEnvironmentalData';

// Validation cache constants
const VALIDATION_CACHE_KEY = 'airquality_validation_cache';
const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Refresh lock constants
const REFRESH_LOCK_KEY = 'airquality_refresh_lock';
const REFRESH_LOCK_DURATION = 30 * 1000; // 30 seconds

// Interface for air quality data
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
  error?: boolean;
  message?: string;
}

export const useAirQuality = () => {
  const { user } = useAuth();
  const { locationData } = useGeolocation();
  const { toast } = useToast();
  
  // Ref to track if we've already saved this data to prevent infinite loops
  const savedDataRef = useRef<Set<string>>(new Set());
  
  // Rate limiting for console logs to prevent spam
  const lastLogTime = useRef<number>(0);

  // Get safe coordinates (prevent infinite loops from changing objects)
  const safeCoordinates = useMemo(() => {
    if (!locationData?.latitude || !locationData?.longitude) return null;
    return { lat: locationData.latitude, lng: locationData.longitude };
  }, [locationData?.latitude, locationData?.longitude]);

  // Fetch global environmental data
  const { 
    data: globalEnvironmentalData, 
    isLoading: globalDataLoading, 
    error: globalDataError,
    refetch: refetchGlobalData 
  } = useGlobalEnvironmentalData({
    latitude: safeCoordinates?.lat,
    longitude: safeCoordinates?.lng
  });

  // Transform global data to AirQualityData format
  const transformGlobalData = useCallback((globalData: any): AirQualityData => {
    // Enhanced early return guards to prevent infinite loops with undefined data
    if (!globalData || 
        globalData.data_source === undefined || 
        globalData.data_source === 'undefined' ||
        globalData.aqi === undefined || 
        globalData.city_name === undefined ||
        Object.keys(globalData).length === 0) {
      return null;
    }
    
    // Rate-limited logging to prevent console spam  
    if (Date.now() - lastLogTime.current > 2000) { // Log at most every 2 seconds
      console.log('🔍 [useAirQuality] Transforming global data:', {
        dataSource: globalData.data_source,
        aqi: globalData.aqi,
        city: globalData.city_name
      });
      lastLogTime.current = Date.now();
    }
    
    // Enhanced data source validation to accept AQICN sources
    if (globalData.data_source && 
        (globalData.data_source.toLowerCase().includes('mock') ||
         globalData.data_source.toLowerCase().includes('test') ||
         globalData.data_source.toLowerCase().includes('placeholder') ||
         globalData.data_source.toLowerCase().includes('demo') ||
         globalData.data_source.toLowerCase().includes('fake') ||
         globalData.data_source === 'Initial Data' ||
         globalData.data_source.toLowerCase().includes('initial data') ||
         globalData.data_source.toLowerCase().includes('initial'))) {
      console.warn('🚨 [useAirQuality] Detected contaminated data source:', globalData.data_source);
      return null;
    }
    
    // Validate AQI values - accept AQICN and legitimate sources
    if (globalData.aqi !== undefined && globalData.aqi !== null) {
      // AQICN API returns direct AQI values (0-500 scale)
      if (globalData.data_source === 'AQICN' || globalData.data_source === 'AQICN + OpenWeatherMap API') {
        console.log('✅ [useAirQuality] Using legitimate AQICN data with AQI:', globalData.aqi, 'from:', globalData.data_source);
      } else if (globalData.data_source === 'OpenWeatherMap API') {
        console.log('✅ [useAirQuality] Using legitimate OpenWeatherMap data with AQI:', globalData.aqi, 'from:', globalData.data_source);
      } else if (globalData.aqi < 0 || globalData.aqi > 500) {
        console.warn('🚨 [useAirQuality] Detected invalid AQI value:', globalData.aqi, 'from source:', globalData.data_source);
        return null;
      }
    }
    
    // Rate-limited success logging
    if (Date.now() - lastLogTime.current > 2000) {
      console.log('✅ [useAirQuality] Using legitimate global data from:', globalData.data_source);
      lastLogTime.current = Date.now();
    }
    
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
      coordinates: { lat: globalData.latitude || 0, lon: globalData.longitude || 0 },
      userCoordinates: { lat: globalData.latitude || 0, lon: globalData.longitude || 0 },
      timestamp: globalData.collection_timestamp || new Date().toISOString(),
      dataSource: globalData.data_source || 'Global Environmental Data',
      environmental: {
        temperature: globalData.temperature || 0,
        humidity: globalData.humidity || 0,
        windSpeed: globalData.wind_speed || 0,
        windDirection: globalData.wind_direction || 0,
        windGust: globalData.wind_gust || 0,
        airPressure: globalData.air_pressure || 0,
        visibility: globalData.visibility || 0,
        weatherCondition: globalData.weather_condition || '',
        feelsLikeTemperature: globalData.feels_like_temperature || 0,
        sunriseTime: globalData.sunrise_time || '',
        sunsetTime: globalData.sunset_time || ''
      }
    };
  }, []);

  // Use global data when available with additional validation
  const airQualityData = useMemo(() => {
    // Only transform if globalEnvironmentalData has meaningful content
    if (!globalEnvironmentalData || 
        Object.keys(globalEnvironmentalData).length === 0 ||
        (globalEnvironmentalData.data_source === undefined && 
         globalEnvironmentalData.aqi === undefined && 
         globalEnvironmentalData.city_name === undefined)) {
      return null;
    }
    return transformGlobalData(globalEnvironmentalData);
  }, [globalEnvironmentalData, transformGlobalData]);
  
  // Enhanced fallback logic: Only use AQICN API if no legitimate global data is available
  const shouldUseAQICNAPI = !globalEnvironmentalData || 
                            (globalEnvironmentalData && !airQualityData && 
                             globalEnvironmentalData.data_source === 'Initial Data');
  
  // AQICN API direct fetch (when necessary)
  const aqicnQuery = useQuery({
    queryKey: ['air-quality-aqicn', safeCoordinates?.lat, safeCoordinates?.lng],
    queryFn: async () => {
      if (!safeCoordinates?.lat || !safeCoordinates?.lng) {
        throw new Error('Coordinates not available');
      }

      try {
        console.log('🔄 [useAirQuality] Fetching AQICN data directly');
        
        const { data, error } = await supabase.functions.invoke('fetchAQI', {
          body: { 
            lat: safeCoordinates.lat, 
            lon: safeCoordinates.lng 
          }
        });

        if (error) throw error;
        if (!data) throw new Error('No data received');

        // Check if API returned an error
        if (data.error) {
          return {
            aqi: 0,
            pm25: 0,
            pm10: 0,
            no2: 0,
            so2: 0,
            co: 0,
            o3: 0,
            location: 'Unknown Location',
            userLocation: 'Unknown Location',
            coordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
            userCoordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
            timestamp: new Date().toISOString(),
            dataSource: 'AQICN (Unavailable)',
            error: true,
            message: data.message || '⚠️ Live air quality data unavailable, please check back later.'
          };
        }

        // Transform successful AQICN API response
        const transformedData: AirQualityData = {
          aqi: data.aqi || 0,
          pm25: data.pollutants?.pm25 || 0,
          pm10: data.pollutants?.pm10 || 0,
          no2: data.pollutants?.no2 || 0,
          so2: data.pollutants?.so2 || 0,
          co: data.pollutants?.co || 0,
          o3: data.pollutants?.o3 || 0,
          location: data.city || 'Unknown Location',
          userLocation: data.city || 'Unknown Location',
          coordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          userCoordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          timestamp: data.timestamp || new Date().toISOString(),
          dataSource: 'AQICN',
          environmental: data.environmental ? {
            temperature: data.environmental.temperature || 0,
            humidity: data.environmental.humidity || 0,
            airPressure: data.environmental.pressure || 0
          } : undefined
        };

        console.log('✅ [useAirQuality] AQICN API fetch successful:', transformedData);
        console.log(`✅ [DataSourceValidator] dataSource: 'AQICN' - Location: ${transformedData.location}, AQI: ${transformedData.aqi}`);
        return transformedData;
      } catch (error) {
        console.error('❌ [useAirQuality] AQICN API fetch failed:', error);
        // Return error state instead of throwing
        return {
          aqi: 0,
          pm25: 0,
          pm10: 0,
          no2: 0,
          so2: 0,
          co: 0,
          o3: 0,
          location: 'Unknown Location',
          userLocation: 'Unknown Location',
          coordinates: { lat: safeCoordinates?.lat || 0, lon: safeCoordinates?.lng || 0 },
          userCoordinates: { lat: safeCoordinates?.lat || 0, lon: safeCoordinates?.lng || 0 },
          timestamp: new Date().toISOString(),
          dataSource: 'AQICN (Error)',
          error: true,
          message: '⚠️ Live air quality data unavailable, please check back later.'
        };
      }
    },
    enabled: shouldUseAQICNAPI && !!safeCoordinates?.lat && !!safeCoordinates?.lng,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Combine global data with AQICN direct fetch
  const finalData = useMemo(() => {
    const data = airQualityData || aqicnQuery.data;
    if (!data) return null;
    
    return {
      ...data,
      // Ensure we have a stable timestamp
      timestamp: data.timestamp || new Date().toISOString()
    };
  }, [airQualityData, aqicnQuery.data]);
  
  const isLoading = globalDataLoading || (aqicnQuery.isLoading && !globalEnvironmentalData);
  const error = globalDataError || aqicnQuery.error;

  // Simple refresh function
  const refreshData = useCallback(async () => {
    console.log('🔄 [useAirQuality] Manual refresh requested');
    
    try {
      if (globalEnvironmentalData) {
        await refetchGlobalData();
      } else {
        await aqicnQuery.refetch();
      }
      toast({
        title: "Data Refreshed",
        description: "Air quality data has been updated",
        variant: "default",
      });
    } catch (error) {
      console.error('❌ [useAirQuality] Refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh air quality data",
        variant: "destructive",
      });
    }
  }, [globalEnvironmentalData, refetchGlobalData, aqicnQuery, toast]);

  return {
    data: finalData,
    isLoading,
    error,
    refreshData,
    isRefreshing: aqicnQuery.isRefetching,
    lastUpdated: finalData?.timestamp,
    dataSource: finalData?.dataSource || 'Unknown',
    coordinates: finalData?.coordinates,
    userCoordinates: finalData?.userCoordinates
  };
};