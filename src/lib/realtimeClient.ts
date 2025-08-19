import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';

// Channel management - ensure only one connection per channel per session
const activeChannels = new Map<string, RealtimeChannel>();

// Connection status tracking
let connectionAttempts = 0;
const loggedErrors = new Set<string>();

/**
 * Log error only once per session to reduce console spam
 */
function logErrorOnce(key: string, message: string, error?: any): void {
  if (!loggedErrors.has(key)) {
    loggedErrors.add(key);
    console.warn(`[Realtime] ${message}`, error || '');
  }
}

/**
 * Subscribe to a realtime channel with safe connection management
 * Ensures only one connection per channel name per session
 */
export function subscribeToChannel(
  channelName: string,
  callback: (payload: any) => void,
  config?: {
    event?: string;
    schema?: string;
    table?: string;
    filter?: string;
  }
): void {
  // If realtime is disabled, don't create channels
  if (!REALTIME_ENABLED) {
    logErrorOnce('realtime-disabled', `Realtime disabled. Channel '${channelName}' not created.`);
    return;
  }

  // If channel already exists, don't create duplicate
  if (activeChannels.has(channelName)) {
    console.log(`[Realtime] Channel '${channelName}' already exists, skipping duplicate subscription`);
    return;
  }

  try {
    connectionAttempts++;
    
    // Create the channel
    const channel = supabase.channel(channelName);
    
    // Configure postgres changes if config provided
    if (config?.event && config?.schema && config?.table) {
      channel.on(
        'postgres_changes',
        {
          event: config.event,
          schema: config.schema,
          table: config.table,
          filter: config.filter,
        },
        (payload) => {
          console.log(`[Realtime] ${channelName} payload:`, payload);
          callback(payload);
        }
      );
    } else {
      // Generic channel for custom events
      channel.on('*', (event, payload) => {
        console.log(`[Realtime] ${channelName} event:`, event, payload);
        callback(payload);
      });
    }

    // Subscribe to the channel
    const subscription = channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Successfully subscribed to '${channelName}'`);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[Realtime] Channel '${channelName}' error:`, status, error);
        // Remove failed channel from active channels
        activeChannels.delete(channelName);
      }
    });

    // Store the channel for management
    activeChannels.set(channelName, subscription);
    
    console.log(`[Realtime] Channel '${channelName}' created and subscribed`);
    
  } catch (error) {
    logErrorOnce(`channel-creation-${channelName}`, `Failed to create channel '${channelName}'`, error);
  }
}

/**
 * Unsubscribe from a specific channel
 */
export function unsubscribeFromChannel(channelName: string): void {
  const channel = activeChannels.get(channelName);
  
  if (channel) {
    try {
      console.log(`[Realtime] Unsubscribing from channel '${channelName}'`);
      supabase.removeChannel(channel);
      activeChannels.delete(channelName);
      console.log(`[Realtime] Successfully unsubscribed from '${channelName}'`);
    } catch (error) {
      logErrorOnce(`channel-removal-${channelName}`, `Error removing channel '${channelName}'`, error);
    }
  } else {
    console.log(`[Realtime] Channel '${channelName}' not found for unsubscription`);
  }
}

/**
 * Clean up all active channels (useful for logout)
 */
export function cleanupAllChannels(): void {
  console.log(`[Realtime] Cleaning up ${activeChannels.size} active channels`);
  
  for (const [channelName, channel] of activeChannels.entries()) {
    try {
      supabase.removeChannel(channel);
      console.log(`[Realtime] Removed channel '${channelName}'`);
    } catch (error) {
      logErrorOnce(`cleanup-${channelName}`, `Error cleaning up channel '${channelName}'`, error);
    }
  }
  
  activeChannels.clear();
  console.log('[Realtime] All channels cleaned up');
}

/**
 * Get current channel status for debugging
 */
export function getChannelStatus(): {
  enabled: boolean;
  activeChannels: string[];
  totalChannels: number;
  connectionAttempts: number;
} {
  return {
    enabled: REALTIME_ENABLED,
    activeChannels: Array.from(activeChannels.keys()),
    totalChannels: activeChannels.size,
    connectionAttempts,
  };
}

/**
 * Check if a specific channel is active
 */
export function isChannelActive(channelName: string): boolean {
  return activeChannels.has(channelName);
}

/**
 * Reset connection state (useful for testing)
 */
export function resetConnectionState(): void {
  connectionAttempts = 0;
  loggedErrors.clear();
  console.log('[Realtime] Connection state reset');
}
