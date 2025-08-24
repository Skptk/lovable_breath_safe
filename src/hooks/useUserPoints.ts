import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStableChannelSubscription } from './useStableChannelSubscription';

interface UserPoints {
  totalPoints: number;
  todayReadings: number;
  weeklyReadings: number;
  monthlyReadings: number;
  pointsHistory: PointRecord[];
  recentEarnings: PointRecord[];
  streaks?: {
    daily_reading: number;
    good_air_quality: number;
    weekly_activity: number;
  };
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

  // Use stable channel subscription for profile points updates
  const { isConnected: profilePointsConnected } = useStableChannelSubscription({
    channelName: `user-profile-points-${user?.id || 'anonymous'}`,
    userId: user?.id,
    config: {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `user_id=eq.${user?.id || 'anonymous'}`
    },
    onData: (payload) => {
      console.log('Profile points updated:', payload);
      if (payload.eventType === 'UPDATE') {
        const updatedProfile = payload.new as any;
        setUserPoints(prev => ({
          ...prev,
          totalPoints: updatedProfile.total_points || 0
        }));
      }
    },
    enabled: !!user?.id
  });

  // Use stable channel subscription for user points inserts
  const { isConnected: userPointsConnected } = useStableChannelSubscription({
    channelName: `user-points-inserts-${user?.id || 'anonymous'}`,
    userId: user?.id,
    config: {
      event: 'INSERT',
      schema: 'public',
      table: 'user_points',
      filter: `user_id=eq.${user?.id || 'anonymous'}`
    },
    onData: (payload) => {
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
    },
    enabled: !!user?.id
  });

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
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

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

      // Get user streaks
      const { data: streaksData, error: streaksError } = await supabase
        .from('user_streaks')
        .select('streak_type, current_streak')
        .eq('user_id', user.id);

      if (streaksError) {
        console.warn('Error fetching streaks:', streaksError);
      }

      // Process streaks data
      const streaks = streaksData ? {
        daily_reading: streaksData.find(s => s.streak_type === 'daily_reading')?.current_streak || 0,
        good_air_quality: streaksData.find(s => s.streak_type === 'good_air_quality')?.current_streak || 0,
        weekly_activity: streaksData.find(s => s.streak_type === 'weekly_activity')?.current_streak || 0
      } : undefined;

      setUserPoints({
        totalPoints,
        todayReadings,
        weeklyReadings,
        monthlyReadings,
        pointsHistory: pointsData || [],
        recentEarnings,
        streaks
      });

    } catch (err: any) {
      console.error('Error fetching user points:', err);
      setError(err.message || 'Failed to fetch user points');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  // Calculate badge progress
  const getCurrentBadge = () => {
    const totalPoints = userPoints.totalPoints;
    if (totalPoints >= 100000) return { name: 'Crystal Legend', icon: '✨', color: 'from-purple-500 to-pink-500' };
    if (totalPoints >= 90000) return { name: 'Obsidian Elite', icon: '⚫', color: 'bg-gray-800' };
    if (totalPoints >= 80000) return { name: 'Sapphire Legend', icon: '🔵', color: 'bg-indigo-500' };
    if (totalPoints >= 70000) return { name: 'Ruby Champion', icon: '🔴', color: 'bg-red-500' };
    if (totalPoints >= 60000) return { name: 'Emerald Expert', icon: '🟢', color: 'bg-green-500' };
    if (totalPoints >= 50000) return { name: 'Diamond Master', icon: '💠', color: 'bg-purple-500' };
    if (totalPoints >= 40000) return { name: 'Platinum Guardian', icon: '💎', color: 'bg-blue-400' };
    if (totalPoints >= 30000) return { name: 'Gold Enthusiast', icon: '🥇', color: 'bg-yellow-500' };
    if (totalPoints >= 20000) return { name: 'Silver Explorer', icon: '🥈', color: 'bg-gray-400' };
    if (totalPoints >= 10000) return { name: 'Bronze Starter', icon: '🥉', color: 'bg-amber-500' };
    return { name: 'Newcomer', icon: '🌱', color: 'bg-green-400' };
  };

  const getNextBadge = () => {
    const totalPoints = userPoints.totalPoints;
    if (totalPoints < 10000) return { name: 'Bronze Starter', pointsRequired: 10000, icon: '🥉' };
    if (totalPoints < 20000) return { name: 'Silver Explorer', pointsRequired: 20000, icon: '🥈' };
    if (totalPoints < 30000) return { name: 'Gold Enthusiast', pointsRequired: 30000, icon: '🥇' };
    if (totalPoints < 40000) return { name: 'Platinum Guardian', pointsRequired: 40000, icon: '💎' };
    if (totalPoints < 50000) return { name: 'Diamond Master', pointsRequired: 50000, icon: '💠' };
    if (totalPoints < 60000) return { name: 'Emerald Expert', pointsRequired: 60000, icon: '🟢' };
    if (totalPoints < 70000) return { name: 'Ruby Champion', pointsRequired: 70000, icon: '🔴' };
    if (totalPoints < 80000) return { name: 'Sapphire Legend', pointsRequired: 80000, icon: '🔵' };
    if (totalPoints < 90000) return { name: 'Obsidian Elite', pointsRequired: 90000, icon: '⚫' };
    if (totalPoints < 100000) return { name: 'Crystal Legend', pointsRequired: 100000, icon: '✨' };
    return null; // All badges unlocked
  };

  const currentBadge = getCurrentBadge();
  const nextBadge = getNextBadge();
  const pointsToNextBadge = nextBadge ? nextBadge.pointsRequired - userPoints.totalPoints : 0;

  return {
    userPoints,
    isLoading,
    error,
    averagePointsPerReading,
    totalReadings,
    currencyValue,
    canWithdraw,
    fetchUserPoints,
    currentBadge,
    nextBadge,
    pointsToNextBadge,
    streaks: userPoints.streaks,
    profilePointsConnected,
    userPointsConnected
  };
};
