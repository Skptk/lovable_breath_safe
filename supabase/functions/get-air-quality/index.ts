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

interface CapitalCity {
  name: string;
  lat: number;
  lon: number;
  country: string;
  distance: number;
}

// Major capital cities with their coordinates for AQI data
const CAPITAL_CITIES: CapitalCity[] = [
  // Africa
  { name: "Nairobi", lat: -1.2921, lon: 36.8219, country: "Kenya", distance: 0 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, country: "Egypt", distance: 0 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792, country: "Nigeria", distance: 0 },
  { name: "Johannesburg", lat: -26.2041, lon: 28.0473, country: "South Africa", distance: 0 },
  { name: "Casablanca", lat: 33.5731, lon: -7.5898, country: "Morocco", distance: 0 },
  { name: "Addis Ababa", lat: 9.0320, lon: 38.7489, country: "Ethiopia", distance: 0 },
  { name: "Dar es Salaam", lat: -6.8235, lon: 39.2695, country: "Tanzania", distance: 0 },
  { name: "Khartoum", lat: 15.5007, lon: 32.5599, country: "Sudan", distance: 0 },
  { name: "Algiers", lat: 36.7538, lon: 3.0588, country: "Algeria", distance: 0 },
  { name: "Accra", lat: 5.5600, lon: -0.2057, country: "Ghana", distance: 0 },
  
  // Europe
  { name: "London", lat: 51.5074, lon: -0.1278, country: "United Kingdom", distance: 0 },
  { name: "Paris", lat: 48.8566, lon: 2.3522, country: "France", distance: 0 },
  { name: "Berlin", lat: 52.5200, lon: 13.4050, country: "Germany", distance: 0 },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, country: "Spain", distance: 0 },
  { name: "Rome", lat: 41.9028, lon: 12.4964, country: "Italy", distance: 0 },
  { name: "Amsterdam", lat: 52.3676, lon: 4.9041, country: "Netherlands", distance: 0 },
  { name: "Brussels", lat: 50.8503, lon: 4.3517, country: "Belgium", distance: 0 },
  { name: "Vienna", lat: 48.2082, lon: 16.3738, country: "Austria", distance: 0 },
  { name: "Stockholm", lat: 59.3293, lon: 18.0686, country: "Sweden", distance: 0 },
  { name: "Oslo", lat: 59.9139, lon: 10.7522, country: "Norway", distance: 0 },
  
  // Asia
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, country: "Japan", distance: 0 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074, country: "China", distance: 0 },
  { name: "Seoul", lat: 37.5665, lon: 126.9780, country: "South Korea", distance: 0 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777, country: "India", distance: 0 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025, country: "India", distance: 0 },
  { name: "Bangkok", lat: 13.7563, lon: 100.5018, country: "Thailand", distance: 0 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198, country: "Singapore", distance: 0 },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, country: "Indonesia", distance: 0 },
  { name: "Manila", lat: 14.5995, lon: 120.9842, country: "Philippines", distance: 0 },
  { name: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297, country: "Vietnam", distance: 0 },
  
  // North America
  { name: "New York", lat: 40.7128, lon: -74.0060, country: "United States", distance: 0 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, country: "United States", distance: 0 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298, country: "United States", distance: 0 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832, country: "Canada", distance: 0 },
  { name: "Vancouver", lat: 49.2827, lon: -123.1207, country: "Canada", distance: 0 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, country: "Mexico", distance: 0 },
  { name: "Montreal", lat: 45.5017, lon: -73.5673, country: "Canada", distance: 0 },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194, country: "United States", distance: 0 },
  { name: "Miami", lat: 25.7617, lon: -80.1918, country: "United States", distance: 0 },
  { name: "Houston", lat: 29.7604, lon: -95.3698, country: "United States", distance: 0 },
  
  // South America
  { name: "São Paulo", lat: -23.5505, lon: -46.6333, country: "Brazil", distance: 0 },
  { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, country: "Brazil", distance: 0 },
  { name: "Buenos Aires", lat: -34.6118, lon: -58.3960, country: "Argentina", distance: 0 },
  { name: "Lima", lat: -12.0464, lon: -77.0428, country: "Peru", distance: 0 },
  { name: "Bogotá", lat: 4.7110, lon: -74.0721, country: "Colombia", distance: 0 },
  { name: "Santiago", lat: -33.4489, lon: -70.6693, country: "Chile", distance: 0 },
  { name: "Caracas", lat: 10.4806, lon: -66.9036, country: "Venezuela", distance: 0 },
  { name: "Quito", lat: -0.1807, lon: -78.4678, country: "Ecuador", distance: 0 },
  { name: "Montevideo", lat: -34.9011, lon: -56.1645, country: "Uruguay", distance: 0 },
  { name: "Asunción", lat: -25.2637, lon: -57.5759, country: "Paraguay", distance: 0 },
  
  // Oceania
  { name: "Sydney", lat: -33.8688, lon: 151.2093, country: "Australia", distance: 0 },
  { name: "Melbourne", lat: -37.8136, lon: 144.9631, country: "Australia", distance: 0 },
  { name: "Brisbane", lat: -27.4698, lon: 153.0251, country: "Australia", distance: 0 },
  { name: "Perth", lat: -31.9505, lon: 115.8605, country: "Australia", distance: 0 },
  { name: "Adelaide", lat: -34.9285, lon: 138.6007, country: "Australia", distance: 0 },
  { name: "Auckland", lat: -36.8485, lon: 174.7633, country: "New Zealand", distance: 0 },
  { name: "Wellington", lat: -41.2866, lon: 174.7756, country: "New Zealand", distance: 0 },
  { name: "Honolulu", lat: 21.3099, lon: -157.8581, country: "United States", distance: 0 },
  { name: "Port Moresby", lat: -9.4438, lon: 147.1803, country: "Papua New Guinea", distance: 0 },
  { name: "Suva", lat: -18.1416, lon: 178.4419, country: "Fiji", distance: 0 }
];

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

// Find the nearest capital city to user's location
function findNearestCapitalCity(userLat: number, userLon: number): CapitalCity {
  let nearestCity = CAPITAL_CITIES[0];
  let shortestDistance = Infinity;

  for (const city of CAPITAL_CITIES) {
    const distance = calculateDistance(userLat, userLon, city.lat, city.lon);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestCity = { ...city, distance };
    }
  }

  return nearestCity;
}

// Get user's country from coordinates
async function getUserCountry(lat: number, lon: number, apiKey: string): Promise<string> {
  try {
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
    );
    const geoData: GeoLocation[] = await geoResponse.json();
    return geoData[0]?.country || 'Unknown';
  } catch (error) {
    console.error('Error getting user country:', error);
    return 'Unknown';
  }
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

    // Get user's country
    const userCountry = await getUserCountry(lat, lon, OPENWEATHERMAP_API_KEY);
    
    // Find nearest capital city
    const nearestCapital = findNearestCapitalCity(lat, lon);
    
    // Get air quality data from the nearest capital city (more reliable than user's exact location)
    const airResponse = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${nearestCapital.lat}&lon=${nearestCapital.lon}&appid=${OPENWEATHERMAP_API_KEY}`
    );
    
    if (!airResponse.ok) {
      throw new Error(`OpenWeatherMap API error: ${airResponse.status}`);
    }

    const airData: AirQualityData = await airResponse.json();
    
    if (!airData.list || airData.list.length === 0) {
      throw new Error('No air quality data available');
    }

    const currentData = airData.list[0];
    
    // Create meaningful location description
    const locationDescription = `${nearestCapital.name}, ${nearestCapital.country}`;
    const userLocationDescription = `${userCountry} (${Math.round(nearestCapital.distance)}km from ${nearestCapital.name})`;
    
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
          aqi: currentData.main.aqi,
          pm25: currentData.components.pm2_5,
          pm10: currentData.components.pm10,
          no2: currentData.components.no2,
          so2: currentData.components.so2,
          co: currentData.components.co,
          o3: currentData.components.o3,
          timestamp: new Date().toISOString()
        });

        // Award points if air quality is good (AQI 1 = Good)
        if (currentData.main.aqi === 1) {
          const pointsToAward = 50;
          
          await supabase.from('user_points').insert({
            user_id: user.id,
            points_earned: pointsToAward,
            aqi_value: currentData.main.aqi,
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
      coordinates: { lat: nearestCapital.lat, lon: nearestCapital.lon },
      userCoordinates: { lat, lon },
      aqi: currentData.main.aqi,
      pollutants: {
        pm25: currentData.components.pm2_5,
        pm10: currentData.components.pm10,
        no2: currentData.components.no2,
        so2: currentData.components.so2,
        co: currentData.components.co,
        o3: currentData.components.o3
      },
      timestamp: new Date(currentData.dt * 1000).toISOString(),
      dataSource: `AQI data from ${nearestCapital.name} (${Math.round(nearestCapital.distance)}km away)`
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