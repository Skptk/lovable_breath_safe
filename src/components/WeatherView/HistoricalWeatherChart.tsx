import { useMemo, memo, useCallback, useRef, useEffect, useState } from 'react';
import { startTransition } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { Loader2, AlertTriangle, Thermometer } from 'lucide-react';
import { WeatherChartDataPoint, WeatherEntry, WeatherMetric } from './utils/weatherChartDataTransform';
import { format } from 'date-fns';

// Feature flags
const FEATURE_FLAGS = {
  segmented_coloring: true,
  multi_metric: false,
  gradient_fill: false,
  canvas_renderer: false,
} as const;

// Telemetry helper
function logTelemetry(event: string, data: Record<string, any>) {
  if (import.meta.env.DEV) {
    console.log(`[WeatherChart Telemetry] ${event}`, data);
  }
  // In production, this could send to analytics service
}

interface HistoricalWeatherChartProps {
  data: WeatherChartDataPoint[];
  metric: WeatherMetric;
  isLoading?: boolean;
  error?: Error | null;
  onDataPointClick?: (entry: WeatherEntry) => void;
  meta?: {
    originalCount: number;
    binnedCount: number;
    binSizeHours: number;
  };
  timeRange?: string;
}

// Get metric-specific color
function getMetricColor(metric: WeatherMetric): string {
  switch (metric) {
    case 'temperature':
      return '#EF4444'; // Red for temperature
    case 'humidity':
      return '#3B82F6'; // Blue for humidity
    case 'windSpeed':
      return '#10B981'; // Green for wind
    case 'precipitation':
      return '#8B5CF6'; // Purple for precipitation
    case 'airPressure':
      return '#F59E0B'; // Yellow for pressure
    default:
      return '#3B82F6';
  }
}

// Get metric unit
function getMetricUnit(metric: WeatherMetric): string {
  switch (metric) {
    case 'temperature':
      return '°C';
    case 'humidity':
      return '%';
    case 'windSpeed':
      return 'km/h';
    case 'precipitation':
      return '%';
    case 'airPressure':
      return 'hPa';
    default:
      return '';
  }
}

// Get metric label
function getMetricLabel(metric: WeatherMetric): string {
  switch (metric) {
    case 'temperature':
      return 'Temperature';
    case 'humidity':
      return 'Humidity';
    case 'windSpeed':
      return 'Wind Speed';
    case 'precipitation':
      return 'Precipitation';
    case 'airPressure':
      return 'Air Pressure';
    default:
      return 'Value';
  }
}

// Memoized tooltip component
const ChartTooltip = memo(({ active, payload, label, metric }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as WeatherChartDataPoint;
  const value = data.value;
  const metricColor = getMetricColor(metric);
  const metricUnit = getMetricUnit(metric);
  const metricLabel = getMetricLabel(metric);

  // Memoize formatted label
  const formattedLabel = useMemo(() => {
    if (typeof label === 'string') return label;
    try {
      return format(new Date(label), 'MMM d, yyyy HH:mm');
    } catch {
      return String(label);
    }
  }, [label]);

  return (
    <div
      className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg"
      style={{ borderColor: metricColor }}
    >
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{formattedLabel}</div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: metricColor }}
          />
          <div>
            <div className="font-semibold" style={{ color: metricColor }}>
              {metricLabel}: {value.toFixed(metric === 'temperature' ? 1 : 0)}{metricUnit}
            </div>
          </div>
        </div>
        {data.location && (
          <div className="text-xs text-muted-foreground">📍 {data.location}</div>
        )}
        {data.originalCount && data.originalCount > 1 && (
          <div className="text-xs text-muted-foreground">
            ({data.originalCount} readings averaged)
          </div>
        )}
      </div>
    </div>
  );
});

ChartTooltip.displayName = 'ChartTooltip';

// Format X-axis labels
const formatXAxisLabel = (tickItem: any) => {
  if (typeof tickItem === 'string') {
    return tickItem;
  }
  if (tickItem instanceof Date) {
    return format(tickItem, 'MMM d');
  }
  return '';
};

export const HistoricalWeatherChart = memo(function HistoricalWeatherChart({
  data,
  metric,
  isLoading,
  error,
  onDataPointClick,
  meta,
  timeRange = '7d',
}: HistoricalWeatherChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDimensionsRef = useRef({ width: 800, height: 400 });

  // Use ResizeObserver with debouncing to avoid forced reflows
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Use ResizeObserver's contentRect directly - no getBoundingClientRect needed
    const updateDimensions = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        const newDims = { width, height };
        // Only update if change is significant (reduces re-renders)
        if (
          Math.abs(newDims.width - lastDimensionsRef.current.width) > 10 ||
          Math.abs(newDims.height - lastDimensionsRef.current.height) > 10
        ) {
          lastDimensionsRef.current = newDims;
          // Use startTransition to defer state update
          startTransition(() => {
            setDimensions(newDims);
          });
        }
      }
    };

    // Debounced resize handler
    const handleResize = (width: number, height: number) => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        updateDimensions(width, height);
        resizeTimeoutRef.current = null;
      }, 200); // Increased debounce to 200ms
    };

    // Initial dimensions from container (only once on mount)
    if (containerRef.current) {
      const initialWidth = containerRef.current.offsetWidth || 800;
      const initialHeight = containerRef.current.offsetHeight || 400;
      lastDimensionsRef.current = { width: initialWidth, height: initialHeight };
      setDimensions({ width: initialWidth, height: initialHeight });
    }

    if ('ResizeObserver' in window) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Batch all entries in a single RAF to avoid multiple updates
        requestAnimationFrame(() => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (
              Math.abs(width - lastDimensionsRef.current.width) > 10 ||
              Math.abs(height - lastDimensionsRef.current.height) > 10
            ) {
              handleResize(width, height);
            }
          }
        });
      });
      resizeObserverRef.current.observe(containerRef.current);
    } else {
      // Fallback to window resize
      const fallbackHandler = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          const height = containerRef.current.offsetHeight;
          handleResize(width, height);
        }
      };
      window.addEventListener('resize', fallbackHandler, { passive: true });
      return () => {
        window.removeEventListener('resize', fallbackHandler);
      };
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Memoize chart data with telemetry
  const chartData = useMemo(() => {
    const renderStart = performance.now();
    if (!data || data.length === 0) return [];
    const maxPoints = 800;
    const pointsToUse = data.length > maxPoints ? data.slice(-maxPoints) : data;
    const transformed = pointsToUse.map((point) => ({
      ...point,
      timestamp: point.timestamp.getTime(),
    }));
    const renderTime = performance.now() - renderStart;
    
    logTelemetry('chart_data_transformed', {
      points_requested: data.length,
      points_rendered: transformed.length,
      chart_render_time_ms: Math.round(renderTime * 100) / 100,
    });
    
    return transformed;
  }, [data]);

  // Memoize Y-axis domain calculation
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) {
      // Default domains by metric
      switch (metric) {
        case 'temperature':
          return [-10, 40];
        case 'humidity':
          return [0, 100];
        case 'windSpeed':
          return [0, 50];
        case 'precipitation':
          return [0, 100];
        case 'airPressure':
          return [950, 1050];
        default:
          return [0, 100];
      }
    }
    const values = chartData.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.1 || 1;
    
    // Metric-specific domain constraints
    switch (metric) {
      case 'temperature':
        return [Math.max(-20, minValue - padding), Math.min(50, maxValue + padding)];
      case 'humidity':
        return [0, 100];
      case 'windSpeed':
        return [0, Math.max(50, maxValue + padding)];
      case 'precipitation':
        return [0, Math.max(100, maxValue + padding)];
      case 'airPressure':
        return [Math.max(900, minValue - padding), Math.min(1100, maxValue + padding)];
      default:
        return [minValue - padding, maxValue + padding];
    }
  }, [chartData, metric]);

  // Click handler
  const handleChartClick = useCallback((chartData: any) => {
    if (!onDataPointClick) return;
    
    startTransition(() => {
      if (chartData && chartData.activePayload && chartData.activePayload[0]) {
        const point = chartData.activePayload[0].payload as WeatherChartDataPoint;
        onDataPointClick(point.fullEntry);
      }
    });
  }, [onDataPointClick]);

  const metricColor = getMetricColor(metric);
  const metricUnit = getMetricUnit(metric);
  const metricLabel = getMetricLabel(metric);

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading weather chart data...</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <GlassCardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <div>
              <p className="font-semibold">Failed to load chart</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Historical {metricLabel}
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-2">
            <p className="font-semibold">No {metricLabel.toLowerCase()} data available</p>
            <p className="text-sm text-muted-foreground">
              Start recording weather readings to see your {metricLabel.toLowerCase()} history chart.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Historical {metricLabel}
          </GlassCardTitle>
          {meta && meta.binSizeHours > 0 && (
            <div className="text-xs text-muted-foreground">
              Showing {meta.binnedCount} of {meta.originalCount} readings
            </div>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <div 
          ref={containerRef}
          className="h-[400px] w-full" 
          role="img" 
          aria-label={`${metricLabel} history chart showing ${chartData.length} data points over ${timeRange.type}`}
          aria-describedby="weather-chart-description"
          tabIndex={0}
          style={{ minHeight: '400px' }}
        >
          <div id="weather-chart-description" className="sr-only">
            Interactive line chart displaying historical {metricLabel.toLowerCase()} data. 
            {chartData.length > 0 && ` Data ranges from ${format(chartData[0].timestamp, 'MMM d, yyyy')} to ${format(chartData[chartData.length - 1].timestamp, 'MMM d, yyyy')}.`}
            {meta && meta.binSizeHours > 0 && ` Data is aggregated into ${meta.binSizeHours}-hour bins.`}
            Use arrow keys to navigate data points.
          </div>
          <LineChart
            width={dimensions.width}
            height={dimensions.height}
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            onClick={handleChartClick}
            syncId="weather-history-chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yAxisDomain}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: `${metricLabel} (${metricUnit})`, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={<ChartTooltip metric={metric} />}
              animationDuration={0}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={metricColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: metricColor }}
              isAnimationActive={false}
              animationDuration={0}
              connectNulls={false}
            />
          </LineChart>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
});

HistoricalWeatherChart.displayName = 'HistoricalWeatherChart';

