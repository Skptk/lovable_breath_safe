import type { QueryClient } from '@tanstack/react-query';
import { memoryMonitor } from './memoryMonitor';

const MB = 1024 * 1024;

export type HeapFailSafeLevel = 'warn' | 'critical' | 'emergency';

export interface HeapFailSafeEventDetail {
  level: HeapFailSafeLevel;
  usedMb: number;
  timestamp: number;
}

export type HeapFailSafeListener = (event: HeapFailSafeEventDetail) => void;

export interface HeapFailSafeOptions {
  queryClient?: QueryClient;
  warnThresholdMb?: number;
  criticalThresholdMb?: number;
  emergencyThresholdMb?: number;
  onWarn?: (usedMb: number) => void;
  onCritical?: (usedMb: number) => void;
  onEmergency?: (usedMb: number) => void;
}

const defaultOptions: Required<Pick<HeapFailSafeOptions, 'warnThresholdMb' | 'criticalThresholdMb' | 'emergencyThresholdMb'>> = {
  warnThresholdMb: 70,
  criticalThresholdMb: 100,
  emergencyThresholdMb: 200
};

const DISPATCH_EVENT_NAME = 'heap-failsafe';

const dispatchHeapEvent = (level: HeapFailSafeLevel, detail: { usedMb: number }) => {
  if (typeof window === 'undefined') return;
  const eventDetail: HeapFailSafeEventDetail = {
    level,
    usedMb: detail.usedMb,
    timestamp: Date.now()
  };
  window.dispatchEvent(new CustomEvent<HeapFailSafeEventDetail>(DISPATCH_EVENT_NAME, { detail: eventDetail }));
};

const trimQueryCache = async (queryClient: QueryClient, clearAll: boolean) => {
  if (!queryClient) {
    return;
  }

  try {
    if (clearAll) {
      queryClient.clear();
      return;
    }

    const queries = queryClient.getQueryCache().getAll();
    const targets = queries
      .filter(query => !query.isActive())
      .sort((a, b) => (a.state.dataUpdatedAt ?? 0) - (b.state.dataUpdatedAt ?? 0))
      .slice(0, Math.max(5, Math.ceil(queries.length * 0.1)));

    for (const query of targets) {
      queryClient.getQueryCache().remove(query);
    }
  } catch (error) {
    console.warn('[HeapFailSafe] Failed to trim query cache', error);
  }
};

const trimSessionStorage = (clearAll: boolean) => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    if (clearAll) {
      sessionStorage.clear();
      return;
    }

    const keys = Object.keys(sessionStorage);
    const targetCount = Math.max(3, Math.ceil(keys.length * 0.3));
    let removed = 0;

    for (const key of keys) {
      sessionStorage.removeItem(key);
      removed += 1;
      if (removed >= targetCount) {
        break;
      }
    }
  } catch (error) {
    console.warn('[HeapFailSafe] Failed to trim session storage', error);
  }
};

export const initHeapFailSafe = (options: HeapFailSafeOptions = {}) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const {
    queryClient,
    warnThresholdMb = defaultOptions.warnThresholdMb,
    criticalThresholdMb = defaultOptions.criticalThresholdMb,
    emergencyThresholdMb = defaultOptions.emergencyThresholdMb,
    onWarn,
    onCritical,
    onEmergency
  } = options;

  let lastWarned = 0;
  let lastCritical = 0;
  let lastEmergency = 0;
  const throttleMs = 15_000;

  return memoryMonitor.addListener(usage => {
    const usedMb = usage.used / MB;
    const now = Date.now();

    if (usedMb >= emergencyThresholdMb) {
      if (now - lastEmergency >= throttleMs) {
        lastEmergency = now;
        console.error('🚨 [HeapFailSafe] Emergency threshold exceeded. Reloading application.', { usedMb });
        onEmergency?.(usedMb);
        dispatchHeapEvent('emergency', { usedMb });
        window.location.reload();
      }
      return;
    }

    if (usedMb >= criticalThresholdMb) {
      if (now - lastCritical >= throttleMs) {
        lastCritical = now;
        console.error('⚠️ [HeapFailSafe] Critical heap usage detected. Clearing caches.', { usedMb });
        void trimQueryCache(queryClient!, false);
        trimSessionStorage(false);
        onCritical?.(usedMb);
        dispatchHeapEvent('critical', { usedMb });
      }
      return;
    }

    if (usedMb >= warnThresholdMb && now - lastWarned >= throttleMs) {
      lastWarned = now;
      console.warn('🟡 [HeapFailSafe] High heap usage detected. Monitoring closely.', { usedMb });
      onWarn?.(usedMb);
      dispatchHeapEvent('warn', { usedMb });
    }
  });
};

export const addHeapFailSafeListener = (listener: HeapFailSafeListener) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<HeapFailSafeEventDetail>;
    if (!customEvent.detail) {
      return;
    }
    listener(customEvent.detail);
  };

  window.addEventListener(DISPATCH_EVENT_NAME, handler as EventListener);

  return () => {
    window.removeEventListener(DISPATCH_EVENT_NAME, handler as EventListener);
  };
};
