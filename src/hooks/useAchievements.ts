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
  refreshAchievements: () => Promise<void>;
  initializeUserAchievements: () => Promise<void>;
  updateAchievementProgress: (achievementType: string, progress: number) => Promise<void>;
  updateStreak: (streakType: string, increment: boolean) => Promise<void>;
}

export const useAchievements = (): AchievementsData => {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [streaks, setStreaks] = useState<UserStreak[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const { user } = useAuth();

  const initializeUserAchievements = async () => {
    if (!user || isInitializing) return;
    
    try {
      setIsInitializing(true);
      
      // Check if user already has achievements
      const { data: existingAchievements } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // If no achievements exist, initialize them
      if (!existingAchievements || existingAchievements.length === 0) {
        console.log('Initializing achievements for user:', user.id);
        
        try {
          // Initialize achievements manually
          const { data: allAchievements } = await supabase
            .from('achievements')
            .select('id, criteria_value')
            .eq('is_active', true);

          if (allAchievements && allAchievements.length > 0) {
            console.log('Found', allAchievements.length, 'achievements to initialize');
            
            // Create user achievement records
            const achievementInserts = allAchievements.map(achievement => ({
              user_id: user.id,
              achievement_id: achievement.id,
              progress: 0,
              max_progress: achievement.criteria_value,
              unlocked: false
            }));

            const { error: insertError } = await supabase
              .from('user_achievements')
              .insert(achievementInserts);

            if (insertError) {
              if (insertError.code === '23505') {
                // Duplicate key error - achievements were already created by another process
                console.log('Achievements already exist for user (duplicate key)');
              } else {
                console.error('Error inserting achievements:', insertError);
              }
            } else {
              console.log('Successfully inserted', achievementInserts.length, 'achievements');
            }

            // Initialize user streaks
            const { error: streakError } = await supabase
              .from('user_streaks')
              .insert([
                { user_id: user.id, streak_type: 'daily_reading', current_streak: 0, max_streak: 0, last_activity_date: new Date().toISOString().split('T')[0] },
                { user_id: user.id, streak_type: 'good_air_quality', current_streak: 0, max_streak: 0, last_activity_date: new Date().toISOString().split('T')[0] },
                { user_id: user.id, streak_type: 'weekly_activity', current_streak: 0, max_streak: 0, last_activity_date: new Date().toISOString().split('T')[0] }
              ]);

            if (streakError) {
              if (streakError.code === '23505') {
                // Duplicate key error - streaks were already created by another process
                console.log('Streaks already exist for user (duplicate key)');
              } else {
                console.error('Error inserting streaks:', streakError);
              }
            } else {
              console.log('Successfully initialized user streaks');
            }
          } else {
            console.log('No active achievements found in database');
          }

          // Refresh achievements after initialization
          setTimeout(() => {
            fetchAchievements();
          }, 500); // Small delay to ensure database operations complete
        } catch (initError) {
          console.error('Error initializing achievements manually:', initError);
        }
      } else {
        console.log('User already has achievements, skipping initialization');
      }
    } catch (error) {
      console.error('Error initializing user achievements:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchAchievements = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching achievements for user:', user.id);

      // Fetch user achievements with achievement details
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (achievementsError) {
        console.error('Error fetching user achievements:', achievementsError);
        throw achievementsError;
      }

      console.log('User achievements fetched:', userAchievements);

      // Fetch user streaks
      const { data: userStreaks, error: streaksError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .order('streak_type', { ascending: true });

      if (streaksError) {
        console.error('Error fetching user streaks:', streaksError);
        throw streaksError;
      }

      console.log('User streaks fetched:', userStreaks);

      // Type-safe assignment with proper casting
      setAchievements((userAchievements as unknown as UserAchievement[]) || []);
      setStreaks((userStreaks as unknown as UserStreak[]) || []);
    } catch (err: any) {
      console.error('Error fetching achievements:', err);
      setError(err.message || 'Failed to fetch achievements');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAchievements = async (): Promise<void> => {
    await fetchAchievements();
  };

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  // Auto-initialize achievements if user has none
  useEffect(() => {
    if (user && achievements.length === 0 && !isLoading && !isInitializing) {
      // Small delay to avoid race conditions
      const timer = setTimeout(() => {
        initializeUserAchievements();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, achievements.length, isLoading, isInitializing]);

  return {
    achievements,
    streaks,
    isLoading,
    error,
    refreshAchievements,
    initializeUserAchievements,
    updateAchievementProgress: async (achievementType: string, progress: number) => {
      // TODO: Implement achievement progress update
      console.log('Updating achievement progress:', achievementType, progress);
    },
    updateStreak: async (streakType: string, increment: boolean) => {
      // TODO: Implement streak update
      console.log('Updating streak:', streakType, increment);
    }
  };
};
