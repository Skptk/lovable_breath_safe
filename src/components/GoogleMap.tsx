import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, AlertTriangle, Map } from 'lucide-react';
import { GOOGLE_MAPS_CONFIG, getAQIColor, getAQILabel, isGoogleMapsApiKeyValid } from '@/config/maps';

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
  const [scriptLoading, setScriptLoading] = useState(false);

  // Check if Google Maps API key is valid
  const hasValidApiKey = isGoogleMapsApiKeyValid();

  // Intercept script loading to prevent Google Maps scripts with invalid keys
  useEffect(() => {
    if (!hasValidApiKey) {
      // Remove any existing Google Maps scripts
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      if (existingScripts.length > 0) {
        existingScripts.forEach(script => {
          if (script instanceof HTMLScriptElement) {
            script.remove();
          }
        });
      }
      
      // Create a script loading interceptor
      const originalAppendChild = document.head.appendChild.bind(document.head);
      const originalInsertBefore = document.head.insertBefore.bind(document.head);
      const originalCreateElement = document.createElement.bind(document);
      
      // Override createElement to catch script creation
      document.createElement = function(tagName: string, options?: ElementCreationOptions) {
        const element = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === 'script' && element instanceof HTMLScriptElement) {
          const originalSetAttribute = element.setAttribute.bind(element);
          element.setAttribute = function(name: string, value: string) {
            if (name === 'src' && value.includes('maps.googleapis.com')) {
              return; // Don't set the src
            }
            return originalSetAttribute(name, value);
          };
        }
        return element;
      };
      
      document.head.appendChild = function(node) {
        if (node instanceof HTMLScriptElement && node.src && node.src.includes('maps.googleapis.com')) {
          return node; // Return the node without actually appending it
        }
        return originalAppendChild(node);
      };
      
      document.head.insertBefore = function(node, referenceNode) {
        if (node instanceof HTMLScriptElement && node.src && node.src.includes('maps.googleapis.com')) {
          return node; // Return the node without actually inserting it
        }
        return originalInsertBefore(node, referenceNode);
      };
      
      // Cleanup function to restore original methods
      return () => {
        document.head.appendChild = originalAppendChild;
        document.head.insertBefore = originalInsertBefore;
        document.createElement = originalCreateElement;
      };
    }
  }, [hasValidApiKey]);

  // Immediate script removal effect - runs before interceptor setup
  useEffect(() => {
    if (!hasValidApiKey) {
      // Remove any existing Google Maps scripts immediately
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      if (existingScripts.length > 0) {
        existingScripts.forEach(script => {
          if (script instanceof HTMLScriptElement) {
            script.remove();
          }
        });
      }
      
      // Also check for any scripts that might be in the process of loading
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLScriptElement && node.src && node.src.includes('maps.googleapis.com')) {
              node.remove();
            }
          });
        });
      });
      
      observer.observe(document.head, { childList: true });
      
      return () => observer.disconnect();
    }
  }, [hasValidApiKey]);

  // Load Google Maps script dynamically
  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Double-check API key validity before loading script
      if (!isGoogleMapsApiKeyValid()) {
        reject(new Error('Invalid Google Maps API key'));
        return;
      }

      // Check if there are already any Google Maps scripts loading or loaded
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      if (existingScripts.length > 0) {
        existingScripts.forEach(script => script.remove());
      }

      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      setScriptLoading(true);
      
      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setScriptLoading(false);
        resolve();
      };
      
      script.onerror = () => {
        setScriptLoading(false);
        reject(new Error('Failed to load Google Maps script'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Check if Google Maps is loaded
  useEffect(() => {
    // Early return if no valid API key - don't even try to load Google Maps
    if (!hasValidApiKey) {
      // Remove any existing Google Maps scripts that might have been loaded with invalid keys
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      existingScripts.forEach(script => {
        script.remove();
      });
      
      setMapLoaded(false);
      setMapError(null);
      return;
    }

    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
      } else {
        // Wait for Google Maps to load
        setTimeout(checkGoogleMaps, 100);
      }
    };
    
    // Load script if not already loaded
    if (!window.google || !window.google.maps) {
      loadGoogleMapsScript()
        .then(() => {
          checkGoogleMaps();
        })
        .catch((error) => {
          console.error('Error loading Google Maps:', error);
          setMapError('Failed to load Google Maps');
        });
    } else {
      checkGoogleMaps();
    }
  }, [hasValidApiKey]);

  // Initialize map when script is loaded and user location is available
  useEffect(() => {
    if (!mapLoaded || !userLocation || !mapRef.current || !hasValidApiKey) return;

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
  }, [mapLoaded, userLocation, nearbyLocations, hasValidApiKey]);

  // Show message when API key is missing
  if (!hasValidApiKey) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <Map className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">Google Maps Not Available</h3>
            <p className="text-muted-foreground">
              To view the interactive map, please add your Google Maps API key to the configuration.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Get a Google Maps API key from Google Cloud Console</p>
              <p>2. Update the API key in <code className="bg-muted px-1 rounded">src/config/maps.ts</code></p>
              <p>3. Refresh the page to see the map</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  if (scriptLoading || !mapLoaded || !userLocation) {
    return (
      <Card className="bg-gradient-card shadow-card border-0">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">
              {scriptLoading ? 'Loading Google Maps...' : 'Loading interactive map...'}
            </p>
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
