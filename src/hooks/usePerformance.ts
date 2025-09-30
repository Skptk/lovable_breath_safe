import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce hook for expensive operations
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for frequent events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  ) as T;
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Virtual scrolling hook for large lists
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, itemCount);

    return {
      start: Math.max(0, start - overscan),
      end,
      offsetY: start * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, itemCount]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleRange,
    handleScroll,
    totalHeight: itemCount * itemHeight,
  };
};

// Memoization hook with custom comparison
export const useMemoWithCompare = <T>(
  factory: () => T,
  deps: React.DependencyList,
  compare: (prev: T, next: T) => boolean
): T => {
  const ref = useRef<T>();
  const depsRef = useRef(deps);

  if (!ref.current || !compare(ref.current, factory())) {
    ref.current = factory();
  }

  useEffect(() => {
    depsRef.current = deps;
  });

  return ref.current!;
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const lastLoggedSnapshot = useRef<string>("");
  const lastLogTs = useRef<number>(0);
  const THROTTLE_MS = 2_000;

  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    const renderTime = currentTime - lastRenderTime.current;

    if (process.env.NODE_ENV === 'development') {
      const snapshot = JSON.stringify({
        render: renderCount.current,
        duration: Number(renderTime.toFixed(2)),
      });
      const now = Date.now();

      if (
        snapshot !== lastLoggedSnapshot.current &&
        now - lastLogTs.current >= THROTTLE_MS
      ) {
        console.log(`[${componentName}] Render #${renderCount.current} took ${renderTime.toFixed(2)}ms`);
        lastLoggedSnapshot.current = snapshot;
        lastLogTs.current = now;
      }
    }

    lastRenderTime.current = currentTime;
  });

  const getPerformanceMetrics = useCallback(() => ({
    renderCount: renderCount.current,
    averageRenderTime: renderCount.current > 1 
      ? (performance.now() - lastRenderTime.current) / renderCount.current 
      : 0,
  }), []);

  return { getPerformanceMetrics };
};

type EventTimingObserverOptions = {
  label?: string;
  minDuration?: number;
  eventTypes?: string[];
  targetSelector?: string;
  onEntry?: (entry: PerformanceEventTiming) => void;
};

export const useEventTimingObserver = (options?: EventTimingObserverOptions) => {
  const {
    label = 'EventTimingObserver',
    minDuration = 160,
    eventTypes = ['click', 'pointerdown', 'pointerup'],
    targetSelector,
    onEntry,
  } = options ?? {};

  const eventTypesKey = useMemo(() => eventTypes.slice().sort().join(','), [eventTypes]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return;
    }

    const supportedTypes = (PerformanceObserver as any).supportedEntryTypes;
    if (!supportedTypes || !supportedTypes.includes('event')) {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        if (eventEntry.duration < minDuration) {
          continue;
        }

        if (eventTypes.length > 0 && !eventTypes.includes(eventEntry.name)) {
          continue;
        }

        if (targetSelector) {
          const target = eventEntry.target as Element | null | undefined;
          if (!target || !target.closest(targetSelector)) {
            continue;
          }
        }

        if (onEntry) {
          onEntry(eventEntry);
          continue;
        }

        const duration = Number(eventEntry.duration.toFixed(2));
        const startTime = Number(eventEntry.startTime.toFixed(2));
        console.log('[INP]', {
          label,
          name: eventEntry.name,
          duration,
          startTime,
          interactionId: (eventEntry as any).interactionId ?? null,
        });
      }
    });

    try {
      observer.observe({ type: 'event', buffered: true, durationThreshold: minDuration });
    } catch (error) {
      console.warn('[useEventTimingObserver] Failed to observe event timings', error);
      observer.disconnect();
      return;
    }

    return () => {
      observer.disconnect();
    };
  }, [label, minDuration, eventTypesKey, targetSelector, onEntry]);
};

// Resource preloading hook
export const usePreload = (resources: string[]) => {
  const [loadedResources, setLoadedResources] = useState<Set<string>>(new Set());

  useEffect(() => {
    const preloadPromises = resources.map((resource) => {
      return new Promise<void>((resolve) => {
        if (resource.endsWith('.css')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = resource;
          link.onload = () => resolve();
          link.onerror = () => resolve(); // Continue even if CSS fails
          document.head.appendChild(link);
        } else if (resource.endsWith('.js')) {
          const script = document.createElement('script');
          script.src = resource;
          script.onload = () => resolve();
          script.onerror = () => resolve(); // Continue even if JS fails
          document.head.appendChild(script);
        } else {
          // For images and other resources
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = resource;
        }
      });
    });

    Promise.all(preloadPromises).then(() => {
      setLoadedResources(new Set(resources));
    });
  }, [resources]);

  return { loadedResources, isLoaded: loadedResources.size === resources.length };
};

// Memory management hook
export const useMemoryManagement = () => {
  const cleanupFunctions = useRef<Array<() => void>>([]);

  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const cleanup = useCallback(() => {
    cleanupFunctions.current.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('Cleanup function error:', error);
      }
    });
    cleanupFunctions.current = [];
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { addCleanup, cleanup };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const idleHandleRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ online: boolean; type: string } | null>(null);
  const lastDispatchRef = useRef<number>(0);
  const THROTTLE_MS = 1_000;

  useEffect(() => {
    const dispatchUpdate = (payload: { online: boolean; type: string }) => {
      setIsOnline(payload.online);
      setConnectionType(payload.type);
    };

    const flushPending = () => {
      idleHandleRef.current = null;
      const pending = pendingUpdateRef.current;
      if (!pending) {
        return;
      }
      pendingUpdateRef.current = null;
      dispatchUpdate(pending);
      lastDispatchRef.current = Date.now();
    };

    const scheduleFlush = () => {
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        idleHandleRef.current = window.requestIdleCallback(() => {
          flushPending();
        }, { timeout: THROTTLE_MS });
      } else {
        idleHandleRef.current = window.setTimeout(() => {
          idleHandleRef.current = null;
          flushPending();
        }, THROTTLE_MS) as unknown as number;
      }
    };

    const queueUpdate = (online: boolean) => {
      const connection = (navigator as any).connection;
      const nextType = connection?.effectiveType || 'unknown';
      pendingUpdateRef.current = { online, type: nextType };

      const elapsed = Date.now() - lastDispatchRef.current;
      if (elapsed >= THROTTLE_MS) {
        if (idleHandleRef.current !== null && typeof window !== 'undefined' && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleHandleRef.current);
          idleHandleRef.current = null;
        }
        flushPending();
        return;
      }

      if (idleHandleRef.current === null) {
        scheduleFlush();
      }
    };

    const handleOnline = () => queueUpdate(true);
    const handleOffline = () => queueUpdate(false);
    const handleConnectionChange = () => {
      queueUpdate(navigator.onLine);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange);
      queueUpdate(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange);
      }

      if (idleHandleRef.current !== null) {
        if (typeof window !== 'undefined' && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleHandleRef.current);
        } else {
          clearTimeout(idleHandleRef.current);
        }
        idleHandleRef.current = null;
      }
      pendingUpdateRef.current = null;
    };
  }, []);

  return { isOnline, connectionType };
};
