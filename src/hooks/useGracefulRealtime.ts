import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGracefulRealtimeOptions {
  channelName: string;
  userId?: string;
  config?: {
    timeout?: number;
    maxRetries?: number;
    fallbackPollingInterval?: number;
  };
  onData?: (payload: any) => void;
  enabled?: boolean;
}

interface GracefulRealtimeState {
  isRealtimeAvailable: boolean;
  fallbackPolling: boolean;
  connectionStatus: 'connecting' | 'connected' | 'fallback' | 'failed';
  lastUpdate: Date | null;
  retryCount: number;
}

/**
 * 🚨 NUCLEAR DISABLE - Hook that provides graceful degradation when realtime fails
 * Completely disabled to prevent infinite loops and performance issues
 */
export function useGracefulRealtime({
  channelName,
  userId,
  config = {},
  onData,
  enabled = true
}: UseGracefulRealtimeOptions) {
  // 🚨 NUCLEAR: Return static values - no effects, no state changes, no loops
  console.log('🚨 NUCLEAR: useGracefulRealtime completely disabled - no monitoring, no effects, no loops');
  
  const staticState: GracefulRealtimeState = {
    isRealtimeAvailable: true, // Always available
    fallbackPolling: false, // Never fallback
    connectionStatus: 'connected', // Always connected
    lastUpdate: new Date(), // Current time
    retryCount: 0 // No retries
  };

  // 🚨 NUCLEAR: All functions are no-ops
  const cleanup = useCallback(() => {
    console.log('🚨 NUCLEAR: Graceful realtime cleanup disabled - no-op function');
  }, []);

  const retry = useCallback(() => {
    console.log('🚨 NUCLEAR: Graceful realtime retry disabled - no-op function');
  }, []);

  return {
    ...staticState,
    cleanup,
    retry,
    // 🚨 NUCLEAR: Force connected state
    isConnected: true,
    isConnecting: false,
    isFailed: false,
    isFallback: false
  };
}
