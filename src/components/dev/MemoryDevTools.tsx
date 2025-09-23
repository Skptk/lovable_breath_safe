import React, { useState, useEffect, useCallback } from 'react';
import { MemoryProfiler, MemoryLeakDetector, MemoryUsageWarning } from './MemoryLeakDetector';
import { memoryProfiler } from '@/utils/memoryProfiler';

interface MemoryDevToolsProps {
  /**
   * Whether to show the dev tools by default
   * @default false
   */
  defaultOpen?: boolean;
  
  /**
   * Whether to enable the memory profiler by default
   * @default false
   */
  enableProfiler?: boolean;
  
  /**
   * Whether to enable memory leak detection
   * @default true in development, false in production
   */
  enableLeakDetection?: boolean;
  
  /**
   * Whether to show memory usage warnings
   * @default true
   */
  showWarnings?: boolean;
}

/**
 * A development tool for monitoring and debugging memory usage in React applications.
 * Provides a floating panel with memory usage information and controls.
 */
export function MemoryDevTools({
  defaultOpen = false,
  enableProfiler = false,
  enableLeakDetection = process.env.NODE_ENV === 'development',
  showWarnings = true,
}: MemoryDevToolsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isProfiling, setIsProfiling] = useState(enableProfiler);
  const [stats, setStats] = useState<{
    heapSize: string;
    nodeCount: number;
    listenerCount: number;
    detachedNodes: number;
    lastSnapshot?: string;
  } | null>(null);
  
  // Toggle the dev tools panel
  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  // Toggle memory profiling
  const toggleProfiling = useCallback(() => {
    if (isProfiling) {
      memoryProfiler.stop();
      setIsProfiling(false);
    } else {
      memoryProfiler.start(2000); // Take a snapshot every 2 seconds
      setIsProfiling(true);
    }
  }, [isProfiling]);
  
  // Force garbage collection
  const handleGarbageCollect = useCallback(() => {
    const success = memoryProfiler.forceGarbageCollection();
    if (success) {
      console.log('Garbage collection triggered');
    }
  }, []);
  
  // Take a heap snapshot
  const takeHeapSnapshot = useCallback(() => {
    memoryProfiler.takeHeapSnapshot(`Snapshot ${new Date().toISOString()}`);
  }, []);
  
  // Update stats periodically
  useEffect(() => {
    if (!isOpen) return;
    
    const updateStats = () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        if (mem) {
          setStats({
            heapSize: `${(mem.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            nodeCount: document.getElementsByTagName('*').length,
            listenerCount: countEventListeners(),
            detachedNodes: countDetachedElements(),
            lastSnapshot: new Date().toLocaleTimeString(),
          });
        }
      }
    };
    
    // Initial update
    updateStats();
    
    // Update every 2 seconds
    const intervalId = setInterval(updateStats, 2000);
    
    return () => clearInterval(intervalId);
  }, [isOpen]);
  
  // Start/stop profiling based on the prop
  useEffect(() => {
    if (enableProfiler) {
      memoryProfiler.start(2000);
      setIsProfiling(true);
    }
    
    return () => {
      memoryProfiler.stop();
    };
  }, [enableProfiler]);
  
  // Count event listeners (approximate)
  const countEventListeners = () => {
    let count = 0;
    const elements = document.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      if ((elem as any).__events) {
        count += Object.keys((elem as any).__events).length;
      }
    }
    return count;
  };
  
  // Count detached DOM elements (approximate)
  const countDetachedElements = () => {
    let count = 0;
    const walker = document.createTreeWalker(
      document,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    const nodes: Element[] = [];
    let node: Node | null;
    
    while ((node = walker.nextNode())) {
      if (node instanceof Element) {
        nodes.push(node);
      }
    }
    
    for (const node of nodes) {
      if (!document.contains(node)) {
        count++;
      }
    }
    
    return count;
  };
  
  // Don't render in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !defaultOpen) {
    return showWarnings ? <MemoryUsageWarning /> : null;
  }
  
  return (
    <>
      {showWarnings && <MemoryUsageWarning />}
      
      {/* Floating toggle button */}
      <button
        onClick={togglePanel}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-50 flex items-center justify-center"
        style={{ width: '50px', height: '50px' }}
        title="Memory Dev Tools"
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
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6h2m7-6h8m0 0h-2m2 6h-2M5 15H3m12-6h.01M12 3h.01M12 15h.01M12 21h.01M12 9h.01M12 18h.01m-6.36-2.63l-1.42 1.42m0 0l-2.83 2.83m2.83-2.83l-2.83-2.83m2.83 2.83l1.41-1.41m0 0l2.83-2.83m-2.83 2.83l2.83 2.83"
          />
        </svg>
      </button>
      
      {/* Dev tools panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
            <h3 className="font-semibold">Memory Dev Tools</h3>
            <div className="flex space-x-2">
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
            {/* Memory Stats */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Memory Usage</h4>
                <div className="text-xs text-blue-100 bg-blue-900 px-2 py-1 rounded">
                  {stats ? `Updated: ${stats.lastSnapshot}` : 'Loading...'}
                </div>
              </div>
              
              {stats ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Heap Size</div>
                    <div>{stats.heapSize}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">DOM Nodes</div>
                    <div>{stats.nodeCount}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Event Listeners</div>
                    <div>{stats.listenerCount}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Detached Nodes</div>
                    <div className={stats.detachedNodes > 0 ? 'text-red-600 dark:text-red-400' : ''}>
                      {stats.detachedNodes}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500">
                  Loading memory stats...
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="space-y-2">
              <h4 className="font-medium">Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleProfiling}
                  className={`px-3 py-2 rounded text-sm font-medium ${
                    isProfiling 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isProfiling ? 'Stop Profiling' : 'Start Profiling'}
                </button>
                
                <button
                  onClick={handleGarbageCollect}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium"
                >
                  GC Collect
                </button>
                
                <button
                  onClick={takeHeapSnapshot}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium"
                >
                  Take Snapshot
                </button>
                
                <button
                  onClick={() => {
                    console.log('Current memory profile:', memoryProfiler);
                    console.log('Component instances:', (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.getFiberRoots ? 
                      'React DevTools detected' : 'React DevTools not found');
                  }}
                  className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium"
                >
                  Debug Info
                </button>
              </div>
            </div>
            
            {/* Memory Leak Detection */}
            {enableLeakDetection && (
              <div className="space-y-2">
                <h4 className="font-medium">Leak Detection</h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
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
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Memory leak detection is enabled. Check the console for warnings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p>Open browser dev tools for detailed memory profiling.</p>
              <p>In Chrome: Memory tab → Take snapshot</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Default export with default props
export default MemoryDevTools;
