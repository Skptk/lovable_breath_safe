import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

// Environment flag to disable realtime entirely
const REALTIME_ENABLED = import.meta.env.VITE_SUPABASE_REALTIME_ENABLED !== 'false';

// Retry configuration
const RETRY_DELAYS = [1000, 2000, 5000, 10000]; // 1s, 2s, 5s, 10s
const MAX_RETRIES = RETRY_DELAYS.length;

// Session state tracking
let realtimeDisabled = false;
let retryCount = 0;
let connectionAttempts = 0;

// Error logging control
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
 * Create a realtime channel with retry logic and graceful fallback
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
  // If realtime is disabled for this session, return null
  if (realtimeDisabled || !REALTIME_ENABLED) {
    logErrorOnce('realtime-disabled', `Realtime disabled for session. Channel '${channelName}' not created.`);
    return null;
  }

  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: config.event,
          schema: config.schema,
          table: config.table,
          filter: config.filter,
        },
        config.callback
      );

    // Attempt to subscribe with retry logic
    return subscribeWithRetry(channel, channelName);
  } catch (error) {
    logErrorOnce('channel-creation-error', `Failed to create channel '${channelName}'`, error);
    return null;
  }
}

/**
 * Subscribe to a channel with exponential backoff retry
 */
function subscribeWithRetry(
  channel: RealtimeChannel,
  channelName: string
): RealtimeChannel | null {
  connectionAttempts++;
  
  try {
    const subscription = channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Successfully subscribed to '${channelName}'`);
        retryCount = 0; // Reset retry count on success
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        handleSubscriptionError(channel, channelName, error);
      }
    });

    return subscription;
  } catch (error) {
    handleSubscriptionError(channel, channelName, error);
    return null;
  }
}

/**
 * Handle subscription errors with retry logic
 */
function handleSubscriptionError(
  channel: RealtimeChannel,
  channelName: string,
  error?: any
): void {
  // Log specific error types only once
  if (error?.message?.includes('WebSocket is closed before the connection is established')) {
    logErrorOnce('websocket-closed', `WebSocket connection issue for '${channelName}' - retrying...`);
  } else if (error?.message?.includes('Network Error')) {
    logErrorOnce('network-error', `Network error for '${channelName}' - retrying...`);
  } else {
    logErrorOnce(`error-${channelName}`, `Subscription error for '${channelName}'`, error);
  }

  // Attempt retry if we haven't exceeded max retries
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    const delay = RETRY_DELAYS[retryCount - 1];
    
    console.log(`[Realtime] Retrying connection to '${channelName}' in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
    
    setTimeout(() => {
      subscribeWithRetry(channel, channelName);
    }, delay);
  } else {
    // Max retries exceeded, disable realtime for this session
    console.warn(`[Realtime] Max retries exceeded for '${channelName}'. Disabling realtime for this session.`);
    realtimeDisabled = true;
    
    // Clean up the failed channel
    try {
      supabase.removeChannel(channel);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Remove a realtime channel safely
 */
export function removeRealtimeChannel(channel: RealtimeChannel | null): void {
  if (channel) {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      logErrorOnce('channel-removal-error', 'Error removing realtime channel', error);
    }
  }
}

/**
 * Check if realtime is currently enabled
 */
export function isRealtimeEnabled(): boolean {
  return REALTIME_ENABLED && !realtimeDisabled;
}

/**
 * Reset realtime state (useful for testing or re-enabling)
 */
export function resetRealtimeState(): void {
  realtimeDisabled = false;
  retryCount = 0;
  connectionAttempts = 0;
  loggedErrors.clear();
}

/**
 * Get current realtime status for debugging
 */
export function getRealtimeStatus(): {
  enabled: boolean;
  disabled: boolean;
  retryCount: number;
  connectionAttempts: number;
} {
  return {
    enabled: REALTIME_ENABLED,
    disabled: realtimeDisabled,
    retryCount,
    connectionAttempts,
  };
}
