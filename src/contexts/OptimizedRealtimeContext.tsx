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

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected');
  
  // Track active subscriptions
  const subscriptionsRef = useRef<Map<string, Set<Function>>>(new Map());
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
  const subscribe = useCallback((
    channelName: string,
    callback: (payload: any) => void,
    options: { isPersistent?: boolean } = {}
  ) => {
    if (!isMounted.current || !user) {
      return () => {};
    }
    
    const fullChannelName = `${channelName}-${user.id}`;
    
    // Initialize the channel if it doesn't exist
    if (!subscriptionsRef.current.has(fullChannelName)) {
      subscriptionsRef.current.set(fullChannelName, new Set());
    }
    
    const channelSubscriptions = subscriptionsRef.current.get(fullChannelName)!;
    
    // Add the callback to the subscription set
    channelSubscriptions.add(callback);
    
    // Subscribe to the channel if this is the first subscription
    if (channelSubscriptions.size === 1) {
      realtimeManager.subscribe(fullChannelName, (payload: any) => {
        const callbacks = subscriptionsRef.current.get(fullChannelName);
        callbacks?.forEach(cb => cb(payload));
      });
    }
    
    // Return cleanup function
    return () => {
      if (!isMounted.current) return;
      
      const callbacks = subscriptionsRef.current.get(fullChannelName);
      if (callbacks) {
        callbacks.delete(callback);
        
        // If no more callbacks, unsubscribe from the channel
        if (callbacks.size === 0 && !options.isPersistent) {
          realtimeManager.unsubscribe(fullChannelName);
          subscriptionsRef.current.delete(fullChannelName);
        }
      }
    };
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
