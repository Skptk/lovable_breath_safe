import { useEffect } from "react";

export default function Profiler() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const log = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        console.log("Memory Usage:", {
          used: Math.round(memory.usedJSHeapSize / 1e6) + " MB",
          total: Math.round(memory.totalJSHeapSize / 1e6) + " MB",
          limit: Math.round(memory.jsHeapSizeLimit / 1e6) + " MB"
        });
      }
      
      // Log React Query cache stats if available
      if ((window as any).__REACT_QUERY_DEVTOOLS_GLOBAL_KEY__) {
        console.log("React Query DevTools available");
      }
    };
    
    const id = setInterval(log, 30000); // Log every 30 seconds
    return () => clearInterval(id);
  }, []);
  
  return null;
}
