import { EventEmitter } from 'events';
import { memoryMonitor } from '@/utils/memoryMonitor';

export interface ConnectionOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  timeout?: number;
  debug?: boolean;
  retryJitter?: number;
  retryBackoffMultiplier?: number;
  suppressCodes?: number[];
  logThrottleMs?: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastActivity: number;
  reconnectAttempts: number;
  lastError?: Error;
}

export class ConnectionManager extends EventEmitter {
  private static instance: ConnectionManager;
  
  private connections: Map<string, {
    ws: WebSocket | null;
    status: ConnectionStatus;
    options: Required<ConnectionOptions>;
    reconnectTimeout: NodeJS.Timeout | null;
    pingInterval: NodeJS.Timeout | null;
    messageQueue: Array<{ data: any; resolve: () => void; reject: (error: Error) => void }>;
  }> = new Map();
  
  private defaultOptions: Required<ConnectionOptions> = {
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    timeout: 10000,
    debug: process.env['NODE_ENV'] === 'development',
    retryJitter: 250,
    retryBackoffMultiplier: 2,
    suppressCodes: [1000, 1001, 1005],
    logThrottleMs: 2000,
  };

  private lastLogMessage = '';
  private lastLogTimestamp = 0;
  
  private constructor() {
    super();
    this.setupGlobalHandlers();
  }
  
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }
  
  private setupGlobalHandlers() {
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanupAll());
    }
    
    // Monitor memory usage
    memoryMonitor.addListener((usage) => {
      if (usage.percentUsed > 90) {
        this.log('High memory usage detected, cleaning up idle connections');
        this.cleanupIdleConnections(5 * 60 * 1000); // 5 minutes
      }
    });
  }
  
  private log(...args: any[]) {
    if (this.defaultOptions.debug) {
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');

      const now = Date.now();
      if (message !== this.lastLogMessage || now - this.lastLogTimestamp > this.defaultOptions.logThrottleMs) {
        console.log('[ConnectionManager]', ...args);
        this.lastLogMessage = message;
        this.lastLogTimestamp = now;
      }
    }
  }
  
  private error(...args: any[]) {
    console.error('[ConnectionManager]', ...args);
  }
  
  connect(url: string, options: ConnectionOptions = {}): Promise<WebSocket> {
    const connectionId = this.getConnectionId(url);
    const existingConnection = this.connections.get(connectionId);
    
    if (existingConnection?.ws?.readyState === WebSocket.OPEN) {
      this.log(`Reusing existing connection to ${url}`);
      return Promise.resolve(existingConnection.ws);
    }
    
    // Merge options with defaults
    const mergedOptions: Required<ConnectionOptions> = {
      ...this.defaultOptions,
      ...options,
    };
    
    return new Promise((resolve, reject) => {
      try {
        this.log(`Connecting to ${url}`);
        
        const ws = new WebSocket(url);
        let isConnected = false;
        
        // Setup connection timeout
        const timeout = setTimeout(() => {
          if (!isConnected) {
            this.handleConnectionError(connectionId, new Error(`Connection to ${url} timed out`));
            reject(new Error('Connection timeout'));
          }
        }, mergedOptions.timeout);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          isConnected = true;
          this.log(`Connected to ${url}`);
          
          this.setupConnection(connectionId, ws, mergedOptions);
          this.emit('connect', { url, connectionId });
          resolve(ws);
        };
        
        ws.onerror = (error) => {
          clearTimeout(timeout);
          if (!isConnected) {
            this.handleConnectionError(connectionId, new Error(`Connection error: ${error}`));
            reject(new Error('Connection error'));
          }
        };
        
        ws.onclose = (event) => {
          clearTimeout(timeout);
          if (isConnected) {
            this.handleDisconnect(connectionId, event);
          }
        };
        
      } catch (error) {
        this.error(`Failed to create WebSocket connection to ${url}:`, error);
        reject(error);
      }
    });
  }
  
  private setupConnection(
    connectionId: string,
    ws: WebSocket,
    options: Required<ConnectionOptions>
  ) {
    // Clean up any existing connection
    this.disconnect(connectionId);
    
    const connection = {
      ws,
      status: {
        isConnected: true,
        lastActivity: Date.now(),
        reconnectAttempts: 0,
      },
      options,
      reconnectTimeout: null as NodeJS.Timeout | null,
      pingInterval: null as NodeJS.Timeout | null,
      messageQueue: [] as Array<{ data: any; resolve: () => void; reject: (error: Error) => void }>,
    };
    
    // Setup ping/pong for connection health
    connection.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          this.error('Error sending ping:', error);
        }
      }
    }, 30000); // Send ping every 30 seconds
    
    // Update last activity on messages
    // Optimized: Throttle updates to avoid performance violations
    let lastActivityUpdate = 0;
    const ACTIVITY_UPDATE_THROTTLE = 100; // Only update every 100ms
    
    const onMessage = () => {
      const now = Date.now();
      if (now - lastActivityUpdate >= ACTIVITY_UPDATE_THROTTLE) {
        connection.status.lastActivity = now;
        lastActivityUpdate = now;
      }
    };
    
    ws.addEventListener('message', onMessage, { passive: true });
    
    // Store the connection
    this.connections.set(connectionId, connection);
    
    // Process any queued messages
    this.processMessageQueue(connectionId);
    
    return connection;
  }
  
  private handleDisconnect(connectionId: string, event: CloseEvent) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    connection.status.isConnected = false;
    
    // Clean up
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
      connection.pingInterval = null;
    }
    
    this.emit('disconnect', { 
      connectionId, 
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean 
    });
    
    // Attempt to reconnect if needed
    if (connection.options.suppressCodes.includes(event.code)) {
      this.log(`Not reconnecting ${connectionId}; close code ${event.code} is suppressed.`);
      this.cleanupConnection(connectionId);
      return;
    }

    if (connection.status.reconnectAttempts < connection.options.maxReconnectAttempts) {
      this.attemptReconnect(connectionId, event.code);
    } else {
      this.emit('reconnect_failed', { connectionId, reason: 'Max reconnection attempts reached' });
      this.cleanupConnection(connectionId);
    }
  }
  
  private attemptReconnect(connectionId: string, code?: number) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
  
    connection.status.reconnectAttempts++;
  
    // Calculate delay with exponential backoff
    const delay = Math.min(
      connection.options.reconnectDelay * Math.pow(connection.options.retryBackoffMultiplier, connection.status.reconnectAttempts - 1),
      connection.options.maxReconnectDelay
    );

    const jitter = Math.random() * connection.options.retryJitter;
    const effectiveDelay = delay + jitter;

    this.log(`Attempting to reconnect to ${connectionId} in ${Math.round(effectiveDelay)}ms (attempt ${connection.status.reconnectAttempts})`, { code });
  
    connection.reconnectTimeout = setTimeout(() => {
      const shouldReconnect = connection.ws?.readyState === WebSocket.CLOSED || connection.ws?.readyState === WebSocket.CLOSING;
      if (shouldReconnect) {
        this.connect(connectionId, connection.options).catch(error => {
          this.error(`Reconnection attempt ${connection.status.reconnectAttempts} failed:`, error);
        });
      }
    }, effectiveDelay);
  }
  
  private handleConnectionError(connectionId: string, error: Error) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    connection.status.lastError = error;
    this.emit('error', { connectionId, error });
    
    if (connection.ws) {
      connection.ws.close();
    }
  }
  
  private async processMessageQueue(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    while (connection.messageQueue.length > 0) {
      const next = connection.messageQueue[0];
      if (!next) {
        break;
      }

      const { data, resolve, reject } = next;
      
      try {
        await this.sendMessage(connection.ws, data);
        connection.messageQueue.shift();
        resolve();
      } catch (error) {
        reject(error as Error);
        break; // Stop processing on error
      }
    }
  }
  
  private sendMessage(ws: WebSocket, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        ws.send(JSON.stringify(data));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  send(connectionId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const connection = this.connections.get(connectionId);
      
      if (!connection) {
        reject(new Error(`No connection found for ${connectionId}`));
        return;
      }
      
      // Queue the message if not connected
      if (!connection.status.isConnected || !connection.ws || connection.ws.readyState !== WebSocket.OPEN) {
        connection.messageQueue.push({ data, resolve, reject });
        return;
      }
      
      // Send immediately if connected
      this.sendMessage(connection.ws, data)
        .then(resolve)
        .catch(reject);
    });
  }
  
  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    this.log(`Disconnecting from ${connectionId}`);
    
    // Clear any pending reconnection
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
      connection.reconnectTimeout = null;
    }
    
    // Clear ping interval
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
      connection.pingInterval = null;
    }
    
    // Close the WebSocket
    if (connection.ws) {
      try {
        connection.ws.close();
      } catch (error) {
        this.error('Error closing WebSocket:', error);
      }
      connection.ws = null;
    }
    
    // Reject any pending messages
    for (const { reject } of connection.messageQueue) {
      reject(new Error('Connection closed'));
    }
    
    this.connections.delete(connectionId);
    this.emit('disconnect', { connectionId });
  }
  
  getConnectionStatus(connectionId: string): ConnectionStatus | null {
    const connection = this.connections.get(connectionId);
    return connection ? { ...connection.status } : null;
  }
  
  cleanupIdleConnections(maxIdleTime: number): void {
    const now = Date.now();
    
    for (const [connectionId, connection] of this.connections.entries()) {
      const idleTime = now - connection.status.lastActivity;
      
      if (idleTime > maxIdleTime) {
        this.log(`Cleaning up idle connection: ${connectionId} (idle for ${idleTime}ms)`);
        this.disconnect(connectionId);
      }
    }
  }
  
  cleanupAll(): void {
    for (const connectionId of this.connections.keys()) {
      this.disconnect(connectionId);
    }
    
    this.connections.clear();
    this.emit('cleanup');
  }
  
  private getConnectionId(url: string): string {
    // Normalize URL to use as connection ID
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
  
  private cleanupConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    if (connection.reconnectTimeout) {
      clearTimeout(connection.reconnectTimeout);
    }
    
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
    }
    
    if (connection.ws) {
      try {
        connection.ws.close();
      } catch (error) {
        this.error('Error closing WebSocket during cleanup:', error);
      }
    }
    
    // Reject all queued messages
    for (const { reject } of connection.messageQueue) {
      reject(new Error('Connection cleaned up'));
    }
    
    this.connections.delete(connectionId);
  }
}

// Export singleton instance
export const connectionManager = ConnectionManager.getInstance();

// Add to window for debugging in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__CONNECTION_MANAGER = connectionManager;
}
