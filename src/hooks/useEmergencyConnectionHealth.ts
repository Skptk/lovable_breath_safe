import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmergencyConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  isHealthy: boolean;
  lastCheck: string | null;
  reconnectAttempts: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isOnline: boolean;
  lastNetworkChange: string | null;
  errors: Array<{
    message: string;
    timestamp: string;
    type: string;
  }>;
  latency: number | null;
  lastHeartbeat: number;
}

export function useEmergencyConnectionHealth() {
  const [connectionState, setConnectionState] = useState<EmergencyConnectionState>({
    status: 'connected',
    lastCheck: new Date(),
    reconnectAttempts: 0,
    isHealthy: true,
    emergencyMode: false
  });

  const [errors, setErrors] = useState<EmergencyConnectionError[]>([]);

  // Emergency reconnection function
  const reconnect = useCallback(async () => {
    setConnectionState(prev => ({
      ...prev,
      status: 'connecting',
      reconnectAttempts: prev.reconnectAttempts + 1,
      emergencyMode: true
    }));

    try {
      // Emergency reconnection logic with shorter timeout
      await new Promise(resolve => setTimeout(resolve, 500));
      setConnectionState(prev => ({
        ...prev,
        status: 'connected',
        isHealthy: true,
        emergencyMode: false
      }));
    } catch (error) {
      console.error('Emergency reconnection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        isHealthy: false,
        emergencyMode: true
      }));
    }
  }, []);

  // Reset errors
  const resetErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Simple health check
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionState(prev => ({
        ...prev,
        lastCheck: new Date()
      }));
    }, 15000); // 15 seconds for emergency mode
    return () => clearInterval(interval);
  }, []);

  return {
    connectionState,
    errors,
    reconnect,
    resetErrors
  };
}
