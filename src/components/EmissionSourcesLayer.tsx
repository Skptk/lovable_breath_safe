import { useState, useEffect } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, MapPin, AlertTriangle, RefreshCw, Info, Shield, TrendingUp, Globe, Wind, Thermometer, Droplets } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface EmissionSource {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  emissions: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    so2?: number;
    co?: number;
    o3?: number;
  };
  lastUpdated: string;
  distance: number;
}

interface EmissionSourcesLayerProps {
  latitude: number;
  longitude: number;
}

export default function EmissionSourcesLayer({ latitude, longitude }: EmissionSourcesLayerProps): JSX.Element {
  const [emissionSources, setEmissionSources] = useState<EmissionSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const fetchEmissionData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Use OpenWeatherMap Air Pollution API instead of OpenAQ
      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
      if (!apiKey) {
        throw new Error('OpenWeatherMap API key not configured');
      }
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.list && data.list.length > 0) {
          // Process OpenWeatherMap air pollution data
          const sources = processOpenWeatherMapData(data.list[0], latitude, longitude);
          setEmissionSources(sources);
          setLastUpdated(new Date().toISOString());
          
          toast({
            title: "Air Quality Data Updated",
            description: `Updated air quality information for your area`,
          });
        } else {
          // No data available
          setEmissionSources([]);
          setLastUpdated(new Date().toISOString());
          setError("No air quality data available for this area");
        }
      } else {
        throw new Error(`OpenWeatherMap API request failed: ${response.status}`);
      }
    } catch (error) {
      // API failed - show informational content instead of error
      setEmissionSources([]);
      setError("Air quality data temporarily unavailable");
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  const processOpenWeatherMapData = (airQualityData: any, userLat: number, userLon: number): EmissionSource[] => {
    // Create a virtual emission source based on OpenWeatherMap data
    // This represents the air quality in the user's area
    const source: EmissionSource = {
      id: 'local-air-quality',
      name: 'Local Air Quality Station',
      type: 'OpenWeatherMap Monitoring',
      latitude: userLat,
      longitude: userLon,
      emissions: {
        pm25: airQualityData.components.pm2_5,
        pm10: airQualityData.components.pm10,
        no2: airQualityData.components.no2,
        so2: airQualityData.components.so2,
        co: airQualityData.components.co,
        o3: airQualityData.components.o3
      },
      lastUpdated: new Date().toISOString(),
      distance: 0
    };

    return [source];
  };

  const getEmissionLevel = (value: number, parameter: string): { level: string; color: string } => {
    let level = 'Low';
    let color = 'bg-green-500';
    
    switch (parameter) {
      case 'pm25':
        if (value > 35) { level = 'High'; color = 'bg-red-500'; }
        else if (value > 12) { level = 'Moderate'; color = 'bg-yellow-500'; }
        break;
      case 'pm10':
        if (value > 150) { level = 'High'; color = 'bg-red-500'; }
        else if (value > 55) { level = 'Moderate'; color = 'bg-yellow-500'; }
        break;
      case 'no2':
        if (value > 200) { level = 'High'; color = 'bg-red-500'; }
        else if (value > 100) { level = 'Moderate'; color = 'bg-yellow-500'; }
        break;
      case 'so2':
        if (value > 500) { level = 'High'; color = 'bg-red-500'; }
        else if (value > 150) { level = 'Moderate'; color = 'bg-yellow-500'; }
        break;
      case 'co':
        if (value > 9000) { level = 'High'; color = 'bg-red-500'; }
        else if (value > 4000) { level = 'Moderate'; color = 'bg-yellow-500'; }
        break;
      case 'o3':
        if (value > 150) { level = 'High'; color = 'bg-red-500'; }
        else if (value > 100) { level = 'Moderate'; color = 'bg-yellow-500'; }
        break;
    }
    
    return { level, color };
  };

  const getParameterUnit = (parameter: string): string => {
    const units: { [key: string]: string } = {
      pm25: 'µg/m³',
      pm10: 'µg/m³',
      no2: 'ppb',
      so2: 'ppb',
      co: 'ppb',
      o3: 'ppb'
    };
    return units[parameter] || '';
  };

  useEffect(() => {
    fetchEmissionData();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchEmissionData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  // Show informational content when no emission data is available
  if (emissionSources.length === 0 && !loading) {
    return (
      <GlassCard className="floating-card mt-4">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Air Quality Monitoring
            <Badge variant="secondary">OpenWeatherMap</Badge>
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-6">
            {/* Informational Carousel */}
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className="p-6 floating-card rounded-lg border h-full">
                      <div className="text-center space-y-3">
                        <Shield className="h-12 w-12 text-blue-600 mx-auto" />
                        <h4 className="font-semibold text-lg">Real-Time Air Quality</h4>
                        <p className="text-sm text-muted-foreground">
                          Get accurate air quality data from OpenWeatherMap's global monitoring network.
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                  
                  <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className="p-6 floating-card rounded-lg border h-full">
                      <div className="text-center space-y-3">
                        <TrendingUp className="h-12 w-12 text-green-600 mx-auto" />
                        <h4 className="font-semibold text-lg">Comprehensive Monitoring</h4>
                        <p className="text-sm text-muted-foreground">
                          Track PM2.5, PM10, NO2, SO2, CO, and O3 levels with precision.
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                  
                  <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className="p-6 floating-card rounded-lg border h-full">
                      <div className="text-center space-y-3">
                        <Globe className="h-12 w-12 text-purple-600 mx-auto" />
                        <h4 className="font-semibold text-lg">Global Coverage</h4>
                        <p className="text-sm text-muted-foreground">
                          Access air quality data from OpenWeatherMap's worldwide network.
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>

            {/* Status Information */}
            <div className="text-center space-y-4">
              {error && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button 
                    onClick={fetchEmissionData} 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                <p>Air quality data powered by OpenWeatherMap</p>
                <p className="mt-1">Real-time monitoring with 30-minute refresh intervals</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                Learn More
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Later
              </Button>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (loading && emissionSources.length === 0) {
    return (
      <GlassCard className="floating-card mt-4">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Air Quality Monitoring
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading air quality data...</p>
          </div>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="floating-card mt-4">
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <GlassCardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Air Quality Monitoring
            <Badge variant="secondary">OpenWeatherMap</Badge>
          </GlassCardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showDetails ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Button onClick={fetchEmissionData} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {emissionSources.length > 0 && (
          <div className="space-y-6">
            {/* Air Quality Data Carousel */}
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {emissionSources.map((source) => (
                    <CarouselItem key={source.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <div className="p-4 bg-muted/30 rounded-lg border h-full">
                        {/* Source Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{source.name}</h4>
                            <p className="text-xs text-muted-foreground">{source.type}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                Your location
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(source.lastUpdated).toLocaleDateString()}
                          </Badge>
                        </div>

                        {/* Air Quality Summary */}
                        <div className="space-y-2">
                          {Object.entries(source.emissions).map(([parameter, value]) => {
                            const { level, color } = getEmissionLevel(value, parameter);
                            return (
                              <div key={parameter} className="flex items-center justify-between">
                                <span className="text-xs font-medium uppercase">{parameter}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{value.toFixed(1)} {getParameterUnit(parameter)}</span>
                                  <div className={`w-2 h-2 rounded-full ${color}`}></div>
                                  <span className="text-xs text-muted-foreground">{level}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Detailed View */}
                        {showDetails && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="text-xs text-muted-foreground">
                              <div>Coordinates: {source.latitude.toFixed(4)}, {source.longitude.toFixed(4)}</div>
                              <div>Last Updated: {new Date(source.lastUpdated).toLocaleString()}</div>
                              <div>Data Source: OpenWeatherMap Air Pollution API</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{emissionSources.length}</div>
                <div className="text-xs text-muted-foreground">Monitoring Points</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {emissionSources.filter(s => 
                    Object.values(s.emissions).every(val => val <= 50)
                  ).length}
                </div>
                <div className="text-xs text-muted-foreground">Good Quality</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {emissionSources.filter(s => 
                    Object.values(s.emissions).some(val => val > 50 && val <= 100)
                  ).length}
                </div>
                <div className="text-xs text-muted-foreground">Moderate</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {emissionSources.filter(s => s.type === 'OpenWeatherMap Monitoring').length}
                </div>
                <div className="text-xs text-muted-foreground">Data Sources</div>
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-xs text-muted-foreground pt-4">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
