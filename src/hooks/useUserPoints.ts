import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/realtimeClient';

interface UserPoints {
  totalPoints: number;
  currencyRewards: number;
  canWithdraw: boolean;
  isLoading: boolean;
  error: string | null;
  refreshPoints: () => void;
}

export const useUserPoints = (): UserPoints => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [currencyRewards, setCurrencyRewards] = useState(0);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserPoints = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        // Check if it's a "no rows" error (user profile doesn't exist)
        if (profileError.code === 'PGRST116') {
          console.warn('User profile not found in database');
          // This will trigger the useAuth hook to sign out the user
          return;
        }
        throw profileError;
      }

      // Also get the sum from user_points table for verification
      const { data: pointsHistory, error: pointsError } = await supabase
        .from('user_points')
        .select('points_earned')
        .eq('user_id', user.id);

      if (pointsError) {
        console.warn('Could not fetch points history:', pointsError);
      }

      // Calculate total from history
      const calculatedTotal = pointsHistory?.reduce((sum, record) => sum + (record.points_earned || 0), 0) || 0;
      const profileTotal = profile?.total_points || 0;

      // Use the higher value or sync if there's a mismatch
      const actualTotal = Math.max(calculatedTotal, profileTotal);

      // If there's a significant mismatch, update the profile
      if (Math.abs(actualTotal - profileTotal) > 0 && calculatedTotal > profileTotal) {
        console.log('Syncing profile points with calculated total:', calculatedTotal);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ total_points: calculatedTotal })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error syncing points:', updateError);
        }
      }

      setTotalPoints(actualTotal);
      setCurrencyRewards(actualTotal / 1000 * 0.1);
      setCanWithdraw(actualTotal >= 500000);
    } catch (err: any) {
      console.error('Error fetching user points:', err);
      setError(err.message || 'Failed to fetch user points');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPoints = () => {
    fetchUserPoints();
  };

  useEffect(() => {
    fetchUserPoints();
  }, [user]);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (!user) return;

    // Subscribe to profile updates
    subscribeToChannel('user-profile-points', (payload) => {
      console.log('Profile points updated:', payload);
      const newProfile = payload.new as { total_points: number };
      if (newProfile.total_points !== undefined) {
        setTotalPoints(newProfile.total_points);
        setCurrencyRewards(newProfile.total_points / 1000 * 0.1);
        setCanWithdraw(newProfile.total_points >= 500000);
      }
    }, {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `user_id=eq.${user.id}`
    });

    // Subscribe to new points inserts
    subscribeToChannel('user-points-inserts', (payload) => {
      console.log('New points earned:', payload);
      // Refresh to get updated total
      fetchUserPoints();
    }, {
      event: 'INSERT',
      schema: 'public',
      table: 'user_points',
      filter: `user_id=eq.${user.id}`
    });

    return () => {
      unsubscribeFromChannel('user-profile-points');
      unsubscribeFromChannel('user-points-inserts');
    };
  }, [user]);

  return {
    totalPoints,
    currencyRewards,
    canWithdraw,
    isLoading,
    error,
    refreshPoints
  };
};
