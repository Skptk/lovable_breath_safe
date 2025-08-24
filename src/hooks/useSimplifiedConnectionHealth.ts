import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

// Connection states to track
export const connectionStates = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected', 
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
} as const;

export type ConnectionState = typeof connectionStates[keyof typeof connectionStates];

// State structure to maintain
export interface ConnectionHealthState {
  status: ConnectionState;
  isHealthy: boolean;
  lastCheck: string | null;
  reconnectAttempts: number;
}

export function useSimplifiedConnectionHealth() {
  const [state, setState] = useState<ConnectionHealthState>({
    status: connectionStates.CONNECTING,
    isHealthy: false,
    lastCheck: null,
    reconnectAttempts: 0
  });

  // Check connection status
  const checkConnection = useCallback(() => {
    try {
      const now = new Date().toISOString();
      const isConnected = supabase.realtime.isConnected();
      const isConnecting = supabase.realtime.isConnecting();

      let newStatus: ConnectionState;
      let isHealthy = false;

      if (isConnected) {
        newStatus = connectionStates.CONNECTED;
        isHealthy = true;
      } else if (isConnecting) {
        newStatus = connectionStates.CONNECTING;
        isHealthy = false;
      } else {
        newStatus = connectionStates.DISCONNECTED;
        isHealthy = false;
      }

      setState(prevState => ({
        ...prevState,
        status: newStatus,
        isHealthy,
        lastCheck: now
      }));

    } catch (error) {
      console.error('❌ [SimplifiedConnection] Error checking connection:', error);
      
      setState(prevState => ({
        ...prevState,
        status: connectionStates.DISCONNECTED,
        isHealthy: false,
        lastCheck: new Date().toISOString()
      }));
    }
  }, []);

  // Reconnect function
  const reconnect = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 [SimplifiedConnection] Reconnection initiated');
      
      setState(prevState => ({
        ...prevState,
        status: connectionStates.RECONNECTING,
        reconnectAttempts: prevState.reconnectAttempts + 1
      }));

      // Let Supabase handle reconnection automatically
      // We just monitor the status
      
      // Check status after a delay
      setTimeout(() => {
        checkConnection();
      }, 2000);

    } catch (error) {
      console.error('❌ [SimplifiedConnection] Reconnection failed:', error);
      
      setState(prevState => ({
        ...prevState,
        status: connectionStates.DISCONNECTED,
        isHealthy: false
      }));
    }
  }, [checkConnection]);

  // Reset errors and reconnection attempts
  const resetErrors = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      reconnectAttempts: 0
    }));
  }, []);

  // Start monitoring
  useEffect(() => {
    // Initial check
    checkConnection();

    // Check every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [checkConnection]);

  // Auto-reconnect logic
  useEffect(() => {
    if (state.status === connectionStates.DISCONNECTED && 
        state.reconnectAttempts < 3) {
      
      const delay = Math.min(2000 * Math.pow(2, state.reconnectAttempts), 10000);
      
      const timer = setTimeout(() => {
        reconnect();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [state.status, state.reconnectAttempts, reconnect]);

  return {
    status: state.status,
    isHealthy: state.isHealthy,
    lastCheck: state.lastCheck,
    reconnectAttempts: state.reconnectAttempts,
    reconnect,
    resetErrors,
    checkConnection
  };
}
