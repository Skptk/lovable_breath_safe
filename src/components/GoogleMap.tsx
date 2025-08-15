import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { GOOGLE_MAPS_CONFIG, getAQIColor, getAQILabel } from '@/config/maps';

interface GoogleMapProps {
  userLocation: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  } | null;
  airQualityData: {
    aqi: number;
    location: string;
    timestamp: string;
  } | null;
  nearbyLocations: Array<{
    id: string;
    name: string;
    distance: string;
    aqi: number;
    coordinates: [number, number];
  }>;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleMap({ userLocation, airQualityData, nearbyLocations }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
      } else {
        // Wait for Google Maps to load
        setTimeout(checkGoogleMaps, 100);
      }
    };
    
    checkGoogleMaps();
  }, []);

  // Initialize map when script is loaded and user location is available
  useEffect(() => {
    if (!mapLoaded || !userLocation || !mapRef.current) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom: GOOGLE_MAPS_CONFIG.DEFAULT_ZOOM,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMapInstance(map);

      // Add user location marker
      new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: map,
        title: 'Your Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: GOOGLE_MAPS_CONFIG.USER_MARKER.scale,
          fillColor: GOOGLE_MAPS_CONFIG.USER_MARKER.fillColor,
          fillOpacity: GOOGLE_MAPS_CONFIG.USER_MARKER.fillOpacity,
          strokeColor: GOOGLE_MAPS_CONFIG.USER_MARKER.strokeColor,
          strokeWeight: GOOGLE_MAPS_CONFIG.USER_MARKER.strokeWeight
        }
      });

      // Add nearby monitoring stations
      nearbyLocations.forEach((location) => {
        const marker = new window.google.maps.Marker({
          position: { lat: location.coordinates[0], lng: location.coordinates[1] },
          map: map,
          title: location.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: GOOGLE_MAPS_CONFIG.STATION_MARKER.scale,
            fillColor: getAQIColor(location.aqi),
            fillOpacity: GOOGLE_MAPS_CONFIG.STATION_MARKER.fillOpacity,
            strokeColor: GOOGLE_MAPS_CONFIG.STATION_MARKER.strokeColor,
            strokeWeight: GOOGLE_MAPS_CONFIG.STATION_MARKER.strokeWeight
          }
        });

        // Add info window for each station
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${location.name}</h3>
              <p class="text-sm">Distance: ${location.distance}</p>
              <p class="text-sm">AQI: <span class="font-medium">${location.aqi}</span></p>
              <p class="text-xs text-gray-500">${getAQILabel(location.aqi)}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
    }
  }, [mapLoaded, userLocation, nearbyLocations]);



  if (mapError) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Map Error</h3>
            <p className="text-muted-foreground">{mapError}</p>
            <p className="text-sm text-muted-foreground">
              Please check your internet connection and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!mapLoaded || !userLocation) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading interactive map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Interactive Air Quality Map</h3>
              <p className="text-sm text-muted-foreground">
                Your location and nearby monitoring stations
              </p>
            </div>
            {airQualityData && (
              <Badge 
                variant="secondary"
                className={`${getAQIColor(airQualityData.aqi)} text-white border-0`}
              >
                AQI {airQualityData.aqi}
              </Badge>
            )}
          </div>
        </div>
        
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-b-lg"
          style={{ minHeight: '400px' }}
        />
        
        <div className="p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Blue marker: Your location</span>
            <span className="mx-2">•</span>
            <span>Colored markers: Monitoring stations (AQI-based colors)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
