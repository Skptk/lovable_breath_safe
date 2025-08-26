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
  achievement?: Achievement;
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
        .select('*')
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
    if (!user) return { success: false, error: 'No user found' };

    try {
      setIsLoading(true);
      setError(null);

      // Get all available achievements
      const { data: allAchievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true);

      if (achievementsError) throw achievementsError;

      // Create user achievement records for each achievement
      const userAchievementRecords = allAchievementsData.map(achievement => ({
        user_id: user.id,
        achievement_id: achievement.id,
        progress: 0,
        max_progress: achievement.criteria_value,
        unlocked: false,
        unlocked_at: null
      }));

      // Insert user achievements
      const { error: insertError } = await supabase
        .from('user_achievements')
        .upsert(userAchievementRecords, { 
          onConflict: 'user_id,achievement_id',
          ignoreDuplicates: true 
        });

      if (insertError) throw insertError;

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

  // Check and update achievements manually
  const checkAchievements = useCallback(async () => {
    if (!user) return { success: false, error: 'No user found' };
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get user's current data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      const totalPoints = profileData?.total_points || 0;
      
      // Get total readings count
      const { count: totalReadings, error: readingsError } = await supabase
        .from('air_quality_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (readingsError) throw readingsError;
      
      // Get good air quality days count (AQI <= 50)
      const { count: goodAirDays, error: goodAirError } = await supabase
        .from('air_quality_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lte('aqi', 50);
      
      if (goodAirError) throw goodAirError;
      
      // Get current streaks
      const { data: streaksData, error: streaksError } = await supabase
        .from('user_streaks')
        .select('streak_type, current_streak')
        .eq('user_id', user.id);
      
      if (streaksError) throw streaksError;
      
      const dailyStreak = streaksData?.find(s => s.streak_type === 'daily_reading')?.current_streak || 0;
      const goodAirStreak = streaksData?.find(s => s.streak_type === 'good_air_quality')?.current_streak || 0;
      const weeklyStreak = streaksData?.find(s => s.streak_type === 'weekly_activity')?.current_streak || 0;
      
      // Update reading count achievements
      await supabase
        .from('user_achievements')
        .update({ progress: totalReadings || 0 })
        .eq('user_id', user.id)
        .in('achievement_id', 
          achievements.filter(a => a.criteria_type === 'count' && a.category === 'reading').map(a => a.id)
        );
      
      // Update good air quality achievements
      await supabase
        .from('user_achievements')
        .update({ progress: goodAirDays || 0 })
        .eq('user_id', user.id)
        .in('achievement_id', 
          achievements.filter(a => a.criteria_type === 'quality').map(a => a.id)
        );
      
      // Update streak-based achievements
      await supabase
        .from('user_achievements')
        .update({ progress: dailyStreak })
        .eq('user_id', user.id)
        .in('achievement_id', 
          achievements.filter(a => a.criteria_type === 'streak' && a.category === 'streak').map(a => a.id)
        );
      
      // Update points-based achievements
      await supabase
        .from('user_achievements')
        .update({ progress: totalPoints })
        .eq('user_id', user.id)
        .in('achievement_id', 
          achievements.filter(a => a.criteria_type === 'points').map(a => a.id)
        );
      
      // Check and unlock achievements
      await supabase
        .from('user_achievements')
        .update({ 
          unlocked: true,
          unlocked_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .gte('progress', 'max_progress')
        .eq('unlocked', false);
      
      // Refresh achievements data
      await fetchAchievements();
      
      return { success: true };
    } catch (err: any) {
      console.error('Error checking achievements:', err);
      setError(err.message || 'Failed to check achievements');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [user, achievements, fetchAchievements]);

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
  const earnedAchievements = userAchievements.filter(ua => ua.unlocked);
  const totalAchievements = achievements.length;
  const earnedCount = earnedAchievements.length;
  const progress = totalAchievements > 0 ? (earnedCount / totalAchievements) * 100 : 0;

  // Calculate badge progress
  const unlockedBadges = badges.filter(badge => badge.unlocked);
  const totalBadges = badges.length;
  const badgeProgress = totalBadges > 0 ? (unlockedBadges.length / totalBadges) * 100 : 0;

  return {
    achievements,
    userAchievements,
    badges,
    isLoading,
    error,
    fetchAchievements,
    initializeUserAchievements,
    checkAchievements,
    refreshAchievements,
    updateBadges
  };
};