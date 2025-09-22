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
  stationUid?: string | number; // Add station UID field
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

  // Stale data retention: keep last valid data if fetch fails
  const [staleData, setStaleData] = useState<AirQualityData | null>(null);

  // AQICN-only API fetch with enhanced station discovery
  const aqicnQuery = useQuery({
    queryKey: ['air-quality-fetchAQI-stations', safeCoordinates?.lat, safeCoordinates?.lng],
    queryFn: async () => {
      if (!safeCoordinates?.lat || !safeCoordinates?.lng) {
        throw new Error('Coordinates not available');
      }

      try {
        console.log('🔄 [useAirQuality] Fetching AQICN data with global station discovery and intelligent fallback');

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
          // Do not update staleData here, just return error object
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

        // Transform successful fetchAQI API response with enhanced station data
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
          stationUid: data.stationUid, // Station UID for identification
          distance: data.computedDistanceKm !== undefined ? `${data.computedDistanceKm}` : undefined,
          country: data.meta?.userCountry,
          dominantPollutant: data.dominantPollutant,
          environmental: data.environmental ? {
            temperature: data.environmental.temperature,
            humidity: data.environmental.humidity,
            pressure: data.environmental.pressure
          } : undefined
        };

        console.log('✅ [useAirQuality] Global AQICN station discovery successful:', {
          city: transformedData.location,
          station: transformedData.stationName,
          distance: transformedData.distance ? `${transformedData.distance}km` : 'calculating...',
          country: transformedData.country,
          aqi: transformedData.aqi,
          dominantPollutant: transformedData.dominantPollutant,
          pm25: transformedData.pm25,
          dataSource: transformedData.dataSource,
          stationUid: data.stationUid,
          globalSupport: 'worldwide'
        });
        console.log(`✅ [DataSourceValidator] Global AQICN Integration - Station: ${transformedData.stationName}, Location: ${transformedData.location}, AQI: ${transformedData.aqi}, Distance: ${transformedData.distance}km, Country: ${transformedData.country}, UID: ${data.stationUid}`);
        // --- BEGIN: Record AQI check in history (if user is logged in) ---
        if (user && !data.error) {
          try {
            // Prepare the reading record
            const reading = {
              user_id: user.id,
              timestamp: new Date().toISOString(),
              location_name: data.city || 'Unknown Location',
              latitude: safeCoordinates.lat,
              longitude: safeCoordinates.lng,
              aqi: data.aqi,
              pm25: data.pollutants?.pm25 || null,
              pm10: data.pollutants?.pm10 || null,
              no2: data.pollutants?.no2 || null,
              so2: data.pollutants?.so2 || null,
              co: data.pollutants?.co || null,
              o3: data.pollutants?.o3 || null,
              created_at: new Date().toISOString()
            };
            
            console.log('📝 [useAirQuality] Attempting to insert reading:', reading);
            
            // Insert into air_quality_readings
            const { data: insertData, error: insertError } = await supabase
              .from('air_quality_readings')
              .insert(reading);
            
            if (insertError) {
              console.error('❌ [useAirQuality] Insert failed with error:', insertError);
              throw insertError;
            }
            
            console.log('✅ [useAirQuality] Successfully recorded AQI check in history:', insertData);
          } catch (insertError) {
            // Comprehensive error logging for Supabase errors
            console.error('❌ [useAirQuality] Failed to record AQI check in history:', {
              error: insertError,
              message: insertError?.message,
              details: insertError?.details,
              hint: insertError?.hint,
              code: insertError?.code
            });
          }
        }
        // --- END: Record AQI check in history ---
        return transformedData;
      } catch (error) {
        console.error('❌ [useAirQuality] fetchAQI API fetch failed:', error);
        // Do not update staleData here, just return error object
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


  // Stale data retention: update staleData only if new data is valid and different
  useEffect(() => {
    const data = aqicnQuery.data;
    if (data && !data.error) {
      // Only update if data is valid and different
      if (
        !staleData ||
        JSON.stringify({ ...staleData, timestamp: undefined }) !== JSON.stringify({ ...data, timestamp: undefined })
      ) {
        setStaleData(data);
      }
    }
    // If data is error, do not update staleData
  }, [aqicnQuery.data]);

  // Improved fallback logic:
  // - If there is no valid data (staleData is null), always show the latest (even if error)
  // - If there is valid staleData, and the new data is error, show staleData
  // - If there is valid staleData, and the new data is valid, show new data
  const finalData = useMemo(() => {
    const data = aqicnQuery.data;
    if (!data && !staleData) return null; // No data at all
    if (!data && staleData) return staleData;
    if (data && !data.error) {
      return {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
    }
    // data is error
    if (staleData) return staleData;
    // No valid data ever, show error
    return data;
  }, [aqicnQuery.data, staleData]);

  const isLoading = aqicnQuery.isLoading;
  const error = aqicnQuery.error;

  // Enhanced refresh function for global AQICN data
  const refreshData = useCallback(async () => {
    console.log('🔄 [useAirQuality] Manual refresh requested - will discover nearest stations globally');

    try {
      await aqicnQuery.refetch();
      toast({
        title: "Data Refreshed",
        description: "Global air quality data updated from nearest monitoring station with distance calculation",
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