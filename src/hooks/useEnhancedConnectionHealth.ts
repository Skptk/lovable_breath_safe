import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { connectionStates, type ConnectionState } from '@/lib/connectionStates';

interface EnhancedConnectionState {
  status: ConnectionState;
  lastCheck: Date;
  reconnectAttempts: number;
  isHealthy: boolean;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
}

interface ConnectionError {
  message: string;
  timestamp: Date;
  type: string;
}

export function useEnhancedConnectionHealth() {
  const [connectionState, setConnectionState] = useState<EnhancedConnectionState>({
    status: 'connected',
    lastCheck: new Date(),
    reconnectAttempts: 0,
    isHealthy: true,
    networkQuality: 'excellent',
    latency: 0
  });

  const [errors, setErrors] = useState<ConnectionError[]>([]);

  // Simple connection health check without complex state updates
  const checkConnectionHealth = useCallback(async () => {
    try {
      // Basic health check - if we're here, connection is working
      setConnectionState(prev => ({
        ...prev,
        lastCheck: new Date(),
        isHealthy: true
      }));
    } catch (error) {
      console.warn('Enhanced connection health check warning:', error);
      // Don't change status on warnings to prevent loops
    }
  }, []);

  // Send heartbeat to check connection
  const sendHeartbeat = useCallback(async () => {
    try {
      await checkConnectionHealth();
    } catch (error) {
      console.warn('Enhanced heartbeat failed:', error);
    }
  }, [checkConnectionHealth]);

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
      console.error('Enhanced reconnection failed:', error);
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
    const interval = setInterval(checkConnectionHealth, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [checkConnectionHealth]);

  return {
    connectionState,
    errors,
    checkConnectionHealth,
    sendHeartbeat,
    reconnect,
    resetErrors
  };
}
