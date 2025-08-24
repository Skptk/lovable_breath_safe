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
    timeout = 10000, // 10 second timeout
    maxRetries = 3,
    fallbackPollingInterval = 30000 // 30 second polling
  } = config;

  const [state, setState] = useState<GracefulRealtimeState>({
    isRealtimeAvailable: false,
    fallbackPolling: false,
    connectionStatus: 'connecting',
    lastUpdate: null,
    retryCount: 0
  });

  const mountedRef = useRef(true);
  const channelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Try realtime first
  const attemptRealtime = useCallback(async () => {
    if (!enabled || !mountedRef.current) return null;

    try {
      console.log(`🔍 [GracefulRealtime] ${channelName} attempting realtime connection...`);
      
      const channel = supabase.channel(channelName);
      
      // Set up channel subscription with timeout
      const subscribed = await new Promise<boolean>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn(`⚠️ [GracefulRealtime] ${channelName} subscription timeout`);
          resolve(false);
        }, timeout);

        channel.subscribe((status) => {
          clearTimeout(timeoutId);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ [GracefulRealtime] ${channelName} using realtime`);
            setState(prev => ({
              ...prev,
              isRealtimeAvailable: true,
              connectionStatus: 'connected',
              lastUpdate: new Date()
            }));
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`⚠️ [GracefulRealtime] ${channelName} realtime failed: ${status}`);
            resolve(false);
          }
        });
      });

      if (subscribed) {
        channelRef.current = channel;
        
        // Set up data handler
        if (onData) {
          channel.on('postgres_changes', { event: '*', schema: 'public' }, onData);
        }
        
        return channel;
      } else {
        throw new Error('Subscription timeout');
      }
    } catch (error) {
      console.warn(`⚠️ [GracefulRealtime] ${channelName} falling back to polling:`, error);
      setState(prev => ({
        ...prev,
        isRealtimeAvailable: false,
        connectionStatus: 'failed',
        retryCount: prev.retryCount + 1
      }));
      return null;
    }
  }, [channelName, enabled, timeout, onData]);

  // Fallback polling when realtime fails
  const startFallbackPolling = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    console.log(`🔄 [GracefulRealtime] Starting polling fallback for ${channelName}`);
    
    setState(prev => ({
      ...prev,
      fallbackPolling: true,
      connectionStatus: 'fallback'
    }));

    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling
    pollingIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current) return;

      try {
        console.log(`📊 [GracefulRealtime] Polling ${channelName}...`);
        
        // Implement your polling logic here based on channel type
        // This is a placeholder - you'll need to implement specific polling for each channel
        const pollData = await pollChannelData(channelName, userId);
        
        if (pollData && onData) {
          onData(pollData);
        }

        setState(prev => ({
          ...prev,
          lastUpdate: new Date()
        }));
      } catch (error) {
        console.error(`❌ [GracefulRealtime] Polling failed for ${channelName}:`, error);
      }
    }, fallbackPollingInterval);
  }, [channelName, userId, enabled, fallbackPollingInterval, onData]);

  // Placeholder polling function - implement based on channel type
  const pollChannelData = async (channelName: string, userId?: string) => {
    // This is a placeholder - implement specific polling logic for each channel type
    switch (channelName) {
      case 'user-notifications':
        // Poll for new notifications
        return await pollNotifications(userId);
      case 'user-profile-points':
        // Poll for profile/points updates
        return await pollUserProfile(userId);
      case 'user-points-inserts':
        // Poll for new points
        return await pollUserPoints(userId);
      default:
        console.warn(`⚠️ [GracefulRealtime] No polling implementation for channel: ${channelName}`);
        return null;
    }
  };

  // Placeholder polling implementations
  const pollNotifications = async (userId?: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return { type: 'notifications', data };
    } catch (error) {
      console.error('❌ [GracefulRealtime] Failed to poll notifications:', error);
      return null;
    }
  };

  const pollUserProfile = async (userId?: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return { type: 'profile', data };
    } catch (error) {
      console.error('❌ [GracefulRealtime] Failed to poll user profile:', error);
      return null;
    }
  };

  const pollUserPoints = async (userId?: string) => {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return { type: 'points', data };
    } catch (error) {
      console.error('❌ [GracefulRealtime] Failed to poll user points:', error);
      return null;
    }
  };

  // Retry realtime connection
  const retryRealtime = useCallback(async () => {
    if (!enabled || !mountedRef.current || state.retryCount >= maxRetries) {
      console.warn(`⚠️ [GracefulRealtime] ${channelName} max retries reached, staying in fallback mode`);
      return;
    }

    console.log(`🔄 [GracefulRealtime] ${channelName} retrying realtime connection (${state.retryCount + 1}/${maxRetries})`);
    
    // Clear fallback polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      fallbackPolling: false,
      connectionStatus: 'connecting'
    }));

    // Attempt realtime connection
    const channel = await attemptRealtime();
    
    if (!channel) {
      // Realtime failed, start fallback polling
      startFallbackPolling();
    }
  }, [channelName, enabled, state.retryCount, maxRetries, attemptRealtime, startFallbackPolling]);

  // Initialize connection
  useEffect(() => {
    if (!enabled || !mountedRef.current) return;

    const initializeConnection = async () => {
      // Try realtime first
      const channel = await attemptRealtime();
      
      if (!channel) {
        // Realtime failed, start fallback polling
        startFallbackPolling();
      }
    };

    initializeConnection();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      // Clean up channel
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      
      // Clean up polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Clean up retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [enabled, attemptRealtime, startFallbackPolling]);

  // Auto-retry realtime after a delay when in fallback mode
  useEffect(() => {
    if (state.fallbackPolling && state.retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, state.retryCount), 30000); // Exponential backoff
      
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          retryRealtime();
        }
      }, delay);
    }
  }, [state.fallbackPolling, state.retryCount, maxRetries, retryRealtime]);

  return {
    ...state,
    retryRealtime,
    startFallbackPolling,
    isConnected: state.isRealtimeAvailable || state.fallbackPolling,
    canRetry: state.retryCount < maxRetries
  };
}
