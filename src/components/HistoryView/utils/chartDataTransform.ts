import { HistoryEntry } from '../HistoryView';
import { format, formatDistanceToNow } from 'date-fns';

export interface ChartDataPoint {
  timestamp: Date;
  displayTime: string;
  aqi: number;
  value: number;
  location: string;
  fullEntry: HistoryEntry;
  // Pollutant values
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  // Metadata for aggregation
  originalCount?: number; // Number of points aggregated into this bin
}

export type TimeRange = {
  type: '24h' | '7d' | '30d' | '90d' | 'ALL' | 'CUSTOM';
  start?: Date;
  end?: Date;
};

// Cache viewport width to avoid forced reflows
let cachedViewportWidth: number | null = null;
let lastViewportCheck = 0;
const VIEWPORT_CACHE_MS = 1000; // Cache for 1 second

/**
 * Get adaptive point threshold based on viewport size
 * Uses cached value to avoid forced reflows
 */
export function getAdaptivePointThreshold(): number {
  if (typeof window === 'undefined') return 1000;
  
  const now = Date.now();
  // Only check viewport if cache is stale
  if (cachedViewportWidth === null || now - lastViewportCheck > VIEWPORT_CACHE_MS) {
    // Use requestAnimationFrame to batch layout reads
    if (typeof requestAnimationFrame !== 'undefined') {
      // For immediate calls, use cached value if available
      if (cachedViewportWidth !== null) {
        return cachedViewportWidth < 768 ? 400 : cachedViewportWidth < 1024 ? 600 : 1000;
      }
    }
    cachedViewportWidth = window.innerWidth;
    lastViewportCheck = now;
  }
  
  const width = cachedViewportWidth;
  if (width < 768) return 400; // Mobile
  if (width < 1024) return 600; // Tablet
  return 1000; // Desktop
}

// Update cache on resize (throttled)
if (typeof window !== 'undefined') {
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      cachedViewportWidth = window.innerWidth;
      lastViewportCheck = Date.now();
    }, 250); // Throttle to 250ms
  }, { passive: true });
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

  // Transform to chart data points (limit upfront to prevent memory issues)
  const maxEntriesToProcess = Math.min(sortedEntries.length, threshold * 2); // Process 2x threshold max
  const entriesToProcess = sortedEntries.slice(-maxEntriesToProcess); // Take most recent
  
  const chartPoints: ChartDataPoint[] = entriesToProcess.map((entry) => {
    const entryDate = new Date(entry.timestamp);
    return {
      timestamp: entryDate,
      displayTime: formatTimestamp(entryDate, timeRange),
      aqi: entry.aqi,
      value: entry.aqi, // MVP: Always use AQI
      location: entry.location_name,
      fullEntry: entry,
      pm25: entry.pm25,
      pm10: entry.pm10,
      no2: entry.no2,
      so2: entry.so2,
      co: entry.co,
      o3: entry.o3,
    };
  });

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

    // Aggregate bins: average AQI and pollutants, use first entry for metadata
    const binnedData: ChartDataPoint[] = Array.from(bins.entries())
      .map(([binKey, binPoints]) => {
        const avgAQI = binPoints.reduce((sum, p) => sum + p.aqi, 0) / binPoints.length;
        
        // Average pollutant values (only for non-null values)
        const avgPollutant = (key: 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3') => {
          const validValues = binPoints
            .map(p => p[key])
            .filter((v): v is number => v !== null && v !== undefined);
          if (validValues.length === 0) return null;
          return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
        };
        
        const firstPoint = binPoints[0];
        const binTimestamp = new Date(binKey);

        return {
          timestamp: binTimestamp,
          displayTime: formatTimestamp(binTimestamp, timeRange),
          aqi: Math.round(avgAQI),
          value: Math.round(avgAQI),
          location: firstPoint.location,
          fullEntry: firstPoint.fullEntry, // Use first entry for detail modal
          pm25: avgPollutant('pm25'),
          pm10: avgPollutant('pm10'),
          no2: avgPollutant('no2'),
          so2: avgPollutant('so2'),
          co: avgPollutant('co'),
          o3: avgPollutant('o3'),
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

