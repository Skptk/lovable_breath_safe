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
      
      setConnectionState(prev => ({
        ...prev,
        status: newStatus,
        lastCheck: now,
        isHealthy,
        // Reset reconnect attempts when connected
        reconnectAttempts: newStatus === 'connected' ? 0 : prev.reconnectAttempts
      }));
      
      if (newStatus === 'connected' && prev.status !== 'connected') {
        console.log('✅ [ConnectionHealth] Connection restored');
      } else if (newStatus === 'disconnected' && prev.status !== 'disconnected') {
        console.log('🔄 [ConnectionHealth] Connection lost - letting Supabase handle reconnection');
      }
      
    } catch (error) {
      console.error('❌ [ConnectionHealth] Health check error:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        lastCheck: new Date(),
        isHealthy: false
      }));
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

  return {
    ...connectionState,
    getConnectionStatus,
    attemptReconnect, // This now just logs and doesn't force reconnection
    cleanup,
    // CRITICAL: Don't expose manual reconnection methods that could cause transport errors
  };
}
