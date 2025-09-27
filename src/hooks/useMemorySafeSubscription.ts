import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_BACKOFF_MULTIPLIER = 6; // 500 * 2^6 ≈ 32_000 (capped at MAX_RETRY_DELAY_MS)

export type MemorySafeSubscriptionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface MemorySafePostgresConfig {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  filter?: string;
}

export interface UseMemorySafeSubscriptionOptions<TPayload> {
  channelName: string;
  postgres?: MemorySafePostgresConfig | MemorySafePostgresConfig[];
  onMessage: (payload: TPayload) => void;
  enabled?: boolean;
  maxRetries?: number;
  connectionTimeoutMs?: number;
  retryBaseDelayMs?: number;
  debugLabel?: string;
}

export interface UseMemorySafeSubscriptionResult {
  status: MemorySafeSubscriptionStatus;
  error: unknown;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

const noop = () => {};

const resolveEnvFlags = () => {
  const hasWindow = typeof window !== 'undefined';
  const globalScope: typeof globalThis | undefined =
    typeof globalThis !== 'undefined' ? globalThis : undefined;

  const isTestEnvironment = Boolean(
    (typeof process !== 'undefined' && (process.env?.['VITEST'] || process.env?.['NODE_ENV'] === 'test')) ||
    (typeof import.meta !== 'undefined' && (
      ((import.meta as any)?.env?.VITEST) ||
      ((import.meta as any)?.env?.MODE === 'test')
    )) ||
    (globalScope && (
      (globalScope as any).__vitest_worker__ ||
      (globalScope as any).__vitest__ ||
      (globalScope as any).vitest
    ))
  );

  return { hasWindow, isTestEnvironment };
};

type GenericPostgresPayload = {
  eventType: string;
  schema: string;
  table: string;
  commit_timestamp?: string;
  errors?: string[];
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
  [key: string]: unknown;
};

type ChannelStatus = 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR';

export function useMemorySafeSubscription<
  TPayload = GenericPostgresPayload
>(options: UseMemorySafeSubscriptionOptions<TPayload>): UseMemorySafeSubscriptionResult {
  const {
    channelName,
    postgres,
    onMessage,
    enabled = true,
    maxRetries = 3,
    connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
    retryBaseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
    debugLabel
  } = options;

  const envFlags = useMemo(() => resolveEnvFlags(), []);
  const disabled = !envFlags.hasWindow || envFlags.isTestEnvironment;
  const effectiveEnabled = enabled && !disabled;

  const [status, setStatus] = useState<MemorySafeSubscriptionStatus>('idle');
  const [error, setError] = useState<unknown>(null);

  const normalizedConfigs = useMemo<MemorySafePostgresConfig[]>(() => {
    if (!postgres) {
      return [];
    }
    return Array.isArray(postgres) ? postgres : [postgres];
  }, [postgres]);

  const onMessageRef = useRef(onMessage);
  const debugLabelRef = useRef(debugLabel ?? channelName);
  const enabledRef = useRef(effectiveEnabled);
  const maxRetriesRef = useRef(maxRetries);
  const retryBaseDelayRef = useRef(retryBaseDelayMs);

  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryAttemptRef = useRef(0);
  const isSubscribingRef = useRef(false);

  const subscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    debugLabelRef.current = debugLabel ?? channelName;
  }, [debugLabel, channelName]);

  useEffect(() => {
    enabledRef.current = effectiveEnabled;
  }, [effectiveEnabled]);

  useEffect(() => {
    maxRetriesRef.current = maxRetries;
  }, [maxRetries]);

  useEffect(() => {
    retryBaseDelayRef.current = retryBaseDelayMs;
  }, [retryBaseDelayMs]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearScheduledReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current !== null) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearScheduledReconnect();
    clearConnectionTimeout();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (channelRef.current) {
      const existingChannel = channelRef.current;
      channelRef.current = null;
      void existingChannel.unsubscribe().catch(unsubscribeError => {
        console.warn(
          `[useMemorySafeSubscription] Failed to unsubscribe ${debugLabelRef.current}`,
          unsubscribeError
        );
      });
    }

    isSubscribingRef.current = false;
  }, [clearConnectionTimeout, clearScheduledReconnect]);

  const scheduleReconnect = useCallback(
    (reason?: unknown) => {
      if (!mountedRef.current || !enabledRef.current || disabled) {
        return;
      }

      const attempted = retryAttemptRef.current;
      if (attempted >= maxRetriesRef.current) {
        setStatus(prev => (prev === 'connected' ? prev : 'error'));
        if (reason) {
          setError(reason);
        }
        return;
      }

      const baseDelay = retryBaseDelayRef.current;
      const backoffMultiplier = Math.min(attempted, MAX_RETRY_BACKOFF_MULTIPLIER);
      const delay = Math.min(baseDelay * Math.pow(2, backoffMultiplier), MAX_RETRY_DELAY_MS);

      retryAttemptRef.current += 1;

      clearScheduledReconnect();
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current || !enabledRef.current || disabled) {
          return;
        }
        subscribeRef.current?.();
      }, delay);
    },
    [clearScheduledReconnect, disabled]
  );

  const subscribe = useCallback(() => {
    if (disabled || isSubscribingRef.current || !mountedRef.current) {
      return;
    }

    cleanup();

    if (!enabledRef.current) {
      setStatus('idle');
      return;
    }

    isSubscribingRef.current = true;
    retryAttemptRef.current = 0;
    setStatus('connecting');
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (connectionTimeoutMs > 0) {
      clearConnectionTimeout();
      connectionTimeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }
        const timeoutError = new Error(
          `[useMemorySafeSubscription] Connection timed out for ${debugLabelRef.current}`
        );
        setStatus('error');
        setError(timeoutError);
        cleanup();
        scheduleReconnect(timeoutError);
      }, connectionTimeoutMs);
    }

    const ensureRealtimeReady = async () => {
      while (!abortController.signal.aborted && !supabase.realtime.isConnected()) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      if (
        abortController.signal.aborted ||
        !mountedRef.current ||
        !enabledRef.current ||
        disabled
      ) {
        isSubscribingRef.current = false;
        return;
      }

      const channel = supabase.channel(channelName);

      normalizedConfigs.forEach(config => {
        (channel as unknown as {
          on: (
            type: 'postgres_changes',
            filter: {
              event: string;
              schema: string;
              table: string;
              filter?: string;
            },
            callback: (payload: GenericPostgresPayload) => void
          ) => RealtimeChannel;
        }).on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema,
            table: config.table,
            filter: config.filter
          },
          (payload: GenericPostgresPayload) => {
            try {
              onMessageRef.current(payload as unknown as TPayload);
            } catch (handlerError) {
              console.error(
                `[useMemorySafeSubscription] Handler error for ${debugLabelRef.current}:`,
                handlerError
              );
            }
          }
        );
      });

      channelRef.current = channel;

      channel.subscribe((subscriptionStatus: ChannelStatus, subscriptionError) => {
        if (!mountedRef.current) {
          return;
        }

        switch (subscriptionStatus) {
          case 'SUBSCRIBED': {
            isSubscribingRef.current = false;
            clearConnectionTimeout();
            retryAttemptRef.current = 0;
            setStatus('connected');
            break;
          }
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT': {
            isSubscribingRef.current = false;
            clearConnectionTimeout();
            const errorToReport =
              subscriptionError ??
              new Error(
                `[useMemorySafeSubscription] Subscription error (${subscriptionStatus}) for ${debugLabelRef.current}`
              );
            setStatus('error');
            setError(errorToReport);
            cleanup();
            scheduleReconnect(errorToReport);
            break;
          }
          case 'CLOSED': {
            isSubscribingRef.current = false;
            clearConnectionTimeout();
            setStatus('idle');
            break;
          }
          default:
            break;
        }
      });
    };

    void ensureRealtimeReady();
  }, [
    channelName,
    cleanup,
    clearConnectionTimeout,
    connectionTimeoutMs,
    disabled,
    normalizedConfigs,
    scheduleReconnect
  ]);

  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  useEffect(() => {
    if (!effectiveEnabled) {
      cleanup();
      setStatus('idle');
      return;
    }

    subscribe();

    return () => {
      cleanup();
      setStatus('idle');
    };
  }, [cleanup, effectiveEnabled, subscribe, channelName, normalizedConfigs]);

  const reconnect = useCallback(() => {
    if (!mountedRef.current || !enabledRef.current || disabled) {
      return;
    }
    retryAttemptRef.current = 0;
    cleanup();
    subscribeRef.current?.();
  }, [cleanup, disabled]);

  const disconnect = useCallback(() => {
    enabledRef.current = false;
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  if (disabled) {
    return {
      status: 'idle',
      error: null,
      isConnected: false,
      reconnect: noop,
      disconnect: noop
    };
  }

  return {
    status,
    error,
    isConnected: status === 'connected',
    reconnect,
    disconnect
  };
}
