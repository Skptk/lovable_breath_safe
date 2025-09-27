import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useMemorySafeSubscription } from './useMemorySafeSubscription';
import { useOptimizedMessageHandling } from './useOptimizedMessageHandling';

type NotificationRecord = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationPreferencesRecord = Database['public']['Tables']['notification_preferences']['Row'];
type NotificationPreferencesUpdatePayload = Omit<NotificationPreferencesRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type UserSettingsRecord = {
  user_id: string;
  settings: Record<string, any> | null;
};

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

type NotificationPayload = {
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new?: NotificationRecord | null;
  old?: NotificationRecord | null;
  [key: string]: any;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesUpdatePayload = {
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

const mapPreferencesRecord = (record: NotificationPreferencesRecord): NotificationPreferences => ({
  aqi_alerts: record.aqi_alerts,
  aqi_threshold: record.aqi_threshold,
  achievement_notifications: record.achievement_notifications,
  points_notifications: record.points_notifications,
  withdrawal_notifications: record.withdrawal_notifications,
  shop_notifications: record.shop_notifications,
  streak_notifications: record.streak_notifications,
  daily_reminders: record.daily_reminders,
  weekly_summaries: record.weekly_summaries,
  system_announcements: record.system_announcements,
  maintenance_alerts: record.maintenance_alerts,
  email_notifications: record.email_notifications,
  push_notifications: record.push_notifications
});

const getNotificationDedupeKey = (payload: NotificationPayload) => {
  const record = payload?.new ?? payload?.old;
  const id = record?.id;
  if (!id) {
    return undefined;
  }
  const eventType = payload.eventType ?? 'UNKNOWN';
  return `${eventType}:${id}`;
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
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

  const processRealtimePayload = useCallback(
    (payload: NotificationPayload) => {
      if (!payload) {
        return;
      }

      const eventType = payload.eventType ?? 'UNKNOWN';

      if (eventType === 'INSERT') {
        const newNotification = payload.new as NotificationRecord | null;
        if (!newNotification?.id) {
          return;
        }

        setNotifications(prev => {
          let unreadDiff = 0;
          const existingIndex = prev.findIndex(n => n.id === newNotification.id);
          const existing = existingIndex >= 0 ? prev[existingIndex] : null;

          const next =
            existingIndex >= 0
              ? [
                  newNotification,
                  ...prev.slice(0, existingIndex),
                  ...prev.slice(existingIndex + 1)
                ]
              : [newNotification, ...prev];

          if (!newNotification.read && (!existing || existing.read)) {
            unreadDiff += 1;
          }

          if (existing && !existing.read && newNotification.read) {
            unreadDiff -= 1;
          }

          if (unreadDiff !== 0) {
            setUnreadCount(prevUnread => Math.max(0, prevUnread + unreadDiff));
          }

          return next;
        });

        return;
      }

      if (eventType === 'UPDATE') {
        const updatedNotification = payload.new as NotificationRecord | null;
        if (!updatedNotification?.id) {
          return;
        }

        setNotifications(prev => {
          let unreadDiff = 0;
          let found = false;

          const mapped = prev.map(notification => {
            if (notification.id !== updatedNotification.id) {
              return notification;
            }

            found = true;

            if (!notification.read && updatedNotification.read) {
              unreadDiff -= 1;
            } else if (notification.read && !updatedNotification.read) {
              unreadDiff += 1;
            }

            return { ...notification, ...updatedNotification };
          });

          let next = mapped;

          if (!found) {
            next = [updatedNotification, ...prev];
            if (!updatedNotification.read) {
              unreadDiff += 1;
            }
          }

          if (unreadDiff !== 0) {
            setUnreadCount(prevUnread => Math.max(0, prevUnread + unreadDiff));
          }

          return next;
        });

        return;
      }

      if (eventType === 'DELETE') {
        const deletedNotification = payload.old as NotificationRecord | null;
        const deletedId = deletedNotification?.id;

        if (!deletedId) {
          return;
        }

        setNotifications(prev => {
          let unreadDiff = 0;

          const next = prev.filter(notification => {
            if (notification.id !== deletedId) {
              return true;
            }

            if (!notification.read) {
              unreadDiff -= 1;
            }

            return false;
          });

          if (unreadDiff !== 0) {
            setUnreadCount(prevUnread => Math.max(0, prevUnread + unreadDiff));
          }

          return next;
        });

        return;
      }
    },
    [setNotifications, setUnreadCount]
  );

  const handleNotificationQueueOverflow = useCallback((dropped: NotificationPayload) => {
    const id = dropped?.new?.id ?? dropped?.old?.id ?? 'unknown';
    console.warn('[useNotifications] Dropping realtime notification payload', {
      eventType: dropped?.eventType,
      id
    });
  }, []);

  const {
    enqueue: enqueueNotificationPayload,
    flush: flushNotificationQueue,
    cancel: cancelNotificationQueue
  } = useOptimizedMessageHandling<NotificationPayload>(processRealtimePayload, {
    debounceMs: 25,
    maxQueueSize: 128,
    schedule: 'idle',
    dedupeBy: getNotificationDedupeKey,
    debugLabel: 'useNotifications',
    onQueueOverflow: handleNotificationQueueOverflow
  });

  useEffect(() => {
    return () => {
      flushNotificationQueue();
      cancelNotificationQueue();
    };
  }, [flushNotificationQueue, cancelNotificationQueue]);

  // Use stable channel subscription for notifications
  const { isConnected: notificationsConnected } = useMemorySafeSubscription<NotificationPayload>({
    channelName: `user-notifications-${user?.id ?? 'anonymous'}`,
    postgres: {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: user?.id ? `user_id=eq.${user.id}` : undefined
    },
    onMessage: (payload) => enqueueNotificationPayload(payload),
    enabled: Boolean(user?.id),
    debugLabel: 'useNotifications'
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

      const typedNotifications = (data ?? []) as NotificationRecord[];
      setNotifications(typedNotifications);
      setUnreadCount(typedNotifications.filter(n => !n.read).length || 0);
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
        setPreferences(mapPreferencesRecord(data));
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
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          ...DEFAULT_NOTIFICATION_PREFERENCES
        })
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Failed to initialize notification preferences');
      }

      const mappedPreferences = mapPreferencesRecord(data);
      setPreferences(mappedPreferences);
      return mappedPreferences;
    } catch (error) {
      console.error('Error initializing notification preferences:', error);
      throw error;
    }
  }, [user]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    if (!user) return;

    try {
      const updatePayload: NotificationPreferencesUpdatePayload = { ...newPreferences };
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updatePayload)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Notification preferences update returned no data');
      }

      const mappedPreferences = mapPreferencesRecord(data);
      setPreferences(mappedPreferences);
      return mappedPreferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [user]);

  // Fetch notification settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const settingsData: UserSettingsRecord['settings'] = data?.settings ?? null;

      if (settingsData && settingsData['notifications']) {
        // Map from the JSONB structure to our interface
        const notificationSettings = settingsData['notifications'];
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
      const { data: currentData } = await (supabase as any)
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

      const { error } = await (supabase as any)
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
  const createNotification = useCallback(async (
    notification: Omit<NotificationInsert, 'user_id'>
  ) => {
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

      if (!data) {
        return;
      }

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
