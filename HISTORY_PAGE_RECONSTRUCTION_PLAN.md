# History Page Reconstruction Plan
## Financial Trading Chart-Style AQI History Visualization

---

## 📋 Executive Summary

Transform the current tabular History View into an interactive, financial trading chart-inspired interface that visualizes users' historical air quality readings as a dynamic line graph. The chart will use site-wide AQI color coding, support multiple time ranges, and provide interactive features similar to trading platforms.

---

## 🎯 Objectives

1. **Replace table view** with a visually engaging chart-based interface
2. **Maintain all existing functionality** (view details, delete entries, bulk operations)
3. **Use site-wide styling** (AQI colors from `src/config/maps.ts`, GlassCard components)
4. **Create trading chart aesthetic** with professional, financial-style visualization
5. **Support multiple metrics** (AQI primary line, optional pollutant overlays)
6. **Responsive design** that works on mobile and desktop
7. **Performance optimized** for large historical datasets

---

## 📊 Current State Analysis

### Existing Components
- **`HistoryView.tsx`**: Current paginated table view (912 lines)
- **`HistoryRow.tsx`**: Individual table row component
- **`HistoryDetailModal.tsx`**: Entry detail modal
- **Data Source**: `air_quality_readings` table via Supabase
- **Pagination**: 20 entries per page
- **Features**: View, delete (single/bulk), refresh, fetch new data

### Current Data Structure
```typescript
interface HistoryEntry {
  id: string;
  timestamp: string;
  location_name: string;
  aqi: number;
  pm25, pm10, pm1, no2, so2, co, o3: number | null;
  temperature, humidity: number | null;
  coordinates: { latitude, longitude };
  data_source: string | null;
  // ... additional weather fields
}
```

### Existing Charting Infrastructure
- **Library**: Recharts v2.15.4 (already installed)
- **Components**: `ChartContainer`, `LineChart`, `AreaChart`, `Tooltip` from `src/components/ui/chart.tsx`
- **Example Usage**: `AQIDataCharts.tsx` uses Recharts for pollutant visualization

### Site Styling
- **AQI Colors**: Defined in `src/config/maps.ts` (`LEAFLET_MAPS_CONFIG.AQI_COLORS`)
  - Good: `#10B981` (Green, 0-50)
  - Moderate: `#F59E0B` (Yellow, 51-100)
  - Unhealthy Sensitive: `#F97316` (Orange, 101-150)
  - Unhealthy: `#EF4444` (Red, 151-200)
  - Very Unhealthy: `#8B5CF6` (Purple, 201-300)
  - Hazardous: `#7F1D1D` (Dark Red, 301+)
- **UI Components**: GlassCard, Button, Badge (glassmorphism design)
- **Theme**: Dark/Light mode via `ThemeContext`

---

## 🎨 Proposed Design & Layout

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Air Quality History" + Refresh Button              │
├─────────────────────────────────────────────────────────────┤
│ Time Range Selector (1D, 7D, 30D, 90D, All, Custom)        │
│ Metric Toggle: [AQI] [PM2.5] [PM10] [NO₂] [SO₂] [CO] [O₃]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │      Main Chart Area (Trading Chart Style)             │ │
│ │      - Line graph with AQI color segments              │ │
│ │      - Crosshair cursor on hover                       │ │
│ │      - Data point markers                               │ │
│ │      - Gradient fill below line (AQI-colored)          │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Chart Controls & Stats                                  │ │
│ │ [Zoom In] [Zoom Out] [Reset] | Avg AQI: 45 | Range:... │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Data Table (Collapsible/Minimized by default)          │ │
│ │ [Show/Hide Table] | [Select All] [Delete Selected]     │ │
│ │ (Table view kept for detailed data access)             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Visual Design Principles

1. **Trading Chart Aesthetic**
   - Dark/light themed chart background
   - Grid lines for readability
   - Crosshair cursor showing exact values on hover
   - Smooth line interpolation
   - Color-coded line segments based on AQI levels
   - Gradient fill area below line (using AQI colors)

2. **Color Application**
   - **Line Color**: Segment-based coloring using `getAQIColor(aqi)` for each data point
   - **Fill Gradient**: Area below line with gradient transitioning between AQI color zones
   - **Data Points**: Colored dots matching AQI category
   - **Tooltip**: Styled with AQI-appropriate background color

3. **Interactive Features**
   - Hover to see exact values at any point
   - Click to view full entry details (existing modal)
   - Zoom controls (1D, 7D, 30D, 90D, All, Custom date range)
   - Pan/scroll through time periods
   - Toggle between metrics (AQI, individual pollutants)
   - Brush/selection for custom time ranges

---

## 🔧 Technical Implementation Plan

### Phase 1: Core Chart Component Structure

#### 1.1 Create `HistoricalAQIChart.tsx` Component
**Location**: `src/components/HistoryView/HistoricalAQIChart.tsx`

**Responsibilities**:
- Main chart rendering using Recharts
- Data transformation for chart consumption
- AQI color segmentation logic
- Interactive tooltip and cursor
- Gradient fill generation

**Props Interface**:
```typescript
interface HistoricalAQIChartProps {
  data: HistoryEntry[];
  selectedMetric: 'aqi' | 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3';
  timeRange: TimeRange;
  onDataPointClick?: (entry: HistoryEntry) => void;
  isLoading?: boolean;
}
```

**Key Features**:
- Transform `HistoryEntry[]` to `{ timestamp: Date, value: number, aqi: number, color: string }[]`
- Generate color segments for line (change color when AQI category changes)
- Create gradient fill area below line
- Implement responsive container
- Custom tooltip showing AQI, value, location, timestamp
- Crosshair cursor on hover

#### 1.2 Data Transformation Logic

**Function**: `transformHistoryForChart(entries: HistoryEntry[], metric: string)`
- Convert timestamps to Date objects
- Extract metric value (with null handling)
- Calculate AQI color for each point
- Sort chronologically
- Handle gaps in data (interpolation or breaks)
- Aggregate data points if too dense (time-based binning for large datasets)

**Example Transformation**:
```typescript
interface ChartDataPoint {
  timestamp: Date;
  displayTime: string; // Formatted for X-axis
  aqi: number;
  value: number; // Selected metric value
  color: string; // AQI color
  category: string; // AQI label
  location: string;
  fullEntry: HistoryEntry; // For detail modal
}
```

#### 1.3 Gradient Fill Generation

**Approach**: Create color segments with smooth transitions
- Detect AQI category boundaries
- Create gradient stops between categories
- Apply to AreaChart fill with `linearGradient` SVG definitions
- Use site AQI colors: `#10B981`, `#F59E0B`, `#F97316`, `#EF4444`, `#8B5CF6`, `#7F1D1D`

---

### Phase 2: Time Range & Metric Controls

#### 2.1 Time Range Selector Component
**Location**: `src/components/HistoryView/TimeRangeSelector.tsx`

**Features**:
- Quick select buttons: `1D`, `7D`, `30D`, `90D`, `All Time`
- Custom date range picker (using `react-day-picker`)
- Apply/Reset buttons
- Display current selected range

**Time Range Options**:
```typescript
type TimeRange = {
  type: '1D' | '7D' | '30D' | '90D' | 'ALL' | 'CUSTOM';
  start?: Date;
  end?: Date;
};
```

#### 2.2 Metric Selector Component
**Location**: `src/components/HistoryView/MetricSelector.tsx`

**Features**:
- Toggle buttons for metrics: AQI, PM2.5, PM10, NO₂, SO₂, CO, O₃
- Active metric highlighting
- Icon indicators for each pollutant
- Metric-specific unit display

**Metrics**:
- **AQI** (default): Air Quality Index (0-500+)
- **PM2.5**: Fine particles (μg/m³)
- **PM10**: Coarse particles (μg/m³)
- **NO₂**: Nitrogen dioxide (ppb)
- **SO₂**: Sulfur dioxide (ppb)
- **CO**: Carbon monoxide (ppb)
- **O₃**: Ozone (ppb)

---

### Phase 3: Chart Enhancements & Interactions

#### 3.1 Custom Tooltip Component
**Location**: `src/components/HistoryView/ChartTooltip.tsx`

**Features**:
- Displays on hover/crosshair intersection
- Shows: timestamp, AQI value, metric value, location
- Styled with AQI-appropriate background color
- Position tracking (avoid screen edges)
- Arrow pointer to data point

**Tooltip Content**:
```
┌─────────────────────┐
│ 📍 San Francisco    │
│ 11/15/2025 4:24 PM  │
├─────────────────────┤
│ AQI: 45 (Good)      │
│ PM2.5: 12.5 μg/m³   │
│ Location: SFO       │
└─────────────────────┘
```

#### 3.2 Crosshair Cursor
- Vertical line following mouse/touch
- Horizontal line at current value
- Value display on axes
- Works with touch devices (mobile)

#### 3.3 Data Point Markers
- Visible dots on line at each reading
- Color matches AQI category
- Hover to highlight
- Click to open detail modal
- Size indicates reading significance (optional)

#### 3.4 Chart Statistics Panel
**Component**: `ChartStatistics.tsx`

**Statistics to Display**:
- **Average AQI**: Mean value for selected range
- **Min/Max AQI**: Lowest and highest values
- **Trend**: ↑ Improved, ↓ Worsened, → Stable (vs previous period)
- **Total Readings**: Count of data points
- **Time Span**: Start and end dates
- **Health Impact**: Days in each AQI category

---

### Phase 4: Data Fetching & Optimization

#### 4.1 Enhanced Data Fetching Hook
**Location**: `src/hooks/useHistoricalAQIData.ts`

**Features**:
- Fetch all historical data (no pagination for chart)
- Time range filtering at query level
- Aggregation for large datasets
- Caching with React Query
- Incremental loading for very large histories
- Memory-efficient data structures

**Query Implementation**:
```typescript
const useHistoricalAQIData = (userId: string, timeRange?: TimeRange) => {
  return useQuery({
    queryKey: ['historical-aqi', userId, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true }); // Chronological for chart
      
      // Apply time range filter
      if (timeRange?.start) {
        query = query.gte('timestamp', timeRange.start.toISOString());
      }
      if (timeRange?.end) {
        query = query.lte('timestamp', timeRange.end.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return transformHistoryForChart(data || [], 'aqi');
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};
```

#### 4.2 Data Aggregation Strategy

**For Large Datasets** (1000+ points):
- **Time-based binning**: Group readings by time intervals
  - 1D view: 1-hour bins
  - 7D view: 6-hour bins
  - 30D view: 1-day bins
  - 90D+ view: 1-day bins (average)
- **Aggregation method**: Average for numeric values, most recent for categories
- **Smooth rendering**: Prevent chart slowdown with too many points

**Bin Calculation**:
```typescript
const binDataPoints = (data: ChartDataPoint[], binSizeHours: number) => {
  // Group data points into time bins
  // Average values within each bin
  // Return binned data for rendering
};
```

---

### Phase 5: Chart Styling & Theming

#### 5.1 Theme-Aware Chart Styling
- **Dark Theme**: Dark chart background (`bg-slate-900/50`), light grid lines, bright line colors
- **Light Theme**: Light chart background (`bg-slate-50/50`), dark grid lines, vivid line colors
- **Dynamic color application**: Use `useTheme()` hook from `ThemeContext`

#### 5.2 AQI Color Segmentation

**Approach**: Multi-segment line with color changes
- Split line into segments at AQI category boundaries
- Use Recharts `<Line>` components with different colors per segment
- OR: Custom SVG gradient with color stops based on AQI thresholds

**Implementation Options**:
1. **Multiple Line Components**: One `<Line>` per color segment (simpler)
2. **Custom SVG Gradient**: Single line with gradient definition (smoother)

**Recommended**: Option 2 for smoother visual appearance

#### 5.3 Grid & Axis Styling
- **Grid Lines**: Subtle, theme-aware (`stroke-border/30`)
- **Axis Labels**: Readable, formatted timestamps
- **Y-Axis**: Metric-specific scaling with appropriate units
- **X-Axis**: Time formatting based on range (hours, days, months)

---

### Phase 6: Integration with Existing Features

#### 6.1 Preserve Existing Functionality
- **Detail Modal**: Keep `HistoryDetailModal.tsx` - trigger on data point click
- **Delete Actions**: Add delete icon/button to tooltip or data points
- **Bulk Operations**: Keep bulk select/delete in collapsed table view
- **Refresh**: Keep refresh functionality in header

#### 6.2 Table View Integration
- **Collapsible Table**: Add toggle to show/hide table view
- **Synchronization**: Selected time range affects table filter
- **Click-through**: Click table row highlights chart point (optional)

---

### Phase 7: Mobile Responsiveness

#### 7.1 Mobile Optimizations
- **Touch Interactions**: Pan/zoom with touch gestures
- **Simplified Controls**: Stack time range and metric selectors vertically
- **Chart Size**: Full width with appropriate height (aspect ratio maintained)
- **Tooltip**: Touch to reveal, tap outside to dismiss
- **Simplified UI**: Hide some advanced features on mobile

#### 7.2 Responsive Breakpoints
- **Desktop** (>1024px): Full chart + controls + table side-by-side
- **Tablet** (768-1024px): Chart + controls stacked, table below
- **Mobile** (<768px): Chart only with simplified controls, table in modal/drawer

---

## 📐 Component Architecture

### File Structure
```
src/components/HistoryView/
├── HistoryView.tsx (refactored main component)
├── HistoricalAQIChart.tsx (main chart component)
├── ChartTooltip.tsx (custom tooltip)
├── ChartStatistics.tsx (stats panel)
├── TimeRangeSelector.tsx (time range controls)
├── MetricSelector.tsx (metric toggle buttons)
├── ChartControls.tsx (zoom, pan, reset controls)
├── HistoryTable.tsx (extracted table component, collapsible)
└── utils/
    ├── chartDataTransform.ts (data transformation utilities)
    ├── chartColors.ts (AQI color gradient generation)
    └── dataAggregation.ts (binning and aggregation logic)
```

---

## 🎨 Design Specifications

### Chart Visual Elements

#### Primary Line
- **Type**: Smooth line chart (Recharts `Line` with `type="monotone"`)
- **Color**: Segmented by AQI category using site colors
- **Stroke Width**: 2-3px for visibility
- **Style ID**: Use consistent styling with site-wide theme

#### Gradient Fill Area
- **Type**: Area chart below line
- **Gradient**: Multi-stop gradient transitioning between AQI colors
- **Opacity**: 0.2-0.3 for subtlety
- **SVG Definition**: Custom `<defs><linearGradient>` in Recharts

#### Data Points
- **Type**: Circular markers
- **Size**: 4-6px radius
- **Color**: Match AQI category
- **Visibility**: Always visible or on hover (configurable)

#### Grid & Axes
- **Grid**: Horizontal lines at regular intervals
- **Style**: `stroke: hsl(var(--border) / 0.2)`
- **Axis Labels**: Formatted dates/times, metric units
- **Font**: Match site typography

### Color Application Strategy

#### Dynamic Color Assignment
```typescript
const getLineColorForPoint = (aqi: number): string => {
  return getAQIColor(aqi); // Uses site-wide function from maps.ts
};

// For gradient segments
const createGradientStops = (dataPoints: ChartDataPoint[]) => {
  // Identify AQI category boundaries
  // Create color stops: { offset: '0%', color: '#10B981' }, etc.
};
```

#### Gradient Fill Implementation
```typescript
// SVG Gradient Definition
<defs>
  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
    <stop offset="16.67%" stopColor="#F59E0B" stopOpacity={0.3} />
    <stop offset="33.33%" stopColor="#F97316" stopOpacity={0.3} />
    <stop offset="50%" stopColor="#EF4444" stopOpacity={0.3} />
    <stop offset="66.67%" stopColor="#8B5CF6" stopOpacity={0.3} />
    <stop offset="100%" stopColor="#7F1D1D" stopOpacity={0.3} />
  </linearGradient>
</defs>
```

---

## 🔄 Data Flow

### Flow Diagram
```
User Action (Select Time Range)
    ↓
TimeRangeSelector updates state
    ↓
HistoryView fetches filtered data
    ↓
useHistoricalAQIData hook queries Supabase
    ↓
Data transformation (transformHistoryForChart)
    ↓
Chart data formatting (binning if needed)
    ↓
HistoricalAQIChart renders with Recharts
    ↓
User Interaction (hover, click)
    ↓
ChartTooltip displays / HistoryDetailModal opens
```

---

## 📦 Dependencies

### Existing (No New Installs Needed)
- ✅ `recharts@^2.15.4` - Chart library
- ✅ `framer-motion@^12.23.12` - Animations
- ✅ `date-fns@^3.6.0` - Date formatting
- ✅ `react-day-picker@^8.10.1` - Date range picker
- ✅ `lucide-react@^0.462.0` - Icons

### Reusable Components
- `GlassCard` - Chart container styling
- `Button` - Controls
- `Badge` - Metric labels
- `ChartContainer` - Recharts wrapper from `src/components/ui/chart.tsx`

---

## ⚡ Performance Considerations

### Optimization Strategies

1. **Data Aggregation**
   - Bin data points when count > 500
   - Use time-based binning (hourly, daily)
   - Preserve min/max values for accuracy

2. **Lazy Loading**
   - Load chart data separately from table data
   - Implement virtual scrolling if needed
   - Progressive enhancement (show chart first, load details on demand)

3. **Memoization**
   - `useMemo` for transformed chart data
   - `useCallback` for event handlers
   - `React.memo` for chart components

4. **Rendering Optimization**
   - Limit re-renders with proper dependency arrays
   - Defer heavy calculations with `requestAnimationFrame`
   - Use `startTransition` for non-urgent updates

5. **Query Optimization**
   - Index on `user_id` + `timestamp` (already exists)
   - Fetch only required fields for chart
   - Cache aggressively (5-15 min stale time)

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Core Chart)
**Duration**: ~2-3 hours
- Create `HistoricalAQIChart.tsx` component
- Basic line chart with Recharts
- Data transformation utilities
- Simple time range filtering

**Deliverables**:
- Functional line chart displaying AQI over time
- Basic tooltip on hover

---

### Phase 2: Styling & Colors (Visual Polish)
**Duration**: ~1-2 hours
- Implement AQI color segmentation
- Add gradient fill area
- Theme-aware styling
- Custom tooltip component

**Deliverables**:
- Color-coded line matching AQI categories
- Gradient fill below line
- Dark/light theme support

---

### Phase 3: Controls & Interactions (User Experience)
**Duration**: ~2-3 hours
- Time range selector component
- Metric selector component
- Chart statistics panel
- Zoom/pan/reset controls
- Crosshair cursor

**Deliverables**:
- Complete control panel
- Interactive chart with all controls
- Statistics display

---

### Phase 4: Integration & Polish (Final Touches)
**Duration**: ~1-2 hours
- Integrate with existing HistoryView
- Preserve delete/modal functionality
- Mobile responsiveness
- Performance optimizations
- Testing and bug fixes

**Deliverables**:
- Fully functional history page
- All existing features preserved
- Mobile-optimized interface

---

## 📝 Detailed Component Specifications

### 1. HistoricalAQIChart Component

**Props**:
```typescript
interface HistoricalAQIChartProps {
  data: ChartDataPoint[];
  selectedMetric: MetricType;
  timeRange: TimeRange;
  isLoading?: boolean;
  onDataPointClick?: (entry: HistoryEntry) => void;
  height?: number; // Default: 400px
  showGrid?: boolean; // Default: true
  showGradient?: boolean; // Default: true
  showMarkers?: boolean; // Default: true
}
```

**Features**:
- Responsive container (fills available width)
- Custom tooltip on hover
- Click handler for data points
- Loading state skeleton
- Empty state message

**Recharts Components Used**:
- `ResponsiveContainer` - Responsive wrapper
- `AreaChart` or `LineChart` - Main chart type
- `Area` or `Line` - Data visualization
- `XAxis` - Time axis
- `YAxis` - Value axis
- `CartesianGrid` - Grid lines
- `Tooltip` - Custom tooltip
- `ReferenceLine` - Optional: AQI threshold markers

---

### 2. ChartTooltip Component

**Props**:
```typescript
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
  label?: string;
}
```

**Display Format**:
- Location name with icon
- Formatted timestamp
- AQI value with category badge
- Selected metric value with unit
- AQI color-coded background

**Styling**:
- Glassmorphism effect (backdrop blur)
- AQI-appropriate background color
- Smooth animations (framer-motion)
- Arrow pointer to data point

---

### 3. TimeRangeSelector Component

**Props**:
```typescript
interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  availableRanges?: TimeRangeType[];
}
```

**Quick Select Buttons**:
- `1D` - Last 24 hours
- `7D` - Last 7 days
- `30D` - Last 30 days
- `90D` - Last 90 days
- `All` - All available data
- `Custom` - Opens date range picker

**Custom Date Picker**:
- Start date selector
- End date selector
- "Apply" button
- Visual calendar interface (react-day-picker)

---

### 4. MetricSelector Component

**Props**:
```typescript
interface MetricSelectorProps {
  selectedMetric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  availableMetrics?: MetricType[];
}
```

**Button Group**:
- Toggle-style buttons (similar to existing UI)
- Active state highlighting
- Icons for each metric (lucide-react)
- Unit labels
- Disabled state if metric data unavailable

---

### 5. ChartStatistics Component

**Props**:
```typescript
interface ChartStatisticsProps {
  data: ChartDataPoint[];
  timeRange: TimeRange;
}
```

**Displayed Stats**:
- Average AQI (large, prominent)
- Min/Max AQI values
- Trend indicator (↑↓→)
- Total readings count
- Health category breakdown (days in each category)

**Layout**:
- Horizontal card layout
- GlassCard styling
- Color-coded badges for categories
- Icons for visual clarity

---

## 🔍 Data Processing Details

### Transform Function Pseudocode

```typescript
function transformHistoryForChart(
  entries: HistoryEntry[],
  metric: MetricType
): ChartDataPoint[] {
  return entries
    .filter(entry => entry[metric] !== null) // Remove null values
    .map(entry => ({
      timestamp: new Date(entry.timestamp),
      displayTime: formatTimestamp(entry.timestamp, timeRange),
      aqi: entry.aqi,
      value: entry[metric] as number,
      color: getAQIColor(entry.aqi),
      category: getAQILabel(entry.aqi),
      location: entry.location_name,
      fullEntry: entry
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // Chronological
}
```

### Aggregation Logic (for large datasets)

```typescript
function aggregateDataPoints(
  points: ChartDataPoint[],
  binSizeHours: number
): ChartDataPoint[] {
  if (points.length <= 500) return points; // No aggregation needed
  
  // Group into time bins
  const bins = new Map<string, ChartDataPoint[]>();
  
  points.forEach(point => {
    const binKey = getBinKey(point.timestamp, binSizeHours);
    if (!bins.has(binKey)) bins.set(binKey, []);
    bins.get(binKey)!.push(point);
  });
  
  // Average values within each bin
  return Array.from(bins.values()).map(binPoints => ({
    timestamp: binPoints[0].timestamp, // Use first timestamp in bin
    displayTime: formatBinTime(binPoints[0].timestamp, binSizeHours),
    aqi: average(binPoints.map(p => p.aqi)),
    value: average(binPoints.map(p => p.value)),
    color: getAQIColor(average(binPoints.map(p => p.aqi))),
    category: getAQILabel(average(binPoints.map(p => p.aqi))),
    location: binPoints[0].location,
    fullEntry: binPoints[0].fullEntry // Use first entry for details
  }));
}
```

---

## 🎨 Style ID Implementation

### Using Site-Wide Style System

**Colors**:
- Import `getAQIColor` and `getAQILabel` from `@/config/maps`
- Use `LEAFLET_MAPS_CONFIG.AQI_COLORS` for consistency
- Apply theme-aware colors via `useTheme()` hook

**Components**:
- Use `GlassCard` for chart container
- Use existing `Button` variants
- Use `Badge` for labels
- Match existing spacing/padding patterns

**Typography**:
- Use site font stack
- Match heading sizes and weights
- Consistent text colors (`text-foreground`, `text-muted-foreground`)

**Animations**:
- Use `framer-motion` for smooth transitions
- Match existing animation timings (300ms, easeOut)
- Consistent hover/focus states

---

## 📱 Mobile Considerations

### Touch Interactions
- **Pan**: Drag to scroll through time
- **Zoom**: Pinch to zoom in/out
- **Tap**: Show tooltip, tap data point for details
- **Swipe**: Navigate between time ranges

### Layout Adaptations
- Stack controls vertically on mobile
- Full-width chart
- Simplified statistics (key metrics only)
- Table view in bottom drawer/modal
- Larger touch targets (44px minimum)

---

## 🧪 Testing Considerations

### Data Edge Cases
- Empty history (no readings)
- Single reading
- Sparse data (large time gaps)
- Very dense data (many readings per hour)
- Missing metric values (null handling)

### UI States
- Loading state
- Error state
- Empty state
- No data for selected range
- No data for selected metric

### Interactions
- Hover/touch tooltip accuracy
- Click/tap data point selection
- Time range filter application
- Metric switching
- Zoom/pan controls

---

## 📊 Success Metrics

### Visual Goals
- ✅ Chart displays all historical AQI readings
- ✅ Colors match site-wide AQI color scheme exactly
- ✅ Smooth, professional appearance
- ✅ Responsive on all screen sizes

### Functional Goals
- ✅ All existing features preserved
- ✅ Fast rendering (< 500ms for 1000 points)
- ✅ Smooth interactions (60fps)
- ✅ Accessible (keyboard navigation, screen readers)

### User Experience Goals
- ✅ Intuitive time range selection
- ✅ Clear metric switching
- ✅ Informative tooltips
- ✅ Easy access to entry details

---

## 🚀 Implementation Order

### Recommended Sequence

1. **Create data transformation utilities** (chartDataTransform.ts)
   - Test with sample data
   - Ensure AQI color mapping works correctly

2. **Build basic chart component** (HistoricalAQIChart.tsx)
   - Simple line chart first
   - Add tooltip
   - Test with real data

3. **Implement color segmentation**
   - Add gradient fill
   - Test color transitions
   - Verify theme compatibility

4. **Add controls** (TimeRangeSelector, MetricSelector)
   - Integrate with chart
   - Test filtering
   - Verify state management

5. **Add statistics panel** (ChartStatistics)
   - Calculate stats correctly
   - Style consistently
   - Test edge cases

6. **Integrate with HistoryView**
   - Replace table with chart (keep table collapsible)
   - Preserve existing functionality
   - Test all interactions

7. **Mobile optimization**
   - Test on mobile viewport
   - Adjust touch interactions
   - Verify responsive layout

8. **Performance tuning**
   - Add data aggregation if needed
   - Optimize re-renders
   - Test with large datasets

---

## 🔄 Migration Strategy

### Backward Compatibility
- Keep existing `HistoryView.tsx` structure initially
- Add chart as optional view (toggle between chart/table)
- Gradually make chart default view
- Keep table view accessible

### Data Compatibility
- No database changes required
- Use existing `air_quality_readings` table
- Leverage existing indexes
- Maintain data structure compatibility

---

## 📚 Additional Considerations

### Accessibility
- **Keyboard Navigation**: Arrow keys to navigate data points
- **Screen Readers**: ARIA labels for chart elements
- **Color Contrast**: Ensure text is readable on all AQI backgrounds
- **Focus Indicators**: Clear focus states on interactive elements

### Error Handling
- **No Data**: Show empty state with helpful message
- **Fetch Errors**: Display error message with retry option
- **Invalid Range**: Validate date ranges, show warnings
- **Missing Metrics**: Disable unavailable metrics gracefully

### Analytics (Optional)
- Track which time ranges users select most
- Monitor which metrics are viewed most
- Track interaction patterns (zoom, pan frequency)

---

## ✅ Final Checklist

Before implementation begins, confirm:
- [x] Recharts library is available
- [x] AQI color definitions are accessible
- [x] Historical data structure is understood
- [x] Theme system is integrated
- [x] Existing functionality requirements are clear
- [ ] Plan is approved by user

---

## 📌 Notes & Open Questions

### Design Decisions Needed
1. **Default View**: Chart by default, or toggle between chart/table?
2. **Chart Height**: Fixed (400px) or responsive (aspect ratio)?
3. **Data Point Density**: Always aggregate when > 500 points, or make configurable?
4. **Animation Speed**: How fast should transitions be?
5. **Color Segmentation**: Smooth gradient or distinct segments?

### Technical Decisions
1. **Chart Library**: Stick with Recharts or consider alternatives?
2. **Gradient Implementation**: SVG gradient or multiple line segments?
3. **Data Fetching**: Load all at once or progressive loading?
4. **Caching Strategy**: How aggressive should caching be?

---

**Ready for Review**: This plan outlines a complete reconstruction of the History page with a financial trading chart aesthetic while maintaining all existing functionality and using site-wide styling. Please review and provide feedback before implementation begins.

