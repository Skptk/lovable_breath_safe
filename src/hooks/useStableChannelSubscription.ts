import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChannelConfig {
  event?: string;
  schema?: string;
  table?: string;
  filter?: string;
}

interface UseStableChannelSubscriptionOptions {
  channelName: string;
  userId?: string;
  config?: ChannelConfig;
  onData: (payload: any) => void;
  enabled?: boolean;
  maxRetries?: number;
}

/**
 * Stable channel subscription hook that prevents duplicate subscriptions
 * and excessive subscribe/unsubscribe cycles during component re-renders
 */
export function useStableChannelSubscription({
  channelName,
  userId,
  config,
  onData,
  enabled = true,
  maxRetries = 5
}: UseStableChannelSubscriptionOptions) {
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (channelRef.current && isSubscribedRef.current) {
      try {
        console.log(`[StableChannel] Unsubscribing from ${channelName}`);
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        isSubscribedRef.current = false;
        channelRef.current = null;
      } catch (error) {
        console.warn(`[StableChannel] Error during cleanup for ${channelName}:`, error);
      }
    }
  }, [channelName]);

  // Setup channel with exponential backoff retry
  const setupChannel = useCallback(async () => {
    if (!enabled || !userId || isSubscribedRef.current || !mountedRef.current) {
      return;
    }

    try {
      console.log(`[StableChannel] Setting up ${channelName} (attempt ${retryCountRef.current + 1}/${maxRetries})`);
      
      // Create new channel
      const channel = supabase.channel(channelName);
      
      // Configure postgres changes if config provided
      if (config?.event && config?.schema && config?.table) {
        (channel as any).on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter,
          },
          (payload: any) => {
            if (mountedRef.current) {
              onData(payload);
            }
          }
        );
      } else {
        // Generic channel for custom events
        (channel as any).on('*', (event: any, payload: any) => {
          if (mountedRef.current) {
            onData(payload);
          }
        });
      }

      // Subscribe to the channel
      const subscription = channel.subscribe((status, error) => {
        if (!mountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          console.log(`✅ [StableChannel] Successfully subscribed to ${channelName}`);
          isSubscribedRef.current = true;
          retryCountRef.current = 0; // Reset retry count on success
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`❌ [StableChannel] ${channelName} subscription error:`, {
            status,
            error: error?.message || error,
            channelName,
            timestamp: new Date().toISOString(),
            retryCount: retryCountRef.current
          });
          
          // Handle error with retry logic
          handleSubscriptionError(error);
        } else if (status === 'CLOSED') {
          console.log(`🔒 [StableChannel] ${channelName} closed`);
          isSubscribedRef.current = false;
        }
      });

      // Store the subscription
      channelRef.current = subscription;
      
    } catch (error) {
      console.error(`❌ [StableChannel] Failed to setup ${channelName}:`, {
        error: error?.message || error,
        channelName,
        timestamp: new Date().toISOString(),
        retryCount: retryCountRef.current
      });
      
      // Handle setup error with retry logic
      handleSubscriptionError(error);
    }
  }, [channelName, userId, config, onData, enabled, maxRetries]);

  // Handle subscription errors with exponential backoff retry
  const handleSubscriptionError = useCallback((error: any) => {
    if (!mountedRef.current || retryCountRef.current >= maxRetries) {
      console.error(`❌ [StableChannel] ${channelName} failed after ${maxRetries} attempts, giving up`);
      return;
    }

    // Calculate exponential backoff delay
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
    retryCountRef.current++;
    
    console.log(`🔄 [StableChannel] Retrying ${channelName} in ${backoffDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
    
    // Schedule retry
    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !isSubscribedRef.current) {
        setupChannel();
      }
    }, backoffDelay);
  }, [channelName, maxRetries, setupChannel]);

  // Main effect for channel management
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      console.log(`[StableChannel] ${channelName} already subscribed, skipping setup`);
      return;
    }

    // Setup channel
    setupChannel();

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [userId, enabled, setupChannel, cleanup]);

  // Return connection status and manual control functions
  return {
    isConnected: isSubscribedRef.current,
    retryCount: retryCountRef.current,
    reconnect: () => {
      if (mountedRef.current && !isSubscribedRef.current) {
        retryCountRef.current = 0;
        setupChannel();
      }
    },
    disconnect: cleanup
  };
}
