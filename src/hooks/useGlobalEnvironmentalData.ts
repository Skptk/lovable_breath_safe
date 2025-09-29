import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalEnvironmentalData } from '@/types';

interface UseGlobalEnvironmentalDataOptions {
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
  cityName?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseGlobalEnvironmentalDataReturn {
  data: GlobalEnvironmentalData | null;
  allCitiesData: GlobalEnvironmentalData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: string | null;
  dataAge: number;
}

const DEFAULT_REFRESH_INTERVAL = 900_000; // 15 minutes
const MIN_REFRESH_INTERVAL = 180_000; // Do not poll faster than every 3 minutes by default

const createBoundingBox = (latitude: number, longitude: number, distanceKm: number) => {
  const latDelta = distanceKm / 111;
  const constrainedLat = Math.max(-89.9, Math.min(89.9, latitude));
  const lonDenominator = Math.cos((constrainedLat * Math.PI) / 180);
  const lonDelta = lonDenominator === 0 ? 180 : distanceKm / (111 * lonDenominator);

  return {
    minLat: Math.max(-90, latitude - latDelta),
    maxLat: Math.min(90, latitude + latDelta),
    minLon: Math.max(-180, longitude - lonDelta),
    maxLon: Math.min(180, longitude + lonDelta),
  };
};

const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useGlobalEnvironmentalData = (
  options: UseGlobalEnvironmentalDataOptions = {},
): UseGlobalEnvironmentalDataReturn => {
  const {
    latitude,
    longitude,
    maxDistanceKm = 50,
    cityName,
    autoRefresh = true,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = options;

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const shouldFilterByLocation =
    typeof latitude === 'number' && !Number.isNaN(latitude) &&
    typeof longitude === 'number' && !Number.isNaN(longitude);

  const shouldFetch = shouldFilterByLocation || (typeof cityName === 'string' && cityName.trim().length > 0);

  const fetchGlobalData = useCallback(async (): Promise<GlobalEnvironmentalData[]> => {
    if (!shouldFetch) {
      console.log(' [GlobalData] Skipping fetch: no location or city context provided');
      setLastUpdated(null);
      return [];
    }

    const effectiveDistance = Math.min(Math.max(maxDistanceKm ?? 50, 5), 200);

    console.log(' [GlobalData] Fetching environmental data with scoped bounds', {
      latitude,
      longitude,
      maxDistanceKm: effectiveDistance,
      cityName,
    });

    let queryBuilder = supabase
      .from('global_environmental_data')
      .select('*')
      .eq('is_active', true);

    if (shouldFilterByLocation) {
      const bounds = createBoundingBox(latitude!, longitude!, effectiveDistance);
      queryBuilder = queryBuilder
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLon)
        .lte('longitude', bounds.maxLon);
    }

    if (cityName) {
      queryBuilder = queryBuilder.ilike('city_name', `${cityName}%`);
    }

    const { data, error } = await queryBuilder
      .order('collection_timestamp', { ascending: false })
      .limit(60);

    if (error) {
      console.error(' [GlobalData] Error fetching scoped table data:', error);
      throw error;
    }

    if (data && data.length > 0) {
      const mostRecent = data.reduce((latest, current) =>
        new Date(current.collection_timestamp) > new Date(latest.collection_timestamp) ? current : latest
      );
      setLastUpdated(mostRecent.collection_timestamp);
      return data as GlobalEnvironmentalData[];
    }

    console.log(' [GlobalData] No environmental data returned for scoped query.');
    setLastUpdated(null);
    return [];
  }, [shouldFetch, latitude, longitude, maxDistanceKm, cityName]);

  const query = useQuery<GlobalEnvironmentalData[], Error>({
    queryKey: ['global-environmental-data', latitude ?? null, longitude ?? null, cityName ?? null],
    queryFn: fetchGlobalData,
    enabled: shouldFetch,
    refetchInterval: autoRefresh ? Math.max(refreshInterval, MIN_REFRESH_INTERVAL) : false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 3,
    retryDelay: 2000,
  });

  const allCitiesData = query.data ?? [];

  const selectedCityData = useMemo<GlobalEnvironmentalData | null>(() => {
    if (!allCitiesData.length) {
      return null;
    }

    if (cityName) {
      const match = allCitiesData.find((item) => item.city_name.toLowerCase() === cityName.toLowerCase());
      if (match) {
        return match;
      }
    }

    if (latitude !== undefined && longitude !== undefined) {
      let closest: GlobalEnvironmentalData | null = null;
      let minDistance = Number.POSITIVE_INFINITY;

      for (const entry of allCitiesData) {
        const distance = calculateHaversineDistance(latitude, longitude, entry.latitude, entry.longitude);

        if (distance <= maxDistanceKm && distance < minDistance) {
          closest = entry;
          minDistance = distance;
        }
      }

      if (closest) {
        return closest;
      }
    }

    return allCitiesData[0] ?? null;
  }, [allCitiesData, cityName, latitude, longitude, maxDistanceKm]);

  const dataAge = useMemo(() => {
    if (!lastUpdated) {
      return 0;
    }
    const ageMs = Date.now() - new Date(lastUpdated).getTime();
    return Math.floor(ageMs / (1000 * 60));
  }, [lastUpdated]);

  const refetch = useCallback(async () => {
    console.log(' [GlobalData] Manual refetch requested');
    try {
      await query.refetch();
    } catch (error) {
      console.error(' [GlobalData] Manual refetch failed:', error);
    }
  }, [query]);

  useEffect(() => {
    if (dataAge > 0) {
      console.log(` [GlobalData] Data age: ${dataAge} minutes`);
    }
  }, [dataAge]);

  useEffect(() => {
    if (query.isRefetching) {
      console.log(' [GlobalData] Refreshing environmental data...');
    }
  }, [query.isRefetching]);

  return {
    data: selectedCityData,
    allCitiesData,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch,
    lastUpdated,
    dataAge,
  };
};

export default useGlobalEnvironmentalData;
