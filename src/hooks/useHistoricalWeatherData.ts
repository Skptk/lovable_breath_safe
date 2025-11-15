import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WeatherEntry, WeatherMetric } from '@/components/WeatherView/utils/weatherChartDataTransform';
import { TimeRange, calculateTimeRange } from '@/components/HistoryView/utils/chartDataTransform';

// Telemetry helper
function logTelemetry(event: string, data: Record<string, any>) {
  if (import.meta.env.DEV) {
    console.log(`[WeatherData Telemetry] ${event}`, data);
  }
  // In production, this could send to analytics service
}

interface WeatherSeriesResponse {
  raw: WeatherEntry[];
  totalCount: number;
  availableMetrics: string[];
}

export function useHistoricalWeatherData(
  userId: string | undefined,
  timeRange: TimeRange,
  metric: WeatherMetric = 'temperature'
) {
  return useQuery({
    queryKey: ['historical-weather', userId, timeRange.type, timeRange.start?.toISOString(), timeRange.end?.toISOString(), metric],
    queryFn: async (): Promise<WeatherSeriesResponse> => {
      if (!userId) {
        return { raw: [], totalCount: 0, availableMetrics: [] };
      }

      // Calculate time range bounds
      const { start, end } = calculateTimeRange(timeRange.type, timeRange.start, timeRange.end);

      // Get adaptive point threshold for server-side binning
      const threshold = typeof window !== 'undefined' 
        ? (window.innerWidth < 768 ? 400 : window.innerWidth < 1024 ? 600 : 1000)
        : 1000;

      // Call Supabase RPC function with telemetry
      const apiStart = performance.now();
      const { data, error } = await supabase.rpc('get_weather_series', {
        p_user_id: userId,
        p_start_ts: timeRange.type === 'ALL' ? new Date(0).toISOString() : start.toISOString(),
        p_end_ts: end.toISOString(),
        p_desired_points: threshold,
      });
      const apiLatency = performance.now() - apiStart;

      if (error) {
        throw error;
      }

      // Parse response
      const response = data as WeatherSeriesResponse;
      
      logTelemetry('api_response', {
        points_requested: threshold,
        points_returned: response.raw?.length || 0,
        total_count: response.totalCount || 0,
        available_metrics: response.availableMetrics || [],
        api_latency_ms: Math.round(apiLatency * 100) / 100,
      });
      
      return {
        raw: response.raw || [],
        totalCount: response.totalCount || 0,
        availableMetrics: response.availableMetrics || [],
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: 1000,
  });
}

