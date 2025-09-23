import { useEffect, lazy, Suspense } from 'react';

// Lazy load the MemoryDevTools component
const MemoryDevTools = lazy(() => import('./MemoryDevTools'));

export function DevToolsWrapper() {
  // Add memory debugging tools to window
  useEffect(() => {
    // Initialize memory debugging tools
    import('@/utils/memory').then(({ memoryProfiler }) => {
        // Add to window for easy access
        (window as any).__MEMORY_DEBUG__ = {
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
            
            // Check for detached DOM elements
            const detached = [];
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
              leaks.push(`Found ${detached.length} potentially detached DOM elements`);
            }
            
            // Check for excessive event listeners
            let listenerCount = 0;
            const elements = document.getElementsByTagName('*');
            for (let i = 0; i < elements.length; i++) {
              const elem = elements[i];
              if ((elem as any).__events) {
                listenerCount += Object.keys((elem as any).__events).length;
              }
            }
            
            if (listenerCount > 1000) {
              leaks.push(`Found ${listenerCount} event listeners (may indicate a leak)`);
            }
            
            console.log('Memory Leak Check:');
            leaks.forEach(leak => console.log(`- ${leak}`));
            
            return leaks.length > 0 ? leaks : ['No obvious memory leaks detected'];
          }
        };
        
        console.log(
          '%cMemory debugging tools are available at window.__MEMORY_DEBUG__',
          'color: #4CAF50; font-weight: bold; padding: 4px; background: #f5f5f5;'
        );
      });
  }, []);

  return (
    <Suspense fallback={null}>
      <MemoryDevTools defaultOpen={false} enableProfiler={false} />
    </Suspense>
  );
}
