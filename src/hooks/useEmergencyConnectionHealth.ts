import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

interface EmergencyConnectionState {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  isHealthy: boolean;
  lastCheck: string;
  reconnectAttempts: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isOnline: boolean;
  lastNetworkChange: Date | null;
  errors: Array<{ message: string; timestamp: Date; type: string }>;
  latency: number | null;
  lastHeartbeat: number;
}

export function useEmergencyConnectionHealth() {
  const [state, setState] = useState<EmergencyConnectionState>({
    status: 'connected',
    isHealthy: true,
    lastCheck: new Date().toISOString(),
    reconnectAttempts: 0,
    networkQuality: 'excellent',
    isOnline: navigator.onLine,
    lastNetworkChange: null,
    errors: [],
    latency: null,
    lastHeartbeat: Date.now()
  });

  // Emergency reconnection function
  const reconnect = useCallback(async (): Promise<void> => {
    try {
      console.log('🚨 [EmergencyConnection] Emergency reconnection initiated');
      
      setState(prevState => ({
        ...prevState,
        status: 'reconnecting',
        reconnectAttempts: prevState.reconnectAttempts + 1
      }));

      // Force Supabase to attempt reconnection
      const isConnected = supabase.realtime.isConnected();
      
      if (!isConnected) {
        // Try to trigger reconnection by accessing realtime
        try {
          // This might trigger a reconnection attempt
          const testChannel = supabase.channel('emergency-test');
          testChannel.subscribe();
          
          // Clean up test channel
          setTimeout(() => {
            testChannel.unsubscribe();
          }, 1000);
        } catch (error) {
          console.warn('Emergency reconnection test failed:', error);
        }
      }

      // Check status after delay
      setTimeout(() => {
        checkConnectionStatus();
      }, 2000);

    } catch (error) {
      console.error('❌ [EmergencyConnection] Emergency reconnection failed:', error);
      
      setState(prevState => ({
        ...prevState,
        status: 'error',
        isHealthy: false,
        errors: [...prevState.errors, {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          type: 'emergency_reconnect'
        }].slice(-5) // Keep last 5 errors
      }));
    }
  }, []);

  // Reset errors
  const resetErrors = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      errors: []
    }));
  }, []);

  // Check connection status
  const checkConnectionStatus = useCallback(() => {
    try {
      const now = new Date();
      const isConnected = supabase.realtime.isConnected();
      const isConnecting = supabase.realtime.isConnecting();

      let newStatus: EmergencyConnectionState['status'];
      let isHealthy = false;

      if (isConnected) {
        newStatus = 'connected';
        isHealthy = true;
      } else if (isConnecting) {
        newStatus = 'reconnecting';
        isHealthy = false;
      } else {
        newStatus = 'disconnected';
        isHealthy = false;
      }

      setState(prevState => ({
        ...prevState,
        status: newStatus,
        isHealthy,
        lastCheck: now.toISOString(),
        lastHeartbeat: Date.now()
      }));

    } catch (error) {
      console.error('❌ [EmergencyConnection] Error checking connection status:', error);
      
      setState(prevState => ({
        ...prevState,
        status: 'error',
        isHealthy: false,
        lastCheck: new Date().toISOString(),
        errors: [...prevState.errors, {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          type: 'status_check'
        }].slice(-5)
      }));
    }
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setState(prevState => ({
        ...prevState,
        isOnline: true,
        lastNetworkChange: new Date()
      }));
    };

    const handleOffline = () => {
      setState(prevState => ({
        ...prevState,
        isOnline: false,
        lastNetworkChange: new Date(),
        status: 'disconnected',
        isHealthy: false
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodic status checks
  useEffect(() => {
    // Initial check
    checkConnectionStatus();

    // Check every 30 seconds
    const interval = setInterval(checkConnectionStatus, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [checkConnectionStatus]);

  // Auto-reconnect on network restoration
  useEffect(() => {
    if (state.isOnline && state.status === 'disconnected' && state.reconnectAttempts < 3) {
      const timer = setTimeout(() => {
        reconnect();
      }, 5000); // Wait 5 seconds after network restoration

      return () => clearTimeout(timer);
    }
  }, [state.isOnline, state.status, state.reconnectAttempts, reconnect]);

  return {
    status: state.status,
    isHealthy: state.isHealthy,
    lastCheck: state.lastCheck,
    reconnectAttempts: state.reconnectAttempts,
    networkQuality: state.networkQuality,
    isOnline: state.isOnline,
    lastNetworkChange: state.lastNetworkChange,
    errors: state.errors,
    latency: state.latency,
    lastHeartbeat: state.lastHeartbeat,
    reconnect,
    resetErrors
  };
}
