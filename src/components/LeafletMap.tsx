import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, AlertTriangle, Map } from 'lucide-react';
import { getAQIColor, getAQILabel, LEAFLET_MAPS_CONFIG } from '@/config/maps';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapProps {
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

export default function LeafletMap({ userLocation, airQualityData, nearbyLocations }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markers, setMarkers] = useState<L.Marker[]>([]);

  // Dark theme tile layer configuration
  const darkTileLayer = LEAFLET_MAPS_CONFIG.TILE_LAYERS.dark;
  const darkTileLayerAttribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.dark;

  // Initialize map when user location is available
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    try {
      // Create map instance
      const map = L.map(mapRef.current, {
        center: [userLocation.latitude, userLocation.longitude],
        zoom: LEAFLET_MAPS_CONFIG.DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        touchZoom: true,
        tap: true,
      });

      // Add dark theme tile layer
      L.tileLayer(darkTileLayer, {
        attribution: darkTileLayerAttribution,
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3,
      }).addTo(map);

      // Custom map styling for dark theme
      map.on('load', () => {
        // Add custom CSS for dark theme
        const style = document.createElement('style');
        style.textContent = `
          .leaflet-container {
            background: #1a1a1a !important;
          }
          .leaflet-control-zoom a {
            background-color: #2a2a2a !important;
            color: #ffffff !important;
            border-color: #404040 !important;
          }
          .leaflet-control-zoom a:hover {
            background-color: #404040 !important;
          }
          .leaflet-control-attribution {
            background-color: rgba(26, 26, 26, 0.8) !important;
            color: #cccccc !important;
          }
        `;
        document.head.appendChild(style);
      });

      setMapInstance(map);
      setMapLoaded(true);

      // Add user location marker
      const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: L.divIcon({
          className: 'custom-user-marker',
          html: `
            <div style="
              width: ${LEAFLET_MAPS_CONFIG.USER_MARKER.size}px; 
              height: ${LEAFLET_MAPS_CONFIG.USER_MARKER.size}px; 
              background: ${LEAFLET_MAPS_CONFIG.USER_MARKER.color}; 
              border: ${LEAFLET_MAPS_CONFIG.USER_MARKER.borderWidth}px solid ${LEAFLET_MAPS_CONFIG.USER_MARKER.borderColor}; 
              border-radius: 50%; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [LEAFLET_MAPS_CONFIG.USER_MARKER.size, LEAFLET_MAPS_CONFIG.USER_MARKER.size],
          iconAnchor: [LEAFLET_MAPS_CONFIG.USER_MARKER.size / 2, LEAFLET_MAPS_CONFIG.USER_MARKER.size / 2],
        }),
        title: 'Your Location',
      }).addTo(map);

      // Add nearby monitoring stations
      const newMarkers: L.Marker[] = [];
      nearbyLocations.forEach((location) => {
        if (location.coordinates[0] !== 0 && location.coordinates[1] !== 0) {
          const marker = L.marker([location.coordinates[0], location.coordinates[1]], {
            icon: L.divIcon({
              className: 'custom-station-marker',
              html: `
                <div style="
                  width: ${LEAFLET_MAPS_CONFIG.STATION_MARKER.size}px; 
                  height: ${LEAFLET_MAPS_CONFIG.STATION_MARKER.size}px; 
                  background: ${getAQIColor(location.aqi)}; 
                  border: ${LEAFLET_MAPS_CONFIG.STATION_MARKER.borderWidth}px solid ${LEAFLET_MAPS_CONFIG.STATION_MARKER.borderColor}; 
                  border-radius: 50%; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  cursor: pointer;
                "></div>
              `,
              iconSize: [LEAFLET_MAPS_CONFIG.STATION_MARKER.size, LEAFLET_MAPS_CONFIG.STATION_MARKER.size],
              iconAnchor: [LEAFLET_MAPS_CONFIG.STATION_MARKER.size / 2, LEAFLET_MAPS_CONFIG.STATION_MARKER.size / 2],
            }),
            title: location.name,
          });

          // Add popup for each station
          marker.bindPopup(`
            <div class="p-2 min-w-[200px]">
              <h3 class="font-semibold text-base mb-2">${location.name}</h3>
              <div class="space-y-1 text-sm">
                <p><strong>Distance:</strong> ${location.distance}</p>
                <p><strong>AQI:</strong> <span class="font-medium">${location.aqi}</span></p>
                <p class="text-xs text-gray-500">${getAQILabel(location.aqi)}</p>
              </div>
            </div>
          `);

          marker.addTo(map);
          newMarkers.push(marker);
        }
      });

      setMarkers(newMarkers);

      // Fit map to show all markers
      if (newMarkers.length > 0) {
        const group = new L.FeatureGroup([userMarker, ...newMarkers]);
        map.fitBounds(group.getBounds().pad(0.1));
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map');
    }
  }, [userLocation, nearbyLocations]);

  // Cleanup markers and map on unmount
  useEffect(() => {
    return () => {
      markers.forEach(marker => marker.remove());
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [markers, mapInstance]);

  if (mapError) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl">
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

  if (!userLocation) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl">
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
    <Card className="relative overflow-hidden bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border border-border/20 shadow-xl">
      <CardContent className="p-0">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Interactive Air Quality Map
              </h3>
              <p className="text-sm text-muted-foreground/80">
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
        
        <div className="p-4 bg-gradient-to-br from-muted/20 to-muted/10 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
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
