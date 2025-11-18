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
  embedded?: boolean; // When true, skip GlassCard wrapper and header
}

export default function LeafletMap({ userLocation, airQualityData, nearbyLocations = [], embedded = false }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [currentTileLayer, setCurrentTileLayer] = useState<any | null>(null);
  const [tileErrorCount, setTileErrorCount] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const { isDark } = useTheme();

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    
    // CRITICAL: Add global error handler to catch Leaflet container access errors
    const handleLeafletError = (event: ErrorEvent) => {
      if (event.error && event.error.message && event.error.message.includes('offsetWidth')) {
        console.warn('Caught Leaflet offsetWidth error, map may be in cleanup state');
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    
    window.addEventListener('error', handleLeafletError);
    
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('error', handleLeafletError);
    };
  }, []);

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

  // Handle container resize and invalidate map size
  useEffect(() => {
    if (!mapInstance || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isMountedRef.current && mapInstance && !mapInstance._destroyed && mapRef.current) {
        try {
          // Use setTimeout to debounce resize events
          setTimeout(() => {
            if (isMountedRef.current && mapInstance && !mapInstance._destroyed && mapRef.current) {
              mapInstance.invalidateSize();
            }
          }, 100);
        } catch (e) {
          console.warn('Error invalidating map size on resize:', e);
        }
      }
    });

    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapInstance]);

  // Initialize map when user location is available
  useEffect(() => {
    if (!userLocation || !mapRef.current || mapInstance || !leafletLoaded || !L) return;

    // Check if the container already has a map instance
    if (mapRef.current && (mapRef.current as any)._leaflet_id) {
      return;
    }

    // CRITICAL: Ensure container has dimensions before initializing Leaflet
    // Leaflet requires offsetWidth/offsetHeight to be available
    const checkContainerReady = () => {
      if (!mapRef.current) return false;
      const rect = mapRef.current.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    // Wait for container to have dimensions using requestAnimationFrame
    let retryCount = 0;
    const MAX_RETRIES = 50; // Maximum 50 retries (~3 seconds at 60fps)
    
    const initMap = () => {
      if (retryCount >= MAX_RETRIES) {
        console.error('Map initialization failed: container never got dimensions after', MAX_RETRIES, 'retries');
        setMapError('Failed to initialize map: container not ready');
        return;
      }

      if (!checkContainerReady()) {
        // Container not ready yet, try again on next frame
        retryCount++;
        requestAnimationFrame(initMap);
        return;
      }

      try {
        // Verify container still exists and has dimensions
        if (!mapRef.current || !checkContainerReady()) {
          retryCount++;
          requestAnimationFrame(initMap);
          return;
        }

        // Double-check that container has valid dimensions
        const container = mapRef.current;
        if (!container.offsetWidth || !container.offsetHeight) {
          // Container doesn't have dimensions yet, retry
          retryCount++;
          requestAnimationFrame(initMap);
          return;
        }

        // Verify component is still mounted before creating map
        if (!isMountedRef.current || !mapRef.current) {
          return;
        }

        // CRITICAL: Store container reference in a way Leaflet can always access it
        // Ensure container has valid dimensions one more time
        if (!container.offsetWidth || !container.offsetHeight) {
          console.warn('Container still lacks dimensions, retrying...');
          retryCount++;
          requestAnimationFrame(initMap);
          return;
        }

        // Create map instance with performance optimizations
        const map = L.map(container, {
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

      // CRITICAL: Store container reference in map instance for safety
      // Also ensure Leaflet's internal container reference is valid
      if (map) {
        (map as any)._containerRef = container;
        
        // Override getContainer to ensure it always returns a valid container
        const originalGetContainer = map.getContainer;
        map.getContainer = function() {
          const container = originalGetContainer.call(this);
          if (!container || !container.offsetWidth) {
            console.warn('Leaflet getContainer returned invalid container');
            return mapRef.current || container;
          }
          return container;
        };
      }

      // Verify map was created and component is still mounted
      if (!map || !isMountedRef.current || !mapRef.current) {
        if (map && map.remove) {
          map.remove();
        }
        return;
      }

      // CRITICAL: Verify container is still valid after map creation
      if (!mapRef.current || !mapRef.current.offsetWidth || !mapRef.current.offsetHeight) {
        console.error('Container invalid after map creation, removing map');
        if (map && map.remove) {
          map.remove();
        }
        return;
      }

      // CRITICAL: Invalidate size after creation to ensure Leaflet knows container dimensions
      // Use multiple attempts to ensure it works
      const invalidateSize = () => {
        if (isMountedRef.current && map && !map._destroyed && mapRef.current && mapRef.current.offsetWidth > 0) {
          try {
            map.invalidateSize();
            // Verify the map actually rendered
            if (map.getContainer && map.getContainer().offsetWidth === 0) {
              console.warn('Map container has zero width after invalidation');
            }
          } catch (e) {
            console.warn('Error invalidating map size:', e);
          }
        }
      };

      // Invalidate immediately
      invalidateSize();
      
      // Invalidate again after a short delay to handle any async rendering
      setTimeout(invalidateSize, 100);
      setTimeout(invalidateSize, 300);

      // Add initial tile layer with proper error handling
      const initialTileLayer = createTileLayer(false);
      if (initialTileLayer) {
        initialTileLayer.addTo(map);
      }

      setCurrentTileLayer(initialTileLayer);
      setMapInstance(map);
      
      // CRITICAL: Verify map container is valid before marking as loaded
      if (map.getContainer && map.getContainer().offsetWidth > 0 && map.getContainer().offsetHeight > 0) {
        setMapLoaded(true);
        console.log('Map initialized successfully with dimensions:', {
          width: map.getContainer().offsetWidth,
          height: map.getContainer().offsetHeight
        });
      } else {
        console.error('Map container invalid after initialization');
        setMapError('Map container invalid');
        if (map && map.remove) {
          map.remove();
        }
        return;
      }

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
        // Reset state on error to allow retry
        setMapInstance(null);
        setMapLoaded(false);
      }
    };

    // Start initialization check
    requestAnimationFrame(initMap);
  }, [userLocation, nearbyLocations, leafletLoaded, L, isDark, createTileLayer]);

  // CRITICAL: Aggressive cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Store references before cleanup
      const instance = mapInstance;
      const container = mapRef.current;
      const markerList = markers;
      
      if (instance && container) {
        try {
          // CRITICAL: Remove map BEFORE clearing container to prevent event handler errors
          // First, disable all interactions
          if (instance.dragging && instance.dragging.disable) {
            instance.dragging.disable();
          }
          if (instance.touchZoom && instance.touchZoom.disable) {
            instance.touchZoom.disable();
          }
          if (instance.doubleClickZoom && instance.doubleClickZoom.disable) {
            instance.doubleClickZoom.disable();
          }
          if (instance.scrollWheelZoom && instance.scrollWheelZoom.disable) {
            instance.scrollWheelZoom.disable();
          }
          if (instance.boxZoom && instance.boxZoom.disable) {
            instance.boxZoom.disable();
          }
          if (instance.keyboard && instance.keyboard.disable) {
            instance.keyboard.disable();
          }

          // Mark map as destroyed to prevent further operations
          instance._destroyed = true;

          // Remove all layers first
          if (instance.eachLayer) {
            instance.eachLayer((layer: any) => {
              try {
                instance.removeLayer(layer);
              } catch (e) {
                // Ignore errors during cleanup
              }
            });
          }
          
          // Clear all markers
          markerList.forEach((marker) => {
            try {
              if (marker && marker.remove) {
                marker.remove();
              }
            } catch (e) {
              // Ignore errors
            }
          });
          
          // Remove all event listeners
          if (instance.off) {
            instance.off();
          }
          
          // Clear tile cache if possible
          if (L && L.Util && L.Util.clearTileCache) {
            L.Util.clearTileCache();
          }
          
          // Remove the map instance - THIS MUST HAPPEN BEFORE CLEARING CONTAINER
          if (instance.remove) {
            try {
              instance.remove();
            } catch (e) {
              console.warn('Error removing map instance:', e);
            }
          }
          
          // CRITICAL: Don't clear container immediately - Leaflet may still need it
          // Only clear after a longer delay to ensure all event handlers are cleaned up
          setTimeout(() => {
            // Double-check map is destroyed before clearing
            if (instance._destroyed && container && container.parentNode) {
              // Check if container still has Leaflet reference
              const hasLeafletId = (container as any)._leaflet_id;
              if (!hasLeafletId || instance._destroyed) {
                container.innerHTML = '';
                // Remove Leaflet ID to prevent re-initialization issues
                if ((container as any)._leaflet_id) {
                  delete (container as any)._leaflet_id;
                }
              }
            }
          }, 200); // Increased delay to ensure Leaflet cleanup completes
        } catch (e) {
          console.warn('Error during map cleanup:', e);
        } finally {
          setMapInstance(null);
          setMarkers([]);
          setCurrentTileLayer(null);
        }
      } else if (container) {
        // If no map instance but container exists, just clear it
        container.innerHTML = '';
        if ((container as any)._leaflet_id) {
          delete (container as any)._leaflet_id;
        }
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

  // Render map content (shared between embedded and standalone modes)
  const mapContent = (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Map container - CRITICAL: Must have explicit dimensions for Leaflet */}
      {/* Key prop prevents React from recreating the container, which would break Leaflet's reference */}
      <div 
        key="leaflet-map-container"
        ref={mapRef} 
        className="w-full h-full min-h-[400px]"
        style={{ 
          pointerEvents: mapLoaded && mapInstance && !mapInstance._destroyed && mapRef.current ? 'auto' : 'none',
          position: 'relative',
          zIndex: 1,
          minWidth: '100%',
          minHeight: '400px'
        }}
      />
      
      {/* Loading overlay */}
      {!mapLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading map tiles...</p>
          </div>
        </div>
      )}
      
      {/* Error overlay with retry button */}
      {tileErrorCount >= 3 && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800"
          style={{ pointerEvents: 'auto', zIndex: 10 }}
        >
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
  );

  // Embedded mode: just return the map without wrapper
  if (embedded) {
    return mapContent;
  }

  // Standalone mode: return with GlassCard wrapper
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
          </div>
        </div>
        
        <div className="relative w-full h-[600px] min-h-[500px] rounded-b-lg">
          {mapContent}
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
