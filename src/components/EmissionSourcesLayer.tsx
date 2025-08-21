import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cloud, MapPin, AlertTriangle, RefreshCw, Info } from "lucide-react";
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
      // Try OpenAQ API for emission data
      const response = await fetch(
        `https://api.openaq.org/v2/measurements?coordinates=${latitude},${longitude}&radius=50000&limit=100&order_by=datetime&sort=desc`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Process and cluster emission sources
          const sources = processEmissionData(data.results);
          setEmissionSources(sources);
          setLastUpdated(new Date().toISOString());
          
          toast({
            title: "Emission Data Updated",
            description: `Found ${sources.length} emission sources in your area`,
          });
        } else {
          // No data available from OpenAQ - set empty array
          setEmissionSources([]);
          setLastUpdated(new Date().toISOString());
          
          toast({
            title: "No Emission Data",
            description: "OpenAQ has no coverage in this area",
          });
        }
      } else {
        throw new Error(`OpenAQ API request failed: ${response.status}`);
      }
    } catch (error) {
      // OpenAQ API failed - set empty array instead of mock data
      setEmissionSources([]);
      setError("Unable to fetch emission data at this time");
      setLastUpdated(new Date().toISOString());
      
      toast({
        title: "Emission Data Unavailable",
        description: "Unable to fetch emission data due to API limitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processEmissionData = (measurements: any[]): EmissionSource[] => {
    // Group measurements by location and parameter
    const locationMap = new Map();
    
    measurements.forEach(measurement => {
      const locationKey = `${measurement.location}-${measurement.coordinates.latitude}-${measurement.coordinates.longitude}`;
      
      if (!locationMap.has(locationKey)) {
        locationMap.set(locationKey, {
          id: locationKey,
          name: measurement.location,
          type: 'Monitoring Station',
          latitude: measurement.coordinates.latitude,
          longitude: measurement.coordinates.longitude,
          emissions: {},
          lastUpdated: measurement.date.utc,
          distance: calculateDistance(latitude, longitude, measurement.coordinates.latitude, measurement.coordinates.longitude)
        });
      }
      
      const source = locationMap.get(locationKey);
      source.emissions[measurement.parameter] = measurement.value;
      
      if (new Date(measurement.date.utc) > new Date(source.lastUpdated)) {
        source.lastUpdated = measurement.date.utc;
      }
    });
    
    return Array.from(locationMap.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 closest sources
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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

  if (loading && emissionSources.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Emission Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading emission data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && emissionSources.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Emission Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchEmissionData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (emissionSources.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Emission Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No emission sources found in your area</p>
            <p className="text-sm mt-2">Try refreshing or check back later for updated data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Emission Sources
            <Badge variant="secondary">{emissionSources.length} sources</Badge>
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {emissionSources.length > 0 && (
          <div className="space-y-6">
            {/* Emission Sources Carousel */}
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
                                {source.distance.toFixed(1)} km away
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(source.lastUpdated).toLocaleDateString()}
                          </Badge>
                        </div>

                        {/* Emissions Summary */}
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
                <div className="text-xs text-muted-foreground">Total Sources</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {emissionSources.filter(s => s.distance < 5).length}
                </div>
                <div className="text-xs text-muted-foreground">Within 5km</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {emissionSources.filter(s => s.distance < 10).length}
                </div>
                <div className="text-xs text-muted-foreground">Within 10km</div>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {emissionSources.filter(s => s.type === 'Monitoring Station').length}
                </div>
                <div className="text-xs text-muted-foreground">Monitoring Stations</div>
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
      </CardContent>
    </Card>
  );
}
