import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, YAxis } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { WeatherChartDataPoint, WeatherMetric } from '../WeatherView/utils/weatherChartDataTransform';
import { Loader2, AlertTriangle } from 'lucide-react';

interface WeatherMetricBentoCardProps {
  metric: WeatherMetric;
  data?: WeatherChartDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
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

export function WeatherMetricBentoCard({
  metric,
  data = [],
  isLoading,
  error,
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
    <GlassCard>
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
      <GlassCardContent className="h-48">
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
                formatter={(value: number) => [`${value.toFixed(1)} ${config.unit}`, config.label]}
                labelFormatter={(label) => new Date(label).toLocaleString()}
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


