import React, { useState, useEffect, useCallback } from 'react';
import { useEnhancedConnectionHealth, connectionStates, type ConnectionHealthState } from '../hooks/useEnhancedConnectionHealth';
import { AlertCircle, Wifi, WifiOff, RefreshCw, CheckCircle, X, Info, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';

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
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    timestamp: number;
    autoHide: boolean;
  }>>([]);
  
  const { toast } = useToast();

  // Enhanced connection health hook
  const connectionHealth = useEnhancedConnectionHealth({
    checkInterval: config.heartbeatInterval,
    maxReconnectAttempts: config.maxReconnectAttempts,
    enableAutoReconnect: config.enableAutoReconnect,
    onStateChange: (state: ConnectionHealthState) => {
      // Show toast notifications for important state changes
      if (state.status === connectionStates.CONNECTED && state.reconnectAttempts > 0) {
        toast({
          title: "Connection Restored",
          description: "Your connection has been successfully restored.",
          variant: "default",
        });
      } else if (state.status === connectionStates.DISCONNECTED) {
        toast({
          title: "Connection Lost",
          description: "Your connection has been lost. Attempting to reconnect...",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error, context: string) => {
      // Add alert for errors
      addAlert('error', `${context}: ${error.message}`, true);
    }
  });

  // Add alert
  const addAlert = useCallback((type: 'success' | 'info' | 'warning' | 'error', message: string, autoHide = false) => {
    const id = Date.now().toString();
    const alert = {
      id,
      type,
      message,
      timestamp: Date.now(),
      autoHide
    };

    setAlerts(prev => [...prev, alert]);

    // Auto-hide if configured
    if (autoHide && config.alertAutoHide) {
      setTimeout(() => {
        removeAlert(id);
      }, config.alertAutoHide);
    }
  }, [config.alertAutoHide]);

  // Remove alert
  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  }, []);

  // Manual reconnection
  const handleManualReconnect = useCallback(async () => {
    try {
      await connectionHealth.reconnect();
      addAlert('success', 'Manual reconnection initiated', true);
    } catch (error) {
      addAlert('error', `Manual reconnection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }, [connectionHealth, addAlert]);

  // Get status icon
  const getStatusIcon = () => {
    switch (connectionHealth.status) {
      case connectionStates.CONNECTED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case connectionStates.CONNECTING:
        return <Activity className="w-4 h-4 text-yellow-500 animate-spin" />;
      case connectionStates.RECONNECTING:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
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
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case connectionStates.RECONNECTING:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
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
      {/* Connection Status Indicator - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Card className={`p-3 border ${getStatusColor()} backdrop-blur-sm`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div className="flex flex-col">
              <span className="text-sm font-medium capitalize">
                {connectionHealth.status}
              </span>
              {connectionHealth.latency && (
                <span className="text-xs opacity-75">
                  {formatLatency(connectionHealth.latency)}
                </span>
              )}
            </div>
            {connectionHealth.status === connectionStates.DISCONNECTED && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualReconnect}
                className="ml-2 h-6 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Connection Alerts */}
      {alerts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-3 border backdrop-blur-sm ${
                alert.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                alert.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400' :
                alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {alert.type === 'success' && <CheckCircle className="w-4 h-4" />}
                  {alert.type === 'info' && <Info className="w-4 h-4" />}
                  {alert.type === 'warning' && <AlertCircle className="w-4 h-4" />}
                  {alert.type === 'error' && <AlertCircle className="w-4 h-4" />}
                  <span className="text-sm">{alert.message}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAlert(alert.id)}
                  className="h-6 w-6 p-0 ml-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

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

              {/* Network Status */}
              <div className="flex justify-between">
                <span className="opacity-75">Network:</span>
                <Badge variant="outline" className={connectionHealth.isOnline ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}>
                  {connectionHealth.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>

              {/* Last Network Change */}
              {connectionHealth.lastNetworkChange && (
                <div className="flex justify-between">
                  <span className="opacity-75">Last Network Change:</span>
                  <span>{formatTimestamp(connectionHealth.lastNetworkChange)}</span>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualReconnect}
                  className="flex-1 h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reconnect
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={connectionHealth.resetErrors}
                  className="flex-1 h-7 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Errors
                </Button>
              </div>

              {/* Recent Errors */}
              {connectionHealth.errors.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="opacity-75">Recent Errors:</span>
                    <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                      {connectionHealth.errors.map((error, index) => (
                        <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                          <div className="font-medium">{error.context}</div>
                          <div className="opacity-75">{error.message}</div>
                          <div className="text-xs opacity-50">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
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
