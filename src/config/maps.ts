// Leaflet Map configuration
export const LEAFLET_MAPS_CONFIG = {
  // Map settings
  DEFAULT_ZOOM: 13,
  DEFAULT_CENTER: { lat: 0, lng: 0 },
  
  // Tile layer configuration - Fixed tile sources for reliable rendering
  TILE_LAYERS: {
    dark: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // Standard OpenStreetMap - most reliable
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // Standard OpenStreetMap
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  },
  
  // Attribution for tile layers
  ATTRIBUTION: {
    dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    light: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    satellite: '&copy; <a href="https://www.esri.com/">Esri</a>'
  },
  
  // Marker settings
  USER_MARKER: {
    size: 16,
    color: '#3B82F6', // Blue
    borderColor: '#FFFFFF',
    borderWidth: 2
  },
  
  STATION_MARKER: {
    size: 12,
    borderColor: '#FFFFFF',
    borderWidth: 2
  },
  
  // AQI color mapping
  AQI_COLORS: {
    good: '#10B981',        // Green (0-50)
    moderate: '#F59E0B',    // Yellow (51-100)
    unhealthySensitive: '#F97316', // Orange (101-150)
    unhealthy: '#EF4444',   // Red (151-200)
    veryUnhealthy: '#8B5CF6', // Purple (201-300)
    hazardous: '#7F1D1D'    // Dark Red (301+)
  }
};

// Helper function to get AQI color
export const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return LEAFLET_MAPS_CONFIG.AQI_COLORS.good;
  if (aqi <= 100) return LEAFLET_MAPS_CONFIG.AQI_COLORS.moderate;
  if (aqi <= 150) return LEAFLET_MAPS_CONFIG.AQI_COLORS.unhealthySensitive;
  if (aqi <= 200) return LEAFLET_MAPS_CONFIG.AQI_COLORS.unhealthy;
  if (aqi <= 300) return LEAFLET_MAPS_CONFIG.AQI_COLORS.veryUnhealthy;
  return LEAFLET_MAPS_CONFIG.AQI_COLORS.hazardous;
};

// Helper function to get AQI label
export const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};
