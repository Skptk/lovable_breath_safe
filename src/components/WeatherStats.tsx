import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Layers, Loader2, AlertTriangle, Wind, Cloud, Sun, CloudRain } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "./LeafletMap";
import Header from "@/components/Header";
import WindDashboard from "./WindDashboard";
import WeatherForecast from "./WeatherForecast";
import EmissionSourcesLayer from "./EmissionSourcesLayer";


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

interface MapViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function WeatherStats({ showMobileMenu, onMobileMenuToggle }: WeatherStatsProps = {}): JSX.Element {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showEmissionLayer, setShowEmissionLayer] = useState(false);
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

  const getUserLocation = async (): Promise<void> => {
    setLoading(true);
    setLocationRequested(true);
    setError(null);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Check if we have permission to access location
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'denied') {
          setError('Location access denied. Please enable location permissions in your browser settings.');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('Permission API not supported, proceeding with geolocation request');
      }
    }

    try {
      console.log('MapView: Starting geolocation request...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000, // 30 seconds - mobile devices need more time
          enableHighAccuracy: false, // Disable high accuracy for mobile compatibility
          maximumAge: 10 * 60 * 1000 // Allow 10-minute old data for mobile
        });
      });

      console.log('MapView: Geolocation successful, coordinates:', position.coords.latitude, position.coords.longitude);
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
      
    } catch (err: any) {
      console.error('Error getting location:', err);
      
      let errorMessage = 'Failed to get your location.';
      
      if (err.code === 1) {
        errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
      } else if (err.code === 2) {
        errorMessage = 'Location unavailable. This usually happens on new accounts or when location services are not ready. Please try again in a few moments.';
      } else if (err.code === 3) {
        errorMessage = 'Location timeout. Please wait a moment and try again.';
      }
      
      setError(errorMessage);
      
      // For new users or location unavailable, provide fallback location
      if (err.code === 2) {
        console.log('MapView: Providing fallback location for new user, retry count:', retryCount);
        
        if (retryCount < 3) {
          // Increment retry count and show retry message
          setRetryCount(prev => prev + 1);
          
          // Show user-friendly retry message
          const attemptNumber = retryCount + 1;
          toast({
            title: "Setting Up Location Services",
            description: `Attempt ${attemptNumber}/3: Configuring location services for your account. This may take a moment.`,
            variant: "default",
          });
          
          // Log retry attempt for debugging
          console.log(`MapView: Retry attempt ${attemptNumber}/3 for new user geolocation`);
        } else {
          // After 3 retries, provide a demo location for new users
          console.log('MapView: Providing demo location after 3 failed attempts');
          const demoLocation = {
            latitude: -1.2921, // Nairobi coordinates as demo
            longitude: 36.8219,
            city: 'Demo Location',
            state: 'Nairobi, Kenya',
            country: 'Kenya'
          };
          setUserLocation(demoLocation);
          
          // Set demo air quality data
          setAirQualityData({
            aqi: 45,
            location: 'Demo Location',
            timestamp: new Date().toISOString()
          });
          
          toast({
            title: "Demo Mode Activated",
            description: "Showing demo data while location services are being configured. You can try again later.",
            variant: "default",
          });
          
          // Clear the error since we're now in demo mode
          setError(null);
        }
      } else {
        toast({
          title: "Location Access Required",
          description: "This app needs your location to show air quality data. Please allow location access when prompted.",
          variant: "destructive",
        });
      }
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
      // Use environment variable for API key
      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
      
      // If no API key is available, skip the API call and use coordinates
      if (!apiKey || apiKey.trim() === '') {
        console.warn('OpenWeatherMap API key not configured, using coordinates as fallback');
        return {
          city: `Location`,
          state: `(${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          country: ''
        };
      }
      
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

  const resetLocationPermission = () => {
    localStorage.removeItem('breath-safe-location-permission');
    setRetryCount(0);
    setError(null);
    setUserLocation(null);
    setAirQualityData(null);
    setLocationRequested(false);
  };

  // Auto-retry geolocation for new users after a delay
  useEffect(() => {
    if (error && retryCount > 0 && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`MapView: Auto-retrying geolocation for new user (attempt ${retryCount + 1}/3)...`);
        
        // Show user feedback about the auto-retry
        toast({
          title: "Retrying Location Services",
          description: `Automatically retrying to get your location... (${retryCount + 1}/3)`,
          variant: "default",
        });
        
        getUserLocation();
      }, 2000); // Wait 2 seconds before retry
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Weather & Air Quality Stats"
          subtitle="Comprehensive environmental monitoring"
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Getting your location...</p>
            <p className="text-xs text-muted-foreground">Please allow location access when prompted</p>
          </div>
        </div>
      </div>
    );
  }

  if (!locationRequested && !userLocation) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Weather & Air Quality Stats"
          subtitle="Comprehensive environmental monitoring"
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <MapPin className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Enable Location Services</h3>
            <p className="text-muted-foreground">
              Allow location access to view air quality data and nearby monitoring stations on the map.
            </p>
            
            <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
              <p><strong>What we'll show you:</strong></p>
              <ul className="text-left list-disc list-inside space-y-1">
                <li>Your current location on the map</li>
                <li>Nearby air quality monitoring stations</li>
                <li>Real-time air quality data for your area</li>
                <li>Interactive map with detailed station information</li>
              </ul>
            </div>
            
            <Button onClick={getUserLocation} className="w-full" size="lg">
              <MapPin className="h-4 w-4 mr-2" />
              Enable Location & View Map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Weather & Air Quality Stats"
          subtitle="Comprehensive environmental monitoring"
          showMobileMenu={showMobileMenu}
          onMobileMenuToggle={onMobileMenuToggle}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Location Access Required</h3>
            <p className="text-muted-foreground max-w-sm">{error}</p>
            
            <div className="text-sm text-muted-foreground space-y-2 p-4 bg-muted/50 rounded-lg">
              <p><strong>How to enable location access:</strong></p>
              <ol className="text-left list-decimal list-inside space-y-1">
                <li>Allow location access when prompted</li>
                <li>Check browser settings if no prompt appears</li>
                <li>On mobile: Settings → Privacy → Location Services</li>
                <li>Refresh the page after enabling location</li>
              </ol>
            </div>
            
            <div className="flex flex-col gap-2">
              {retryCount > 0 && retryCount < 3 && (
                <div className="text-xs text-muted-foreground text-center p-2 bg-muted/30 rounded">
                  Attempt {retryCount}/3 - Auto-retrying in a few seconds...
                </div>
              )}
              {retryCount >= 3 && (
                <div className="text-xs text-muted-foreground text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
                  Demo mode active - showing sample data
                </div>
              )}
              <Button onClick={getUserLocation} variant="outline" className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Try Again Now
              </Button>
              <Button 
                onClick={resetLocationPermission} 
                variant="secondary"
                className="w-full"
              >
                Start Fresh
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="secondary"
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Weather & Air Quality Stats"
        subtitle="Comprehensive environmental monitoring"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      {/* Weather Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Air Quality Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Air Quality Index</CardTitle>
            <Badge variant={airQualityData?.aqi && airQualityData.aqi <= 50 ? "default" : "destructive"}>
              {airQualityData?.aqi || 'N/A'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {airQualityData?.aqi ? (
                airQualityData.aqi <= 50 ? 'Good' :
                airQualityData.aqi <= 100 ? 'Moderate' :
                airQualityData.aqi <= 150 ? 'Unhealthy for Sensitive Groups' :
                airQualityData.aqi <= 200 ? 'Unhealthy' :
                airQualityData.aqi <= 300 ? 'Very Unhealthy' : 'Hazardous'
              ) : 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              {airQualityData?.location} • {airQualityData?.timestamp ? new Date(airQualityData.timestamp).toLocaleString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userLocation?.city || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground">
              {userLocation?.state && `${userLocation.state}, `}{userLocation?.country}
            </p>
            <p className="text-xs text-muted-foreground">
              {userLocation?.latitude?.toFixed(4)}, {userLocation?.longitude?.toFixed(4)}
            </p>
          </CardContent>
        </Card>

        {/* Weather Conditions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weather Conditions</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Loading...</div>
            <p className="text-xs text-muted-foreground">
              Weather data will appear here
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wind Dashboard */}
      {userLocation && (
        <WindDashboard 
          latitude={userLocation.latitude} 
          longitude={userLocation.longitude} 
        />
      )}

      {/* Weather Forecast */}
      {userLocation && (
        <WeatherForecast 
          latitude={userLocation.latitude} 
          longitude={userLocation.longitude} 
        />
      )}

      {/* Map Container */}
      <div className="relative h-[calc(100vh-200px)] min-h-[600px]">
        {/* Leaflet Map Integration - Full width/height */}
        <div className="w-full h-full rounded-lg overflow-hidden border border-border">
          <LeafletMap 
            userLocation={userLocation}
            airQualityData={airQualityData}
            nearbyLocations={nearbyLocations}
            showEmissionLayer={showEmissionLayer}
          />
        </div>
        
        {showEmissionLayer && (
          <EmissionSourcesLayer 
            latitude={userLocation.latitude} 
            longitude={userLocation.longitude} 
          />
        )}

        {/* Floating Header */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <Card className="bg-card/90 backdrop-blur-sm border-border shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    Weather & Air Quality Stats
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {userLocation ? `${userLocation.city}, ${userLocation.country}` : 'Loading location...'}
                  </p>
                  {userLocation?.city === 'Demo Location' && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Demo mode - <button 
                        onClick={getUserLocation}
                        className="underline hover:no-underline"
                      >
                        Try real location
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showEmissionLayer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowEmissionLayer(!showEmissionLayer)}
                    className="gap-2"
                  >
                    <Cloud className="h-4 w-4" />
                    {showEmissionLayer ? 'Hide' : 'Show'} Emissions
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Layers className="h-4 w-4" />
                    Layers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Sheet for Stations */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="bg-card/95 backdrop-blur-sm border-t border-border rounded-t-2xl shadow-2xl">
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
            </div>
            
            {/* Current Location Summary */}
            {userLocation && (
              <div className="px-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Navigation className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium text-sm">
                        {userLocation.city}
                        {userLocation.state && `, ${userLocation.state}`}
                        {userLocation.country && `, ${userLocation.country}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`${getAQIColor(airQualityData?.aqi || 0)} text-white border-0`}
                  >
                    AQI {airQualityData?.aqi || 'Loading...'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Stations List */}
            <div className="px-4 py-3 max-h-64 overflow-y-auto">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Nearby Monitoring Stations
              </h3>
              
              <div className="space-y-2">
                {nearbyLocations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getAQIColor(location.aqi)}`} />
                      <div>
                        <div className="font-medium text-sm">{location.name}</div>
                        <div className="text-xs text-muted-foreground">{location.distance}</div>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`${getAQIColor(location.aqi)} text-white border-0 text-xs`}
                    >
                      AQI {location.aqi}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}