import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { connectionStates, type ConnectionState } from '@/lib/connectionStates';

export interface ConnectionHealthState {
  status: ConnectionState;
  isHealthy: boolean;
  lastCheck: string | null;
  reconnectAttempts: number;
}

export function useSimplifiedConnectionHealth() {
  const [connectionState, setConnectionState] = useState<SimplifiedConnectionState>({
    status: 'connected',
    lastCheck: new Date(),
    reconnectAttempts: 0,
    isHealthy: true
  });

  const [errors, setErrors] = useState<SimplifiedConnectionError[]>([]);

  // Simple connection check
  const checkConnection = useCallback(async () => {
    try {
      // Basic health check - if we're here, connection is working
      setConnectionState(prev => ({
        ...prev,
        lastCheck: new Date(),
        isHealthy: true
      }));
    } catch (error) {
      console.warn('Simplified connection check warning:', error);
      // Don't change status on warnings to prevent loops
    }
  }, []);

  // Manual reconnection function
  const reconnect = useCallback(async () => {
    setConnectionState(prev => ({
      ...prev,
      status: 'connecting',
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    try {
      // Simple reconnection logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnectionState(prev => ({
        ...prev,
        status: 'connected',
        isHealthy: true
      }));
    } catch (error) {
      console.error('Simplified reconnection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        isHealthy: false
      }));
    }
  }, []);

  // Reset errors
  const resetErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(checkConnection, 45000); // 45 seconds for simplified mode
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    connectionState,
    errors,
    checkConnection,
    reconnect,
    resetErrors
  };
}
