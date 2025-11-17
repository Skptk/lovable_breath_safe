import { useMemo } from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { ChartDataPoint } from './utils/chartDataTransform';
import { PollutantKey, POLLUTANT_CONFIGS } from './HistoryView/HistoricalAQIChart';
import { getPollutantInfo } from '@/lib/airQualityUtils';
import { Loader2 } from 'lucide-react';

interface MiniPollutantChartProps {
  data: ChartDataPoint[];
  pollutantKey: PollutantKey;
  isLoading?: boolean;
}

const formatTick = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};

export function MiniPollutantChart({ data, pollutantKey, isLoading }: MiniPollutantChartProps) {
  const config = POLLUTANT_CONFIGS.find((item) => item.key === pollutantKey);
  const info = getPollutantInfo(config?.code ?? pollutantKey.toUpperCase(), 0);

  const series = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data
      .map((point) => {
        const value = point[pollutantKey];
        if (typeof value !== 'number' || Number.isNaN(value)) {
          return null;
        }

        const timestamp =
          point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp);

        return {
          timestamp,
          value,
        };
      })
      .filter((item): item is { timestamp: Date; value: number } => item !== null);
  }, [data, pollutantKey]);

  const hasData = series.length > 0;

  return (
    <GlassCard>
      <GlassCardHeader className="pb-2">
        <GlassCardTitle className="text-sm font-semibold flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: config?.color ?? '#22d3ee' }}
          />
          {info.label}
        </GlassCardTitle>
        <p className="text-xs text-muted-foreground">{info.unit}</p>
      </GlassCardHeader>
      <GlassCardContent className="h-40">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <XAxis
                dataKey="timestamp"
                tick={false}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                width={30}
                tickFormatter={formatTick}
                axisLine={false}
                tickLine={false}
                fontSize={10}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)} ${info.unit}`, info.label]}
                labelFormatter={(label) => new Date(label).toLocaleString()}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config?.color ?? '#22d3ee'}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground text-center px-2">
            No data recorded for this pollutant in the selected range.
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}


