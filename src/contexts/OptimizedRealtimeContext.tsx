import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';
import { realtimeManager, cleanupAllChannels } from '@/lib/realtimeClient';

interface RealtimeContextType {
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  isConnected: boolean;
  subscribeToNotifications: (callback: (payload: any) => void) => () => void;
  subscribeToUserPoints: (callback: (payload: any) => void) => () => void;
  subscribeToUserProfilePoints: (callback: (payload: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: React.ReactNode;
}

type SubscriptionEntry = {
  callbacks: Set<(payload: any) => void>;
  listener: (payload: any) => void;
  options: { isPersistent?: boolean };
  isSubscribed: boolean;
};

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');
  
  // Track active subscriptions
  const subscriptionsRef = useRef<Map<string, SubscriptionEntry>>(new Map());
  const isMounted = useRef(true);
  
  // Set up connection status listener
  useEffect(() => {
    isMounted.current = true;
    
    const handleStatusChange = (status: 'connected' | 'reconnecting' | 'disconnected') => {
      if (isMounted.current) {
        setConnectionStatus(status);
      }
    };
    
    // Subscribe to connection status changes
    const unsubscribe = realtimeManager.onConnectionStatus(handleStatusChange);
    
    return () => {
      isMounted.current = false;
      unsubscribe();
      cleanupAllChannels();
      subscriptionsRef.current.clear();
    };
  }, []);
  
  // Subscribe to a channel with automatic cleanup
  const subscribe = useCallback(
    (
      channelName: string,
      callback: (payload: any) => void,
      options: { isPersistent?: boolean } = {}
    ) => {
      if (!isMounted.current || !user?.id) {
        return () => {};
      }

      const fullChannelName = `${channelName}-${user.id}`;
      const subscriptions = subscriptionsRef.current;

      let entry = subscriptions.get(fullChannelName);

      if (!entry) {
        const callbacks = new Set<(payload: any) => void>();
        const listener = (payload: any) => {
          const currentEntry = subscriptions.get(fullChannelName);
          if (!currentEntry || currentEntry.callbacks.size === 0) {
            return;
          }

          currentEntry.callbacks.forEach((cb) => {
            try {
              cb(payload);
            } catch (error) {
              console.error(
                '[OptimizedRealtimeContext] Subscription callback error',
                error
              );
            }
          });
        };

        entry = {
          callbacks,
          listener,
          options: { ...options },
          isSubscribed: false
        };

        subscriptions.set(fullChannelName, entry);
      } else if (options.isPersistent) {
        entry.options.isPersistent = true;
      }

      entry.callbacks.add(callback);

      if (!entry.isSubscribed) {
        realtimeManager.subscribe(fullChannelName, entry.listener);
        entry.isSubscribed = true;
      }

      return () => {
        if (!isMounted.current) {
          return;
        }

        const currentEntry = subscriptions.get(fullChannelName);
        if (!currentEntry) {
          return;
        }

        currentEntry.callbacks.delete(callback);

        if (currentEntry.callbacks.size === 0) {
          if (!currentEntry.options.isPersistent) {
            if (currentEntry.isSubscribed) {
              realtimeManager.unsubscribe(fullChannelName, currentEntry.listener);
              currentEntry.isSubscribed = false;
            }
            subscriptions.delete(fullChannelName);
          } else {
            // For persistent channels keep the subscription active but avoid duplicate subscribes
            currentEntry.isSubscribed = true;
          }
        }
      };
    },
    [user?.id]
  );

  useEffect(() => {
    if (user?.id) {
      return;
    }

    const subscriptions = subscriptionsRef.current;
    subscriptions.forEach((entry, channelName) => {
      if (entry.isSubscribed) {
        realtimeManager.unsubscribe(channelName, entry.listener);
      }
    });
    subscriptions.clear();
    cleanupAllChannels();
    setConnectionStatus('disconnected');
  }, [user?.id]);
  
  // Context value with memoized callbacks
  const contextValue = useMemo(() => ({
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    subscribeToNotifications: (callback: (payload: any) => void) => 
      subscribe('user-notifications', callback, { isPersistent: true }),
    subscribeToUserPoints: (callback: (payload: any) => void) =>
      subscribe('user-points', callback, { isPersistent: true }),
    subscribeToUserProfilePoints: (callback: (payload: any) => void) =>
      subscribe('user-profile-points', callback, { isPersistent: false }),
  }), [connectionStatus, subscribe]);
  
  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
