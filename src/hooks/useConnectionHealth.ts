import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionHealthState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastCheck: Date | null;
  reconnectAttempts: number;
  isHealthy: boolean;
}

export function useConnectionHealth() {
  const [connectionState, setConnectionState] = useState<ConnectionHealthState>({
    status: 'connecting',
    lastCheck: null,
    reconnectAttempts: 0,
    isHealthy: false
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  // CRITICAL FIX: Add ref to track previous state for comparison
  const prevStateRef = useRef<ConnectionHealthState | null>(null);

  // CRITICAL FIX: Stop manual reconnection attempts - let Supabase handle this internally
  const checkConnection = useCallback(() => {
    if (!mountedRef.current) return;
    
    try {
      const now = new Date();
      const isConnected = supabase.realtime.isConnected();
      const isConnecting = supabase.realtime.isConnecting();
      
      let newStatus: ConnectionHealthState['status'];
      let isHealthy = false;
      
      if (isConnected) {
        newStatus = 'connected';
        isHealthy = true;
      } else if (isConnecting) {
        newStatus = 'connecting';
        isHealthy = false;
      } else {
        newStatus = 'disconnected';
        isHealthy = false;
      }
      
      // CRITICAL FIX: Use proper state update pattern with prev parameter
      setConnectionState(prevState => {
        // CRITICAL FIX: Validate prevState parameter
        if (typeof prevState === 'undefined') {
          console.warn('⚠️ [ConnectionHealth] Previous state is undefined, using default');
          prevState = {
            status: 'connecting',
            lastCheck: null,
            reconnectAttempts: 0,
            isHealthy: false
          };
        }
        
        const newState = {
          ...prevState,
          status: newStatus,
          lastCheck: now,
          isHealthy,
          // Reset reconnect attempts when connected
          reconnectAttempts: newStatus === 'connected' ? 0 : prevState.reconnectAttempts
        };
        
        // CRITICAL FIX: Compare with previous state using ref
        const prevStatus = prevStateRef.current?.status;
        if (newStatus === 'connected' && prevStatus !== 'connected') {
          console.log('✅ [ConnectionHealth] Connection restored');
        } else if (newStatus === 'disconnected' && prevStatus !== 'disconnected') {
          console.log('🔄 [ConnectionHealth] Connection lost - letting Supabase handle reconnection');
        }
        
        // Update the ref with new state
        prevStateRef.current = newState;
        
        return newState;
      });
      
    } catch (error) {
      console.error('❌ [ConnectionHealth] Health check error:', error);
      setConnectionState(prevState => {
        // CRITICAL FIX: Validate prevState parameter in error case too
        if (typeof prevState === 'undefined') {
          console.warn('⚠️ [ConnectionHealth] Previous state is undefined in error case, using default');
          prevState = {
            status: 'connecting',
            lastCheck: null,
            reconnectAttempts: 0,
            isHealthy: false
          };
        }
        
        return {
          ...prevState,
          status: 'error',
          lastCheck: new Date(),
          isHealthy: false
        };
      });
    }
  }, []);

  // CRITICAL FIX: Remove manual reconnection logic - let Supabase handle this
  useEffect(() => {
    console.log('🔍 [ConnectionHealth] Starting connection health monitoring (passive mode)');
    
    // Initial check
    checkConnection();
    
    // Check every 10 seconds instead of trying to reconnect
    intervalRef.current = setInterval(checkConnection, 10000);
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkConnection]);

  // CRITICAL FIX: Remove manual reconnection function - let Supabase handle this
  const getConnectionStatus = useCallback(() => {
    try {
      return {
        isConnected: supabase.realtime.isConnected(),
        isConnecting: supabase.realtime.isConnecting(),
        status: supabase.realtime.getConnectionStatus()
      };
    } catch (error) {
      console.error('❌ [ConnectionHealth] Error getting connection status:', error);
      return {
        isConnected: false,
        isConnecting: false,
        status: 'error'
      };
    }
  }, []);

  // CRITICAL FIX: Remove manual reconnection - let Supabase handle this automatically
  const attemptReconnect = useCallback(async () => {
    console.log('⚠️ [ConnectionHealth] Manual reconnection disabled - letting Supabase handle reconnection internally');
    console.log('🔍 [ConnectionHealth] Current connection status:', getConnectionStatus());
    
    // Don't attempt manual reconnection - let Supabase handle this
    // This prevents the transport constructor error
    return false;
  }, [getConnectionStatus]);

  // CRITICAL FIX: Remove manual reconnection from cleanup
  const cleanup = useCallback(async () => {
    console.log('🧹 [ConnectionHealth] Cleaning up connection health monitoring');
    
    // Don't force reconnection - let Supabase handle this
    // This prevents the transport constructor error
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    mountedRef.current = false;
  }, []);

  // CRITICAL FIX: Initialize prevStateRef on mount
  useEffect(() => {
    prevStateRef.current = connectionState;
  }, [connectionState]);

  return {
    ...connectionState,
    getConnectionStatus,
    attemptReconnect, // This now just logs and doesn't force reconnection
    cleanup,
    // CRITICAL: Don't expose manual reconnection methods that could cause transport errors
  };
}
