# Memory Optimization Investigation & Fix Plan
## Target: Reduce RAM usage to < 400MB

---

## Phase 1: Baseline Measurement & Profiling (Days 1-2)

### 1.1 Establish Memory Baseline
- [ ] **Set up Chrome DevTools Memory Profiler**
  - Record heap snapshots at app startup
  - Record snapshots after 5, 10, 30 minutes of usage
  - Record snapshots after navigating between major pages
  - Document baseline memory usage patterns

- [ ] **Implement Runtime Memory Monitoring**
  - Activate existing `MemoryMonitorOverlay` component
  - Enable `useMemoryMonitor` hook tracking
  - Log memory usage every 30 seconds
  - Track heap size, JS heap used, DOM nodes count
  - Monitor for memory growth trends

- [ ] **Create Memory Usage Dashboard**
  - Display real-time memory metrics in dev mode
  - Track memory by component/page
  - Identify memory spikes during user interactions

### 1.2 Identify High-Memory Areas
- [ ] **Component Memory Audit**
  - Scan all 148 `.tsx` files for:
    - Large state objects
    - Unbounded arrays/collections
    - Heavy data structures (charts, maps, images)
    - Cached data without limits
  - Count total `useState`, `useMemo`, `useCallback` instances (currently 855+)
  - Identify components with >10 state variables

- [ ] **Data Fetching Audit**
  - Review all API calls and data fetching hooks
  - Check for:
    - Unbounded data accumulation
    - Missing pagination
    - No data cleanup on unmount
    - Duplicate data fetching

---

## Phase 2: Systematic Codebase Scan (Days 3-7)

### 2.1 React Hook Analysis (Priority: CRITICAL)
**Target Files:** All 104 files using React hooks

#### 2.1.1 useEffect Cleanup Issues
- [ ] **Scan Pattern:** `useEffect` without cleanup functions
  ```bash
  # Find useEffect without return statements
  grep -r "useEffect" --include="*.tsx" --include="*.ts" | grep -v "return"
  ```
- [ ] **Check for:**
  - Event listeners not removed
  - Timers/intervals not cleared
  - Subscriptions not unsubscribed
  - WebSocket connections not closed
  - AbortControllers not aborted

#### 2.1.2 State Management Issues
- [ ] **Scan for:**
  - `useState` with large initial values
  - State that accumulates data over time
  - State that should be in refs instead
  - Duplicate state across components
  - State that persists after unmount

#### 2.1.3 Memoization Issues
- [ ] **Scan for:**
  - `useMemo` with missing dependencies (causing stale closures)
  - `useMemo` that should be `useCallback`
  - Unnecessary memoization of small values
  - Missing memoization of expensive computations
  - Memoized objects/arrays that change on every render

### 2.2 Subscription & Real-time Connection Audit (Priority: CRITICAL)
**Target Files:**
- `src/contexts/RealtimeContext.tsx`
- `src/contexts/OptimizedRealtimeContext.tsx`
- `src/hooks/useMemorySafeSubscription.ts`
- `src/hooks/useStableChannelSubscription.ts`
- `src/hooks/useGracefulRealtime.ts`
- `src/hooks/useWebSocket.ts`
- `src/components/ProfileView.tsx` (has subscription)

- [ ] **Check for:**
  - Multiple subscriptions to same channel
  - Subscriptions not cleaned up on unmount
  - Reconnection logic creating duplicate subscriptions
  - Event listeners accumulating
  - Channel references not nullified

### 2.3 Data Storage & Caching Audit
**Target Files:**
- `src/store/weatherStore.ts`
- `src/store/index.ts`
- All hooks that cache data

- [ ] **Check for:**
  - Unbounded cache sizes
  - Cache entries never expiring
  - Duplicate data in multiple stores
  - Large objects stored in memory
  - No cache eviction policies

### 2.4 Component Lifecycle Issues
- [ ] **Scan for:**
  - Components that mount but never unmount
  - Lazy-loaded components not being cleaned up
  - Modal/dialog components retaining state after close
  - Route components not cleaning up on navigation

### 2.5 Third-Party Library Memory Leaks
- [ ] **Check heavy libraries:**
  - Leaflet maps (`src/components/LeafletMap.tsx`)
  - Chart libraries (Recharts, etc.)
  - Animation libraries (Framer Motion)
  - Image loading libraries
  - Ensure proper cleanup/disposal

---

## Phase 3: Specific Problem Areas to Investigate (Days 8-10)

### 3.1 High-Priority Components (Based on Complexity)

#### 3.1.1 HistoryView Component
- [ ] **File:** `src/components/HistoryView.tsx` (36 hooks)
- [ ] **Check:**
  - Large data arrays for historical readings
  - Chart data accumulation
  - Filter state management
  - Virtual scrolling implementation (if any)

#### 3.1.2 AirQualityDashboard Component
- [ ] **File:** `src/components/AirQualityDashboard.tsx` (13 hooks)
- [ ] **Check:**
  - Real-time data accumulation
  - Chart rendering memory
  - Pollutant data storage
  - Weather data caching

#### 3.1.3 ProfileView Component
- [ ] **File:** `src/components/ProfileView.tsx` (30 hooks)
- [ ] **Check:**
  - Subscription cleanup (already identified)
  - Achievement data storage
  - Points history accumulation
  - Profile image caching

#### 3.1.4 MapView Component
- [ ] **File:** `src/components/MapView.tsx` (18 hooks)
- [ ] **Check:**
  - Leaflet map instance cleanup
  - Marker accumulation
  - Tile layer memory
  - Event listener cleanup

### 3.2 Data Fetching Hooks
- [ ] **File:** `src/hooks/useAirQuality.ts` (16 hooks)
- [ ] **Check:**
  - Query result caching
  - Polling interval cleanup
  - AbortController usage
  - Data accumulation over time

- [ ] **File:** `src/hooks/useWeatherData.ts` (17 hooks)
- [ ] **Check:**
  - Weather data caching
  - Forecast data storage
  - API response storage

### 3.3 Context Providers
- [ ] **Review all context providers:**
  - `AuthContext.tsx` (11 hooks)
  - `LocationContext.tsx` (10 hooks)
  - `RealtimeContext.tsx` (13 hooks)
  - `OptimizedRealtimeContext.tsx` (9 hooks)
  - `ThemeContext.tsx` (5 hooks)
- [ ] **Check for:**
  - Context value recreation on every render
  - Large context values
  - Missing memoization

---

## Phase 4: Fix Implementation Strategy (Days 11-20)

### 4.1 Immediate Fixes (Quick Wins)

#### 4.1.1 Add Missing Cleanup Functions
- [ ] **Pattern:** Add cleanup to all `useEffect` hooks
  ```typescript
  useEffect(() => {
    // Setup
    const subscription = subscribe();
    const timer = setInterval(...);
    const listener = addEventListener(...);
    
    return () => {
      // Cleanup
      subscription.unsubscribe();
      clearInterval(timer);
      removeEventListener(listener);
    };
  }, [dependencies]);
  ```

#### 4.1.2 Implement Data Limits
- [ ] **Add pagination** to all data fetching
- [ ] **Limit cache sizes** (e.g., max 100 items)
- [ ] **Implement LRU cache** for frequently accessed data
- [ ] **Add data expiration** (TTL-based cleanup)

#### 4.1.3 Fix Subscription Leaks
- [ ] **Ensure all subscriptions unsubscribe** on unmount
- [ ] **Prevent duplicate subscriptions** (check before subscribing)
- [ ] **Clean up reconnection logic** to avoid accumulation

### 4.2 Medium-Term Optimizations

#### 4.2.1 Optimize State Management
- [ ] **Convert large state to refs** where appropriate
- [ ] **Split large components** into smaller ones
- [ ] **Use state machines** for complex state logic
- [ ] **Implement state normalization** for related data

#### 4.2.2 Implement Virtual Scrolling
- [ ] **Add virtual scrolling** to long lists (HistoryView, etc.)
- [ ] **Render only visible items** + buffer
- [ ] **Unmount off-screen components**

#### 4.2.3 Optimize Memoization
- [ ] **Fix dependency arrays** in useMemo/useCallback
- [ ] **Memoize expensive computations**
- [ ] **Remove unnecessary memoization**
- [ ] **Use React.memo** for heavy components

#### 4.2.4 Image & Asset Optimization
- [ ] **Lazy load images** below the fold
- [ ] **Use WebP format** for images
- [ ] **Implement image caching** with size limits
- [ ] **Unload images** when components unmount

### 4.3 Long-Term Architectural Changes

#### 4.3.1 Implement Memory Budget System
- [ ] **Use existing `memoryBudgetManager.ts`** more extensively
- [ ] **Set memory limits** per component/page
- [ ] **Implement automatic cleanup** when limits exceeded
- [ ] **Add memory pressure callbacks**

#### 4.3.2 Data Architecture Refactoring
- [ ] **Implement data normalization** (Redux-like pattern)
- [ ] **Use IndexedDB** for large datasets instead of memory
- [ ] **Implement data streaming** for real-time updates
- [ ] **Add data compression** for stored data

#### 4.3.3 Component Architecture
- [ ] **Code splitting** - lazy load routes
- [ ] **Component preloading** strategy
- [ ] **Remove unused components** from bundle
- [ ] **Tree shaking** optimization

---

## Phase 5: Verification & Monitoring (Days 21-25)

### 5.1 Memory Testing Protocol
- [ ] **Create automated memory tests**
  - Test each major user flow
  - Measure memory before/after each action
  - Verify memory returns to baseline after cleanup
  - Test extended usage (1+ hour sessions)

### 5.2 Continuous Monitoring
- [ ] **Implement production memory monitoring**
  - Track memory usage in production
  - Alert when memory exceeds 350MB (safety margin)
  - Log memory spikes with user actions
  - Track memory trends over time

### 5.3 Performance Budget Enforcement
- [ ] **Set memory budget: 400MB max**
- [ ] **Add memory checks in CI/CD**
- [ ] **Fail builds if memory exceeds budget**
- [ ] **Generate memory reports** for each release

---

## Phase 6: Specific Code Patterns to Fix

### 6.1 Common Memory Leak Patterns Found

#### Pattern 1: Missing Cleanup in useEffect
```typescript
// ❌ BAD
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
  // Missing cleanup!
}, []);

// ✅ GOOD
useEffect(() => {
  const interval = setInterval(() => {}, 1000);
  return () => clearInterval(interval);
}, []);
```

#### Pattern 2: Accumulating Data in State
```typescript
// ❌ BAD
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(newData => {
    setData(prev => [...prev, ...newData]); // Grows forever
  });
}, []);

// ✅ GOOD
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(newData => {
    setData(prev => {
      const updated = [...prev, ...newData];
      return updated.slice(-100); // Keep only last 100
    });
  });
}, []);
```

#### Pattern 3: Unsubscribed Subscriptions
```typescript
// ❌ BAD
useEffect(() => {
  const channel = supabase.channel('test');
  channel.subscribe(() => {});
  // Missing unsubscribe!
}, []);

// ✅ GOOD
useEffect(() => {
  const channel = supabase.channel('test');
  const subscription = channel.subscribe(() => {});
  return () => {
    subscription.unsubscribe();
    channel.unsubscribe();
  };
}, []);
```

#### Pattern 4: Large Objects in Context
```typescript
// ❌ BAD
const ContextValue = {
  largeData: hugeArray, // Recreated every render
  functions: { ... }
};

// ✅ GOOD
const ContextValue = useMemo(() => ({
  largeData: hugeArray,
  functions: { ... }
}), [hugeArray]);
```

---

## Phase 7: Execution Checklist

### Week 1: Measurement & Analysis
- [ ] Day 1-2: Set up memory profiling tools
- [ ] Day 3-4: Run baseline measurements
- [ ] Day 5: Identify top 10 memory consumers
- [ ] Day 6-7: Document findings

### Week 2: Quick Fixes
- [ ] Day 8-9: Fix missing cleanup functions
- [ ] Day 10-11: Fix subscription leaks
- [ ] Day 12: Add data limits
- [ ] Day 13-14: Test and verify improvements

### Week 3: Optimizations
- [ ] Day 15-16: Optimize state management
- [ ] Day 17: Implement virtual scrolling
- [ ] Day 18: Optimize memoization
- [ ] Day 19-20: Image/asset optimization

### Week 4: Architecture & Verification
- [ ] Day 21-22: Implement memory budget system
- [ ] Day 23: Data architecture improvements
- [ ] Day 24: Component architecture refactoring
- [ ] Day 25: Final testing and verification

---

## Success Criteria

### Memory Targets
- ✅ **Initial load:** < 150MB
- ✅ **After 5 minutes:** < 250MB
- ✅ **After 30 minutes:** < 350MB
- ✅ **Peak usage:** < 400MB
- ✅ **After cleanup:** Return to < 200MB

### Performance Metrics
- ✅ No memory leaks (stable memory over time)
- ✅ Memory returns to baseline after navigation
- ✅ No memory accumulation during extended use
- ✅ Smooth performance with memory constraints

---

## Tools & Resources

### Chrome DevTools
- Memory Profiler
- Performance Monitor
- Heap Snapshots
- Allocation Timeline

### Existing Codebase Tools
- `src/utils/memoryMonitor.ts`
- `src/utils/memoryBudgetManager.ts`
- `src/components/MemoryMonitorOverlay.tsx`
- `src/hooks/useMemoryMonitor.ts`

### Additional Tools to Consider
- React DevTools Profiler
- `why-did-you-render` for render tracking
- `@welldone-software/why-did-you-render`

---

## Risk Mitigation

### Potential Risks
1. **Breaking changes** during refactoring
2. **Performance regressions** from over-optimization
3. **Missing edge cases** in cleanup logic
4. **User experience impact** from aggressive cleanup

### Mitigation Strategies
1. **Incremental changes** with testing at each step
2. **Feature flags** for new optimizations
3. **Comprehensive testing** before deployment
4. **User testing** to verify UX not impacted
5. **Rollback plan** for each major change

---

## Notes

- This plan assumes 25 working days
- Priority should be on Phase 2 (codebase scan) and Phase 4 (fixes)
- Quick wins in Phase 4.1 should be implemented first
- Continuous monitoring (Phase 5) should be ongoing
- Memory budget enforcement should be permanent

---

## Next Steps

1. **Review this plan** and adjust timeline if needed
2. **Set up memory profiling** environment
3. **Begin Phase 1** baseline measurements
4. **Prioritize** based on initial findings
5. **Execute** fixes incrementally with testing

