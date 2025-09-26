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

  const fetchGlobalData = useCallback(async (): Promise<GlobalEnvironmentalData[]> => {
    console.log(' [GlobalData] Fetching environmental data for all cities');

    // Try to use the RPC helper first (preferred path)
    try {
      const { data, error } = await supabase.rpc('get_all_active_environmental_data');

      if (error) {
        console.warn(' [GlobalData] RPC failed, falling back to table query:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const mostRecent = data.reduce((latest, current) =>
          new Date(current.collection_timestamp) > new Date(latest.collection_timestamp) ? current : latest
        );
        setLastUpdated(mostRecent.collection_timestamp);
        return data as GlobalEnvironmentalData[];
      }
    } catch (rpcError) {
      console.log(' [GlobalData] RPC unavailable. Using direct table query.', rpcError);
    }

    // Fallback: query the table directly
    const { data, error } = await supabase
      .from('global_environmental_data')
      .select('*')
      .eq('is_active', true)
      .order('collection_timestamp', { ascending: false });

    if (error) {
      console.error(' [GlobalData] Error fetching table data:', error);
      throw error;
    }

    if (data && data.length > 0) {
      const mostRecent = data.reduce((latest, current) =>
        new Date(current.collection_timestamp) > new Date(latest.collection_timestamp) ? current : latest
      );
      setLastUpdated(mostRecent.collection_timestamp);
      return data as GlobalEnvironmentalData[];
    }

    console.log(' [GlobalData] No environmental data returned.');
    setLastUpdated(null);
    return [];
  }, []);

  const query = useQuery<GlobalEnvironmentalData[], Error>({
    queryKey: ['global-environmental-data'],
    queryFn: fetchGlobalData,
    refetchInterval: autoRefresh ? refreshInterval : false,
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
