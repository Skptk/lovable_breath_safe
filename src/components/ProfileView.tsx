import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import Header from "@/components/Header";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  Download,
  Smartphone,
  Award,
  Edit3,
  Save,
  X,
  Globe,
  Palette,
  Database,
  Calendar,
  MapPin,
  Activity,
  Zap,
  Loader2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Gift,
  CreditCard
} from "lucide-react";
import NotificationSettings from "./NotificationSettings";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  total_points: number;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  totalReadings: number;
  totalPoints: number;
  memberSince: string;
  lastReading: string;
  favoriteLocation: string;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  method: 'paypal' | 'mpesa';
  status: 'pending' | 'approved' | 'rejected';
  paypal_email?: string;
  mpesa_phone?: string;
  created_at: string;
}

interface GiftCard {
  id: string;
  name: string;
  value: number;
  points_required: number;
  image_url?: string;
  available: boolean;
}

interface ProfileViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function ProfileView({ showMobileMenu, onMobileMenuToggle }: ProfileViewProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', email: '' });
  const [exporting, setExporting] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: 0,
    method: 'paypal' as 'paypal' | 'mpesa',
    paypal_email: '',
    mpesa_phone: ''
  });
  
  // Local state for settings - initialize with default values to prevent controlled/uncontrolled warnings
  const [localSettings, setLocalSettings] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en' as 'en' | 'es' | 'fr',
    units: 'metric' as 'metric' | 'imperial',
    dataRetention: '90days' as '30days' | '90days' | '1year' | 'forever',
    privacy: {
      shareData: false,
      publicProfile: false,
      locationHistory: true
    },
    location: {
      autoLocation: true,
      locationAccuracy: 'high' as 'high' | 'medium' | 'low',
      locationHistory: true
    }
  });

  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchWithdrawalRequests();
      fetchGiftCards();
      loadLocalSettings();
    }
  }, [user]);

  // Fetch user stats after profile is loaded
  useEffect(() => {
    if (profile) {
      fetchUserStats();
    }
  }, [profile]);



  const loadLocalSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('breath-safe-profile-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Only load non-theme settings to prevent theme switching
        const { theme: _, ...nonThemeSettings } = parsed;
        setLocalSettings(prev => ({
          ...prev,
          ...nonThemeSettings
        }));
      } catch (error) {
        console.warn('Failed to parse saved settings, using defaults');
      }
    }
  };

  const saveLocalSettings = (newSettings: typeof localSettings) => {
    setLocalSettings(newSettings);
    localStorage.setItem('breath-safe-profile-settings', JSON.stringify(newSettings));
    // Never change the theme from profile settings - only allow theme changes from the sidebar toggle
    // This prevents the profile page from overriding the user's current theme preference
  };

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
      setEditForm({ full_name: data.full_name || '', email: data.email || '' });
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
          const { data: lastReadingData } = await supabase
            .from('air_quality_readings')
            .select('timestamp, location_name')
            .eq('user_id', user?.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          lastReading = lastReadingData;

          const { data: locationStatsData } = await supabase
            .from('air_quality_readings')
            .select('location_name')
            .eq('user_id', user?.id);

          locationStats = locationStatsData;
        } catch (readingError: any) {
          console.log('Error fetching reading details:', readingError.message);
        }
      }

      const locationCounts = locationStats?.reduce((acc, record) => {
        acc[record.location_name] = (acc[record.location_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const favoriteLocation = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No readings yet';

      setUserStats({
        totalReadings: readingsCount || 0,
        totalPoints,
        memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }) : 'Unknown',
        lastReading: lastReading?.timestamp ? new Date(lastReading.timestamp).toLocaleDateString() : 'Never',
        favoriteLocation
      });
    } catch (error: any) {
      console.error('Error fetching user stats:', error);
      // Set default stats for new users
      setUserStats({
        totalReadings: 0,
        totalPoints: profile?.total_points || 0,
        memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }) : 'Unknown',
        lastReading: 'Never',
        favoriteLocation: 'No readings yet'
      });
    }
  };

  const fetchWithdrawalRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.log('Withdrawal requests table not yet created - this is normal during setup');
          setWithdrawalRequests([]);
          return;
        }
        throw error;
      }
      
      const typedData: WithdrawalRequest[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        amount: item.amount,
        method: item.method as 'paypal' | 'mpesa',
        status: item.status as 'pending' | 'approved' | 'rejected',
        paypal_email: item.paypal_email || undefined,
        mpesa_phone: item.mpesa_phone || undefined,
        created_at: item.created_at
      }));
      
      setWithdrawalRequests(typedData);
    } catch (error: any) {
      console.error('Error fetching withdrawal requests:', error);
      setWithdrawalRequests([]);
    }
  };

  const fetchGiftCards = async () => {
    try {
      const mockGiftCards: GiftCard[] = [
        {
          id: '1',
          name: 'Carrefour Kenya',
          value: 1000,
          points_required: 10000,
          available: true
        },
        {
          id: '2',
          name: 'Carrefour Kenya',
          value: 2000,
          points_required: 20000,
          available: true
        },
        {
          id: '3',
          name: 'Carrefour Kenya',
          value: 5000,
          points_required: 50000,
          available: true
        }
      ];
      setGiftCards(mockGiftCards);
    } catch (error: any) {
      console.error('Error fetching gift cards:', error);
    }
  };

  const handleWithdrawal = async () => {
    if (!user || !profile) return;

    const requiredPoints = withdrawalForm.amount * 10000;
    
    if (profile.total_points < requiredPoints) {
      toast({
        title: "Insufficient Points",
        description: `You need ${requiredPoints.toLocaleString()} points to withdraw $${withdrawalForm.amount}`,
        variant: "destructive",
      });
      return;
    }

    if (profile.total_points < 500000) {
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

      if (error) {
        if (error.code === 'PGRST205') {
          toast({
            title: "Database Setup Required",
            description: "The withdrawal system is not yet set up. Please contact support.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Deduct points from user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: profile.total_points - requiredPoints })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request has been submitted and is pending approval",
      });

      setShowWithdrawalModal(false);
      setWithdrawalForm({ amount: 0, method: 'paypal', paypal_email: '', mpesa_phone: '' });
      fetchProfile();
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

  const redeemGiftCard = async (giftCard: GiftCard) => {
    if (!user || !profile) return;

    if (profile.total_points < giftCard.points_required) {
      toast({
        title: "Insufficient Points",
        description: `You need ${giftCard.points_required.toLocaleString()} points to redeem this gift card`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: profile.total_points - giftCard.points_required })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Gift Card Redeemed!",
        description: `You've successfully redeemed a ${giftCard.name} gift card worth ${giftCard.value} KES`,
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Error redeeming gift card:', error);
      toast({
        title: "Error",
        description: "Failed to redeem gift card",
        variant: "destructive",
      });
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: editForm.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: editForm.full_name });
      setEditingProfile(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportUserData = async () => {
    setExporting(true);
    try {
      const { data: readings } = await supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false });

      const exportData = {
        profile: profile,
        readings: readings || [],
        settings: localSettings,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `breath-safe-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Your data has been exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const updateLocalSetting = (category: keyof typeof localSettings, key: string, value: any) => {
    if (category === 'theme' || category === 'language' || category === 'units' || category === 'dataRetention') {
      const newSettings = {
        ...localSettings,
        [category]: value
      };
      saveLocalSettings(newSettings);
    } else if (category === 'privacy' || category === 'location') {
      const newSettings = {
        ...localSettings,
        [category]: {
          ...localSettings[category],
          [key]: value
        }
      };
      saveLocalSettings(newSettings);
    }
    
    toast({
      title: "Setting Updated",
      description: `${key} has been updated successfully.`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-card rounded-lg"></div>
          <div className="h-32 bg-card rounded-lg"></div>
          <div className="h-48 bg-card rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold">Profile Not Found</h3>
          <p className="text-muted-foreground">Unable to load your profile</p>
          <Button onClick={fetchProfile} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        title="Profile & Settings"
        subtitle="Manage your account, preferences, and view your progress"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* User Info */}
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  {editingProfile ? (
                    <div className="space-y-2">
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        placeholder="Full Name"
                        className="w-48"
                      />
                      <Input
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="Email"
                        className="w-48"
                        disabled
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-semibold">{profile.full_name || 'User'}</h2>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      <Award className="h-3 w-3 mr-1" />
                      {profile.total_points || 0} Points
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {editingProfile ? (
                  <>
                    <Button size="sm" onClick={saveProfile} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Readings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{userStats?.totalReadings || 0}</div>
              <p className="text-xs text-muted-foreground">Since joining</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Total Points
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{userStats?.totalPoints || 0}</div>
              <p className="text-xs text-muted-foreground">Earned</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{userStats?.memberSince || 'Unknown'}</div>
              <p className="text-xs text-muted-foreground">Joined</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Favorite Location
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-bold truncate">{userStats?.favoriteLocation || 'Unknown'}</div>
              <p className="text-xs text-muted-foreground">Most visited</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettings />
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="share-data">Share Data for Research</Label>
                    <p className="text-sm text-muted-foreground">Anonymously contribute to air quality research</p>
                  </div>
                  <Switch
                    id="share-data"
                    checked={localSettings.privacy.shareData}
                    onCheckedChange={(checked) => updateLocalSetting('privacy', 'shareData', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public-profile">Public Profile</Label>
                    <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
                  </div>
                  <Switch
                    id="public-profile"
                    checked={localSettings.privacy.publicProfile}
                    onCheckedChange={(checked) => updateLocalSetting('privacy', 'publicProfile', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="location-history">Location History</Label>
                    <p className="text-sm text-muted-foreground">Store your location history</p>
                  </div>
                  <Switch
                    id="location-history"
                    checked={localSettings.privacy.locationHistory}
                    onCheckedChange={(checked) => updateLocalSetting('privacy', 'locationHistory', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy Policy & Terms */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Legal & Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Privacy Policy</Label>
                  <p className="text-sm text-muted-foreground">Read our privacy policy to understand how we protect your data</p>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open('/privacy', '_blank')}
                  >
                    <Shield className="h-4 w-4" />
                    Read Privacy Policy
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Terms of Service</Label>
                  <p className="text-sm text-muted-foreground">Review our terms and conditions for using Breath Safe</p>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open('/terms', '_blank')}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Read Terms of Service
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Data Export & Deletion</Label>
                  <p className="text-sm text-muted-foreground">Manage your data and account</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={exportUserData}
                      disabled={exporting}
                    >
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Export Data
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          toast({
                            title: "Account Deletion",
                            description: "Account deletion feature coming soon",
                          });
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  App Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme Preference</Label>
                  <p className="text-sm text-muted-foreground">Your preferred theme (use sidebar toggle to change current theme)</p>
                  <Select
                    value={localSettings.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') => 
                      updateLocalSetting('theme', 'theme', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={localSettings.language}
                    onValueChange={(value: 'en' | 'es' | 'fr') => 
                      updateLocalSetting('language', 'language', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="units">Units</Label>
                  <Select
                    value={localSettings.units}
                    onValueChange={(value: 'metric' | 'imperial') => 
                      updateLocalSetting('units', 'units', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (μg/m³)</SelectItem>
                      <SelectItem value="imperial">Imperial (ppm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data-retention">Data Retention</Label>
                  <Select
                    value={localSettings.dataRetention}
                    onValueChange={(value: '30days' | '90days' | '1year' | 'forever') => 
                      updateLocalSetting('dataRetention', 'dataRetention', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">30 Days</SelectItem>
                      <SelectItem value="90days">90 Days</SelectItem>
                      <SelectItem value="1year">1 Year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-location">Auto Location</Label>
                    <p className="text-sm text-muted-foreground">Automatically detect your location</p>
                  </div>
                  <Switch
                    id="auto-location"
                    checked={localSettings.location.autoLocation}
                    onCheckedChange={(checked) => updateLocalSetting('location', 'autoLocation', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location-accuracy">Location Accuracy</Label>
                  <Select
                    value={localSettings.location.locationAccuracy}
                    onValueChange={(value: 'high' | 'medium' | 'low') => 
                      updateLocalSetting('location', 'locationAccuracy', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (GPS)</SelectItem>
                      <SelectItem value="medium">Medium (WiFi)</SelectItem>
                      <SelectItem value="low">Low (IP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="location-history-setting">Location History</Label>
                    <p className="text-sm text-muted-foreground">Store your location history</p>
                  </div>
                  <Switch
                    id="location-history-setting"
                    checked={localSettings.location.locationHistory}
                    onCheckedChange={(checked) => updateLocalSetting('location', 'locationHistory', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Currency Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-500" />
                  Gift Cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {giftCards.map((giftCard) => (
                    <Card key={giftCard.id} className="border-2 hover:border-primary transition-colors">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-500 mb-2">
                          {giftCard.name}
                        </div>
                        <div className="text-lg font-semibold mb-2">
                          {giftCard.value} KES
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {giftCard.points_required.toLocaleString()} points
                        </div>
                        <Button
                          onClick={() => redeemGiftCard(giftCard)}
                          disabled={!giftCard.available || (profile?.total_points || 0) < giftCard.points_required}
                          className="w-full"
                          variant={giftCard.available && (profile?.total_points || 0) >= giftCard.points_required ? "default" : "outline"}
                        >
                          {giftCard.available && (profile?.total_points || 0) >= giftCard.points_required ? "Redeem" : "Insufficient Points"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  Withdrawal Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && profile.total_points >= 500000 ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
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
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      You need at least 500,000 points to withdraw funds. 
                      Current points: {profile?.total_points?.toLocaleString() || 0}
                    </p>
                  </div>
                )}

                {withdrawalRequests.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Recent Withdrawal Requests</h4>
                    {withdrawalRequests.map((request) => (
                      <Card key={request.id} className="border">
                        <CardContent className="p-3">
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button variant="destructive" className="w-full gap-3" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>

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
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdrawal-amount">Amount (USD)</Label>
                  <Input
                    id="withdrawal-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={withdrawalForm.amount}
                    onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Points required: {(withdrawalForm.amount * 10000).toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label htmlFor="withdrawal-method">Payment Method</Label>
                  <Select
                    value={withdrawalForm.method}
                    onValueChange={(value: 'paypal' | 'mpesa') => 
                      setWithdrawalForm({ ...withdrawalForm, method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {withdrawalForm.method === 'paypal' && (
                  <div>
                    <Label htmlFor="paypal-email">PayPal Email</Label>
                    <Input
                      id="paypal-email"
                      type="email"
                      value={withdrawalForm.paypal_email}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, paypal_email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                )}

                {withdrawalForm.method === 'mpesa' && (
                  <div>
                    <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                    <Input
                      id="mpesa-phone"
                      type="tel"
                      value={withdrawalForm.mpesa_phone}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, mpesa_phone: e.target.value })}
                      placeholder="+254700000000"
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