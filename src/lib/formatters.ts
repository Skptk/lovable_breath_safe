// Utility functions for consistent number formatting across the app

/**
 * Format numbers with consistent decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string or 'N/A' if invalid
 */
export const formatNumber = (num: number | null | undefined, decimals: number = 1): string => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return Number(num).toFixed(decimals);
};

/**
 * Format temperature with consistent decimal places
 * @param temp - Temperature value
 * @returns Formatted temperature string
 */
export const formatTemperature = (temp: number | null | undefined): string => {
  return `${formatNumber(temp, 1)}°C`;
};

/**
 * Format wind speed with consistent decimal places
 * @param speed - Wind speed value
 * @returns Formatted wind speed string
 */
export const formatWindSpeed = (speed: number | null | undefined): string => {
  return `${formatNumber(speed, 1)} km/h`;
};

/**
 * Format humidity as percentage
 * @param humidity - Humidity value
 * @returns Formatted humidity string
 */
export const formatHumidity = (humidity: number | null | undefined): string => {
  return `${formatNumber(humidity, 0)}%`;
};

/**
 * Format visibility with consistent decimal places
 * @param visibility - Visibility value
 * @returns Formatted visibility string
 */
export const formatVisibility = (visibility: number | null | undefined): string => {
  return `${formatNumber(visibility, 1)} km`;
};

/**
 * Format precipitation with consistent decimal places
 * @param precipitation - Precipitation value
 * @returns Formatted precipitation string
 */
export const formatPrecipitation = (precipitation: number | null | undefined): string => {
  return `${formatNumber(precipitation, 1)}mm`;
};

/**
 * Format air pressure with consistent decimal places
 * @param pressure - Air pressure value
 * @returns Formatted air pressure string
 */
export const formatAirPressure = (pressure: number | null | undefined): string => {
  return `${formatNumber(pressure, 1)} hPa`;
};
