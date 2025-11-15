import { format, formatDistanceToNow } from 'date-fns';
import { TimeRange, calculateTimeRange, getAdaptivePointThreshold } from '../../HistoryView/utils/chartDataTransform';

export interface WeatherEntry {
  id: string;
  timestamp: string;
  location_name: string | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_gust: number | null;
  air_pressure: number | null;
  rain_probability: number | null;
}

export interface WeatherChartDataPoint {
  timestamp: Date;
  displayTime: string;
  value: number;
  location: string;
  fullEntry: WeatherEntry;
  // Metadata for aggregation
  originalCount?: number;
}

export type WeatherMetric = 'temperature' | 'humidity' | 'windSpeed' | 'windGust' | 'precipitation' | 'airPressure';

/**
 * Get metric value from weather entry
 */
function getMetricValue(entry: WeatherEntry, metric: WeatherMetric): number | null {
  switch (metric) {
    case 'temperature':
      return entry.temperature;
    case 'humidity':
      return entry.humidity;
    case 'windSpeed':
      return entry.wind_speed;
    case 'windGust':
      return entry.wind_gust;
    case 'precipitation':
      return entry.rain_probability;
    case 'airPressure':
      return entry.air_pressure;
    default:
      return null;
  }
}

/**
 * Format timestamp for display based on time range
 */
function formatTimestamp(date: Date, timeRange: TimeRange): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 7) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  switch (timeRange.type) {
    case '24h':
    case '7d':
      return format(date, 'MMM d, HH:mm');
    case '30d':
      return format(date, 'MMM d');
    case '90d':
    case 'ALL':
      return format(date, 'MMM d, yyyy');
    default:
      return format(date, 'MMM d, yyyy');
  }
}

/**
 * Get bin size in hours based on time range and point count
 */
function getBinSizeHours(timeRange: TimeRange, pointCount: number, threshold: number): number {
  if (pointCount <= threshold) {
    return 0; // No binning needed
  }

  const { start, end } = calculateTimeRange(timeRange.type, timeRange.start, timeRange.end);
  const rangeHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const targetBins = threshold;
  const binSize = Math.ceil(rangeHours / targetBins);

  if (binSize <= 1) return 1;
  if (binSize <= 6) return 6;
  if (binSize <= 24) return 24;
  return Math.ceil(binSize / 24) * 24;
}

/**
 * Get bin key for grouping data points
 */
function getBinKey(timestamp: Date, binSizeHours: number): string {
  if (binSizeHours === 0) return timestamp.toISOString();
  
  const binStart = new Date(timestamp);
  binStart.setMinutes(0);
  binStart.setSeconds(0);
  binStart.setMilliseconds(0);
  
  const binIndex = Math.floor(binStart.getTime() / (binSizeHours * 60 * 60 * 1000));
  const binStartTime = new Date(binIndex * binSizeHours * 60 * 60 * 1000);
  
  return binStartTime.toISOString();
}

/**
 * Transform weather entries to chart data points
 */
export function transformWeatherForChart(
  entries: WeatherEntry[],
  timeRange: TimeRange,
  metric: WeatherMetric,
  desiredPointLimit?: number
): { data: WeatherChartDataPoint[]; meta: { originalCount: number; binnedCount: number; binSizeHours: number } } {
  if (import.meta.env.DEV) {
    console.log('[transformWeatherForChart] Input:', {
      entriesCount: entries.length,
      timeRange: timeRange.type,
      metric,
      firstEntry: entries[0],
      lastEntry: entries[entries.length - 1],
    });
  }

  if (entries.length === 0) {
    return {
      data: [],
      meta: { originalCount: 0, binnedCount: 0, binSizeHours: 0 },
    };
  }

  // Note: RPC function already filters by time range, but we do a client-side check
  // to handle edge cases and ensure data consistency
  const { start, end } = calculateTimeRange(timeRange.type, timeRange.start, timeRange.end);
  let filteredEntries = entries;

  // Only filter if we have entries and it's not ALL (RPC already filtered, but double-check)
  if (timeRange.type !== 'ALL' && entries.length > 0) {
    filteredEntries = entries.filter((entry) => {
      try {
        const entryDate = new Date(entry.timestamp);
        // Allow a small buffer for timezone/rounding issues
        return entryDate >= new Date(start.getTime() - 1000) && entryDate <= new Date(end.getTime() + 1000);
      } catch (e) {
        console.warn('[transformWeatherForChart] Invalid timestamp:', entry.timestamp, e);
        return false;
      }
    });
  }

  if (filteredEntries.length === 0) {
    return {
      data: [],
      meta: { originalCount: entries.length, binnedCount: 0, binSizeHours: 0 },
    };
  }

  // Filter entries with valid metric values
  const validEntries = filteredEntries.filter((entry) => {
    const value = getMetricValue(entry, metric);
    const isValid = value !== null && typeof value === 'number' && Number.isFinite(value);
    if (import.meta.env.DEV && !isValid && filteredEntries.length < 10) {
      console.log('[transformWeatherForChart] Invalid entry:', { entry, metric, value });
    }
    return isValid;
  });

  if (import.meta.env.DEV) {
    console.log('[transformWeatherForChart] After filtering:', {
      filteredCount: filteredEntries.length,
      validCount: validEntries.length,
      metric,
    });
  }

  if (validEntries.length === 0) {
    return {
      data: [],
      meta: { originalCount: filteredEntries.length, binnedCount: 0, binSizeHours: 0 },
    };
  }

  // Sort chronologically
  const sortedEntries = [...validEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Determine if binning is needed
  const threshold = desiredPointLimit ?? getAdaptivePointThreshold();
  const binSizeHours = getBinSizeHours(timeRange, sortedEntries.length, threshold);

  // Transform to chart data points (limit upfront to prevent memory issues)
  const maxEntriesToProcess = Math.min(sortedEntries.length, threshold * 2);
  const entriesToProcess = sortedEntries.slice(-maxEntriesToProcess); // Take most recent
  
  const chartPoints: WeatherChartDataPoint[] = entriesToProcess.map((entry) => {
    const entryDate = new Date(entry.timestamp);
    const metricValue = getMetricValue(entry, metric) as number;
    
    return {
      timestamp: entryDate,
      displayTime: formatTimestamp(entryDate, timeRange),
      value: metricValue,
      location: entry.location_name || 'Unknown Location',
      fullEntry: entry,
    };
  });

  // Apply binning if needed
  if (binSizeHours > 0 && chartPoints.length > threshold) {
    const bins = new Map<string, WeatherChartDataPoint[]>();

    // Group points into bins
    chartPoints.forEach((point) => {
      const binKey = getBinKey(point.timestamp, binSizeHours);
      if (!bins.has(binKey)) {
        bins.set(binKey, []);
      }
      bins.get(binKey)!.push(point);
    });

    // Aggregate bins: average value, use first entry for metadata
    const binnedData: WeatherChartDataPoint[] = Array.from(bins.entries())
      .map(([binKey, binPoints]) => {
        const avgValue = binPoints.reduce((sum, p) => sum + p.value, 0) / binPoints.length;
        const firstPoint = binPoints[0];
        const binTimestamp = new Date(binKey);

        return {
          timestamp: binTimestamp,
          displayTime: formatTimestamp(binTimestamp, timeRange),
          value: Math.round(avgValue * 100) / 100, // Round to 2 decimal places
          location: firstPoint.location,
          fullEntry: firstPoint.fullEntry,
          originalCount: binPoints.length,
        };
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      data: binnedData,
      meta: {
        originalCount: sortedEntries.length,
        binnedCount: binnedData.length,
        binSizeHours,
      },
    };
  }

  return {
    data: chartPoints,
    meta: {
      originalCount: sortedEntries.length,
      binnedCount: chartPoints.length,
      binSizeHours: 0,
    },
  };
}

