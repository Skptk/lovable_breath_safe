import { useMemo, memo, useCallback, useRef, useEffect, useState } from 'react';
import { startTransition } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ChartDataPoint } from './utils/chartDataTransform';
import { HistoryEntry } from '../HistoryView';
import { getAQIColor, getAQILabel } from '@/config/maps';
import { format } from 'date-fns';

interface HistoricalAQIChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
  onDataPointClick?: (entry: HistoryEntry) => void;
  meta?: {
    originalCount: number;
    binnedCount: number;
    binSizeHours: number;
  };
}

// Memoized tooltip component to prevent re-renders
const ChartTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as ChartDataPoint;
  const aqi = data.aqi;
  const aqiColor = getAQIColor(aqi);
  const aqiLabel = getAQILabel(aqi);

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
      style={{ borderColor: aqiColor }}
    >
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{formattedLabel}</div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: aqiColor }}
          />
          <div>
            <div className="font-semibold" style={{ color: aqiColor }}>
              AQI: {aqi}
            </div>
            <div className="text-xs text-muted-foreground">{aqiLabel}</div>
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

export const HistoricalAQIChart = memo(function HistoricalAQIChart({
  data,
  isLoading,
  error,
  onDataPointClick,
  meta,
}: HistoricalAQIChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDimensionsRef = useRef({ width: 800, height: 400 });

  // Use ResizeObserver with debouncing to avoid forced reflows
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Use ResizeObserver for initial dimensions too - avoids forced reflow
    if ('ResizeObserver' in window && containerRef.current) {
      // Create observer that handles both initial and subsequent resizes
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Use debounced setTimeout to batch resize operations
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        resizeTimeoutRef.current = setTimeout(() => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              // Only update if change is significant (reduces re-renders)
              if (
                Math.abs(width - lastDimensionsRef.current.width) > 10 ||
                Math.abs(height - lastDimensionsRef.current.height) > 10
              ) {
                lastDimensionsRef.current = { width, height };
                // Use startTransition to defer state update
                startTransition(() => {
                  setDimensions({ width, height });
                });
              }
            }
          }
          resizeTimeoutRef.current = null;
        }, 150); // Debounce to reduce updates
      });
      
      resizeObserverRef.current.observe(containerRef.current);
    } else if (containerRef.current) {
      // Fallback: use IntersectionObserver to defer initial measurement
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && containerRef.current) {
          // Only measure when visible, and use RAF to defer
          requestAnimationFrame(() => {
            if (containerRef.current) {
              const width = containerRef.current.clientWidth || 800;
              const height = containerRef.current.clientHeight || 400;
              lastDimensionsRef.current = { width, height };
              startTransition(() => {
                setDimensions({ width, height });
              });
            }
          });
          observer.disconnect();
        }
      }, { threshold: 0.01 });
      
      observer.observe(containerRef.current);
      
      // Fallback resize handler
      const fallbackHandler = () => {
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          if (containerRef.current) {
            const width = containerRef.current.clientWidth || 800;
            const height = containerRef.current.clientHeight || 400;
            if (
              Math.abs(width - lastDimensionsRef.current.width) > 10 ||
              Math.abs(height - lastDimensionsRef.current.height) > 10
            ) {
              lastDimensionsRef.current = { width, height };
              startTransition(() => {
                setDimensions({ width, height });
              });
            }
          }
          resizeTimeoutRef.current = null;
        }, 150);
      };
      
      window.addEventListener('resize', fallbackHandler, { passive: true });
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', fallbackHandler);
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
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

  // Memoize chart data - limit points aggressively to prevent performance issues
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // More aggressive point limiting to prevent forced reflows
    const maxPoints = 500; // Reduced from 800
    const pointsToUse = data.length > maxPoints ? data.slice(-maxPoints) : data;
    
    // Use a more efficient transformation
    const transformed = new Array(pointsToUse.length);
    for (let i = 0; i < pointsToUse.length; i++) {
      const point = pointsToUse[i];
      transformed[i] = {
        timestamp: point.timestamp.getTime(),
        value: point.value,
        displayTime: point.displayTime,
        location: point.location,
      };
    }
    
    return transformed;
  }, [data]);

  // Memoize Y-axis domain calculation
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const aqiValues = chartData.map((d) => d.aqi);
    const minAQI = Math.max(0, Math.min(...aqiValues) - 10);
    const maxAQI = Math.min(500, Math.max(...aqiValues) + 10);
    return [minAQI, maxAQI];
  }, [chartData]);

  // Debounced click handler to prevent blocking
  const handleChartClick = useCallback((chartData: any) => {
    if (!onDataPointClick) return;
    
    startTransition(() => {
      if (chartData && chartData.activePayload && chartData.activePayload[0]) {
        const point = chartData.activePayload[0].payload as ChartDataPoint;
        onDataPointClick(point.fullEntry);
      }
    });
  }, [onDataPointClick]);

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading chart data...</p>
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
          <GlassCardTitle>Air Quality History</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-2">
            <p className="font-semibold">No data available</p>
            <p className="text-sm text-muted-foreground">
              Start recording air quality readings to see your history chart.
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
          <GlassCardTitle>Air Quality History</GlassCardTitle>
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
          aria-label="Air Quality Index history chart"
          style={{ minHeight: '400px' }}
        >
          <LineChart
            width={dimensions.width}
            height={dimensions.height}
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            onClick={handleChartClick}
            syncId="aqi-history-chart"
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
              label={{ value: 'AQI', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={<ChartTooltip />}
              animationDuration={0}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="aqi"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3B82F6' }}
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

HistoricalAQIChart.displayName = 'HistoricalAQIChart';

