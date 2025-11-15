# Weather Page Standardization Plan
## Aligning Weather Page with History Page Design & Functionality

---

## 📋 Executive Summary

Standardize the Weather Stats page to match the History page's modern, chart-based interface with chart/table toggle, time range selectors, and performance optimizations. This will create site-wide cohesion and provide users with historical weather data visualization capabilities.

---

## 🎯 Objectives

1. **Match History Page Structure**: Implement chart/table toggle, time range selectors, and consistent layout
2. **Add Historical Weather Charts**: Visualize temperature, humidity, wind speed, and precipitation over time
3. **Reuse Existing Components**: Leverage chart components, utilities, and patterns from History page
4. **Maintain Current Features**: Preserve forecast, current conditions, map, and wind dashboard
5. **Performance Optimized**: Apply same optimizations (ResizeObserver, debouncing, data limiting)
6. **Consistent UI/UX**: Use same GlassCard styling, Header component, and interaction patterns

---

## 📊 Current State Analysis

### Existing Weather Page Components

**Main Component**: `src/components/WeatherStats.tsx` (~780 lines)
- Current weather display (temperature, humidity, wind)
- Location permission handling
- Integration with weather store
- Forecast component integration
- Map integration (lazy loaded)
- Wind dashboard integration

**Supporting Components**:
- `WeatherForecast.tsx`: 7-day forecast grid
- `WeatherStatsCard.tsx`: Current weather stats card
- `WindDashboard.tsx`: Wind visualization

**Data Sources**:
- `air_quality_readings` table (contains weather fields: temperature, humidity, wind_speed, wind_direction, air_pressure, etc.)
- `useWeatherStore`: Zustand store for current weather
- `useWeatherData`: Hook for weather API calls
- Open-Meteo API: Forecast data

**Current Layout Structure**:
```
┌─────────────────────────────────────────┐
│ Header: "Weather & Air Quality Stats"   │
├─────────────────────────────────────────┤
│ Location Permission Banner (if needed)  │
├─────────────────────────────────────────┤
│ Stats Overview Cards (3-column grid)     │
│ - Air Quality Index                      │
│ - Current Location                       │
│ - Weather Conditions                     │
├─────────────────────────────────────────┤
│ Weather Forecast (7-day grid)           │
├─────────────────────────────────────────┤
│ Map View (lazy loaded)                   │
├─────────────────────────────────────────┤
│ Wind Dashboard                           │
└─────────────────────────────────────────┘
```

### History Page Structure (Reference)

```
┌─────────────────────────────────────────┐
│ Header: "Air Quality History"            │
├─────────────────────────────────────────┤
│ View Toggle: [Chart] [Table]            │
│ Time Range: [24h] [7d] [30d] [90d] [All]│
├─────────────────────────────────────────┤
│ Chart View (if selected)                 │
│ - Historical AQI Chart                  │
│ - Interactive tooltip                    │
│ - Click to view details                  │
├─────────────────────────────────────────┤
│ Table View (if selected)                 │
│ - Paginated entries                      │
│ - Bulk operations                        │
│ - Detail modal                           │
└─────────────────────────────────────────┘
```

---

## 🎨 Proposed Weather Page Structure

### New Layout Design

```
┌─────────────────────────────────────────┐
│ Header: "Weather & Air Quality Stats"   │
├─────────────────────────────────────────┤
│ View Toggle: [Charts] [Overview]        │
│ Time Range: [24h] [7d] [30d] [90d] [All]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Charts View (if selected)           │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Metric Selector                 │ │ │
│ │ │ [Temperature] [Humidity] [Wind] │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Historical Weather Chart         │ │ │
│ │ │ - Line chart with selected metric│ │ │
│ │ │ - Interactive tooltip            │ │ │
│ │ │ - Time range filtering           │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Multi-Metric Comparison Chart   │ │ │
│ │ │ (Optional: show multiple lines) │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Overview View (if selected)         │ │
│ │ - Current Conditions Cards          │ │
│ │ - 7-Day Forecast                    │ │
│ │ - Map View                          │ │
│ │ - Wind Dashboard                    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Data Infrastructure

#### 1.1 Create Historical Weather Data Hook
**File**: `src/hooks/useHistoricalWeatherData.ts`

**Purpose**: Fetch historical weather data from `air_quality_readings` table, similar to `useHistoricalAQIData`

**Features**:
- Query weather fields: temperature, humidity, wind_speed, wind_direction, air_pressure, precipitation
- Time range filtering
- React Query caching
- User-specific data (filter by user_id)

**Implementation**:
```typescript
export function useHistoricalWeatherData(
  userId: string | undefined,
  timeRange: TimeRange,
  metric?: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation' | 'airPressure'
) {
  return useQuery({
    queryKey: ['historical-weather', userId, timeRange.type, metric],
    queryFn: async () => {
      // Query air_quality_readings with weather fields
      // Filter by time range
      // Return transformed data
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}
```

#### 1.2 Create Weather Data Transformation Utility
**File**: `src/components/WeatherView/utils/weatherChartDataTransform.ts`

**Purpose**: Transform weather entries to chart data points, reuse patterns from `chartDataTransform.ts`

**Features**:
- Reuse `TimeRange` type and `calculateTimeRange` function
- Reuse `getAdaptivePointThreshold` and binning logic
- Metric-specific transformations
- Handle null values gracefully

**Metrics to Support**:
- **Temperature**: °C (with min/max range)
- **Humidity**: % (0-100)
- **Wind Speed**: km/h or m/s
- **Precipitation**: mm (if available)
- **Air Pressure**: hPa or mb

---

### Phase 2: Chart Components

#### 2.1 Create Historical Weather Chart Component
**File**: `src/components/WeatherView/HistoricalWeatherChart.tsx`

**Purpose**: Display historical weather data as line chart, similar to `HistoricalAQIChart`

**Features**:
- Reuse chart rendering logic from `HistoricalAQIChart`
- Metric-specific Y-axis domains
- Color coding based on metric (temperature: blue-red gradient, humidity: blue scale, etc.)
- Interactive tooltip with metric-specific formatting
- Performance optimizations (ResizeObserver, no ResponsiveContainer)
- Click to view details (optional)

**Props**:
```typescript
interface HistoricalWeatherChartProps {
  data: WeatherChartDataPoint[];
  metric: 'temperature' | 'humidity' | 'windSpeed' | 'precipitation' | 'airPressure';
  isLoading?: boolean;
  error?: Error | null;
  onDataPointClick?: (entry: WeatherEntry) => void;
  meta?: {
    originalCount: number;
    binnedCount: number;
    binSizeHours: number;
  };
}
```

#### 2.2 Create Metric Selector Component
**File**: `src/components/WeatherView/WeatherMetricSelector.tsx`

**Purpose**: Allow users to switch between different weather metrics

**Metrics**:
- 🌡️ **Temperature** (default)
- 💧 **Humidity**
- 💨 **Wind Speed**
- 🌧️ **Precipitation** (if available)
- 📊 **Air Pressure** (if available)

**Design**: Similar to time range selector, toggle buttons with icons

#### 2.3 Create Multi-Metric Comparison Chart (Optional)
**File**: `src/components/WeatherView/MultiMetricWeatherChart.tsx`

**Purpose**: Show multiple weather metrics on same chart (e.g., temperature + humidity)

**Features**:
- Dual Y-axis (left for temperature, right for humidity)
- Multiple line colors
- Legend for metrics
- Toggle metrics on/off

---

### Phase 3: Page Restructuring

#### 3.1 Refactor WeatherStats Component
**File**: `src/components/WeatherStats.tsx` → `src/components/WeatherView/WeatherStats.tsx`

**Changes**:
1. **Add View Toggle State**: `'charts' | 'overview'` (default: 'overview')
2. **Add Time Range State**: Reuse `TimeRange` type
3. **Import Chart Components**: HistoricalWeatherChart, WeatherMetricSelector
4. **Import Time Range Selector**: Reuse `TimeRangeSelector` from HistoryView
5. **Restructure Layout**: Conditional rendering based on view mode

**New Structure**:
```typescript
export default function WeatherStats({ ... }) {
  const [viewMode, setViewMode] = useState<'charts' | 'overview'>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>({ type: '7d' });
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'humidity' | 'windSpeed'>('temperature');
  
  // Fetch historical weather data
  const { data: weatherHistory, isLoading, error } = useHistoricalWeatherData(
    user?.id,
    timeRange,
    selectedMetric
  );
  
  // Transform data for chart
  const chartData = useMemo(() => {
    return transformWeatherForChart(weatherHistory, timeRange, selectedMetric);
  }, [weatherHistory, timeRange, selectedMetric]);
  
  return (
    <div>
      <Header ... />
      <ViewToggle ... />
      <TimeRangeSelector ... />
      {viewMode === 'charts' ? (
        <ChartsView ... />
      ) : (
        <OverviewView ... />
      )}
    </div>
  );
}
```

#### 3.2 Create View Toggle Component
**File**: `src/components/WeatherView/WeatherViewToggle.tsx`

**Purpose**: Toggle between Charts and Overview views

**Design**: Similar to History page toggle, with icons
- 📊 Charts view
- 📋 Overview view

#### 3.3 Extract Overview View
**File**: `src/components/WeatherView/WeatherOverviewView.tsx`

**Purpose**: Move current weather display logic into separate component

**Contains**:
- Current conditions cards (existing)
- Weather forecast (existing)
- Map view (existing)
- Wind dashboard (existing)

---

### Phase 4: Data Integration

#### 4.1 Extend air_quality_readings Query
**Current**: History page queries for AQI data
**New**: Weather page queries for weather fields

**Fields to Query**:
- `temperature` (DECIMAL)
- `humidity` (DECIMAL)
- `wind_speed` (DECIMAL)
- `wind_direction` (DECIMAL)
- `air_pressure` (DECIMAL)
- `rain_probability` (DECIMAL) - if available
- `timestamp` (for time series)

**Query Pattern**:
```typescript
const { data } = await supabase
  .from('air_quality_readings')
  .select('id, timestamp, temperature, humidity, wind_speed, wind_direction, air_pressure, location_name')
  .eq('user_id', userId)
  .not('temperature', 'is', null) // Only get entries with weather data
  .order('timestamp', { ascending: true })
  .gte('timestamp', startDate)
  .lte('timestamp', endDate);
```

#### 4.2 Handle Missing Weather Data
**Strategy**:
- Show message if no weather data available
- Suggest fetching new readings
- Link to dashboard to trigger data collection

---

### Phase 5: UI/UX Consistency

#### 5.1 Match Header Component
- Use same `Header` component with same props
- Same title/subtitle pattern
- Same refresh button behavior

#### 5.2 Match GlassCard Styling
- Use `GlassCard` for all containers
- Same variant usage (`default`, `elevated`, `subtle`)
- Consistent spacing and padding

#### 5.3 Match Button Styles
- Use same button variants
- Same icon placement
- Same size conventions

#### 5.4 Match Loading/Error States
- Same loading spinner component
- Same error message format
- Same empty state design

---

### Phase 6: Performance Optimizations

#### 6.1 Apply Chart Optimizations
- **No ResponsiveContainer**: Use fixed-size with ResizeObserver (like History page)
- **Data Limiting**: Max 800 points, aggressive binning
- **Memoization**: Memoize chart data, Y-axis domains
- **Debouncing**: Time range changes, metric switches
- **startTransition**: Non-urgent state updates

#### 6.2 Optimize Data Fetching
- **React Query Caching**: 5 min stale, 15 min GC
- **Selective Field Queries**: Only fetch needed weather fields
- **Time Range Filtering**: Server-side filtering
- **Incremental Loading**: For very large datasets

#### 6.3 Optimize Component Rendering
- **React.memo**: Chart components, metric selector
- **useMemo**: Data transformations, calculations
- **useCallback**: Event handlers
- **Lazy Loading**: Map component (already done)

---

## 📐 Component Architecture

### New File Structure

```
src/components/WeatherView/
├── WeatherStats.tsx (refactored main component)
├── WeatherViewToggle.tsx (charts/overview toggle)
├── WeatherOverviewView.tsx (extracted overview)
├── HistoricalWeatherChart.tsx (main chart component)
├── WeatherMetricSelector.tsx (metric toggle buttons)
├── MultiMetricWeatherChart.tsx (optional multi-line chart)
└── utils/
    ├── weatherChartDataTransform.ts (data transformation)
    └── weatherColors.ts (metric-specific color schemes)
```

### Reused Components

```
src/components/HistoryView/
├── TimeRangeSelector.tsx (reuse as-is)
└── utils/
    └── chartDataTransform.ts (reuse TimeRange, calculateTimeRange, getAdaptivePointThreshold)
```

---

## 🎨 Design Specifications

### Metric Color Schemes

**Temperature**:
- Cold (< 0°C): `#3B82F6` (Blue)
- Cool (0-15°C): `#10B981` (Green)
- Mild (15-25°C): `#F59E0B` (Yellow)
- Warm (25-35°C): `#F97316` (Orange)
- Hot (> 35°C): `#EF4444` (Red)

**Humidity**:
- Low (< 30%): `#F59E0B` (Yellow)
- Normal (30-70%): `#10B981` (Green)
- High (> 70%): `#3B82F6` (Blue)

**Wind Speed**:
- Calm (< 10 km/h): `#10B981` (Green)
- Light (10-20 km/h): `#F59E0B` (Yellow)
- Moderate (20-40 km/h): `#F97316` (Orange)
- Strong (> 40 km/h): `#EF4444` (Red)

**Precipitation**:
- None (0 mm): `#10B981` (Green)
- Light (< 5 mm): `#3B82F6` (Blue)
- Moderate (5-20 mm): `#F59E0B` (Yellow)
- Heavy (> 20 mm): `#EF4444` (Red)

### Chart Styling

- **Line Width**: 2px (same as AQI chart)
- **Dot Visibility**: Hidden (same as AQI chart)
- **Active Dot**: 4px radius on hover
- **Grid**: Same opacity and style
- **Tooltip**: Same glassmorphism style, metric-specific formatting

---

## 🔄 Data Flow

### Charts View Flow

```
User selects view mode (Charts)
    ↓
User selects time range (7d)
    ↓
User selects metric (Temperature)
    ↓
useHistoricalWeatherData hook queries Supabase
    ↓
Data transformation (transformWeatherForChart)
    ↓
Chart data formatting (binning if needed)
    ↓
HistoricalWeatherChart renders
    ↓
User hovers/clicks → Tooltip/Detail modal
```

### Overview View Flow

```
User selects view mode (Overview)
    ↓
Current weather data from useWeatherStore
    ↓
Forecast data from WeatherForecast component
    ↓
Map data from LeafletMap component
    ↓
Wind data from WindDashboard component
    ↓
All components render in grid layout
```

---

## 📦 Dependencies

### Existing (No New Installs)
- ✅ `recharts@^2.15.4` - Chart library
- ✅ `@tanstack/react-query@^5.83.0` - Data fetching
- ✅ `date-fns@^3.6.0` - Date formatting
- ✅ `framer-motion@^12.23.12` - Animations
- ✅ `lucide-react@^0.462.0` - Icons

### Reusable Components
- `TimeRangeSelector` from `HistoryView`
- `TimeRange` type and utilities from `HistoryView/utils`
- `GlassCard` components
- `Header` component
- Chart optimization patterns

---

## ⚡ Performance Considerations

### Chart Rendering
- **Max Points**: 800 (same as History page)
- **Binning Threshold**: Desktop 1000, Tablet 600, Mobile 400
- **ResizeObserver**: Debounced 150ms
- **No Animations**: Disabled for performance

### Data Fetching
- **Query Caching**: 5 min stale, 15 min GC
- **Selective Fields**: Only fetch needed weather columns
- **Time Range Filtering**: Server-side
- **Incremental Loading**: For large datasets

### Component Optimization
- **Memoization**: All chart components
- **Lazy Loading**: Map (already implemented)
- **Code Splitting**: Weather charts in separate chunk

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Week 1)
**Duration**: 2-3 days
- Create `useHistoricalWeatherData` hook
- Create `weatherChartDataTransform.ts` utility
- Create `HistoricalWeatherChart` component (basic)
- Test with sample data

**Deliverables**:
- Functional weather chart displaying temperature over time
- Basic time range filtering

---

### Phase 2: Integration (Week 1-2)
**Duration**: 2-3 days
- Refactor `WeatherStats` component
- Add view toggle (Charts/Overview)
- Integrate time range selector
- Add metric selector
- Wire up data fetching

**Deliverables**:
- Complete charts view with metric switching
- Toggle between charts and overview
- Time range filtering working

---

### Phase 3: Polish & Optimization (Week 2)
**Duration**: 1-2 days
- Apply performance optimizations
- Match UI styling to History page
- Add loading/error states
- Test with real data
- Mobile responsiveness

**Deliverables**:
- Fully optimized weather page
- Consistent with History page design
- All features working

---

## 📝 Detailed Component Specifications

### 1. HistoricalWeatherChart Component

**Props**:
```typescript
interface HistoricalWeatherChartProps {
  data: WeatherChartDataPoint[];
  metric: WeatherMetric;
  isLoading?: boolean;
  error?: Error | null;
  onDataPointClick?: (entry: WeatherEntry) => void;
  height?: number; // Default: 400px
  showGrid?: boolean; // Default: true
}
```

**Features**:
- Fixed-size container with ResizeObserver (no ResponsiveContainer)
- Metric-specific Y-axis domain
- Color-coded line based on metric
- Custom tooltip with metric formatting
- Click handler for details
- Loading/error/empty states

**Recharts Components**:
- `LineChart` (fixed width/height)
- `Line` (metric-specific color)
- `XAxis` (time formatting)
- `YAxis` (metric-specific domain and label)
- `CartesianGrid`
- `Tooltip` (custom component)

---

### 2. WeatherMetricSelector Component

**Props**:
```typescript
interface WeatherMetricSelectorProps {
  selectedMetric: WeatherMetric;
  onMetricChange: (metric: WeatherMetric) => void;
  availableMetrics?: WeatherMetric[];
}
```

**Metrics**:
- `temperature` - 🌡️ Temperature (°C)
- `humidity` - 💧 Humidity (%)
- `windSpeed` - 💨 Wind Speed (km/h)
- `precipitation` - 🌧️ Precipitation (mm) - if available
- `airPressure` - 📊 Air Pressure (hPa) - if available

**Design**:
- Toggle button group
- Icons for each metric
- Active state highlighting
- Disabled state if metric unavailable

---

### 3. WeatherViewToggle Component

**Props**:
```typescript
interface WeatherViewToggleProps {
  viewMode: 'charts' | 'overview';
  onViewChange: (mode: 'charts' | 'overview') => void;
}
```

**Design**:
- Two toggle buttons
- Icons: 📊 Charts, 📋 Overview
- Active state highlighting
- Same styling as History page toggle

---

### 4. WeatherOverviewView Component

**Props**:
```typescript
interface WeatherOverviewViewProps {
  locationData: LocationData | null;
  currentWeather: WeatherData | null;
  forecast: ForecastData[];
  weatherLoading: boolean;
  weatherError: Error | null;
  isDemoMode?: boolean;
}
```

**Contains**:
- Current conditions cards (3-column grid)
- Weather forecast component
- Map view (lazy loaded)
- Wind dashboard

---

## 🔍 Data Processing Details

### Transform Function

```typescript
function transformWeatherForChart(
  entries: WeatherEntry[],
  timeRange: TimeRange,
  metric: WeatherMetric,
  desiredPointLimit?: number
): { data: WeatherChartDataPoint[]; meta: {...} } {
  // Filter by time range
  // Sort chronologically
  // Extract metric value
  // Apply binning if needed
  // Return chart data points
}
```

### Weather Entry Interface

```typescript
interface WeatherEntry {
  id: string;
  timestamp: string;
  location_name: string;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  air_pressure: number | null;
  rain_probability: number | null;
  // ... other fields
}
```

---

## 🎨 Style Consistency Checklist

### Components to Match
- [ ] Header component (same props, same styling)
- [ ] GlassCard usage (same variants, same spacing)
- [ ] Button styles (same variants, same sizes)
- [ ] Badge styles (same variants)
- [ ] Loading states (same spinner, same messages)
- [ ] Error states (same format, same actions)
- [ ] Empty states (same design, same messaging)

### Layout to Match
- [ ] Page container (same padding, same max-width)
- [ ] Grid layouts (same breakpoints, same gaps)
- [ ] Spacing (same space-y values)
- [ ] Responsive behavior (same breakpoints)

### Interactions to Match
- [ ] Toggle buttons (same behavior, same feedback)
- [ ] Time range selection (same component, same behavior)
- [ ] Chart interactions (same tooltip, same click behavior)
- [ ] Refresh actions (same button, same loading state)

---

## 🧪 Testing Considerations

### Data Edge Cases
- No weather data available
- Sparse data (few readings)
- Very dense data (many readings)
- Missing metric values (null handling)
- Very old data (time range edge cases)

### UI States
- Loading state
- Error state
- Empty state
- No data for selected range
- No data for selected metric
- Metric unavailable

### Interactions
- View mode toggle
- Time range changes
- Metric switching
- Chart hover/click
- Responsive breakpoints

---

## 📊 Success Metrics

### Visual Goals
- ✅ Weather page matches History page design
- ✅ Charts render smoothly with large datasets
- ✅ All metrics display correctly
- ✅ Responsive on all screen sizes

### Functional Goals
- ✅ All existing features preserved
- ✅ Historical charts work correctly
- ✅ Time range filtering works
- ✅ Metric switching works
- ✅ Performance matches History page

### User Experience Goals
- ✅ Intuitive view toggle
- ✅ Clear metric selection
- ✅ Informative tooltips
- ✅ Fast interactions
- ✅ Consistent navigation

---

## 🚀 Implementation Order

### Recommended Sequence

1. **Create data infrastructure** (useHistoricalWeatherData, transform utilities)
   - Test with sample data
   - Verify data structure

2. **Build chart component** (HistoricalWeatherChart)
   - Start with temperature metric
   - Add tooltip
   - Test rendering

3. **Add metric selector** (WeatherMetricSelector)
   - Test metric switching
   - Verify data updates

4. **Refactor main component** (WeatherStats)
   - Add view toggle
   - Integrate time range selector
   - Wire up chart components

5. **Extract overview view** (WeatherOverviewView)
   - Move existing components
   - Test all features still work

6. **Apply optimizations** (performance, styling)
   - Match History page optimizations
   - Test performance
   - Verify styling consistency

7. **Testing & polish** (edge cases, mobile)
   - Test all states
   - Verify mobile responsiveness
   - Final UI polish

---

## 🔄 Migration Strategy

### Backward Compatibility
- Keep existing `WeatherStats` component initially
- Add new features alongside existing ones
- Gradually make charts default view
- Keep overview view accessible

### Data Compatibility
- No database changes required
- Use existing `air_quality_readings` table
- Leverage existing indexes
- Handle null values gracefully

---

## 📚 Additional Considerations

### Accessibility
- **Keyboard Navigation**: Arrow keys for metric selection
- **Screen Readers**: ARIA labels for chart elements
- **Color Contrast**: Ensure text readable on all backgrounds
- **Focus Indicators**: Clear focus states

### Error Handling
- **No Data**: Show helpful message with action
- **Fetch Errors**: Display error with retry option
- **Invalid Range**: Validate date ranges
- **Missing Metrics**: Disable unavailable metrics gracefully

### Analytics (Optional)
- Track which metrics users view most
- Monitor time range selections
- Track view mode preferences

---

## ✅ Final Checklist

Before implementation begins, confirm:
- [x] Recharts library available
- [x] React Query configured
- [x] History page patterns understood
- [x] Weather data structure understood
- [x] Existing components identified
- [ ] Plan approved by user

---

**Ready for Review**: This plan outlines a complete standardization of the Weather page to match the History page's design, functionality, and performance optimizations while preserving all existing weather features.

