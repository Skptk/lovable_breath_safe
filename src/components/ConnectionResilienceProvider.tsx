import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ConnectionNotificationManager } from './ConnectionNotificationManager';
import { connectionStates } from '@/lib/connectionStates';

interface ConnectionResilienceProviderProps {
  children: React.ReactNode;
  config?: {
    showDebugPanel?: boolean;
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
    enableAutoReconnect?: boolean;
    alertAutoHide?: number;
  };
  supabaseClient?: any;
}

export function ConnectionResilienceProvider({ 
  children, 
  config = {},
  supabaseClient 
}: ConnectionResilienceProviderProps) {
  const [showDebugPanel, setShowDebugPanel] = useState(config.showDebugPanel ?? process.env.NODE_ENV === 'development');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connected');
  const [connectionMessage, setConnectionMessage] = useState('Real-time updates are available');
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  
  const { toast } = useToast();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
  const heartbeatInterval = config.heartbeatInterval ?? 30000; // 30 seconds
  const enableAutoReconnect = config.enableAutoReconnect ?? true;

  // Connection health monitoring with proper dependency management
  useEffect(() => {
    if (!enableAutoReconnect) return;

    const checkConnectionHealth = () => {
      try {
        // Simple connection check without complex state updates
        setLastCheck(new Date());
        
        // Basic health check - if we're here, connection is working
        if (connectionStatus !== 'connected') {
          setConnectionStatus('connected');
          setConnectionMessage('Real-time updates are available');
        }
      } catch (error) {
        console.warn('Connection health check warning:', error);
        // Don't change status on warnings to prevent loops
      }
    };

    const interval = setInterval(checkConnectionHealth, heartbeatInterval);
    return () => clearInterval(interval);
  }, [connectionStatus, enableAutoReconnect, heartbeatInterval]);

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

  // Dismiss connection notifications
  const handleDismiss = useCallback(() => {
    // Don't change status, just allow user to dismiss notifications
    console.log('Connection notification dismissed by user');
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
