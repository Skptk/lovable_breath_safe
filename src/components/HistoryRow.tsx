import { memo, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Eye, Trash2, Thermometer, Droplets } from 'lucide-react';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';

interface HistoryEntry {
  id: string;
  created_at: string;
  timestamp: string;
  location_name: string;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  pm1: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  pm003: number | null;
  data_source: string | null;
  latitude: number;
  longitude: number;
  wind_speed?: number | null;
  wind_direction?: number | null;
  wind_gust?: number | null;
  air_pressure?: number | null;
  rain_probability?: number | null;
  uv_index?: number | null;
  visibility?: number | null;
  weather_condition?: string | null;
  feels_like_temperature?: number | null;
  sunrise_time?: string | null;
  sunset_time?: string | null;
}

interface HistoryRowProps {
  entry: HistoryEntry;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenModal: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

// Helper functions
const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return 'text-green-500';
  if (aqi <= 100) return 'text-yellow-500';
  if (aqi <= 150) return 'text-orange-500';
  if (aqi <= 200) return 'text-red-500';
  if (aqi <= 300) return 'text-purple-500';
  return 'text-red-800';
};

const getAQIBadgeColor = (aqi: number): string => {
  if (aqi <= 50) return 'bg-green-500 text-white';
  if (aqi <= 100) return 'bg-yellow-500 text-white';
  if (aqi <= 150) return 'bg-orange-500 text-white';
  if (aqi <= 200) return 'bg-red-500 text-white';
  if (aqi <= 300) return 'bg-purple-500 text-white';
  return 'bg-red-800 text-white';
};

const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return date.toLocaleDateString();
};

function HistoryRowComponent({
  entry,
  isSelected,
  onToggleSelect,
  onOpenModal,
  onDelete,
}: HistoryRowProps) {
  const handleCheckboxChange = useCallback(() => {
    onToggleSelect(entry.id);
  }, [entry.id, onToggleSelect]);

  const handleOpenClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenModal(entry);
    },
    [entry, onOpenModal]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(entry.id);
    },
    [entry.id, onDelete]
  );

  const handleCardClick = useCallback(() => {
    onOpenModal(entry);
  }, [entry, onOpenModal]);

  // Memoize pollutant list to avoid recalculating
  const pollutants = useMemo(
    () => [
      entry.pm25 && entry.pm25 > 0 && { label: 'PM2.5', value: entry.pm25, unit: 'µg/m³' },
      entry.pm10 && entry.pm10 > 0 && { label: 'PM10', value: entry.pm10, unit: 'µg/m³' },
      entry.pm1 && entry.pm1 > 0 && { label: 'PM1', value: entry.pm1, unit: 'µg/m³' },
      entry.no2 && entry.no2 > 0 && { label: 'NO₂', value: entry.no2, unit: 'µg/m³' },
      entry.so2 && entry.so2 > 0 && { label: 'SO₂', value: entry.so2, unit: 'µg/m³' },
      entry.co && entry.co > 0 && { label: 'CO', value: entry.co, unit: 'mg/m³' },
      entry.o3 && entry.o3 > 0 && { label: 'O₃', value: entry.o3, unit: 'µg/m³' },
    ].filter(Boolean),
    [entry.pm25, entry.pm10, entry.pm1, entry.no2, entry.so2, entry.co, entry.o3]
  );

  const relativeTime = useMemo(() => formatRelativeTime(entry.timestamp), [entry.timestamp]);

  return (
    <GlassCard
      variant="default"
      className="cursor-pointer hover:scale-[1.02] group w-full max-w-full overflow-hidden transition-transform will-change-transform"
      onClick={handleCardClick}
      style={{ contain: 'layout paint' }}
    >
      <GlassCardContent className="p-3 md:p-4 w-full max-w-full overflow-hidden">
        <div className="space-y-3 w-full max-w-full overflow-hidden">
          {/* Header with AQI and Location */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full max-w-full overflow-hidden">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0 mt-1"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 overflow-hidden">
                  <Badge
                    variant="secondary"
                    className={`${getAQIBadgeColor(entry.aqi)} border-0 text-xs flex-shrink-0`}
                  >
                    AQI {entry.aqi}
                  </Badge>
                  <span className="text-sm text-muted-foreground truncate">
                    {getAQILabel(entry.aqi)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 overflow-hidden">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{entry.location_name || 'Unknown Location'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 overflow-hidden">
              <div className="text-xs text-muted-foreground truncate">{relativeTime}</div>
              {entry.data_source && (
                <Badge variant="outline" className="text-xs max-w-32 truncate">
                  {entry.data_source}
                </Badge>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                  onClick={handleOpenClick}
                  aria-label="View details"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={handleDeleteClick}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Pollutants Grid - Mobile Responsive */}
          {pollutants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-full overflow-hidden">
              {pollutants.map((pollutant) => (
                <div key={pollutant.label} className="text-xs bg-muted/50 p-2 rounded min-w-0 overflow-hidden">
                  <span className="font-medium">{pollutant.label}:</span>{' '}
                  <span className="truncate">
                    {pollutant.value.toFixed(pollutant.label === 'CO' ? 2 : 1)} {pollutant.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Environmental Data */}
          {(entry.temperature || entry.humidity) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50 w-full max-w-full overflow-hidden">
              {entry.temperature && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Thermometer className="h-3 w-3 flex-shrink-0" />
                  <span>{entry.temperature}°C</span>
                </div>
              )}
              {entry.humidity && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Droplets className="h-3 w-3 flex-shrink-0" />
                  <span>{entry.humidity}%</span>
                </div>
              )}
            </div>
          )}

          {/* Click hint */}
          <div className="flex items-center justify-center pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
              <Eye className="h-3 w-3" />
              <span>Click to view details</span>
            </div>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

// Memoize with custom comparison for optimal performance
export const HistoryRow = memo(HistoryRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.entry.aqi === nextProps.entry.aqi &&
    prevProps.entry.timestamp === nextProps.entry.timestamp
  );
});