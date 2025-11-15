import { useEffect, useState, useCallback, useRef, startTransition } from 'react';
import { connectionManager, ConnectionOptions } from '@/lib/connectionManager';
import { debugLog, debugWarn, debugError } from '@/utils/debugFlags';

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
  const connectionOptionsRef = useRef(connectionOptions);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  const connectionIdRef = useRef<string | null>(null);

  connectionOptionsRef.current = connectionOptions;
  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;
  onCloseRef.current = onClose;
  onErrorRef.current = onError;

  const getConnectionId = useCallback((value: string | null) => {
    if (!value) return null;

    try {
      const parsed = new URL(value);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
    } catch {
      return value.toLowerCase();
    }
  }, []);

  // Handle message events
  // Optimized: Defer heavy operations to avoid blocking main thread
  const handleMessage = useCallback((event: MessageEvent) => {
    // Defer React state updates to avoid blocking message handler
    startTransition(() => {
      setLastMessage(event);
    });
    
    // Call user callback immediately (they control what it does)
    onMessageRef.current?.(event);
    
    // Defer debug logging to avoid blocking
    if (import.meta.env.DEV) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          debugLog('WebSocket', 'Message received', { url, data: event.data });
        }, { timeout: 500 });
      } else {
        setTimeout(() => {
          debugLog('WebSocket', 'Message received', { url, data: event.data });
        }, 0);
      }
    }
  }, [url]);

  // Handle connection open
  const handleOpen = useCallback((event: Event) => {
    setIsConnected(true);
    setError(null);
    onOpenRef.current?.(event);
    debugLog('WebSocket', 'Connection opened', { url });
  }, []);

  // Handle connection close
  const handleClose = useCallback((event: CloseEvent) => {
    setIsConnected(false);
    onCloseRef.current?.(event);
    debugWarn('WebSocket', 'Connection closed', { url, code: event.code, reason: event.reason });
  }, []);

  // Handle errors
  const handleError = useCallback((event: Event) => {
    setError(new Error('WebSocket error'));
    onErrorRef.current?.(event);
    debugError('WebSocket', 'Connection error', { url, event });
  }, []);

  // Send message function
  const sendMessage = useCallback(async (data: any) => {
    const connectionId = connectionIdRef.current;
    if (!connectionId) {
      throw new Error('WebSocket URL is not set');
    }
    debugLog('WebSocket', 'Sending message', { connectionId, data });
    await connectionManager.send(connectionId, data);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!url) {
      debugWarn('WebSocket', 'Connect called with null URL');
      return;
    }

    const connectionId = getConnectionId(url);
    connectionIdRef.current = connectionId;
    debugLog('WebSocket', 'Connecting', { url, connectionId, options: connectionOptionsRef.current });

    try {
      const ws = await connectionManager.connect(url, connectionOptionsRef.current);
      
      // Set up event listeners
      // Note: WebSocket events don't support passive option, but handlers are optimized
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);

      return () => {
        ws.removeEventListener('message', handleMessage);
        ws.removeEventListener('open', handleOpen);
        ws.removeEventListener('close', handleClose);
        ws.removeEventListener('error', handleError);

        if (!reconnectOnUnmountRef.current && connectionId) {
          debugLog('WebSocket', 'Disconnecting on cleanup', { connectionId });
          connectionManager.disconnect(connectionId);
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect to WebSocket'));
      debugError('WebSocket', 'Failed to connect', { url, error: err });
      return undefined;
    }
  }, [url, getConnectionId, handleMessage, handleOpen, handleClose, handleError]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (!url) return;

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

  useEffect(() => {
    connectionIdRef.current = getConnectionId(url);
    debugLog('WebSocket', 'Connection ID updated', { url, connectionId: connectionIdRef.current });
  }, [url, getConnectionId]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    reconnect: connect,
    disconnect: useCallback(() => {
      const connectionId = connectionIdRef.current;
      if (connectionId) {
        connectionManager.disconnect(connectionId);
      }
    }, []),
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
