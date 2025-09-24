import React, { useEffect, useRef } from 'react';

interface MemoryInfo {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

export function useMemoryMonitor(interval = 10000) {
  const intervalRef = useRef<number>();
  const lastUsedRef = useRef<number>(0);
  const lastTotalRef = useRef<number>(0);
  const leakDetectedRef = useRef<boolean>(false);
  const checkCountRef = useRef<number>(0);
  
  const getMemoryInfo = (): MemoryInfo => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return {};
  };
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const checkForLeaks = () => {
    const memory = getMemoryInfo();
    
    if (!memory.usedJSHeapSize || !memory.totalJSHeapSize) {
      console.log('[Memory Monitor] Memory API not available');
      return;
    }
    
    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    
    // Check for significant growth in memory usage
    if (lastUsedRef.current > 0) {
      const growth = used - lastUsedRef.current;
      const growthPercentage = (growth / lastUsedRef.current) * 100;
      
      // If memory grows by more than 20% between checks, it might be a leak
      if (growthPercentage > 20 && checkCountRef.current > 3) {
        leakDetectedRef.current = true;
        console.warn(`[Memory Monitor] Potential memory leak detected: ${formatBytes(growth)} (${growthPercentage.toFixed(2)}%) increase in memory usage`);
        
        // Log component tree or other diagnostics if needed
        if ((window as any).React) {
          console.log('[Memory Monitor] Current React component tree:', 
            (window as any).React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
              ?.ReactCurrentOwner?.current?.elementType);
        }
      }
    }
    
    lastUsedRef.current = used;
    lastTotalRef.current = total;
    checkCountRef.current++;
    
    // Log memory usage every 5 checks
    if (checkCountRef.current % 5 === 0) {
      console.log(`[Memory Monitor] Used: ${formatBytes(used)} | Total: ${formatBytes(total)}`);
    }
  };
  
  useEffect(() => {
    // Only run in development
    if (process.env['NODE_ENV'] !== 'development') {
      return;
    }
    
    // Check for memory leaks at regular intervals
    intervalRef.current = window.setInterval(checkForLeaks, interval);
    
    // Initial check
    checkForLeaks();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval]);
  
  return {
    checkForLeaks,
    getMemoryInfo,
    formatBytes,
    isLeakDetected: leakDetectedRef.current,
  };
}

export function withMemoryMonitor<P>(WrappedComponent: React.ComponentType<P>, componentName: string) {
  return function WithMemoryMonitor(props: P) {
    const mountTime = useRef(performance.now());
    const renderCount = useRef(0);
    
    renderCount.current++;
    
    useEffect(() => {
      const mountDuration = performance.now() - mountTime.current;
      console.log(`[Memory Monitor] ${componentName} mounted in ${mountDuration.toFixed(2)}ms`);
      
      return () => {
        const unmountTime = performance.now();
        console.log(`[Memory Monitor] ${componentName} unmounted after ${(unmountTime - mountTime.current).toFixed(2)}ms with ${renderCount.current} renders`);
        
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
      };
    }, []);
    
    return React.createElement(WrappedComponent as React.ComponentType<any>, props as any);
  };
}
