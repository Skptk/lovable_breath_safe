import { useState, useEffect, useMemo, useCallback } from "react";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Layers, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "./LeafletMap";
import Header from "@/components/Header";
import AQIDataCharts from "./AQIDataCharts";
import { useGlobalEnvironmentalData } from "@/hooks/useGlobalEnvironmentalData";
import type { GlobalEnvironmentalData } from "@/types";


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
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  location: string;
  timestamp: string;
}

interface MapViewProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function MapView({ showMobileMenu, onMobileMenuToggle }: MapViewProps = {}): JSX.Element {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [fallbackAirQualityData, setFallbackAirQualityData] = useState<AirQualityData | null>(null);
  const [hasFetchedFallback, setHasFetchedFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const globalDataOptions = useMemo(() => {
    const baseOptions = {
      autoRefresh: true,
      refreshInterval: 60_000,
      maxDistanceKm: 200,
    } as const;

    if (!userLocation) {
      return baseOptions;
    }

    const hasNamedCity = userLocation.city && userLocation.city.trim().length > 0 && userLocation.city !== 'Your Location';

    return {
      ...baseOptions,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      ...(hasNamedCity ? { cityName: userLocation.city } : {}),
    };
  }, [userLocation]);

  const {
    data: globalData,
    allCitiesData,
    isLoading: isGlobalLoading,
    error: globalDataError,
    refetch: refetchGlobalData,
  } = useGlobalEnvironmentalData(globalDataOptions);

  const mapGlobalDataToAirQuality = useCallback((data?: GlobalEnvironmentalData | null): AirQualityData | null => {
    if (!data) return null;

    return {
      aqi: data.aqi ?? 0,
      pm25: data.pm25 ?? undefined,
      pm10: data.pm10 ?? undefined,
      no2: data.no2 ?? undefined,
      so2: data.so2 ?? undefined,
      co: data.co ?? undefined,
      o3: data.o3 ?? undefined,
      location: data.city_name,
      timestamp: data.collection_timestamp,
    };
  }, []);

  const serverAirQualityData = useMemo(() => {
    if (globalData && !Array.isArray(globalData)) {
      return mapGlobalDataToAirQuality(globalData);
    }

    if (allCitiesData.length > 0) {
      if (userLocation?.city) {
        const cityMatch = allCitiesData.find((item) =>
          item.city_name.toLowerCase() === userLocation.city.toLowerCase()
        );
        if (cityMatch) {
          return mapGlobalDataToAirQuality(cityMatch);
        }
      }

      return mapGlobalDataToAirQuality(allCitiesData[0]);
    }

    return null;
  }, [allCitiesData, globalData, mapGlobalDataToAirQuality, userLocation?.city]);

  const activeAirQualityData = useMemo(
    () => serverAirQualityData ?? fallbackAirQualityData,
    [serverAirQualityData, fallbackAirQualityData]
  );

  // Fetch air quality data when user location is available (fallback path)
  const fetchAirQualityData = useCallback(async (lat: number, lon: number): Promise<void> => {
    setHasFetchedFallback(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('fetchAQI', {
        body: { lat, lon }
      });

      if (error) {
        console.error('Error fetching fallback air quality data:', error);
        setError('Failed to fetch air quality data');
        return;
      }

      const resolved = response?.data ?? response;

      if (resolved) {
        setFallbackAirQualityData({
          aqi: resolved.aqi || 0,
          pm25: resolved.pollutants?.pm25 ?? undefined,
          pm10: resolved.pollutants?.pm10 ?? undefined,
          no2: resolved.pollutants?.no2 ?? undefined,
          so2: resolved.pollutants?.so2 ?? undefined,
          co: resolved.pollutants?.co ?? undefined,
          o3: resolved.pollutants?.o3 ?? undefined,
          location: resolved.city || resolved.stationName || resolved.location || 'Your Location',
          timestamp: resolved.timestamp || new Date().toISOString()
        });
        setError(null);
      } else {
        console.warn('fetchAQI returned no data to use as fallback');
        setFallbackAirQualityData(null);
        setHasFetchedFallback(false);
      }
    } catch (err) {
      console.error('Error fetching fallback air quality data:', err);
      setError('Failed to fetch air quality data');
      setHasFetchedFallback(false);
    }
  }, []);

  useEffect(() => {
    if (serverAirQualityData) {
      setFallbackAirQualityData(null);
      setHasFetchedFallback(false);
    }
  }, [serverAirQualityData]);

  useEffect(() => {
    if (!userLocation) return;

    const interval = setInterval(() => {
      refetchGlobalData();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [userLocation, refetchGlobalData]);

  useEffect(() => {
    if (!userLocation) return;
    if (serverAirQualityData || isGlobalLoading || hasFetchedFallback) {
      return;
    }

    fetchAirQualityData(userLocation.latitude, userLocation.longitude);
  }, [userLocation, serverAirQualityData, isGlobalLoading, hasFetchedFallback, fetchAirQualityData]);

  useEffect(() => {
    if (globalDataError) {
      console.warn('MapView: Error fetching server environmental data', globalDataError);
    }
  }, [globalDataError]);

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

      // Update nearby locations with real coordinates
      updateNearbyLocations(latitude, longitude);

      // Reset fallback state so hook data becomes primary when available
      setFallbackAirQualityData(null);
      setHasFetchedFallback(false);

      // Trigger a refetch of server-side environmental data
      await refetchGlobalData();

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
          // After 3 retries, show error instead of demo data
          console.log('MapView: All retry attempts failed, showing error');
          setError('Location services are not available after multiple attempts. Please try again later.');
          
          // No demo data - show error instead
          setError('Location services are not available. Please try again later.');
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



  const getCityFromCoordinates = async (lat: number, lon: number): Promise<{city: string, state: string, country: string}> => {
    try {
      // Use environment variable for API key
      const apiKey = import.meta.env['VITE_OPENWEATHERMAP_API_KEY'];
      
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
    // TODO: In a real app, you would fetch nearby monitoring stations from an API
    // For now, we'll use the user's actual coordinates
    if (hasFetchedFallback) return;
    const primaryLocation = nearbyLocations.at(0);
    if (!primaryLocation) return;
    primaryLocation.coordinates = [userLat, userLon];
    primaryLocation.name = "Your Location";
  };

  const resetLocationPermission = () => {
    localStorage.removeItem('breath-safe-location-permission');
    setRetryCount(0);
    setError(null);
    setUserLocation(null);
    setFallbackAirQualityData(null);
    setHasFetchedFallback(false);
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

    return undefined;
  }, [error, retryCount, getUserLocation, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Header
          title="Air Quality Map"
          subtitle="Explore air quality data across your region"
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
          title="Air Quality Map"
          subtitle="Explore air quality data across your region"
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
          title="Air Quality Map"
          subtitle="Explore air quality data across your region"
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
        title="Air Quality Map"
        subtitle="Explore air quality data across your region"
        showMobileMenu={showMobileMenu}
        onMobileMenuToggle={onMobileMenuToggle}
      />

      {/* Map Container */}
      <div className="relative h-[calc(100vh-200px)] min-h-[600px]">
        {/* Leaflet Map Integration - Full width/height */}
        <div className="w-full h-full rounded-lg overflow-hidden border border-border">
          <LeafletMap 
            userLocation={userLocation}
            airQualityData={activeAirQualityData}
            nearbyLocations={nearbyLocations}
          />
        </div>

        {/* Floating Header */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <GlassCard className="floating-card">
            <GlassCardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-foreground">
                    Air Quality Map
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {userLocation ? `${userLocation.city}, ${userLocation.country}` : 'Loading location...'}
                  </p>

                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Layers
                </Button>
              </div>
            </GlassCardContent>
          </GlassCard>
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
                    className={`${getAQIColor(activeAirQualityData?.aqi || 0)} text-white border-0`}
                  >
                    AQI {activeAirQualityData?.aqi || 'Loading...'}
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
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
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

      {/* AQI Data Charts Section */}
      {activeAirQualityData ? (
        <div className="mt-8">
          <AQIDataCharts
            aqi={activeAirQualityData.aqi}
            pm25={activeAirQualityData.pm25 || 0}
            pm10={activeAirQualityData.pm10 || 0}
            no2={activeAirQualityData.no2 || 0}
            so2={activeAirQualityData.so2 || 0}
            co={activeAirQualityData.co || 0}
            o3={activeAirQualityData.o3 || 0}
            timestamp={activeAirQualityData.timestamp}
          />
        </div>
      ) : (
        // Show loading state instead of demo data to prevent data contamination
        <div className="mt-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading air quality data...</p>
            <p className="text-sm text-muted-foreground mt-2">Please ensure location permissions are enabled</p>
          </div>
        </div>
      )}
    </div>
  );
}