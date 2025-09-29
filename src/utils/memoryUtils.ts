/**
 * Memory debugging utilities for identifying and tracking memory leaks
 */

import { isDebugBuild } from '@/utils/debugFlags';

type ListenerCallback = (event: Event) => void;

// Track component instances to detect leaks (debug builds only)
const componentInstances = isDebugBuild ? new Map<string, Set<object>>() : null;

/**
 * Track component instance for memory leak detection
 */
export function trackComponent(componentName: string, instance: object) {
  if (!isDebugBuild || !componentInstances) {
    return () => {};
  }

  if (!componentInstances.has(componentName)) {
    componentInstances.set(componentName, new Set());
  }

  const instances = componentInstances.get(componentName);
  instances?.add(instance);

  return () => {
    componentInstances.get(componentName)?.delete(instance);
  };
}

/**
 * Log all tracked component instances (useful for debugging)
 */
export function logComponentInstances() {
  if (!isDebugBuild || !componentInstances) {
    return;
  }

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
  if (!isDebugBuild) {
    return false;
  }

  // Use type assertion to avoid TypeScript errors
  const win = window as any;
  
  // Check for the exposed gc function in different locations
  if (typeof win.gc === 'function') {
    win.gc();
    return true;
  }
  
  // Check for webkit-specific garbage collection
  if (win.webkit?.memory?.collectGarbage && typeof win.webkit.memory.collectGarbage === 'function') {
    win.webkit.memory.collectGarbage();
    return true;
  }
  
  console.warn('Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
  return false;
}

/**
 * Measure memory usage
 * Returns null if memory measurement is not available in this environment
 */
export function measureMemory() {
  if (!isDebugBuild) {
    return null;
  }

  try {
    // Safely check if performance is available
    if (typeof performance === 'undefined' || !performance) {
      return null;
    }
    
    // Type assertion for TypeScript
    const perf = performance as any;
    
    // Check for the newer performance.measureMemory API first
    if (typeof perf.measureMemory === 'function') {
      return perf.measureMemory();
    }
    
    // Fall back to the older performance.memory API (Chrome)
    if (perf.memory) {
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      };
    }
    
    // Check for the Node.js memory usage API
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const nodeMem = process.memoryUsage();
      return {
        usedJSHeapSize: nodeMem.heapUsed,
        totalJSHeapSize: nodeMem.heapTotal,
        jsHeapSizeLimit: nodeMem.rss, // Not exactly the same, but gives an idea
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Error measuring memory:', error);
    return null;
  }
}

/**
 * Create a memory leak detector for a specific component
 */
export function createLeakDetector(componentName: string) {
  if (!isDebugBuild) {
    return {
      track: () => () => {},
      getInstanceCount: () => 0,
    };
  }

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
  if (!isDebugBuild || typeof window === 'undefined') return;
  
  // Store original methods
  (window as any)._originalAddEventListener = window.addEventListener.bind(window);
  (window as any)._originalRemoveEventListener = window.removeEventListener.bind(window);
  
  // Track all event listeners
  const listeners = new Map<string, Map<EventListenerOrEventListenerObject, ListenerCallback>>();
  
  // Override addEventListener
  window.addEventListener = function<K extends keyof WindowEventMap>(
    type: K | string,
    listener: (this: Window, ev: WindowEventMap[K] & Event) => any,
    options?: boolean | AddEventListenerOptions
  ) {
    const eventType = type as string;
    
    if (!listeners.has(eventType)) {
      listeners.set(eventType, new Map());
    }
    
    const wrappedListener: ListenerCallback = function(this: Window, event: Event) {
      try {
        return (listener as ListenerCallback).call(this, event);
      } catch (e) {
        console.error(`Error in event listener for '${eventType}':`, e);
        throw e;
      }
    };
    
    const listenerObj = listener as EventListenerOrEventListenerObject;
    listeners.get(eventType)?.set(listenerObj, wrappedListener);
    
    // Call original addEventListener with wrapped listener
    return (window as any)._originalAddEventListener(
      eventType,
      wrappedListener,
      options
    );
  } as typeof window.addEventListener;
  
  // Override removeEventListener
  window.removeEventListener = function<K extends keyof WindowEventMap>(
    type: K | string,
    listener: (this: Window, ev: WindowEventMap[K] & Event) => any,
    options?: boolean | EventListenerOptions
  ) {
    const eventType = type as string;
    const listenerObj = listener as EventListenerOrEventListenerObject;
    const wrappedListener = listeners.get(eventType)?.get(listenerObj);
    
    const result = (window as any)._originalRemoveEventListener(
      eventType,
      wrappedListener || listenerObj,
      options
    );
    
    if (wrappedListener) {
      listeners.get(eventType)?.delete(listenerObj);
    }
    
    return result;
  } as typeof window.removeEventListener;
  
  // Log all event listeners (for debugging)
  const logAllEventListeners = () => {
    console.group('Event Listeners');
    listeners.forEach((listeners, type) => {
      console.log(`%c${type}: ${listeners.size} listeners`, 'color: #4CAF50');
    });
    console.groupEnd();
  };
  
  // Log event listeners on unload
  const beforeUnloadHandler = () => {
    const totalListeners = Array.from(listeners.values())
      .reduce((sum, map) => sum + map.size, 0);
    
    if (totalListeners > 0) {
      console.warn(`[Memory] ${totalListeners} event listeners still attached on unload`);
      logAllEventListeners();
    }
  };
  
  window.addEventListener('beforeunload', beforeUnloadHandler);
  
  // Expose for debugging
  (window as any).__eventListeners = {
    list: listeners,
    log: logAllEventListeners,
  };
  
  return () => {
    // Restore original methods
    if ((window as any)._originalAddEventListener) {
      window.addEventListener = (window as any)._originalAddEventListener;
      window.removeEventListener = (window as any)._originalRemoveEventListener;
      delete (window as any)._originalAddEventListener;
      delete (window as any)._originalRemoveEventListener;
      delete (window as any).getEventListeners;
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      delete (window as any).__eventListeners;
    }
  };
}

// Initialize event listener tracking in development
if (isDebugBuild) {
  trackEventListeners();
}
