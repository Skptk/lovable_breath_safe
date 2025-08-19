import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  subscribeToChannel, 
  unsubscribeFromChannel, 
  cleanupAllChannels,
  getChannelStatus,
  isChannelActive,
  resetConnectionState,
  getConnectionStatus
} from '@/lib/realtimeClient';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';

/**
 * Create a realtime channel with retry logic and graceful fallback
 * @deprecated Use subscribeToChannel from @/lib/realtimeClient instead
 */
export function createRealtimeChannel(
  channelName: string,
  config: {
    event: string;
    schema: string;
    table: string;
    filter?: string;
    callback: (payload: any) => void;
  }
): RealtimeChannel | null {
  // If realtime is disabled, return null
  if (!REALTIME_ENABLED) {
    console.warn(`[Realtime] Realtime disabled. Channel '${channelName}' not created.`);
    return null;
  }

  // Use the new singleton connection manager
  subscribeToChannel(channelName, config.callback, {
    event: config.event,
    schema: config.schema,
    table: config.table,
    filter: config.filter,
  });

  // Return a mock channel object for backward compatibility
  // The actual channel management is handled by the singleton
  return {
    // Mock implementation - actual functionality is handled by the singleton
    on: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
    subscribe: () => ({} as RealtimeChannel),
    unsubscribe: () => Promise.resolve(),
    send: () => Promise.resolve({ data: null, error: null }),
    onError: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
  } as RealtimeChannel;
}

/**
 * Remove a realtime channel safely
 * @deprecated Use unsubscribeFromChannel from @/lib/realtimeClient instead
 */
export function removeRealtimeChannel(channel: RealtimeChannel | null): void {
  // This function is deprecated - channels are managed by the singleton
  // No action needed as the singleton handles cleanup
  console.warn('[Realtime] removeRealtimeChannel is deprecated. Use unsubscribeFromChannel instead.');
}

/**
 * Check if realtime is currently enabled
 * @deprecated Use getConnectionStatus from @/lib/realtimeClient instead
 */
export function isRealtimeEnabled(): boolean {
  const status = getConnectionStatus();
  return REALTIME_ENABLED && status !== 'disconnected';
}

/**
 * Reset realtime state (useful for testing or re-enabling)
 * @deprecated Use resetConnectionState from @/lib/realtimeClient instead
 */
export function resetRealtimeState(): void {
  resetConnectionState();
}

/**
 * Get current realtime status for debugging
 * @deprecated Use getChannelStatus from @/lib/realtimeClient instead
 */
export function getRealtimeStatus(): {
  enabled: boolean;
  disabled: boolean;
  retryCount: number;
  connectionAttempts: number;
} {
  const channelStatus = getChannelStatus();
  const connectionStatus = getConnectionStatus();
  
  return {
    enabled: REALTIME_ENABLED,
    disabled: connectionStatus === 'disconnected',
    retryCount: channelStatus.reconnectAttempts,
    connectionAttempts: channelStatus.totalChannels,
  };
}

// Export the new functions for easy migration
export {
  subscribeToChannel,
  unsubscribeFromChannel,
  cleanupAllChannels,
  getChannelStatus,
  isChannelActive,
  resetConnectionState,
  getConnectionStatus
};
