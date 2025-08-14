import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Layers, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NearbyLocation {
  id: string;
  name: string;
  distance: string;
  aqi: number;
  coordinates: [number, number];
}

interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

interface AirQualityData {
  aqi: number;
  location: string;
  timestamp: string;
}

export default function MapView(): JSX.Element {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Mock nearby locations - in a real app, these would come from an API
  const nearbyLocations: NearbyLocation[] = [
    {
      id: "1",
      name: "Downtown Area",
      distance: "2.1 km",
      aqi: 45,
      coordinates: [0, 0], // Will be updated with real coordinates
    },
    {
      id: "2",
      name: "City Park",
      distance: "3.8 km",
      aqi: 38,
      coordinates: [0, 0], // Will be updated with real coordinates
    },
    {
      id: "3",
      name: "Industrial District",
      distance: "4.2 km",
      aqi: 52,
      coordinates: [0, 0], // Will be updated with real coordinates
    },
    {
      id: "4",
      name: "Residential Area",
      distance: "5.1 km",
      aqi: 35,
      coordinates: [0, 0], // Will be updated with real coordinates
    },
  ];

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async (): Promise<void> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 5 * 60 * 1000 // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Get city name from coordinates using reverse geocoding
      const cityName = await getCityFromCoordinates(latitude, longitude);
      
      setUserLocation({
        latitude,
        longitude,
        city: cityName.city || 'Your Location',
        state: cityName.state || '',
        country: cityName.country || ''
      });

      // Fetch real air quality data
      await fetchAirQualityData(latitude, longitude);

      // Update nearby locations with real coordinates
      updateNearbyLocations(latitude, longitude);
      
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Failed to get your location. Please check your browser permissions.');
      toast({
        title: "Location Error",
        description: "Unable to get your current location. Please check browser permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAirQualityData = async (lat: number, lon: number): Promise<void> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
        body: { lat, lon }
      });

      if (error) {
        console.error('Error fetching air quality data:', error);
        return;
      }

      if (response) {
        console.log('MapView air quality data:', response);
        setAirQualityData({
          aqi: response.aqi,
          location: response.location,
          timestamp: response.timestamp
        });
      }
    } catch (err) {
      console.error('Error fetching air quality data:', err);
    }
  };

  const getCityFromCoordinates = async (lat: number, lon: number): Promise<{city: string, state: string, country: string}> => {
    try {
      // Use the actual API key
      const apiKey = '56ab74b487631610f9b44a6e51fe72f0';
      
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const location = data[0];
      
      return {
        city: location?.name || 'Your Location',
        state: location?.state || '',
        country: location?.country || ''
      };
    } catch (err) {
      console.error('Error getting city name:', err);
      // Fallback to coordinates if API fails
      return {
        city: `Your Location`,
        state: `(${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        country: ''
      };
    }
  };

  const updateNearbyLocations = (userLat: number, userLon: number): void => {
    // In a real app, you would fetch nearby monitoring stations from an API
    // For now, we'll create mock locations around the user's position
    const mockLocations = [
      { lat: userLat + 0.01, lon: userLon + 0.01, name: "Downtown Area" },
      { lat: userLat - 0.01, lon: userLon + 0.02, name: "City Park" },
      { lat: userLat + 0.02, lon: userLon - 0.01, name: "Industrial District" },
      { lat: userLat - 0.02, lon: userLon - 0.02, name: "Residential Area" },
    ];

    // Update the nearby locations with real coordinates
    mockLocations.forEach((loc, index) => {
      if (nearbyLocations[index]) {
        nearbyLocations[index].coordinates = [loc.lat, loc.lon];
        nearbyLocations[index].name = loc.name;
      }
    });
  };

  const getAQIColor = (aqi: number): string => {
    if (aqi <= 50) return "bg-green-500";
    if (aqi <= 100) return "bg-yellow-500";
    if (aqi <= 150) return "bg-orange-500";
    if (aqi <= 200) return "bg-red-500";
    if (aqi <= 300) return "bg-purple-500";
    return "bg-red-800";
  };

  const getAQILabel = (aqi: number): string => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading map and location data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Location Error</h3>
            <p className="text-muted-foreground max-w-sm">{error}</p>
            <Button onClick={getUserLocation} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div className="absolute top-2/3 left-1/4 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Current Location */}
      {userLocation && (
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
                <div className="font-medium">
                  {userLocation.city}
                  {userLocation.state && `, ${userLocation.state}`}
                  {userLocation.country && `, ${userLocation.country}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                </div>
              </div>
              <Badge 
                variant="secondary"
                className={`${getAQIColor(airQualityData?.aqi || 0)} text-white border-0`}
              >
                AQI {airQualityData?.aqi || 'Loading...'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nearby Stations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Nearby Monitoring Stations
        </h2>
        
        {nearbyLocations.map((location) => (
          <Card key={location.id} className="bg-card/50 border-border hover:bg-card transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getAQIColor(location.aqi)}`} />
                  <div>
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-muted-foreground">{location.distance}</div>
                  </div>
                </div>
                <Badge 
                  variant="secondary"
                  className={`${getAQIColor(location.aqi)} text-white border-0`}
                >
                  AQI {location.aqi}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}