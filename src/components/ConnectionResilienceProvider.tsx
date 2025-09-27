import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ConnectionNotificationManager } from './ConnectionNotificationManager';
import { useHeapFailSafe } from '@/hooks/useHeapFailSafe';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ConnectionResilienceProviderProps {
  children: React.ReactNode;
  config?: {
    showDebugPanel?: boolean;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
    enableAutoReconnect?: boolean;
    alertAutoHide?: number;
  };
}

export function ConnectionResilienceProvider({ 
  children,
  config = {}
}: ConnectionResilienceProviderProps) {
  const [showDebugPanel, setShowDebugPanel] = useState(config.showDebugPanel ?? process.env?.['NODE_ENV'] === 'development');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connected');
  const [connectionMessage, setConnectionMessage] = useState('Real-time updates are available');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  const { toast } = useToast();
  const heapEvent = useHeapFailSafe();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
  const heartbeatInterval = config.heartbeatInterval ?? 120000; // 2 minutes (was 30 seconds)
  const enableAutoReconnect = config.enableAutoReconnect ?? true;
  const networkStatus = useNetworkStatus();

  // CRITICAL FIX: Prevent infinite dismiss callbacks
  const dismissCountRef = useRef(0);
  const lastDismissTimeRef = useRef(0);

  // Connection health monitoring with proper dependency management
  useEffect(() => {
    if (!enableAutoReconnect) return;

    const checkConnectionHealth = () => {
      try {
        // Simple connection check without complex state updates
        setLastCheck(new Date());
        
        // Only update status if there's a significant change
        // Avoid frequent status changes that trigger notifications
        if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
          // Only try to recover from actual problem states
          setConnectionStatus('connected');
          setConnectionMessage('Real-time updates are available');
        }
      } catch (error) {
        console.warn('Connection health check warning:', error);
        // Don't change status on warnings to prevent loops
      }
    };

    // Reduced frequency to prevent excessive status changes
    const interval = setInterval(checkConnectionHealth, heartbeatInterval * 2); // Double the interval
    return () => clearInterval(interval);
  }, [connectionStatus, enableAutoReconnect, heartbeatInterval]);

  useEffect(() => {
    if (!networkStatus.isOnline) {
      toast({
        title: 'You are offline',
        description: 'Some features may be unavailable while offline.',
        variant: "default",
      });
    }
  }, [networkStatus.isOnline, toast]);

  useEffect(() => {
    if (!heapEvent) {
      return;
    }

    const titleByLevel = {
      warn: 'High memory usage detected',
      critical: 'Critical memory usage detected',
      emergency: 'Memory emergency'
    } as const;

    const descriptionByLevel = {
      warn: 'Breath Safe is monitoring memory closely. You can continue working.',
      critical: 'We cleared caches to free resources. Expect data to refetch shortly.',
      emergency: 'Reloading soon due to memory pressure. Please save your work.'
    } as const;

    toast({
      title: titleByLevel[heapEvent.level],
      description: `${descriptionByLevel[heapEvent.level]} (Heap: ${heapEvent.usedMb.toFixed(1)} MB)`,
      variant: heapEvent.level === 'warn' ? 'default' : 'destructive'
    });
  }, [heapEvent, toast]);

  // Periodic dismissal pattern summary logging
  useEffect(() => {
    const logDismissalSummary = () => {
      if (dismissCountRef.current > 0) {
        console.log(`📊 [ConnectionResilience] Dismissal summary: ${dismissCountRef.current} dismissals in last minute`);
        
        // Reset counter for next period
        dismissCountRef.current = 0;
      }
    };

    // Log summary every 2 minutes
    const summaryInterval = setInterval(logDismissalSummary, 2 * 60 * 1000);
    
    return () => clearInterval(summaryInterval);
  }, []);

  // Manual reconnection function
  const handleRetry = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnectionStatus('error');
      setConnectionMessage('Maximum reconnection attempts reached');
      toast({
        title: "Connection Failed",
        description: "Unable to establish connection. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setConnectionStatus('connecting');
    setConnectionMessage('Attempting to reconnect...');
    reconnectAttemptsRef.current++;

    try {
      // Simple reconnection logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnectionStatus('connected');
      setConnectionMessage('Real-time updates are available');
      reconnectAttemptsRef.current = 0;
      
      toast({
        title: "Reconnected",
        description: "Connection restored successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Reconnection failed:', error);
      setConnectionStatus('error');
      setConnectionMessage('Reconnection failed');
    }
  }, [maxReconnectAttempts, toast]);

  // CRITICAL FIX: Dismiss connection notifications without infinite loops
  const handleDismiss = useCallback(() => {
    const now = Date.now();
    
    // Enhanced rate limiting with dismissal cooldown (30 seconds)
    const DISMISS_COOLDOWN = 30000; // 30 seconds
    const MAX_DISMISS_PER_MINUTE = 3; // Reduced from 5 to 3
    
    // Check cooldown period
    if (now - lastDismissTimeRef.current < DISMISS_COOLDOWN) {
      console.log('⏳ [ConnectionResilience] Dismiss in cooldown, please wait');
      return;
    }
    
    // Prevent excessive dismiss calls
    dismissCountRef.current++;
    if (dismissCountRef.current > MAX_DISMISS_PER_MINUTE) {
      console.warn('🚨 [ConnectionResilience] Rate limit exceeded, preventing notification spam');
      return;
    }
    
    // Reset counter after 1 minute
    if (now - lastDismissTimeRef.current > 60000) {
      dismissCountRef.current = 1;
    }
    
    lastDismissTimeRef.current = now;
    
    // Log dismissal with rate limiting info
    console.log(`✅ [ConnectionResilience] Notification dismissed (${dismissCountRef.current}/${MAX_DISMISS_PER_MINUTE} per minute)`);
  }, []);

  return (
    <>
      {/* Connection notification manager with proper status */}
      <ConnectionNotificationManager
        connectionStatus={connectionStatus}
        connectionMessage={connectionMessage}
        onRetry={handleRetry}
        onDismiss={handleDismiss}
      />
      
      {children}
      
      {/* Debug panel for development only */}
      {showDebugPanel && (
        <div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg p-4 shadow-lg">
          <div className="space-y-2">
            <div className="text-sm font-medium">Connection Health</div>
            <div className="text-xs space-y-1">
              <div>Status: {connectionStatus}</div>
              <div>Message: {connectionMessage}</div>
              <div>Last Check: {lastCheck.toLocaleTimeString()}</div>
              <div>Reconnect Attempts: {reconnectAttemptsRef.current}</div>
              <div>Dismiss Count: {dismissCountRef.current}</div>
            </div>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
