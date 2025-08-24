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
  const subscriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubscribingRef = useRef(false);
  
  // Store stable references to prevent dependency loop
  const configRef = useRef(config);
  const onDataRef = useRef(onData);
  const enabledRef = useRef(enabled);
  
  // Update refs when props change
  configRef.current = config;
  onDataRef.current = onData;
  enabledRef.current = enabled;

  // Create and configure channel - stable function
  const createChannel = useCallback(() => {
    if (isDestroyedRef.current) return null;

    try {
      const channel = supabase.channel(channelName);
      
      // Configure postgres changes if config provided
      if (configRef.current?.event && configRef.current?.schema && configRef.current?.table) {
        (channel as any).on(
          'postgres_changes',
          {
            event: configRef.current.event,
            schema: configRef.current.schema,
            table: configRef.current.table,
            filter: configRef.current.filter,
          },
          (payload: any) => {
            if (!isDestroyedRef.current && onDataRef.current) {
              onDataRef.current(payload);
            }
          }
        );
      } else {
        // Generic channel for custom events
        (channel as any).on('*', (event: any, payload: any) => {
          if (!isDestroyedRef.current && onDataRef.current) {
            onDataRef.current(payload);
          }
        });
      }

      return channel;
    } catch (error) {
      console.error(`❌ [StableChannel] Error creating channel ${channelName}:`, error);
      return null;
    }
  }, [channelName]); // Only depend on channelName

  // Subscribe to channel - stable function with debouncing
  const subscribe = useCallback(async () => {
    if (isDestroyedRef.current || !enabledRef.current || isSubscribedRef.current || isSubscribingRef.current) {
      console.log(`🔌 [StableChannel] Subscription skipped for ${channelName}:`, {
        isDestroyed: isDestroyedRef.current,
        enabled: enabledRef.current,
        isSubscribed: isSubscribedRef.current,
        isSubscribing: isSubscribingRef.current
      });
      return;
    }

    try {
      console.log(`🔌 [StableChannel] Subscribing to ${channelName}`);
      isSubscribingRef.current = true;
      
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
            isSubscribingRef.current = false;
            retryCountRef.current = 0;
            break;
            
          case 'CHANNEL_ERROR':
            console.error(`❌ [StableChannel] Channel error for ${channelName}:`, error);
            isSubscribedRef.current = false;
            isSubscribingRef.current = false;
            handleChannelError(error);
            break;
            
          case 'TIMED_OUT':
            console.warn(`⏰ [StableChannel] Channel timeout for ${channelName}`);
            isSubscribedRef.current = false;
            isSubscribingRef.current = false;
            handleChannelError(new Error('Channel timeout'));
            break;
            
          case 'CLOSED':
            console.log(`🔒 [StableChannel] Channel closed for ${channelName}`);
            isSubscribedRef.current = false;
            isSubscribingRef.current = false;
            break;
        }
      });

      channelRef.current = subscription;

    } catch (error) {
      console.error(`❌ [StableChannel] Subscription failed for ${channelName}:`, error);
      isSubscribingRef.current = false;
      handleChannelError(error);
    }
  }, [channelName, createChannel]); // Stable dependencies

  // Handle channel errors with retry logic - stable function
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
  }, [channelName, maxRetries, subscribe]); // Stable dependencies

  // Cleanup function - stable function
  const cleanup = useCallback(() => {
    if (isDestroyedRef.current) return;

    console.log(`🧹 [StableChannel] Cleaning up ${channelName}`);
    
    // Clear all timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (subscriptionTimeoutRef.current) {
      clearTimeout(subscriptionTimeoutRef.current);
      subscriptionTimeoutRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current && isSubscribedRef.current) {
      try {
        channelRef.current.unsubscribe();
        isSubscribedRef.current = false;
        isSubscribingRef.current = false;
      } catch (error) {
        console.warn(`⚠️ [StableChannel] Error unsubscribing from ${channelName}:`, error);
      }
      channelRef.current = null;
    }
  }, [channelName]); // Only depend on channelName

  // Reconnect function - stable function
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
  }, [channelName, cleanup, subscribe]); // Stable dependencies

  // Check if connected - stable function
  const isConnected = useCallback(() => {
    return isSubscribedRef.current && channelRef.current;
  }, []); // No dependencies

  // Initialize subscription - stable effect with debouncing
  useEffect(() => {
    if (enabledRef.current) {
      // Add debouncing to prevent rapid subscription attempts
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }
      
      subscriptionTimeoutRef.current = setTimeout(() => {
        if (!isDestroyedRef.current && enabledRef.current) {
          subscribe();
        }
      }, 100); // 100ms debounce
    }

    return () => {
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }
      cleanup();
    };
  }, [channelName, enabled]); // Only depend on channelName and enabled, not the functions

  // Cleanup on unmount - stable effect
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      cleanup();
    };
  }, [cleanup]); // Stable cleanup function

  return {
    isConnected: isConnected(),
    isConnecting: !isSubscribedRef.current && enabledRef.current,
    isSubscribed: isSubscribedRef.current,
    channelName,
    cleanup,
    reconnect
  };
}
