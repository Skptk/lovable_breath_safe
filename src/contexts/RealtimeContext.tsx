import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  subscribeToChannel,
  unsubscribeFromChannel,
  cleanupAllChannels,
  addConnectionStatusListener
} from '@/lib/realtimeClient';

interface RealtimeContextType {
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  subscribeToNotifications: (callback: (payload: any) => void) => () => void;
  subscribeToUserPoints: (callback: (payload: any) => void) => () => void;
  subscribeToUserProfilePoints: (callback: (payload: any) => void) => () => void;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  // Track active subscriptions to prevent duplicates
  const activeSubscriptions = useRef<Set<string>>(new Set());
  const statusListenerCleanup = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  
  // Persistent channel management - keep core channels alive during navigation
  const persistentChannels = useRef<Set<string>>(new Set());
  const channelCleanupQueue = useRef<Set<string>>(new Set());

  // Core channels that should persist across navigation
  const CORE_CHANNELS = [
    'user-notifications',
    'user-points-inserts'
  ];

  // Page-specific channels that can be dynamic
  const PAGE_SPECIFIC_CHANNELS = [
    'user-profile-points'
  ];

  // Initialize persistent channels when user logs in
  useEffect(() => {
    if (user && mountedRef.current) {
      console.log('🔄 [RealtimeContext] User logged in, initializing persistent channels');
      
      // Initialize core persistent channels
      CORE_CHANNELS.forEach(channelType => {
        const channelName = `${channelType}-${user.id}`;
        persistentChannels.current.add(channelName);
        console.log(`🔗 [RealtimeContext] Added persistent channel: ${channelName}`);
      });
    }
  }, [user]);

  // Set up connection status listener
  useEffect(() => {
    if (!mountedRef.current) return;

    if (statusListenerCleanup.current) {
      statusListenerCleanup.current();
    }

    statusListenerCleanup.current = addConnectionStatusListener((status) => {
      if (mountedRef.current) {
        setConnectionStatus(status);
      }
    });

    return () => {
      if (statusListenerCleanup.current) {
        statusListenerCleanup.current();
        statusListenerCleanup.current = null;
      }
    };
  }, []);

  // Clean up all channels when user signs out
  useEffect(() => {
    if (!mountedRef.current) return;

    if (!user) {
      console.log('🔄 User signed out, cleaning up all realtime channels...');
      cleanupAllChannels();
      activeSubscriptions.current.clear();
      persistentChannels.current.clear();
      channelCleanupQueue.current.clear();
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (statusListenerCleanup.current) {
        statusListenerCleanup.current();
      }
      cleanupAllChannels();
    };
  }, []);

  // Subscribe to notifications channel (persistent)
  const subscribeToNotifications = useCallback((callback: (payload: any) => void) => {
    if (!user || !mountedRef.current) {
      console.warn('Cannot subscribe to notifications: no user or component unmounted');
      return () => {};
    }

    const subscriptionId = `notifications_${user.id}_${Date.now()}`;
    const channelName = `user-notifications-${user.id}`;
    
    // Check if this is a persistent channel
    const isPersistent = persistentChannels.current.has(channelName);
    
    if (activeSubscriptions.current.has(subscriptionId)) {
      console.warn('Notifications subscription already active, skipping');
      return () => {};
    }

    activeSubscriptions.current.add(subscriptionId);
    console.log(`🔔 [RealtimeContext] Subscribing to ${isPersistent ? 'persistent' : 'dynamic'} notifications channel for user:`, user.id);
    
    subscribeToChannel(channelName, callback, {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications', // Correct table name
      filter: `user_id=eq.${user.id}` // Correct column name
    });

    // Return cleanup function
    return () => {
      if (mountedRef.current) {
        console.log(`🔔 [RealtimeContext] Unsubscribing from notifications channel for user:`, user.id);
        unsubscribeFromChannel(channelName, callback);
        activeSubscriptions.current.delete(subscriptionId);
        
        // Only cleanup if this is not a persistent channel
        if (!isPersistent) {
          channelCleanupQueue.current.add(channelName);
        }
      }
    };
  }, [user]);

  // Subscribe to user points channel (persistent)
  const subscribeToUserPoints = useCallback((callback: (payload: any) => void) => {
    if (!user || !mountedRef.current) {
      console.warn('Cannot subscribe to user points: no user or component unmounted');
      return () => {};
    }

    const subscriptionId = `points_${user.id}_${Date.now()}`;
    const channelName = `user-points-${user.id}`;
    
    // Check if this is a persistent channel
    const isPersistent = persistentChannels.current.has(channelName);
    
    if (activeSubscriptions.current.has(subscriptionId)) {
      console.warn('User points subscription already active, skipping');
      return () => {};
    }

    activeSubscriptions.current.add(subscriptionId);
    console.log(`💰 [RealtimeContext] Subscribing to ${isPersistent ? 'persistent' : 'dynamic'} user points channel for user:`, user.id);
    
    subscribeToChannel(channelName, callback, {
      event: 'INSERT',
      schema: 'public',
      table: 'user_points', // Correct table name
      filter: `user_id=eq.${user.id}` // Correct column name
    });

    // Return cleanup function
    return () => {
      if (mountedRef.current) {
        console.log(`💰 [RealtimeContext] Unsubscribing from user points channel for user:`, user.id);
        unsubscribeFromChannel(channelName, callback);
        activeSubscriptions.current.delete(subscriptionId);
        
        // Only cleanup if this is not a persistent channel
        if (!isPersistent) {
          channelCleanupQueue.current.add(channelName);
        }
      }
    };
  }, [user]);

  // Subscribe to user profile points channel (page-specific, can be dynamic)
  const subscribeToUserProfilePoints = useCallback((callback: (payload: any) => void) => {
    if (!user || !mountedRef.current) {
      console.warn('Cannot subscribe to user profile points: no user or component unmounted');
      return () => {};
    }

    const subscriptionId = `profile-points_${user.id}_${Date.now()}`;
    const channelName = `user-profile-points-${user.id}`;
    
    // This is a page-specific channel, not persistent
    const isPersistent = false;
    
    if (activeSubscriptions.current.has(subscriptionId)) {
      console.warn('User profile points subscription already active, skipping');
      return () => {};
    }

    activeSubscriptions.current.add(subscriptionId);
    console.log(`👤 [RealtimeContext] Subscribing to ${isPersistent ? 'persistent' : 'dynamic'} user profile points channel for user:`, user.id);
    
    subscribeToChannel(channelName, callback, {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles', // Correct table name
      filter: `user_id=eq.${user.id}` // Correct column name
    });

    // Return cleanup function
    return () => {
      if (mountedRef.current) {
        console.log(`👤 [RealtimeContext] Unsubscribing from user profile points channel for user:`, user.id);
        unsubscribeFromChannel(channelName, callback);
        activeSubscriptions.current.delete(subscriptionId);
        
        // Always cleanup page-specific channels
        channelCleanupQueue.current.add(channelName);
      }
    };
  }, [user]);

  // Batch process channel cleanup queue to reduce churn
  useEffect(() => {
    if (channelCleanupQueue.current.size === 0) return;

    const cleanupTimeout = setTimeout(() => {
      if (mountedRef.current && channelCleanupQueue.current.size > 0) {
        console.log(`🧹 [RealtimeContext] Processing channel cleanup queue (${channelCleanupQueue.current.size} channels)`);
        
        // Process cleanup queue in batches
        const channelsToCleanup = Array.from(channelCleanupQueue.current);
        channelCleanupQueue.current.clear();
        
        channelsToCleanup.forEach(channelName => {
          // Only cleanup if no active subscriptions remain
          const hasActiveSubscriptions = Array.from(activeSubscriptions.current).some(id => 
            id.includes(channelName.split('-')[0]) // Check if any subscription is for this channel type
          );
          
          if (!hasActiveSubscriptions) {
            console.log(`🧹 [RealtimeContext] Cleaning up unused channel: ${channelName}`);
            // Note: Actual cleanup is handled by the channel manager
          } else {
            console.log(`⏸️ [RealtimeContext] Keeping channel alive due to active subscriptions: ${channelName}`);
          }
        });
      }
    }, 1000); // 1 second delay to batch cleanup operations

    return () => clearTimeout(cleanupTimeout);
  }, [activeSubscriptions.current.size]);

  const value: RealtimeContextType = {
    connectionStatus,
    subscribeToNotifications,
    subscribeToUserPoints,
    subscribeToUserProfilePoints,
    isConnected: connectionStatus === 'connected'
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
