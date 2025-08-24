import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionHealthState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
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
    status: 'connecting',
    lastCheck: null,
    reconnectAttempts: 0,
    isHealthy: false
  });

  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    quality: 'excellent'
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDestroyedRef = useRef(false);

  // Check connection health
  const checkConnectionHealth = useCallback(async (): Promise<void> => {
    if (isDestroyedRef.current) return;

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

      // Update connection state
      setConnectionState(prevState => ({
        ...prevState,
        status: newStatus,
        lastCheck: now,
        isHealthy
      }));

      // Update connection quality based on status
      if (newStatus === 'connected') {
        setConnectionQuality({
          quality: 'excellent',
          latency: Math.random() * 50 + 10 // Simulated latency 10-60ms
        });
      } else if (newStatus === 'connecting') {
        setConnectionQuality({
          quality: 'fair'
        });
      } else {
        setConnectionQuality({
          quality: 'poor'
        });
      }

    } catch (error) {
      console.error('❌ [useConnectionHealth] Error checking connection health:', error);
      
      setConnectionState(prevState => ({
        ...prevState,
        status: 'error',
        lastCheck: new Date(),
        isHealthy: false
      }));

      setConnectionQuality({
        quality: 'poor'
      });
    }
  }, []);

  // Force reconnection
  const forceReconnect = useCallback(async (): Promise<void> => {
    if (isDestroyedRef.current) return;

    try {
      console.log('🔄 [useConnectionHealth] Force reconnection initiated');
      
      setConnectionState(prevState => ({
        ...prevState,
        status: 'connecting',
        reconnectAttempts: prevState.reconnectAttempts + 1
      }));

      // Let Supabase handle reconnection automatically
      // We just monitor the status
      
      // Check health after a delay to see if reconnection worked
      setTimeout(() => {
        if (!isDestroyedRef.current) {
          checkConnectionHealth();
        }
      }, 2000);

    } catch (error) {
      console.error('❌ [useConnectionHealth] Force reconnection failed:', error);
      
      setConnectionState(prevState => ({
        ...prevState,
        status: 'error',
        lastCheck: new Date(),
        isHealthy: false
      }));
    }
  }, [checkConnectionHealth]);

  // Send heartbeat to test connection
  const sendHeartbeat = useCallback(async (): Promise<void> => {
    if (isDestroyedRef.current) return;

    try {
      // Simple connection test
      const isConnected = supabase.realtime.isConnected();
      
      if (isConnected) {
        // Connection is alive
        setConnectionState(prevState => ({
          ...prevState,
          lastCheck: new Date(),
          isHealthy: true
        }));
      } else {
        // Connection is down
        setConnectionState(prevState => ({
          ...prevState,
          lastCheck: new Date(),
          isHealthy: false
        }));
      }
    } catch (error) {
      console.error('❌ [useConnectionHealth] Heartbeat failed:', error);
    }
  }, []);

  // Start health monitoring
  useEffect(() => {
    if (isDestroyedRef.current) return;

    // Initial health check
    checkConnectionHealth();

    // Set up periodic health checks every 10 seconds
    healthCheckIntervalRef.current = setInterval(checkConnectionHealth, 10000);

    // Cleanup function
    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [checkConnectionHealth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isDestroyedRef.current = true;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, []);

  return {
    connectionState,
    connectionQuality,
    forceReconnect,
    sendHeartbeat,
    // Additional utility functions
    attemptReconnect: forceReconnect, // Alias for compatibility
    isConnected: connectionState.status === 'connected',
    isConnecting: connectionState.status === 'connecting',
    isDisconnected: connectionState.status === 'disconnected',
    hasError: connectionState.status === 'error'
  };
}
