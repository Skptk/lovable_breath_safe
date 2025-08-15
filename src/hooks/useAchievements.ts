import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'reading' | 'streak' | 'quality' | 'milestone' | 'special';
  points_reward: number;
  criteria_type: 'count' | 'streak' | 'quality' | 'points' | 'custom';
  criteria_value: number;
  criteria_unit: string;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  max_progress: number;
  unlocked: boolean;
  unlocked_at?: string;
  achievement?: Achievement;
}

export interface UserStreak {
  id: string;
  user_id: string;
  streak_type: 'daily_reading' | 'good_air_quality' | 'weekly_activity';
  current_streak: number;
  max_streak: number;
  last_activity_date: string;
}

export interface AchievementsData {
  achievements: UserAchievement[];
  streaks: UserStreak[];
  isLoading: boolean;
  error: string | null;
  refreshAchievements: () => void;
}

export const useAchievements = (): AchievementsData => {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [streaks, setStreaks] = useState<UserStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAchievements = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user achievements with achievement details
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user streaks
      const { data: userStreaks, error: streaksError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .order('streak_type', { ascending: true });

      if (streaksError) throw streaksError;

      setAchievements(userAchievements || []);
      setStreaks(userStreaks || []);
    } catch (err: any) {
      console.error('Error fetching achievements:', err);
      setError(err.message || 'Failed to fetch achievements');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAchievements = () => {
    fetchAchievements();
  };

  useEffect(() => {
    fetchAchievements();
  }, [user]);

  return {
    achievements,
    streaks,
    isLoading,
    error,
    refreshAchievements
  };
};
