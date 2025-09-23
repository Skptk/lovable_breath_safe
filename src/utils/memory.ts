// Re-export all memory-related utilities
export * from './memoryUtils';
export * from './memoryProfiler';
export * from './renderOptimization';

// Export types
export type { MemorySnapshot, MemoryProfile } from './memoryProfiler';

// Initialize memory debugging in development
if (process.env.NODE_ENV === 'development') {
  // Enable memory debugging tools
  if (typeof window !== 'undefined') {
    // Add memory debugging helpers to window
    (window as any).__MEMORY_DEBUG__ = {
      // Force garbage collection (if available)
      gc: () => {
        if ((window as any).gc) {
          (window as any).gc();
          console.log('Garbage collection forced');
          return true;
        }
        console.warn('Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
        return false;
      },
      
      // Take a heap snapshot (Chrome DevTools)
      takeSnapshot: (label = 'Heap Snapshot') => {
        if ((window as any).chrome?.devtools?.inspectedWindow) {
          console.log(`Taking heap snapshot: ${label}`);
          (window as any).chrome.devtools.inspectedWindow.eval(
            `console.profile("${label}"); console.profileEnd("${label}")`,
            () => console.log('Heap snapshot captured in Chrome DevTools')
          );
          return true;
        }
        console.warn('Heap snapshot not available in this environment');
        return false;
      },
      
      // Get memory info
      getMemoryInfo: () => {
        if ('memory' in performance) {
          const mem = (performance as any).memory;
          if (mem) {
            return {
              usedJSHeapSize: mem.usedJSHeapSize,
              totalJSHeapSize: mem.totalJSHeapSize,
              jsHeapSizeLimit: mem.jsHeapSizeLimit,
              usedMB: (mem.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
              totalMB: (mem.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
              limitMB: (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB',
              usagePercent: ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(2) + '%',
            };
          }
        }
        return { error: 'Memory API not available' };
      },
      
      // Check for potential memory leaks
      checkForLeaks: () => {
        const leaks: string[] = [];
        
        // Check for detached DOM elements
        const detached = [];
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
        
        // Check for large objects in global scope
        const globalProps = Object.getOwnPropertyNames(window);
        const largeObjects = globalProps
          .filter(prop => {
            try {
              const value = (window as any)[prop];
              return value && typeof value === 'object' && 
                Object.keys(value).length > 100;
            } catch (e) {
              return false;
            }
          })
          .map(prop => ({
            name: prop,
            size: JSON.stringify((window as any)[prop])?.length || 0
          }))
          .sort((a, b) => b.size - a.size)
          .slice(0, 5);
        
        if (largeObjects.length > 0) {
          leaks.push('Large global objects:', ...largeObjects.map(
            obj => `- ${obj.name}: ${(obj.size / 1024).toFixed(2)} KB`
          ));
        }
        
        if (leaks.length === 0) {
          leaks.push('No obvious memory leaks detected');
        }
        
        console.log('Memory Leak Check:');
        leaks.forEach(leak => console.log(`- ${leak}`));
        
        return leaks;
      },
    };
    
    console.log(
      '%cMemory debugging tools are available at window.__MEMORY_DEBUG__',
      'color: #4CAF50; font-weight: bold;'
    );
  }
}
