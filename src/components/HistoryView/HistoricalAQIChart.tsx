import { useMemo, memo, useCallback } from 'react';
import { startTransition } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Limit to reasonable number of points to prevent performance issues
    const maxPoints = 1000;
    const pointsToUse = data.length > maxPoints ? data.slice(-maxPoints) : data;
    return pointsToUse.map((point) => ({
      ...point,
      timestamp: point.timestamp.getTime(), // Convert to number for Recharts
    }));
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
        <div className="h-[400px] w-full" role="img" aria-label="Air Quality Index history chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
          </ResponsiveContainer>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
});

HistoricalAQIChart.displayName = 'HistoricalAQIChart';

