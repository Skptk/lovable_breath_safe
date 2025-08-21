import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries

interface CacheEntry {
  data: any;
  timestamp: number;
  location: string;
}

// Simple in-memory cache (in production, consider Redis or similar)
const responseCache = new Map<string, CacheEntry>();

interface OpenWeatherMapAirPollution {
  coord: {
    lat: number;
    lon: number;
  };
  list: Array<{
    dt: number;
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
  }>;
}

interface OpenWeatherMapWeather {
  coord: {
    lat: number;
    lon: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility: number;
  sys: {
    sunrise: number;
    sunset: number;
  };
  name: string;
  country?: string;
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

// Cache management functions
function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

function getCachedResponse(cacheKey: string): any | null {
  const entry = responseCache.get(cacheKey);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry;
  }
  return null;
}

function setCachedResponse(cacheKey: string, data: any, location: string): void {
  // Remove oldest entries if cache is full
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    location
  });
}

// Get user location details using OpenWeatherMap reverse geocoding
async function getUserLocationDetails(lat: number, lon: number, apiKey: string): Promise<{
  name: string;
  country: string;
  state?: string;
  city?: string;
  area?: string;
}> {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
    );
    
    if (response.ok) {
      const geoData: GeoLocation[] = await response.json();
      const location = geoData[0];
      
      if (location) {
        return {
          name: location.name || 'Your Location',
          country: location.country || 'Unknown',
          state: location.state,
          city: location.name || 'Your Location',
          area: location.name || 'Your Location'
        };
      }
    }
  } catch (error) {
    console.error('Error getting user location details:', error);
  }
  
  return {
    name: 'Your Location',
    country: 'Unknown',
    state: undefined,
    city: undefined,
    area: undefined
  };
}

// Calculate currency rewards based on points
function calculateCurrencyRewards(points: number): number {
  // $0.1 per 1000 points
  return (points / 1000) * 0.1;
}

// Check if user can withdraw (minimum 500,000 points)
function canWithdraw(points: number): boolean {
  return points >= 500000;
}

serve(async (req) => {
  console.log('=== FUNCTION STARTED - OPENWEATHERMAP VERSION ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }

    // Check cache first for recent requests
    const cacheKey = getCacheKey(lat, lon);
    const cachedResponse = getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      console.log('Returning cached response for location:', cachedResponse.location);
      return new Response(JSON.stringify(cachedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENWEATHERMAP_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
    console.log('Environment variable check:', {
      hasApiKey: !!OPENWEATHERMAP_API_KEY,
      apiKeyLength: OPENWEATHERMAP_API_KEY?.length || 0,
      apiKeyStart: OPENWEATHERMAP_API_KEY?.substring(0, 10) + '...' || 'none'
    });
    
    // Test all environment variables to see what's available
    console.log('All available environment variables:', {
      supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT SET',
      supabaseKey: Deno.env.get('SUPABASE_ANON_KEY') ? 'SET' : 'NOT SET',
      openweathermapKey: Deno.env.get('OPENWEATHERMAP_API_KEY') ? 'SET' : 'NOT SET'
    });
    
    // Debug: List ALL environment variables
    console.log('🔍 DEBUGGING: All environment variable keys available:');
    const envVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'OPENWEATHERMAP_API_KEY', 'OPENAQ_API_KEY'];
    for (const key of envVars) {
      const value = Deno.env.get(key);
      console.log(`  ${key}: ${value ? 'SET' : 'NOT SET'}`);
    }
    
    // Debug: Check for any variations of the key name
    console.log('🔍 DEBUGGING: Checking for key name variations:');
    const possibleKeys = [
      'OPENWEATHERMAP_API_KEY',
      'OPENWEATHERMAP_APIKEY',
      'OPENWEATHER_API_KEY',
      'OPENWEATHER_APIKEY',
      'WEATHER_API_KEY',
      'WEATHER_APIKEY'
    ];
    
    for (const key of possibleKeys) {
      const value = Deno.env.get(key);
      console.log(`  ${key}: ${value ? 'SET (' + value.substring(0, 10) + '...)' : 'NOT SET'}`);
    }
    
    if (!OPENWEATHERMAP_API_KEY) {
      console.log('❌ OpenWeatherMap API key not configured - air quality data unavailable');
      console.log('🔑 To enable air quality monitoring, set OPENWEATHERMAP_API_KEY in Supabase environment variables');
      console.log('📖 Get your API key from: https://openweathermap.org/api');
      
      return new Response(JSON.stringify({
        error: 'OpenWeatherMap API key not configured',
        message: 'Air quality monitoring requires OpenWeatherMap API key configuration',
        instructions: 'Set OPENWEATHERMAP_API_KEY in Supabase environment variables',
        documentation: 'https://openweathermap.org/api'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Proceeding with air quality data collection using OpenWeatherMap...');

    // Get user's location details
    let userLocationDetails;
    
    try {
      console.log('Starting OpenWeatherMap API calls with key:', OPENWEATHERMAP_API_KEY.substring(0, 10) + '...');
      
      userLocationDetails = await getUserLocationDetails(lat, lon, OPENWEATHERMAP_API_KEY);
      console.log('User location details obtained');
      
      // Get air quality data from OpenWeatherMap Air Pollution API
      console.log('Making OpenWeatherMap Air Pollution API call...');
      
      const airPollutionResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`
      );
      
      if (!airPollutionResponse.ok) {
        console.log('❌ Air Pollution API call failed:', airPollutionResponse.status);
        throw new Error(`Air Pollution API failed with status: ${airPollutionResponse.status}`);
      }
      
      const airPollutionData: OpenWeatherMapAirPollution = await airPollutionResponse.json();
      console.log('Air Pollution API call successful, processing data...');
      
      // Get weather data from OpenWeatherMap Weather API
      console.log('Making OpenWeatherMap Weather API call...');
      
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
      );
      
      if (!weatherResponse.ok) {
        console.log('❌ Weather API call failed:', weatherResponse.status);
        throw new Error(`Weather API failed with status: ${weatherResponse.status}`);
      }
      
      const weatherData: OpenWeatherMapWeather = await weatherResponse.json();
      console.log('Weather API call successful, processing data...');
      
      // Process air pollution data
      const airQuality = airPollutionData.list[0];
      const aqi = airQuality.main.aqi;
      
      // Convert OpenWeatherMap AQI (1-5) to standard AQI (0-500)
      let standardAQI: number;
      switch (aqi) {
        case 1: standardAQI = 50; break;   // Good
        case 2: standardAQI = 100; break;  // Moderate
        case 3: standardAQI = 150; break;  // Unhealthy for Sensitive Groups
        case 4: standardAQI = 200; break;  // Unhealthy
        case 5: standardAQI = 300; break;  // Very Unhealthy
        default: standardAQI = 50;
      }
      
      // Extract pollutant values (convert from μg/m³ to μg/m³ - no conversion needed)
      const pm25 = airQuality.components.pm2_5;
      const pm10 = airQuality.components.pm10;
      const no2 = airQuality.components.no2;
      const so2 = airQuality.components.so2;
      const co = airQuality.components.co;
      const o3 = airQuality.components.o3;
      
      console.log('Processed air pollution data:', { 
        openweathermapAQI: aqi, 
        standardAQI, 
        pm25, 
        pm10, 
        no2, 
        so2, 
        co, 
        o3 
      });
      
      // Get user data from Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
      
      let userPoints = 0;
      let currencyRewards = 0;
      let canWithdraw = false;
      let userId = null;
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Get user data from the request headers
          const authHeader = req.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            // Verify the token and get user info
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            
            if (user && !userError) {
              console.log('User authenticated:', user.id);
              userId = user.id;
              
              // Get user's points and rewards
              const { data: userData, error: userDataError } = await supabase
                .from('profiles')
                .select('total_points')
                .eq('user_id', user.id)
                .single();
              
              if (userData && !userDataError) {
                userPoints = userData.total_points || 0;
                currencyRewards = (userData.total_points || 0) / 1000 * 0.1;
                canWithdraw = (userData.total_points || 0) >= 500000;
                console.log('User data retrieved:', { userPoints, currencyRewards, canWithdraw });
              } else {
                console.log('No user profile found, creating default values');
                userPoints = 0;
                currencyRewards = 0;
                canWithdraw = false;
              }
              
              // Save air quality reading to database using the secure function
              try {
                // Use the secure database function to insert the reading
                const { data: insertResult, error: insertError } = await supabase
                  .rpc('insert_air_quality_reading', {
                    p_user_id: user.id,
                    p_latitude: lat,
                    p_longitude: lon,
                    p_location_name: weatherData.name || 'Your Location',
                    p_aqi: standardAQI,
                    p_pm25: pm25 > 0 ? pm25 : null,
                    p_pm10: pm10 > 0 ? pm10 : null,
                    p_pm1: pm25 > 0 ? pm25 * 0.7 : null, // Estimate PM1 from PM2.5
                    p_no2: no2 > 0 ? no2 : null,
                    p_so2: so2 > 0 ? so2 : null,
                    p_co: co > 0 ? co : null,
                    p_o3: o3 > 0 ? o3 : null,
                    p_temperature: weatherData.main.temp || null,
                    p_humidity: weatherData.main.humidity || null,
                    p_pm003: pm25 > 0 ? pm25 * 2 : null, // Estimate PM0.3 from PM2.5
                    p_data_source: 'OpenWeatherMap API'
                  });
                
                if (insertError) {
                  console.log('Error saving reading to database:', insertError.message);
                } else {
                  console.log('Air quality reading saved to database successfully, ID:', insertResult);
                  
                  // Points are now automatically calculated by database trigger based on reading count
                  console.log('Air quality reading saved successfully. Points will be automatically updated by database trigger.');
                }
              } catch (dbSaveError) {
                console.log('Error saving reading to database:', dbSaveError instanceof Error ? dbSaveError.message : String(dbSaveError));
              }
              
            } else {
              console.log('User authentication failed:', userError?.message);
              console.log('Authentication error details:', {
                hasUser: !!user,
                userId: user?.id,
                errorCode: userError?.status,
                errorMessage: userError?.message,
                tokenLength: token?.length || 0
              });
              
              // Continue with anonymous user (no points/rewards tracking)
              console.log('Continuing with anonymous user - no points tracking');
              userId = null;
              userPoints = 0;
              currencyRewards = 0;
              canWithdraw = false;
            }
          } else {
            console.log('No authorization header found');
          }
        } catch (dbError) {
          console.log('Database error:', dbError instanceof Error ? dbError.message : String(dbError));
        }
      }
      
      // Prepare response
      const response = {
        location: weatherData.name || 'Your Location',
        userLocation: userLocationDetails.name,
        coordinates: { lat: weatherData.coord.lat, lon: weatherData.coord.lon },
        userCoordinates: { lat, lon },
        aqi: standardAQI,
        pollutants: {
          pm25,
          pm10,
          no2,
          so2,
          co,
          o3
        },
        environmental: {
          temperature: weatherData.main.temp,
          humidity: weatherData.main.humidity
        },
        weather: {
          condition: weatherData.weather[0]?.main || 'Unknown',
          description: weatherData.weather[0]?.description || 'Unknown',
          pressure: weatherData.main.pressure,
          windSpeed: weatherData.wind.speed,
          windDirection: weatherData.wind.deg,
          visibility: weatherData.visibility / 1000 // Convert m to km
        },
        timestamp: new Date().toISOString(),
        dataSource: 'OpenWeatherMap API',
        userPoints,
        currencyRewards,
        canWithdraw
      };
      
      // Cache the successful response
      setCachedResponse(cacheKey, response, weatherData.name || 'Your Location');
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (apiError) {
      console.log('OpenWeatherMap API error:', apiError instanceof Error ? apiError.message : String(apiError));
      console.log('Full error details:', apiError);
      
      // Check if we have cached data to use instead of fallback
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData && cachedData.data) {
        console.log('Using cached data instead of fallback');
        return new Response(JSON.stringify(cachedData.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('❌ No cached data available - API failure with no fallbacks');
      console.log('🔑 Check OpenWeatherMap API key configuration and network connectivity');
      
      return new Response(JSON.stringify({
        error: 'OpenWeatherMap API failure',
        message: 'Unable to retrieve air quality data - no fallbacks available',
        instructions: 'Check API key configuration and network connectivity',
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in get-air-quality function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});