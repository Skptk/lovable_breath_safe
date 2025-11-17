import { useMemo, memo } from 'react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/GlassCard';
import { ChartDataPoint, TimeRange } from './utils/chartDataTransform';
import { PollutantKey, POLLUTANT_CONFIGS } from './HistoricalAQIChart';
import { getPollutantInfo } from '@/lib/airQualityUtils';
import { Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface MiniPollutantChartProps {
  data: ChartDataPoint[];
  pollutantKey: PollutantKey;
  isLoading?: boolean;
  error?: Error | null;
  timeRange?: TimeRange;
}

const formatTick = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};

// Custom tooltip component for mini pollutant charts
const MiniPollutantTooltip = memo(({ active, payload, label, pollutantKey }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const value = data?.value;
  const config = POLLUTANT_CONFIGS.find(p => p.key === pollutantKey);
  
  if (value === null || value === undefined || !config) {
    return null;
  }

  const info = getPollutantInfo(config.code, value);

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
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2 shadow-lg">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{formattedLabel}</div>
        <div className="flex items-center gap-1 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-muted-foreground">{info.label}:</span>
          <span className="font-medium">{value.toFixed(1)} {info.unit}</span>
        </div>
      </div>
    </div>
  );
});

MiniPollutantTooltip.displayName = 'MiniPollutantTooltip';

export function MiniPollutantChart({ data, pollutantKey, isLoading, error, timeRange }: MiniPollutantChartProps) {
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

  if (error) {
    return (
      <GlassCard>
        <GlassCardContent className="h-40 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">Error loading data</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full">
      <GlassCardHeader className="pb-2 px-3 sm:px-4 md:px-6 lg:px-8">
        <GlassCardTitle className="text-xs sm:text-sm lg:text-base font-semibold flex items-center gap-1.5 sm:gap-2 lg:gap-2.5">
          <span
            className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 lg:h-2.5 lg:w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: config?.color ?? '#22d3ee' }}
          />
          <span className="truncate">{info.label}</span>
        </GlassCardTitle>
        <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground">{info.unit}</p>
      </GlassCardHeader>
      <GlassCardContent className="h-32 sm:h-40 lg:h-48 xl:h-56 px-3 sm:px-4 md:px-6 lg:px-8">
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
                content={<MiniPollutantTooltip pollutantKey={pollutantKey} />}
                wrapperStyle={{ outline: 'none' }}
                cursor={{ stroke: config?.color ?? '#22d3ee', strokeWidth: 1 }}
                isAnimationActive={false}
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


