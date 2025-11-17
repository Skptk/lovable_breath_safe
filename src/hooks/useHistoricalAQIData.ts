import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HistoryEntry, RawHistoryRow } from '@/components/HistoryView/HistoryView';
import { TimeRange, calculateTimeRange } from '@/components/HistoryView/utils/chartDataTransform';

const safeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const transformHistoryRow = (entry: RawHistoryRow): HistoryEntry => {
  const locationName =
    typeof entry.location_name === 'string' && entry.location_name.trim().length > 0
      ? entry.location_name
      : 'Unknown Location';

  return {
    id: entry.id,
    created_at: entry.created_at,
    timestamp: entry.timestamp ?? entry.created_at,
    location_name: locationName,
    aqi: entry.aqi,
    pm25: safeNumber(entry.pm25),
    pm10: safeNumber(entry.pm10),
    pm1: safeNumber(entry.pm1 ?? (entry as any).pm_1),
    no2: safeNumber(entry.no2),
    so2: safeNumber(entry.so2),
    co: safeNumber(entry.co),
    o3: safeNumber(entry.o3),
    temperature: safeNumber(entry.temperature),
    humidity: safeNumber(entry.humidity),
    pm003: safeNumber(entry.pm003 ?? (entry as any).pm_003),
    data_source: typeof entry.data_source === 'string' ? entry.data_source : null,
    latitude: entry.latitude,
    longitude: entry.longitude,
    wind_speed: safeNumber(entry.wind_speed),
    wind_direction: safeNumber(entry.wind_direction),
    wind_gust: safeNumber(entry.wind_gust),
    air_pressure: safeNumber(entry.air_pressure),
    rain_probability: safeNumber(entry.rain_probability),
    uv_index: safeNumber(entry.uv_index),
    visibility: safeNumber(entry.visibility),
    weather_condition: typeof entry.weather_condition === 'string' ? entry.weather_condition : null,
    feels_like_temperature: safeNumber(entry.feels_like_temperature),
    sunrise_time: entry.sunrise_time ?? null,
    sunset_time: entry.sunset_time ?? null,
  };
};

const MAX_CHART_RECORDS = 3000;

export function useHistoricalAQIData(userId: string | undefined, timeRange: TimeRange) {
  return useQuery({
    queryKey: ['historical-aqi', userId, timeRange.type, timeRange.start?.toISOString(), timeRange.end?.toISOString()],
    queryFn: async (): Promise<HistoryEntry[]> => {
      if (!userId) {
        return [];
      }

      // Calculate time range bounds
      const { start, end } = calculateTimeRange(timeRange.type, timeRange.start, timeRange.end);

      let query = supabase
        .from('air_quality_readings')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false }) // Pull newest first so we can cap results
        .limit(MAX_CHART_RECORDS);

      // Apply time range filter (skip for ALL)
      if (timeRange.type !== 'ALL') {
        query = query.gte('timestamp', start.toISOString()).lte('timestamp', end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rawData = (data ?? []) as RawHistoryRow[];
      // We fetched newest first to apply the limit; reverse to chronological order
      return rawData.reverse().map(transformHistoryRow);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 1000, // CRITICAL: 30 seconds - match default for aggressive cleanup
    retry: 2,
    retryDelay: 1000,
  });
}

