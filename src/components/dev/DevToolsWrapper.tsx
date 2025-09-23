import { useEffect, lazy, Suspense, useState } from 'react';

// Lazy load the MemoryDevTools component
const MemoryDevTools = lazy(() => import('./MemoryDevTools'));

export function DevToolsWrapper() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Add memory debugging tools to window
  useEffect(() => {
    // Only initialize in development
    if (process.env.NODE_ENV !== 'development') return;

    // Initialize memory debugging tools
    import('@/utils/memory')
      .then(({ memoryProfiler }) => {
        // Create debug object
        const debugObj = {
          gc: () => memoryProfiler.forceGarbageCollection(),
          takeSnapshot: (label: string) => memoryProfiler.takeHeapSnapshot(label),
          getMemoryInfo: () => {
            const mem = (performance as any).memory;
            return mem ? {
              usedJSHeapSize: mem.usedJSHeapSize,
              totalJSHeapSize: mem.totalJSHeapSize,
              jsHeapSizeLimit: mem.jsHeapSizeLimit,
              usedMB: (mem.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
              totalMB: (mem.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
              limitMB: (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
              usagePercent: ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(2) + '%',
            } : { error: 'Memory API not available' };
          },
          checkForLeaks: () => {
            const leaks: string[] = [];
            
            try {
              // Check for detached DOM elements
              const detached: Element[] = [];
              const walker = document.createTreeWalker(
                document,
                NodeFilter.SHOW_ELEMENT,
                { acceptNode: () => NodeFilter.FILTER_ACCEPT }
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
                  detached.push(node);
                }
              }
              
              if (detached.length > 0) {
                leaks.push(`Found ${detached.length} detached DOM elements`);
                console.warn('Detached elements:', detached);
              }
              
              // Check for event listeners on window
              const listeners = (window as any).getEventListeners?.(window) || {};
              const listenerCount = Object.values(listeners).reduce((count: number, events: unknown) => {
                const eventArray = Array.isArray(events) ? events : [];
                return count + eventArray.length;
              }, 0);
                
              // Arbitrary threshold of 50 event listeners
              if (typeof listenerCount === 'number' && listenerCount > 50) {
                leaks.push(`High number of event listeners (${listenerCount}) on window`);
              }
              
              return leaks.length > 0 ? leaks : ['No memory leaks detected'];
            } catch (error) {
              console.error('Error checking for leaks:', error);
              return ['Error checking for leaks: ' + (error as Error).message];
            }
          }
        };
        
        // Add to window for easy access
        (window as any).__MEMORY_DEBUG__ = debugObj;
        setIsInitialized(true);
        console.log('Memory debugging tools initialized');
      })
      .catch(error => {
        console.warn('Failed to load memory profiler:', error);
        // Provide a safe fallback
        (window as any).__MEMORY_DEBUG__ = {
          getMemoryInfo: () => ({ error: 'Memory debug tools failed to load' }),
          gc: () => console.warn('Memory debug tools not available'),
          takeSnapshot: () => console.warn('Memory debug tools not available'),
          checkForLeaks: () => ['Memory debug tools not available']
        };
        setIsInitialized(true);
      });
      
    // Cleanup function
    return () => {
      if ((window as any).__MEMORY_DEBUG__) {
        delete (window as any).__MEMORY_DEBUG__;
      }
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <MemoryDevTools defaultOpen={false} enableProfiler={false} />
    </Suspense>
  );
}
