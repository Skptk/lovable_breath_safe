import React, { useState, useEffect, useMemo } from 'react';
import { measureMemory, logComponentInstances, forceGarbageCollection } from '@/utils/memoryUtils';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function MemoryDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const maxSamples = 60; // Track last minute of data (at 1 sample per second)
  
  // Toggle panel visibility
  const togglePanel = () => setIsOpen(!isOpen);
  
  // Format bytes to human-readable string
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Calculate memory usage percentage
  const memoryUsagePercent = useMemo(() => {
    if (!memory) return 0;
    return Math.min(100, (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
  }, [memory]);
  
  // Get memory usage color based on percentage
  const getMemoryColor = (percent: number): string => {
    if (percent > 90) return 'bg-red-500';
    if (percent > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  // Update memory info at regular intervals
  useEffect(() => {
    const updateMemoryInfo = () => {
      const memInfo = measureMemory();
      if (memInfo) {
        setMemory({
          usedJSHeapSize: memInfo.usedJSHeapSize,
          totalJSHeapSize: memInfo.totalJSHeapSize,
          jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
        });
        
        // Track memory samples for chart
        setSamples(prev => {
          const newSamples = [...prev, memInfo.usedJSHeapSize];
          return newSamples.slice(-maxSamples);
        });
      }
    };
    
    // Initial update
    updateMemoryInfo();
    
    // Set up interval for updates
    const intervalId = setInterval(updateMemoryInfo, 1000);
    
    // Clean up
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle garbage collection
  const handleGarbageCollect = () => {
    const success = forceGarbageCollection();
    if (success) {
      console.log('Garbage collection triggered');
    }
  };
  
  // Calculate memory stats
  const stats = useMemo(() => {
    if (samples.length < 2) return null;
    
    const used = samples[samples.length - 1];
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const avg = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const trend = used > samples[Math.max(0, samples.length - 2)] ? '↑' : '↓';
    
    return { used, min, max, avg, trend };
  }, [samples]);
  
  if (!isOpen) {
    return (
      <button
        onClick={togglePanel}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50"
        title="Memory Debug"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6h2m7-6h8m0 0h-2m2 6h2M5 15H3m12-6h.01M12 3h.01M12 15h.01M12 12h.01M12 18h.01M12 21h.01M12 6h.01M12 9h.01"
          />
        </svg>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
        <h3 className="font-semibold">Memory Debugger</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleGarbageCollect}
            className="p-1 rounded hover:bg-blue-700"
            title="Run Garbage Collection"
          >
            ♻️
          </button>
          <button
            onClick={logComponentInstances}
            className="p-1 rounded hover:bg-blue-700"
            title="Log Component Instances"
          >
            📋
          </button>
          <button
            onClick={togglePanel}
            className="p-1 rounded hover:bg-blue-700"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {memory ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory Usage:</span>
                <span>
                  {formatBytes(memory.usedJSHeapSize)} / {formatBytes(memory.jsHeapSizeLimit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getMemoryColor(memoryUsagePercent)}`}
                  style={{ width: `${memoryUsagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Current</div>
                  <div>{formatBytes(stats.used)} {stats.trend}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
                  <div>{formatBytes(stats.avg)}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Min</div>
                  <div>{formatBytes(stats.min)}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Max</div>
                  <div>{formatBytes(stats.max)}</div>
                </div>
              </div>
            )}
            
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded p-2">
              <div className="h-full flex items-end space-x-px">
                {samples.map((sample, i) => {
                  const percent = (sample / (memory.jsHeapSizeLimit * 0.8)) * 100; // Cap at 80% for better visibility
                  return (
                    <div
                      key={i}
                      className={`flex-1 ${getMemoryColor(percent)}`}
                      style={{
                        height: `${Math.min(100, percent)}%`,
                      }}
                      title={`${formatBytes(sample)} (${i}s ago)`}
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Memory API not available in this browser
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <p>Tip: Look for increasing memory usage over time as a sign of memory leaks.</p>
          <p>Check the console for detailed component instance tracking.</p>
        </div>
      </div>
    </div>
  );
}

// HOC to add memory debugging to any component
export function withMemoryDebug<P>(WrappedComponent: React.ComponentType<P>, componentName: string) {
  return function WithMemoryDebug(props: P) {
    const mountTime = React.useRef(performance.now());
    const renderCount = React.useRef(0);
    
    renderCount.current++;
    
    React.useEffect(() => {
      const mountDuration = performance.now() - mountTime.current;
      console.log(`[Memory] ${componentName} mounted in ${mountDuration.toFixed(2)}ms`);
      
      return () => {
        const unmountTime = performance.now();
        console.log(`[Memory] ${componentName} unmounted after ${(unmountTime - mountTime.current).toFixed(2)}ms with ${renderCount.current} renders`);
      };
    }, []);
    
    return <WrappedComponent {...(props as any)} />;
  };
}
