import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Cloud, CloudRain, Thermometer, Droplets, Eye, RefreshCw, AlertTriangle, Wind, Gauge, Compass } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useWeatherData } from "@/hooks/useWeatherData";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  rainProbability: number;
  sunrise: string;
  sunset: string;
  weatherCode: number;
  description: string;
  windSpeed?: number;
  windDirection?: number;
  airPressure?: number;
  visibility?: number;
}

interface WeatherStatsCardProps {
  latitude: number;
  longitude: number;
}

export default function WeatherStatsCard({ latitude, longitude }: WeatherStatsCardProps): JSX.Element {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWeatherData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Validate coordinates before making API call
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      console.log('WeatherStatsCard: Fetching weather data for coordinates:', { latitude, longitude });

      const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
      if (!apiKey) {
        console.error('WeatherStatsCard: OpenWeatherMap API key not configured');
        throw new Error('OpenWeatherMap API key not configured');
      }

      console.log('WeatherStatsCard: API key configured, making request to OpenWeatherMap');
      console.log('WeatherStatsCard: API key length:', apiKey.length);
      console.log('WeatherStatsCard: API key starts with:', apiKey.substring(0, 4) + '...');

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      );

      console.log('WeatherStatsCard: API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        
        setWeatherData({
          temperature: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          rainProbability: data.pop ? data.pop * 100 : 0,
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          weatherCode: data.weather[0].id,
          description: data.weather[0].description,
          windSpeed: data.wind?.speed ? data.wind.speed * 3.6 : undefined, // Convert m/s to km/h
          windDirection: data.wind?.deg,
          airPressure: data.main.pressure,
          visibility: data.visibility ? data.visibility / 1000 : undefined // Convert m to km
        });
        
        setLastUpdated(new Date().toISOString());
        toast({
          title: "Weather Updated",
          description: "Successfully fetched current weather data",
        });
      } else {
        // Provide more specific error messages based on status code
        let errorMessage = `API request failed: ${response.status}`;
        if (response.status === 400) {
          errorMessage = 'Invalid coordinates or API key';
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key';
        } else if (response.status === 429) {
          errorMessage = 'API rate limit exceeded';
        } else if (response.status >= 500) {
          errorMessage = 'Weather service temporarily unavailable';
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError('Failed to fetch weather data');
      toast({
        title: "Weather Error",
        description: "Unable to fetch weather data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (weatherCode: number): JSX.Element => {
    // OpenWeatherMap weather condition codes
    if (weatherCode >= 200 && weatherCode < 300) return <CloudRain className="h-6 w-6 text-purple-500" />; // Thunderstorm
    if (weatherCode >= 300 && weatherCode < 400) return <CloudRain className="h-6 w-6 text-blue-500" />; // Drizzle
    if (weatherCode >= 500 && weatherCode < 600) return <CloudRain className="h-6 w-6 text-blue-600" />; // Rain
    if (weatherCode >= 600 && weatherCode < 700) return <Cloud className="h-6 w-6 text-gray-400" />; // Snow
    if (weatherCode >= 700 && weatherCode < 800) return <Cloud className="h-6 w-6 text-gray-600" />; // Atmosphere (fog, mist)
    if (weatherCode === 800) return <Sun className="h-6 w-6 text-yellow-500" />; // Clear
    if (weatherCode >= 801 && weatherCode < 900) return <Cloud className="h-6 w-6 text-gray-500" />; // Clouds
    
    return <Cloud className="h-6 w-6 text-gray-500" />; // Default
  };

  // Helper function to convert wind direction degrees to cardinal directions
  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp < 0) return 'text-blue-600';
    if (temp < 15) return 'text-green-600';
    if (temp < 25) return 'text-yellow-600';
    if (temp < 35) return 'text-orange-600';
    return 'text-red-600';
  };

  // Fetch weather data when coordinates change
  useEffect(() => {
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      fetchWeatherData();
    }
  }, [latitude, longitude]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return; // Don't set up auto-refresh if coordinates are invalid
    }

    const interval = setInterval(fetchWeatherData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  // Show message if coordinates are not available
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-blue-600" />
            Weather Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>Weather data unavailable</p>
            <p className="text-sm">Location coordinates not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Current Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading weather data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !weatherData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Current Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchWeatherData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Current Weather
          </CardTitle>
          <Button onClick={fetchWeatherData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {weatherData ? (
          <div className="space-y-4">
            {/* Main Weather Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getWeatherIcon(weatherData.weatherCode)}
                <div>
                  <div className={`text-3xl font-bold ${getTemperatureColor(weatherData.temperature)}`}>
                    {weatherData.temperature.toFixed(1)}°C
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Feels like {weatherData.feelsLike.toFixed(1)}°C
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="capitalize">
                  {weatherData.description}
                </Badge>
              </div>
            </div>

            {/* Weather Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Humidity</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {weatherData.humidity}%
                </div>
              </div>

              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CloudRain className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Rain Chance</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {weatherData.rainProbability.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Additional Weather Data */}
            {(weatherData.windSpeed || weatherData.airPressure || weatherData.visibility) && (
              <div className="grid grid-cols-2 gap-4">
                {weatherData.windSpeed && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Wind className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Wind</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-600">
                      {weatherData.windSpeed.toFixed(1)} km/h
                    </div>
                    {weatherData.windDirection && (
                      <div className="text-xs text-muted-foreground">
                        {weatherData.windDirection}° {getWindDirection(weatherData.windDirection)}
                      </div>
                    )}
                  </div>
                )}

                {weatherData.airPressure && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Pressure</span>
                    </div>
                    <div className="text-lg font-semibold text-purple-600">
                      {weatherData.airPressure} hPa
                    </div>
                  </div>
                )}

                {weatherData.visibility && (
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-medium">Visibility</span>
                    </div>
                    <div className="text-lg font-semibold text-indigo-600">
                      {weatherData.visibility.toFixed(1)} km
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sunrise/Sunset */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sun className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Sunrise</span>
                </div>
                <div className="text-lg font-semibold text-yellow-600">
                  {weatherData.sunrise}
                </div>
              </div>

              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sun className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Sunset</span>
                </div>
                <div className="text-lg font-semibold text-orange-600">
                  {weatherData.sunset}
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-xs text-muted-foreground pt-2">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No weather data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
