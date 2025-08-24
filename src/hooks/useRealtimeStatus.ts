import { useState, useEffect } from 'react';
import { getConnectionStatus, addConnectionStatusListener } from '@/lib/realtimeClient';

export type RealtimeStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * Hook to monitor Supabase realtime connection status
 * Provides real-time updates on connection health
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<RealtimeStatus>('connected');
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Get initial status
    const initialStatus = getConnectionStatus();
    setStatus(initialStatus);
    setIsConnected(initialStatus === 'connected');
    setIsReconnecting(initialStatus === 'reconnecting');
    setLastUpdate(new Date());

    // Add listener for status changes
    const removeListener = addConnectionStatusListener((newStatus: RealtimeStatus) => {
      setStatus(newStatus);
      setIsConnected(newStatus === 'connected');
      setIsReconnecting(newStatus === 'reconnecting');
      setLastUpdate(new Date());
    });

    // Cleanup
    return () => {
      removeListener();
    };
  }, []);

  return {
    status,
    isConnected,
    isReconnecting,
    lastUpdate
  };
}
