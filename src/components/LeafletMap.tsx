import { useEffect, useRef, useState, useCallback } from 'react';
// Force deployment refresh to fix dynamic import cache issues
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
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
  const [tileErrorCount, setTileErrorCount] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  
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

  // Helper function to create tile layer with error handling
  const createTileLayer = useCallback((useFallback = false) => {
    if (!L) return null;

    let tileLayerUrl: string;
    let attribution: string;
    let subdomains: string[];
    
    if (useFallback) {
      tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.fallback;
      attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.fallback;
      subdomains = LEAFLET_MAPS_CONFIG.TILE_SERVERS.cartodb;
      setUsingFallback(true);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('LeafletMap: Using fallback tile layer:', tileLayerUrl);
      }
    } else {
      tileLayerUrl = LEAFLET_MAPS_CONFIG.TILE_LAYERS.primary;
      attribution = LEAFLET_MAPS_CONFIG.ATTRIBUTION.primary;
      subdomains = LEAFLET_MAPS_CONFIG.TILE_SERVERS.openstreetmap;
      setUsingFallback(false);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('LeafletMap: Using primary tile layer:', tileLayerUrl);
      }
    }
    
    const tileLayer = L.tileLayer(tileLayerUrl, {
      attribution: attribution,
      subdomains: subdomains,
      maxZoom: 19,
      minZoom: 3,
      // Add retry options for better tile loading
      retry: 3,
      retryDelay: 1000,
      // Add error handling for tile loading failures
      errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      // Performance optimizations
      updateWhenIdle: true,
      keepBuffer: 2,
      updateWhenZooming: false
    });

    // Add error handling for tile loading
    tileLayer.on('tileerror', (error: any) => {
      console.warn('Tile loading error:', error);
      const newErrorCount = tileErrorCount + 1;
      setTileErrorCount(newErrorCount);
      
      // Switch to fallback after 3 tile errors
      if (newErrorCount >= 3 && !usingFallback) {
        console.warn('Too many tile errors, switching to fallback tile server');
        if (mapInstance && currentTileLayer) {
          mapInstance.removeLayer(currentTileLayer);
          const fallbackLayer = createTileLayer(true);
          if (fallbackLayer) {
            fallbackLayer.addTo(mapInstance);
            setCurrentTileLayer(fallbackLayer);
          }
        }
      }
    });

    return tileLayer;
  }, [L, tileErrorCount, usingFallback, mapInstance, currentTileLayer]);

  // Update map theme when theme changes
  useEffect(() => {
    if (!mapInstance || !L) return;

    // Remove current tile layer
    if (currentTileLayer) {
      mapInstance.removeLayer(currentTileLayer);
    }

    // Create new tile layer with proper configuration
    const newTileLayer = createTileLayer(usingFallback);
    if (newTileLayer) {
      newTileLayer.addTo(mapInstance);
      setCurrentTileLayer(newTileLayer);
    }

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
      /* Ensure tiles load properly */
      .leaflet-tile {
        filter: ${isDark ? 'brightness(0.8) contrast(1.2)' : 'none'};
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

      // Add initial tile layer with proper error handling
      const initialTileLayer = createTileLayer(false);
      if (initialTileLayer) {
        initialTileLayer.addTo(map);
      }

      setCurrentTileLayer(initialTileLayer);
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

  // CRITICAL: Aggressive cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mapInstance) {
        try {
          // Remove all layers first
          mapInstance.eachLayer((layer: any) => {
            try {
              mapInstance.removeLayer(layer);
            } catch (e) {
              // Ignore errors during cleanup
            }
          });
          
          // Clear all markers
          markers.forEach((marker) => {
            try {
              if (marker && marker.remove) {
                marker.remove();
              }
            } catch (e) {
              // Ignore errors
            }
          });
          
          // Remove all event listeners
          mapInstance.off();
          
          // Clear tile cache if possible
          if (L && L.Util && L.Util.clearTileCache) {
            L.Util.clearTileCache();
          }
          
          // Remove the map instance
          mapInstance.remove();
        } catch (e) {
          console.warn('Error during map cleanup:', e);
        } finally {
          setMapInstance(null);
          setMarkers([]);
          setCurrentTileLayer(null);
        }
      }
      
      // Clear map ref
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
    };
  }, [mapInstance, markers]); // Include markers in dependencies

  if (mapError) {
    return (
      <GlassCard className="floating-card">
        <GlassCardContent className="p-6">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Map Error</h3>
            <p className="text-muted-foreground">{mapError}</p>
            <p className="text-sm text-muted-foreground">
              Please check your internet connection and try again.
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  if (!userLocation) {
    return (
      <GlassCard className="floating-card">
        <GlassCardContent className="p-6">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading interactive map...</p>
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

      return (
      <GlassCard className="floating-card">
        <GlassCardContent className="p-0">
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
        
        <div className="relative w-full h-[600px] min-h-[500px] rounded-b-lg">
          {/* Map container */}
          <div 
            ref={mapRef} 
            className="w-full h-full rounded-b-lg"
          />
          
          {/* Loading overlay */}
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-b-lg">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading map tiles...</p>
              </div>
            </div>
          )}
          
          {/* Error overlay with retry button */}
          {tileErrorCount >= 3 && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-b-lg">
              <div className="text-center space-y-3 p-4">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Map temporarily unavailable</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usingFallback ? 'Using backup map service' : 'Switching to backup map service...'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setTileErrorCount(0);
                    setUsingFallback(false);
                    if (mapInstance && currentTileLayer) {
                      mapInstance.removeLayer(currentTileLayer);
                      const newTileLayer = createTileLayer(false);
                      if (newTileLayer) {
                        newTileLayer.addTo(mapInstance);
                        setCurrentTileLayer(newTileLayer);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gradient-to-br from-muted/20 to-muted/10 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
              <MapPin className="h-4 w-4" />
              <span>Blue marker: Your location</span>
              <span className="mx-2">•</span>
              <span>Colored markers: Monitoring stations (AQI-based colors)</span>
            </div>
            {usingFallback && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <AlertTriangle className="h-3 w-3" />
                <span>Using backup map service</span>
              </div>
            )}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
