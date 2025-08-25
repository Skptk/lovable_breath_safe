import React, { useState, useEffect, useCallback } from 'react';
import { useEnhancedConnectionHealth, connectionStates, type ConnectionHealthState } from '../hooks/useEnhancedConnectionHealth';
import { AlertCircle, Wifi, WifiOff, RefreshCw, CheckCircle, X, Info, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
import ConnectionNotificationManager, { ConnectionStatus } from './ConnectionNotificationManager';

interface ConnectionResilienceProviderProps {
  children: React.ReactNode;
  supabaseClient?: any;
  config?: {
    heartbeatInterval?: number;
    maxReconnectAttempts?: number;
    enableAutoReconnect?: boolean;
    showDebugPanel?: boolean;
    alertAutoHide?: number;
  };
}

export function ConnectionResilienceProvider({ 
  children, 
  config = {},
  supabaseClient 
}: ConnectionResilienceProviderProps) {
  const [showDebugPanel, setShowDebugPanel] = useState(config.showDebugPanel ?? process.env.NODE_ENV === 'development');
  
  const { toast } = useToast();

  // Enhanced connection health hook
  const connectionHealth = useEnhancedConnectionHealth({
    checkInterval: config.heartbeatInterval,
    maxReconnectAttempts: config.maxReconnectAttempts,
    enableAutoReconnect: config.enableAutoReconnect,
    onStateChange: (state: ConnectionHealthState) => {
      // State changes are now handled by the unified notification system
      console.log('Connection state changed:', state.status);
    },
    onError: (error: Error, context: string) => {
      console.error('Connection error:', error.message, context);
    }
  });

  // Convert connection health status to notification status
  const getNotificationStatus = (): ConnectionStatus => {
    switch (connectionHealth.status) {
      case connectionStates.CONNECTED:
        return 'connected';
      case connectionStates.CONNECTING:
        return 'connecting';
      case connectionStates.RECONNECTING:
        return 'reconnecting';
      case connectionStates.DISCONNECTED:
        return 'disconnected';
      default:
        return 'error';
    }
  };

  // Get notification message based on status
  const getNotificationMessage = (): string | undefined => {
    switch (connectionHealth.status) {
      case connectionStates.CONNECTED:
        return connectionHealth.isHealthy ? 'Real-time updates are now available' : 'Connection established but health check failed';
      case connectionStates.CONNECTING:
        return 'Establishing connection...';
      case connectionStates.RECONNECTING:
        return `Attempting to restore connection... (${connectionHealth.reconnectAttempts}/${connectionHealth.maxReconnectAttempts})`;
      case connectionStates.DISCONNECTED:
        return 'Real-time updates unavailable';
      default:
        return 'Connection status unknown';
    }
  };

  // Manual reconnection
  const handleManualReconnect = useCallback(async () => {
    try {
      await connectionHealth.reconnect();
      toast({
        title: "Reconnection Initiated",
        description: "Attempting to restore connection...",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Reconnection Failed",
        description: "Failed to initiate reconnection. Please try again.",
        variant: "destructive",
      });
    }
  }, [connectionHealth, toast]);

  // Handle notification dismissal
  const handleNotificationDismiss = useCallback(() => {
    console.log('Connection notification dismissed');
  }, []);

  // Get status icon
  const getStatusIcon = () => {
    switch (connectionHealth.status) {
      case connectionStates.CONNECTED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case connectionStates.CONNECTING:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case connectionStates.RECONNECTING:
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case connectionStates.DISCONNECTED:
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (connectionHealth.status) {
      case connectionStates.CONNECTED:
        return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
      case connectionStates.CONNECTING:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
      case connectionStates.RECONNECTING:
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case connectionStates.DISCONNECTED:
        return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  // Get network quality color
  const getNetworkQualityColor = () => {
    switch (connectionHealth.networkQuality) {
      case 'excellent':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'good':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'fair':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'poor':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format latency
  const formatLatency = (latency: number | null) => {
    if (!latency) return 'Unknown';
    return `${latency}ms`;
  };

  return (
    <>
      {/* Unified Connection Notification System */}
      <ConnectionNotificationManager
        connectionStatus={getNotificationStatus()}
        connectionMessage={getNotificationMessage()}
        onRetry={handleManualReconnect}
        onDismiss={handleNotificationDismiss}
      />

      {/* Connection Status Indicator - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Card className={`p-3 border ${getStatusColor()} backdrop-blur-sm`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div className="flex flex-col">
              <span className="text-sm font-medium capitalize">
                {connectionHealth.status}
              </span>
              <span className="text-xs opacity-75">
                {connectionHealth.networkQuality}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Debug Panel - Development Only */}
      {showDebugPanel && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-80 p-4 border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Connection Debug</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDebugPanel(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="space-y-3 text-xs">
              {/* Status */}
              <div className="flex justify-between">
                <span className="opacity-75">Status:</span>
                <Badge variant="outline" className="capitalize">
                  {connectionHealth.status}
                </Badge>
              </div>

              {/* Network Quality */}
              <div className="flex justify-between">
                <span className="opacity-75">Quality:</span>
                <Badge variant="outline" className={getNetworkQualityColor()}>
                  {connectionHealth.networkQuality}
                </Badge>
              </div>

              {/* Latency */}
              <div className="flex justify-between">
                <span className="opacity-75">Latency:</span>
                <span>{formatLatency(connectionHealth.latency)}</span>
              </div>

              {/* Last Heartbeat */}
              <div className="flex justify-between">
                <span className="opacity-75">Last Heartbeat:</span>
                <span>{formatTimestamp(connectionHealth.lastHeartbeat)}</span>
              </div>

              {/* Reconnect Attempts */}
              <div className="flex justify-between">
                <span className="opacity-75">Reconnect Attempts:</span>
                <span>{connectionHealth.reconnectAttempts}</span>
              </div>

              {/* Manual Reconnect Button */}
              <Separator />
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualReconnect}
                className="w-full h-7 text-xs"
                disabled={connectionHealth.status === connectionStates.CONNECTED}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Manual Reconnect
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Debug Toggle Button */}
      {!showDebugPanel && process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDebugPanel(true)}
            className="h-8 w-8 p-0 rounded-full"
            title="Show Connection Debug"
          >
            <Activity className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      {children}
    </>
  );
}
