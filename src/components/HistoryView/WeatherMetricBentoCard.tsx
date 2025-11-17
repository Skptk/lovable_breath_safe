import { useMemo, memo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, YAxis } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { WeatherChartDataPoint, WeatherMetric } from '../WeatherView/utils/weatherChartDataTransform';
import { Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface WeatherMetricBentoCardProps {
  metric: WeatherMetric;
  data?: WeatherChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
  meta?: {
    originalCount: number;
    binnedCount: number;
    binSizeHours: number;
  };
  timeRange?: string;
}

const METRIC_CONFIG: Record<
  WeatherMetric,
  { label: string; unit: string; color: string }
> = {
  temperature: { label: 'Temperature', unit: '°C', color: '#EF4444' },
  humidity: { label: 'Humidity', unit: '%', color: '#3B82F6' },
  windSpeed: { label: 'Wind Speed', unit: 'km/h', color: '#10B981' },
  windGust: { label: 'Wind Gust', unit: 'km/h', color: '#14B8A6' },
  precipitation: { label: 'Precipitation', unit: '%', color: '#8B5CF6' },
  airPressure: { label: 'Air Pressure', unit: 'hPa', color: '#F59E0B' },
};

// Custom tooltip component for weather metric charts
const WeatherMetricTooltip = memo(({ active, payload, label, metric }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const value = data?.value;
  const config = METRIC_CONFIG[metric];
  
  if (value === null || value === undefined || !config) {
    return null;
  }

  let formattedLabel = '';
  try {
    if (label instanceof Date) {
      formattedLabel = format(label, 'MMM d, yyyy HH:mm');
    } else if (typeof label === 'string') {
      formattedLabel = format(new Date(label), 'MMM d, yyyy HH:mm');
    } else {
      formattedLabel = String(label);
    }
  } catch {
    formattedLabel = String(label);
  }

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2 shadow-lg" style={{ borderColor: config.color }}>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{formattedLabel}</div>
        <div className="flex items-center gap-1 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-muted-foreground">{config.label}:</span>
          <span className="font-medium">
            {value.toFixed(metric === 'temperature' ? 1 : 0)}{config.unit}
          </span>
        </div>
      </div>
    </div>
  );
});

WeatherMetricTooltip.displayName = 'WeatherMetricTooltip';

export function WeatherMetricBentoCard({
  metric,
  data = [],
  isLoading,
  error,
  meta,
  timeRange,
}: WeatherMetricBentoCardProps) {
  const config = METRIC_CONFIG[metric];

  const hasData = Array.isArray(data) && data.length > 0;
  const series = useMemo(() => {
    if (!hasData) return [];
    return data.map((point) => ({
      timestamp:
        point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp),
      value: point.value,
    }));
  }, [data, hasData]);

  return (
    <GlassCard className="h-full">
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm font-semibold flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          {config.label}
        </GlassCardTitle>
        <p className="text-xs text-muted-foreground">{config.unit}</p>
      </GlassCardHeader>
      <GlassCardContent className="h-40">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Unable to load data
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false} />
              <YAxis width={30} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip
                content={<WeatherMetricTooltip metric={metric} />}
                wrapperStyle={{ outline: 'none' }}
                cursor={{ stroke: config.color, strokeWidth: 1 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground px-2">
            No {config.label.toLowerCase()} data in this range
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}


