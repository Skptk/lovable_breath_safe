import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { motion } from "framer-motion";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import React, { useRef, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Award, 
  Download, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  DollarSign,
  Gift,
  Clock,
  TrendingUp,
  Shield,
  Settings,
  LogOut,
  HelpCircle,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useAchievements } from "@/hooks/useAchievements";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { fetchProfile as fetchProfileFromApi, fetchUserStats as fetchUserStatsFromApi } from "@/utils/profileData";

interface ProfileViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  total_points: number | null;
  created_at: string;
}

interface ProfileStats {
  totalReadings: number;
  totalPoints: number;
  memberSince: string | null;
}

const PROFILE_CONNECTION_TIMEOUT_MS = 10000;
const PROFILE_HISTORY_BUDGET = 200;

// Memoized Badge Component for Performance
const BadgeIcon = memo(({ 
  achievement, 
  userAchievement, 
  isMobile 
}: { 
  achievement: any; 
  userAchievement: any; 
  isMobile: boolean;
}) => {
  const isUnlocked = userAchievement?.unlocked;
  const badgeSize = isMobile ? 'w-11 h-11' : 'w-16 h-16';
  const iconSize = isMobile ? 'text-lg' : 'text-2xl';
  
  if (isUnlocked) {
    return (
      <div className="group relative">
        <div className={`${badgeSize} bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white ${iconSize} shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer border-2 border-yellow-300`}>
          {achievement.icon || '🏆'}
        </div>
        {/* Hover Tooltip - Only show on desktop */}
        {!isMobile && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            <div className="font-semibold">{achievement.name}</div>
            <div className="text-xs text-gray-300">{achievement.description}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="group relative">
      <div className={`${badgeSize} bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 ${iconSize} shadow-lg border-2 border-slate-200 dark:border-slate-600`}>
        🔒
      </div>
      {/* Hover Tooltip - Only show on desktop */}
      {!isMobile && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          <div className="font-semibold">{achievement.name}</div>
          <div className="text-xs text-slate-300">{achievement.description}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-slate-900"></div>
        </div>
      )}
    </div>
  );
});

BadgeIcon.displayName = 'BadgeIcon';

// Memoized Badge Container for Performance
const BudgetedArray = <T,>(items: T[] | undefined, budget: number): T[] => {
  if (!items) {
    return [];
  }
  if (items.length <= budget) {
    return items;
  }
  return items.slice(0, budget);
};

const BadgeContainer = memo(({ 
  userAchievements, 
  achievements, 
  isMobile 
}: { 
  userAchievements: any[]; 
  achievements: any[]; 
  isMobile: boolean;
}) => {
  // Memoize badge calculations to prevent unnecessary re-computations
  const { unlockedBadges, lockedBadges, moreBadgesCount } = useMemo(() => {
    const budgetedUserAchievements = BudgetedArray(userAchievements, PROFILE_HISTORY_BUDGET);
    const unlocked = budgetedUserAchievements.filter(ua => ua.unlocked);
    const locked = budgetedUserAchievements.filter(ua => !ua.unlocked);
    const moreCount = Math.max(0, locked.length - 3);
    
    return { unlockedBadges: unlocked, lockedBadges: locked, moreBadgesCount: moreCount };
  }, [userAchievements]);

  // Memoize badge rendering to prevent unnecessary re-renders
  const renderedUnlockedBadges = useMemo(() => {
    return unlockedBadges.map((userAchievement) => {
      const achievement = achievements.find(a => a.id === userAchievement.achievement_id);
      if (!achievement) return null;
      
      return (
        <BadgeIcon
          key={userAchievement.id}
          achievement={achievement}
          userAchievement={userAchievement}
          isMobile={isMobile}
        />
      );
    });
  }, [unlockedBadges, achievements, isMobile]);

  const renderedLockedBadges = useMemo(() => {
    return BudgetedArray(lockedBadges, 3).map((userAchievement) => {
      const achievement = achievements.find(a => a.id === userAchievement.achievement_id);
      if (!achievement) return null;
      
      return (
        <BadgeIcon
          key={userAchievement.id}
          achievement={achievement}
          userAchievement={userAchievement}
          isMobile={isMobile}
        />
      );
    });
  }, [lockedBadges, achievements, isMobile]);

  return (
    <div className="space-y-4">
      {/* Badge Grid with Responsive Layout */}
      <div className={`flex flex-wrap gap-2 md:gap-3 justify-start md:justify-start sm:justify-center max-w-full overflow-hidden`}>
        {/* Unlocked Badges */}
        {renderedUnlockedBadges}
        
        {/* Locked Badges */}
        {renderedLockedBadges}
        
        {/* More Badges Indicator */}
        {moreBadgesCount > 0 && (
          <div className={`flex items-center justify-center ${isMobile ? 'w-11 h-11' : 'w-16 h-16'} bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-full border-2 border-dashed border-slate-400 dark:border-slate-600`}>
            <span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">+{moreBadgesCount}</span>
          </div>
        )}
      </div>
      
      {/* Badge Progress Summary */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {unlockedBadges.length} of {userAchievements?.length || 0} badges unlocked
        </p>
      </div>
    </div>
  );
});

BadgeContainer.displayName = 'BadgeContainer';

export default function ProfileView({ showMobileMenu, onMobileMenuToggle }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalReadings: 0,
    totalPoints: 0,
    memberSince: null
  });
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({ full_name: '' });
  const { user, signOut } = useAuth();
  const { userPoints, isLoading: pointsLoading, updateTotalPoints } = useUserPoints();
  const { withdrawalRequests, isLoading: withdrawalLoading } = useWithdrawalRequests();
  const { achievements, userAchievements, isLoading: achievementsLoading } = useAchievements();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isInitialized, setIsInitialized] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const subscriptionRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const isComponentMountedRef = useRef(false);
  const handleProfilePointsUpdateRef = useRef<(payload: any) => void>(() => {});
  const userId = user?.id;

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const result = await fetchProfileFromApi(userId);

      if (!isMountedRef.current) {
        return;
      }

      if (result) {
        setProfile({
          id: result.id,
          user_id: result.user_id,
          email: result.email ?? null,
          full_name: result.full_name ?? null,
          avatar_url: result.avatar_url ?? null,
          total_points: result.total_points ?? 0,
          created_at: result.created_at,
        });
        setEditForm((prev) => ({
          ...prev,
          full_name: result.full_name ?? "",
        }));

        if (typeof result.total_points === "number") {
          updateTotalPoints(result.total_points);
        }
      } else {
        setProfile(null);
        setEditForm((prev) => ({ ...prev, full_name: "" }));
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
      toast({
        title: "Profile unavailable",
        description: "We couldn't load your profile right now. Please try again shortly.",
        variant: "destructive",
      });
    }
  }, [userId, toast, updateTotalPoints]);

  const fetchUserStats = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const statsData = await fetchUserStatsFromApi(userId);

      if (!isMountedRef.current) {
        return;
      }

      setStats({
        totalReadings: statsData.totalReadings ?? 0,
        totalPoints: statsData.totalPoints ?? 0,
        memberSince: statsData.memberSince,
      });
    } catch (error) {
      console.error("Failed to fetch profile statistics", error);
    }
  }, [userId]);

  const loadProfileData = useCallback(
    async (showLoader = true) => {
      if (!userId) {
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      try {
        await Promise.all([fetchProfile(), fetchUserStats()]);
      } finally {
        if (showLoader && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [userId, fetchProfile, fetchUserStats]
  );

  const handleSaveProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    const trimmedFullName = editForm.full_name?.trim() || null;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmedFullName })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      setProfile((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          full_name: trimmedFullName,
        };
      });

      setEditForm((prev) => ({ ...prev, full_name: trimmedFullName || '' }));

      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved.',
      });
    } catch (error) {
      console.error('Failed to update profile', error);
      toast({
        title: 'Update failed',
        description: 'We could not update your profile. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [userId, editForm.full_name, toast]);

  const handleExportData = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const blob = new Blob([JSON.stringify(data ?? [], null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'breath-safe-data-export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export started',
        description: 'Your data export has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Failed to export data', error);
      toast({
        title: 'Export failed',
        description: 'We were unable to export your data. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [userId, toast]);

  const handleDeleteAccount = useCallback(async () => {
    if (!userId) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await signOut();

      toast({
        title: 'Account deleted',
        description: 'Your account has been deleted successfully.',
      });
    } catch (error) {
      console.error('Failed to delete account', error);
      toast({
        title: 'Delete failed',
        description: 'We could not delete your account. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [userId, signOut, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    isComponentMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isComponentMountedRef.current = false;
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      performance.mark('profile-render-start');
      
      return () => {
        performance.mark('profile-render-end');
        performance.measure('profile-render', 'profile-render-start', 'profile-render-end');
        
        const measure = performance.getEntriesByName('profile-render')[0];
        if (measure && measure.duration > 16.67) {
          console.warn('Slow profile render detected:', measure.duration.toFixed(2) + 'ms');
        }
      };
    }
  });

  // Memoize expensive calculations
  const userLevel = useMemo(() => {
    return Math.floor((userPoints?.totalPoints || 0) / 10000) + 1;
  }, [userPoints?.totalPoints]);

  const userDisplayName = useMemo(() => {
    return profile?.full_name || user?.email || 'User';
  }, [profile?.full_name, user?.email]);

  const userInitial = useMemo(() => {
    return userDisplayName.charAt(0).toUpperCase();
  }, [userDisplayName]);

  const handleFullNameChange = useCallback((value: string) => {
    setEditForm((prev) => ({ ...prev, full_name: value }));
    setProfile((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, full_name: value };
    });
  }, []);

  // Debounced profile updates to prevent excessive re-renders
  const debouncedFetchProfile = useMemo(
    () =>
      debounce(async () => {
        await loadProfileData(false);
      }, 300),
    [loadProfileData]
  );

  useEffect(() => {
    handleProfilePointsUpdateRef.current = (payload: any) => {
      if (!isComponentMountedRef.current) {
        return;
      }

      console.log('📊 Profile points updated:', payload);
      if (payload.eventType === 'UPDATE' && payload.new?.total_points !== undefined) {
        updateTotalPoints(payload.new.total_points);
      }
      debouncedFetchProfile();
    };
  }, [updateTotalPoints, debouncedFetchProfile]);

  // Debounce function implementation
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const refreshTimeoutRef = useRef<number | null>(null);

  const cancelQueuedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current !== null) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const queueRefresh = useCallback(
    (priority: 'immediate' | 'idle' = 'idle') => {
      if (!userId) {
        return Promise.resolve();
      }

      if (priority === 'immediate') {
        cancelQueuedRefresh();
        return loadProfileData(false);
      }

      cancelQueuedRefresh();

      return new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          refreshTimeoutRef.current = null;
          loadProfileData(false).finally(resolve);
        }, 300);
        refreshTimeoutRef.current = timeoutId;
      });
    },
    [userId, loadProfileData, cancelQueuedRefresh]
  );

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setEditForm({ full_name: "" });
      setStats({
        totalReadings: 0,
        totalPoints: 0,
        memberSince: null,
      });
      setLoading(false);
      return;
    }

    void loadProfileData();
  }, [userId, loadProfileData]);

  useEffect(() => {
    if (!userId || isInitialized || subscriptionRef.current) {
      return;
    }

    let isActive = true;
    let timeoutId: number | null = null;
    let abortController: AbortController | null = null;

    const initializeSubscription = async () => {
      setSubscriptionStatus('connecting');
      abortController = new AbortController();
      timeoutId = window.setTimeout(() => {
        abortController?.abort();
      }, PROFILE_CONNECTION_TIMEOUT_MS);

      try {
        while (!abortController.signal.aborted && !supabase.realtime.isConnected()) {
           
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (abortController.signal.aborted || !isActive || !isMountedRef.current) {
          return;
        }

        const channelName = `user-profile-points-${userId}`;
        const channel = supabase.channel(channelName, {
          config: { presence: { key: userId } }
        });

        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            if (isMountedRef.current) {
              handleProfilePointsUpdateRef.current(payload);
            }
          }
        );

        channel.subscribe((status, error) => {
          if (!isMountedRef.current || !isActive) {
            return;
          }

          if (status === 'SUBSCRIBED') {
            setSubscriptionStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Profile channel error:', error);
            setSubscriptionStatus('error');
          }
        });

        if (!isMountedRef.current || !isActive) {
          await channel.unsubscribe();
          return;
        }

        subscriptionRef.current = () => {
          void channel.unsubscribe().catch((error) => {
            console.warn('Failed to unsubscribe profile channel', error);
          });
        };

        setIsInitialized(true);
      } catch (error) {
        if (!abortController?.signal.aborted) {
          console.error('Profile subscription failed:', error);
          setSubscriptionStatus('error');
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    
    void initializeSubscription();

    return () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (abortController) {
        abortController.abort();
      }
      if (subscriptionRef.current) {
        const unsubscribe = subscriptionRef.current;
        subscriptionRef.current = null;
        unsubscribe();
      }
      if (isMountedRef.current) {
        setSubscriptionStatus('idle');
        setIsInitialized(false);
      }
    };
  }, [userId, isInitialized]);

  // Mobile performance optimization - pause expensive operations when app is backgrounded
  // Optimized: Use passive listener to avoid blocking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Defer refresh to avoid blocking visibility handler
        requestAnimationFrame(() => {
          queueRefresh();
        });
      } else {
        cancelQueuedRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelQueuedRefresh();
    };
  }, [queueRefresh, cancelQueuedRefresh]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        title="Profile"
        subtitle="Manage your account and view progress"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <GlassCard variant="elevated">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="mt-1 bg-muted"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Badge Display Card - Fixed Layout */}
          <GlassCard variant="elevated" className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Badges
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-4">
                {/* User Info Section */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {userInitial}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {userDisplayName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Level {userLevel} • {userPoints?.totalPoints || 0} points
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Badge Container - Memoized for Performance */}
                <BadgeContainer 
                  userAchievements={userAchievements}
                  achievements={achievements}
                  isMobile={isMobile}
                />
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Statistics Card */}
          <GlassCard variant="elevated">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistics
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {stats.totalReadings || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Readings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {userPoints?.totalPoints || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Points Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {stats.memberSince ? new Date(stats.memberSince).getFullYear() : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Member Since</div>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Account Management Card */}
          <GlassCard variant="elevated">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Management
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
              <div className="text-sm text-muted-foreground text-center">
                Export your data before deleting your account
              </div>
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <GlassCard variant="default">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Currency Rewards
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-green-500">
                  ${((profile?.total_points || 0) / 1000 * 0.1).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">
                  $0.1 per 1000 points • Withdrawable at 500,000 points
                </p>
                {profile && profile.total_points >= 500000 ? (
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    🎉 Ready to withdraw!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                    {500000 - (profile?.total_points || 0)} points needed to withdraw
                  </Badge>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Withdrawal Requests */}
          <GlassCard variant="default">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                Withdrawal Requests
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              {withdrawalLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
                <div className="space-y-3">
                  {withdrawalRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium">${request.amount}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge 
                        variant={request.status === 'pending' ? 'outline' : 
                                request.status === 'approved' ? 'default' : 'destructive'}
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No withdrawal requests yet</p>
                  <p className="text-sm">Earn more points to make your first withdrawal</p>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <GlassCard variant="default">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Your Achievements
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              {achievementsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : achievements && achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="text-center p-4 bg-muted/30 rounded-lg">
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <div className="font-medium">{achievement.name}</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        +{achievement.points_reward} points
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No achievements unlocked yet</p>
                  <p className="text-sm">Keep monitoring air quality to earn achievements</p>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <GlassCard variant="default">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Account Settings
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <Button 
                variant="outline" 
                onClick={signOut}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="elevated">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferences
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => navigate('/dashboard?view=settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  App Settings
                </Button>
                                  <Button variant="outline" onClick={() => navigate('/dashboard?view=rewards')}>
                    <Award className="h-4 w-4 mr-2" />
                    Rewards
                  </Button>
                </div>
              </GlassCardContent>
            </GlassCard>

          <GlassCard variant="elevated">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Support & Help
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => window.open('/privacy', '_blank')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
                <Button variant="outline" onClick={() => window.open('/terms', '_blank')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Terms of Service
                </Button>
              </div>
            </GlassCardContent>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}