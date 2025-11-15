import { HistoryEntry } from '../HistoryView';
import { format, formatDistanceToNow } from 'date-fns';

export interface ChartDataPoint {
  timestamp: Date;
  displayTime: string;
  aqi: number;
  value: number;
  location: string;
  fullEntry: HistoryEntry;
  // Metadata for aggregation
  originalCount?: number; // Number of points aggregated into this bin
}

export type TimeRange = {
  type: '24h' | '7d' | '30d' | '90d' | 'ALL' | 'CUSTOM';
  start?: Date;
  end?: Date;
};

/**
 * Get adaptive point threshold based on viewport size
 */
export function getAdaptivePointThreshold(): number {
  if (typeof window === 'undefined') return 1000;
  
  const width = window.innerWidth;
  if (width < 768) return 400; // Mobile
  if (width < 1024) return 600; // Tablet
  return 1000; // Desktop
}

/**
 * Calculate time range from type
 */
export function calculateTimeRange(type: TimeRange['type'], customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (type) {
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'CUSTOM':
      if (customStart && customEnd) {
        start = customStart;
        return { start, end: customEnd };
      }
      // Fallback to 30d if custom dates not provided
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'ALL':
    default:
      // For ALL, we'll use a very old date - actual filtering happens in query
      start = new Date(0);
      break;
  }

  return { start, end };
}

/**
 * Format timestamp for display based on time range
 */
function formatTimestamp(date: Date, timeRange: TimeRange): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // For recent dates (< 7 days), show relative time
  if (diffDays < 7) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  // For longer ranges, show formatted date
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

  const { start, end } = calculateTimeRange(timeRange.type);
  const rangeHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const targetBins = threshold;
  const binSize = Math.ceil(rangeHours / targetBins);

  // Round to sensible bin sizes
  if (binSize <= 1) return 1; // 1 hour
  if (binSize <= 6) return 6; // 6 hours
  if (binSize <= 24) return 24; // 1 day
  return Math.ceil(binSize / 24) * 24; // Multiple of 24 hours
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
 * Transform history entries to chart data points
 */
export function transformHistoryForChart(
  entries: HistoryEntry[],
  timeRange: TimeRange,
  desiredPointLimit?: number
): { data: ChartDataPoint[]; meta: { originalCount: number; binnedCount: number; binSizeHours: number } } {
  if (entries.length === 0) {
    return {
      data: [],
      meta: { originalCount: 0, binnedCount: 0, binSizeHours: 0 },
    };
  }

  // Filter by time range if not ALL
  const { start, end } = calculateTimeRange(timeRange.type, timeRange.start, timeRange.end);
  let filteredEntries = entries;

  if (timeRange.type !== 'ALL') {
    filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= start && entryDate <= end;
    });
  }

  if (filteredEntries.length === 0) {
    return {
      data: [],
      meta: { originalCount: entries.length, binnedCount: 0, binSizeHours: 0 },
    };
  }

  // Sort chronologically
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Determine if binning is needed
  const threshold = desiredPointLimit ?? getAdaptivePointThreshold();
  const binSizeHours = getBinSizeHours(timeRange, sortedEntries.length, threshold);

  // Transform to chart data points
  const chartPoints: ChartDataPoint[] = sortedEntries.map((entry) => ({
    timestamp: new Date(entry.timestamp),
    displayTime: formatTimestamp(new Date(entry.timestamp), timeRange),
    aqi: entry.aqi,
    value: entry.aqi, // MVP: Always use AQI
    location: entry.location_name,
    fullEntry: entry,
  }));

  // Apply binning if needed
  if (binSizeHours > 0 && chartPoints.length > threshold) {
    const bins = new Map<string, ChartDataPoint[]>();

    // Group points into bins
    chartPoints.forEach((point) => {
      const binKey = getBinKey(point.timestamp, binSizeHours);
      if (!bins.has(binKey)) {
        bins.set(binKey, []);
      }
      bins.get(binKey)!.push(point);
    });

    // Aggregate bins: average AQI, use first entry for metadata
    const binnedData: ChartDataPoint[] = Array.from(bins.entries())
      .map(([binKey, binPoints]) => {
        const avgAQI = binPoints.reduce((sum, p) => sum + p.aqi, 0) / binPoints.length;
        const firstPoint = binPoints[0];
        const binTimestamp = new Date(binKey);

        return {
          timestamp: binTimestamp,
          displayTime: formatTimestamp(binTimestamp, timeRange),
          aqi: Math.round(avgAQI),
          value: Math.round(avgAQI),
          location: firstPoint.location,
          fullEntry: firstPoint.fullEntry, // Use first entry for detail modal
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

