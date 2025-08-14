import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Award
} from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  total_points: number;
  created_at: string;
}

export default function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-card rounded-lg"></div>
          <div className="h-32 bg-card rounded-lg"></div>
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
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                JD
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{profile?.full_name || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  <Award className="h-3 w-3 mr-1" />
                  {profile?.total_points || 0} Points
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">Since joining</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">Nov</div>
            <p className="text-xs text-muted-foreground">2023</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Menu */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Settings</h3>
        
        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>Account Settings</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span>Notifications</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <span>Location Permissions</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <Download className="h-5 w-5 text-muted-foreground" />
                <span>Export Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span>Privacy & Security</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <span>Help & Support</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 p-4 h-auto">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span>Advanced Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full gap-3" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}