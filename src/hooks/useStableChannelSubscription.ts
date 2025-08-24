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
 * Manages channel lifecycle and provides stable connection management
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
  const isDestroyedRef = useRef(false);

  // Create and configure channel
  const createChannel = useCallback(() => {
    if (isDestroyedRef.current) return null;

    try {
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
            if (!isDestroyedRef.current && onData) {
              onData(payload);
            }
          }
        );
      } else {
        // Generic channel for custom events
        (channel as any).on('*', (event: any, payload: any) => {
          if (!isDestroyedRef.current && onData) {
            onData(payload);
          }
        });
      }

      return channel;
    } catch (error) {
      console.error(`❌ [StableChannel] Error creating channel ${channelName}:`, error);
      return null;
    }
  }, [channelName, config, onData]);

  // Subscribe to channel
  const subscribe = useCallback(async () => {
    if (isDestroyedRef.current || !enabled || isSubscribedRef.current) return;

    try {
      console.log(`🔌 [StableChannel] Subscribing to ${channelName}`);
      
      const channel = createChannel();
      if (!channel) {
        throw new Error('Failed to create channel');
      }

      const subscription = channel.subscribe((status, error) => {
        if (isDestroyedRef.current) return;

        switch (status) {
          case 'SUBSCRIBED':
            console.log(`✅ [StableChannel] Successfully subscribed to ${channelName}`);
            isSubscribedRef.current = true;
            retryCountRef.current = 0;
            break;
            
          case 'CHANNEL_ERROR':
            console.error(`❌ [StableChannel] Channel error for ${channelName}:`, error);
            isSubscribedRef.current = false;
            handleChannelError(error);
            break;
            
          case 'TIMED_OUT':
            console.warn(`⏰ [StableChannel] Channel timeout for ${channelName}`);
            isSubscribedRef.current = false;
            handleChannelError(new Error('Channel timeout'));
            break;
            
          case 'CLOSED':
            console.log(`🔒 [StableChannel] Channel closed for ${channelName}`);
            isSubscribedRef.current = false;
            break;
        }
      });

      channelRef.current = subscription;

    } catch (error) {
      console.error(`❌ [StableChannel] Subscription failed for ${channelName}:`, error);
      handleChannelError(error);
    }
  }, [channelName, enabled, createChannel]);

  // Handle channel errors with retry logic
  const handleChannelError = useCallback((error: any) => {
    if (isDestroyedRef.current) return;

    if (retryCountRef.current < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      
      console.log(`🔄 [StableChannel] Retrying ${channelName} in ${delay}ms (attempt ${retryCountRef.current + 1}/${maxRetries})`);
      
      retryTimeoutRef.current = setTimeout(() => {
        if (!isDestroyedRef.current) {
          retryCountRef.current++;
          subscribe();
        }
      }, delay);
    } else {
      console.error(`❌ [StableChannel] Max retries reached for ${channelName}`);
    }
  }, [channelName, maxRetries, subscribe]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (isDestroyedRef.current) return;

    console.log(`🧹 [StableChannel] Cleaning up ${channelName}`);
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current && isSubscribedRef.current) {
      try {
        channelRef.current.unsubscribe();
        isSubscribedRef.current = false;
      } catch (error) {
        console.warn(`⚠️ [StableChannel] Error unsubscribing from ${channelName}:`, error);
      }
      channelRef.current = null;
    }
  }, [channelName]);

  // Reconnect function
  const reconnect = useCallback(async () => {
    if (isDestroyedRef.current) return;

    console.log(`🔄 [StableChannel] Manual reconnection for ${channelName}`);
    
    // Reset retry count for manual reconnection
    retryCountRef.current = 0;
    
    // Cleanup existing connection
    cleanup();
    
    // Wait a bit before reconnecting
    setTimeout(() => {
      if (!isDestroyedRef.current) {
        subscribe();
      }
    }, 1000);
  }, [channelName, cleanup, subscribe]);

  // Check if connected
  const isConnected = useCallback(() => {
    return isSubscribedRef.current && channelRef.current;
  }, []);

  // Initialize subscription
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      cleanup();
    };
  }, [enabled, subscribe, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected: isConnected(),
    isConnecting: !isSubscribedRef.current && enabled,
    isSubscribed: isSubscribedRef.current,
    channelName,
    cleanup,
    reconnect
  };
}
