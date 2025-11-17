import { useMemo, memo, useCallback, useRef, useEffect, useState } from 'react';
import { startTransition } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartDataPoint } from './utils/chartDataTransform';
import { HistoryEntry } from '../HistoryView';
import { getAQIColor, getAQILabel } from '@/config/maps';
import { getPollutantInfo } from '@/lib/airQualityUtils';
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

// Pollutant configuration
type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3';
interface PollutantConfig {
  key: PollutantKey;
  code: string;
  color: string;
}

const POLLUTANT_CONFIGS: PollutantConfig[] = [
  { key: 'pm25', code: 'PM25', color: '#3B82F6' }, // Blue
  { key: 'pm10', code: 'PM10', color: '#8B5CF6' }, // Purple
  { key: 'no2', code: 'NO2', color: '#EF4444' }, // Red
  { key: 'so2', code: 'SO2', color: '#F59E0B' }, // Amber
  { key: 'co', code: 'CO', color: '#10B981' }, // Green
  { key: 'o3', code: 'O3', color: '#06B6D4' }, // Cyan
];

// Memoized tooltip component to prevent re-renders
const ChartTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  try {
    const data = payload[0].payload as ChartDataPoint;
    if (!data || typeof data.aqi !== 'number') {
      return null;
    }
    
    const aqi = data.aqi;
    const aqiColor = getAQIColor(aqi);
    const aqiLabel = getAQILabel(aqi);

    // Extract selected pollutants from payload (each line in payload represents a selected pollutant)
    const selectedPollutants: PollutantKey[] = payload
      .map((p: any) => {
        const dataKey = p.dataKey as string;
        if (dataKey && ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'].includes(dataKey)) {
          return dataKey as PollutantKey;
        }
        return null;
      })
      .filter((p: PollutantKey | null): p is PollutantKey => p !== null);

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
        <div className="space-y-2">
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
          {selectedPollutants.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              {selectedPollutants.map((pollKey: PollutantKey) => {
                const config = POLLUTANT_CONFIGS.find(p => p.key === pollKey);
                if (!config) return null;
                const value = (data as any)[pollKey];
                if (value === null || value === undefined) return null;
                const info = getPollutantInfo(config.code, value);
                return (
                  <div key={pollKey} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-muted-foreground">{info.label}:</span>
                    <span className="font-medium">{value.toFixed(1)} {info.unit}</span>
                  </div>
                );
              })}
            </div>
          )}
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
  } catch (error) {
    console.error('Error rendering tooltip:', error);
    return null;
  }
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
  const [selectedPollutants, setSelectedPollutants] = useState<Set<PollutantKey>>(new Set(['pm25']));
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastDimensionsRef = useRef({ width: 800, height: 400 });

  // Use ResizeObserver with debouncing to avoid forced reflows
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Use ResizeObserver for initial dimensions too - avoids forced reflow
    if ('ResizeObserver' in window && containerRef.current) {
      // Create observer that handles both initial and subsequent resizes
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Cancel any pending RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        
        // Batch resize operations in a single RAF
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          
          // Use debounced setTimeout to further reduce updates
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
          }, 200); // Increased debounce to reduce forced reflows
        });
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
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Determine which pollutants are available in the data
  const availablePollutants = useMemo(() => {
    if (!data || data.length === 0) return new Set<PollutantKey>();
    const available = new Set<PollutantKey>();
    for (const point of data) {
      if (point.pm25 !== null && point.pm25 !== undefined) available.add('pm25');
      if (point.pm10 !== null && point.pm10 !== undefined) available.add('pm10');
      if (point.no2 !== null && point.no2 !== undefined) available.add('no2');
      if (point.so2 !== null && point.so2 !== undefined) available.add('so2');
      if (point.co !== null && point.co !== undefined) available.add('co');
      if (point.o3 !== null && point.o3 !== undefined) available.add('o3');
    }
    return available;
  }, [data]);

  // Update selected pollutants to only include available ones
  useEffect(() => {
    if (availablePollutants.size > 0) {
      setSelectedPollutants(prev => {
        const filtered = new Set<PollutantKey>();
        prev.forEach(key => {
          if (availablePollutants.has(key)) {
            filtered.add(key);
          }
        });
        // If no pollutants selected, default to first available
        if (filtered.size === 0 && availablePollutants.size > 0) {
          filtered.add(Array.from(availablePollutants)[0]);
        }
        return filtered;
      });
    }
  }, [availablePollutants]);

  // Memoize chart data - limit points aggressively to prevent performance issues
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      // More aggressive point limiting to prevent forced reflows
      const maxPoints = 500; // Reduced from 800
      const pointsToUse = data.length > maxPoints ? data.slice(-maxPoints) : data;
      
      // Use a more efficient transformation - but keep all required fields including pollutants
      const transformed = new Array(pointsToUse.length);
      for (let i = 0; i < pointsToUse.length; i++) {
        const point = pointsToUse[i];
        // Safely handle timestamp - could be Date, string, or number
        let timestampValue: number;
        if (point.timestamp instanceof Date) {
          timestampValue = point.timestamp.getTime();
        } else if (typeof point.timestamp === 'string') {
          timestampValue = new Date(point.timestamp).getTime();
        } else if (typeof point.timestamp === 'number') {
          timestampValue = point.timestamp;
        } else {
          // Fallback to current time if invalid
          timestampValue = Date.now();
        }
        
        transformed[i] = {
          timestamp: timestampValue,
          aqi: point.aqi ?? 0, // Required for chart rendering, default to 0 if missing
          value: point.value ?? point.aqi ?? 0,
          displayTime: point.displayTime ?? '',
          location: point.location ?? '',
          fullEntry: point.fullEntry, // Required for click handler
          pm25: point.pm25 ?? null,
          pm10: point.pm10 ?? null,
          no2: point.no2 ?? null,
          so2: point.so2 ?? null,
          co: point.co ?? null,
          o3: point.o3 ?? null,
        };
      }
      
      return transformed;
    } catch (error) {
      console.error('Error transforming chart data:', error);
      return [];
    }
  }, [data]);

  // Memoize Y-axis domain calculation - use pollutant values if showing pollutants
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    try {
      // If showing pollutants, calculate domain based on selected pollutants
      if (selectedPollutants.size > 0) {
        const allValues: number[] = [];
        selectedPollutants.forEach(pollKey => {
          chartData.forEach(d => {
            // Safely access pollutant value with type assertion
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
    } catch (error) {
      console.error('Error calculating Y-axis domain:', error);
    }
    
    return [0, 100]; // Default fallback
  }, [chartData, selectedPollutants]);

  // Toggle pollutant selection
  const togglePollutant = useCallback((pollKey: PollutantKey) => {
    setSelectedPollutants(prev => {
      const next = new Set(prev);
      if (next.has(pollKey)) {
        next.delete(pollKey);
        // Ensure at least one pollutant is selected
        if (next.size === 0 && availablePollutants.size > 0) {
          const firstAvailable = Array.from(availablePollutants)[0];
          next.add(firstAvailable);
        }
      } else {
        next.add(pollKey);
      }
      return next;
    });
  }, [availablePollutants]);

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

  // Get Y-axis label based on selected pollutants
  const yAxisLabel = useMemo(() => {
    if (selectedPollutants.size === 0) return 'AQI';
    if (selectedPollutants.size === 1) {
      const pollKey = Array.from(selectedPollutants)[0];
      const config = POLLUTANT_CONFIGS.find(p => p.key === pollKey);
      if (config) {
        const info = getPollutantInfo(config.code, 0);
        return info.unit;
      }
    }
    return 'Value';
  }, [selectedPollutants]);

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <GlassCardTitle>Air Quality History</GlassCardTitle>
            {meta && meta.binSizeHours > 0 && (
              <div className="text-xs text-muted-foreground">
                Showing {meta.binnedCount} of {meta.originalCount} readings
              </div>
            )}
          </div>
          {/* Pollutant Selector */}
          {availablePollutants.size > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center">Pollutants:</span>
              {POLLUTANT_CONFIGS.map(config => {
                const isAvailable = availablePollutants.has(config.key);
                const isSelected = selectedPollutants.has(config.key);
                if (!isAvailable) return null;
                const info = getPollutantInfo(config.code, 0);
                return (
                  <Button
                    key={config.key}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePollutant(config.key)}
                    className="h-7 text-xs px-2"
                    style={isSelected ? { 
                      backgroundColor: config.color,
                      borderColor: config.color,
                      color: 'white'
                    } : {}}
                  >
                    <div
                      className="h-2 w-2 rounded-full mr-1.5"
                      style={{ backgroundColor: config.color }}
                    />
                    {info.label}
                  </Button>
                );
              })}
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
              label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              content={<ChartTooltip />}
              animationDuration={0}
              isAnimationActive={false}
            />
            {/* Render lines for selected pollutants */}
            {Array.from(selectedPollutants).map(pollKey => {
              const config = POLLUTANT_CONFIGS.find(p => p.key === pollKey);
              if (!config) return null;
              return (
                <Line
                  key={pollKey}
                  type="monotone"
                  dataKey={pollKey}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: config.color }}
                  isAnimationActive={false}
                  animationDuration={0}
                  connectNulls={false}
                  name={getPollutantInfo(config.code, 0).label}
                />
              );
            })}
          </LineChart>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
});

HistoricalAQIChart.displayName = 'HistoricalAQIChart';

