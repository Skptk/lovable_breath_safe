import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DataCollectionStatus {
  hasRecentReadings: boolean;
  totalReadings: number;
  lastReadingDate: string | null;
  pointsCalculated: boolean;
  totalPoints: number;
  dataSourceStatus: string;
}

export const useDataCollectionDebug = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<DataCollectionStatus>({
    hasRecentReadings: false,
    totalReadings: 0,
    lastReadingDate: null,
    pointsCalculated: false,
    totalPoints: 0,
    dataSourceStatus: 'Unknown'
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkDataCollectionStatus = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check recent readings (last 7 days)
      const { data: recentReadings, error: readingsError } = await supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (readingsError) {
        console.error('Error fetching recent readings:', readingsError);
        return;
      }

      // Check total readings count
      const { count: totalCount, error: countError } = await supabase
        .from('air_quality_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error fetching total readings count:', countError);
        return;
      }

      // Check user points
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user points:', profileError);
        return;
      }

      // Check global environmental data (server-side collection)
      const { data: globalData, error: globalError } = await supabase
        .from('global_environmental_data')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      const hasRecentReadings = recentReadings && recentReadings.length > 0;
      const lastReadingDate = recentReadings && recentReadings.length > 0 
        ? recentReadings[0].timestamp 
        : null;

      setStatus({
        hasRecentReadings,
        totalReadings: totalCount || 0,
        lastReadingDate,
        pointsCalculated: (profileData?.total_points || 0) > 0,
        totalPoints: profileData?.total_points || 0,
        dataSourceStatus: globalData && globalData.length > 0 ? 'Server-side collection active' : 'No server-side data'
      });

      // Log debug information
      console.log('🔍 Data Collection Debug Status:', {
        hasRecentReadings,
        totalReadings: totalCount || 0,
        lastReadingDate,
        totalPoints: profileData?.total_points || 0,
        globalDataCount: globalData?.length || 0,
        recentReadingsCount: recentReadings?.length || 0
      });

    } catch (error) {
      console.error('Error in data collection debug:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkDataCollectionStatus();
    }
  }, [user]);

  return {
    status,
    isLoading,
    refreshStatus: checkDataCollectionStatus
  };
};
