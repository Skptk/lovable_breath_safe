import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400', // 24 hours
};

interface AQICNResponse {
  status: string;
  data: {
    aqi: number;
    idx: number;
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
    };
    time: {
      s: string; // ISO timestamp
      tz: string;
      v: number; // unix timestamp
    };
  };
}

// Helper function to safely extract AQICN pollutant values
function extractPollutantValue(pollutant: { v: number } | undefined): number | null {
  return pollutant?.v ? Math.round(pollutant.v * 10) / 10 : null; // Round to 1 decimal
}

serve(async (req) => {
  console.log('=== AQICN-ONLY FETCH FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    // Enhanced coordinate validation
    if (!lat || !lon || typeof lat !== 'number' || typeof lon !== 'number') {
      console.error('❌ Missing or invalid coordinates:', { lat, lon });
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Valid coordinates are required for air quality data.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.error('❌ Coordinates out of valid range:', { lat, lon });
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const AQICN_API_KEY = Deno.env.get('AQICN_API_KEY');
    
    if (!AQICN_API_KEY) {
      console.error('❌ AQICN API key not configured');
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Live air quality data unavailable, please check back later.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🌍 Fetching AQICN data for coordinates: ${lat}, ${lon}`);

    // Get air quality data from AQICN
    const aqicnResponse = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQICN_API_KEY}`
    );

    if (!aqicnResponse.ok) {
      console.error(`❌ AQICN API failed:`, aqicnResponse.status, aqicnResponse.statusText);
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Live air quality data unavailable, please check back later.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aqicnData: AQICNResponse = await aqicnResponse.json();

    if (aqicnData.status !== 'ok') {
      console.error(`❌ AQICN API error:`, aqicnData.status);
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Live air quality data unavailable, please check back later.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate AQI data and reject zero values
    if (!aqicnData.data || typeof aqicnData.data.aqi !== 'number') {
      console.error(`❌ Invalid AQICN response structure`);
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Live air quality data unavailable, please check back later.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Reject AQI values of 0 as they indicate unavailable data from AQICN
    if (aqicnData.data.aqi === 0) {
      console.warn(`⚠️ AQICN returned AQI of 0 for coordinates ${lat}, ${lon} - this indicates no data available`);
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Live air quality data unavailable for this location, please try a different area.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process and clean the data - don't clamp 0 to 0 since we've already validated it's not 0
    const aqi = Math.min(500, Math.round(aqicnData.data.aqi)); // Ensure AQI is within valid range (don't set minimum to 0)
    const city = aqicnData.data.city.name || 'Unknown Location';
    const timestamp = new Date().toISOString();

    console.log(`✅ AQICN API Success - Location: ${city}, AQI: ${aqi}, Coordinates: ${lat}, ${lon}`);
    console.log(`📊 Raw AQICN Response - AQI: ${aqicnData.data.aqi}, Dominant Pollutant: ${aqicnData.data.dominentpol}`);

    // Determine dominant pollutant from AQICN response
    let dominantPollutant = aqicnData.data.dominentpol || 'unknown';
    
    // Normalize pollutant names to match expected format
    const pollutantMapping: Record<string, string> = {
      'pm25': 'PM2.5',
      'pm10': 'PM10', 
      'no2': 'NO2',
      'so2': 'SO2',
      'co': 'CO',
      'o3': 'O3'
    };
    
    if (pollutantMapping[dominantPollutant]) {
      dominantPollutant = pollutantMapping[dominantPollutant];
    }

    // Extract pollutant data
    const pollutants = {
      pm25: extractPollutantValue(aqicnData.data.iaqi.pm25),
      pm10: extractPollutantValue(aqicnData.data.iaqi.pm10),
      no2: extractPollutantValue(aqicnData.data.iaqi.no2),
      so2: extractPollutantValue(aqicnData.data.iaqi.so2),
      co: extractPollutantValue(aqicnData.data.iaqi.co),
      o3: extractPollutantValue(aqicnData.data.iaqi.o3),
    };

    // Environmental data (temperature, humidity, pressure from AQICN if available)
    const environmental = {
      temperature: extractPollutantValue(aqicnData.data.iaqi.t),
      humidity: extractPollutantValue(aqicnData.data.iaqi.h),
      pressure: extractPollutantValue(aqicnData.data.iaqi.p),
    };

    const response = {
      aqi,
      city,
      dominantPollutant,
      pollutants,
      environmental,
      timestamp,
      dataSource: 'AQICN'
    };

    console.log(`✅ [DataSourceValidator] dataSource: 'AQICN' - Location: ${city}, AQI: ${aqi}, Dominant: ${dominantPollutant}`);
    console.log(`📊 AQICN data successfully processed:`, {
      city,
      aqi,
      dominantPollutant,
      pm25: pollutants.pm25,
      pm10: pollutants.pm10,
      temperature: environmental.temperature
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in fetchAQI function:', error);
    return new Response(JSON.stringify({ 
      error: true, 
      message: '⚠️ Live air quality data unavailable, please check back later.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});