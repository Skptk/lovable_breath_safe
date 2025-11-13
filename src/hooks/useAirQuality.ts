import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react';
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

// Cache configuration - optimized for memory efficiency
const CACHE_CONFIG = {
  VALIDATION: {
    KEY: 'airquality_validation_cache',
    TTL: 10 * 60 * 1000, // 10 minutes
  },
  MEMORY: {
    MAX_READINGS: 10, // Reduced from 15 to 10 for lower memory footprint
    CHUNK_SIZE: 20,   // Reduced from 30 to 20 for smaller batch processing
  },
};

const AIR_QUALITY_HISTORY_TTL_MS = 10 * 60 * 1000; // Retain 10 minutes of history

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

const isDuplicateReading = (
  entries: AirQualityData[],
  candidate: AirQualityData,
): boolean =>
  entries.some(entry =>
    entry.dataSource === candidate.dataSource &&
    entry.timestamp === candidate.timestamp &&
    (entry.stationUid ?? entry.location) === (candidate.stationUid ?? candidate.location)
  );

const toNullableNumber = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

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
  const lastHistoryInsertRef = useRef<string | null>(null);
  const lastRecordedAtRef = useRef<number | null>(null);
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

  const enqueueHistoryInsert = useCallback(
    (reading: AirQualityData, source: 'scheduled' | 'live') => {
      if (!user || reading.error) {
        return;
      }

      const lockRemaining = getTimeUntilNextRefresh();
      const lockActive = lockRemaining > 0;

      if (lockActive && source === 'live') {
        if (import.meta.env.DEV) {
          console.log(`🔒 [useAirQuality] Skipping ${source} history insert; lock active for ${Math.ceil(lockRemaining / 1000)}s`);
        }
        return;
      }

      const insertKey = `${source}:${reading.timestamp}`;
      if (lastHistoryInsertRef.current === insertKey) {
        return;
      }

      if (source === 'live' && scheduledReading?.timestamp) {
        const liveTime = new Date(reading.timestamp).getTime();
        const scheduledTime = new Date(scheduledReading.timestamp).getTime();

        if (Number.isFinite(liveTime) && Number.isFinite(scheduledTime) && liveTime <= scheduledTime) {
          console.log('⏭️ [useAirQuality] Skipping live history insert; live reading is not newer than scheduled baseline', {
            live: reading.timestamp,
            scheduled: scheduledReading.timestamp,
          });
          return;
        }
      }

      lastHistoryInsertRef.current = insertKey;

      const latestReading = readingsRef.current.at(-1) ?? reading;

      const latitude = latestReading.userCoordinates?.lat ?? latestReading.coordinates?.lat ?? null;
      const longitude = latestReading.userCoordinates?.lon ?? latestReading.coordinates?.lon ?? null;
      const record = {
        user_id: user.id,
        timestamp: latestReading.timestamp ?? reading.timestamp ?? new Date().toISOString(),
        location_name: latestReading.location,
        latitude,
        longitude,
        aqi: toNullableNumber(latestReading.aqi),
        pm25: toNullableNumber(latestReading.pm25),
        pm10: toNullableNumber(latestReading.pm10),
        no2: toNullableNumber(latestReading.no2),
        so2: toNullableNumber(latestReading.so2),
        co: toNullableNumber(latestReading.co),
        o3: toNullableNumber(latestReading.o3),
        points_awarded: source === 'live' ? 10 : 0,
        created_at: new Date().toISOString(),
      };

      console.log(`📝 [useAirQuality] Scheduling ${source} AQI history insert`, {
        location: latestReading.location,
        timestamp: latestReading.timestamp,
        source,
      });

      const runInsert = () => {
        void (async () => {
          try {
            const { error: insertError } = await supabase
              .from('air_quality_readings')
              .insert(record);

            if (insertError) {
              const errorPayload = insertError as { message?: string; details?: string; hint?: string; code?: string };
              console.error(`❌ [useAirQuality] ${source} insert failed`, {
                message: errorPayload.message,
                details: errorPayload.details,
                hint: errorPayload.hint,
                code: errorPayload.code,
              });
              console.error('❌ [useAirQuality] Data that failed to insert:', JSON.stringify(record, null, 2));
              lastHistoryInsertRef.current = null;
              return;
            }

            console.log(`✅ [useAirQuality] Successfully recorded ${source} AQI reading in history`);
            lastRecordedAtRef.current = Date.now();
            if (source === 'live') {
              setRefreshLockTimestamp();
            }
          } catch (insertError: unknown) {
            console.error(`❌ [useAirQuality] ${source} history insert threw`, insertError);
            lastHistoryInsertRef.current = null;
          }
        })();
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback?.(() => runInsert(), { timeout: 1500 });
      } else {
        setTimeout(runInsert, 0);
      }
    },
    [scheduledReading?.timestamp, user]
  );

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

        const locationLabel = data.location ?? data.city ?? 'Unknown Location';

        const transformedData: AirQualityData = {
          aqi: data.aqi || 0,
          pm25: data.pollutants?.pm25 ?? 0,
          pm10: data.pollutants?.pm10 ?? 0,
          no2: data.pollutants?.no2 ?? 0,
          so2: data.pollutants?.so2 ?? 0,
          co: data.pollutants?.co ?? 0,
          o3: data.pollutants?.o3 ?? 0,
          location: locationLabel,
          userLocation: locationLabel,
          coordinates: { lat: data.stationLat ?? safeCoordinates.lat, lon: data.stationLon ?? safeCoordinates.lng },
          userCoordinates: { lat: safeCoordinates.lat, lon: safeCoordinates.lng },
          timestamp: data.timestamp || new Date().toISOString(),
          dataSource: data.dataSource ?? 'AQICN (Scheduled)',
          stationName: data.stationName ?? locationLabel,
          stationUid: data.stationUid,
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
    enabled:
      queryEnabled &&
      !scheduledLoading &&
      !scheduledIsFresh &&
      !!safeCoordinates?.lat &&
      !!safeCoordinates?.lng,
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

    if (isDuplicateReading(readingsRef.current, scheduledReading)) {
      return;
    }

    console.log('♻️ [useAirQuality] Using scheduled AQICN data for dashboard rendering', {
      location: scheduledReading.location,
      aqi: scheduledReading.aqi,
      timestamp: scheduledReading.timestamp,
    });

    persistAirQualityReading(scheduledReading);

    let cancelled = false;

    const scheduleHistoryInsert = () => {
      const invoke = () => {
        if (!cancelled) {
          enqueueHistoryInsert(scheduledReading, 'scheduled');
        }
      };

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(invoke);
      } else {
        Promise.resolve().then(invoke).catch(() => {
          // enqueueHistoryInsert already logs failures
        });
      }
    };

    const runUpdate = () => {
      if (cancelled) {
        return;
      }

      const start = performance.now();

      const mergedReadings = [...readingsRef.current, scheduledReading];
      const prunedReadings = pruneHistory(mergedReadings);
      readingsRef.current = prunedReadings;

      startTransition(() => {
        if (!cancelled) {
          setReadings(prunedReadings);
        }
      });

      const duration = performance.now() - start;
      if (duration > 32) {
        console.warn('[useAirQuality] Slow scheduled readings update', { duration });
      }

      scheduleHistoryInsert();
    };

    if (typeof window !== 'undefined') {
      const frameId = requestAnimationFrame(runUpdate);
      return () => {
        cancelled = true;
        cancelAnimationFrame(frameId);
      };
    }

    runUpdate();

    return () => {
      cancelled = true;
    };
  }, [scheduledIsFresh, scheduledReading, pruneHistory, enqueueHistoryInsert]);

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

    if (isDuplicateReading(readingsRef.current, latestReading)) {
      return;
    }

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

    let cancelled = false;

    const scheduleHistoryInsert = () => {
      const invoke = () => {
        if (!cancelled) {
          enqueueHistoryInsert(latestReading, 'live');
        }
      };

      if (typeof queueMicrotask === 'function') {
        queueMicrotask(invoke);
      } else {
        Promise.resolve().then(invoke).catch(() => {
          // enqueueHistoryInsert already logs failures
        });
      }
    };

    const runUpdate = () => {
      if (cancelled) {
        return;
      }

      const start = performance.now();

      const mergedReadings = [...readingsRef.current, latestReading];
      const prunedReadings = pruneHistory(mergedReadings);
      readingsRef.current = prunedReadings;

      startTransition(() => {
        if (!cancelled) {
          setReadings(prunedReadings);
        }
      });

      const duration = performance.now() - start;
      if (duration > 32) {
        console.warn('[useAirQuality] Slow live readings update', { duration });
      }

      scheduleHistoryInsert();
    };

    if (typeof window !== 'undefined') {
      const frameId = requestAnimationFrame(runUpdate);
      return () => {
        cancelled = true;
        cancelAnimationFrame(frameId);
      };
    }

    runUpdate();

    return () => {
      cancelled = true;
    };
  }, [aqicnQuery.data, pruneHistory, enqueueHistoryInsert]);

  // Memoized function to fetch air quality data with caching
  const refreshOnce = useRef(initialLockActive);
  const refreshInFlightRef = useRef(false);

  const manualRefresh = useCallback(
    async (options: { force?: boolean; silent?: boolean } = {}) => {
      if (!locationData?.latitude || !locationData?.longitude) {
        return { skipped: true } as const;
      }

      if (refreshInFlightRef.current) {
        if (!options.silent) {
          console.log('⏳ [useAirQuality] Skipping refresh; another refresh is still in flight');
        }
        return { skipped: true } as const;
      }

      refreshInFlightRef.current = true;
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
        refreshInFlightRef.current = false;
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
      finally {
        refreshInFlightRef.current = false;
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
      if (refreshInFlightRef.current) {
        return;
      }

      const hasRefreshedOnce = refreshOnce.current;
      const lockRemaining = getTimeUntilNextRefresh();
      const shouldForceInitial = !hasRefreshedOnce && lockRemaining === 0;

      manualRefresh({
        force: shouldForceInitial,
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

