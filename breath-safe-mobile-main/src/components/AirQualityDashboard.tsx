import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, History, Map, Download, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PollutantModal from "./PollutantModal";

interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  location: string;
  timestamp: string;
}

// Helper functions for AQI display
const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return "text-green-500";
  if (aqi <= 100) return "text-yellow-500";
  if (aqi <= 150) return "text-orange-500";
  if (aqi <= 200) return "text-red-500";
  if (aqi <= 300) return "text-purple-500";
  return "text-red-800";
};

const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
};

export default function AirQualityDashboard(): JSX.Element {
  const [selectedPollutant, setSelectedPollutant] = useState<{
    name: string;
    value: number;
    unit: string;
  } | null>(null);
  const { toast } = useToast();

  const fetchAirQualityData = async (): Promise<AirQualityData> => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000 // 5 minutes
      });
    });

    const { latitude, longitude } = position.coords;
    
    const { data: response, error } = await supabase.functions.invoke('get-air-quality', {
      body: { lat: latitude, lon: longitude }
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!response) {
      throw new Error('No response data received');
    }

    // Debug: Log the actual response structure
    console.log('Supabase function response:', response);

    // The function returns the raw OpenWeatherMap data structure
    // Based on the function code, it returns the raw API response
    return {
      aqi: response.list?.[0]?.main?.aqi || 0,
      pm25: response.list?.[0]?.components?.pm2_5 || 0,
      pm10: response.list?.[0]?.components?.pm10 || 0,
      no2: response.list?.[0]?.components?.no2 || 0,
      so2: response.list?.[0]?.components?.so2 || 0,
      co: response.list?.[0]?.components?.co || 0,
      o3: response.list?.[0]?.components?.o3 || 0,
      location: response.location || 'Unknown Location',
      timestamp: new Date().toLocaleString(),
    };
  };

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['airQuality'],
    queryFn: fetchAirQualityData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });

  const handleRefresh = (): void => {
    refetch();
  };

  const handlePollutantClick = (name: string, value: number, unit: string): void => {
    setSelectedPollutant({ name, value, unit });
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading air quality data...</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Failed to load data</h3>
            <p className="text-muted-foreground max-w-sm">
              {error instanceof Error ? error.message : 'An error occurred while loading air quality data'}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No data available</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Air Quality
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {data.location}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="bg-background/50 border-border hover:bg-card"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Main AQI Card */}
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className={`text-6xl font-bold ${getAQIColor(data.aqi)}`}>
                {data.aqi}
              </div>
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary border-0 px-4 py-1"
              >
                {getAQILabel(data.aqi)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Air Quality Index • Updated {data.timestamp}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pollutants Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className="bg-card/50 border-border hover:bg-card cursor-pointer transition-colors"
          onClick={() => handlePollutantClick('PM2.5', data.pm25, 'μg/m³')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">PM2.5</p>
                <p className="text-2xl font-bold">{data.pm25.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">μg/m³</p>
              </div>
              <div className="text-2xl">🌫️</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border hover:bg-card cursor-pointer transition-colors"
          onClick={() => handlePollutantClick('PM10', data.pm10, 'μg/m³')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">PM10</p>
                <p className="text-2xl font-bold">{data.pm10.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">μg/m³</p>
              </div>
              <div className="text-2xl">💨</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border hover:bg-card cursor-pointer transition-colors"
          onClick={() => handlePollutantClick('NO₂', data.no2, 'μg/m³')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">NO₂</p>
                <p className="text-2xl font-bold">{data.no2.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">μg/m³</p>
              </div>
              <div className="text-2xl">🚗</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border hover:bg-card cursor-pointer transition-colors"
          onClick={() => handlePollutantClick('SO₂', data.so2, 'μg/m³')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SO₂</p>
                <p className="text-2xl font-bold">{data.so2.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">μg/m³</p>
              </div>
              <div className="text-2xl">🏭</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border hover:bg-card cursor-pointer transition-colors"
          onClick={() => handlePollutantClick('CO', data.co, 'μg/m³')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">CO</p>
                <p className="text-2xl font-bold">{data.co.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">μg/m³</p>
              </div>
              <div className="text-2xl">🚬</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-card/50 border-border hover:bg-card cursor-pointer transition-colors"
          onClick={() => handlePollutantClick('O₃', data.o3, 'μg/m³')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">O₃</p>
                <p className="text-2xl font-bold">{data.o3.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">μg/m³</p>
              </div>
              <div className="text-2xl">☀️</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 gap-2">
          <History className="h-4 w-4" />
          View History
        </Button>
        <Button variant="outline" className="h-12 gap-2">
          <Map className="h-4 w-4" />
          View Map
        </Button>
      </div>

      {/* Pollutant Modal */}
      {selectedPollutant && (
        <PollutantModal
          pollutant={selectedPollutant}
          onClose={() => setSelectedPollutant(null)}
        />
      )}
    </div>
  );
}

