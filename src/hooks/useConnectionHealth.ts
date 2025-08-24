import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionHealthState {
  isConnected: boolean;
  lastHeartbeat: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  reconnectAttempts: number;
  lastReconnectAttempt: Date | null;
}

interface UseConnectionHealthOptions {
  checkInterval?: number; // milliseconds
  maxReconnectAttempts?: number;
  enableAutoReconnect?: boolean;
}

/**
 * Hook for monitoring WebSocket connection health and providing
 * automatic reconnection capabilities
 */
export function useConnectionHealth({
  checkInterval = 30000, // 30 seconds
  maxReconnectAttempts = 5,
  enableAutoReconnect = true
}: UseConnectionHealthOptions = {}) {
  const [healthState, setHealthState] = useState<ConnectionHealthState>({
    isConnected: true,
    lastHeartbeat: new Date(),
    connectionQuality: 'excellent',
    reconnectAttempts: 0,
    lastReconnectAttempt: null
  });

  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Check connection health
  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const isConnected = supabase.realtime.isConnected();
      const now = new Date();

      if (isConnected) {
        // Connection is healthy
        setHealthState(prev => ({
          ...prev,
          isConnected: true,
          lastHeartbeat: now,
          connectionQuality: 'excellent',
          reconnectAttempts: 0 // Reset reconnect attempts on successful connection
        }));
      } else {
        // Connection lost
        console.warn('🔄 [ConnectionHealth] WebSocket connection lost, attempting reconnect...');
        
        setHealthState(prev => ({
          ...prev,
          isConnected: false,
          connectionQuality: 'disconnected',
          lastReconnectAttempt: now
        }));

        // Attempt automatic reconnection if enabled
        if (enableAutoReconnect && healthState.reconnectAttempts < maxReconnectAttempts) {
          await attemptReconnect();
        }
      }
    } catch (error) {
      console.error('❌ [ConnectionHealth] Error checking connection:', error);
      setHealthState(prev => ({
        ...prev,
        isConnected: false,
        connectionQuality: 'disconnected'
      }));
    }
  }, [enableAutoReconnect, healthState.reconnectAttempts, maxReconnectAttempts]);

  // Attempt to reconnect
  const attemptReconnect = useCallback(async () => {
    if (!mountedRef.current || healthState.reconnectAttempts >= maxReconnectAttempts) {
      console.error(`❌ [ConnectionHealth] Max reconnection attempts (${maxReconnectAttempts}) reached`);
      return false;
    }

    try {
      console.log(`🔄 [ConnectionHealth] Attempting reconnection (${healthState.reconnectAttempts + 1}/${maxReconnectAttempts})`);
      
      setHealthState(prev => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1,
        lastReconnectAttempt: new Date()
      }));

      // Attempt to reconnect
      await supabase.realtime.connect();
      
      // Check if reconnection was successful
      const isConnected = supabase.realtime.isConnected();
      
      if (isConnected) {
        console.log('✅ [ConnectionHealth] Reconnection successful');
        setHealthState(prev => ({
          ...prev,
          isConnected: true,
          connectionQuality: 'good',
          lastHeartbeat: new Date()
        }));
        return true;
      } else {
        console.warn('⚠️ [ConnectionHealth] Reconnection attempt failed');
        return false;
      }
    } catch (error) {
      console.error('❌ [ConnectionHealth] Reconnection error:', error);
      return false;
    }
  }, [healthState.reconnectAttempts, maxReconnectAttempts]);

  // Manual reconnect function
  const manualReconnect = useCallback(async () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    console.log('🔄 [ConnectionHealth] Manual reconnection requested');
    
    // Reset reconnect attempts for manual reconnection
    setHealthState(prev => ({
      ...prev,
      reconnectAttempts: 0
    }));

    const success = await attemptReconnect();
    
    if (!success) {
      // Schedule next attempt with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, healthState.reconnectAttempts), 10000);
      console.log(`🔄 [ConnectionHealth] Scheduling next reconnection attempt in ${delay}ms`);
      
      reconnectTimeout.current = setTimeout(() => {
        if (mountedRef.current) {
          attemptReconnect();
        }
      }, delay);
    }
  }, [attemptReconnect, healthState.reconnectAttempts]);

  // Start health monitoring
  useEffect(() => {
    if (!mountedRef.current) return;

    console.log('🔍 [ConnectionHealth] Starting connection health monitoring');
    
    // Initial health check
    checkConnection();
    
    // Set up periodic health checks
    healthCheckInterval.current = setInterval(checkConnection, checkInterval);
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
        healthCheckInterval.current = null;
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [checkConnection, checkInterval]);

  // Calculate connection quality based on various factors
  const calculateConnectionQuality = useCallback((): 'excellent' | 'good' | 'poor' | 'disconnected' => {
    if (!healthState.isConnected) return 'disconnected';
    
    const now = new Date();
    const timeSinceLastHeartbeat = healthState.lastHeartbeat 
      ? now.getTime() - healthState.lastHeartbeat.getTime() 
      : Infinity;
    
    if (timeSinceLastHeartbeat < 30000) return 'excellent'; // Less than 30 seconds
    if (timeSinceLastHeartbeat < 60000) return 'good';      // Less than 1 minute
    if (timeSinceLastHeartbeat < 120000) return 'poor';     // Less than 2 minutes
    return 'disconnected';
  }, [healthState.isConnected, healthState.lastHeartbeat]);

  // Update connection quality when state changes
  useEffect(() => {
    const quality = calculateConnectionQuality();
    if (quality !== healthState.connectionQuality) {
      setHealthState(prev => ({ ...prev, connectionQuality: quality }));
    }
  }, [calculateConnectionQuality, healthState.connectionQuality]);

  // Return health state and control functions
  return {
    ...healthState,
    checkConnection,
    manualReconnect,
    isReconnecting: healthState.reconnectAttempts > 0 && !healthState.isConnected,
    canReconnect: healthState.reconnectAttempts < maxReconnectAttempts,
    connectionQuality: healthState.connectionQuality
  };
}
