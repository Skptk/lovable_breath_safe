import { useEffect, useState, useCallback, useRef } from 'react';
import { connectionManager, ConnectionOptions } from '@/lib/connectionManager';

export interface UseWebSocketOptions extends ConnectionOptions {
  onMessage?: (event: MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectOnUnmount?: boolean;
}

export function useWebSocket(
  url: string | null,
  options: UseWebSocketOptions = {}
) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectOnUnmount = false,
    ...connectionOptions
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const reconnectOnUnmountRef = useRef(reconnectOnUnmount);

  // Handle message events
  const handleMessage = useCallback((event: MessageEvent) => {
    setLastMessage(event);
    onMessage?.(event);
  }, [onMessage]);

  // Handle connection open
  const handleOpen = useCallback((event: Event) => {
    setIsConnected(true);
    setError(null);
    onOpen?.(event);
  }, [onOpen]);

  // Handle connection close
  const handleClose = useCallback((event: CloseEvent) => {
    setIsConnected(false);
    onClose?.(event);
  }, [onClose]);

  // Handle errors
  const handleError = useCallback((event: Event) => {
    setError(new Error('WebSocket error'));
    onError?.(event);
  }, [onError]);

  // Send message function
  const sendMessage = useCallback(async (data: any) => {
    if (!url) {
      throw new Error('WebSocket URL is not set');
    }
    await connectionManager.send(connectionManager.getConnectionId(url), data);
  }, [url]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!url) return;

    try {
      const ws = await connectionManager.connect(url, connectionOptions);
      
      // Set up event listeners
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);

      return () => {
        ws.removeEventListener('message', handleMessage);
        ws.removeEventListener('open', handleOpen);
        ws.removeEventListener('close', handleClose);
        ws.removeEventListener('error', handleError);

        if (!reconnectOnUnmountRef.current) {
          connectionManager.disconnect(connectionManager.getConnectionId(url));
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
      return undefined;
    }
  }, [url, connectionOptions, handleMessage, handleOpen, handleClose, handleError]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (!url) return undefined;

    let cleanup: (() => void) | undefined;
    
    // Connect to WebSocket
    connect().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Cleanup function
    return () => {
      cleanup?.();
    };
  }, [url, connect]);

  // Update reconnectOnUnmount ref when prop changes
  useEffect(() => {
    reconnectOnUnmountRef.current = reconnectOnUnmount;
  }, [reconnectOnUnmount]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    reconnect: connect,
    disconnect: useCallback(() => {
      if (url) {
        connectionManager.disconnect(connectionManager.getConnectionId(url));
      }
    }, [url]),
  };
}

// Hook for subscribing to WebSocket events
export function useWebSocketEvent<T = any>(
  url: string | null,
  eventType: string,
  callback: (data: T) => void,
  options: Omit<UseWebSocketOptions, 'onMessage'> = {}
) {
  const callbackRef = useRef(callback);
  
  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data.type === eventType) {
        callbackRef.current(data.payload);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [eventType]);

  return useWebSocket(url, {
    ...options,
    onMessage: handleMessage,
  });
}
