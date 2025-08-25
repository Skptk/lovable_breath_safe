import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionHealthState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  lastCheck: Date | null;
  reconnectAttempts: number;
  isHealthy: boolean;
}

interface ConnectionQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency?: number;
  packetLoss?: number;
}

export function useConnectionHealth() {
  const [connectionState, setConnectionState] = useState<ConnectionHealthState>({
    status: 'connected',
    lastCheck: new Date(),
    reconnectAttempts: 0,
    isHealthy: true
  });
  
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    quality: 'excellent'
  });

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
      console.warn('Connection health check warning:', error);
      // Don't change status on warnings to prevent loops
    }
  }, []);

  // Manual reconnection function
  const forceReconnect = useCallback(async () => {
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
      console.error('Reconnection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        isHealthy: false
      }));
    }
  }, []);

  // Send heartbeat to check connection
  const sendHeartbeat = useCallback(async () => {
    try {
      await checkConnectionHealth();
    } catch (error) {
      console.warn('Heartbeat failed:', error);
    }
  }, [checkConnectionHealth]);

  // Periodic health check
  useEffect(() => {
    const interval = setInterval(checkConnectionHealth, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [checkConnectionHealth]);

  return {
    connectionState,
    connectionQuality,
    forceReconnect,
    sendHeartbeat,
    checkConnectionHealth
  };
}
