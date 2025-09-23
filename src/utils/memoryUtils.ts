/**
 * Memory debugging utilities for identifying and tracking memory leaks
 */

// Track component instances to detect leaks
const componentInstances = new Map<string, Set<object>>();

/**
 * Track component instance for memory leak detection
 */
export function trackComponent(componentName: string, instance: object) {
  if (!componentInstances.has(componentName)) {
    componentInstances.set(componentName, new Set());
  }
  componentInstances.get(componentName)?.add(instance);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Memory] ${componentName} mounted (${componentInstances.get(componentName)?.size} total)`);
  }
  
  return () => {
    componentInstances.get(componentName)?.delete(instance);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Memory] ${componentName} unmounted (${componentInstances.get(componentName)?.size} remaining)`);
    }
  };
}

/**
 * Log all tracked component instances (useful for debugging)
 */
export function logComponentInstances() {
  console.group('Component Instances');
  componentInstances.forEach((instances, name) => {
    console.log(`${name}: ${instances.size} instances`);
  });
  console.groupEnd();
}

/**
 * Force garbage collection (works in Chrome with --js-flags="--expose-gc")
 */
export function forceGarbageCollection() {
  if ((window as any).gc) {
    (window as any).gc();
    return true;
  }
  
  if (window.gc) {
    window.gc();
    return true;
  }
  
  if ((window as any).webkit && (window as any).webkit.memory && typeof (window as any).webkit.memory.collectGarbage === 'function') {
    (window as any).webkit.memory.collectGarbage();
    return true;
  }
  
  console.warn('Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
  return false;
}

/**
 * Measure memory usage
 */
export function measureMemory() {
  if ('measureMemory' in (performance as any)) {
    return (performance as any).measureMemory();
  }
  
  const memory = (performance as any).memory;
  if (memory) {
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  
  return null;
}

/**
 * Create a memory leak detector for a specific component
 */
export function createLeakDetector(componentName: string) {
  const instances = new Set<object>();
  let lastCount = 0;
  let growthCount = 0;
  
  return {
    track(instance: object) {
      instances.add(instance);
      
      const currentCount = instances.size;
      if (currentCount > lastCount) {
        growthCount++;
      } else {
        growthCount = 0;
      }
      
      lastCount = currentCount;
      
      // If we see consistent growth over multiple renders, it might be a leak
      if (growthCount > 10) {
        console.warn(`[Memory Leak?] ${componentName} has grown to ${currentCount} instances`);
        console.trace('Component instance growth stack trace');
      }
      
      return () => {
        instances.delete(instance);
      };
    },
    getInstanceCount() {
      return instances.size;
    },
  };
}

/**
 * Track event listeners to prevent memory leaks
 */
export function trackEventListeners() {
  if (!(window as any)._originalAddEventListener) {
    // Store original methods
    (window as any)._originalAddEventListener = window.addEventListener;
    (window as any)._originalRemoveEventListener = window.removeEventListener;
    
    // Track all event listeners
    const listeners = new Map<string, Map<Function, EventListener>>();
    
    // Override addEventListener
    window.addEventListener = function(
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions
    ) {
      if (!listeners.has(type)) {
        listeners.set(type, new Map());
      }
      
      const wrappedListener = function(this: any, ...args: any[]) {
        try {
          return listener.apply(this, args);
        } catch (e) {
          console.error(`Error in event listener for ${type}:`, e);
          throw e;
        }
      };
      
      listeners.get(type)?.set(listener, wrappedListener);
      return (window as any)._originalAddEventListener.call(
        this,
        type,
        wrappedListener,
        options
      );
    };
    
    // Override removeEventListener
    window.removeEventListener = function(
      type: string,
      listener: EventListener,
      options?: boolean | EventListenerOptions
    ) {
      const wrappedListener = listeners.get(type)?.get(listener);
      const result = (window as any)._originalRemoveEventListener.call(
        this,
        type,
        wrappedListener || listener,
        options
      );
      
      if (wrappedListener) {
        listeners.get(type)?.delete(listener);
      }
      
      return result;
    };
    
    // Add method to get all event listeners
    (window as any).getEventListeners = function() {
      return Array.from(listeners.entries()).reduce((acc, [type, typeListeners]) => {
        acc[type] = Array.from(typeListeners.keys());
        return acc;
      }, {} as Record<string, EventListener[]>);
    };
    
    console.log('[Memory] Event listener tracking enabled');
  }
  
  return () => {
    // Restore original methods
    if ((window as any)._originalAddEventListener) {
      window.addEventListener = (window as any)._originalAddEventListener;
      window.removeEventListener = (window as any)._originalRemoveEventListener;
      delete (window as any)._originalAddEventListener;
      delete (window as any)._originalRemoveEventListener;
      delete (window as any).getEventListeners;
    }
  };
}

// Initialize event listener tracking in development
if (process.env.NODE_ENV === 'development') {
  trackEventListeners();
}
