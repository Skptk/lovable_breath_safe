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

const hasWindow = typeof window !== 'undefined';
const globalScope: typeof globalThis | undefined =
  typeof globalThis !== 'undefined' ? globalThis : undefined;

const isTestEnvironment = Boolean(
  (typeof process !== 'undefined' && (process.env?.['VITEST'] || process.env?.['NODE_ENV'] === 'test')) ||
    (typeof import.meta !== 'undefined' &&
      (((import.meta as any)?.env?.VITEST) || ((import.meta as any)?.env?.MODE === 'test'))) ||
    (globalScope && ((globalScope as any).__vitest_worker__ || (globalScope as any).__vitest__ || (globalScope as any).vitest))
);

const realtimePermitted = hasWindow && !isTestEnvironment;
const BATCH_DISPATCH_FALLBACK_MS = 16;

interface RealtimeContextType {
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
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
  cancelScheduledFlush: () => void;
  options: { isPersistent?: boolean };
  isSubscribed: boolean;
};

// Memoize the context value to prevent unnecessary re-renders
function useRealtimeContextValue() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('disconnected');
  
  // Use refs to track state without causing re-renders
  const activeSubscriptionsRef = useRef<Map<string, SubscriptionEntry>>(new Map());
  const statusListenerCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  
  // Throttle the connection status updates
  const throttledSetConnectionStatus = useThrottle((status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected') => {
    if (mountedRef.current) {
      setConnectionStatus(status);
    }
  }, STATUS_UPDATE_THROTTLE_MS);

  const createAggregatedDispatcher = useCallback(
    (channelName: string): { handler: (payload: any) => void; cancel: () => void } => {
      let rafId: number | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let hasPendingPayload = false;
      let pendingPayload: any;

      const clearScheduledFlush = () => {
        if (rafId !== null && hasWindow && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafId);
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        rafId = null;
        timeoutId = null;
      };

      const flush = () => {
        rafId = null;
        timeoutId = null;

        if (!hasPendingPayload) {
          return;
        }

        const entry = activeSubscriptionsRef.current.get(channelName);
        if (!entry || entry.callbacks.size === 0) {
          hasPendingPayload = false;
          pendingPayload = undefined;
          return;
        }

        const payloadToProcess = pendingPayload;
        hasPendingPayload = false;
        pendingPayload = undefined;

        for (const callback of Array.from(entry.callbacks)) {
          try {
            callback(payloadToProcess);
          } catch (error) {
            console.error(`[RealtimeContext] Error in subscription callback for ${channelName}:`, error);
          }
        }
      };

      const scheduleFlush = () => {
        if (rafId !== null || timeoutId !== null) {
          return;
        }

        if (hasWindow && typeof requestAnimationFrame === 'function') {
          rafId = requestAnimationFrame(flush);
        } else {
          timeoutId = setTimeout(flush, BATCH_DISPATCH_FALLBACK_MS);
        }
      };

      const handler = (payload: any) => {
        pendingPayload = payload;
        hasPendingPayload = true;
        scheduleFlush();
      };

      const cancel = () => {
        clearScheduledFlush();
        hasPendingPayload = false;
        pendingPayload = undefined;
      };

      return { handler, cancel };
    },
    []
  );

  // Cleanup function for the effect
  const cleanup = useCallback(() => {
    if (statusListenerCleanupRef.current) {
      statusListenerCleanupRef.current();
      statusListenerCleanupRef.current = null;
    }
    
    // Clean up all subscriptions when unmounting
    activeSubscriptionsRef.current.forEach((entry, channelName) => {
      entry.cancelScheduledFlush();
      unsubscribeFromChannel(channelName, entry.aggregator);
      entry.isSubscribed = false;
    });
    
    activeSubscriptionsRef.current.clear();
  }, []);

  // Set up connection status listener
  useEffect(() => {
    mountedRef.current = true;
    if (!realtimePermitted) {
      return () => {
        mountedRef.current = false;
      };
    }
    
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

  useEffect(() => {
    if (!realtimePermitted) {
      return;
    }

    if (!user?.id) {
      activeSubscriptionsRef.current.forEach((entry, channelName) => {
        if (entry.isSubscribed) {
          unsubscribeFromChannel(channelName, entry.aggregator);
          entry.isSubscribed = false;
        }
        entry.cancelScheduledFlush();
      });
      cleanupAllChannels();
      return;
    }

    activeSubscriptionsRef.current.forEach((entry, channelName) => {
      if (!entry.isSubscribed && entry.callbacks.size > 0) {
        subscribeToChannel(channelName, entry.aggregator);
        entry.isSubscribed = true;
      }
    });
  }, [user?.id]);

  // Define the cleanup function outside the useCallback to avoid hooks after early returns
  const subscribe = useCallback((
    channelName: string,
    callback: (payload: any) => void,
    options: { isPersistent?: boolean } = {}
  ) => {
    if (!mountedRef.current || !user?.id || !realtimePermitted) {
      return () => {};
    }

    let entry = activeSubscriptionsRef.current.get(channelName);

    if (!entry) {
      const { handler, cancel } = createAggregatedDispatcher(channelName);

      entry = {
        callbacks: new Set(),
        aggregator: handler,
        cancelScheduledFlush: cancel,
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
        currentEntry.cancelScheduledFlush();
        activeSubscriptionsRef.current.delete(channelName);
      }
    };
  }, [createAggregatedDispatcher, user?.id]);

  // Exposed methods
  const contextValue = useMemo(() => ({
    connectionStatus,
    isConnected: realtimePermitted && connectionStatus === 'connected',
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
