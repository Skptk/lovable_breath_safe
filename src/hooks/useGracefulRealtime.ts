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
 * Hook that provides graceful degradation when realtime fails
 * Falls back to polling when WebSocket connections are unavailable
 */
export function useGracefulRealtime({
  channelName,
  userId,
  config = {},
  onData,
  enabled = true
}: UseGracefulRealtimeOptions) {
  const {
    timeout = 10000,
    maxRetries = 3,
    fallbackPollingInterval = 30000
  } = config;

  const [state, setState] = useState<GracefulRealtimeState>({
    isRealtimeAvailable: false,
    fallbackPolling: false,
    connectionStatus: 'connecting',
    lastUpdate: null,
    retryCount: 0
  });

  const realtimeChannelRef = useRef<any>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyedRef = useRef(false);

  // Check if realtime is available
  const checkRealtimeAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = supabase.realtime.isConnected();
      const isConnecting = supabase.realtime.isConnecting();
      
      return isConnected || isConnecting;
    } catch (error) {
      console.warn('Realtime availability check failed:', error);
      return false;
    }
  }, []);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (isDestroyedRef.current || !onData) return;

    console.log(`🔄 [GracefulRealtime] Starting fallback polling for ${channelName}`);
    
    setState(prevState => ({
      ...prevState,
      fallbackPolling: true,
      connectionStatus: 'fallback'
    }));

    // Set up polling interval
    fallbackIntervalRef.current = setInterval(async () => {
      if (isDestroyedRef.current) return;

      try {
        // Simulate data fetch (replace with actual API call)
        const mockData = {
          channel: channelName,
          timestamp: new Date().toISOString(),
          type: 'fallback_poll'
        };

        onData(mockData);
        setState(prevState => ({
          ...prevState,
          lastUpdate: new Date()
        }));

      } catch (error) {
        console.error('Fallback polling failed:', error);
      }
    }, fallbackPollingInterval);
  }, [channelName, fallbackPollingInterval, onData]);

  // Stop fallback polling
  const stopFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    setState(prevState => ({
      ...prevState,
      fallbackPolling: false
    }));
  }, []);

  // Attempt realtime connection
  const attemptRealtimeConnection = useCallback(async () => {
    if (isDestroyedRef.current || !enabled) return;

    try {
      setState(prevState => ({
        ...prevState,
        connectionStatus: 'connecting'
      }));

      const isAvailable = await checkRealtimeAvailability();
      
      if (isAvailable) {
        // Create realtime channel
        const channel = supabase.channel(channelName);
        
        if (onData) {
          channel.on('*', (event: any, payload: any) => {
            if (!isDestroyedRef.current && onData) {
              onData(payload);
              setState(prevState => ({
                ...prevState,
                lastUpdate: new Date()
              }));
            }
          });
        }

        const subscription = channel.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ [GracefulRealtime] Successfully connected to ${channelName}`);
            setState(prevState => ({
              ...prevState,
              isRealtimeAvailable: true,
              connectionStatus: 'connected',
              retryCount: 0
            }));
            stopFallbackPolling();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`❌ [GracefulRealtime] Channel error for ${channelName}:`, error);
            setState(prevState => ({
              ...prevState,
              isRealtimeAvailable: false,
              connectionStatus: 'failed'
            }));
            startFallbackPolling();
          }
        });

        realtimeChannelRef.current = subscription;

      } else {
        throw new Error('Realtime not available');
      }

    } catch (error) {
      console.warn(`⚠️ [GracefulRealtime] Realtime connection failed for ${channelName}:`, error);
      
      setState(prevState => ({
        ...prevState,
        isRealtimeAvailable: false,
        connectionStatus: 'failed'
      }));

      // Start fallback polling
      startFallbackPolling();
    }
  }, [channelName, enabled, onData, checkRealtimeAvailability, startFallbackPolling, stopFallbackPolling]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(async () => {
    if (isDestroyedRef.current || state.retryCount >= maxRetries) return;

    const delay = Math.min(1000 * Math.pow(2, state.retryCount), 10000);
    
    retryTimeoutRef.current = setTimeout(async () => {
      if (!isDestroyedRef.current) {
        setState(prevState => ({
          ...prevState,
          retryCount: prevState.retryCount + 1
        }));
        
        await attemptRealtimeConnection();
      }
    }, delay);
  }, [state.retryCount, maxRetries, attemptRealtimeConnection]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (isDestroyedRef.current) return;

    console.log(`🧹 [GracefulRealtime] Cleaning up ${channelName}`);
    
    // Cleanup realtime channel
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from realtime channel:', error);
      }
      realtimeChannelRef.current = null;
    }

    // Stop fallback polling
    stopFallbackPolling();

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [channelName, stopFallbackPolling]);

  // Initialize connection
  useEffect(() => {
    if (!enabled) return;

    attemptRealtimeConnection();

    return () => {
      cleanup();
    };
  }, [enabled, attemptRealtimeConnection, cleanup]);

  // Auto-retry on failure
  useEffect(() => {
    if (state.connectionStatus === 'failed' && state.retryCount < maxRetries) {
      retryConnection();
    }
  }, [state.connectionStatus, state.retryCount, maxRetries, retryConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      cleanup();
    };
  }, [cleanup]);

  return {
    isRealtimeAvailable: state.isRealtimeAvailable,
    fallbackPolling: state.fallbackPolling,
    connectionStatus: state.connectionStatus,
    lastUpdate: state.lastUpdate,
    retryCount: state.retryCount,
    cleanup,
    retry: retryConnection
  };
}
