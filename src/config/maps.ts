// Google Maps configuration
export const GOOGLE_MAPS_CONFIG = {
  // Replace with your actual Google Maps API key
  API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
  
  // Map settings
  DEFAULT_ZOOM: 13,
  DEFAULT_CENTER: { lat: 0, lng: 0 },
  
  // Marker settings
  USER_MARKER: {
    scale: 8,
    fillColor: '#3B82F6', // Blue
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2
  },
  
  STATION_MARKER: {
    scale: 6,
    fillOpacity: 0.8,
    strokeColor: '#FFFFFF',
    strokeWeight: 1
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
  if (aqi <= 50) return GOOGLE_MAPS_CONFIG.AQI_COLORS.good;
  if (aqi <= 100) return GOOGLE_MAPS_CONFIG.AQI_COLORS.moderate;
  if (aqi <= 150) return GOOGLE_MAPS_CONFIG.AQI_COLORS.unhealthySensitive;
  if (aqi <= 200) return GOOGLE_MAPS_CONFIG.AQI_COLORS.unhealthy;
  if (aqi <= 300) return GOOGLE_MAPS_CONFIG.AQI_COLORS.veryUnhealthy;
  return GOOGLE_MAPS_CONFIG.AQI_COLORS.hazardous;
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
