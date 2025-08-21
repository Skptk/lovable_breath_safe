import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  subscribeToChannel, 
  unsubscribeFromChannel, 
  cleanupAllChannels,
  getConnectionStatus,
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

  // Set up connection status listener
  useEffect(() => {
    if (statusListenerCleanup.current) {
      statusListenerCleanup.current();
    }

    statusListenerCleanup.current = addConnectionStatusListener((status) => {
      setConnectionStatus(status);
    });

    return () => {
      if (statusListenerCleanup.current) {
        statusListenerCleanup.current();
      }
    };
  }, []);

  // Clean up all channels when user signs out
  useEffect(() => {
    if (!user) {
      console.log('🔄 User signed out, cleaning up realtime channels...');
      cleanupAllChannels();
      activeSubscriptions.current.clear();
    }
  }, [user]);

  // Subscribe to notifications channel
  const subscribeToNotifications = useCallback((callback: (payload: any) => void) => {
    if (!user) {
      console.warn('Cannot subscribe to notifications: no user');
      return () => {};
    }

    const subscriptionId = `notifications_${user.id}_${Date.now()}`;
    
    if (activeSubscriptions.current.has(subscriptionId)) {
      console.warn('Notifications subscription already active, skipping');
      return () => {};
    }

    activeSubscriptions.current.add(subscriptionId);
    console.log('🔔 Subscribing to notifications channel for user:', user.id);
    
    subscribeToChannel(`user-notifications-${user.id}`, callback, {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    });

    // Return cleanup function
    return () => {
      console.log('🔔 Unsubscribing from notifications channel for user:', user.id);
      unsubscribeFromChannel(`user-notifications-${user.id}`, callback);
      activeSubscriptions.current.delete(subscriptionId);
    };
  }, [user]);

  // Subscribe to user points channel
  const subscribeToUserPoints = useCallback((callback: (payload: any) => void) => {
    if (!user) {
      console.warn('Cannot subscribe to user points: no user');
      return () => {};
    }

    const subscriptionId = `points_${user.id}_${Date.now()}`;
    
    if (activeSubscriptions.current.has(subscriptionId)) {
      console.warn('User points subscription already active, skipping');
      return () => {};
    }

    activeSubscriptions.current.add(subscriptionId);
    console.log('💰 Subscribing to user points channel for user:', user.id);
    
    subscribeToChannel(`user-points-${user.id}`, callback, {
      event: 'INSERT',
      schema: 'public',
      table: 'user_points',
      filter: `user_id=eq.${user.id}`
    });

    // Return cleanup function
    return () => {
      console.log('💰 Unsubscribing from user points channel for user:', user.id);
      unsubscribeFromChannel(`user-points-${user.id}`, callback);
      activeSubscriptions.current.delete(subscriptionId);
    };
  }, [user]);

  // Subscribe to user profile points channel
  const subscribeToUserProfilePoints = useCallback((callback: (payload: any) => void) => {
    if (!user) {
      console.warn('Cannot subscribe to user profile points: no user');
      return () => {};
    }

    const subscriptionId = `profile-points_${user.id}_${Date.now()}`;
    
    if (activeSubscriptions.current.has(subscriptionId)) {
      console.warn('User profile points subscription already active, skipping');
      return () => {};
    }

    activeSubscriptions.current.add(subscriptionId);
    console.log('👤 Subscribing to user profile points channel for user:', user.id);
    
    subscribeToChannel(`user-profile-points-${user.id}`, callback, {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `user_id=eq.${user.id}`
    });

    // Return cleanup function
    return () => {
      console.log('👤 Unsubscribing from user profile points channel for user:', user.id);
      unsubscribeFromChannel(`user-profile-points-${user.id}`, callback);
      activeSubscriptions.current.delete(subscriptionId);
    };
  }, [user]);

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
