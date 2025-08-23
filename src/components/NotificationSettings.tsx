import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Bell, 
  AlertTriangle, 
  Award, 
  DollarSign, 
  ShoppingBag, 
  Flame, 
  Clock, 
  BarChart, 
  Megaphone, 
  Settings,
  Mail,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationSettingsProps {
  className?: string;
}

export default function NotificationSettings({ className }: NotificationSettingsProps) {
  const { toast } = useToast();
  const { preferences, updatePreferences, initializePreferences, isLoading } = useNotifications();
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  // Initialize preferences if they don't exist
  useEffect(() => {
    if (!isLoading && !preferences) {
      initializePreferences();
    }
  }, [isLoading, preferences, initializePreferences]);

  const handleToggle = (key: string, value: boolean) => {
    setLocalPreferences(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleThresholdChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (numValue >= 0 && numValue <= 500) {
      setLocalPreferences(prev => prev ? { ...prev, aqi_threshold: numValue } : null);
    }
  };

  const handleSave = async () => {
    if (!localPreferences) return;

    setIsSaving(true);
    try {
      await updatePreferences(localPreferences);
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(localPreferences);

  if (isLoading) {
    return (
      <Card className={cn("floating-card border-0", className)}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!localPreferences) {
    return (
      <Card className={cn("floating-card border-0", className)}>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h3 className="font-semibold mb-2">Setting up notifications</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we initialize your notification preferences...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    {
      key: 'aqi_alerts',
      title: 'Air Quality Alerts',
      description: 'Get notified when air quality exceeds your threshold',
      icon: AlertTriangle,
      hasThreshold: true,
    },
    {
      key: 'achievement_notifications',
      title: 'Achievement Unlocked',
      description: 'Celebrate your progress and milestones',
      icon: Award,
    },
    {
      key: 'points_notifications',
      title: 'Points Earned',
      description: 'Stay updated on your point earnings',
      icon: DollarSign,
    },
    {
      key: 'withdrawal_notifications',
      title: 'Withdrawal Updates',
      description: 'Get notified about withdrawal status changes',
      icon: DollarSign,
    },
    {
      key: 'shop_notifications',
      title: 'Shop & Store',
      description: 'New products and sales announcements',
      icon: ShoppingBag,
    },
    {
      key: 'streak_notifications',
      title: 'Streak Milestones',
      description: 'Celebrate your consecutive day achievements',
      icon: Flame,
    },
    {
      key: 'daily_reminders',
      title: 'Daily Reminders',
      description: 'Gentle reminders to check air quality',
      icon: Clock,
    },
    {
      key: 'weekly_summaries',
      title: 'Weekly Summaries',
      description: 'Weekly reports on your air quality data',
      icon: BarChart,
    },
    {
      key: 'system_announcements',
      title: 'System Announcements',
      description: 'Important app updates and news',
      icon: Megaphone,
    },
    {
      key: 'maintenance_alerts',
      title: 'Maintenance Alerts',
      description: 'Scheduled maintenance and downtime notices',
      icon: Settings,
    },
  ];

  return (
    <Card className={cn("floating-card border-0", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize how and when you receive notifications from Breath Safe.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Delivery Methods</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive notifications in the app</p>
              </div>
            </div>
            <Switch
              checked={localPreferences.push_notifications}
              onCheckedChange={(value) => handleToggle('push_notifications', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              checked={localPreferences.email_notifications}
              onCheckedChange={(value) => handleToggle('email_notifications', value)}
            />
          </div>
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Notification Types</h3>
          
          {notificationTypes.map(({ key, title, description, icon: Icon, hasThreshold }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">{title}</Label>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={localPreferences[key as keyof typeof localPreferences] as boolean}
                  onCheckedChange={(value) => handleToggle(key, value)}
                />
              </div>
              
              {hasThreshold && localPreferences.aqi_alerts && (
                <div className="ml-7 space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Alert when AQI exceeds:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="500"
                      value={localPreferences.aqi_threshold}
                      onChange={(e) => handleThresholdChange(e.target.value)}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">
                      (Recommended: 100)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll receive alerts when air quality in your area exceeds this threshold.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
