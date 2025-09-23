import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  useState, 
  useCallback,
  useMemo
} from 'react';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  cleanupAllChannels,
  addConnectionStatusListener,
  realtimeManager
} from '@/lib/realtimeClient';
import { useThrottle } from '@/hooks/usePerformance';

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

// Throttle time for connection status updates to prevent excessive re-renders
const STATUS_UPDATE_THROTTLE_MS = 1000;

// Memoize the context value to prevent unnecessary re-renders
function useRealtimeContextValue() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  // Use refs to track state without causing re-renders
  const activeSubscriptionsRef = useRef<Map<string, Set<Function>>>(new Map());
  const statusListenerCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const managerRef = useRef(realtimeManager);
  
  // Throttle the connection status updates
  const throttledSetConnectionStatus = useThrottle((status: 'connected' | 'reconnecting' | 'disconnected') => {
    if (mountedRef.current) {
      setConnectionStatus(status);
    }
  }, STATUS_UPDATE_THROTTLE_MS);

  // Cleanup function for the effect
  const cleanup = useCallback(() => {
    if (statusListenerCleanupRef.current) {
      statusListenerCleanupRef.current();
      statusListenerCleanupRef.current = null;
    }
    
    // Clean up all subscriptions when unmounting
    activeSubscriptionsRef.current.forEach((callbacks, channelName) => {
      callbacks.forEach(callback => {
        managerRef.current.unsubscribe(channelName, callback);
      });
    });
    
    activeSubscriptionsRef.current.clear();
  }, []);

  // Set up connection status listener
  useEffect(() => {
    mountedRef.current = true;
    
    // Clean up any existing listeners
    if (statusListenerCleanupRef.current) {
      statusListenerCleanupRef.current();
    }
    
    // Set up new status listener
    statusListenerCleanupRef.current = addConnectionStatusListener((status) => {
      if (mountedRef.current) {
        throttledSetConnectionStatus(status);
      }
    });
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup, throttledSetConnectionStatus]);

  // Subscribe to a channel with automatic cleanup
  const subscribe = useCallback((
    channelName: string, 
    callback: (payload: any) => void,
    options: { isPersistent?: boolean } = {}
  ) => {
    if (!mountedRef.current) return () => {};
    
    const channel = managerRef.current.getChannel(channelName);
    if (!channel) {
      console.warn(`[RealtimeContext] Channel ${channelName} not found`);
      return () => {};
    }
    
    // Track the subscription
    if (!activeSubscriptionsRef.current.has(channelName)) {
      activeSubscriptionsRef.current.set(channelName, new Set());
    }
    
    const callbacks = activeSubscriptionsRef.current.get(channelName)!;
    callbacks.add(callback);
    
    // Subscribe to the channel
    channel.subscribe(callback);
    
    // Return cleanup function
    return () => {
      if (!mountedRef.current) return;
      
      const callbacks = activeSubscriptionsRef.current.get(channelName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          // If no more callbacks, unsubscribe from the channel
          if (!options.isPersistent) {
            channel.unsubscribe(callback);
            activeSubscriptionsRef.current.delete(channelName);
          }
        }
      }
    };
  }, []);

  // Exposed methods
  const contextValue = useMemo(() => ({
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    subscribeToNotifications: (callback: (payload: any) => void) => 
      subscribe(`user-notifications-${user?.id}`, callback, { isPersistent: true }),
    subscribeToUserPoints: (callback: (payload: any) => void) => 
      subscribe(`user-points-${user?.id}`, callback, { isPersistent: true }),
    subscribeToUserProfilePoints: (callback: (payload: any) => void) => 
      subscribe(`user-profile-points-${user?.id}`, callback, { isPersistent: false }),
  }), [connectionStatus, subscribe, user?.id]);
  
  return contextValue;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const contextValue = useRealtimeContextValue();
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up all channels when the provider unmounts
      cleanupAllChannels();
    };
  }, []);
  
  return (
    <RealtimeContext.Provider value={contextValue}>
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
