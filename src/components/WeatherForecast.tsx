import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Cloud, Sun, CloudRain, Thermometer, Droplets, Eye, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ForecastData {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

interface WeatherForecastProps {
  latitude: number;
  longitude: number;
}

export default function WeatherForecast({ latitude, longitude }: WeatherForecastProps): JSX.Element {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchForecastData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,wind_speed_10m_max,weather_code&timezone=auto`
      );

      if (response.ok) {
        const data = await response.json();
        const daily = data.daily;
        
        const forecast: ForecastData[] = daily.time.map((date: string, index: number) => ({
          date,
          maxTemp: daily.temperature_2m_max[index],
          minTemp: daily.temperature_2m_min[index],
          precipitation: daily.precipitation_sum[index],
          humidity: daily.relative_humidity_2m_max[index],
          windSpeed: daily.wind_speed_10m_max[index],
          weatherCode: daily.weather_code[index]
        }));

        setForecastData(forecast);
        setLastUpdated(new Date().toISOString());
        toast({
          title: "Forecast Updated",
          description: "Successfully fetched weather forecast data",
        });
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      setError('Failed to fetch weather forecast data');
      toast({
        title: "Forecast Error",
        description: "Unable to fetch weather forecast. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Weather icon mapping function
  const getWeatherIcon = (weatherCode: number) => {
    if (weatherCode >= 1 && weatherCode <= 3) return <Cloud className="h-6 w-6 text-slate-500" />; // Partly cloudy
    if (weatherCode >= 45 && weatherCode <= 48) return <Cloud className="h-6 w-6 text-slate-600" />; // Foggy
    if (weatherCode >= 51 && weatherCode <= 55) return <CloudRain className="h-6 w-6 text-blue-500" />; // Drizzle
    if (weatherCode >= 61 && weatherCode <= 65) return <CloudRain className="h-6 w-6 text-blue-600" />; // Rain
    if (weatherCode >= 71 && weatherCode <= 77) return <Cloud className="h-6 w-6 text-blue-400" />; // Snow
    if (weatherCode >= 80 && weatherCode <= 82) return <CloudRain className="h-6 w-6 text-blue-500" />; // Rain showers
    if (weatherCode >= 85 && weatherCode <= 86) return <Cloud className="h-6 w-6 text-blue-400" />; // Snow showers
    if (weatherCode === 95) return <Cloud className="h-6 w-6 text-purple-500" />; // Thunderstorm
    return <Cloud className="h-6 w-6 text-slate-500" />; // Default
  };

  const getWeatherDescription = (weatherCode: number): string => {
    if (weatherCode === 0) return 'Clear sky';
    if (weatherCode >= 1 && weatherCode <= 3) return 'Partly cloudy';
    if (weatherCode >= 45 && weatherCode <= 48) return 'Foggy';
    if (weatherCode >= 51 && weatherCode <= 67) return 'Rainy';
    if (weatherCode >= 71 && weatherCode <= 77) return 'Snowy';
    if (weatherCode >= 80 && weatherCode <= 82) return 'Rain showers';
    if (weatherCode >= 85 && weatherCode <= 86) return 'Snow showers';
    if (weatherCode >= 95 && weatherCode <= 99) return 'Thunderstorm';
    
    return 'Unknown';
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp < 0) return 'text-blue-600';
    if (temp < 15) return 'text-green-600';
    if (temp < 25) return 'text-yellow-600';
    if (temp < 35) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPrecipitationColor = (precip: number): string => {
    if (precip === 0) return 'text-green-600';
    if (precip < 5) return 'text-yellow-600';
    if (precip < 20) return 'text-orange-600';
    return 'text-red-600';
  };

  useEffect(() => {
    fetchForecastData();
    
    // Refresh every hour
    const interval = setInterval(fetchForecastData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  if (loading && forecastData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading forecast data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && forecastData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchForecastData} variant="outline">
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
            <Calendar className="h-5 w-5" />
            Weather Forecast
          </CardTitle>
          <Button onClick={fetchForecastData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {forecastData.length > 0 ? (
          <div className="space-y-4">
            {/* 7-Day Forecast Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {forecastData.slice(0, 7).map((day, index) => (
                <div key={day.date} className="p-3 bg-muted/30 rounded-lg text-center">
                  {/* Date */}
                  <div className="text-sm font-medium mb-2">
                    {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  
                  {/* Weather Icon */}
                  <div className="flex justify-center mb-2">
                    {getWeatherIcon(day.weatherCode)}
                  </div>
                  
                  {/* Temperature Range */}
                  <div className="space-y-1 mb-2">
                    <div className={`text-lg font-bold ${getTemperatureColor(day.maxTemp)}`}>
                      {day.maxTemp.toFixed(0)}°
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {day.minTemp.toFixed(0)}°
                    </div>
                  </div>
                  
                  {/* Precipitation */}
                  <div className="text-xs text-muted-foreground mb-1">
                    <Droplets className="h-3 w-3 inline mr-1" />
                    {day.precipitation.toFixed(1)}mm
                  </div>
                  
                  {/* Humidity */}
                  <div className="text-xs text-muted-foreground mb-1">
                    <Eye className="h-3 w-3 inline mr-1" />
                    {day.humidity}%
                  </div>
                  
                  {/* Wind */}
                  <div className="text-xs text-muted-foreground">
                    <Thermometer className="h-3 w-3 inline mr-1" />
                    {day.windSpeed.toFixed(1)} km/h
                  </div>
                </div>
              ))}
            </div>

            {/* Weather Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Temperature Trend */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Temperature Range</span>
                </div>
                <div className="text-2xl font-bold text-primary">
                  {Math.min(...forecastData.slice(0, 7).map(d => d.minTemp)).toFixed(0)}° - {Math.max(...forecastData.slice(0, 7).map(d => d.maxTemp)).toFixed(0)}°
                </div>
                <div className="text-sm text-muted-foreground">
                  Next 7 days
                </div>
              </div>

              {/* Precipitation */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CloudRain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Total Precipitation</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {forecastData.slice(0, 7).reduce((sum, day) => sum + day.precipitation, 0).toFixed(1)}mm
                </div>
                <div className="text-sm text-muted-foreground">
                  Next 7 days
                </div>
              </div>

              {/* Wind */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Max Wind Speed</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.max(...forecastData.slice(0, 7).map(d => d.windSpeed)).toFixed(1)} km/h
                </div>
                <div className="text-sm text-muted-foreground">
                  Next 7 days
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-center text-xs text-muted-foreground pt-4">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No forecast data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
