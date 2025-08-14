import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Layers } from "lucide-react";

interface NearbyLocation {
  id: string;
  name: string;
  distance: string;
  aqi: number;
  coordinates: [number, number];
}

const nearbyLocations: NearbyLocation[] = [
  {
    id: "1",
    name: "Downtown San Francisco",
    distance: "2.1 km",
    aqi: 45,
    coordinates: [37.7749, -122.4194],
  },
  {
    id: "2",
    name: "Golden Gate Park",
    distance: "3.8 km",
    aqi: 38,
    coordinates: [37.7694, -122.4862],
  },
  {
    id: "3",
    name: "Mission District",
    distance: "4.2 km",
    aqi: 52,
    coordinates: [37.7599, -122.4148],
  },
  {
    id: "4",
    name: "Presidio",
    distance: "5.1 km",
    aqi: 35,
    coordinates: [37.7989, -122.4662],
  },
];

const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "aqi-good";
  if (aqi <= 100) return "aqi-moderate";
  if (aqi <= 150) return "aqi-unhealthy-sensitive";
  if (aqi <= 200) return "aqi-unhealthy";
  if (aqi <= 300) return "aqi-very-unhealthy";
  return "aqi-hazardous";
};

const getAQILabel = (aqi: number) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

export default function MapView() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Air Quality Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nearby air quality monitoring stations
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          Layers
        </Button>
      </div>

      {/* Map Placeholder */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-0">
          <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="text-center space-y-2">
              <MapPin className="h-12 w-12 text-primary mx-auto" />
              <div className="text-lg font-semibold">Interactive Map</div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Real-time air quality data from monitoring stations in your area
              </p>
            </div>
            
            {/* Mock Map Pins */}
            <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-aqi-good rounded-full animate-pulse" />
            <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-aqi-moderate rounded-full animate-pulse" />
            <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-aqi-good rounded-full animate-pulse" />
            <div className="absolute top-2/3 left-1/4 w-3 h-3 bg-aqi-moderate rounded-full animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Current Location */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Your Current Location
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">San Francisco, CA</div>
              <div className="text-sm text-muted-foreground">37.7749, -122.4194</div>
            </div>
            <Badge 
              variant="secondary"
              className="bg-aqi-good text-white border-0"
            >
              AQI 42
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Nearby Stations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Nearby Monitoring Stations</h2>
        {nearbyLocations.map((location) => (
          <Card key={location.id} className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-muted-foreground">{location.distance} away</div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary"
                      className={`bg-${getAQIColor(location.aqi)} text-white border-0 text-xs`}
                    >
                      AQI {location.aqi}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getAQILabel(location.aqi)}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}