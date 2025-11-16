/**
 * Route preloading utility
 * Preloads route chunks in the background to improve perceived performance
 */

/**
 * Preload a route component by dynamically importing it
 * @param componentImport - Function that returns a dynamic import promise
 */
export async function preloadRoute(
  componentImport: () => Promise<any>
): Promise<void> {
  try {
    // Use requestIdleCallback if available for non-blocking preload
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        componentImport().catch((error) => {
          console.warn('Failed to preload route:', error);
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        componentImport().catch((error) => {
          console.warn('Failed to preload route:', error);
        });
      }, 100);
    }
  } catch (error) {
    console.warn('Failed to preload route:', error);
  }
}

/**
 * Preload multiple routes at once
 * @param componentImports - Array of dynamic import functions
 */
export async function preloadRoutes(
  componentImports: Array<() => Promise<any>>
): Promise<void> {
  componentImports.forEach((importFn) => {
    preloadRoute(importFn);
  });
}

