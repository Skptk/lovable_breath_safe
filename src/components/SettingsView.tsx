import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import Header from "@/components/Header";
import { 
  Settings, 
  Shield, 
  HelpCircle, 
  Download,
  Palette,
  Globe,
  MapPin,
  Database,
  Smartphone,
  Bell,
  Eye,
  Lock
} from "lucide-react";
import NotificationSettings from "./NotificationSettings";

interface SettingsViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function SettingsView({ showMobileMenu, onMobileMenuToggle }: SettingsViewProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
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

  useEffect(() => {
    loadLocalSettings();
  }, []);

  const loadLocalSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('breath-safe-app-settings');
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
    localStorage.setItem('breath-safe-app-settings', JSON.stringify(newSettings));
    // Never change the theme from app settings - only allow theme changes from the sidebar toggle
    // This prevents the settings page from overriding the user's current theme preference
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

  const exportUserData = async () => {
    try {
      // Get user data from localStorage and other sources
      const exportData = {
        settings: localSettings,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `breath-safe-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Your settings have been exported successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: "Failed to export settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        title="Settings"
        subtitle="Customize your app experience and preferences"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />
      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your app experience and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="notifications" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettings />
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance & Theme
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
              </CardContent>
            </Card>
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

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card className="bg-gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                
                <div className="space-y-2">
                  <Label>Data Export</Label>
                  <p className="text-sm text-muted-foreground">Export your settings and preferences</p>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={exportUserData}
                  >
                    <Download className="h-4 w-4" />
                    Export Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
