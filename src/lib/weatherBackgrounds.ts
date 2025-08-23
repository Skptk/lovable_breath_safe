/**
 * Weather background mapping utility
 * Maps Open-Meteo weather condition codes to background image filenames
 */

export interface WeatherBackgroundMapping {
  conditionCode: number;
  imagePath: string;
  description: string;
}

/**
 * Maps Open-Meteo weather condition codes to background image filenames
 * @param conditionCode - Open-Meteo weather condition code
 * @param isNight - Whether it's currently night time
 * @returns Background image path
 */
export function getBackgroundImage(conditionCode: number, isNight: boolean = false): string {
  // Night backgrounds take priority
  if (isNight) {
    return "/weather-backgrounds/partly-cloudy.svg"; // Placeholder for night
  }

  // Map weather codes to background images
  switch (conditionCode) {
    // Clear sky
    case 0:
      return "/weather-backgrounds/sunny.svg";
    
    // Mainly clear / Partly cloudy
    case 1:
    case 2:
      return "/weather-backgrounds/partly-cloudy.svg";
    
    // Overcast
    case 3:
      return "/weather-backgrounds/partly-cloudy.svg"; // Placeholder for overcast
    
    // Fog / Depositing rime fog
    case 45:
    case 48:
      return "/weather-backgrounds/partly-cloudy.svg"; // Placeholder for overcast
    
    // Rain / Showers
    case 51: // Light drizzle
    case 53: // Moderate drizzle
    case 55: // Dense drizzle
    case 61: // Slight rain
    case 63: // Moderate rain
    case 65: // Heavy rain
    case 80: // Slight rain showers
    case 81: // Moderate rain showers
    case 82: // Violent rain showers
      return "/weather-backgrounds/partly-cloudy.svg"; // Placeholder for rain
    
    // Snow
    case 71: // Slight snow fall
    case 73: // Moderate snow fall
    case 75: // Heavy snow fall
    case 85: // Slight snow showers
    case 86: // Heavy snow showers
      return "/weather-backgrounds/partly-cloudy.svg"; // Placeholder for snow
    
    // Thunderstorm
    case 95: // Thunderstorm
    case 96: // Thunderstorm with slight hail
    case 99: // Thunderstorm with heavy hail
      return "/weather-backgrounds/partly-cloudy.svg"; // Placeholder for rain
    
    // Default fallback
    default:
      return "/weather-backgrounds/partly-cloudy.svg";
  }
}

/**
 * Determines if it's currently night time based on sunrise/sunset times
 * @param sunriseTime - Sunrise time string (HH:MM format)
 * @param sunsetTime - Sunset time string (HH:MM format)
 * @returns Whether it's currently night time
 */
export function isNightTime(sunriseTime?: string, sunsetTime?: string): boolean {
  if (!sunriseTime || !sunsetTime) {
    // If we don't have sunrise/sunset data, estimate based on current hour
    const currentHour = new Date().getHours();
    return currentHour < 6 || currentHour > 20; // Night: 8 PM - 6 AM
  }

  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
    
    // Parse sunrise and sunset times
    const [sunriseHour, sunriseMinute] = sunriseTime.split(':').map(Number);
    const [sunsetHour, sunsetMinute] = sunsetTime.split(':').map(Number);
    
    const sunriseMinutes = sunriseHour * 60 + sunriseMinute;
    const sunsetMinutes = sunsetHour * 60 + sunsetMinute;
    
    // Check if current time is between sunset and sunrise (night time)
    if (sunsetMinutes < sunriseMinutes) {
      // Sunset is before sunrise (normal day)
      return currentTime < sunriseMinutes || currentTime > sunsetMinutes;
    } else {
      // Sunset is after sunrise (crosses midnight)
      return currentTime < sunriseMinutes && currentTime > sunsetMinutes;
    }
  } catch (error) {
    console.warn('Error parsing sunrise/sunset times:', error);
    // Fallback to hour-based estimation
    const currentHour = new Date().getHours();
    return currentHour < 6 || currentHour > 20;
  }
}

/**
 * Get all available weather background mappings for reference
 * @returns Array of weather condition mappings
 */
export function getWeatherBackgroundMappings(): WeatherBackgroundMapping[] {
  return [
    { conditionCode: 0, imagePath: "/weather-backgrounds/sunny.jpg", description: "Clear sky" },
    { conditionCode: 1, imagePath: "/weather-backgrounds/partly-cloudy.jpg", description: "Mainly clear" },
    { conditionCode: 2, imagePath: "/weather-backgrounds/partly-cloudy.jpg", description: "Partly cloudy" },
    { conditionCode: 3, imagePath: "/weather-backgrounds/overcast.jpg", description: "Overcast" },
    { conditionCode: 45, imagePath: "/weather-backgrounds/overcast.jpg", description: "Foggy" },
    { conditionCode: 48, imagePath: "/weather-backgrounds/overcast.jpg", description: "Depositing rime fog" },
    { conditionCode: 51, imagePath: "/weather-backgrounds/rain.jpg", description: "Light drizzle" },
    { conditionCode: 53, imagePath: "/weather-backgrounds/rain.jpg", description: "Moderate drizzle" },
    { conditionCode: 55, imagePath: "/weather-backgrounds/rain.jpg", description: "Dense drizzle" },
    { conditionCode: 61, imagePath: "/weather-backgrounds/rain.jpg", description: "Slight rain" },
    { conditionCode: 63, imagePath: "/weather-backgrounds/rain.jpg", description: "Moderate rain" },
    { conditionCode: 65, imagePath: "/weather-backgrounds/rain.jpg", description: "Heavy rain" },
    { conditionCode: 71, imagePath: "/weather-backgrounds/snow.jpg", description: "Slight snow" },
    { conditionCode: 73, imagePath: "/weather-backgrounds/snow.jpg", description: "Moderate snow" },
    { conditionCode: 75, imagePath: "/weather-backgrounds/snow.jpg", description: "Heavy snow" },
    { conditionCode: 80, imagePath: "/weather-backgrounds/rain.jpg", description: "Slight rain showers" },
    { conditionCode: 81, imagePath: "/weather-backgrounds/rain.jpg", description: "Moderate rain showers" },
    { conditionCode: 82, imagePath: "/weather-backgrounds/rain.jpg", description: "Violent rain showers" },
    { conditionCode: 85, imagePath: "/weather-backgrounds/snow.jpg", description: "Slight snow showers" },
    { conditionCode: 86, imagePath: "/weather-backgrounds/snow.jpg", description: "Heavy snow showers" },
    { conditionCode: 95, imagePath: "/weather-backgrounds/rain.jpg", description: "Thunderstorm" },
    { conditionCode: 96, imagePath: "/weather-backgrounds/rain.jpg", description: "Thunderstorm with slight hail" },
    { conditionCode: 99, imagePath: "/weather-backgrounds/rain.jpg", description: "Thunderstorm with heavy hail" }
  ];
}
