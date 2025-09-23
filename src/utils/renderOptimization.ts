import { useRef, useMemo, useCallback, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Custom hook to track component renders
 */
export function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  renderCount.current++;
  const now = performance.now();
  const timeSinceLastRender = now - lastRenderTime.current;
  lastRenderTime.current = now;
  
  // Log excessive re-renders
  useEffect(() => {
    if (timeSinceLastRender < 16) { // Less than 60fps
      console.warn(
        `[Performance] ${componentName} re-rendered too quickly: ${timeSinceLastRender.toFixed(2)}ms ` +
        `(render #${renderCount.current})`
      );
    }
    
    if (renderCount.current > 100) {
      console.warn(
        `[Performance] ${componentName} has re-rendered ${renderCount.current} times. ` +
        `Consider optimizing to prevent performance issues.`
      );
    }
  }, [componentName, timeSinceLastRender]);
  
  return {
    renderCount: renderCount.current,
    timeSinceLastRender,
    reset: () => {
      renderCount.current = 0;
      lastRenderTime.current = performance.now();
    },
  };
}

/**
 * Memoize a component with a custom comparison function
 */
export function memoWithComparison<T>(
  component: React.ComponentType<T>,
  areEqual: (prevProps: T, nextProps: T) => boolean,
  displayName?: string
) {
  const memoized = React.memo(component, areEqual);
  
  if (displayName) {
    memoized.displayName = `Memoized(${displayName})`;
  }
  
  return memoized;
}

/**
 * Custom hook to debounce a value update
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Custom hook to throttle a function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  const callbackRef = useRef(callback);
  
  // Update the callback if it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Create the throttled function once and reuse it
  const throttledCallback = useMemo(() => {
    return throttle(
      (...args: Parameters<T>) => callbackRef.current(...args),
      delay,
      options
    );
  }, [delay, options.leading, options.trailing]);
  
  // Clean up the throttle on unmount
  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);
  
  return throttledCallback as T;
}

/**
 * Custom hook to prevent unnecessary re-renders with deep comparison
 */
export function useDeepCompareMemoize<T>(value: T): T {
  const ref = useRef<T>();
  
  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }
  
  return ref.current as T;
}

/**
 * Custom hook to memoize a value with deep comparison
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const memoizedDeps = useDeepCompareMemoize(deps);
  return useMemo(factory, memoizedDeps);
}

/**
 * Custom hook to memoize a callback with deep comparison
 */
export function useDeepCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  const memoizedDeps = useDeepCompareMemoize(deps);
  return useCallback(callback, memoizedDeps);
}

/**
 * Deep comparison of two values
 */
function isEqual(a: any, b: any): boolean {
  // Handle primitive types and null/undefined
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Handle objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * HOC to log when a component re-renders
 */
export function withRenderLogging<P>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function WithRenderLogging(props: P) {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(performance.now());
    
    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    console.log(
      `[Render] ${componentName} #${renderCount.current} ` +
      `(${timeSinceLastRender.toFixed(2)}ms since last render)`,
      props
    );
    
    return <WrappedComponent {...(props as any)} />;
  };
}

/**
 * Hook to measure render performance
 */
export function useRenderMeasure(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const totalRenderTime = useRef(0);
  
  renderCount.current++;
  const now = performance.now();
  const timeSinceLastRender = now - lastRenderTime.current;
  lastRenderTime.current = now;
  totalRenderTime.current += timeSinceLastRender;
  
  useEffect(() => {
    // Log performance summary every 10 renders
    if (renderCount.current % 10 === 0) {
      const avgRenderTime = totalRenderTime.current / renderCount.current;
      console.log(
        `[Performance] ${componentName}: ` +
        `${renderCount.current} renders, ` +
        `avg: ${avgRenderTime.toFixed(2)}ms, ` +
        `total: ${totalRenderTime.current.toFixed(2)}ms`
      );
    }
  }, [componentName]);
  
  return {
    renderCount: renderCount.current,
    timeSinceLastRender,
    totalRenderTime: totalRenderTime.current,
    reset: () => {
      renderCount.current = 0;
      lastRenderTime.current = performance.now();
      totalRenderTime.current = 0;
    },
  };
}
