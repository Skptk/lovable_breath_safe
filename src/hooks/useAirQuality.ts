import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';
import { useToast } from './use-toast';

// Validation cache constants
const VALIDATION_CACHE_KEY = 'airquality_validation_cache';
const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Refresh lock constants
const REFRESH_LOCK_KEY = 'airquality_refresh_lock';
const REFRESH_LOCK_DURATION = 30 * 1000; // 30 seconds

// Enhanced interface for AQICN-only air quality data
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
  stationName?: string;
  distance?: string;
  country?: string;
  dominantPollutant?: string;
  userPoints?: number;
  currencyRewards?: number;
  canWithdraw?: boolean;
  environmental?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
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
  
  // Rate limiting for console logs to prevent spam
  const lastLogTime = useRef<number>(0);

  // Get safe coordinates (prevent infinite loops from changing objects)
  const safeCoordinates = useMemo(() => {
    if (!locationData?.latitude || !locationData?.longitude) return null;
    return { lat: locationData.latitude, lng: locationData.longitude };
  }, [locationData?.latitude, locationData?.longitude]);

  // AQICN-only API fetch with enhanced station discovery
  const aqicnQuery = useQuery({
    queryKey: ['air-quality-fetchAQI-stations', safeCoordinates?.lat, safeCoordinates?.lng],
    queryFn: async () => {
      if (!safeCoordinates?.lat || !safeCoordinates?.lng) {
        throw new Error('Coordinates not available');
      }

      try {
        console.log('🔄 [useAirQuality] Fetching AQICN data with station discovery from fetchAQI');
        
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
          console.warn('⚠️ [useAirQuality] fetchAQI API returned error:', data.message);
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

        // Transform successful fetchAQI API response
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
          coordinates: data.stationLat && data.stationLon ? 
            { lat: data.stationLat, lon: data.stationLon } : 
            { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          userCoordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          timestamp: data.timestamp || new Date().toISOString(),
          dataSource: 'AQICN',
          stationName: data.stationName,
          distance: data.computedDistanceKm ? `${data.computedDistanceKm}` : undefined,
          country: data.meta?.userCountry,
          dominantPollutant: data.dominantPollutant,
          environmental: data.environmental ? {
            temperature: data.environmental.temperature,
            humidity: data.environmental.humidity,
            pressure: data.environmental.pressure
          } : undefined
        };

        console.log('✅ [useAirQuality] fetchAQI API fetch successful:', {
          city: transformedData.location,
          station: transformedData.stationName,
          distance: transformedData.distance,
          country: transformedData.country,
          aqi: transformedData.aqi,
          dominantPollutant: transformedData.dominantPollutant,
          pm25: transformedData.pm25,
          dataSource: transformedData.dataSource,
          stationUid: data.stationUid
        });
        console.log(`✅ [DataSourceValidator] dataSource: 'AQICN' - Station: ${transformedData.stationName}, Location: ${transformedData.location}, AQI: ${transformedData.aqi}, Distance: ${transformedData.distance}km, uid: ${data.stationUid}`);
        return transformedData;
      } catch (error) {
        console.error('❌ [useAirQuality] fetchAQI API fetch failed:', error);
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
    enabled: !!safeCoordinates?.lat && !!safeCoordinates?.lng,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Use AQICN data directly (no global data dependency)
  const finalData = useMemo(() => {
    const data = aqicnQuery.data;
    if (!data) return null;
    
    return {
      ...data,
      // Ensure we have a stable timestamp
      timestamp: data.timestamp || new Date().toISOString()
    };
  }, [aqicnQuery.data]);
  
  const isLoading = aqicnQuery.isLoading;
  const error = aqicnQuery.error;

  // Simple refresh function for AQICN data
  const refreshData = useCallback(async () => {
    console.log('🔄 [useAirQuality] Manual refresh requested for fetchAQI station discovery');
    
    try {
      await aqicnQuery.refetch();
      toast({
        title: "Data Refreshed",
        description: "Air quality data has been updated from nearest monitoring station with computed distance",
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
  }, [aqicnQuery, toast]);

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