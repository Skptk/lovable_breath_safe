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
  CheckCircle
} from "lucide-react";

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

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    airQualityAlerts: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    shareData: boolean;
    publicProfile: boolean;
    locationHistory: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'es' | 'fr';
    units: 'metric' | 'imperial';
    dataRetention: '30days' | '90days' | '1year' | 'forever';
    aqiThreshold?: 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy';
    alertFrequency?: 'immediate' | 'hourly' | 'daily';
    reportDay?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    reportTime?: 'morning' | 'afternoon' | 'evening';
  };
  location: {
    autoLocation: boolean;
    locationAccuracy: 'high' | 'medium' | 'low';
    locationHistory: boolean;
  };
}

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  notifications: { email: true, push: true, airQualityAlerts: true, weeklyReports: false },
  privacy: { shareData: false, publicProfile: false, locationHistory: true },
  preferences: { 
    theme: 'system', 
    language: 'en', 
    units: 'metric', 
    dataRetention: '90days',
    aqiThreshold: 'moderate',
    alertFrequency: 'immediate',
    reportDay: 'monday',
    reportTime: 'morning'
  },
  location: { autoLocation: true, locationAccuracy: 'high', locationHistory: true }
};

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', email: '' });
  const [exporting, setExporting] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserStats();
      loadUserSettings();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
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
      const { count: readingsCount } = await supabase
        .from('air_quality_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points_earned')
        .eq('user_id', user?.id);

      const totalPoints = pointsData?.reduce((sum, record) => sum + record.points_earned, 0) || 0;

      const { data: lastReading } = await supabase
        .from('air_quality_readings')
        .select('timestamp, location_name')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const { data: locationStats } = await supabase
        .from('air_quality_readings')
        .select('location_name')
        .eq('user_id', user?.id);

      const locationCounts = locationStats?.reduce((acc, record) => {
        acc[record.location_name] = (acc[record.location_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const favoriteLocation = Object.entries(locationCounts || {})
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

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
    }
  };

  const loadUserSettings = () => {
    try {
      const savedSettings = localStorage.getItem(`breath-safe-settings-${user?.id}`);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setUserSettings({ ...userSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Fallback to default settings
      setUserSettings(DEFAULT_SETTINGS);
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

  const saveSettings = () => {
    setSaving(true);
    try {
      // Save to localStorage instead of database
      localStorage.setItem(`breath-safe-settings-${user?.id}`, JSON.stringify(userSettings));
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save settings",
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

      const { data: points } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false });

      const exportData = {
        profile: profile,
        readings: readings || [],
        points: points || [],
        settings: userSettings,
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

  const updateSetting = (category: keyof UserSettings, key: string, value: any) => {
    setUserSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
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
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={userSettings.notifications.email}
                  onCheckedChange={(checked) => updateSetting('notifications', 'email', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive push notifications</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={userSettings.notifications.push}
                  onCheckedChange={(checked) => updateSetting('notifications', 'push', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="air-quality-alerts">Air Quality Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when AQI exceeds safe levels</p>
                </div>
                <Switch
                  id="air-quality-alerts"
                  checked={userSettings.notifications.airQualityAlerts}
                  onCheckedChange={(checked) => updateSetting('notifications', 'airQualityAlerts', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weekly-reports">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly air quality summaries</p>
                </div>
                <Switch
                  id="weekly-reports"
                  checked={userSettings.notifications.weeklyReports}
                  onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Air Quality Alert Configuration */}
          {userSettings.notifications.airQualityAlerts && (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Air Quality Alert Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aqi-threshold">AQI Alert Threshold</Label>
                  <Select
                    value={userSettings.preferences.aqiThreshold || 'moderate'}
                    onValueChange={(value: 'good' | 'moderate' | 'unhealthy-sensitive' | 'unhealthy') => 
                      updateSetting('preferences', 'aqiThreshold', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good (0-50)</SelectItem>
                      <SelectItem value="moderate">Moderate (51-100)</SelectItem>
                      <SelectItem value="unhealthy-sensitive">Unhealthy for Sensitive Groups (101-150)</SelectItem>
                      <SelectItem value="unhealthy">Unhealthy (151-200)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Get notified when AQI exceeds this level</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alert-frequency">Alert Frequency</Label>
                  <Select
                    value={userSettings.preferences.alertFrequency || 'immediate'}
                    onValueChange={(value: 'immediate' | 'hourly' | 'daily') => 
                      updateSetting('preferences', 'alertFrequency', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How often to receive alerts</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Report Configuration */}
          {userSettings.notifications.weeklyReports && (
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Weekly Report Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-day">Report Day</Label>
                  <Select
                    value={userSettings.preferences.reportDay || 'monday'}
                    onValueChange={(value: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday') => 
                      updateSetting('preferences', 'reportDay', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Day of the week to receive your report</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="report-time">Report Time</Label>
                  <Select
                    value={userSettings.preferences.reportTime || 'morning'}
                    onValueChange={(value: 'morning' | 'afternoon' | 'evening') => 
                      updateSetting('preferences', 'reportTime', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8:00 AM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (2:00 PM)</SelectItem>
                      <SelectItem value="evening">Evening (8:00 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Time of day to receive your report</p>
                </div>
              </CardContent>
            </Card>
          )}
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
                  checked={userSettings.privacy.shareData}
                  onCheckedChange={(checked) => updateSetting('privacy', 'shareData', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="public-profile">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
                </div>
                <Switch
                  id="public-profile"
                  checked={userSettings.privacy.publicProfile}
                  onCheckedChange={(checked) => updateSetting('privacy', 'publicProfile', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="location-history">Location History</Label>
                  <p className="text-sm text-muted-foreground">Store your location history</p>
                </div>
                <Switch
                  id="location-history"
                  checked={userSettings.privacy.locationHistory}
                  onCheckedChange={(checked) => updateSetting('privacy', 'locationHistory', checked)}
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
                        // TODO: Implement account deletion
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
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={userSettings.preferences.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') => 
                    updateSetting('preferences', 'theme', value)
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
                  value={userSettings.preferences.language}
                  onValueChange={(value: 'en' | 'es' | 'fr') => 
                    updateSetting('preferences', 'language', value)
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
                  value={userSettings.preferences.units}
                  onValueChange={(value: 'metric' | 'imperial') => 
                    updateSetting('preferences', 'units', value)
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
                  value={userSettings.preferences.dataRetention}
                  onValueChange={(value: '30days' | '90days' | '1year' | 'forever') => 
                    updateSetting('preferences', 'dataRetention', value)
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
                  checked={userSettings.location.autoLocation}
                  onCheckedChange={(checked) => updateSetting('location', 'autoLocation', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location-accuracy">Location Accuracy</Label>
                <Select
                  value={userSettings.location.locationAccuracy}
                  onValueChange={(value: 'high' | 'medium' | 'low') => 
                    updateSetting('location', 'locationAccuracy', value)
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
                  checked={userSettings.location.locationHistory}
                  onCheckedChange={(checked) => updateSetting('location', 'locationHistory', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Settings
        </Button>
        
        <Button variant="destructive" className="w-full gap-3" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
