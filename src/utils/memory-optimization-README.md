# Memory Optimization Tools

This directory contains utilities and components to help identify, diagnose, and fix memory leaks and performance issues in the application.

## Tools Overview

### 1. Memory Profiler (`memoryProfiler.ts`)
A comprehensive memory profiling utility that tracks:
- Heap size and memory usage
- DOM node counts
- Event listener counts
- Potential memory leaks

**Usage:**
```typescript
import { memoryProfiler } from '@/utils/memoryProfiler';

// Start profiling (takes snapshots every 2 seconds)
memoryProfiler.start(2000);

// Take a heap snapshot
memoryProfiler.takeHeapSnapshot('After user interaction');

// Force garbage collection
memoryProfiler.forceGarbageCollection();

// Stop profiling and get results
const results = memoryProfiler.stop();
console.log('Memory profile results:', results);
```

### 2. React Memory Leak Detector (`MemoryLeakDetector.tsx`)
A React component and hooks for detecting memory leaks in React components.

**Components:**
- `MemoryLeakDetector`: Wraps components to track instances
- `MemoryUsageWarning`: Shows a warning when memory usage is high
- `withLeakDetection`: HOC for adding leak detection to components
- `useLeakDetection`: Hook for tracking component lifecycle

**Usage:**
```typescript
import { MemoryLeakDetector, withLeakDetection, useLeakDetection } from '@/components/dev/MemoryLeakDetector';

// As a component wrapper
<MemoryLeakDetector componentName="MyComponent">
  <MyComponent />
</MemoryLeakDetector>

// As a HOC
const MyComponentWithLeakDetection = withLeakDetection(MyComponent, 'MyComponent');

// As a hook
function MyComponent() {
  useLeakDetection('MyComponent');
  // ...
}
```

### 3. Memory DevTools (`MemoryDevTools.tsx`)
A floating dev tools panel for monitoring memory usage in development.

**Features:**
- Real-time memory usage stats
- DOM node and event listener counts
- Profiling controls
- Heap snapshot capture
- Garbage collection trigger

**Usage:**
```tsx
import { MemoryDevTools } from '@/components/dev/MemoryDevTools';

// Add to your app (preferably in a development-only wrapper)
function App() {
  return (
    <>
      <YourApp />
      <MemoryDevTools defaultOpen={false} enableProfiler={false} />
    </>
  );
}
```

### 4. Render Optimization (`renderOptimization.ts`)
Utilities for optimizing React rendering performance.

**Features:**
- `useRenderCount`: Track component renders
- `memoWithComparison`: Custom memo with comparison function
- `useDebouncedValue`: Debounce value updates
- `useThrottledCallback`: Throttle callback execution
- `useDeepMemo/useDeepCallback`: Memoization with deep comparison

**Usage:**
```typescript
import {
  useRenderCount,
  memoWithComparison,
  useDebouncedValue,
  useThrottledCallback,
  useDeepMemo,
  useDeepCallback
} from '@/utils/renderOptimization';

// Track renders
function MyComponent() {
  const { renderCount } = useRenderCount('MyComponent');
  // ...
}

// Memo with custom comparison
const MemoizedComponent = memoWithComparison(
  MyComponent,
  (prevProps, nextProps) => {
    // Custom comparison logic
    return prevProps.id === nextProps.id;
  },
  'MyComponent'
);

// Debounced value
function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  // ...
}
```

## Best Practices

1. **Use the Memory DevTools in Development**
   - Enable the dev tools in development to catch memory issues early
   - Monitor the console for memory-related warnings

2. **Profile Before Optimizing**
   - Use the memory profiler to identify actual bottlenecks
   - Focus optimization efforts on components with the most impact

3. **Fix Memory Leaks**
   - Clean up event listeners and subscriptions in `useEffect` cleanup
   - Be cautious with closures that capture large objects
   - Use the `useLeakDetection` hook to track component lifecycle

4. **Optimize Rendering**
   - Use `React.memo` for expensive components
   - Memoize callbacks and values with `useCallback` and `useMemo`
   - Avoid inline object/function props that change on every render

5. **Monitor in Production**
   - Consider adding lightweight memory monitoring in production
   - Log memory usage periodically to detect issues in the wild

## Troubleshooting

### High Memory Usage
1. Take a heap snapshot using Chrome DevTools
2. Look for detached DOM trees or large object retainers
3. Check for event listeners that aren't being cleaned up

### Frequent Garbage Collection
1. Look for many small allocations in the performance timeline
2. Consider object pooling for frequently created/destroyed objects

### Memory Leaks
1. Use the `MemoryLeakDetector` to track component instances
2. Look for components that aren't being unmounted properly
3. Check for subscriptions or timers that aren't cleaned up

## Browser Support

- Memory profiling works best in Chrome/Edge
- Some features may not be available in all browsers
- The Performance API is required for memory measurements

## License

MIT
