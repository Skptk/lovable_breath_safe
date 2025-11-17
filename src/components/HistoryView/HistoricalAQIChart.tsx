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
export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3';
interface PollutantConfig {
  key: PollutantKey;
  code: string;
  color: string;
}

export const POLLUTANT_CONFIGS: PollutantConfig[] = [
  { key: 'pm25', code: 'PM25', color: '#3B82F6' }, // Blue
  { key: 'pm10', code: 'PM10', color: '#8B5CF6' }, // Purple
  { key: 'no2', code: 'NO2', color: '#EF4444' }, // Red
  { key: 'so2', code: 'SO2', color: '#F59E0B' }, // Amber
  { key: 'co', code: 'CO', color: '#10B981' }, // Green
  { key: 'o3', code: 'O3', color: '#06B6D4' }, // Cyan
];

type ChartTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: any;
  normalizeSeries?: boolean;
};

type NormalizedPointExtras = {
  __rawValues?: Partial<Record<PollutantKey, number | null>>;
  __isNormalized?: boolean;
};

// Memoized tooltip component to prevent re-renders
const ChartTooltip = memo(({ active, payload, label, normalizeSeries }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  try {
    const data = payload[0].payload as ChartDataPoint & NormalizedPointExtras;
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
          {normalizeSeries && (
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Normalized view (0-100%)
            </div>
          )}
          {selectedPollutants.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              {selectedPollutants.map((pollKey: PollutantKey) => {
                const config = POLLUTANT_CONFIGS.find(p => p.key === pollKey);
                if (!config) return null;
                const value = data.__rawValues?.[pollKey] ?? (data as any)[pollKey];
                if (value === null || value === undefined || typeof value !== 'number' || Number.isNaN(value)) return null;
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
  // Initialize with mobile-friendly defaults
  const getInitialDimensions = () => {
    if (typeof window === 'undefined') return { width: 800, height: 400 };
    const isMobile = window.innerWidth < 640;
    return { 
      width: window.innerWidth - 40, 
      height: isMobile ? 250 : window.innerWidth < 768 ? 300 : 400 
    };
  };
  const [dimensions, setDimensions] = useState(getInitialDimensions);
  const [selectedPollutants, setSelectedPollutants] = useState<Set<PollutantKey>>(new Set(['pm25']));
  const [normalizeSeries, setNormalizeSeries] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastDimensionsRef = useRef(getInitialDimensions());

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
                // Use smaller threshold on mobile for better responsiveness
                const threshold = width < 640 ? 5 : 10;
                if (
                  Math.abs(width - lastDimensionsRef.current.width) > threshold ||
                  Math.abs(height - lastDimensionsRef.current.height) > threshold
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
              const width = containerRef.current.clientWidth || (typeof window !== 'undefined' ? window.innerWidth - 40 : 800);
              const isMobile = width < 640;
              const height = containerRef.current.clientHeight || (isMobile ? 250 : width < 768 ? 300 : 400);
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
            const width = containerRef.current.clientWidth || (typeof window !== 'undefined' ? window.innerWidth - 40 : 800);
            const isMobile = width < 640;
            const height = containerRef.current.clientHeight || (isMobile ? 250 : width < 768 ? 300 : 400);
            const threshold = width < 640 ? 5 : 10;
            if (
              Math.abs(width - lastDimensionsRef.current.width) > threshold ||
              Math.abs(height - lastDimensionsRef.current.height) > threshold
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
    try {
      if (!data || !Array.isArray(data) || data.length === 0) return new Set<PollutantKey>();
      const available = new Set<PollutantKey>();
      for (const point of data) {
        if (!point) continue;
        if (point.pm25 !== null && point.pm25 !== undefined) available.add('pm25');
        if (point.pm10 !== null && point.pm10 !== undefined) available.add('pm10');
        if (point.no2 !== null && point.no2 !== undefined) available.add('no2');
        if (point.so2 !== null && point.so2 !== undefined) available.add('so2');
        if (point.co !== null && point.co !== undefined) available.add('co');
        if (point.o3 !== null && point.o3 !== undefined) available.add('o3');
      }
      return available;
    } catch (error) {
      console.error('Error determining available pollutants:', error);
      return new Set<PollutantKey>();
    }
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
    try {
      if (!data || !Array.isArray(data) || data.length === 0) return [];
      
      // More aggressive point limiting to prevent forced reflows
      const maxPoints = 500; // Reduced from 800
      const pointsToUse = data.length > maxPoints ? data.slice(-maxPoints) : data;
      
      // Use a more efficient transformation - but keep all required fields including pollutants
      const transformed: any[] = [];
      for (let i = 0; i < pointsToUse.length; i++) {
        const point = pointsToUse[i];
        if (!point) {
          // Skip invalid points
          continue;
        }
        
        try {
          // Safely handle timestamp - could be Date, string, or number
          let timestampValue: number;
          try {
            if (point.timestamp instanceof Date) {
              timestampValue = point.timestamp.getTime();
            } else if (typeof point.timestamp === 'string') {
              timestampValue = new Date(point.timestamp).getTime();
              if (isNaN(timestampValue)) timestampValue = Date.now();
            } else if (typeof point.timestamp === 'number') {
              timestampValue = point.timestamp;
            } else {
              // Fallback to current time if invalid
              timestampValue = Date.now();
            }
          } catch {
            timestampValue = Date.now();
          }
          
          const aqiValue = typeof point.aqi === 'number' && !isNaN(point.aqi) ? point.aqi : 0;
          const transformedPoint = {
            timestamp: timestampValue,
            aqi: aqiValue,
            value: typeof point.value === 'number' && !isNaN(point.value) ? point.value : aqiValue,
            displayTime: typeof point.displayTime === 'string' ? point.displayTime : '',
            location: typeof point.location === 'string' ? point.location : '',
            fullEntry: point.fullEntry || null, // Required for click handler
            pm25: typeof point.pm25 === 'number' && !isNaN(point.pm25) ? point.pm25 : null,
            pm10: typeof point.pm10 === 'number' && !isNaN(point.pm10) ? point.pm10 : null,
            no2: typeof point.no2 === 'number' && !isNaN(point.no2) ? point.no2 : null,
            so2: typeof point.so2 === 'number' && !isNaN(point.so2) ? point.so2 : null,
            co: typeof point.co === 'number' && !isNaN(point.co) ? point.co : null,
            o3: typeof point.o3 === 'number' && !isNaN(point.o3) ? point.o3 : null,
          };
          
          transformed.push(transformedPoint);
        } catch (pointError) {
          console.warn('Error transforming chart point:', pointError, point);
          // Skip this point but continue processing others
          continue;
        }
      }
      
      return transformed;
    } catch (error) {
      console.error('Error transforming chart data:', error);
      return [];
    }
  }, [data]);

  const pollutantStats = useMemo(() => {
    if (!normalizeSeries || chartData.length === 0) {
      return null;
    }

    return POLLUTANT_CONFIGS.reduce<Record<PollutantKey, { min: number; max: number } | null>>((acc, config) => {
      const values = chartData
        .map((point) => point[config.key])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

      if (values.length === 0) {
        acc[config.key] = null;
      } else {
        acc[config.key] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }

      return acc;
    }, {} as Record<PollutantKey, { min: number; max: number } | null>);
  }, [chartData, normalizeSeries]);

  const renderedChartData = useMemo(() => {
    if (!normalizeSeries || !pollutantStats) {
      return chartData;
    }

    return chartData.map((point) => {
      const normalizedPoint: ChartDataPoint & NormalizedPointExtras = {
        ...point,
        __rawValues: {},
        __isNormalized: true,
      };

      POLLUTANT_CONFIGS.forEach(({ key }) => {
        const rawValue = point[key];
        normalizedPoint.__rawValues![key] = rawValue ?? null;
        const stats = pollutantStats[key];

        if (stats && typeof rawValue === 'number' && Number.isFinite(rawValue)) {
          const range = stats.max - stats.min;
          if (range <= 0) {
            normalizedPoint[key] = 50;
          } else {
            normalizedPoint[key] = ((rawValue - stats.min) / range) * 100;
          }
        } else {
          normalizedPoint[key] = null;
        }
      });

      return normalizedPoint;
    });
  }, [chartData, normalizeSeries, pollutantStats]);

  // Memoize Y-axis domain calculation - use pollutant values if showing pollutants
  const yAxisDomain = useMemo(() => {
    if (normalizeSeries) {
      return [0, 100];
    }

    if (!Array.isArray(renderedChartData) || renderedChartData.length === 0) return [0, 100];
    
    try {
      // If showing pollutants, calculate domain based on selected pollutants
      if (selectedPollutants.size > 0) {
        const allValues: number[] = [];
        selectedPollutants.forEach(pollKey => {
          renderedChartData.forEach(d => {
            // Safely access pollutant value with type assertion
            const currentValue = (d as Record<string, unknown>)[pollKey];
            if (
              typeof currentValue === 'number' &&
              !Number.isNaN(currentValue) &&
              Number.isFinite(currentValue)
            ) {
              allValues.push(currentValue);
            }
          });
        });
        
        if (allValues.length > 0) {
          const min = Math.max(0, Math.min(...allValues) * 0.9);
          const max = Math.max(...allValues) * 1.1;
          if (Number.isFinite(min) && Number.isFinite(max)) {
            return [min, max];
          }
        } else {
          return [0, 100];
        }
      }
      
      // Fallback to AQI domain
      const aqiValues = renderedChartData
        .map((d) => d.aqi)
        .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value));
      if (aqiValues.length > 0) {
        const minAQI = Math.max(0, Math.min(...aqiValues) - 10);
        const maxAQI = Math.min(500, Math.max(...aqiValues) + 10);
        if (Number.isFinite(minAQI) && Number.isFinite(maxAQI)) {
          return [minAQI, maxAQI];
        }
      }
    } catch (error) {
      console.error('Error calculating Y-axis domain:', error);
    }
    
    return [0, 100]; // Default fallback
  }, [renderedChartData, selectedPollutants, normalizeSeries]);

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
    
    try {
      startTransition(() => {
        if (chartData && chartData.activePayload && chartData.activePayload[0]) {
          const point = chartData.activePayload[0].payload as ChartDataPoint;
          if (point && point.fullEntry) {
            onDataPointClick(point.fullEntry);
          }
        }
      });
    } catch (error) {
      console.error('Error handling chart click:', error);
    }
  }, [onDataPointClick]);

  if (isLoading) {
    return (
      <GlassCard>
        <GlassCardContent className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[400px]">
          <div className="text-center space-y-4 px-2">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">Loading chart data...</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <GlassCardContent className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[400px]">
          <div className="text-center space-y-4 px-2">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-destructive" />
            <div>
              <p className="text-sm sm:text-base font-semibold">Failed to load chart</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{error.message}</p>
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
          <GlassCardTitle className="text-base sm:text-lg">Air Quality History</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[400px]">
          <div className="text-center space-y-2 px-2">
            <p className="text-sm sm:text-base font-semibold">No data available</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Start recording air quality readings to see your history chart.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  // Get Y-axis label based on selected pollutants
  const yAxisLabel = useMemo(() => {
    if (normalizeSeries) {
      return 'Normalized (0-100)';
    }
    try {
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
    } catch (error) {
      console.error('Error calculating Y-axis label:', error);
      return 'Value';
    }
  }, [selectedPollutants, normalizeSeries]);

  // Safety check - ensure chartData is valid before rendering
  if (!Array.isArray(chartData)) {
    console.error('Invalid chartData:', chartData);
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Air Quality History</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
            <p className="font-semibold">Invalid chart data</p>
            <p className="text-sm text-muted-foreground">
              The chart data is in an invalid format. Please refresh the page.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <GlassCardTitle className="text-base sm:text-lg">Air Quality History</GlassCardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              {meta && meta.binSizeHours > 0 && (
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  Showing {meta.binnedCount} of {meta.originalCount} readings
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Scale:</span>
                <Button
                  variant={normalizeSeries ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNormalizeSeries((prev) => !prev)}
                  className="h-7 text-xs px-2 sm:px-3"
                  aria-pressed={normalizeSeries}
                >
                  {normalizeSeries ? 'Normalized' : 'Actual'}
                </Button>
              </div>
            </div>
          </div>
          {/* Pollutant Selector */}
          {availablePollutants.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-muted-foreground self-center hidden sm:inline">Pollutants:</span>
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
                    className="h-7 text-[10px] sm:text-xs px-1.5 sm:px-2"
                    style={isSelected ? { 
                      backgroundColor: config.color,
                      borderColor: config.color,
                      color: 'white'
                    } : {}}
                  >
                    <div
                      className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full mr-1 sm:mr-1.5"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="hidden min-[375px]:inline">{info.label}</span>
                    <span className="min-[375px]:hidden">{config.code}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent className="p-2 sm:p-6">
        <div 
          ref={containerRef}
          className="w-full h-[250px] sm:h-[300px] md:h-[400px]" 
          role="img" 
          aria-label="Air Quality Index history chart"
        >
          <LineChart
            width={dimensions.width}
            height={dimensions.height}
            data={renderedChartData}
            margin={{ 
              top: 5, 
              right: dimensions.width < 640 ? 5 : 20, 
              left: dimensions.width < 640 ? 0 : 10, 
              bottom: dimensions.width < 640 ? 20 : 5 
            }}
            onClick={handleChartClick}
            syncId="aqi-history-chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: dimensions.width < 640 ? '10px' : '12px' }}
              interval="preserveStartEnd"
              angle={dimensions.width < 640 ? -45 : 0}
              textAnchor={dimensions.width < 640 ? 'end' : 'middle'}
              height={dimensions.width < 640 ? 40 : 30}
            />
            <YAxis
              domain={yAxisDomain}
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: dimensions.width < 640 ? '10px' : '12px' }}
              width={dimensions.width < 640 ? 30 : 40}
              label={dimensions.width >= 640 ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
            />
            <Tooltip 
              content={<ChartTooltip normalizeSeries={normalizeSeries} />}
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

