import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

interface AQICNResponse {
  status: string;
  data: {
    aqi: number;
    idx: number;
    city: { geo: [number, number]; name: string; url: string; };
    dominentpol: string;
    iaqi: {
      co?: { v: number }; h?: { v: number }; no2?: { v: number };
      o3?: { v: number }; p?: { v: number }; pm10?: { v: number };
      pm25?: { v: number }; so2?: { v: number }; t?: { v: number };
    };
    time: { s: string; tz: string; v: number; };
  };
}

function extractPollutantValue(pollutant: { v: number } | undefined): number | null {
  return pollutant?.v ? Math.round(pollutant.v * 10) / 10 : null;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function getCountryFromCoordinates(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (!response.ok) throw new Error('Geocoding failed');
    const data = await response.json();
    return data.countryCode || 'US';
  } catch (error) {
    console.warn(`Failed to get country for ${lat}, ${lon}:`, error.message);
    return 'US';
  }
}

serve(async (req) => {
  console.log('=== ENHANCED AQICN FUNCTION STARTED ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    if (!lat || !lon || typeof lat !== 'number' || typeof lon !== 'number') {
      return new Response(JSON.stringify({ error: true, message: 'Valid coordinates required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return new Response(JSON.stringify({ error: true, message: 'Invalid coordinate ranges.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const AQICN_API_KEY = Deno.env.get('AQICN_API_KEY');
    if (!AQICN_API_KEY) {
      return new Response(JSON.stringify({ error: true, message: 'Service unavailable.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Enhanced AQICN lookup for: ${lat}, ${lon}`);
    
    // Try direct coordinate lookup first
    const directResponse = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQICN_API_KEY}`);
    
    if (directResponse.ok) {
      const directData: AQICNResponse = await directResponse.json();
      
      if (directData.status === 'ok' && directData.data && directData.data.aqi > 0) {
        const aqi = Math.min(500, Math.round(directData.data.aqi));
        const city = directData.data.city.name || 'Unknown Location';
        
        const pollutants = {
          pm25: extractPollutantValue(directData.data.iaqi.pm25),
          pm10: extractPollutantValue(directData.data.iaqi.pm10),
          no2: extractPollutantValue(directData.data.iaqi.no2),
          so2: extractPollutantValue(directData.data.iaqi.so2),
          co: extractPollutantValue(directData.data.iaqi.co),
          o3: extractPollutantValue(directData.data.iaqi.o3),
        };

        const environmental = {
          temperature: extractPollutantValue(directData.data.iaqi.t),
          humidity: extractPollutantValue(directData.data.iaqi.h),
          pressure: extractPollutantValue(directData.data.iaqi.p),
        };

        const response = {
          aqi, city, stationName: city, distance: '0.0',
          country: await getCountryFromCoordinates(lat, lon),
          dominantPollutant: directData.data.dominentpol || 'unknown',
          pollutants, environmental, timestamp: new Date().toISOString(),
          dataSource: 'AQICN',
          coordinates: {
            user: { lat, lon },
            station: { lat: directData.data.city.geo[0], lon: directData.data.city.geo[1] }
          }
        };

        console.log(`Direct AQICN Success - Location: ${city}, AQI: ${aqi}`);
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Fallback to station discovery if direct lookup fails
    const country = await getCountryFromCoordinates(lat, lon);
    const searchResponse = await fetch(`https://api.waqi.info/search/?token=${AQICN_API_KEY}&keyword=${country}`);
    
    if (!searchResponse.ok) {
      return new Response(JSON.stringify({ error: true, message: 'Service temporarily unavailable.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const searchData = await searchResponse.json();
    
    if (searchData.status !== 'ok' || !searchData.data || searchData.data.length === 0) {
      return new Response(JSON.stringify({ error: true, message: `No stations available for ${country}.` }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Find closest valid stations
    const validStations = searchData.data
      .filter(station => station.aqi && station.aqi !== '-' && !isNaN(Number(station.aqi)) && Number(station.aqi) > 0)
      .map(station => ({ ...station, distance: calculateDistance(lat, lon, station.station.geo[0], station.station.geo[1]) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    
    if (validStations.length === 0) {
      return new Response(JSON.stringify({ error: true, message: 'No monitoring stations available.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Try to get detailed data from closest stations
    for (const station of validStations) {
      try {
        const detailResponse = await fetch(`https://api.waqi.info/feed/@${station.uid}/?token=${AQICN_API_KEY}`);
        if (!detailResponse.ok) continue;
        
        const detailData: AQICNResponse = await detailResponse.json();
        if (detailData.status === 'ok' && detailData.data && detailData.data.aqi > 0) {
          const data = detailData.data;
          
          const response = {
            aqi: Math.min(500, Math.round(data.aqi)),
            city: data.city.name || station.station.name,
            stationName: station.station.name,
            distance: station.distance.toFixed(2),
            country: country,
            dominantPollutant: data.dominentpol || 'unknown',
            pollutants: {
              pm25: extractPollutantValue(data.iaqi.pm25),
              pm10: extractPollutantValue(data.iaqi.pm10),
              no2: extractPollutantValue(data.iaqi.no2),
              so2: extractPollutantValue(data.iaqi.so2),
              co: extractPollutantValue(data.iaqi.co),
              o3: extractPollutantValue(data.iaqi.o3),
            },
            environmental: {
              temperature: extractPollutantValue(data.iaqi.t),
              humidity: extractPollutantValue(data.iaqi.h),
              pressure: extractPollutantValue(data.iaqi.p),
            },
            timestamp: new Date().toISOString(),
            dataSource: 'AQICN',
            coordinates: {
              user: { lat, lon },
              station: { lat: data.city.geo[0], lon: data.city.geo[1] }
            }
          };

          console.log(`Enhanced AQICN Success - Station: ${station.station.name}, AQI: ${response.aqi}`);
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        continue;
      }
    }
    
    return new Response(JSON.stringify({ error: true, message: 'Data temporarily unavailable.' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Enhanced AQICN error:', error);
    return new Response(JSON.stringify({ error: true, message: 'Service error.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});