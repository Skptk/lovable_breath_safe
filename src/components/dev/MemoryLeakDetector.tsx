import React, { useEffect, useRef, useState } from 'react';
import { createLeakDetector } from '@/utils/memoryUtils';
import { debugLog, debugWarn, debugError, debugTrace } from '@/utils/debugFlags';

interface MemoryLeakDetectorProps {
  componentName: string;
  children: React.ReactNode;
  warnThreshold?: number; // Number of instances before warning
  errorThreshold?: number; // Number of instances before error
}

/**
 * Component that tracks instances and warns about potential memory leaks
 */
export function MemoryLeakDetector({
  componentName,
  children,
  warnThreshold = 5,
  errorThreshold = 10,
}: MemoryLeakDetectorProps) {
  const [instanceCount, setInstanceCount] = useState(0);
  const leakDetector = useRef(createLeakDetector(componentName));
  const instanceRef = useRef({});
  
  // Track this component instance
  useEffect(() => {
    const cleanup = leakDetector.current.track(instanceRef.current);
    setInstanceCount(leakDetector.current.getInstanceCount());
    
    return () => {
      cleanup();
      setInstanceCount(leakDetector.current.getInstanceCount());
    };
  }, []);
  
  // Check for potential leaks
  useEffect(() => {
    if (instanceCount >= errorThreshold) {
      debugError(
        'MemoryLeakDetector',
        `${componentName} has ${instanceCount} instances (error threshold ${errorThreshold})`
      );
      debugTrace('MemoryLeakDetector', `${componentName} instance stack trace`);
    } else if (instanceCount >= warnThreshold) {
      debugWarn(
        'MemoryLeakDetector',
        `${componentName} has ${instanceCount} instances (warn threshold ${warnThreshold})`
      );
    }
  }, [instanceCount, componentName, warnThreshold, errorThreshold]);
  
  // Only show the wrapped component, no extra DOM elements
  return <>{children}</>;
}

/**
 * HOC to add memory leak detection to a component
 */
export function withLeakDetection<P>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  options: { warnThreshold?: number; errorThreshold?: number } = {}
) {
  return function WithLeakDetection(props: P) {
    return (
      <MemoryLeakDetector 
        componentName={componentName}
        warnThreshold={options.warnThreshold}
        errorThreshold={options.errorThreshold}
      >
        <WrappedComponent {...(props as any)} />
      </MemoryLeakDetector>
    );
  };
}

/**
 * Hook to track component mounts/unmounts and potential memory leaks
 */
export function useLeakDetection(componentName: string) {
  const mountTime = useRef(performance.now());
  const renderCount = useRef(0);
  const leakDetector = useRef(createLeakDetector(componentName));
  const instanceRef = useRef({});
  
  // Track this component instance
  useEffect(() => {
    renderCount.current++;
    
    // Track the instance
    const cleanup = leakDetector.current.track(instanceRef.current);
    
    // Log mount
    debugLog('MemoryLeakDetector', `[Mount] ${componentName} mounted`, {
      renders: renderCount.current
    });
    
    return () => {
      // Clean up
      cleanup();
      
      // Log unmount with duration
      const unmountTime = performance.now();
      const duration = unmountTime - mountTime.current;
      debugLog('MemoryLeakDetector', `[Unmount] ${componentName}`, {
        durationMs: duration,
        renders: renderCount.current
      });
      
      // If component was mounted for a short time, it might be a memory leak
      if (duration < 1000 && renderCount.current > 5) {
        debugWarn(
          'MemoryLeakDetector',
          `${componentName} mounted/unmounted quickly`,
          { renders: renderCount.current, durationMs: duration }
        );
      }
    };
  }, [componentName]);
  
  // Return the current instance count for manual checking
  return {
    getInstanceCount: () => leakDetector.current.getInstanceCount(),
    renderCount: renderCount.current,
  };
}

/**
 * Component that shows a warning when memory usage is high
 */
export function MemoryUsageWarning() {
  const [isHighMemory, setIsHighMemory] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);
  
  useEffect(() => {
    if ('performance' in window && 'memory' in (performance as any)) {
      const checkMemory = () => {
        const mem = (performance as any).memory;
        if (mem) {
          const used = mem.usedJSHeapSize || 0;
          const total = mem.totalJSHeapSize || 1;
          const limit = mem.jsHeapSizeLimit || total * 2;
          
          setMemoryInfo({
            used,
            total,
            limit,
          });
          
          // Consider memory high if using more than 70% of available memory
          const isHigh = used > limit * 0.7;
          setIsHighMemory(isHigh);
          
          if (isHigh) {
            debugWarn(
              'MemoryUsageWarning',
              `High memory usage detected`,
              { percentUsed: Math.round((used / limit) * 100) }
            );
          }
        }
      };
      
      // Check memory every 5 seconds
      const interval = setInterval(checkMemory, 5000);
      checkMemory();
      
      return () => clearInterval(interval);
    }
    
    return () => {};
  }, []);
  
  if (!isHighMemory || !memoryInfo) {
    return null;
  }
  
  const percentUsed = Math.round((memoryInfo.used / memoryInfo.limit) * 100);
  
  return (
    <div className="fixed bottom-4 left-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50 max-w-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            High Memory Usage: {percentUsed}% of available memory
          </p>
          <p className="text-sm mt-1">
            This may cause performance issues. Consider closing unused tabs or refreshing the page.
          </p>
        </div>
      </div>
    </div>
  );
}
