import { useCallback, useEffect, useRef } from 'react';

export type MessageScheduleStrategy = 'timeout' | 'idle' | 'animationFrame' | 'microtask';

export interface UseOptimizedMessageHandlingOptions<T> {
  debounceMs?: number;
  maxQueueSize?: number;
  dedupeBy?: (payload: T) => string | number | symbol | null | undefined;
  transform?: (payload: T) => T;
  onQueueOverflow?: (droppedPayload: T) => void;
  schedule?: MessageScheduleStrategy;
  debugLabel?: string;
}

export interface UseOptimizedMessageHandlingResult<T> {
  enqueue: (payload: T) => void;
  flush: () => void;
  cancel: () => void;
  getPendingCount: () => number;
}

const hasWindow = typeof window !== 'undefined';
const requestIdle = hasWindow ? (window as any).requestIdleCallback?.bind(window) : undefined;
const cancelIdle = hasWindow ? (window as any).cancelIdleCallback?.bind(window) : undefined;

interface ScheduleState {
  timeoutId?: number;
  idleId?: number;
  rafId?: number;
  microtaskPending?: boolean;
}

const DEFAULT_MAX_QUEUE = 32;
const DEFAULT_SCHEDULE: MessageScheduleStrategy = 'idle';

/**
 * Provides a highly optimized message handler that coalesces payload bursts,
 * deduplicates updates, and schedules execution off the main render path.
 */
export function useOptimizedMessageHandling<T>(
  handler: (payload: T) => void,
  options: UseOptimizedMessageHandlingOptions<T> = {}
): UseOptimizedMessageHandlingResult<T> {
  const handlerRef = useRef(handler);
  const optionsRef = useRef<UseOptimizedMessageHandlingOptions<T>>({ ...options });
  const queueRef = useRef<T[]>([]);
  const dedupeMapRef = useRef<Map<string | number | symbol, T> | null>(
    options.dedupeBy ? new Map() : null
  );
  const scheduleStateRef = useRef<ScheduleState>({});
  const flushScheduledRef = useRef(false);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    optionsRef.current = {
      maxQueueSize: options.maxQueueSize ?? DEFAULT_MAX_QUEUE,
      schedule: options.schedule ?? DEFAULT_SCHEDULE,
      ...options,
    };

    if (options.dedupeBy && !dedupeMapRef.current) {
      dedupeMapRef.current = new Map();
    }

    if (!options.dedupeBy) {
      dedupeMapRef.current = null;
    }
  }, [options]);

  const logDebug = useCallback((message: string, extra?: Record<string, unknown>) => {
    const label = optionsRef.current.debugLabel;
    if (!label) return;

    if (extra) {
      console.debug(`[${label}] ${message}`, extra);
    } else {
      console.debug(`[${label}] ${message}`);
    }
  }, []);

  const clearScheduledWork = useCallback(() => {
    const schedule = scheduleStateRef.current;

    if (schedule.timeoutId !== undefined) {
      clearTimeout(schedule.timeoutId);
      schedule.timeoutId = undefined;
    }

    if (schedule.idleId !== undefined && cancelIdle) {
      cancelIdle(schedule.idleId);
      schedule.idleId = undefined;
    }

    if (schedule.rafId !== undefined && hasWindow && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(schedule.rafId);
      schedule.rafId = undefined;
    }

    schedule.microtaskPending = false;
  }, []);

  const flush = useCallback(() => {
    const dedupeMap = dedupeMapRef.current;
    const queue = queueRef.current;

    flushScheduledRef.current = false;
    clearScheduledWork();

    const items: T[] = dedupeMap ? Array.from(dedupeMap.values()) : queue.slice();
    if (dedupeMap) {
      dedupeMap.clear();
    }
    queue.length = 0;

    if (items.length === 0) {
      return;
    }

    const start = typeof performance !== 'undefined' ? performance.now() : 0;
    const currentHandler = handlerRef.current;

    for (const item of items) {
      try {
        currentHandler(item);
      } catch (error) {
        console.error('[useOptimizedMessageHandling] Handler execution failed', error);
      }
    }

    if (start && typeof performance !== 'undefined') {
      const duration = performance.now() - start;
      if (duration > 16 && optionsRef.current.debugLabel) {
        console.warn(
          `[${optionsRef.current.debugLabel}] Message batch processing took ${duration.toFixed(2)}ms`,
          { batchSize: items.length }
        );
      }
    }
  }, [clearScheduledWork]);

  const scheduleFlush = useCallback(() => {
    const opts = optionsRef.current;
    const schedule = scheduleStateRef.current;

    const runFlush = () => {
      flush();
    };

    if (opts.debounceMs && opts.debounceMs > 0) {
      flushScheduledRef.current = true;
      if (schedule.timeoutId !== undefined) {
        clearTimeout(schedule.timeoutId);
      }
      schedule.timeoutId = setTimeout(runFlush, opts.debounceMs) as unknown as number;
      return;
    }

    if (flushScheduledRef.current) {
      return;
    }

    flushScheduledRef.current = true;

    switch (opts.schedule) {
      case 'animationFrame':
        if (hasWindow && window.requestAnimationFrame) {
          schedule.rafId = window.requestAnimationFrame(() => {
            schedule.rafId = undefined;
            runFlush();
          });
          return;
        }
        break;
      case 'idle':
        if (requestIdle) {
          schedule.idleId = requestIdle(() => {
            schedule.idleId = undefined;
            runFlush();
          });
          return;
        }
        break;
      case 'microtask':
        if (!schedule.microtaskPending) {
          schedule.microtaskPending = true;
          Promise.resolve().then(() => {
            if (!schedule.microtaskPending) {
              return;
            }
            schedule.microtaskPending = false;
            runFlush();
          });
        }
        return;
      case 'timeout':
      default:
        break;
    }

    schedule.timeoutId = setTimeout(() => {
      schedule.timeoutId = undefined;
      runFlush();
    }, 0) as unknown as number;
  }, [flush]);

  const enqueue = useCallback(
    (incomingPayload: T) => {
      const opts = optionsRef.current;
      const payload = opts.transform ? opts.transform(incomingPayload) : incomingPayload;

      if (opts.dedupeBy) {
        if (!dedupeMapRef.current) {
          dedupeMapRef.current = new Map();
        }
        const dedupeKey = opts.dedupeBy(payload);
        if (dedupeKey !== null && dedupeKey !== undefined) {
          dedupeMapRef.current!.set(dedupeKey, payload);
        } else {
          queueRef.current.push(payload);
        }
      } else {
        queueRef.current.push(payload);
        const maxQueue = opts.maxQueueSize ?? DEFAULT_MAX_QUEUE;
        if (maxQueue > 0 && queueRef.current.length > maxQueue) {
          const dropped = queueRef.current.shift();
          if (dropped) {
            opts.onQueueOverflow?.(dropped);
            logDebug('Queue overflow – dropping oldest payload', { dropped });
          }
        }
      }

      if (opts.dedupeBy && opts.maxQueueSize && opts.maxQueueSize > 0 && dedupeMapRef.current) {
        if (dedupeMapRef.current.size > opts.maxQueueSize) {
          const iterator = dedupeMapRef.current.keys().next();
          if (!iterator.done) {
            const oldestKey = iterator.value;
            const dropped = dedupeMapRef.current.get(oldestKey);
            dedupeMapRef.current.delete(oldestKey);
            if (dropped) {
              opts.onQueueOverflow?.(dropped);
              logDebug('Dedupe map overflow – dropping oldest payload', { dropped });
            }
          }
        }
      }

      scheduleFlush();
    },
    [logDebug, scheduleFlush]
  );

  const cancel = useCallback(() => {
    queueRef.current.length = 0;
    dedupeMapRef.current?.clear();
    flushScheduledRef.current = false;
    clearScheduledWork();
  }, [clearScheduledWork]);

  useEffect(() => cancel, [cancel]);

  const getPendingCount = useCallback(() => {
    if (dedupeMapRef.current) {
      return dedupeMapRef.current.size;
    }
    return queueRef.current.length;
  }, []);

  return {
    enqueue,
    flush,
    cancel,
    getPendingCount,
  };
}
