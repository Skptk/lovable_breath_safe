import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { createRealtimeChannel, removeRealtimeChannel } from '@/integrations/supabase/realtime';

export type Notification = Tables<'notifications'>;
export type NotificationPreferences = Tables<'notification_preferences'>;
export type NotificationInsert = TablesInsert<'notifications'>;
export type NotificationUpdate = TablesUpdate<'notifications'>;
export type NotificationPreferencesUpdate = TablesUpdate<'notification_preferences'>;

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updatePreferences: (updates: NotificationPreferencesUpdate) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  initializePreferences: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch notifications ordered by most recent first
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to prevent performance issues

      if (notificationsError) throw notificationsError;

      // Filter out expired notifications
      const validNotifications = (notificationsData || []).filter(notification => 
        !notification.expires_at || new Date(notification.expires_at) > new Date()
      );

      setNotifications(validNotifications);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    }
  }, [user]);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesError) {
        // If no preferences exist, they will be created automatically
        if (preferencesError.code === 'PGRST116') {
          console.log('No notification preferences found for user, will be initialized');
          return;
        }
        throw preferencesError;
      }

      setPreferences(preferencesData);
    } catch (err: any) {
      console.error('Error fetching notification preferences:', err);
      setError(err.message || 'Failed to fetch notification preferences');
    }
  }, [user]);

  const initializePreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('initialize_notification_preferences', {
        p_user_id: user.id
      });

      if (error) throw error;
      
      // Fetch the newly created preferences
      await fetchPreferences();
    } catch (err: any) {
      console.error('Error initializing notification preferences:', err);
      setError(err.message || 'Failed to initialize notification preferences');
    }
  }, [user, fetchPreferences]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.message || 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          read_at: new Date().toISOString() 
        }))
      );
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.message || 'Failed to mark all notifications as read');
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.message || 'Failed to delete notification');
    }
  }, []);

  const updatePreferences = useCallback(async (updates: NotificationPreferencesUpdate) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
    } catch (err: any) {
      console.error('Error updating notification preferences:', err);
      setError(err.message || 'Failed to update notification preferences');
    }
  }, [user]);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchNotifications(), fetchPreferences()]);
    setIsLoading(false);
  }, [fetchNotifications, fetchPreferences]);

  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Initial load
  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setPreferences(null);
      setIsLoading(false);
    }
  }, [user, refreshNotifications]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = createRealtimeChannel('user-notifications', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,
      callback: (payload) => {
        console.log('Notification change received:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as Notification;
          // Only add if not expired
          if (!newNotification.expires_at || new Date(newNotification.expires_at) > new Date()) {
            setNotifications(prev => [newNotification, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedNotification = payload.new as Notification;
          setNotifications(prev => 
            prev.map(notification => 
              notification.id === updatedNotification.id ? updatedNotification : notification
            )
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedNotification = payload.old as Notification;
          setNotifications(prev => 
            prev.filter(notification => notification.id !== deletedNotification.id)
          );
        }
      }
    });

    return () => {
      removeRealtimeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    preferences,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    refreshNotifications,
    initializePreferences,
  };
};
