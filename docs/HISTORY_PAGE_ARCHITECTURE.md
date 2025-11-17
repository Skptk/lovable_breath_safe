# History Page Architecture & Charting System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Time Range Selection System](#time-range-selection-system)
5. [Data Fetching Layer](#data-fetching-layer)
6. [Data Transformation Pipeline](#data-transformation-pipeline)
7. [Chart Rendering System](#chart-rendering-system)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Potential Issues & Debugging](#potential-issues--debugging)

---

## Overview

The History Page displays air quality readings in two views:
- **Chart View**: Interactive line charts showing AQI and pollutant trends over time
- **Table View**: Paginated list of individual readings with selection and deletion

The system uses React Query for data fetching, Recharts for visualization, and implements sophisticated data binning/aggregation for performance.

---

## Component Architecture

### Main Components

```
HistoryView (Main Container)
├── TimeRangeSelector (Time range picker)
├── HistoricalAQIChart (Air quality chart)
├── HistoricalWeatherChart (Weather chart)
└── HistoryRow[] (Table view rows)
```

### Key Files

1. **`src/components/HistoryView.tsx`** - Main container component
2. **`src/components/HistoryView/HistoricalAQIChart.tsx`** - Chart visualization
3. **`src/components/HistoryView/utils/chartDataTransform.ts`** - Data transformation logic
4. **`src/components/HistoryView/TimeRangeSelector.tsx`** - Time range UI
5. **`src/hooks/useHistoricalAQIData.ts`** - React Query hook for data fetching

---

## Data Flow

### Complete Flow Diagram

```
User Action (Time Range Change)
    ↓
TimeRangeSelector.onRangeChange()
    ↓
HistoryView.setTimeRange() [State Update]
    ↓
useHistoricalAQIData Hook [Query Key Changes]
    ↓
React Query Refetch
    ↓
Supabase Query (Filtered by Time Range)
    ↓
transformHistoryRow() [Raw → HistoryEntry]
    ↓
chartData useMemo [HistoryEntry[] → ChartDataPoint[]]
    ↓
transformHistoryForChart() [Binning & Aggregation]
    ↓
HistoricalAQIChart Component [Rendering]
    ↓
Recharts LineChart [Visualization]
```

### State Management

**HistoryView State:**
- `timeRange: TimeRange` - Current time range selection
- `viewMode: 'chart' | 'table'` - Current view mode
- `history: HistoryEntry[]` - Table view data (paginated)
- `chartHistoryData: HistoryEntry[]` - Chart data (from React Query)

**HistoricalAQIChart State:**
- `selectedPollutants: Set<PollutantKey>` - Which pollutants to display
- `dimensions: { width, height }` - Chart container size
- `chartData: any[]` - Transformed data for Recharts

---

## Time Range Selection System

### TimeRange Type

```typescript
type TimeRange = {
  type: '24h' | '7d' | '30d' | '90d' | 'ALL' | 'CUSTOM';
  start?: Date;  // Only for CUSTOM
  end?: Date;    // Only for CUSTOM
};
```

### TimeRangeSelector Component

**Location:** `src/components/HistoryView/TimeRangeSelector.tsx`

**How it works:**
1. User clicks a quick range button (24h, 7d, 30d, 90d, All)
2. `handleQuickRange()` is called with the range type
3. Uses `startTransition()` to defer state update (non-blocking)
4. Calls `onRangeChange({ type })` which updates `HistoryView` state
5. For custom ranges, user selects start/end dates, then clicks "Apply"

**Key Code:**
```typescript
const handleQuickRange = useCallback((type: TimeRange['type']) => {
  startTransition(() => {
    onRangeChange({ type });
  });
}, [onRangeChange]);
```

**Important:** The `startTransition` wrapper makes the state update non-urgent, allowing React to keep the UI responsive during the transition.

### Time Range Calculation

**Function:** `calculateTimeRange()` in `chartDataTransform.ts`

**How it works:**
- Takes a `TimeRange['type']` and optional custom dates
- Calculates `start` and `end` Date objects
- For predefined ranges, calculates relative to current time:
  - `24h`: Now - 24 hours
  - `7d`: Now - 7 days
  - `30d`: Now - 30 days
  - `90d`: Now - 90 days
  - `ALL`: Start = `new Date(0)` (epoch), End = Now
  - `CUSTOM`: Uses provided start/end dates

**Example:**
```typescript
// When user selects "24h"
const { start, end } = calculateTimeRange('24h');
// start = new Date(Date.now() - 24 * 60 * 60 * 1000)
// end = new Date()
```

---

## Data Fetching Layer

### useHistoricalAQIData Hook

**Location:** `src/hooks/useHistoricalAQIData.ts`

**How it works:**
1. Uses React Query's `useQuery` hook
2. Query key includes: `['historical-aqi', userId, timeRange.type, timeRange.start, timeRange.end]`
3. When `timeRange` changes, the query key changes, triggering a refetch
4. Fetches from Supabase `air_quality_readings` table
5. Filters by:
   - `user_id` (always)
   - `timestamp` range (if not 'ALL')
6. Orders by `timestamp` ascending (for chronological chart)
7. Transforms raw rows to `HistoryEntry` objects

**Query Configuration:**
- `enabled: !!userId` - Only runs if user is logged in
- `staleTime: 5 minutes` - Data considered fresh for 5 minutes
- `gcTime: 15 minutes` - Cache kept for 15 minutes
- `retry: 2` - Retries failed requests twice
- `retryDelay: 1000ms` - 1 second between retries

**Critical Issue Point:**
When time range changes (e.g., 90d → 24h):
1. Query key changes → React Query invalidates cache
2. New query starts fetching
3. **During fetch, `chartHistoryData` may be `undefined` or stale**
4. Chart component receives undefined/old data
5. Transformation may fail if data structure is unexpected

---

## Data Transformation Pipeline

### Step 1: Raw Database → HistoryEntry

**Function:** `transformHistoryRow()` in `useHistoricalAQIData.ts`

**Transforms:**
- Raw Supabase row → Typed `HistoryEntry`
- Handles null/undefined values
- Normalizes location names
- Converts all numeric fields using `safeNumber()` helper

**Output:** `HistoryEntry[]` with all fields properly typed

### Step 2: HistoryEntry[] → ChartDataPoint[]

**Function:** `transformHistoryForChart()` in `chartDataTransform.ts`

**Process:**

1. **Filter by Time Range:**
   ```typescript
   if (timeRange.type !== 'ALL') {
     filteredEntries = entries.filter((entry) => {
       const entryDate = new Date(entry.timestamp);
       return entryDate >= start && entryDate <= end;
     });
   }
   ```

2. **Sort Chronologically:**
   ```typescript
   const sortedEntries = [...filteredEntries].sort(
     (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
   );
   ```

3. **Determine Binning:**
   - Calculates if binning is needed based on point count vs threshold
   - Threshold is adaptive based on viewport size (400-1000 points)
   - Bin size calculated: `binSizeHours = rangeHours / targetBins`

4. **Limit Entries:**
   ```typescript
   const maxEntriesToProcess = Math.min(sortedEntries.length, threshold * 2);
   const entriesToProcess = sortedEntries.slice(-maxEntriesToProcess); // Most recent
   ```

5. **Transform to ChartDataPoint:**
   ```typescript
   const chartPoints = entriesToProcess.map((entry) => ({
     timestamp: new Date(entry.timestamp),
     displayTime: formatTimestamp(entryDate, timeRange),
     aqi: entry.aqi,
     value: entry.aqi,
     location: entry.location_name,
     fullEntry: entry,
     pm25: entry.pm25,
     pm10: entry.pm10,
     // ... other pollutants
   }));
   ```

6. **Apply Binning (if needed):**
   - Groups points into time bins
   - Averages AQI and pollutant values within each bin
   - Creates aggregated `ChartDataPoint` objects

**Output:** `{ data: ChartDataPoint[], meta: { originalCount, binnedCount, binSizeHours } }`

### Step 3: ChartDataPoint[] → Recharts Data

**Location:** `HistoricalAQIChart.tsx` - `chartData` useMemo

**Process:**

1. **Validate Input:**
   ```typescript
   if (!data || !Array.isArray(data) || data.length === 0) return [];
   ```

2. **Limit Points:**
   ```typescript
   const maxPoints = 500;
   const pointsToUse = data.length > maxPoints ? data.slice(-maxPoints) : data;
   ```

3. **Transform for Recharts:**
   - Converts `timestamp: Date` → `timestamp: number` (milliseconds)
   - Validates all numeric values (checks for NaN)
   - Handles null/undefined pollutants
   - Creates safe data structure for Recharts

4. **Error Handling:**
   - Wraps each point transformation in try-catch
   - Skips invalid points but continues processing
   - Returns empty array on critical errors

**Output:** Array of objects compatible with Recharts `LineChart`

---

## Chart Rendering System

### HistoricalAQIChart Component

**Location:** `src/components/HistoryView/HistoricalAQIChart.tsx`

### Component Lifecycle

1. **Mount:**
   - Initializes `selectedPollutants` state (default: `['pm25']`)
   - Sets up ResizeObserver for container dimensions
   - Calculates available pollutants from data

2. **Data Processing:**
   - `availablePollutants` useMemo: Scans data for non-null pollutants
   - `chartData` useMemo: Transforms data for Recharts
   - `yAxisDomain` useMemo: Calculates Y-axis min/max based on selected pollutants
   - `yAxisLabel` useMemo: Determines Y-axis label (unit) based on selected pollutants

3. **Pollutant Selection:**
   - User can toggle pollutants via buttons
   - At least one pollutant must always be selected
   - If selected pollutant becomes unavailable, auto-selects first available

4. **Rendering:**
   - Uses Recharts `LineChart` component
   - Renders one `Line` component per selected pollutant
   - Each line has unique color from `POLLUTANT_CONFIGS`
   - Tooltip shows AQI + selected pollutant values

### ResizeObserver System

**Purpose:** Dynamically adjust chart dimensions without forced reflows

**How it works:**
1. Observes container `div` for size changes
2. Debounces updates (200ms timeout)
3. Uses `requestAnimationFrame` to batch updates
4. Only updates if change is significant (>10px)
5. Uses `startTransition` to defer state updates

**Fallback:** If ResizeObserver unavailable, uses IntersectionObserver + window resize listener

### Y-Axis Domain Calculation

**Critical Logic:**
```typescript
const yAxisDomain = useMemo(() => {
  if (chartData.length === 0) return [0, 100];
  
  // If showing pollutants, calculate based on pollutant values
  if (selectedPollutants.size > 0) {
    const allValues: number[] = [];
    selectedPollutants.forEach(pollKey => {
      chartData.forEach(d => {
        const value = (d as any)[pollKey];
        if (value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)) {
          allValues.push(value);
        }
      });
    });
    
    if (allValues.length > 0) {
      const min = Math.max(0, Math.min(...allValues) * 0.9);
      const max = Math.max(...allValues) * 1.1;
      return [min, max];
    }
  }
  
  // Fallback to AQI domain
  const aqiValues = chartData.map((d) => d.aqi).filter(v => typeof v === 'number' && !isNaN(v));
  if (aqiValues.length > 0) {
    const minAQI = Math.max(0, Math.min(...aqiValues) - 10);
    const maxAQI = Math.min(500, Math.max(...aqiValues) + 10);
    return [minAQI, maxAQI];
  }
  
  return [0, 100]; // Default fallback
}, [chartData, selectedPollutants]);
```

**Issue:** If `chartData` is empty or all values are null during time range transition, domain calculation may fail.

---

## Error Handling & Edge Cases

### HistoryView Component

**Chart Data Transformation:**
```typescript
const chartData = useMemo(() => {
  try {
    if (!chartHistoryData || chartHistoryData.length === 0) {
      return { data: [], meta: { originalCount: 0, binnedCount: 0, binSizeHours: 0 } };
    }
    const threshold = getAdaptivePointThreshold();
    const safeThreshold = Math.min(threshold, 800);
    return transformHistoryForChart(chartHistoryData, timeRange, safeThreshold);
  } catch (error) {
    console.error('Error transforming chart data:', error);
    return { data: [], meta: { originalCount: 0, binnedCount: 0, binSizeHours: 0 } };
  }
}, [chartHistoryData, timeRange]);
```

**Chart Rendering Guard:**
```typescript
{chartData && chartData.data && Array.isArray(chartData.data) ? (
  <HistoricalAQIChart ... />
) : (
  <GlassCard>No chart data available</GlassCard>
)}
```

### HistoricalAQIChart Component

**Multiple Error Boundaries:**

1. **Available Pollutants:**
   ```typescript
   const availablePollutants = useMemo(() => {
     try {
       if (!data || !Array.isArray(data) || data.length === 0) return new Set<PollutantKey>();
       // ... scan for pollutants
     } catch (error) {
       console.error('Error determining available pollutants:', error);
       return new Set<PollutantKey>();
     }
   }, [data]);
   ```

2. **Chart Data Transformation:**
   ```typescript
   const chartData = useMemo(() => {
     try {
       // ... transformation logic
       // Each point wrapped in try-catch
     } catch (error) {
       console.error('Error transforming chart data:', error);
       return [];
     }
   }, [data]);
   ```

3. **Y-Axis Domain:**
   ```typescript
   const yAxisDomain = useMemo(() => {
     try {
       // ... calculation logic
     } catch (error) {
       console.error('Error calculating Y-axis domain:', error);
     }
     return [0, 100]; // Default fallback
   }, [chartData, selectedPollutants]);
   ```

4. **Y-Axis Label:**
   ```typescript
   const yAxisLabel = useMemo(() => {
     try {
       // ... calculation logic
     } catch (error) {
       console.error('Error calculating Y-axis label:', error);
       return 'Value';
     }
   }, [selectedPollutants]);
   ```

5. **Safety Check Before Render:**
   ```typescript
   if (!Array.isArray(chartData)) {
     return <GlassCard>Invalid chart data</GlassCard>;
   }
   ```

### ChartTooltip Component

**Error Handling:**
```typescript
const ChartTooltip = memo(({ active, payload, label }: any) => {
  try {
    // ... tooltip rendering
  } catch (error) {
    console.error('Error rendering tooltip:', error);
    return null;
  }
});
```

---

## Potential Issues & Debugging

### Issue: Error Boundary Triggers on Time Range Change

**Scenario:** User switches from 90d → 24h, error boundary catches error

**Root Causes:**

1. **Race Condition During Data Fetch:**
   - `timeRange` state updates
   - React Query starts new fetch
   - `chartHistoryData` becomes `undefined` temporarily
   - `chartData` useMemo runs with `undefined`
   - Transformation fails

2. **Empty Data After Filtering:**
   - New time range (24h) may have no data
   - `filteredEntries.length === 0`
   - Chart tries to render with empty data
   - Y-axis domain calculation fails

3. **Type Mismatch:**
   - During transition, data structure may be inconsistent
   - `timestamp` may be string instead of Date
   - Pollutant values may be in unexpected format

4. **Binning Calculation Error:**
   - When switching from large range (90d) to small (24h)
   - Bin size calculation may produce invalid values
   - Division by zero or negative values

**Debugging Steps:**

1. **Check React Query State:**
   ```typescript
   const { data, isLoading, error, isFetching } = useHistoricalAQIData(...);
   console.log({ data, isLoading, error, isFetching });
   ```

2. **Check Chart Data Transformation:**
   ```typescript
   console.log('chartHistoryData:', chartHistoryData);
   console.log('timeRange:', timeRange);
   console.log('chartData:', chartData);
   ```

3. **Check Chart Component State:**
   ```typescript
   console.log('availablePollutants:', availablePollutants);
   console.log('chartData (internal):', chartData);
   console.log('yAxisDomain:', yAxisDomain);
   ```

### Issue: Chart Doesn't Update on Time Range Change

**Possible Causes:**
- React Query cache not invalidating
- `timeRange` state not updating
- `chartData` useMemo dependencies incorrect

**Solution:**
- Ensure query key includes all timeRange properties
- Check that `setTimeRange` is actually called
- Verify useMemo dependencies: `[chartHistoryData, timeRange]`

### Issue: Performance Degradation with Large Datasets

**Symptoms:**
- Chart rendering is slow
- UI freezes during time range changes
- Memory usage spikes

**Causes:**
- Too many data points rendered
- Binning not applied correctly
- ResizeObserver firing too frequently

**Solutions:**
- Reduce `maxPoints` limit (currently 500)
- Increase binning threshold
- Add more aggressive debouncing to ResizeObserver

### Issue: Pollutant Lines Not Showing

**Possible Causes:**
- Pollutant values are all null in data
- `availablePollutants` not detecting pollutants
- `selectedPollutants` state not updating

**Debug:**
```typescript
console.log('Data sample:', data[0]);
console.log('Available pollutants:', availablePollutants);
console.log('Selected pollutants:', selectedPollutants);
```

---

## Key Takeaways

1. **Time Range Changes Trigger Full Refetch:**
   - React Query invalidates cache
   - New query starts immediately
   - Chart must handle loading/undefined states

2. **Data Transformation is Multi-Stage:**
   - Raw DB → HistoryEntry → ChartDataPoint → Recharts Data
   - Each stage has error handling
   - Failures should return safe defaults

3. **Chart Rendering is Defensive:**
   - Multiple validation checks
   - Try-catch blocks at every level
   - Graceful degradation to empty states

4. **Performance Optimizations:**
   - Point limiting (500 max)
   - Binning for large datasets
   - Debounced resize handling
   - Memoization throughout

5. **Error Boundary Catches Unhandled Errors:**
   - All errors should be caught and handled
   - If error boundary triggers, an error escaped all guards
   - Check console for specific error messages

---

## Recommended Fixes for Time Range Transition Error

1. **Add Loading State Guard:**
   ```typescript
   if (chartLoading || !chartHistoryData) {
     return <LoadingState />;
   }
   ```

2. **Validate Data Before Transformation:**
   ```typescript
   if (!chartHistoryData || !Array.isArray(chartHistoryData)) {
     return { data: [], meta: {...} };
   }
   ```

3. **Handle Empty Results Gracefully:**
   ```typescript
   if (filteredEntries.length === 0) {
     // Return empty but valid structure
     return { data: [], meta: { originalCount: 0, ... } };
   }
   ```

4. **Add Transition State:**
   ```typescript
   const [isTransitioning, setIsTransitioning] = useState(false);
   
   useEffect(() => {
     setIsTransitioning(true);
     const timer = setTimeout(() => setIsTransitioning(false), 100);
     return () => clearTimeout(timer);
   }, [timeRange]);
   ```

5. **Defensive Y-Axis Calculation:**
   ```typescript
   if (chartData.length === 0 || !Array.isArray(chartData)) {
     return [0, 100];
   }
   ```

---

## Conclusion

The history page charting system is complex with multiple layers of data transformation and rendering. The error boundary triggering on time range changes suggests an unhandled edge case during the transition period when data is being refetched. The recommended fixes focus on adding more defensive checks and handling loading/transition states explicitly.

