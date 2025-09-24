import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { 
  Trophy, 
  DollarSign, 
  Star, 
  Flame, 
  Target, 
  Award,
  TrendingUp,
  Calendar,
  Zap,
  Crown,
  Medal,
  GiftIcon,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle,
  Lock
} from "lucide-react";
import { useToast } from '@/components/ui/use-toast';
import { useAchievements } from '@/hooks/useAchievements';
import { useUserPoints } from '@/hooks/useUserPoints';

interface RewardsProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  paypal_email?: string;
  mpesa_phone?: string;
  created_at: string;
}

export default function Rewards({ showMobileMenu, onMobileMenuToggle }: RewardsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: 0,
    method: 'paypal' as string,
    paypal_email: '',
    mpesa_phone: ''
  });
  const [loading, setLoading] = useState(true);

  // Use real achievements and badges from the database
  const { 
    achievements, 
    badges, 
    userAchievements,
    isLoading: achievementsLoading, 
    error: achievementsError, 
    refreshAchievements, 
    initializeUserAchievements,
    updateBadges 
  } = useAchievements();
  
  const { 
    userPoints, 
    currencyValue, 
    canWithdraw, 
    currentBadge, 
    nextBadge, 
    pointsToNextBadge,
    streaks
  } = useUserPoints();

  // Memoize the fetchProfile function to prevent unnecessary re-renders
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('User profile not found in database');
          return;
        }
        throw error;
      }
      
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Memoize the fetchWithdrawalRequests function to prevent unnecessary re-renders
  const fetchWithdrawalRequests = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setWithdrawalRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawal requests',
        variant: 'destructive',
      });
    }
  }, [user?.id, toast]);

  // Update badges when user points change
  useEffect(() => {
    if (userPoints?.totalPoints !== undefined && updateBadges) {
      updateBadges(userPoints.totalPoints);
    }
  }, [userPoints?.totalPoints, updateBadges]);

  // Debug logging - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Rewards page - Achievements:', achievements);
      console.log('Rewards page - Badges:', badges);
      console.log('Rewards page - Loading:', achievementsLoading);
      console.log('Rewards page - User Points:', userPoints);
      console.log('Rewards page - Streaks:', streaks);
    }
  }, [achievements, badges, achievementsLoading, userPoints, streaks]);

  // Fetch profile and withdrawal requests when user changes
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
      fetchWithdrawalRequests();
    }
  }, [user?.id, fetchProfile, fetchWithdrawalRequests]);

  const handleInitializeAchievements = async () => {
    try {
      const result = await initializeUserAchievements();
      if (result?.success) {
        toast({
          title: "Achievements Initialized",
          description: "Your achievement system has been set up successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result?.error || "Failed to initialize achievements",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to initialize achievements",
        variant: "destructive",
      });
    }
  };

  const handleRefreshAchievements = async () => {
    try {
      const result = await refreshAchievements();
      if (result?.success) {
        toast({
          title: "Data Refreshed",
          description: "Achievement data has been refreshed successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: result?.error || "Failed to refresh achievements",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to refresh achievements",
        variant: "destructive",
      });
    }
  };

  const handleResetAchievements = async () => {
    if (!user) return;
    
    try {
      // Call the database function to reset achievements to locked
      const { error } = await supabase.rpc('reset_user_achievements_to_locked', {
        p_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Achievements Reset",
        description: "All achievements have been reset to locked status for testing.",
      });

      // Refresh achievements to show updated status
      await refreshAchievements();
    } catch (error: any) {
      console.error('Error resetting achievements:', error);
      toast({
        title: "Error",
        description: "Failed to reset achievements",
        variant: "destructive",
      });
    }
  };

  const handleWithdrawal = async () => {
    if (!user || !profile) return;

    const requiredPoints = withdrawalForm.amount * 10000; // $0.1 per 1000 points = 10000 points per $1
    
    if ((userPoints?.totalPoints || 0) < requiredPoints) {
      toast({
        title: "Insufficient Points",
        description: `You need ${requiredPoints.toLocaleString()} points to withdraw $${withdrawalForm.amount}`,
        variant: "destructive",
      });
      return;
    }

    if ((userPoints?.totalPoints || 0) < 500000) {
      toast({
        title: "Minimum Points Required",
        description: "You need at least 500,000 points to withdraw funds",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: withdrawalForm.amount,
          method: withdrawalForm.method,
          paypal_email: withdrawalForm.method === 'paypal' ? withdrawalForm.paypal_email : null,
          mpesa_phone: withdrawalForm.method === 'mpesa' ? withdrawalForm.mpesa_phone : null,
          status: 'pending'
        });

      if (error) throw error;

      // Deduct points from user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: (userPoints?.totalPoints || 0) - requiredPoints })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request has been submitted and is pending approval",
      });

      setShowWithdrawalModal(false);
      setWithdrawalForm({ amount: 0, method: 'paypal', paypal_email: '', mpesa_phone: '' });
      fetchProfile(); // Refresh profile to show updated points
      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error submitting withdrawal request:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    }
  };

  if (loading || !userPoints) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header 
        title="Rewards & Achievements"
        subtitle="Track your progress and unlock badges"
        showMobileMenu={showMobileMenu || false} 
        onMobileMenuToggle={onMobileMenuToggle || (() => {})} 
      />
      <div className="page-content space-y-card-gap">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="heading-lg bg-gradient-primary bg-clip-text text-transparent">
            Rewards & Achievements
          </h1>
          <p className="body-md text-muted-foreground">
            Track your progress, unlock badges, and earn achievements
          </p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleInitializeAchievements}
              disabled={achievementsLoading}
              className="floating-card"
            >
              {achievementsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Initialize Achievements
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAchievements}
              disabled={achievementsLoading}
              className="floating-card"
            >
              {achievementsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAchievements}
              disabled={achievementsLoading}
              className="floating-card"
            >
              {achievementsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reset Achievements
            </Button>
          </div>
          
          {/* Error Display */}
          {achievementsError && (
            <div className="mt-4 p-3 floating-card border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Error loading achievements:</strong> {achievementsError}
              </p>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="floating-card border-0">
            <GlassCardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <Trophy className="w-8 h-8 mx-auto mb-2" />
                {(userPoints?.totalPoints || 0).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card border-0">
            <GlassCardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">
                <DollarSign className="w-8 h-8 mx-auto mb-2" />
                ${(currencyValue || 0).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Currency Value</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card border-0">
            <GlassCardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">
                <Star className="w-8 h-8 mx-auto mb-2" />
                {achievements ? achievements.length : 0}
              </div>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="floating-card border-0">
            <GlassCardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">
                <Crown className="w-8 h-8 mx-auto mb-2" />
                {badges ? badges.filter(b => b.unlocked).length : 0}
              </div>
              <p className="text-sm text-muted-foreground">Badges Unlocked</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Current Badge Display */}
        <GlassCard className="floating-card border-0">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Current Badge
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="text-center space-y-4">
            <div className="text-6xl mb-4">{currentBadge.icon}</div>
            <div className="text-2xl font-bold text-primary">{currentBadge.name}</div>
            <p className="text-muted-foreground">
              {nextBadge ? (
                <>
                  {pointsToNextBadge.toLocaleString()} points to next badge: {nextBadge.icon} {nextBadge.name}
                </>
              ) : (
                "You've unlocked all badges! 🎉"
              )}
            </p>
            {nextBadge && (
              <div className="w-full max-w-md mx-auto">
                <Progress 
                  value={((userPoints?.totalPoints || 0) / nextBadge.pointsRequired) * 100} 
                  className="h-3"
                />
                <div className="text-sm text-muted-foreground mt-2">
                  {userPoints?.totalPoints || 0} / {nextBadge.pointsRequired.toLocaleString()} points
                </div>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Main Content Tabs */}
        <Tabs defaultValue="badges" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <GlassCard className="floating-card border-0">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-yellow-500" />
                  Badge Collection
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                {!badges || badges.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-muted-foreground">No badges found. Start earning points to unlock badges!</p>
                    <Button 
                      onClick={handleInitializeAchievements} 
                      variant="outline" 
                      className="mt-4 floating-card"
                      disabled={achievementsLoading}
                    >
                      {achievementsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Initialize System
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {badges.map((badge) => (
                      <GlassCard 
                        key={badge.id} 
                        className={`floating-card border-2 transition-all duration-200 ${
                          badge.unlocked 
                            ? 'border-green-200 shadow-lg scale-105' 
                            : 'border-gray-200 opacity-75'
                        }`}
                      >
                        <GlassCardContent className="p-4 text-center">
                          <div className={`text-4xl mb-3 ${badge.unlocked ? '' : 'grayscale'}`}>
                            {badge.icon}
                          </div>
                          <div className="font-semibold text-lg mb-2">{badge.name}</div>
                          <div className="text-sm text-muted-foreground mb-3">
                            {badge.description}
                          </div>
                          <div className="text-sm font-medium mb-2">
                            {badge.pointsRequired.toLocaleString()} points required
                          </div>
                          
                          {badge.unlocked ? (
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Unlocked!</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Lock className="h-4 w-4" />
                              <span className="text-sm font-medium">Locked</span>
                            </div>
                          )}
                          
                          {/* Progress bar for locked badges */}
                          {!badge.unlocked && (
                            <div className="mt-3">
                              <Progress 
                                value={(badge.progress / badge.maxProgress) * 100} 
                                className="h-2"
                              />
                              <div className="text-xs text-muted-foreground mt-1">
                                {badge.progress.toLocaleString()} / {badge.maxProgress.toLocaleString()} points
                              </div>
                            </div>
                          )}
                        </GlassCardContent>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4">
            <GlassCard className="floating-card border-0">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  All Achievements
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                {!achievements || achievements.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-muted-foreground">No achievements found. They will be created when you first check air quality.</p>
                    <Button 
                      onClick={handleInitializeAchievements} 
                      variant="outline" 
                      className="mt-4 floating-card"
                      disabled={achievementsLoading}
                    >
                      {achievementsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Initialize Achievements
                    </Button>
                  </div>
                                  ) : (
                    achievements.map((achievement) => {
                      // Find the user's progress for this achievement
                      const userAchievement = userAchievements?.find(ua => ua.achievement_id === achievement.id);
                      const isUnlocked = userAchievement?.unlocked || false;
                      const progress = userAchievement?.progress || 0;
                      const maxProgress = userAchievement?.max_progress || achievement.criteria_value;
                      
                      return (
                        <GlassCard key={achievement.id} className={`floating-card border-2 ${isUnlocked ? 'border-green-200' : 'border-gray-200'}`}>
                          <GlassCardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="text-4xl">{achievement.icon}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold">{achievement.name}</div>
                                  <Badge 
                                    variant={isUnlocked ? "default" : "secondary"} 
                                    className={isUnlocked ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300"}
                                  >
                                    {isUnlocked ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Unlocked
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="h-3 w-3 mr-1" />
                                        Locked
                                      </>
                                    )}
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mb-3">
                                  {achievement.description}
                                </div>
                                <div className="text-sm text-blue-600 mb-3">
                                  Reward: +{achievement.points_reward} points
                                </div>
                                
                                {/* Progress bar for all achievements */}
                                <div className="mt-3">
                                  <Progress 
                                    value={(progress / maxProgress) * 100} 
                                    className="h-2"
                                  />
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {progress.toLocaleString()} / {maxProgress.toLocaleString()} {achievement.criteria_unit || 'units'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </GlassCardContent>
                        </GlassCard>
                      );
                    })
                  )}
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            {/* Currency Rewards */}
            <GlassCard className="floating-card border-0">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Currency Rewards
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="text-6xl font-bold text-green-500">
                    ${(currencyValue || 0).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    $0.1 per 1000 points • Withdrawable at 500,000 points
                  </p>
                  {canWithdraw ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      🎉 Ready to withdraw!
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                      {500000 - (userPoints?.totalPoints || 0)} points needed to withdraw
                    </Badge>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Badge Progress Summary */}
            <GlassCard className="floating-card border-0">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Badge Progress
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {badges ? badges.filter(b => b.unlocked).length : 0} / {badges ? badges.length : 0}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Badges Unlocked</p>
                  <Progress 
                    value={badges ? (badges.filter(b => b.unlocked).length / badges.length) * 100 : 0} 
                    className="h-3 max-w-md mx-auto"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 floating-card border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {userPoints?.totalPoints || 0}
                    </div>
                    <p className="text-sm text-blue-700">Total Points Earned</p>
                  </div>
                  
                  <div className="text-center p-4 floating-card border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {nextBadge ? nextBadge.pointsRequired - (userPoints?.totalPoints || 0) : 0}
                    </div>
                    <p className="text-sm text-green-700">Points to Next Badge</p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <GlassCard className="floating-card border-0">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  Withdrawal Requests
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                {canWithdraw ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 floating-card border border-green-200">
                      <p className="text-sm text-green-700">
                        You have enough points to withdraw! Click the button below to request a withdrawal.
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => setShowWithdrawalModal(true)}
                      className="w-full"
                      size="lg"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Request Withdrawal
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-4 floating-card border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      You need at least 500,000 points to withdraw funds. 
                      Current points: {profile.total_points.toLocaleString()}
                    </p>
                  </div>
                )}

                {withdrawalRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Recent Withdrawal Requests</h4>
                    {withdrawalRequests.map((request) => (
                      <GlassCard key={request.id} className="border">
                        <GlassCardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">${request.amount}</div>
                              <div className="text-sm text-muted-foreground">
                                {request.method === 'paypal' ? 'PayPal' : 'M-Pesa'} • {new Date(request.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge 
                              variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'destructive'}
                            >
                              {request.status}
                            </Badge>
                          </div>
                        </GlassCardContent>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* Withdrawal Modal */}
        {showWithdrawalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Request Withdrawal</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWithdrawalModal(false)}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Amount (USD)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount"
                    className="w-full p-2 border rounded-md mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Points required: {(withdrawalForm.amount * 10000).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Payment Method</label>
                  <select
                    value={withdrawalForm.method}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, method: e.target.value as 'paypal' | 'mpesa' })}
                    className="w-full p-2 border rounded-md mt-1"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="mpesa">M-Pesa</option>
                  </select>
                </div>

                {withdrawalForm.method === 'paypal' && (
                  <div>
                    <label className="text-sm font-medium">PayPal Email</label>
                    <input
                      type="email"
                      value={withdrawalForm.paypal_email}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paypal_email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full p-2 border rounded-md mt-1"
                    />
                  </div>
                )}

                {withdrawalForm.method === 'mpesa' && (
                  <div>
                    <label className="text-sm font-medium">M-Pesa Phone Number</label>
                    <input
                      type="tel"
                      value={withdrawalForm.mpesa_phone}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, mpesa_phone: e.target.value })}
                      placeholder="+254700000000"
                      className="w-full p-2 border rounded-md mt-1"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleWithdrawal}
                    className="flex-1"
                    disabled={!withdrawalForm.amount || 
                      (withdrawalForm.method === 'paypal' && !withdrawalForm.paypal_email) ||
                      (withdrawalForm.method === 'mpesa' && !withdrawalForm.mpesa_phone)
                    }
                  >
                    Submit Request
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowWithdrawalModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
