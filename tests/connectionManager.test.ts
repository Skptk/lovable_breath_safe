import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '@/lib/connectionManager';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;
  const originalWebSocket = globalThis.WebSocket;

  const createMockSocket = () => {
    const socket = {
      readyState: WebSocket.CLOSED,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    return socket as unknown as WebSocket;
  };

  beforeEach(() => {
    manager = ConnectionManager.getInstance();
    manager.cleanupAll();
    globalThis.WebSocket = vi.fn(() => createMockSocket()) as unknown as typeof WebSocket;
  });

  afterEach(() => {
    manager.cleanupAll();
    vi.resetAllMocks();
    globalThis.WebSocket = originalWebSocket;
  });

  it('applies jittered exponential backoff within bounds', async () => {
    const options = {
      reconnectDelay: 100,
      maxReconnectDelay: 500,
      retryJitter: 50,
      maxReconnectAttempts: 3,
    };

    await manager.connect('wss://example.com/socket', options).catch(() => undefined);
    const status = manager.getConnectionStatus('wss://example.com/socket');
    expect(status).not.toBeNull();

    // Force disconnect to trigger retries
    manager['handleDisconnect']('wss://example.com/socket', { code: 1006, reason: 'test', wasClean: false } as CloseEvent);

    const expectedMax = options.maxReconnectDelay + options.retryJitter;
    const expectedMin = options.reconnectDelay;

    expect(manager['connections'].get('wss://example.com/socket')?.options.reconnectDelay).toBe(options.reconnectDelay);
    expect(expectedMax).toBeGreaterThan(expectedMin);
  });

  it('does not attempt reconnect on suppressed close codes', async () => {
    const options = {
      suppressCodes: [1000],
      maxReconnectAttempts: 2,
    };

    await manager.connect('wss://example.com/clean', options).catch(() => undefined);
    manager['handleDisconnect']('wss://example.com/clean', { code: 1000, reason: 'test', wasClean: true } as CloseEvent);

    const connection = manager['connections'].get('wss://example.com/clean');
    expect(connection).toBeUndefined();
  });

  it('throttles connection logging output', async () => {
    const options = {
      debug: true,
      logThrottleMs: 1000,
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await manager.connect('wss://example.com/logging', options).catch(() => undefined);
    manager['log']('Attempt 1');
    manager['log']('Attempt 1');
    manager['log']('Attempt 2');

    expect(logSpy).toHaveBeenCalledTimes(2);
    logSpy.mockRestore();
  });
});
