import { useEffect } from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { RealtimeProvider, useRealtime } from '@/contexts/RealtimeContext';
import {
  RealtimeProvider as OptimizedRealtimeProvider,
  useRealtime as useOptimizedRealtime
} from '@/contexts/OptimizedRealtimeContext';

const {
  mockSubscribeToChannel,
  mockUnsubscribeFromChannel,
  mockAddConnectionStatusListener,
  mockCleanupAllChannels,
  mockRealtimeManager
} = vi.hoisted(() => {
  (globalThis as any).__ENABLE_REALTIME_IN_TESTS__ = true;

  return {
    mockSubscribeToChannel: vi.fn(),
    mockUnsubscribeFromChannel: vi.fn(),
    mockAddConnectionStatusListener: vi.fn(() => () => {}),
    mockCleanupAllChannels: vi.fn(),
    mockRealtimeManager: {
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      onConnectionStatus: vi.fn(() => () => {})
    }
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' }
  })
}));

vi.mock('@/hooks/usePerformance', () => ({
  useThrottle: (fn: any) => fn,
}));

vi.mock('@/lib/realtimeClient', () => ({
  subscribeToChannel: mockSubscribeToChannel,
  unsubscribeFromChannel: mockUnsubscribeFromChannel,
  addConnectionStatusListener: mockAddConnectionStatusListener,
  cleanupAllChannels: mockCleanupAllChannels,
  realtimeManager: mockRealtimeManager
}));

describe('Realtime contexts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSubscribeToChannel.mockReset();
    mockUnsubscribeFromChannel.mockReset();
    mockAddConnectionStatusListener.mockReset().mockReturnValue(() => {});
    mockCleanupAllChannels.mockReset();
    mockRealtimeManager.subscribe.mockReset();
    mockRealtimeManager.unsubscribe.mockReset();
    mockRealtimeManager.onConnectionStatus.mockReset().mockReturnValue(() => {});

    if (!('requestAnimationFrame' in globalThis)) {
      (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0);
      (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
    }
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('batched dispatcher delivers every payload in order', async () => {
    let capturedHandler: ((payload: any) => void) | null = null;
    mockSubscribeToChannel.mockImplementation((_channel, handler) => {
      capturedHandler = handler;
    });

    const payloads = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const callback = vi.fn();

    const Consumer = () => {
      const { subscribeToUserPoints } = useRealtime();

      useEffect(() => {
        const unsubscribe = subscribeToUserPoints(callback);
        return () => unsubscribe();
      }, [subscribeToUserPoints]);

      return null;
    };

    render(
      <RealtimeProvider>
        <Consumer />
      </RealtimeProvider>
    );

    expect(mockSubscribeToChannel).toHaveBeenCalledOnce();
    expect(capturedHandler).toBeInstanceOf(Function);

    payloads.forEach((payload) => capturedHandler?.(payload));

    await act(async () => {
      vi.runAllTimers();
    });

    expect(callback).toHaveBeenCalledTimes(payloads.length);
    expect(callback.mock.calls.map(([arg]) => arg)).toEqual(payloads);
  });

  test('optimized realtime context avoids duplicate subscriptions for persistent channels', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const Consumer = () => {
      const { subscribeToNotifications } = useOptimizedRealtime();

      useEffect(() => {
        const unsubscribeFirst = subscribeToNotifications(firstCallback);
        unsubscribeFirst();
        const unsubscribeSecond = subscribeToNotifications(secondCallback);

        return () => {
          unsubscribeSecond();
        };
      }, [subscribeToNotifications]);

      return null;
    };

    render(
      <OptimizedRealtimeProvider>
        <Consumer />
      </OptimizedRealtimeProvider>
    );

    expect(mockRealtimeManager.subscribe).toHaveBeenCalledTimes(1);
    expect(mockRealtimeManager.unsubscribe).not.toHaveBeenCalled();
  });
});

