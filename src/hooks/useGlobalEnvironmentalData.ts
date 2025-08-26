import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalEnvironmentalData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

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
  dataAge: number; // in minutes
}

/**
 * Hook for fetching environmental data from server-side collected data
 * This replaces direct API calls with database queries for better performance
 */
export const useGlobalEnvironmentalData = (
  options: UseGlobalEnvironmentalDataOptions = {}
): UseGlobalEnvironmentalDataReturn => {
  const {
    latitude,
    longitude,
    maxDistanceKm = 50,
    cityName,
    autoRefresh = true,
    refreshInterval = 900000 // 15 minutes
  } = options;

  const { user } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Function to get all active environmental data for all cities
  const getAllCitiesEnvironmentalData = useCallback(async (): Promise<GlobalEnvironmentalData[]> => {
    try {
      console.log('🌍 [GlobalData] Fetching environmental data for all cities');
      
      // Try to use the database function first
      try {
        const { data, error } = await supabase
          .rpc('get_all_active_environmental_data');

        if (error) {
          console.warn('⚠️ [GlobalData] Database function failed, trying direct table query:', error);
          throw error; // This will trigger the fallback
        }

        if (data && data.length > 0) {
          console.log(`✅ [GlobalData] Found data for ${data.length} cities via function`);
          // Use the most recent timestamp as last updated
          const mostRecent = data.reduce((latest, current) => 
            new Date(current.collection_timestamp) > new Date(latest.collection_timestamp) ? current : latest
          );
          setLastUpdated(mostRecent.collection_timestamp);
          return data as GlobalEnvironmentalData[];
        }
      } catch (functionError) {
        console.log('🔄 [GlobalData] Falling back to direct table query...');
      }

      // Fallback: Direct table query if function doesn't exist
      const { data, error } = await supabase
        .from('global_environmental_data')
        .select('*')
        .eq('is_active', true)
        .order('collection_timestamp', { ascending: false });

      if (error) {
        console.error('❌ [GlobalData] Error fetching all cities data:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`✅ [GlobalData] Found data for ${data.length} cities via direct query`);
        // Use the most recent timestamp as last updated
        const mostRecent = data.reduce((latest, current) => 
          new Date(current.collection_timestamp) > new Date(latest.collection_timestamp) ? current : latest
        );
        setLastUpdated(mostRecent.collection_timestamp);
        return data as GlobalEnvironmentalData[];
      }

      console.log('⚠️ [GlobalData] No environmental data found for any cities');
      return [];
    } catch (error) {
      console.error('❌ [GlobalData] Failed to fetch all cities data:', error);
      throw error;
    }
  }, []);

  // Function to get nearest environmental data for given coordinates
  const getNearestEnvironmentalData = useCallback(async (): Promise<GlobalEnvironmentalData | null> => {
    if (!latitude || !longitude) {
      console.log('useGlobalEnvironmentalData: No coordinates provided, cannot fetch nearest data');
      return null;
    }

    try {
      console.log(`🌍 [GlobalData] Fetching nearest environmental data for coordinates: ${latitude}, ${longitude}`);
      
      // Try to use the database function first
      try {
        const { data, error } = await supabase
          .rpc('get_nearest_environmental_data', {
            p_latitude: latitude,
            p_longitude: longitude,
            p_max_distance_km: maxDistanceKm
          });

        if (error) {
          console.warn('⚠️ [GlobalData] Database function failed, trying direct table query:', error);
          throw error; // This will trigger the fallback
        }

        if (data && data.length > 0) {
          console.log(`✅ [GlobalData] Found nearest data via function: ${data[0].city_name}`);
          setLastUpdated(data[0].collection_timestamp);
          return data[0] as GlobalEnvironmentalData;
        }
      } catch (functionError) {
        console.log('🔄 [GlobalData] Falling back to direct table query...');
      }

      // Fallback: Direct table query with manual distance calculation
      const { data, error } = await supabase
        .from('global_environmental_data')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('❌ [GlobalData] Error fetching nearest environmental data:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Manual distance calculation using Haversine formula
        const nearestData = data.reduce((nearest, current) => {
          const currentDistance = calculateHaversineDistance(
            latitude, longitude,
            current.latitude, current.longitude
          );
          const nearestDistance = nearest ? calculateHaversineDistance(
            latitude, longitude,
            nearest.latitude, nearest.longitude
          ) : Infinity;
          
          return currentDistance < nearestDistance ? current : nearest;
        });

        if (nearestData) {
          const distance = calculateHaversineDistance(
            latitude, longitude,
            nearestData.latitude, nearestData.longitude
          );
          
          if (distance <= maxDistanceKm) {
            console.log(`✅ [GlobalData] Found nearest data via direct query: ${nearestData.city_name} (${distance.toFixed(1)}km)`);
            setLastUpdated(nearestData.collection_timestamp);
            // Convert to GlobalEnvironmentalData type by adding missing properties
            return {
              ...nearestData,
              created_at: nearestData.created_at || new Date().toISOString()
            } as GlobalEnvironmentalData;
          } else {
            console.log(`⚠️ [GlobalData] Nearest data too far: ${nearestData.city_name} (${distance.toFixed(1)}km > ${maxDistanceKm}km)`);
          }
        }
      }

      console.log('⚠️ [GlobalData] No environmental data found within range');
      return null;
    } catch (error) {
      console.error('❌ [GlobalData] Failed to fetch nearest environmental data:', error);
      throw error;
    }
  }, [latitude, longitude, maxDistanceKm]);

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Function to get environmental data for a specific city
  const getCityEnvironmentalData = useCallback(async (): Promise<GlobalEnvironmentalData | null> => {
    if (!cityName) {
      console.log('useGlobalEnvironmentalData: No city name provided, cannot fetch city data');
      return null;
    }

    try {
      console.log(`🌍 [GlobalData] Fetching environmental data for city: ${cityName}`);
      
      const { data, error } = await supabase
        .from('global_environmental_data')
        .select('*')
        .eq('city_name', cityName)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error(`❌ [GlobalData] Error fetching data for ${cityName}:`, error);
        throw error;
      }

      if (data) {
        console.log(`✅ [GlobalData] Found data for ${cityName}`);
        setLastUpdated(data.collection_timestamp);
        return data as GlobalEnvironmentalData;
      }

      console.log(`⚠️ [GlobalData] No data found for city: ${cityName}`);
      return null;
    } catch (error) {
      console.error(`❌ [GlobalData] Failed to fetch data for ${cityName}:`, error);
      throw error;
    }
  }, [cityName]);

  // Determine which query function to use based on options
  const queryFunction = useMemo(() => {
    if (cityName) {
      return getCityEnvironmentalData;
    } else if (latitude && longitude) {
      return getNearestEnvironmentalData;
    } else {
      return getAllCitiesEnvironmentalData;
    }
  }, [cityName, latitude, longitude, getCityEnvironmentalData, getNearestEnvironmentalData, getAllCitiesEnvironmentalData]);

  // React Query for data fetching
  const query = useQuery({
    queryKey: ['global-environmental-data', latitude, longitude, cityName, maxDistanceKm],
    queryFn: queryFunction,
    enabled: !!user, // Only run when user is authenticated
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
    retryDelay: 2000,
  });

  // Calculate data age in minutes
  const dataAge = useMemo(() => {
    if (!lastUpdated) return 0;
    const ageMs = Date.now() - new Date(lastUpdated).getTime();
    return Math.floor(ageMs / (1000 * 60));
  }, [lastUpdated]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    console.log('🔄 [GlobalData] Manual refetch requested');
    try {
      await query.refetch();
    } catch (error) {
      console.error('❌ [GlobalData] Manual refetch failed:', error);
    }
  }, [query]);

  // Log data age for debugging
  useEffect(() => {
    if (dataAge > 0) {
      console.log(`⏰ [GlobalData] Data age: ${dataAge} minutes`);
    }
  }, [dataAge]);

  // Log when data is being refetched
  useEffect(() => {
    if (query.isRefetching) {
      console.log('🔄 [GlobalData] Refreshing environmental data...');
    }
  }, [query.isRefetching]);

  return {
    data: query.data as GlobalEnvironmentalData | null,
    allCitiesData: Array.isArray(query.data) ? query.data as GlobalEnvironmentalData[] : [],
    isLoading: query.isLoading,
    error: query.error,
    refetch,
    lastUpdated,
    dataAge
  };
};

export default useGlobalEnvironmentalData;
