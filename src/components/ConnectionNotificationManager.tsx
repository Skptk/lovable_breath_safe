import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConnectionNotification, { ConnectionStatus } from './ConnectionNotification';
import { logConnection } from '@/lib/logger';

export interface ConnectionState {
  status: ConnectionStatus;
  message?: string;
  timestamp: number;
  priority: number;
}

export interface ConnectionNotificationManagerProps {
  connectionStatus: ConnectionStatus;
  connectionMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ConnectionNotificationManager: React.FC<ConnectionNotificationManagerProps> = ({
  connectionStatus,
  connectionMessage,
  onRetry,
  onDismiss
}) => {
  const [currentNotification, setCurrentNotification] = useState<ConnectionState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const statusHistoryRef = useRef<ConnectionState[]>([]);
  const dismissCountRef = useRef(0); // Track dismiss count to prevent spam
  const statusDebounceRef = useRef<NodeJS.Timeout>(); // Debounce rapid status changes
  const lastStatusChangeRef = useRef<number>(0); // Track when status last changed

  // Priority system for different connection statuses
  const getStatusPriority = (status: ConnectionStatus): number => {
    switch (status) {
      case 'error': return 5;        // Highest priority
      case 'disconnected': return 4;
      case 'reconnecting': return 3;
      case 'connecting': return 2;
      case 'connected': return 1;    // Lowest priority (good status)
      default: return 0;
    }
  };

  // Determine if we should show a new notification
  const shouldShowNotification = useCallback((newStatus: ConnectionStatus, newPriority: number): boolean => {
    if (!currentNotification) {
      // For first notification, only show if it's an actual problem
      return newStatus === 'disconnected' || newStatus === 'error';
    }
    
    // Don't show lower priority notifications when higher priority ones are active
    if (newPriority < currentNotification.priority) return false;
    
    // Don't show transient connection states during normal operations
    if (newStatus === 'connecting' || newStatus === 'reconnecting') {
      return false; // These are temporary states, no need to notify user
    }
    
    // Don't show 'connected' notifications unless user was previously disconnected
    if (newStatus === 'connected' && currentNotification.status !== 'disconnected' && currentNotification.status !== 'error') {
      return false;
    }
    
    // Don't show the same status repeatedly unless it's been a while
    if (newStatus === currentNotification.status) {
      const timeSinceLast = Date.now() - currentNotification.timestamp;
      return timeSinceLast > 30000; // 30 seconds minimum between same status to reduce spam
    }
    
    return true;
  }, [currentNotification]);

  // Handle status transitions smoothly
  const transitionToNewStatus = useCallback((newStatus: ConnectionStatus, newMessage?: string) => {
    const newPriority = getStatusPriority(newStatus);
    
    if (!shouldShowNotification(newStatus, newPriority)) {
      return;
    }

    // Start transition
    setIsTransitioning(true);
    
    // Clear any existing transition timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Wait for current notification to fade out, then show new one
    transitionTimeoutRef.current = setTimeout(() => {
      const newNotification: ConnectionState = {
        status: newStatus,
        message: newMessage,
        timestamp: Date.now(),
        priority: newPriority
      };

      setCurrentNotification(newNotification);
      statusHistoryRef.current.push(newNotification);
      
      // Keep only last 10 status changes
      if (statusHistoryRef.current.length > 10) {
        statusHistoryRef.current.shift();
      }
      
      setIsTransitioning(false);
    }, 300); // Match the fade out duration
  }, [shouldShowNotification]);

  // Update notification when connection status changes with debouncing
  useEffect(() => {
    if (!connectionStatus || isTransitioning) return;
    
    // Track status change timing for smart notifications
    const now = Date.now();
    const timeSinceLastChange = now - lastStatusChangeRef.current;
    lastStatusChangeRef.current = now;
    
    // Clear existing debounce timeout
    if (statusDebounceRef.current) {
      clearTimeout(statusDebounceRef.current);
    }
    
    // For quick reconnections (less than 3 seconds), use longer debounce to avoid spam
    const debounceTime = timeSinceLastChange < 3000 ? 2000 : 500;
    
    // Debounce rapid status changes to prevent notification spam
    statusDebounceRef.current = setTimeout(() => {
      transitionToNewStatus(connectionStatus, connectionMessage);
    }, debounceTime);
    
    return () => {
      if (statusDebounceRef.current) {
        clearTimeout(statusDebounceRef.current);
      }
    };
  }, [connectionStatus, connectionMessage, transitionToNewStatus, isTransitioning]);

  // CRITICAL FIX: Handle notification dismissal without infinite loops
  const handleDismiss = useCallback(() => {
    // Prevent infinite dismissal loops
    dismissCountRef.current++;
    if (dismissCountRef.current > 10) {
              logConnection.warn('Too many dismissals, preventing spam');
      return;
    }

    setIsTransitioning(true);
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentNotification(null);
      setIsTransitioning(false);
      
      // Only call onDismiss if it exists and hasn't been called recently
      if (onDismiss && dismissCountRef.current <= 5) {
        try {
          onDismiss();
        } catch (error) {
          logConnection.warn('Error in onDismiss', { error: error.message });
        }
      }
    }, 300);
  }, [onDismiss]);

  // Handle retry action
  const handleRetry = useCallback(() => {
    if (onRetry) {
      try {
        onRetry();
      } catch (error) {
        logConnection.warn('Error in onRetry', { error: error.message });
      }
    }
  }, [onRetry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (statusDebounceRef.current) {
        clearTimeout(statusDebounceRef.current);
      }
    };
  }, []);

  // Don't render anything if no notification or transitioning
  if (!currentNotification || isTransitioning) {
    return null;
  }

  return (
    <ConnectionNotification
      status={currentNotification.status}
      message={currentNotification.message}
      onRetry={handleRetry}
      onDismiss={handleDismiss}
      autoDismiss={currentNotification.status === 'connected'}
      dismissDelay={currentNotification.status === 'connected' ? 2000 : 8000} // Quick dismiss for good news
    />
  );
};

export default ConnectionNotificationManager;
