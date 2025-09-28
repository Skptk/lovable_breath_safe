import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ReflowOptimizationOptions<T> {
  maxSyncMeasuresPerFrame?: number;
  minMeasureIntervalMs?: number;
  measure?: () => T;
  onMeasure?: (value: T) => void;
  onThrash?: (details: { measuresInFrame: number; lastMeasureDuration: number }) => void;
  useIdleCallback?: boolean;
  debugLabel?: string;
}

export interface ReflowMeasureResult<T> {
  value: T | null;
  timestamp: number;
  duration: number;
}

export interface ReflowOptimizationHandle<T> {
  runMeasurement: () => Promise<ReflowMeasureResult<T> | null>;
  scheduleMeasurement: () => void;
  cancelScheduledMeasurement: () => void;
  getLastResult: () => ReflowMeasureResult<T> | null;
  isMeasurementPending: () => boolean;
  layoutThrashCount: number;
}

const hasWindow = typeof window !== 'undefined';
const globalScope: typeof globalThis | undefined = typeof globalThis !== 'undefined' ? globalThis : undefined;
const isTestEnvironment = Boolean(
  (typeof process !== 'undefined' && (process.env?.['VITEST'] || process.env?.['NODE_ENV'] === 'test')) ||
  (typeof import.meta !== 'undefined' && (((import.meta as any)?.env?.VITEST) || ((import.meta as any)?.env?.MODE === 'test'))) ||
  (globalScope && ((globalScope as any).__vitest_worker__ || (globalScope as any).__vitest__ || (globalScope as any).vitest))
);
const requestAnimationFrameSafe = hasWindow ? window.requestAnimationFrame.bind(window) : undefined;
const cancelAnimationFrameSafe = hasWindow ? window.cancelAnimationFrame.bind(window) : undefined;
const requestIdleCallbackSafe = hasWindow ? (window as any).requestIdleCallback?.bind(window) : undefined;
const cancelIdleCallbackSafe = hasWindow ? (window as any).cancelIdleCallback?.bind(window) : undefined;

const DEFAULT_MAX_SYNC_PER_FRAME = 3;
const DEFAULT_MIN_INTERVAL_MS = 32;

const noopHandle = {
  runMeasurement: async () => null,
  scheduleMeasurement: () => {},
  cancelScheduledMeasurement: () => {},
  getLastResult: () => null,
  isMeasurementPending: () => false,
  layoutThrashCount: 0,
} as const satisfies ReflowOptimizationHandle<unknown>;

export function useReflowOptimization<T = DOMRect>(
  options: ReflowOptimizationOptions<T> = {}
): ReflowOptimizationHandle<T> {
  const { useIdleCallback = true, ...restOptions } = options;

  if (!hasWindow || isTestEnvironment) {
    return noopHandle as ReflowOptimizationHandle<T>;
  }

  const raf = requestAnimationFrameSafe;
  const caf = cancelAnimationFrameSafe;
  const ric = requestIdleCallbackSafe;
  const cic = cancelIdleCallbackSafe;

  const {
    maxSyncMeasuresPerFrame = DEFAULT_MAX_SYNC_PER_FRAME,
    minMeasureIntervalMs = DEFAULT_MIN_INTERVAL_MS,
    measure,
    onMeasure,
    onThrash,
    debugLabel,
  } = restOptions;

  const lastResultRef = useRef<ReflowMeasureResult<T> | null>(null);
  const lastMeasureTsRef = useRef(0);
  const measuresInFrameRef = useRef(0);
  const layoutThrashCountRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const idleIdRef = useRef<number | null>(null);
  const pendingPromiseRef = useRef<Promise<ReflowMeasureResult<T> | null> | null>(null);
  const resolvePendingRef = useRef<((result: ReflowMeasureResult<T> | null) => void) | null>(null);
  const [, forceRender] = useState(0);

  const logDebug = useCallback(
    (message: string, extra?: Record<string, unknown>) => {
      if (!debugLabel) return;
      if (extra) {
        console.debug(`[${debugLabel}] ${message}`, extra);
      } else {
        console.debug(`[${debugLabel}] ${message}`);
      }
    },
    [debugLabel]
  );

  const cleanupScheduled = useCallback(() => {
    if (rafIdRef.current !== null && caf) {
      caf(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (idleIdRef.current !== null && cic) {
      cic(idleIdRef.current);
      idleIdRef.current = null;
    }
  }, []);

  const resolvePending = useCallback((result: ReflowMeasureResult<T> | null) => {
    if (resolvePendingRef.current) {
      resolvePendingRef.current(result);
      resolvePendingRef.current = null;
    }
    pendingPromiseRef.current = null;
  }, []);

  const recordResult = useCallback((value: T, duration: number): ReflowMeasureResult<T> => {
    const result: ReflowMeasureResult<T> = {
      value,
      timestamp: performance.now(),
      duration,
    };
    lastResultRef.current = result;
    lastMeasureTsRef.current = result.timestamp;
    return result;
  }, []);

  const performMeasurement = useCallback(async () => {
    if (typeof measure !== 'function') {
      logDebug('Measurement skipped: no measure function provided');
      return null;
    }

    const now = performance.now();
    if (now - lastMeasureTsRef.current < minMeasureIntervalMs) {
      logDebug('Measurement throttled by minMeasureIntervalMs');
      return lastResultRef.current;
    }

    const currentFrameMeasures = measuresInFrameRef.current;
    if (currentFrameMeasures >= maxSyncMeasuresPerFrame) {
      layoutThrashCountRef.current += 1;
      logDebug('Layout thrash detected', {
        measuresInFrame: currentFrameMeasures,
      });
      onThrash?.({
        measuresInFrame: currentFrameMeasures,
        lastMeasureDuration: lastResultRef.current?.duration ?? 0,
      });
      return lastResultRef.current;
    }

    measuresInFrameRef.current = currentFrameMeasures + 1;

    const start = performance.now();
    let value: T;
    try {
      value = measure();
    } catch (error) {
      console.error('[useReflowOptimization] Measurement failed', error);
      measuresInFrameRef.current = currentFrameMeasures;
      return lastResultRef.current;
    }
    const end = performance.now();

    const result = recordResult(value, end - start);
    onMeasure?.(result.value as T);
    logDebug('Measurement completed', {
      duration: result.duration,
      measuresInFrame: measuresInFrameRef.current,
    });
    return result;
  }, [logDebug, maxSyncMeasuresPerFrame, measure, minMeasureIntervalMs, onMeasure, onThrash, recordResult]);

  const runMeasurement = useCallback((): Promise<ReflowMeasureResult<T> | null> => {
    if (pendingPromiseRef.current) {
      return pendingPromiseRef.current;
    }

    const promise = new Promise<ReflowMeasureResult<T> | null>((resolve) => {
      resolvePendingRef.current = resolve;
    });

    pendingPromiseRef.current = promise;

    Promise.resolve()
      .then(() => performMeasurement())
      .then((result) => {
        resolvePending(result);
        return result;
      })
      .catch((error) => {
        console.error('[useReflowOptimization] Measurement error', error);
        resolvePending(null);
      });

    return promise;
  }, [performMeasurement, resolvePending]);

  const scheduleMeasurement = useCallback(() => {
    cleanupScheduled();

    const schedule = () => {
      if (pendingPromiseRef.current) {
        logDebug('Measurement already pending');
        return;
      }
      runMeasurement().finally(() => {
        measuresInFrameRef.current = 0;
        cleanupScheduled();
      });
    };

    if (useIdleCallback && ric) {
      idleIdRef.current = ric(() => {
        schedule();
      });
      return;
    }

    if (raf) {
      rafIdRef.current = raf(() => {
        schedule();
      });
      return;
    }

    setTimeout(schedule, 0);
  }, [cleanupScheduled, logDebug, runMeasurement, useIdleCallback]);

  const cancelScheduledMeasurement = useCallback(() => {
    cleanupScheduled();
  }, [cleanupScheduled]);

  const getLastResult = useCallback(() => lastResultRef.current, []);
  const isMeasurementPending = useCallback(() => pendingPromiseRef.current !== null, []);

  useEffect(() => {
    const resetCounter = () => {
      measuresInFrameRef.current = 0;
    };

    let frameId: number | null = null;
    const loop = () => {
      resetCounter();
      frameId = raf?.(loop) ?? null;
    };

    frameId = raf?.(loop) ?? null;

    return () => {
      if (frameId !== null && caf) {
        caf(frameId);
      }
      cleanupScheduled();
      resolvePending(null);
    };
  }, [cleanupScheduled, resolvePending]);

  useEffect(() => {
    if (!measure) {
      return;
    }

    scheduleMeasurement();
  }, [measure, scheduleMeasurement]);

  const handle = useMemo<ReflowOptimizationHandle<T>>(
    () => ({
      runMeasurement,
      scheduleMeasurement,
      cancelScheduledMeasurement,
      getLastResult,
      isMeasurementPending,
      layoutThrashCount: layoutThrashCountRef.current,
    }),
    [cancelScheduledMeasurement, getLastResult, isMeasurementPending, runMeasurement, scheduleMeasurement]
  );

  useEffect(() => {
    forceRender((value) => value + 1);
  }, []);

  return handle;
}
