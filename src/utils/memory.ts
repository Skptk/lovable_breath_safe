// Re-export all memory-related utilities
export * from './memoryUtils';
import * as memoryProfiler from './memoryProfiler';
export { memoryProfiler };
export * from './renderOptimization';

const resolveMemoryDebugEnabled = (): boolean => {
  const hasWindow = typeof window !== 'undefined';
  const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || undefined;
  const explicitFlag = viteEnv?.VITE_ENABLE_MEMORY_DEBUG === 'true';
  const isDev = Boolean(viteEnv?.DEV);

  if (hasWindow) {
    const explicitWindowFlag = (window as any).__ENABLE_MEMORY_DEBUG__;
    if (typeof explicitWindowFlag === 'boolean') {
      return explicitWindowFlag;
    }
  }

  return (isDev || explicitFlag) && hasWindow;
};

export const isMemoryDebuggingEnabled = resolveMemoryDebugEnabled();

// Initialize memory debugging only when explicitly enabled
if (isMemoryDebuggingEnabled) {
  (window as any).__MEMORY_DEBUG__ = {
    gc: () => {
      if ((window as any).gc) {
        (window as any).gc();
        console.log('Garbage collection forced');
        return true;
      }
      console.warn('Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
      return false;
    },

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

    checkForLeaks: () => {
      const leaks: string[] = [];

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

      for (const candidate of nodes) {
        if (!document.contains(candidate)) {
          detached.push(candidate);
        }
      }

      if (detached.length > 0) {
        leaks.push(`Found ${detached.length} potentially detached DOM elements`);
      }

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

      const globalProps = Object.getOwnPropertyNames(window);
      const largeObjects = globalProps
        .filter(prop => {
          try {
            const value = (window as any)[prop];
            return value && typeof value === 'object' && Object.keys(value).length > 100;
          } catch (_error) {
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
} else if (typeof window !== 'undefined' && (window as any).__MEMORY_DEBUG__) {
  delete (window as any).__MEMORY_DEBUG__;
}
