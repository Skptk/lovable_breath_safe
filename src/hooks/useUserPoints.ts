import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';

interface UserPoints {
  totalPoints: number;
  todayReadings: number;
  weeklyReadings: number;
  monthlyReadings: number;
  pointsHistory: PointRecord[];
  recentEarnings: PointRecord[];
}

interface PointRecord {
  id: string;
  user_id: string;
  points_earned: number;
  aqi_value: number;
  location_name: string;
  timestamp: string;
  created_at: string;
}

export const useUserPoints = () => {
  const { user } = useAuth();
  const { subscribeToUserPoints, subscribeToUserProfilePoints } = useRealtime();
  const [userPoints, setUserPoints] = useState<UserPoints>({
    totalPoints: 0,
    todayReadings: 0,
    weeklyReadings: 0,
    monthlyReadings: 0,
    pointsHistory: [],
    recentEarnings: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user points data
  const fetchUserPoints = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get total points from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const totalPoints = profileData?.total_points || 0;

      // Get points history
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (pointsError) throw pointsError;

      // Calculate reading counts
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), now.getMonth() - 1, now.getDate());

      const todayReadings = pointsData?.filter(record => 
        new Date(record.created_at) >= today
      ).length || 0;

      const weeklyReadings = pointsData?.filter(record => 
        new Date(record.created_at) >= weekAgo
      ).length || 0;

      const monthlyReadings = pointsData?.filter(record => 
        new Date(record.created_at) >= monthAgo
      ).length || 0;

      // Get recent earnings (last 10)
      const recentEarnings = pointsData?.slice(0, 10) || [];

      setUserPoints({
        totalPoints,
        todayReadings,
        weeklyReadings,
        monthlyReadings,
        pointsHistory: pointsData || [],
        recentEarnings
      });

    } catch (err: any) {
      console.error('Error fetching user points:', err);
      setError(err.message || 'Failed to fetch user points');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to profile points updates
    const unsubscribeProfile = subscribeToUserProfilePoints((payload) => {
      console.log('Profile points updated:', payload);
      if (payload.eventType === 'UPDATE') {
        const updatedProfile = payload.new as any;
        setUserPoints(prev => ({
          ...prev,
          totalPoints: updatedProfile.total_points || 0
        }));
      }
    });

    // Subscribe to user points inserts
    const unsubscribePoints = subscribeToUserPoints((payload) => {
      console.log('New points earned:', payload);
      if (payload.eventType === 'INSERT') {
        const newPointRecord = payload.new as PointRecord;
        
        // Add to recent earnings
        setUserPoints(prev => ({
          ...prev,
          pointsHistory: [newPointRecord, ...prev.pointsHistory],
          recentEarnings: [newPointRecord, ...prev.recentEarnings.slice(0, 9)],
          todayReadings: prev.todayReadings + 1,
          weeklyReadings: prev.weeklyReadings + 1,
          monthlyReadings: prev.monthlyReadings + 1
        }));

        // Refresh total points
        fetchUserPoints();
      }
    });

    return () => {
      unsubscribeProfile();
      unsubscribePoints();
    };
  }, [user, subscribeToUserProfilePoints, subscribeToUserPoints, fetchUserPoints]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user, fetchUserPoints]);

  // Calculate additional metrics
  const averagePointsPerReading = userPoints.pointsHistory.length > 0 
    ? userPoints.totalPoints / userPoints.pointsHistory.length 
    : 0;

  const totalReadings = userPoints.pointsHistory.length;
  const currencyValue = (userPoints.totalPoints / 1000) * 0.1; // $0.1 per 1000 points
  const canWithdraw = userPoints.totalPoints >= 500000;

  return {
    userPoints,
    isLoading,
    error,
    averagePointsPerReading,
    totalReadings,
    currencyValue,
    canWithdraw,
    fetchUserPoints
  };
};
