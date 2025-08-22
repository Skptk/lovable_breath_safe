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
  progress: number;
  max_progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
  achievement: Achievement;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  pointsRequired: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define the badge system based on points thresholds
  const badgeDefinitions: Omit<Badge, 'unlocked' | 'unlockedAt' | 'progress' | 'maxProgress'>[] = [
    {
      id: 'bronze-starter',
      name: 'Bronze Starter',
      description: 'Begin your journey with 10,000 points',
      icon: '🥉',
      color: 'bg-amber-500',
      pointsRequired: 10000
    },
    {
      id: 'silver-explorer',
      name: 'Silver Explorer',
      description: 'Explore air quality monitoring with 20,000 points',
      icon: '🥈',
      color: 'bg-gray-400',
      pointsRequired: 20000
    },
    {
      id: 'gold-enthusiast',
      name: 'Gold Enthusiast',
      description: 'Show your dedication with 30,000 points',
      icon: '🥇',
      color: 'bg-yellow-500',
      pointsRequired: 30000
    },
    {
      id: 'platinum-guardian',
      name: 'Platinum Guardian',
      description: 'Guard air quality with 40,000 points',
      icon: '💎',
      color: 'bg-blue-400',
      pointsRequired: 40000
    },
    {
      id: 'diamond-master',
      name: 'Diamond Master',
      description: 'Master the art of monitoring with 50,000 points',
      icon: '💠',
      color: 'bg-purple-500',
      pointsRequired: 50000
    },
    {
      id: 'emerald-expert',
      name: 'Emerald Expert',
      description: 'Expert level achieved with 60,000 points',
      icon: '🟢',
      color: 'bg-green-500',
      pointsRequired: 60000
    },
    {
      id: 'ruby-champion',
      name: 'Ruby Champion',
      description: 'Champion status unlocked with 70,000 points',
      icon: '🔴',
      color: 'bg-red-500',
      pointsRequired: 70000
    },
    {
      id: 'sapphire-legend',
      name: 'Sapphire Legend',
      description: 'Legendary status with 80,000 points',
      icon: '🔵',
      color: 'bg-indigo-500',
      pointsRequired: 80000
    },
    {
      id: 'obsidian-elite',
      name: 'Obsidian Elite',
      description: 'Elite status achieved with 90,000 points',
      icon: '⚫',
      color: 'bg-gray-800',
      pointsRequired: 90000
    },
    {
      id: 'crystal-legend',
      name: 'Crystal Legend',
      description: 'Ultimate legend status with 100,000 points',
      icon: '✨',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      pointsRequired: 100000
    }
  ];

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

  const initializeUserAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Call the initialize_user_achievements function
      const { error } = await supabase.rpc('initialize_user_achievements', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Refresh achievements after initialization
      await fetchAchievements();
      
      return { success: true };
    } catch (err: any) {
      console.error('Error initializing achievements:', err);
      setError(err.message || 'Failed to initialize achievements');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchAchievements]);

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
      
      return { success: true };
    } catch (err: any) {
      console.error('Error checking achievements:', err);
      return { success: false, error: err.message };
    }
  }, [user, fetchAchievements]);

  const refreshAchievements = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Refresh achievements data
      await fetchAchievements();
      
      return { success: true };
    } catch (err: any) {
      console.error('Error refreshing achievements:', err);
      setError(err.message || 'Failed to refresh achievements');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchAchievements]);

  // Update badges based on user points
  const updateBadges = useCallback((totalPoints: number) => {
    const updatedBadges = badgeDefinitions.map(badge => {
      const unlocked = totalPoints >= badge.pointsRequired;
      const progress = Math.min(totalPoints, badge.pointsRequired);
      const maxProgress = badge.pointsRequired;
      
      return {
        ...badge,
        unlocked,
        progress,
        maxProgress,
        unlockedAt: unlocked ? new Date().toISOString() : undefined
      };
    });

    setBadges(updatedBadges);
  }, []);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user, fetchAchievements]);

  // Calculate progress and earned achievements
  const earnedAchievements = userAchievements.filter(ua => ua.unlocked).map(ua => ua.achievement);
  const totalAchievements = achievements.length;
  const earnedCount = earnedAchievements.length;
  const progress = totalAchievements > 0 ? (earnedCount / totalAchievements) * 100 : 0;

  // Calculate badge progress
  const unlockedBadges = badges.filter(badge => badge.unlocked);
  const totalBadges = badges.length;
  const badgeProgress = totalBadges > 0 ? (unlockedBadges.length / totalBadges) * 100 : 0;

  return {
    achievements: earnedAchievements, // Return only earned achievements for ProfileView
    allAchievements: achievements,
    userAchievements,
    badges,
    isLoading,
    error,
    totalAchievements,
    earnedCount,
    progress,
    totalBadges,
    unlockedBadges,
    badgeProgress,
    checkAchievements,
    fetchAchievements,
    initializeUserAchievements,
    refreshAchievements,
    updateBadges
  };
};