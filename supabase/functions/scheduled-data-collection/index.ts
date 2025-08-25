import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js'

// ⚠️ TIMEZONE IMPORTANT: This function runs in UTC timezone
// - GitHub Actions cron schedule runs in UTC
// - All timestamps are logged in UTC (ISO format)
// - Local time is also logged for debugging purposes
// - Collection interval: 15 minutes (900,000 milliseconds)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const COLLECTION_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAJOR_CITIES = [
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219, country: 'Kenya' },
  { name: 'Mombasa', lat: -4.0435, lon: 39.6682, country: 'Kenya' },
  { name: 'Kisumu', lat: -0.1022, lon: 34.7617, country: 'Kenya' },
  { name: 'Nakuru', lat: -0.3031, lon: 36.0800, country: 'Kenya' },
  { name: 'Eldoret', lat: 0.5204, lon: 35.2699, country: 'Kenya' },
  { name: 'Thika', lat: -1.0333, lon: 37.0833, country: 'Kenya' },
  { name: 'Kakamega', lat: 0.2833, lon: 34.7500, country: 'Kenya' },
  { name: 'Kisii', lat: -0.6833, lon: 34.7667, country: 'Kenya' }
];

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

interface GlobalEnvironmentalData {
  id: string;
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  o3: number | null;
  temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_gust: number | null;
  air_pressure: number | null;
  visibility: number | null;
  weather_condition: string | null;
  feels_like_temperature: number | null;
  sunrise_time: string | null;
  sunset_time: string | null;
  data_source: string;
  collection_timestamp: string;
  is_active: boolean;
}

// Helper function to convert OpenWeatherMap AQI to standard AQI
function convertAQI(openWeatherMapAQI: number): number {
  switch (openWeatherMapAQI) {
    case 1: return 50;   // Good
    case 2: return 100;  // Moderate
    case 3: return 150;  // Unhealthy for Sensitive Groups
    case 4: return 200;  // Unhealthy
    case 5: return 300;  // Very Unhealthy
    default: return 50;
  }
}

// Helper function to convert timestamp to time string
function timestampToTimeString(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toTimeString().split(' ')[0];
}

// Collect environmental data for a specific city
async function collectCityData(
  city: { name: string; lat: number; lon: number; country: string },
  apiKey: string,
  supabase: any
): Promise<GlobalEnvironmentalData | null> {
  try {
    console.log(`🌍 Collecting data for ${city.name}, ${city.country}...`);

    // Get air quality data
    const airPollutionResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}`
    );

    if (!airPollutionResponse.ok) {
      console.error(`❌ Air pollution API failed for ${city.name}:`, airPollutionResponse.status);
      return null;
    }

    const airPollutionData: OpenWeatherMapAirPollution = await airPollutionResponse.json();

    // Get weather data
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${apiKey}&units=metric`
    );

    if (!weatherResponse.ok) {
      console.error(`❌ Weather API failed for ${city.name}:`, weatherResponse.status);
      return null;
    }

    const weatherData: OpenWeatherMapWeather = await weatherResponse.json();

    // Process air quality data
    const airQuality = airPollutionData.list[0];
    const aqi = convertAQI(airQuality.main.aqi);

    // Create environmental data object
    const environmentalData: GlobalEnvironmentalData = {
      id: `${city.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      city_name: city.name,
      country: city.country,
      latitude: city.lat,
      longitude: city.lon,
      aqi: aqi,
      pm25: airQuality.components.pm2_5 > 0 ? airQuality.components.pm2_5 : null,
      pm10: airQuality.components.pm10 > 0 ? airQuality.components.pm10 : null,
      no2: airQuality.components.no2 > 0 ? airQuality.components.no2 : null,
      so2: airQuality.components.so2 > 0 ? airQuality.components.so2 : null,
      co: airQuality.components.co > 0 ? airQuality.components.co : null,
      o3: airQuality.components.o3 > 0 ? airQuality.components.o3 : null,
      temperature: weatherData.main.temp || null,
      humidity: weatherData.main.humidity || null,
      wind_speed: weatherData.wind.speed || null,
      wind_direction: weatherData.wind.deg || null,
      wind_gust: weatherData.wind.gust || null,
      air_pressure: weatherData.main.pressure || null,
      visibility: weatherData.visibility ? weatherData.visibility / 1000 : null, // Convert m to km
      weather_condition: weatherData.weather[0]?.main || null,
      feels_like_temperature: weatherData.main.feels_like || null,
      sunrise_time: weatherData.sys.sunrise ? timestampToTimeString(weatherData.sys.sunrise) : null,
      sunset_time: weatherData.sys.sunset ? timestampToTimeString(weatherData.sys.sunset) : null,
      data_source: 'OpenWeatherMap API',
      collection_timestamp: new Date().toISOString(),
      is_active: true
    };

    console.log(`✅ Data collected for ${city.name}: AQI ${aqi}, Temp ${environmentalData.temperature}°C`);

    return environmentalData;
  } catch (error) {
    console.error(`❌ Error collecting data for ${city.name}:`, error);
    return null;
  }
}

// Store environmental data in database
async function storeEnvironmentalData(
  data: GlobalEnvironmentalData[],
  supabase: any
): Promise<void> {
  try {
    // First, deactivate all existing records
    const { error: deactivateError } = await supabase
      .from('global_environmental_data')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('❌ Error deactivating existing records:', deactivateError);
      return;
    }

    // Insert new records
    const { data: insertResult, error: insertError } = await supabase
      .from('global_environmental_data')
      .insert(data)
      .select();

    if (insertError) {
      console.error('❌ Error inserting environmental data:', insertError);
      return;
    }

    console.log(`✅ Stored ${data.length} environmental data records`);
  } catch (error) {
    console.error('❌ Error storing environmental data:', error);
  }
}

// Main data collection function
async function collectAllEnvironmentalData(apiKey: string, supabase: any): Promise<void> {
  const now = new Date();
  const utcTime = now.toISOString();
  const localTime = now.toString();
  
  console.log('🚀 Starting scheduled environmental data collection...');
  console.log(`📅 Collection time (UTC): ${utcTime}`);
  console.log(`📅 Collection time (Local): ${localTime}`);
  console.log(`🌍 Collecting data for ${MAJOR_CITIES.length} cities...`);

  const collectedData: GlobalEnvironmentalData[] = [];
  const errors: string[] = [];

  // Collect data for each city
  for (const city of MAJOR_CITIES) {
    try {
      const cityData = await collectCityData(city, apiKey, supabase);
      if (cityData) {
        collectedData.push(cityData);
      } else {
        errors.push(`Failed to collect data for ${city.name}`);
      }
    } catch (error) {
      errors.push(`Error collecting data for ${city.name}: ${error}`);
    }

    // Add small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Store collected data
  if (collectedData.length > 0) {
    await storeEnvironmentalData(collectedData, supabase);
  }

  // Log results
  console.log(`📊 Collection complete: ${collectedData.length}/${MAJOR_CITIES.length} cities successful`);
  if (errors.length > 0) {
    console.error('❌ Errors encountered:', errors);
  }

  // Log next scheduled collection with explicit timezone information
  const nextCollection = new Date(Date.now() + COLLECTION_INTERVAL);
  const nextCollectionUTC = nextCollection.toISOString();
  const nextCollectionLocal = nextCollection.toString();
  
  console.log(`⏰ Next scheduled collection (UTC): ${nextCollectionUTC}`);
  console.log(`⏰ Next scheduled collection (Local): ${nextCollectionLocal}`);
  console.log(`⏰ Collection interval: ${COLLECTION_INTERVAL / 1000 / 60} minutes`);
}

serve(async (req) => {
  const functionStartTime = new Date();
  const functionStartUTC = functionStartTime.toISOString();
  const functionStartLocal = functionStartTime.toString();
  
  console.log('=== SCHEDULED DATA COLLECTION FUNCTION STARTED ===');
  console.log(`🕐 Function start time (UTC): ${functionStartUTC}`);
  console.log(`🕐 Function start time (Local): ${functionStartLocal}`);
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if this is a manual trigger or scheduled execution
    const { manual = false, city = null } = await req.json().catch(() => ({}));

    if (manual && city) {
      // Manual collection for specific city
      const cityData = MAJOR_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
      if (!cityData) {
        return new Response(JSON.stringify({ error: 'City not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'OpenWeatherMap API key not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const cityEnvironmentalData = await collectCityData(cityData, apiKey, supabase);

      if (cityEnvironmentalData) {
        await storeEnvironmentalData([cityEnvironmentalData], supabase);
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Data collected for ${city}`,
          data: cityEnvironmentalData 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ 
          error: `Failed to collect data for ${city}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Regular scheduled collection
    const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!apiKey) {
      console.error('❌ OpenWeatherMap API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenWeatherMap API key not configured',
        message: 'Scheduled data collection requires OpenWeatherMap API key configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase configuration missing');
      return new Response(JSON.stringify({ 
        error: 'Supabase configuration missing',
        message: 'Scheduled data collection requires Supabase configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Start data collection
    await collectAllEnvironmentalData(apiKey, supabase);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Scheduled environmental data collection completed',
      timestamp: new Date().toISOString(),
      cities_processed: MAJOR_CITIES.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in scheduled data collection function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      message: 'Scheduled data collection failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
