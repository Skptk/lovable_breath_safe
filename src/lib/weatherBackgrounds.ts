/**
 * Weather background mapping utility
 * Maps Open-Meteo weather condition codes to background image filenames
 * Includes sunset/sunrise logic and separates fog from overcast
 */

export interface WeatherBackgroundMapping {
  conditionCode: number;
  imagePath: string;
  description: string;
}

/**
 * Determines if it's currently within sunrise/sunset period
 * @param sunriseTime - Sunrise time string (HH:MM format)
 * @param sunsetTime - Sunset time string (HH:MM format)
 * @returns Whether it's currently sunrise/sunset period
 */
export function isSunriseSunsetPeriod(sunriseTime?: string, sunsetTime?: string): boolean {
  if (!sunriseTime || !sunsetTime) {
    return false;
  }

  try {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
    
    // Parse sunrise and sunset times
    const [sunriseHour, sunriseMinute] = sunriseTime.split(':').map(Number);
    const [sunsetHour, sunsetMinute] = sunsetTime.split(':').map(Number);
    
    const sunriseMinutes = sunriseHour * 60 + sunriseMinute;
    const sunsetMinutes = sunsetHour * 60 + sunsetMinute;
    
    // Define sunrise/sunset period (30 minutes before and after)
    const sunrisePeriodStart = sunriseMinutes - 30;
    const sunrisePeriodEnd = sunriseMinutes + 30;
    const sunsetPeriodStart = sunsetMinutes - 30;
    const sunsetPeriodEnd = sunsetMinutes + 30;
    
    // Check if current time is within sunrise or sunset period
    const isSunrisePeriod = currentTime >= sunrisePeriodStart && currentTime <= sunrisePeriodEnd;
    const isSunsetPeriod = currentTime >= sunsetPeriodStart && currentTime <= sunsetPeriodEnd;
    
    return isSunrisePeriod || isSunsetPeriod;
  } catch (error) {
    console.warn('Error parsing sunrise/sunset times:', error);
    return false;
  }
}

/**
 * Maps Open-Meteo weather condition codes to background image filenames
 * @param conditionCode - Open-Meteo weather condition code
 * @param isNight - Whether it's currently night time
 * @param isSunriseSunset - Whether it's currently sunrise/sunset period
 * @returns Background image path
 */
export function getBackgroundImage(
  conditionCode: number, 
  isNight: boolean = false, 
  isSunriseSunset: boolean = false
): string {
  // Sunrise/sunset backgrounds take priority
  if (isSunriseSunset) {
    // Determine if it's closer to sunrise or sunset
    const now = new Date();
    const currentHour = now.getHours();
    
    // Morning hours (5-9 AM) are more likely sunrise, evening hours (5-9 PM) are more likely sunset
    if (currentHour >= 5 && currentHour <= 9) {
      return "/weather-backgrounds/sunrise.webp";
    } else if (currentHour >= 17 && currentHour <= 21) {
      return "/weather-backgrounds/sunset.webp";
    } else {
      // Default to sunset for other times
      return "/weather-backgrounds/sunset.webp";
    }
  }

  // Night backgrounds take priority over weather conditions
  if (isNight) {
    return "/weather-backgrounds/night.webp";
  }

  // Map weather codes to background images
  switch (conditionCode) {
    // Clear sky
    case 0:
      return "/weather-backgrounds/sunny.webp";
    
    // Mainly clear / Partly cloudy
    case 1:
    case 2:
      return "/weather-backgrounds/partly-cloudy.webp";
    
    // Overcast (separate from fog)
    case 3:
      return "/weather-backgrounds/overcast.webp";
    
    // Fog (separate from overcast)
    case 45:
    case 48:
      return "/weather-backgrounds/fog.webp";
    
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
      return "/weather-backgrounds/rain.webp";
    
    // Snow
    case 71: // Slight snow fall
    case 73: // Moderate snow fall
    case 75: // Heavy snow fall
    case 85: // Slight snow showers
    case 86: // Heavy snow showers
      return "/weather-backgrounds/snow.webp";
    
    // Thunderstorm
    case 95: // Thunderstorm
    case 96: // Thunderstorm with slight hail
    case 99: // Thunderstorm with heavy hail
      return "/weather-backgrounds/rain.webp";
    
    // Default fallback
    default:
      return "/weather-backgrounds/partly-cloudy.webp";
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
    
    // Night time is from sunset until sunrise the next day
    // This handles the case where we're after midnight but before sunrise
    if (sunsetMinutes < sunriseMinutes) {
      // Normal case: sunset is before sunrise (e.g., 6 PM to 6 AM)
      // Night time: after sunset OR before sunrise
      return currentTime > sunsetMinutes || currentTime < sunriseMinutes;
    } else {
      // Edge case: sunset is after sunrise (e.g., in polar regions)
      // Night time: before sunrise AND after sunset
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
    { conditionCode: 0, imagePath: "/weather-backgrounds/sunny.webp", description: "Clear sky" },
    { conditionCode: 1, imagePath: "/weather-backgrounds/partly-cloudy.webp", description: "Mainly clear" },
    { conditionCode: 2, imagePath: "/weather-backgrounds/partly-cloudy.webp", description: "Partly cloudy" },
    { conditionCode: 3, imagePath: "/weather-backgrounds/overcast.webp", description: "Overcast" },
    { conditionCode: 45, imagePath: "/weather-backgrounds/fog.webp", description: "Foggy" },
    { conditionCode: 48, imagePath: "/weather-backgrounds/fog.webp", description: "Depositing rime fog" },
    { conditionCode: 51, imagePath: "/weather-backgrounds/rain.webp", description: "Light drizzle" },
    { conditionCode: 53, imagePath: "/weather-backgrounds/rain.webp", description: "Moderate drizzle" },
    { conditionCode: 55, imagePath: "/weather-backgrounds/rain.webp", description: "Dense drizzle" },
    { conditionCode: 61, imagePath: "/weather-backgrounds/rain.webp", description: "Slight rain" },
    { conditionCode: 63, imagePath: "/weather-backgrounds/rain.webp", description: "Moderate rain" },
    { conditionCode: 65, imagePath: "/weather-backgrounds/rain.webp", description: "Heavy rain" },
    { conditionCode: 71, imagePath: "/weather-backgrounds/snow.webp", description: "Slight snow" },
    { conditionCode: 73, imagePath: "/weather-backgrounds/snow.webp", description: "Moderate snow" },
    { conditionCode: 75, imagePath: "/weather-backgrounds/snow.webp", description: "Heavy snow" },
    { conditionCode: 80, imagePath: "/weather-backgrounds/rain.webp", description: "Slight rain showers" },
    { conditionCode: 81, imagePath: "/weather-backgrounds/rain.webp", description: "Moderate rain showers" },
    { conditionCode: 82, imagePath: "/weather-backgrounds/rain.webp", description: "Violent rain showers" },
    { conditionCode: 85, imagePath: "/weather-backgrounds/snow.webp", description: "Slight snow showers" },
    { conditionCode: 86, imagePath: "/weather-backgrounds/snow.webp", description: "Heavy snow showers" },
    { conditionCode: 95, imagePath: "/weather-backgrounds/rain.webp", description: "Thunderstorm" },
    { conditionCode: 96, imagePath: "/weather-backgrounds/rain.webp", description: "Thunderstorm with slight hail" },
    { conditionCode: 99, imagePath: "/weather-backgrounds/rain.webp", description: "Thunderstorm with heavy hail" }
  ];
}
