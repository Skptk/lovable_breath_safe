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
  
  // Rate limiting constants
  const NOTIFICATION_COOLDOWN = 15000; // 15 seconds between same notifications
  const MAX_NOTIFICATIONS = 2; // Maximum 2 notifications shown at once
  const [lastNotificationTime, setLastNotificationTime] = useState<Record<string, number>>({});
  
  const { toast } = useToast();

  // Enhanced notification system with rate limiting
  const addNotification = useCallback((type: 'success' | 'info' | 'warning' | 'error', message: string, priority: 'normal' | 'high' | 'low' = 'normal') => {
    const now = Date.now();
    const notificationKey = `${type}-${message}`;
    
    // Check rate limiting
    if (lastNotificationTime[notificationKey] && 
        now - lastNotificationTime[notificationKey] < NOTIFICATION_COOLDOWN) {
      return; // Skip duplicate notification within cooldown
    }

    // Update last notification time
    setLastNotificationTime(prev => ({
      ...prev,
      [notificationKey]: now
    }));

    // Add notification with auto-removal
    const notification = {
      id: `${type}-${now}`,
      type,
      message,
      timestamp: now,
      autoHide: true
    };

    setAlerts(prev => {
      const updated = [notification, ...prev];
      
      // Keep only the most recent notifications
      if (updated.length > MAX_NOTIFICATIONS) {
        return updated.slice(0, MAX_NOTIFICATIONS);
      }
      
      return updated;
    });

    // Auto-remove notification
    const duration = priority === 'high' ? 8000 : 
                    priority === 'low' ? 3000 : 5000;
    
    setTimeout(() => {
      setAlerts(prev => 
        prev.filter(n => n.id !== notification.id)
      );
    }, duration);
  }, [lastNotificationTime]);

  // Enhanced connection health hook
  const connectionHealth = useEnhancedConnectionHealth({
    checkInterval: config.heartbeatInterval,
    maxReconnectAttempts: config.maxReconnectAttempts,
    enableAutoReconnect: config.enableAutoReconnect,
    onStateChange: (state: ConnectionHealthState) => {
      // Show notifications for important state changes
      if (state.status === connectionStates.CONNECTED && state.isHealthy) {
        addNotification('success', 'Connection restored', 'normal');
      } else if (state.status === connectionStates.DISCONNECTED) {
        addNotification('warning', 'Connection lost - attempting to reconnect', 'high');
      } else if (state.status === connectionStates.RECONNECTING) {
        addNotification('info', 'Reconnecting...', 'low');
      }
    },
    onError: (error: Error, context: string) => {
      addNotification('error', `Connection error: ${error.message}`, 'high');
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

  // Clear all notifications function
  const clearAllNotifications = useCallback(() => {
    setAlerts([]);
    console.log('Cleared all notifications');
  }, []);

  // Manual reconnection
  const handleManualReconnect = useCallback(async () => {
    try {
      await connectionHealth.reconnect();
      addNotification('info', 'Manual reconnection initiated', 'normal');
    } catch (error) {
      addNotification('error', 'Manual reconnection failed', 'high');
    }
  }, [connectionHealth, addNotification]);

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
            <Button
              size="sm"
              variant="outline"
              onClick={clearAllNotifications}
              className="ml-2 h-6 px-2 text-xs"
              title="Clear All Notifications"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
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
