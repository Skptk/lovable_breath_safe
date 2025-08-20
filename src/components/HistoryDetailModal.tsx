import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  MapPin, 
  Calendar, 
  Clock, 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Cloud, 
  Sun,
  Navigation,
  Gauge,
  CloudRain,
  Zap
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  // New weather fields
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

interface HistoryDetailModalProps {
  entry: HistoryEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions for AQI display
const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return "text-green-500";
  if (aqi <= 100) return "text-yellow-500";
  if (aqi <= 150) return "text-orange-500";
  if (aqi <= 200) return "text-red-500";
  if (aqi <= 300) return "text-purple-500";
  return "text-red-800";
};

const getAQIBadgeColor = (aqi: number): string => {
  if (aqi <= 50) return "bg-green-500 text-white";
  if (aqi <= 100) return "bg-yellow-500 text-white";
  if (aqi <= 150) return "bg-orange-500 text-white";
  if (aqi <= 200) return "bg-red-500 text-white";
  if (aqi <= 300) return "bg-purple-500 text-white";
  return "bg-red-800 text-white";
};

const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

export default function HistoryDetailModal({ entry, isOpen, onClose }: HistoryDetailModalProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  if (!entry) return null;

  const handleExport = async () => {
    if (!entry) return;
    
    setExporting(true);
    try {
      // Create a comprehensive export object
      const exportData = {
        ...entry,
        export_timestamp: new Date().toISOString(),
        export_format: 'JSON',
        app_version: 'Breath Safe v1.0'
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create and download file
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `breath-safe-history-${entry.id}-${new Date(entry.timestamp).toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "History entry exported successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export history entry",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Air Quality Reading Details
            </DialogTitle>
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {exporting ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="secondary"
                    className={`${getAQIBadgeColor(entry.aqi)} border-0 text-sm`}
                  >
                    AQI {entry.aqi}
                  </Badge>
                  <span className="text-lg font-medium">
                    {getAQILabel(entry.aqi)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {formatDate(entry.timestamp)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{entry.location_name || 'Unknown Location'}</span>
                <span className="text-xs">
                  ({entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)})
                </span>
              </div>
              {entry.data_source && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Source: {entry.data_source}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Air Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Air Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {entry.pm25 && entry.pm25 > 0 && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">PM2.5</div>
                    <div className="text-lg font-semibold">{entry.pm25.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">µg/m³</div>
                  </div>
                )}
                {entry.pm10 && entry.pm10 > 0 && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">PM10</div>
                    <div className="text-lg font-semibold">{entry.pm10.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">µg/m³</div>
                  </div>
                )}
                {entry.no2 && entry.no2 > 0 && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">NO₂</div>
                    <div className="text-lg font-semibold">{entry.no2.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">µg/m³</div>
                  </div>
                )}
                {entry.o3 && entry.o3 > 0 && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">O₃</div>
                    <div className="text-lg font-semibold">{entry.o3.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">µg/m³</div>
                  </div>
                )}
                {entry.co && entry.co > 0 && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">CO</div>
                    <div className="text-lg font-semibold">{entry.co.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">mg/m³</div>
                  </div>
                )}
                {entry.so2 && entry.so2 > 0 && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">SO₂</div>
                    <div className="text-lg font-semibold">{entry.so2.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">µg/m³</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weather Data */}
          {(entry.temperature || entry.humidity || entry.wind_speed || entry.weather_condition) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weather Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {entry.temperature && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Thermometer className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Temperature</span>
                      </div>
                      <div className="text-lg font-semibold text-orange-600">
                        {entry.temperature}°C
                      </div>
                      {entry.feels_like_temperature && (
                        <div className="text-xs text-muted-foreground">
                          Feels like {entry.feels_like_temperature}°C
                        </div>
                      )}
                    </div>
                  )}
                  
                  {entry.humidity && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Humidity</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {entry.humidity}%
                      </div>
                    </div>
                  )}

                  {entry.wind_speed && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Wind className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Wind Speed</span>
                      </div>
                      <div className="text-lg font-semibold text-green-600">
                        {entry.wind_speed} km/h
                      </div>
                      {entry.wind_direction && (
                        <div className="text-xs text-muted-foreground">
                          {getWindDirection(entry.wind_direction)}
                        </div>
                      )}
                    </div>
                  )}

                  {entry.air_pressure && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gauge className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Pressure</span>
                      </div>
                      <div className="text-lg font-semibold text-purple-600">
                        {entry.air_pressure} hPa
                      </div>
                    </div>
                  )}

                  {entry.rain_probability && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CloudRain className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Rain Chance</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {entry.rain_probability}%
                      </div>
                    </div>
                  )}

                  {entry.uv_index && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">UV Index</span>
                      </div>
                      <div className="text-lg font-semibold text-yellow-600">
                        {entry.uv_index}
                      </div>
                    </div>
                  )}

                  {entry.visibility && (
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Visibility</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-600">
                        {entry.visibility} km
                      </div>
                    </div>
                  )}
                </div>

                {entry.weather_condition && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Weather:</span>
                      <span className="capitalize">{entry.weather_condition}</span>
                    </div>
                  </div>
                )}

                {(entry.sunrise_time || entry.sunset_time) && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {entry.sunrise_time && (
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <div>
                          <div className="text-sm font-medium">Sunrise</div>
                          <div className="text-sm text-muted-foreground">{entry.sunrise_time}</div>
                        </div>
                      </div>
                    )}
                    {entry.sunset_time && (
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                        <Sun className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="text-sm font-medium">Sunset</div>
                          <div className="text-sm text-muted-foreground">{entry.sunset_time}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reading ID:</span>
                  <span className="font-mono text-xs">{entry.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(entry.created_at)} at {formatTime(entry.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <span className="font-mono text-xs">
                    {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
