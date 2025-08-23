import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Layers, Loader2, AlertTriangle, Wind, Cloud, Sun, CloudRain, Thermometer, Droplets, Eye, Gauge, Compass } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "./LeafletMap";
import Header from "@/components/Header";
import WindDashboard from "./WindDashboard";
import WeatherForecast from "./WeatherForecast";


import { useWeatherData } from "@/hooks/useWeatherData";




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

interface WeatherStatsProps {
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

export default function WeatherStats({ showMobileMenu, onMobileMenuToggle }: WeatherStatsProps = {}): JSX.Element {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false); // Prevent multiple simultaneous requests
  const [retryCount, setRetryCount] = useState(0);

  const { toast } = useToast();

  // Weather data hook integration
  const weatherData = useWeatherData({
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
    autoRefresh: true,
    refreshInterval: 900000 // 15 minutes
  });

  // Debug logging for weather data hook
  useEffect(() => {
    console.log('WeatherStats: userLocation changed:', userLocation);
    console.log('WeatherStats: weatherData state:', {
      loading: weatherData.loading,
      error: weatherData.error,
      currentWeather: weatherData.currentWeather
    });
  }, [userLocation, weatherData.loading, weatherData.error, weatherData.currentWeather]);

  // Trigger weather data fetch when user location becomes available
  useEffect(() => {
    if (userLocation?.latitude && userLocation?.longitude && !weatherData.currentWeather && !weatherData.loading) {
      console.log('WeatherStats: Triggering manual weather data fetch for coordinates:', userLocation.latitude, userLocation.longitude);
      weatherData.refetch();
    }
  }, [userLocation, weatherData.currentWeather, weatherData.loading, weatherData.refetch]);

  // Check for existing location permissions on component mount
  useEffect(() => {
    const checkExistingLocationPermission = async () => {
      console.log('WeatherStats: Checking for existing location permissions...');
      
      // Check if we have stored permission in localStorage (persistent across sessions)
      const storedPermission = localStorage.getItem('breath-safe-location-permission');
      console.log('WeatherStats: Stored permission:', storedPermission);
      
      // Check if we have session-based permission (current browsing session)
      const sessionPermission = sessionStorage.getItem('breath-safe-session-location-permission');
      console.log('WeatherStats: Session permission:', sessionPermission);
      
      if (storedPermission === 'granted' || sessionPermission === 'granted') {
        console.log('WeatherStats: Found existing permission, checking browser permission...');
        // Check if browser still has permission
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            console.log('WeatherStats: Browser permission status:', permissionStatus.state);
            if (permissionStatus.state === 'granted') {
              // User has permission, automatically get location
              console.log('WeatherStats: User has existing location permission, automatically getting location');
              setLocationRequested(true);
              getUserLocation();
              return;
            } else if (permissionStatus.state === 'denied') {
              // Permission was revoked, clear stored permissions
              localStorage.removeItem('breath-safe-location-permission');
              sessionStorage.removeItem('breath-safe-session-location-permission');
              console.log('WeatherStats: Location permission revoked by user');
            }
          } catch (error) {
            console.log('Permission API not supported, using stored permission');
            // If permission API not supported, trust stored permission
            setLocationRequested(true);
            getUserLocation();
            return;
          }
        } else {
          // Permission API not supported, trust stored permission
          console.log('WeatherStats: Permission API not supported, trusting stored permission');
          setLocationRequested(true);
          getUserLocation();
          return;
        }
      }
      
      // No stored permission or permission was revoked
      console.log('WeatherStats: No existing location permission found');
    };

    checkExistingLocationPermission();
  }, []);

  // Cleanup session storage on unmount if user hasn't explicitly granted permission
  useEffect(() => {
    return () => {
      // Only clear session storage if user hasn't explicitly granted permission
      // This prevents clearing during normal navigation when user has granted permission
      const hasExplicitPermission = localStorage.getItem('breath-safe-location-permission') === 'granted';
      if (!hasExplicitPermission) {
        sessionStorage.removeItem('breath-safe-session-location-permission');
      }
    };
  }, []);

  // Helper function to convert wind direction degrees to cardinal directions
  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };



  const getUserLocation = async (): Promise<void> => {
    console.log('WeatherStats: getUserLocation called - checking permissions first');
    
    // Check if we already have location data and permission
    const storedPermission = localStorage.getItem('breath-safe-location-permission');
    const sessionPermission = sessionStorage.getItem('breath-safe-session-location-permission');
    
    if ((storedPermission === 'granted' || sessionPermission === 'granted') && userLocation) {
      console.log('WeatherStats: User already has location and permission, skipping request');
      return;
    }
    
    // Prevent multiple simultaneous location requests
    if (isRequestingLocation) {
      console.log('WeatherStats: Location request already in progress, skipping duplicate request');
      return;
    }
    
    setLoading(true);
    setLocationRequested(true);
    setError(null);
    setIsRequestingLocation(true);
    
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
      console.log('WeatherStats: Starting geolocation request...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 30000, // 30 seconds - mobile devices need more time
          enableHighAccuracy: false, // Disable high accuracy for mobile compatibility
          maximumAge: 10 * 60 * 1000 // Allow 10-minute old data for mobile
        });
      });

              console.log('WeatherStats: Geolocation successful, coordinates:', position.coords.latitude, position.coords.longitude);
      const { latitude, longitude } = position.coords;
      
      // Store location permission in localStorage for persistent storage and sessionStorage for current session
      localStorage.setItem('breath-safe-location-permission', 'granted');
      sessionStorage.setItem('breath-safe-session-location-permission', 'granted');
      console.log('WeatherStats: Location permission stored for session persistence');
      
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


      
    } catch (err: any) {
      // Reduce console noise for location errors
      if (err.code === 1) {
        console.log('Location permission denied by user');
      } else {
        console.error('Error getting location:', err);
      }
      
      let errorMessage = 'Failed to get your location.';
      
      if (err.code === 1) {
        errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
        // Store denied permission to avoid repeated prompts
        localStorage.setItem('breath-safe-location-permission', 'denied');
        sessionStorage.setItem('breath-safe-session-location-permission', 'denied');
        console.log('WeatherStats: Location permission denied and stored');
      } else if (err.code === 2) {
        errorMessage = 'Location unavailable. This usually happens on new accounts or when location services are not ready. Please try again in a few moments.';
      } else if (err.code === 3) {
        errorMessage = 'Location timeout. Please wait a moment and try again.';
      }
      
      setError(errorMessage);
      
      // For new users or location unavailable, provide fallback location
      if (err.code === 2) {
        console.log('WeatherStats: Providing fallback location for new user, retry count:', retryCount);
        
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
                      console.log(`WeatherStats: Retry attempt ${attemptNumber}/3 for new user geolocation`);
        } else {
          // After 3 retries, show error instead of demo data
          console.log('WeatherStats: All retry attempts failed, showing error');
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
      setIsRequestingLocation(false); // Reset the requesting state
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
    sessionStorage.removeItem('breath-safe-session-location-permission');
    setRetryCount(0);
    setError(null);
    setUserLocation(null);
    setAirQualityData(null);
    setLocationRequested(false);
  };

  // Check if user has already granted location permission in this session
  const hasLocationPermission = (): boolean => {
    const storedPermission = localStorage.getItem('breath-safe-location-permission');
    const sessionPermission = sessionStorage.getItem('breath-safe-session-location-permission');
    return storedPermission === 'granted' || sessionPermission === 'granted';
  };

  // Auto-retry geolocation for new users after a delay
  useEffect(() => {
    if (error && retryCount > 0 && retryCount < 3 && !userLocation) {
      const timer = setTimeout(() => {
        console.log(`WeatherStats: Auto-retrying geolocation for new user (attempt ${retryCount + 1}/3)...`);
        
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
  }, [error, retryCount, userLocation]);

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

  if (!userLocation && !loading) {
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
            <h3 className="text-lg font-semibold">
              {hasLocationPermission() ? 'Location Services Ready' : 'Enable Location Services'}
            </h3>
            <p className="text-muted-foreground">
              {hasLocationPermission() 
                ? 'Your location permission is already enabled. Click below to view the map with your current location.'
                : 'Allow location access to view air quality data and nearby monitoring stations on the map.'
              }
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
              {hasLocationPermission() ? 'View Map with Location' : 'Enable Location & View Map'}
            </Button>
            
            {hasLocationPermission() && (
              <Button 
                onClick={resetLocationPermission} 
                variant="outline" 
                className="w-full"
              >
                Reset Location Permission
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error && !userLocation) {
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
            {weatherData.currentWeather?.weatherCondition === 'Rain' ? (
              <CloudRain className="h-4 w-4 text-muted-foreground" />
            ) : weatherData.currentWeather?.weatherCondition === 'Clouds' ? (
              <Cloud className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {weatherData.loading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : weatherData.currentWeather ? (
              <>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Thermometer className="h-6 w-6 text-orange-500" />
                  {weatherData.currentWeather.temperature}°C
                </div>
                <div className="text-sm text-muted-foreground space-y-1 mt-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-3 w-3 text-blue-500" />
                    Humidity: {weatherData.currentWeather.humidity}%
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wind className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <span>Wind Speed</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                    {weatherData.currentWeather.windSpeed} km/h
                  </div>
                  {weatherData.currentWeather.feelsLikeTemperature && (
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3 text-purple-500" />
                      Feels like: {weatherData.currentWeather.feelsLikeTemperature}°C
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">No Data</div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {weatherData.currentWeather?.timestamp ? 
                `Updated: ${new Date(weatherData.currentWeather.timestamp).toLocaleTimeString()}` : 
                'Weather data unavailable'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Weather Data */}
      {userLocation && weatherData.currentWeather && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature & Feels Like */}
          <Card className="floating-card bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {weatherData.currentWeather.temperature}°C
              </div>
              <p className="text-xs text-muted-foreground">
                Feels like {weatherData.currentWeather.feelsLikeTemperature || weatherData.currentWeather.temperature}°C
              </p>
            </CardContent>
          </Card>

          {/* Humidity & Pressure */}
          <Card className="floating-card bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Humidity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {weatherData.currentWeather.humidity}%
              </div>
              <p className="text-xs text-muted-foreground">
                Dew point {weatherData.currentWeather.airPressure || 'N/A'} hPa
              </p>
            </CardContent>
          </Card>

          {/* Wind Information */}
          <Card className="floating-card bg-gradient-to-br from-slate-50 to-slate-50 dark:from-slate-950/30 dark:to-slate-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wind className="h-4 w-4" />
                Wind
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {weatherData.currentWeather.windSpeed} km/h
              </div>
              <div className="text-sm text-muted-foreground">
                {weatherData.currentWeather.windDirection}° {getWindDirection(weatherData.currentWeather.windDirection)}
              </div>
            </CardContent>
          </Card>

          {/* Visibility & UV */}
          <Card className="floating-card bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {weatherData.currentWeather.visibility || 'N/A'} km
              </div>
              <p className="text-xs text-muted-foreground">
                UV index {weatherData.currentWeather.uvIndex || 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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



      {/* Map Container - Google Maps Style */}
      <Card className="floating-card relative h-[calc(100vh-200px)] min-h-[600px] shadow-card overflow-hidden">
        <CardContent className="p-0 h-full relative">
          {/* Map Header - Fixed at top */}
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-md border-b border-border/50">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-foreground">
                      Weather & Air Quality Map
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {userLocation ? `${userLocation.city}, ${userLocation.state}, ${userLocation.country}` : 'Loading location...'}
                    </p>
                  </div>
                  {airQualityData && (
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary"
                        className={`${getAQIColor(airQualityData.aqi)} text-white border-0 px-3 py-1 text-sm font-semibold`}
                      >
                        AQI {airQualityData.aqi}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Last updated: {airQualityData.timestamp}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Layers className="h-4 w-4" />
                    Map Layers
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <MapPin className="h-4 w-4" />
                    My Location
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Leaflet Map Integration - Full width/height within card */}
          <div className="w-full h-full pt-20">
            <LeafletMap
              userLocation={userLocation}
              airQualityData={airQualityData}
            />
          </div>
        </CardContent>
      </Card>

      {/* Information Grid Beneath Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Location Information Card */}
        {userLocation && (
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <MapPin className="h-4 w-4 text-primary mr-2" />
              <CardTitle className="text-sm font-medium">Location Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">City:</span>
                  <span className="text-sm font-medium">{userLocation.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">State:</span>
                  <span className="text-sm font-medium">{userLocation.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Country:</span>
                  <span className="text-sm font-medium">{userLocation.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coordinates:</span>
                  <span className="text-sm font-medium">
                    {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weather Summary Card */}
        {weatherData.currentWeather && (
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Cloud className="h-4 w-4 text-blue-500 mr-2" />
              <CardTitle className="text-sm font-medium">Weather Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-3 w-3 text-red-500" />
                  <span className="text-muted-foreground">Temp:</span>
                  <span className="font-medium">{weatherData.currentWeather.temperature}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">Humidity:</span>
                  <span className="font-medium">{weatherData.currentWeather.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">Wind:</span>
                  <span className="font-medium">{weatherData.currentWeather.windSpeed} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-3 w-3 text-purple-500" />
                  <span className="text-muted-foreground">Visibility:</span>
                  <span className="font-medium">{weatherData.currentWeather.visibility || 'N/A'} km</span>
                </div>
              </div>
              {weatherData.currentWeather.feelsLikeTemperature && (
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="h-3 w-3 text-orange-500" />
                  <span className="text-muted-foreground">Feels like:</span>
                  <span className="font-medium">{weatherData.currentWeather.feelsLikeTemperature}°C</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Map Legend Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Layers className="h-4 w-4 text-muted-foreground mr-2" />
            <CardTitle className="text-sm font-medium">Map Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-muted-foreground">Your Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Good Air Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-muted-foreground">Moderate Air Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-muted-foreground">Poor Air Quality</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}