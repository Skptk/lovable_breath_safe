import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
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
import { useRealtime } from "@/contexts/RealtimeContext";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useAchievements } from "@/hooks/useAchievements";
import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";

interface ProfileViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  total_points: number;
  created_at: string;
}

interface ProfileStats {
  totalReadings: number;
  totalPoints: number;
  memberSince: string;
}

export default function ProfileView({ showMobileMenu, onMobileMenuToggle }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalReadings: 0,
    totalPoints: 0,
    memberSince: ''
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '' });
  const { user, signOut } = useAuth();
  const { subscribeToUserProfilePoints } = useRealtime();
  const { userPoints, isLoading: pointsLoading, updateTotalPoints } = useUserPoints();
  const { withdrawalRequests, isLoading: withdrawalLoading } = useWithdrawalRequests();
  const { achievements, userAchievements, isLoading: achievementsLoading } = useAchievements();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserStats();
    }
  }, [user]);

  // Subscribe to profile points updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserProfilePoints((payload) => {
      console.log('Profile points updated:', payload);
      // Update user points hook with new total points
      if (payload.eventType === 'UPDATE' && payload.new?.total_points !== undefined) {
        updateTotalPoints(payload.new.total_points);
      }
      // Refresh profile data when points are updated
      fetchProfile();
      fetchUserStats();
    });

    return unsubscribe;
  }, [user, subscribeToUserProfilePoints, updateTotalPoints]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('User profile not found in database');
          return;
        }
        throw error;
      }
      
      setProfile(data);
      setEditForm({ full_name: data.full_name || '' });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Check if user has any readings first
      const { count: readingsCount, error: countError } = await supabase
        .from('air_quality_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (countError) {
        console.log('No air quality readings found for new user:', countError.message);
      }

      const totalPoints = profile?.total_points || 0;

      // Only try to fetch last reading if user has readings
      let lastReading = null;
      let locationStats = null;

      if (readingsCount && readingsCount > 0) {
        try {
          // Get last reading
          const { data: lastReadingData, error: lastReadingError } = await supabase
            .from('air_quality_readings')
            .select('timestamp, location_name')
            .eq('user_id', user?.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (!lastReadingError && lastReadingData) {
            lastReading = lastReadingData;
          }
        } catch (error) {
          console.log('Error fetching last reading:', error);
        }

        // Get location stats
        try {
          const { data: locationData, error: locationError } = await supabase
            .from('air_quality_readings')
            .select('location_name')
            .eq('user_id', user?.id)
            .not('location_name', 'is', null);

          if (!locationError && locationData && locationData.length > 0) {
            const locationCounts = locationData.reduce((acc: any, reading: any) => {
              acc[reading.location_name] = (acc[reading.location_name] || 0) + 1;
              return acc;
            }, {});

            const favoriteLocation = Object.entries(locationCounts)
              .sort(([,a]: any, [,b]: any) => b - a)[0];

            if (favoriteLocation) {
              locationStats = {
                name: favoriteLocation[0],
                count: favoriteLocation[1]
              };
            }
          }
        } catch (error) {
          console.log('Error fetching location stats:', error);
        }
      }

      setStats({
        totalReadings: readingsCount || 0,
        totalPoints,
        memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'
      });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: editForm.full_name } : null);
      setEditing(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      // Export user's air quality readings
      const { data: readings, error } = await supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const csvContent = [
        ['Timestamp', 'Location', 'AQI', 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'],
        ...readings.map(reading => [
          reading.timestamp,
          reading.location_name || 'Unknown',
          reading.aqi,
          reading.pm25,
          reading.pm10,
          reading.no2,
          reading.so2,
          reading.co,
          reading.o3
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `air-quality-data-${user?.id}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully",
      });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete user's data
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      // Sign out
      await signOut();
      
      toast({
        title: "Account Deleted",
        description: "Your account has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <Header
          title="Profile"
          subtitle="Loading your profile..."
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

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
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
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

          {/* Badge Display Card */}
          <GlassCard variant="elevated" className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
            <GlassCardHeader>
              <GlassCardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5" />
                Your Badges
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">
                      {profile?.full_name || user?.email || 'User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Level {Math.floor((userPoints?.totalPoints || 0) / 10000) + 1} • {userPoints?.totalPoints || 0} points
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {userAchievements?.filter(ua => ua.unlocked)?.map((userAchievement) => {
                    const achievement = achievements.find(a => a.id === userAchievement.achievement_id);
                    if (!achievement) return null;
                    
                    return (
                      <div
                        key={userAchievement.id}
                        className="group relative"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer border-2 border-yellow-300">
                          {achievement.icon || '🏆'}
                        </div>
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="font-semibold">{achievement.name}</div>
                          <div className="text-xs text-gray-300">{achievement.description}</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show locked badges as placeholder */}
                  {userAchievements?.filter(ua => !ua.unlocked)?.slice(0, 3)?.map((userAchievement) => {
                    const achievement = achievements.find(a => a.id === userAchievement.achievement_id);
                    if (!achievement) return null;
                    
                    return (
                      <div
                        key={userAchievement.id}
                        className="group relative"
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-2xl shadow-lg border-2 border-slate-200 dark:border-slate-600">
                          🔒
                        </div>
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          <div className="font-semibold">{achievement.name}</div>
                          <div className="text-xs text-slate-300">{achievement.description}</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show more badges indicator if there are many locked ones */}
                  {userAchievements?.filter(ua => !ua.unlocked)?.length > 3 && (
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-full border-2 border-dashed border-slate-400 dark:border-slate-600">
                      <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">+{userAchievements.filter(ua => !ua.unlocked).length - 3}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {userAchievements?.filter(ua => ua.unlocked)?.length || 0} of {userAchievements?.length || 0} badges unlocked
                  </p>
                </div>
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