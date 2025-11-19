# Memory Leak Scanning Checklist
## Line-by-Line Codebase Review Guide

---

## Scanning Methodology

### Step 1: Automated Pattern Detection
Run these commands to find common memory leak patterns:

```bash
# Find useEffect without cleanup
grep -rn "useEffect" --include="*.tsx" --include="*.ts" src/ | grep -v "return"

# Find setInterval/setTimeout without clear
grep -rn "setInterval\|setTimeout" --include="*.tsx" --include="*.ts" src/ | grep -v "clear"

# Find addEventListener without removeEventListener
grep -rn "addEventListener" --include="*.tsx" --include="*.ts" src/ | grep -v "removeEventListener"

# Find subscriptions without unsubscribe
grep -rn "\.subscribe\|channel\|subscription" --include="*.tsx" --include="*.ts" src/ | grep -v "unsubscribe"

# Find useState with arrays/objects that might accumulate
grep -rn "useState.*\[\]\|useState.*\{\}" --include="*.tsx" --include="*.ts" src/
```

### Step 2: Manual File-by-File Review
For each file, check these items:

---

## File Review Checklist

### For Each Component File (.tsx)

#### ✅ React Hooks Review
- [ ] **useEffect hooks:**
  - [ ] Every useEffect has a cleanup function (return statement)
  - [ ] Event listeners are removed in cleanup
  - [ ] Timers/intervals are cleared in cleanup
  - [ ] Subscriptions are unsubscribed in cleanup
  - [ ] AbortControllers are aborted in cleanup
  - [ ] WebSocket connections are closed in cleanup

- [ ] **useState hooks:**
  - [ ] No unbounded arrays/objects accumulating data
  - [ ] Large initial values are avoided
  - [ ] State that doesn't trigger re-renders should be refs
  - [ ] State is cleared/reset when component unmounts

- [ ] **useMemo/useCallback:**
  - [ ] Dependency arrays are complete and correct
  - [ ] Memoization is actually needed (not over-memoizing)
  - [ ] Memoized values don't grow unbounded
  - [ ] No stale closures from missing dependencies

#### ✅ Component Lifecycle
- [ ] Component unmounts properly (not kept in memory)
- [ ] Cleanup runs on unmount
- [ ] No global references to component instances
- [ ] Event listeners removed on unmount
- [ ] Animations stopped on unmount

#### ✅ Data Management
- [ ] API responses are limited in size
- [ ] Cached data has size limits
- [ ] Old data is removed when new data arrives
- [ ] No duplicate data storage
- [ ] Large datasets use pagination/virtualization

#### ✅ Third-Party Libraries
- [ ] Map instances are properly disposed
- [ ] Chart instances are cleaned up
- [ ] Animation instances are stopped
- [ ] Library-specific cleanup methods are called

---

## Priority Files to Review First

### Critical Priority (Memory Leak Prone)

1. **src/contexts/RealtimeContext.tsx**
   - [ ] Check subscription cleanup
   - [ ] Verify channel unsubscription
   - [ ] Check for duplicate subscriptions
   - [ ] Verify cleanup on unmount

2. **src/contexts/OptimizedRealtimeContext.tsx**
   - [ ] Check subscription management
   - [ ] Verify cleanup logic
   - [ ] Check for memory accumulation

3. **src/components/ProfileView.tsx**
   - [ ] Fix subscription cleanup (already identified)
   - [ ] Check achievement data storage
   - [ ] Verify points history limits

4. **src/components/HistoryView.tsx**
   - [ ] Check historical data accumulation
   - [ ] Verify chart data cleanup
   - [ ] Check filter state management
   - [ ] Implement data pagination if missing

5. **src/components/AirQualityDashboard.tsx**
   - [ ] Check real-time data accumulation
   - [ ] Verify chart cleanup
   - [ ] Check pollutant data storage limits

6. **src/components/MapView.tsx**
   - [ ] Verify Leaflet map cleanup
   - [ ] Check marker cleanup
   - [ ] Verify event listener removal
   - [ ] Check tile layer cleanup

### High Priority

7. **src/hooks/useAirQuality.ts**
   - [ ] Check query result caching
   - [ ] Verify polling cleanup
   - [ ] Check AbortController usage
   - [ ] Verify data limits

8. **src/hooks/useWeatherData.ts**
   - [ ] Check weather data caching
   - [ ] Verify forecast data limits
   - [ ] Check API response storage

9. **src/components/LeafletMap.tsx**
   - [ ] Verify map instance cleanup
   - [ ] Check layer cleanup
   - [ ] Verify event listener removal

10. **src/store/weatherStore.ts**
    - [ ] Check cache size limits
    - [ ] Verify cache expiration
    - [ ] Check for unbounded data storage

---

## Specific Patterns to Look For

### Pattern 1: Missing Cleanup
```typescript
// ❌ PROBLEM
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);
  // Missing: return () => clearInterval(timer);
}, []);

// ✅ FIX
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### Pattern 2: Accumulating Data
```typescript
// ❌ PROBLEM
const [messages, setMessages] = useState([]);
useEffect(() => {
  socket.on('message', (msg) => {
    setMessages(prev => [...prev, msg]); // Grows forever
  });
}, []);

// ✅ FIX
const [messages, setMessages] = useState([]);
useEffect(() => {
  const handler = (msg) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      return updated.slice(-100); // Keep only last 100
    });
  };
  socket.on('message', handler);
  return () => socket.off('message', handler);
}, []);
```

### Pattern 3: Subscription Leak
```typescript
// ❌ PROBLEM
useEffect(() => {
  const channel = supabase.channel('test');
  channel.subscribe(() => {});
  // Missing cleanup
}, []);

// ✅ FIX
useEffect(() => {
  const channel = supabase.channel('test');
  const subscription = channel.subscribe(() => {});
  return () => {
    subscription.unsubscribe();
    channel.unsubscribe();
  };
}, []);
```

### Pattern 4: Event Listener Leak
```typescript
// ❌ PROBLEM
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup
}, []);

// ✅ FIX
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, [handleResize]);
```

### Pattern 5: Large State Objects
```typescript
// ❌ PROBLEM
const [largeData, setLargeData] = useState(hugeArray); // Stored in state

// ✅ FIX
const largeDataRef = useRef(hugeArray); // Use ref if no re-render needed
// OR
const [largeData, setLargeData] = useState(() => {
  // Lazy initialization
  return processLargeData();
});
```

### Pattern 6: Unbounded Cache
```typescript
// ❌ PROBLEM
const cache = new Map();
function getData(key) {
  if (!cache.has(key)) {
    cache.set(key, fetchData(key)); // Grows forever
  }
  return cache.get(key);
}

// ✅ FIX
const cache = new Map();
const MAX_CACHE_SIZE = 100;
function getData(key) {
  if (!cache.has(key)) {
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey); // LRU eviction
    }
    cache.set(key, fetchData(key));
  }
  return cache.get(key);
}
```

---

## Component-Specific Checks

### For Map Components
- [ ] Map instance is stored in ref, not state
- [ ] `map.remove()` is called on unmount
- [ ] All layers are removed before map removal
- [ ] Event listeners are removed
- [ ] Markers are cleared from memory

### For Chart Components
- [ ] Chart instance is disposed on unmount
- [ ] Chart data is limited in size
- [ ] Old chart data is cleared when new data arrives
- [ ] Chart animations are stopped

### For List Components
- [ ] Virtual scrolling is implemented for long lists
- [ ] Only visible items are rendered
- [ ] Off-screen items are unmounted
- [ ] List data is paginated

### For Real-time Components
- [ ] Subscriptions are cleaned up
- [ ] No duplicate subscriptions
- [ ] Reconnection doesn't create leaks
- [ ] Event handlers are removed

---

## Data Fetching Checks

### For API Hooks
- [ ] AbortController is used and aborted
- [ ] Request cleanup on unmount
- [ ] Response data is limited
- [ ] Cached responses have TTL
- [ ] No duplicate requests

### For Polling Hooks
- [ ] Polling interval is cleared
- [ ] Polling stops on unmount
- [ ] Polling data doesn't accumulate
- [ ] Polling can be paused/resumed

---

## Context Provider Checks

- [ ] Context value is memoized
- [ ] Context doesn't recreate on every render
- [ ] Large data in context is minimized
- [ ] Context cleanup on unmount
- [ ] No circular references

---

## Store/State Management Checks

- [ ] Store data has size limits
- [ ] Old data is evicted (LRU, TTL, etc.)
- [ ] Store subscriptions are cleaned up
- [ ] No duplicate data in store
- [ ] Store doesn't grow unbounded

---

## Image/Asset Checks

- [ ] Images are lazy loaded
- [ ] Images are unloaded when not visible
- [ ] Image cache has size limits
- [ ] Large images are optimized
- [ ] Image loading is cancelled on unmount

---

## Verification Steps

After fixing each file:

1. **Test the component:**
   - [ ] Mount/unmount multiple times
   - [ ] Check memory before/after
   - [ ] Verify cleanup runs
   - [ ] Check for console errors

2. **Memory profiling:**
   - [ ] Take heap snapshot before
   - [ ] Use component for 5 minutes
   - [ ] Take heap snapshot after
   - [ ] Compare memory usage
   - [ ] Verify no growth

3. **Integration testing:**
   - [ ] Test with other components
   - [ ] Test navigation to/from component
   - [ ] Test extended usage
   - [ ] Verify no regressions

---

## Progress Tracking

### File Review Status
- [ ] Phase 1: Critical files (10 files)
- [ ] Phase 2: High priority files (20 files)
- [ ] Phase 3: Medium priority files (30 files)
- [ ] Phase 4: Remaining files (94 files)

### Fix Status
- [ ] Quick fixes applied
- [ ] Medium optimizations applied
- [ ] Architecture changes applied
- [ ] All fixes tested
- [ ] Memory targets met

---

## Notes Section

Use this space to document findings for each file:

### File: [filename]
**Issues Found:**
1. 
2. 
3. 

**Fixes Applied:**
1. 
2. 
3. 

**Memory Impact:**
- Before: ___ MB
- After: ___ MB
- Improvement: ___ MB

---

## Quick Reference: Common Fixes

| Issue | Quick Fix |
|-------|-----------|
| Missing cleanup | Add `return () => { cleanup }` to useEffect |
| Accumulating data | Add `.slice(-N)` or limit to last N items |
| Subscription leak | Add `unsubscribe()` in cleanup |
| Event listener leak | Add `removeEventListener()` in cleanup |
| Timer leak | Add `clearInterval/clearTimeout()` in cleanup |
| Large state | Move to `useRef` if re-render not needed |
| Unbounded cache | Add size limit with LRU eviction |
| Large context value | Wrap in `useMemo` |

