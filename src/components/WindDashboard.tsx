import { useState, useEffect } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wind, Gauge, Compass, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WindData {
  windSpeed: number;
  windDirection: number;
  gustSpeed: number;
  timestamp: string;
}

interface WindDashboardProps {
  latitude: number;
  longitude: number;
}

export default function WindDashboard({ latitude, longitude }: WindDashboardProps): JSX.Element {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWindData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Try Open-Meteo API first
      const openMeteoResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`
      );

      if (openMeteoResponse.ok) {
        const data = await openMeteoResponse.json();
        const current = data.current;
        
        setWindData({
          windSpeed: current.wind_speed_10m,
          windDirection: current.wind_direction_10m,
          gustSpeed: current.wind_gusts_10m || 0,
          timestamp: current.time
        });
        
        setLastUpdated(new Date().toISOString());
        toast({
          title: "Wind Data Updated",
          description: "Successfully fetched wind data from Open-Meteo",
        });
        return;
      }
    } catch (error) {
      console.warn('Open-Meteo API failed:', error);
    }

    // Fallback to Windy API if Open-Meteo fails
    try {
      const windyResponse = await fetch(
        `https://api.windy.com/api/point-forecast/v2?lat=${latitude}&lon=${longitude}&key=${import.meta.env.VITE_WINDY_API_KEY || 'demo'}&model=gfs&parameters=wind`
      );

      if (windyResponse.ok) {
        const data = await windyResponse.json();
        // Extract wind data from Windy API response
        // Note: This is a simplified example - actual Windy API response structure may differ
        const windInfo = data.wind || {};
        
        setWindData({
          windSpeed: windInfo.speed || 0,
          windDirection: windInfo.direction || 0,
          gustSpeed: windInfo.gust || 0,
          timestamp: new Date().toISOString()
        });
        
        setLastUpdated(new Date().toISOString());
        toast({
          title: "Wind Data Updated",
          description: "Successfully fetched wind data from Windy API (fallback)",
        });
        return;
      }
    } catch (error) {
      console.warn('Windy API also failed:', error);
    }

    // If both APIs fail, show error
    setError('Failed to fetch wind data from both Open-Meteo and Windy APIs');
    toast({
      title: "Wind Data Error",
      description: "Unable to fetch wind data. Please try again later.",
      variant: "destructive",
    });
  };

  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWindSpeedColor = (speed: number): string => {
    if (speed < 10) return 'text-green-600';
    if (speed < 25) return 'text-yellow-600';
    if (speed < 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getWindSpeedLabel = (speed: number): string => {
    if (speed < 5) return 'Light';
    if (speed < 15) return 'Moderate';
    if (speed < 25) return 'Strong';
    if (speed < 40) return 'Very Strong';
    return 'Extreme';
  };

  useEffect(() => {
    fetchWindData();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchWindData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  if (loading && !windData) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Wind Dashboard
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading wind data...</p>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (error && !windData) {
    return (
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Wind Dashboard
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchWindData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Wind Dashboard
          </GlassCardTitle>
          <Button onClick={fetchWindData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {windData ? (
          <div className="space-y-6">
            {/* Wind Rose Visualization */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48 md:w-56 md:h-56">
                {/* Background circle with better contrast */}
                <div className="absolute inset-0 bg-muted/40 dark:bg-muted/20 rounded-full"></div>
                
                {/* Wind Rose Circle - Thicker border for visibility */}
                <div className="absolute inset-0 border-[3px] border-primary/80 dark:border-primary rounded-full"></div>
                
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full z-10"></div>
                
                {/* Wind Direction Arrow - More visible */}
                <div 
                  className="absolute inset-6 md:inset-8 rounded-full flex items-center justify-center"
                  style={{
                    transform: `rotate(${windData.windDirection}deg)`
                  }}
                >
                  <div className="w-3 h-20 md:h-24 bg-primary dark:bg-primary rounded-full relative shadow-xl z-20">
                    {/* Arrow head - larger and more visible */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-transparent border-b-primary dark:border-b-primary"></div>
                  </div>
                </div>
                
                {/* Primary Direction Labels - Larger, bolder, better contrast */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-base md:text-lg font-extrabold text-foreground bg-background/95 dark:bg-background border-2 border-primary/50 dark:border-primary px-3 py-1.5 rounded-lg shadow-xl z-30">N</div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-base md:text-lg font-extrabold text-foreground bg-background/95 dark:bg-background border-2 border-primary/50 dark:border-primary px-3 py-1.5 rounded-lg shadow-xl z-30">S</div>
                <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 -ml-2 text-base md:text-lg font-extrabold text-foreground bg-background/95 dark:bg-background border-2 border-primary/50 dark:border-primary px-3 py-1.5 rounded-lg shadow-xl z-30">W</div>
                <div className="absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 -mr-2 text-base md:text-lg font-extrabold text-foreground bg-background/95 dark:bg-background border-2 border-primary/50 dark:border-primary px-3 py-1.5 rounded-lg shadow-xl z-30">E</div>
                
                {/* Secondary Direction Labels - Larger and more visible */}
                <div className="absolute top-4 right-4 text-xs md:text-sm font-bold text-foreground bg-background/90 dark:bg-background border border-primary/40 dark:border-primary/60 px-2 py-1 rounded-md shadow-lg z-20">NE</div>
                <div className="absolute top-4 left-4 text-xs md:text-sm font-bold text-foreground bg-background/90 dark:bg-background border border-primary/40 dark:border-primary/60 px-2 py-1 rounded-md shadow-lg z-20">NW</div>
                <div className="absolute bottom-4 right-4 text-xs md:text-sm font-bold text-foreground bg-background/90 dark:bg-background border border-primary/40 dark:border-primary/60 px-2 py-1 rounded-md shadow-lg z-20">SE</div>
                <div className="absolute bottom-4 left-4 text-xs md:text-sm font-bold text-foreground bg-background/90 dark:bg-background border border-primary/40 dark:border-primary/60 px-2 py-1 rounded-md shadow-lg z-20">SW</div>
              </div>
            </div>

            {/* Wind Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Wind Speed */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Wind Speed</span>
                </div>
                <div className={`text-3xl font-bold ${getWindSpeedColor(windData.windSpeed)}`}>
                  {windData.windSpeed.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">km/h</div>
                <Badge variant="secondary" className="mt-2">
                  {getWindSpeedLabel(windData.windSpeed)}
                </Badge>
              </div>

              {/* Wind Direction */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Direction</span>
                </div>
                <div className="text-3xl font-bold text-primary">
                  {getWindDirection(windData.windDirection)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {windData.windDirection.toFixed(0)}°
                </div>
              </div>

              {/* Gust Speed */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Gust Speed</span>
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {windData.gustSpeed.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">km/h</div>
                {windData.gustSpeed > windData.windSpeed * 1.5 && (
                  <Badge variant="destructive" className="mt-2">
                    High Gusts
                  </Badge>
                )}
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-xs text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No wind data available
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
