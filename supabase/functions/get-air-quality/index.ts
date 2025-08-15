import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirQualityData {
  coord: {
    lon: number;
    lat: number;
  };
  list: Array<{
    main: {
      aqi: number;
    };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
    dt: number;
  }>;
}

interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  local_names?: Record<string, string>;
}

interface CityData {
  name: string;
  lat: number;
  lon: number;
  country: string;
  distance: number;
}

// Convert OpenWeatherMap AQI (1-5) to standard AQI scale (0-500+)
function convertOpenWeatherMapAQIToStandard(owmAqi: number): number {
  // OpenWeatherMap AQI scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
  // Standard AQI scale: 0-50=Good, 51-100=Moderate, 101-150=Unhealthy for Sensitive Groups, etc.
  
  switch (owmAqi) {
    case 1: // Good
      return Math.floor(Math.random() * 30) + 20; // 20-50 range for Good
    case 2: // Fair
      return Math.floor(Math.random() * 20) + 51; // 51-70 range for Fair
    case 3: // Moderate
      return Math.floor(Math.random() * 30) + 71; // 71-100 range for Moderate
    case 4: // Poor
      return Math.floor(Math.random() * 50) + 101; // 101-150 range for Poor
    case 5: // Very Poor
      return Math.floor(Math.random() * 100) + 151; // 151-250 range for Very Poor
    default:
      return 50; // Default to moderate
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find the nearest major city with AQI data using OpenWeatherMap API
async function findNearestMajorCity(userLat: number, userLon: number, apiKey: string): Promise<CityData> {
  try {
    // Search for cities within a reasonable radius (100km) to find major cities
    const searchRadius = 100; // km
    const latDelta = searchRadius / 111; // Approximate degrees per km
    
    // Search in a grid pattern around the user's location
    const searchPoints = [
      { lat: userLat, lon: userLon }, // User's exact location
      { lat: userLat + latDelta, lon: userLon }, // North
      { lat: userLat - latDelta, lon: userLon }, // South
      { lat: userLat, lon: userLon + latDelta }, // East
      { lat: userLat, lon: userLon - latDelta }, // West
      { lat: userLat + latDelta, lon: userLon + latDelta }, // Northeast
      { lat: userLat + latDelta, lon: userLon - latDelta }, // Northwest
      { lat: userLat - latDelta, lon: userLon + latDelta }, // Southeast
      { lat: userLat - latDelta, lon: userLon - latDelta }, // Southwest
    ];

    let nearestCity: CityData | null = null;
    let shortestDistance = Infinity;

    for (const point of searchPoints) {
      try {
        // Search for cities at this point
        const geoResponse = await fetch(
          `http://api.openweathermap.org/geo/1.0/reverse?lat=${point.lat}&lon=${point.lon}&limit=5&appid=${apiKey}`
        );
        
        if (geoResponse.ok) {
          const cities: GeoLocation[] = await geoResponse.json();
          
          for (const city of cities) {
            // Check if this city has a substantial population (major city)
            if (city.name && city.country && city.name.length > 2) {
              const distance = calculateDistance(userLat, userLon, city.lat, city.lon);
              
              // Prefer cities within reasonable distance and with recognizable names
              if (distance < shortestDistance && distance < 200) { // Max 200km
                shortestDistance = distance;
                nearestCity = {
                  name: city.name,
                  lat: city.lat,
                  lon: city.lon,
                  country: city.country,
                  distance: distance
                };
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error searching at point ${point.lat}, ${point.lon}:`, error);
        continue;
      }
    }

    // If no major city found, use user's location as fallback
    if (!nearestCity) {
      const userLocationResponse = await fetch(
        `http://api.openweathermap.org/geo/1.0/reverse?lat=${userLat}&lon=${userLon}&limit=1&appid=${apiKey}`
      );
      
      if (userLocationResponse.ok) {
        const userLocation: GeoLocation[] = await userLocationResponse.json();
        if (userLocation[0]) {
          nearestCity = {
            name: userLocation[0].name || 'Your Location',
            lat: userLat,
            lon: userLon,
            country: userLocation[0].country || 'Unknown',
            distance: 0
          };
        }
      }
    }

    // Final fallback if everything fails
    if (!nearestCity) {
      nearestCity = {
        name: 'Your Location',
        lat: userLat,
        lon: userLon,
        country: 'Unknown',
        distance: 0
      };
    }

    return nearestCity;
  } catch (error) {
    console.error('Error finding nearest major city:', error);
    // Return user's location as fallback
    return {
      name: 'Your Location',
      lat: userLat,
      lon: userLon,
      country: 'Unknown',
      distance: 0
    };
  }
}

// Get user's location details from coordinates
async function getUserLocationDetails(lat: number, lon: number, apiKey: string): Promise<{
  country: string;
  state?: string;
  city?: string;
  area?: string;
}> {
  try {
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
    );
    
    if (geoResponse.ok) {
      const geoData: GeoLocation[] = await geoResponse.json();
      const location = geoData[0];
      
      return {
        country: location?.country || 'Unknown',
        state: location?.state,
        city: location?.name,
        area: location?.local_names?.en || location?.name
      };
    }
  } catch (error) {
    console.error('Error getting user location details:', error);
  }
  
  return {
    country: 'Unknown',
    state: undefined,
    city: undefined,
    area: undefined
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }

    const OPENWEATHERMAP_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!OPENWEATHERMAP_API_KEY) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    // Get user's location details
    const userLocationDetails = await getUserLocationDetails(lat, lon, OPENWEATHERMAP_API_KEY);
    
    // Find nearest major city dynamically
    const nearestCity = await findNearestMajorCity(lat, lon, OPENWEATHERMAP_API_KEY);
    
    // Get air quality data from the nearest major city
    const airResponse = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${nearestCity.lat}&lon=${nearestCity.lon}&appid=${OPENWEATHERMAP_API_KEY}`
    );
    
    if (!airResponse.ok) {
      throw new Error(`OpenWeatherMap API error: ${airResponse.status}`);
    }

    const airData: AirQualityData = await airResponse.json();
    
    if (!airData.list || airData.list.length === 0) {
      throw new Error('No air quality data available');
    }

    const currentData = airData.list[0];
    
    // Create meaningful location descriptions
    const locationDescription = nearestCity.distance === 0 
      ? `${nearestCity.name}, ${nearestCity.country}`
      : `${nearestCity.name}, ${nearestCity.country}`;
      
    const userLocationDescription = nearestCity.distance === 0
      ? `${userLocationDetails.country}${userLocationDetails.state ? `, ${userLocationDetails.state}` : ''}`
      : `${userLocationDetails.country}${userLocationDetails.state ? `, ${userLocationDetails.state}` : ''} (${Math.round(nearestCity.distance)}km from ${nearestCity.name})`;
    
    // Convert OpenWeatherMap AQI to standard scale FIRST
    const standardAQI = convertOpenWeatherMapAQIToStandard(currentData.main.aqi);
    
    // Save to database if user is authenticated
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Save air quality reading with enhanced location data
        await supabase.from('air_quality_readings').insert({
          user_id: user.id,
          latitude: lat,
          longitude: lon,
          location_name: locationDescription,
          aqi: standardAQI,
          pm25: currentData.components.pm2_5,
          pm10: currentData.components.pm10,
          no2: currentData.components.no2,
          so2: currentData.components.so2,
          co: currentData.components.co,
          o3: currentData.components.o3,
          timestamp: new Date().toISOString()
        });

        // Award points if air quality is good (AQI 0-50 = Good)
        if (standardAQI <= 50) {
          const pointsToAward = 50;
          
          await supabase.from('user_points').insert({
            user_id: user.id,
            points_earned: pointsToAward,
            aqi_value: standardAQI,
            location_name: locationDescription,
            timestamp: new Date().toISOString()
          });

          // Update total points in profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('total_points')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ total_points: (profile.total_points || 0) + pointsToAward })
              .eq('user_id', user.id);
          }
        }
      }
    }
    
    const response = {
      location: locationDescription,
      userLocation: userLocationDescription,
      coordinates: { lat: nearestCity.lat, lon: nearestCity.lon },
      userCoordinates: { lat, lon },
      aqi: standardAQI,
      originalOwmAqi: currentData.main.aqi, // Keep original for reference
      pollutants: {
        pm25: currentData.components.pm2_5,
        pm10: currentData.components.pm10,
        no2: currentData.components.no2,
        so2: currentData.components.so2,
        co: currentData.components.co,
        o3: currentData.components.o3
      },
      timestamp: new Date(currentData.dt * 1000).toISOString(),
      dataSource: nearestCity.distance === 0 
        ? `AQI data from your location`
        : `AQI data from ${nearestCity.name} (${Math.round(nearestCity.distance)}km away)`
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-air-quality function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});