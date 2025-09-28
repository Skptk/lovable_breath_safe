import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { memoryMonitor } from '@/utils/memoryMonitor';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';
import { useToast } from './use-toast';
import useGlobalEnvironmentalData from './useGlobalEnvironmentalData';
import type { GlobalEnvironmentalData } from '@/types';
import {
  setRefreshLockTimestamp,
  getTimeUntilNextRefresh,
  isRefreshLocked,
  REFRESH_LOCK_DURATION_MS
} from '@/utils/refreshLock';

// Cache configuration
const CACHE_CONFIG = {
  VALIDATION: {
    KEY: 'airquality_validation_cache',
    TTL: 10 * 60 * 1000, // 10 minutes
  },
  MEMORY: {
    MAX_READINGS: 250, // Maximum readings to keep in memory
    CHUNK_SIZE: 50,    // Process readings in chunks of 50
  },
};

const AIR_QUALITY_HISTORY_TTL_MS = 12 * 60 * 60 * 1000; // Retain 12 hours of history

const LAST_READING_STORAGE_KEY = 'breath_safe_last_air_quality_reading';

const SCHEDULED_REFRESH_INTERVAL_MS = 60_000;
const SCHEDULED_MAX_DISTANCE_KM = 100;
const SCHEDULED_DATA_STALE_MINUTES = 30;

const POLLUTANT_LABELS: Record<string, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO2',
  so2: 'SO2',
  co: 'CO',
  o3: 'O3',
};

interface Coordinates {
  lat: number;
  lon: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (
  origin: Coordinates,
  destination: Coordinates,
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const computeDominantPollutantFromScheduled = (
  record: GlobalEnvironmentalData,
): string | undefined => {
  let dominantKey: keyof typeof POLLUTANT_LABELS | null = null;
  let highest = -Infinity;

  (Object.keys(POLLUTANT_LABELS) as (keyof typeof POLLUTANT_LABELS)[]).forEach((key) => {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > highest) {
      highest = value;
      dominantKey = key;
    }
  });

  return dominantKey ? POLLUTANT_LABELS[dominantKey] : undefined;
};

const createScheduledAirQualityReading = (
  record: GlobalEnvironmentalData,
  userCoordinates?: Coordinates | null,
): AirQualityData => {
  const stationCoordinates: Coordinates = {
    lat: record.latitude,
    lon: record.longitude,
  };

  const userCoords = userCoordinates ?? stationCoordinates;
  const locationName = record.country
    ? `${record.city_name}, ${record.country}`
    : record.city_name;

  const distanceKm = userCoordinates
    ? haversineDistanceKm(userCoords, stationCoordinates)
    : null;

  return {
    aqi: typeof record.aqi === 'number' ? record.aqi : 0,
    pm25: record.pm25 ?? 0,
    pm10: record.pm10 ?? 0,
    no2: record.no2 ?? 0,
    so2: record.so2 ?? 0,
    co: record.co ?? 0,
    o3: record.o3 ?? 0,
    location: locationName,
    userLocation: locationName,
    coordinates: stationCoordinates,
    userCoordinates: userCoords,
    timestamp: record.collection_timestamp,
    dataSource: 'AQICN (Scheduled)',
    stationName: record.city_name,
    stationUid: record.id,
    distance: distanceKm !== null ? distanceKm.toFixed(2) : undefined,
    country: record.country,
    dominantPollutant: computeDominantPollutantFromScheduled(record),
    environmental: {
      temperature: record.temperature ?? undefined,
      humidity: record.humidity ?? undefined,
      pressure: record.air_pressure ?? undefined,
      windSpeed: record.wind_speed ?? undefined,
      windDirection: record.wind_direction ?? undefined,
      windGust: record.wind_gust ?? undefined,
      visibility: record.visibility ?? undefined,
      feelsLikeTemperature: record.feels_like_temperature ?? undefined,
      sunriseTime: record.sunrise_time ?? undefined,
      sunsetTime: record.sunset_time ?? undefined,
      weatherCondition: record.weather_condition ?? undefined,
    },
  };
};

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

interface StoredAirQualityReading {
  reading: AirQualityData;
  savedAt: number;
}

const isLocalStorageAvailableForAirQuality = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const testKey = '__air_quality_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const loadStoredAirQualityPayload = (): StoredAirQualityReading | null => {
  if (!isLocalStorageAvailableForAirQuality()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LAST_READING_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw) as StoredAirQualityReading;
    if (!payload?.reading || typeof payload.savedAt !== 'number') {
      return null;
    }
    if (Date.now() - payload.savedAt > AIR_QUALITY_HISTORY_TTL_MS) {
      window.localStorage.removeItem(LAST_READING_STORAGE_KEY);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const loadStoredAirQualityReading = (): AirQualityData | null => {
  const payload = loadStoredAirQualityPayload();
  return payload?.reading ?? null;
};

const loadStoredAirQualitySavedAt = (): number | null => {
  const payload = loadStoredAirQualityPayload();
  return payload?.savedAt ?? null;
};

const persistAirQualityReading = (reading: AirQualityData) => {
  if (!isLocalStorageAvailableForAirQuality()) {
    return;
  }
  try {
    const payload: StoredAirQualityReading = {
      reading,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(LAST_READING_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore persistence failures silently
  }
};

export const useAirQuality = () => {
  const { user } = useAuth();
  const { locationData } = useGeolocation();
  const { toast } = useToast();

  const {
    data: scheduledData,
    isLoading: scheduledLoading,
    error: scheduledError,
    refetch: refetchScheduledData,
  } = useGlobalEnvironmentalData({
    latitude: locationData?.latitude,
    longitude: locationData?.longitude,
    maxDistanceKm: SCHEDULED_MAX_DISTANCE_KM,
    refreshInterval: SCHEDULED_REFRESH_INTERVAL_MS,
  });

  // Rate limiting for console logs to prevent spam
  const lastLogTime = useRef<number>(0);

  // Get safe coordinates (prevent infinite loops from changing objects)
  const safeCoordinates = useMemo(() => {
    if (!locationData?.latitude || !locationData?.longitude) return null;
    return { lat: locationData.latitude, lng: locationData.longitude };
  }, [locationData?.latitude, locationData?.longitude]);

  // Stale data retention: keep last valid data if fetch fails
  const [readings, setReadings] = useState<AirQualityData[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const storedReading = loadStoredAirQualityReading();
    return storedReading ? [storedReading] : [];
  });
  const readingsRef = useRef<AirQualityData[]>(readings);
  const prunedCountRef = useRef(0);
  const initialLockActive = typeof window !== 'undefined' ? isRefreshLocked() : false;

  const [queryEnabled, setQueryEnabled] = useState<boolean>(() => !initialLockActive);

  const userCoordinates: Coordinates | null = useMemo(() => {
    if (!safeCoordinates?.lat || !safeCoordinates?.lng) {
      return null;
    }
    return { lat: safeCoordinates.lat, lon: safeCoordinates.lng };
  }, [safeCoordinates?.lat, safeCoordinates?.lng]);

  const scheduledReading = useMemo(() => {
    if (!scheduledData) {
      return null;
    }

    return createScheduledAirQualityReading(scheduledData, userCoordinates);
  }, [scheduledData, userCoordinates?.lat, userCoordinates?.lon]);

  const scheduledIsFresh = useMemo(() => {
    if (!scheduledReading) {
      return false;
    }

    const timestamp = new Date(scheduledReading.timestamp).getTime();
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    const ageMinutes = (Date.now() - timestamp) / 60000;
    return ageMinutes <= SCHEDULED_DATA_STALE_MINUTES;
  }, [scheduledReading?.timestamp]);

  const pruneHistory = useCallback((entries: AirQualityData[]) => {
    const cutoff = Date.now() - AIR_QUALITY_HISTORY_TTL_MS;

    const filteredByAge = entries.filter(entry => {
      const timestamp = new Date(entry.timestamp).getTime();
      if (!Number.isFinite(timestamp)) {
        return true;
      }
      return timestamp >= cutoff;
    });

    const prunedByAgeCount = entries.length - filteredByAge.length;
    if (prunedByAgeCount > 0) {
      prunedCountRef.current += prunedByAgeCount;
    }

    const trimmed = filteredByAge.slice(-CACHE_CONFIG.MEMORY.MAX_READINGS);
    const trimmedCount = filteredByAge.length - trimmed.length;
    if (trimmedCount > 0) {
      prunedCountRef.current += trimmedCount;
    }

    return trimmed;
  }, []);

  // AQICN-only API fetch with enhanced station discovery
  const backoffAttemptRef = useRef(0);

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
            points_awarded: 10, // Points awarded for this AQI check
            created_at: new Date().toISOString()
          };

          console.log('📝 [useAirQuality] Scheduling AQI history insert');

          void (async () => {
            try {
              const { data: insertData, error: insertError } = await supabase
                .from('air_quality_readings')
                .insert(reading);

              if (insertError) {
                const errorPayload = insertError as { message?: string; details?: string; hint?: string; code?: string };
                console.error('❌ [useAirQuality] Insert failed with detailed error:', {
                  message: errorPayload.message,
                  details: errorPayload.details,
                  hint: errorPayload.hint,
                  code: errorPayload.code
                });
                console.error('❌ [useAirQuality] Data that failed to insert:', JSON.stringify(reading, null, 2));
                return;
              }

              console.log('✅ [useAirQuality] Successfully recorded AQI check in history');
              if (process.env?.['NODE_ENV'] === 'development') {
                console.debug('✅ [useAirQuality] Supabase insert payload:', insertData);
              }
            } catch (insertError: unknown) {
              console.error('❌ [useAirQuality] CATCH BLOCK - Failed to record AQI check in history:');
              const supabaseError = insertError as { message?: string; details?: string; hint?: string; code?: string };
              console.error('❌ [useAirQuality] Error type:', typeof insertError);
              console.error('❌ [useAirQuality] Error constructor:', (insertError as any)?.constructor?.name);
              console.error('❌ [useAirQuality] Error message:', supabaseError?.message);
              console.error('❌ [useAirQuality] Error details:', supabaseError?.details);
              console.error('❌ [useAirQuality] Error hint:', supabaseError?.hint);
              console.error('❌ [useAirQuality] Error code:', supabaseError?.code);
              if (process.env?.['NODE_ENV'] === 'development') {
                console.error('❌ [useAirQuality] Full error object:', insertError);
              }
              const stringifyCandidate = insertError as Record<string, unknown>;
              try {
                console.error('❌ [useAirQuality] Error stringified:', JSON.stringify(stringifyCandidate, null, 2));
              } catch {
                // ignore JSON stringify errors
              }
            }
          })();
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
    enabled: queryEnabled && !scheduledIsFresh && !!safeCoordinates?.lat && !!safeCoordinates?.lng,
    placeholderData: () => {
      if (scheduledIsFresh && scheduledReading) {
        return scheduledReading;
      }

      const storedReading = loadStoredAirQualityReading();
      if (!storedReading) {
        return undefined;
      }

      // If cached coordinates differ, avoid placeholder to prevent stale mismatch
      if (
        storedReading.userCoordinates?.lat !== safeCoordinates?.lat ||
        storedReading.userCoordinates?.lon !== safeCoordinates?.lng
      ) {
        return undefined;
      }

      return storedReading;
    },
    meta: {
      storedSavedAt: loadStoredAirQualitySavedAt(),
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: attempt => Math.min(1000 * Math.pow(2, attempt), 30_000),
  });

  useEffect(() => {
    if (!scheduledReading || !scheduledIsFresh) {
      return;
    }

    const latest = readingsRef.current[readingsRef.current.length - 1];
    if (latest && latest.timestamp === scheduledReading.timestamp && latest.dataSource === scheduledReading.dataSource) {
      return;
    }

    console.log('♻️ [useAirQuality] Using scheduled AQICN data for dashboard rendering', {
      location: scheduledReading.location,
      aqi: scheduledReading.aqi,
      timestamp: scheduledReading.timestamp,
    });

    persistAirQualityReading(scheduledReading);

    const mergedReadings = [...readingsRef.current, scheduledReading];
    const prunedReadings = pruneHistory(mergedReadings);
    readingsRef.current = prunedReadings;
    setReadings(prunedReadings);
  }, [scheduledIsFresh, scheduledReading, pruneHistory]);

  useEffect(() => {
    if (scheduledIsFresh) {
      return;
    }

    const lockActive = typeof window !== 'undefined' ? isRefreshLocked() : false;
    if (!lockActive) {
      setQueryEnabled(true);
    }
  }, [scheduledIsFresh]);

  // Persist successful responses into the readings buffers so UI consumers receive data
  useEffect(() => {
    const latestReading = aqicnQuery.data;
    if (!latestReading) return;

    const now = Date.now();
    if (now - lastLogTime.current > 5_000) {
      console.log('📥 [useAirQuality] Caching latest AQI reading for dashboard consumption', {
        location: latestReading.location,
        aqi: latestReading.aqi,
        timestamp: latestReading.timestamp,
      });
      lastLogTime.current = now;
    }

    if (!latestReading.error) {
      persistAirQualityReading(latestReading);
    }

    const mergedReadings = [...readingsRef.current, latestReading];
    const prunedReadings = pruneHistory(mergedReadings);
    readingsRef.current = prunedReadings;
    setReadings(prunedReadings);
  }, [aqicnQuery.data, pruneHistory]);

  // Memoized function to fetch air quality data with caching
  const refreshOnce = useRef(initialLockActive);

  const manualRefresh = useCallback(
    async (options: { force?: boolean; silent?: boolean } = {}) => {
      if (!locationData?.latitude || !locationData?.longitude) {
        return { skipped: true } as const;
      }

      if (!options.force && isRefreshLocked()) {
        const remainingMs = getTimeUntilNextRefresh();
        if (!options.silent) {
          const remainingSeconds = Math.ceil(remainingMs / 1000);
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;
          toast({
            title: "Refresh locked",
            description: `Next update available in ${minutes}:${seconds.toString().padStart(2, '0')}.`,
            variant: "default",
          });
        }
        return { locked: true, remainingMs } as const;
      }

      try {
        if (!options.force && scheduledIsFresh) {
          await refetchScheduledData();
          setRefreshLockTimestamp();
          setQueryEnabled(false);
          if (!options.silent) {
            toast({
              title: "Data refreshed",
              description: "Latest scheduled air quality data retrieved successfully.",
              variant: "default",
            });
          }
          return { refreshed: true, source: 'scheduled' } as const;
        }

        console.log('🔄 [useAirQuality] Initiating air quality refresh');
        await aqicnQuery.refetch({ throwOnError: true });
        backoffAttemptRef.current = 0;
        setRefreshLockTimestamp();
        setQueryEnabled(true);
        if (!options.silent) {
          toast({
            title: "Data refreshed",
            description: "Latest air quality data retrieved successfully.",
            variant: "default",
          });
        }
        return { refreshed: true } as const;
      } catch (error) {
        console.error('❌ [useAirQuality] Refresh failed:', error);
        const attempt = backoffAttemptRef.current;
        backoffAttemptRef.current = Math.min(attempt + 1, 5);
        const delay = Math.min(30_000, 3000 * Math.pow(2, attempt));
        const adjustedTimestamp = Date.now() - Math.max(0, REFRESH_LOCK_DURATION_MS - delay);
        setRefreshLockTimestamp(adjustedTimestamp);
        if (!options.silent) {
          toast({
            title: "Refresh failed",
            description: "Unable to fetch new air quality data. Please try again later.",
            variant: "destructive",
          });
        }
        return { error: true, cause: error } as const;
      }
    },
    [aqicnQuery, locationData?.latitude, locationData?.longitude, refetchScheduledData, scheduledIsFresh, toast]
  );

  // Effect to fetch data when location changes (debounced)
  useEffect(() => {
    if (!locationData?.latitude || !locationData?.longitude) return;

    const lockActive = typeof window !== 'undefined' ? isRefreshLocked() : false;

    setQueryEnabled(!lockActive);

    if (lockActive) {
      refreshOnce.current = true;
      return () => {
        // no timer registered when locked
      };
    }

    const timer = setTimeout(() => {
      const hasRefreshedOnce = refreshOnce.current;
      manualRefresh({
        force: !hasRefreshedOnce,
        silent: hasRefreshedOnce,
      });
      refreshOnce.current = true;
    }, 500);

    return () => clearTimeout(timer);
  }, [locationData?.latitude, locationData?.longitude, manualRefresh]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear any pending processing
      prunedCountRef.current = 0;
      readingsRef.current = [];
    };
  }, []);

  // Memoize the result to prevent unnecessary re-renders
  const result = useMemo(() => {
    const queryError = (aqicnQuery.error as Error) ?? scheduledError ?? null;
    const isInitialLoading =
      scheduledLoading ||
      aqicnQuery.isLoading ||
      (!readings.length && (aqicnQuery.isFetching || scheduledLoading));

    const baseResult = {
      data: readings.length > 0 ? readings[readings.length - 1] : null,
      history: readings,
      loading: false,
      isLoading: isInitialLoading,
      error: queryError,
      isRefreshing: aqicnQuery.isRefetching,
      lastUpdated: readings.length > 0 ? readings[readings.length - 1]?.timestamp : null,
      dataSource: readings.length > 0 ? readings[readings.length - 1]?.dataSource || 'Unknown' : 'Unknown',
      coordinates: readings.length > 0 ? readings[readings.length - 1]?.coordinates : null,
      userCoordinates: readings.length > 0 ? readings[readings.length - 1]?.userCoordinates : null,
      refresh: manualRefresh,
      refreshData: manualRefresh,
    };

    // Add debug info in development
    if (import.meta.env.DEV) {
      return {
        ...baseResult,
        _debug: {
          memory: memoryMonitor.getStats(),
          readingsCount: readings.length,
          prunedEntries: prunedCountRef.current,
        }
      };
    }

    return baseResult;
  }, [readings, aqicnQuery.isRefetching, manualRefresh]);

  return result;
};