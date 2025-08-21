import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
  criteria_type: string;
  criteria_value: number;
  criteria_unit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  achievement: Achievement;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get all available achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Get user's earned achievements
      const { data: userAchievementsData, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id);

      if (userAchievementsError) throw userAchievementsError;

      setAchievements(allAchievements || []);
      setUserAchievements(userAchievementsData || []);
    } catch (err: any) {
      console.error('Error fetching achievements:', err);
      setError(err.message || 'Failed to fetch achievements');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkAchievements = useCallback(async () => {
    if (!user) return;

    try {
      // Call the check_achievements function
      const { error } = await supabase.rpc('check_achievements', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Refresh achievements after checking
      await fetchAchievements();
    } catch (err: any) {
      console.error('Error checking achievements:', err);
    }
  }, [user, fetchAchievements]);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user, fetchAchievements]);

  // Calculate progress and earned achievements
  const earnedAchievements = userAchievements.map(ua => ua.achievement);
  const totalAchievements = achievements.length;
  const earnedCount = earnedAchievements.length;
  const progress = totalAchievements > 0 ? (earnedCount / totalAchievements) * 100 : 0;

  return {
    achievements: earnedAchievements, // Return only earned achievements for ProfileView
    allAchievements: achievements,
    userAchievements,
    isLoading,
    error,
    totalAchievements,
    earnedCount,
    progress,
    checkAchievements,
    fetchAchievements
  };
};