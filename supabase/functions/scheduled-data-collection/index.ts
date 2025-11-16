import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js'

// ⚠️ TIMEZONE IMPORTANT: This function runs in UTC timezone
// - Supabase cron jobs run in UTC timezone
// - All timestamps are logged in UTC (ISO format)
// - Local time is also logged for debugging purposes
// - Collection interval: 1 minute (60,000 milliseconds)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const COLLECTION_INTERVAL = 60 * 1000; // 1 minute in milliseconds
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
      aqi: number; // 1-5 scale
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

// Convert OpenWeatherMap AQI (1-5) to standard AQI (0-500)
function convertOWMAQIToStandard(owmAQI: number): number {
  const aqiMap: Record<number, number> = {
    1: 50,   // Good
    2: 100,  // Fair
    3: 150,  // Moderate
    4: 200,  // Poor
    5: 300,  // Very Poor
  };
  return aqiMap[owmAQI] || 0;
}

// Helper function to safely extract pollutant values
function extractPollutantValue(value: number | undefined | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 10) / 10; // Round to 1 decimal
  }
  return null;
}

// Helper function to convert timestamp to time string
function timestampToTimeString(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toTimeString().split(' ')[0];
}

// Collect environmental data for a specific city using OpenWeatherMap
async function collectCityData(
  city: { name: string; lat: number; lon: number; country: string },
  openWeatherMapApiKey: string,
  supabase: any
): Promise<GlobalEnvironmentalData | null> {
  try {
    console.log(`🌍 Collecting OpenWeatherMap data for ${city.name}, ${city.country}...`);

    // Fetch air pollution data
    const airPollutionResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${city.lat}&lon=${city.lon}&appid=${openWeatherMapApiKey}`
    );

    if (!airPollutionResponse.ok) {
      console.error(`❌ OpenWeatherMap Air Pollution API failed for ${city.name}:`, airPollutionResponse.status);
      return null;
    }

    const airPollutionData: OpenWeatherMapAirPollution = await airPollutionResponse.json();
    const airQuality = airPollutionData.list?.[0];
    
    if (!airQuality) {
      console.error(`❌ No air pollution data for ${city.name}`);
      return null;
    }

    // Fetch weather data for additional environmental metrics
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${openWeatherMapApiKey}&units=metric`
    );

    let weatherData: OpenWeatherMapWeather | null = null;
    if (weatherResponse.ok) {
      weatherData = await weatherResponse.json();
    } else {
      console.warn(`⚠️ OpenWeatherMap Weather API failed for ${city.name}:`, weatherResponse.status);
    }

    // Extract pollutants
    const components = airQuality.components;
    const pollutants = {
      pm25: extractPollutantValue(components.pm2_5),
      pm10: extractPollutantValue(components.pm10),
      no2: extractPollutantValue(components.no2),
      so2: extractPollutantValue(components.so2),
      co: extractPollutantValue(components.co),
      o3: extractPollutantValue(components.o3),
    };

    console.log(`📊 [${city.name}] OpenWeatherMap pollutants:`, pollutants);

    // Convert AQI from 1-5 scale to 0-500 scale
    const standardAQI = convertOWMAQIToStandard(airQuality.main.aqi);

    // Extract weather data if available
    const weatherCondition = weatherData?.weather?.[0]?.main || null;
    const temperature = weatherData?.main?.temp || null;
    const humidity = weatherData?.main?.humidity || null;
    const airPressure = weatherData?.main?.pressure || null;
    const windSpeed = weatherData?.wind?.speed || null;
    const windDirection = weatherData?.wind?.deg || null;
    const windGust = weatherData?.wind?.gust || null;
    const visibility = weatherData?.visibility ? weatherData.visibility / 1000 : null; // Convert to km
    const feelsLikeTemperature = weatherData?.main?.feels_like || null;
    const sunriseTime = weatherData?.sys?.sunrise 
      ? new Date(weatherData.sys.sunrise * 1000).toTimeString().split(' ')[0]
      : null;
    const sunsetTime = weatherData?.sys?.sunset
      ? new Date(weatherData.sys.sunset * 1000).toTimeString().split(' ')[0]
      : null;

    // Create environmental data object
    const environmentalData: GlobalEnvironmentalData = {
      id: `${city.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      city_name: city.name,
      country: city.country,
      latitude: city.lat,
      longitude: city.lon,
      aqi: standardAQI,
      // Use OpenWeatherMap pollutant data
      pm25: pollutants.pm25,
      pm10: pollutants.pm10,
      no2: pollutants.no2,
      so2: pollutants.so2,
      co: pollutants.co,
      o3: pollutants.o3,
      // Use OpenWeatherMap weather data
      temperature: temperature ? Math.round(temperature * 10) / 10 : null,
      humidity: humidity ? Math.round(humidity * 10) / 10 : null,
      wind_speed: windSpeed ? Math.round(windSpeed * 10) / 10 : null,
      wind_direction: windDirection ? Math.round(windDirection) : null,
      wind_gust: windGust ? Math.round(windGust * 10) / 10 : null,
      air_pressure: airPressure ? Math.round(airPressure) : null,
      visibility: visibility ? Math.round(visibility * 10) / 10 : null,
      weather_condition: weatherCondition,
      feels_like_temperature: feelsLikeTemperature ? Math.round(feelsLikeTemperature * 10) / 10 : null,
      sunrise_time: sunriseTime,
      sunset_time: sunsetTime,
      data_source: 'OpenWeatherMap',
      collection_timestamp: new Date().toISOString(),
      is_active: true
    };

    console.log(`✅ Data collected for ${city.name}: AQI ${standardAQI} (OWM: ${airQuality.main.aqi}), Data Source: OpenWeatherMap`);

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
async function collectAllEnvironmentalData(
  openWeatherMapApiKey: string,
  supabase: any
): Promise<{ collectedData: GlobalEnvironmentalData[]; errors: string[] }> {
  const now = new Date();
  const utcTime = now.toISOString();
  const localTime = now.toString();
  
  console.log('🚀 Starting scheduled OpenWeatherMap data collection...');
  console.log(`📅 Collection time (UTC): ${utcTime}`);
  console.log(`📅 Collection time (Local): ${localTime}`);
  console.log(`🌍 Collecting data for ${MAJOR_CITIES.length} cities...`);
  console.log(`🔑 OpenWeatherMap API: ${openWeatherMapApiKey ? 'Configured' : 'Not configured'}`);

  const collectedData: GlobalEnvironmentalData[] = [];
  const errors: string[] = [];

  // Collect data for each city
  for (const city of MAJOR_CITIES) {
    try {
      const cityData = await collectCityData(city, openWeatherMapApiKey, supabase);
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

  // Calculate next collection time properly
  // Since this function runs every minute via cron, the next collection is exactly 1 minute from now
  const nextCollection = new Date(Date.now() + COLLECTION_INTERVAL);
  const nextCollectionUTC = nextCollection.toISOString();
  const nextCollectionLocal = nextCollection.toString();
  
  console.log(`⏰ Next scheduled collection (UTC): ${nextCollectionUTC}`);
  console.log(`⏰ Next scheduled collection (Local): ${nextCollectionLocal}`);
  console.log(`⏰ Collection interval: ${COLLECTION_INTERVAL / 1000} seconds`);
  console.log(`⏰ Note: This function now runs automatically every minute via Supabase cron`);

  return { collectedData, errors };
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
    const { manual = false, scheduled = false, city = null } = await req.json().catch(() => ({}));

    if (manual && city) {
      // Manual collection for specific city
      console.log(`🏙️ Manual collection requested for city: ${city}`);
      const cityData = MAJOR_CITIES.find(c => c.name.toLowerCase() === city.toLowerCase());
      if (!cityData) {
        return new Response(JSON.stringify({ error: 'City not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const openWeatherMapApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
      
      if (!openWeatherMapApiKey) {
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
      const cityEnvironmentalData = await collectCityData(cityData, openWeatherMapApiKey, supabase);

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

    // Regular scheduled collection (either via cron or manual trigger)
    const executionType = scheduled ? 'Scheduled (Cron)' : 'Manual (Direct)';
    console.log(`🔄 Starting ${executionType} OpenWeatherMap data collection...`);
    
    const openWeatherMapApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
    
    if (!openWeatherMapApiKey) {
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
    const { collectedData, errors } = await collectAllEnvironmentalData(openWeatherMapApiKey, supabase);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${executionType} OpenWeatherMap data collection completed`,
      timestamp: new Date().toISOString(),
      cities_processed: collectedData.length,
      execution_type: executionType,
      errors,
      data: collectedData
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
