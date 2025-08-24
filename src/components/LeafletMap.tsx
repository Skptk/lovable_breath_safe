import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, AlertTriangle, Map } from 'lucide-react';
import { getAQIColor, getAQILabel, LEAFLET_MAPS_CONFIG } from '@/config/maps';
import { useTheme } from '@/contexts/ThemeContext';

// Dynamic imports for Leaflet
let L: any = null;
let leafletCSSLoaded = false;

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
  nearbyLocations?: Array<{
    id: string;
    name: string;
    distance: string;
    aqi: number;
    coordinates: [number, number];
  }>;
}

export default function LeafletMap({ userLocation, airQualityData, nearbyLocations = [] }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState<any | null>(null);
  
  const { isDark } = useTheme();

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        if (!L) {
          L = await import('leaflet');
          if (!leafletCSSLoaded) {
            await import('leaflet/dist/leaflet.css');
            leafletCSSLoaded = true;
          }
        }
        setLeafletLoaded(true);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setMapError('Failed to load map library');
      }
    };

    loadLeaflet();
  }, []);

  // Update map theme when theme changes
  useEffect(() => {
    if (!mapInstance || !L) return;

    // Remove current tile layer
    if (currentTileLayer) {
      mapInstance.removeLayer(currentTileLayer);
    }

    // Add new tile layer based on current theme with fallback
    let tileLayerUrl: string;
    let attribution: string;
    
    try {
      if (isDark) {
        tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.dark;
        attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.dark;
      } else {
        tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.light;
        attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.light;
      }
    } catch (error) {
      // Fallback to light theme if dark theme fails
      console.warn('Dark theme tile layer failed, falling back to light theme');
      tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.light;
      attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.light;
    }
    
    const newTileLayer = L.tileLayer(tileLayerUrl, {
      attribution: attribution,
      subdomains: 'abcd',
      maxZoom: 19,
      minZoom: 3,
    });

    newTileLayer.addTo(mapInstance);
    setCurrentTileLayer(newTileLayer);

    // Update map styling based on theme
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        background: ${isDark ? '#1a1a1a' : '#f8fafc'} !important;
      }
      .leaflet-control-zoom a {
        background-color: ${isDark ? '#2a2a2a' : '#ffffff'} !important;
        color: ${isDark ? '#ffffff' : '#1a1a1a'} !important;
        border-color: ${isDark ? '#404040' : '#e5e5e5'} !important;
      }
      .leaflet-control-zoom a:hover {
        background-color: ${isDark ? '#404040' : '#f1f5f9'} !important;
      }
      .leaflet-control-attribution {
        background-color: ${isDark ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)'} !important;
        color: ${isDark ? '#cccccc' : '#374151'} !important;
      }
    `;
    
    // Remove existing style if present
    const existingStyle = document.querySelector('style[data-leaflet-theme]');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.setAttribute('data-leaflet-theme', 'true');
    document.head.appendChild(style);

  }, [isDark, mapInstance, L]);

  // Initialize map when user location is available
  useEffect(() => {
    if (!userLocation || !mapRef.current || mapInstance || !leafletLoaded || !L) return;

    // Check if the container already has a map instance
    if (mapRef.current && (mapRef.current as any)._leaflet_id) {
      return;
    }

    try {
      // Create map instance with performance optimizations
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
        preferCanvas: true, // Performance optimization
        updateWhenIdle: true, // Reduce CPU usage
        zoomAnimation: false, // Reduce jank on low-end devices
      });

      // Add initial tile layer based on current theme
      let tileLayerUrl: string;
      let attribution: string;
      
      try {
        if (isDark) {
          tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.dark;
          attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.dark;
        } else {
          tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.light;
          attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.light;
        }
      } catch (error) {
        // Fallback to light theme if dark theme fails
        console.warn('Dark theme tile layer failed during initialization, falling back to light theme');
        tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.light;
        attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.light;
      }
      
      const tileLayer = L.tileLayer(tileLayerUrl, {
        attribution: attribution,
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3,
      }).addTo(map);

      setCurrentTileLayer(tileLayer);
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
      const newMarkers: any[] = [];
      if (nearbyLocations && nearbyLocations.length > 0) {
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
                <p class="text-xs text-slate-500">${getAQILabel(location.aqi)}</p>
              </div>
            </div>
          `);

          marker.addTo(map);
          newMarkers.push(marker);
        }
      });
      }

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
  }, [userLocation, nearbyLocations, leafletLoaded, L, isDark]);

  // Cleanup markers and map on unmount
  useEffect(() => {
    return () => {
      if (mapInstance) {
        // Remove all layers first
        mapInstance.eachLayer((layer: any) => {
          mapInstance.removeLayer(layer);
        });
        // Remove all event listeners
        mapInstance.off();
        // Remove the map instance
        mapInstance.remove();
        setMapInstance(null);
        setMarkers([]);
      }
    };
  }, [mapInstance]); // Include mapInstance in dependencies

  if (mapError) {
    return (
      <Card className="floating-card">
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
      <Card className="floating-card">
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
      <Card className="floating-card">
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
          className="w-full h-[600px] min-h-[500px] rounded-b-lg"
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
