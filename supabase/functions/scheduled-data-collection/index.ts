import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js'

// ⚠️ TIMEZONE IMPORTANT: This function runs in UTC timezone
// - Supabase cron jobs run in UTC timezone
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

interface AQICNResponse {
  status: string;
  data: {
    aqi: number;
    idx: number;
    attributions: Array<{
      url: string;
      name: string;
      logo?: string;
    }>;
    city: {
      geo: [number, number]; // [lat, lon]
      name: string;
      url: string;
    };
    dominentpol: string;
    iaqi: {
      co?: { v: number };
      h?: { v: number }; // humidity
      no2?: { v: number };
      o3?: { v: number };
      p?: { v: number }; // pressure
      pm10?: { v: number };
      pm25?: { v: number };
      so2?: { v: number };
      t?: { v: number }; // temperature
      w?: { v: number }; // wind speed
      wd?: { v: number }; // wind direction
    };
    time: {
      s: string; // ISO timestamp
      tz: string;
      v: number; // unix timestamp
    };
    forecast?: {
      daily: {
        o3: Array<{ avg: number; day: string; max: number; min: number }>;
        pm10: Array<{ avg: number; day: string; max: number; min: number }>;
        pm25: Array<{ avg: number; day: string; max: number; min: number }>;
      };
    };
  };
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

// Helper function to validate and process AQICN AQI values
function processAQICNAQI(aqicnAQI: number): number {
  // AQICN already provides standard AQI values (0-500 scale)
  // Just validate and ensure reasonable bounds
  if (aqicnAQI < 0) return 0;
  if (aqicnAQI > 500) return 500;
  return Math.round(aqicnAQI);
}

// Helper function to safely extract AQICN pollutant values
function extractPollutantValue(pollutant: { v: number } | undefined): number | null {
  return pollutant?.v ? Math.round(pollutant.v * 10) / 10 : null; // Round to 1 decimal
}

// Helper function to convert timestamp to time string
function timestampToTimeString(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toTimeString().split(' ')[0];
}

// Collect environmental data for a specific city
async function collectCityData(
  city: { name: string; lat: number; lon: number; country: string },
  aqicnApiKey: string,
  supabase: any
): Promise<GlobalEnvironmentalData | null> {
  try {
    console.log(`🌍 Collecting AQICN-only data for ${city.name}, ${city.country}...`);

    // Get air quality data from AQICN
    const aqicnResponse = await fetch(
      `https://api.waqi.info/feed/geo:${city.lat};${city.lon}/?token=${aqicnApiKey}`
    );

    if (!aqicnResponse.ok) {
      console.error(`❌ AQICN API failed for ${city.name}:`, aqicnResponse.status);
      return null;
    }

    const aqicnData: AQICNResponse = await aqicnResponse.json();

    if (aqicnData.status !== 'ok') {
      console.error(`❌ AQICN API error for ${city.name}:`, aqicnData.status);
      return null;
    }

    // Process air quality data from AQICN
    const aqi = processAQICNAQI(aqicnData.data.aqi);

    // Create environmental data object using AQICN ONLY
    const environmentalData: GlobalEnvironmentalData = {
      id: `${city.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      city_name: city.name,
      country: city.country,
      latitude: city.lat,
      longitude: city.lon,
      aqi: aqi,
      // Use AQICN pollutant data
      pm25: extractPollutantValue(aqicnData.data.iaqi.pm25),
      pm10: extractPollutantValue(aqicnData.data.iaqi.pm10),
      no2: extractPollutantValue(aqicnData.data.iaqi.no2),
      so2: extractPollutantValue(aqicnData.data.iaqi.so2),
      co: extractPollutantValue(aqicnData.data.iaqi.co),
      o3: extractPollutantValue(aqicnData.data.iaqi.o3),
      // Use AQICN environmental data (if available)
      temperature: extractPollutantValue(aqicnData.data.iaqi.t),
      humidity: extractPollutantValue(aqicnData.data.iaqi.h),
      wind_speed: null, // AQICN doesn't provide detailed wind data
      wind_direction: null,
      wind_gust: null,
      air_pressure: extractPollutantValue(aqicnData.data.iaqi.p),
      visibility: null, // AQICN doesn't provide visibility
      weather_condition: null, // AQICN doesn't provide weather conditions
      feels_like_temperature: null,
      sunrise_time: null,
      sunset_time: null,
      data_source: 'AQICN',
      collection_timestamp: new Date().toISOString(),
      is_active: true
    };

    console.log(`✅ AQICN-only data collected for ${city.name}: AQI ${aqi}, Temp ${environmentalData.temperature}°C`);

    return environmentalData;
  } catch (error) {
    console.error(`❌ Error collecting AQICN data for ${city.name}:`, error);
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
async function collectAllEnvironmentalData(aqicnApiKey: string, supabase: any): Promise<void> {
  const now = new Date();
  const utcTime = now.toISOString();
  const localTime = now.toString();
  
  console.log('🚀 Starting scheduled AQICN-only environmental data collection...');
  console.log(`📅 Collection time (UTC): ${utcTime}`);
  console.log(`📅 Collection time (Local): ${localTime}`);
  console.log(`🌍 Collecting AQICN data for ${MAJOR_CITIES.length} cities...`);

  const collectedData: GlobalEnvironmentalData[] = [];
  const errors: string[] = [];

  // Collect data for each city
  for (const city of MAJOR_CITIES) {
    try {
      const cityData = await collectCityData(city, aqicnApiKey, supabase);
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
  // Since this function runs every 15 minutes via cron, next collection is exactly 15 minutes from now
  const nextCollection = new Date(Date.now() + COLLECTION_INTERVAL);
  const nextCollectionUTC = nextCollection.toISOString();
  const nextCollectionLocal = nextCollection.toString();
  
  console.log(`⏰ Next scheduled collection (UTC): ${nextCollectionUTC}`);
  console.log(`⏰ Next scheduled collection (Local): ${nextCollectionLocal}`);
  console.log(`⏰ Collection interval: ${COLLECTION_INTERVAL / 1000 / 60} minutes`);
  console.log(`⏰ Note: This function runs automatically every 15 minutes via Supabase cron`);
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

      const aqicnApiKey = Deno.env.get('AQICN_API_KEY');
      
      if (!aqicnApiKey) {
        return new Response(JSON.stringify({ error: 'AQICN API key not configured' }), {
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
      const cityEnvironmentalData = await collectCityData(cityData, aqicnApiKey, supabase);

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
    console.log(`🔄 Starting ${executionType} environmental data collection...`);
    
    const aqicnApiKey = Deno.env.get('AQICN_API_KEY');
    
    if (!aqicnApiKey) {
      console.error('❌ AQICN API key not configured');
      return new Response(JSON.stringify({ 
        error: 'AQICN API key not configured',
        message: 'Scheduled data collection requires AQICN API key configuration'
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
    await collectAllEnvironmentalData(aqicnApiKey, supabase);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${executionType} environmental data collection completed`,
      timestamp: new Date().toISOString(),
      cities_processed: MAJOR_CITIES.length,
      execution_type: executionType
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
