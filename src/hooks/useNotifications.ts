import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStableChannelSubscription } from './useStableChannelSubscription';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  air_quality_alerts: boolean;
  weather_alerts: boolean;
  achievement_notifications: boolean;
}

// New interface for notification preferences that matches the database schema
interface NotificationPreferences {
  aqi_alerts: boolean;
  aqi_threshold: number;
  achievement_notifications: boolean;
  points_notifications: boolean;
  withdrawal_notifications: boolean;
  shop_notifications: boolean;
  streak_notifications: boolean;
  daily_reminders: boolean;
  weekly_summaries: boolean;
  system_announcements: boolean;
  maintenance_alerts: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    air_quality_alerts: true,
    weather_alerts: true,
    achievement_notifications: true
  });
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Use stable channel subscription for notifications
  const { isConnected: notificationsConnected } = useStableChannelSubscription({
    channelName: `user-notifications-${user?.id || 'anonymous'}`,
    userId: user?.id,
    config: {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user?.id || 'anonymous'}`
    },
    onData: (payload) => {
      console.log('New notification received:', payload);
      
      if (payload.eventType === 'INSERT') {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        if (!newNotification.read) {
          setUnreadCount(prev => prev + 1);
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedNotification = payload.new as Notification;
        setNotifications(prev => 
          prev.map(n => 
            n.id === updatedNotification.id ? updatedNotification : n
          )
        );
        setUnreadCount(prev => {
          const oldNotification = notifications.find(n => n.id === updatedNotification.id);
          if (oldNotification && !oldNotification.read && updatedNotification.read) {
            return prev - 1;
          } else if (oldNotification && oldNotification.read && !updatedNotification.read) {
            return prev + 1;
          }
          return prev;
        });
      } else if (payload.eventType === 'DELETE') {
        const deletedNotification = payload.old as Notification;
        setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));
        if (!deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    },
    enabled: !!user?.id
  });

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch notification preferences from the notification_preferences table
  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences if none exist
        await initializePreferences();
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initialize default notification preferences
  const initializePreferences = useCallback(async () => {
    if (!user) return;

    try {
      const defaultPreferences: NotificationPreferences = {
        aqi_alerts: true,
        aqi_threshold: 100,
        achievement_notifications: true,
        points_notifications: true,
        withdrawal_notifications: true,
        shop_notifications: true,
        streak_notifications: true,
        daily_reminders: true,
        weekly_summaries: true,
        system_announcements: true,
        maintenance_alerts: true,
        email_notifications: false,
        push_notifications: true
      };

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          ...defaultPreferences
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Error initializing notification preferences:', error);
      throw error;
    }
  }, [user]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(newPreferences)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [user]);

  // Fetch notification settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings?.notifications) {
        // Map from the JSONB structure to our interface
        const notificationSettings = data.settings.notifications;
        setSettings({
          email_notifications: notificationSettings.email || true,
          push_notifications: notificationSettings.push || true,
          air_quality_alerts: notificationSettings.airQualityAlerts || true,
          weather_alerts: notificationSettings.weatherAlerts || false,
          achievement_notifications: notificationSettings.achievementNotifications || true
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const deletedNotification = notifications.find(n => n.id === notificationId);
        return deletedNotification && !deletedNotification.read ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user, notifications]);

  // Update notification settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // First get the current settings to preserve other fields
      const { data: currentData } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      const currentSettings = currentData?.settings || {};
      
      // Update the notifications section while preserving other settings
      const updatedFullSettings = {
        ...currentSettings,
        notifications: {
          email: updatedSettings.email_notifications,
          push: updatedSettings.push_notifications,
          airQualityAlerts: updatedSettings.air_quality_alerts,
          weatherAlerts: updatedSettings.weather_alerts,
          achievementNotifications: updatedSettings.achievement_notifications
        }
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: updatedFullSettings
        });

      if (error) throw error;

      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }, [user, settings]);

  // Create notification
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setNotifications(prev => [data, ...prev]);
      if (!data.read) {
        setUnreadCount(prev => prev + 1);
      }

      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchSettings();
      fetchPreferences(); // Fetch preferences on mount
    }
  }, [user, fetchNotifications, fetchSettings, fetchPreferences]);

  return {
    notifications,
    settings,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    createNotification,
    fetchNotifications,
    preferences,
    updatePreferences,
    initializePreferences,
    isLoading,
    notificationsConnected
  };
};
