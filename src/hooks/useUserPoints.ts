import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

      const points = profile?.total_points || 0;
      setTotalPoints(points);
      setCurrencyRewards(points / 1000 * 0.1);
      setCanWithdraw(points >= 500000);
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

  return {
    totalPoints,
    currencyRewards,
    canWithdraw,
    isLoading,
    error,
    refreshPoints
  };
};
