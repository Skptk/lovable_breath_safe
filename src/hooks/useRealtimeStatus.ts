import { useState, useEffect } from 'react';
import { getConnectionStatus, addConnectionStatusListener } from '@/lib/realtimeClient';

export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * Hook to monitor Supabase realtime connection status
 * Returns current status and provides real-time updates
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>(() => {
    // Initialize with current status
    return getConnectionStatus();
  });

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = addConnectionStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    isReconnecting: status === 'reconnecting',
    isDisconnected: status === 'disconnected',
  };
}
