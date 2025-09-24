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
import {
  cleanupAllChannels,
  addConnectionStatusListener,
  subscribeToChannel,
  unsubscribeFromChannel
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

type SubscriptionEntry = {
  callbacks: Set<(payload: any) => void>;
  aggregator: (payload: any) => void;
  options: { isPersistent?: boolean };
  isSubscribed: boolean;
};

// Memoize the context value to prevent unnecessary re-renders
function useRealtimeContextValue() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  // Use refs to track state without causing re-renders
  const activeSubscriptionsRef = useRef<Map<string, SubscriptionEntry>>(new Map());
  const statusListenerCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  
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
    activeSubscriptionsRef.current.forEach((entry, channelName) => {
      unsubscribeFromChannel(channelName, entry.aggregator);
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

  // Define the cleanup function outside the useCallback to avoid hooks after early returns
  const subscribe = useCallback((
    channelName: string,
    callback: (payload: any) => void,
    options: { isPersistent?: boolean } = {}
  ) => {
    if (!mountedRef.current || !user?.id) {
      return () => {};
    }

    let entry = activeSubscriptionsRef.current.get(channelName);

    if (!entry) {
      const aggregator = (payload: any) => {
        const currentEntry = activeSubscriptionsRef.current.get(channelName);
        if (!currentEntry) {
          return;
        }

        currentEntry.callbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (error) {
            console.error(`[RealtimeContext] Error in subscription callback for ${channelName}:`, error);
          }
        });
      };

      entry = {
        callbacks: new Set(),
        aggregator,
        options: { ...options },
        isSubscribed: false
      };
      activeSubscriptionsRef.current.set(channelName, entry);
    } else if (options.isPersistent) {
      entry.options.isPersistent = true;
    }

    const wasEmpty = entry.callbacks.size === 0;
    entry.callbacks.add(callback);

    if (!entry.isSubscribed || wasEmpty) {
      subscribeToChannel(channelName, entry.aggregator);
      entry.isSubscribed = true;
    }

    return () => {
      if (!mountedRef.current) {
        return;
      }

      const currentEntry = activeSubscriptionsRef.current.get(channelName);
      if (!currentEntry) {
        return;
      }

      currentEntry.callbacks.delete(callback);

      if (currentEntry.callbacks.size === 0 && !currentEntry.options.isPersistent) {
        unsubscribeFromChannel(channelName, currentEntry.aggregator);
        activeSubscriptionsRef.current.delete(channelName);
      }
    };
  }, [user?.id]);

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
