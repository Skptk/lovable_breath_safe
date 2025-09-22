import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Configuration constants
const CONFIG = {
  MAX_ACCEPTABLE_DISTANCE: 1000, // km (increased from 200)
  MAX_CANDIDATES: 10
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

interface AQICNStation {
  uid: number;
  aqi: string | number;
  time: {
    tz: string;
    stime: string;
    vtime: number;
  };
  station: {
    name: string;
    geo: [number, number];
    url: string;
    country?: string;
  };
}

interface StationCandidate {
  uid: number;
  name: string;
  sLat: number;
  sLon: number;
  computedDistance: number;
  aqi: number;
  country?: string;
  raw: AQICNStation;
}

// Haversine distance calculation
function toRadians(deg: number): number {
  return deg * Math.PI / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Country detection using reverse geocoding
async function detectCountry(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      { headers: { 'User-Agent': 'BreathSafe-AirQuality/1.0' } }
    );
    
    if (response.ok) {
      const data = await response.json();
      const country = data.address?.country_code?.toUpperCase();
      if (country) {
        console.log(`🌍 Detected country: ${country} for coordinates ${lat}, ${lon}`);
        return country;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Reverse geocoding failed for ${lat}, ${lon}:`, error.message);
  }
  
  // Fallback to IP-based detection could be added here
  console.log(`🌍 Country detection failed, using default`);
  return 'UNKNOWN';
}

// Helper function to safely extract AQICN pollutant values
function extractPollutantValue(pollutant: { v: number } | undefined): number | null {
  return pollutant?.v ? Math.round(pollutant.v * 10) / 10 : null; // Round to 1 decimal
}

serve(async (req) => {
  const startTime = Date.now();
  console.log('\n=== FETCHAQI WITH STATION DISCOVERY STARTED ===');
  console.log(`🕰️ Request timestamp: ${new Date().toISOString()}`);
  console.log(`🔍 Request method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Strict request logging
    const requestBody = await req.json();
    const { lat, lon } = requestBody;
    
    console.log(`📝 Request body:`, { lat, lon, origin: 'fetchAQI', timestamp: new Date().toISOString() });
    
    // Enhanced coordinate validation with detailed logging
    if (!lat || !lon || typeof lat !== 'number' || typeof lon !== 'number') {
      console.error('❌ Missing or invalid coordinates:', { lat, lon, type_lat: typeof lat, type_lon: typeof lon });
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Valid coordinates are required for air quality data.',
        code: 'INVALID_COORDINATES'
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
        message: '⚠️ Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).',
        code: 'INVALID_RANGE'
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
        message: '⚠️ Live air quality data unavailable, please check back later.',
        code: 'API_KEY_MISSING'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  console.log(`🌍 Fetching station data for coordinates: ${lat}, ${lon}`);
  // Extra logging for debugging coordinate issues
  console.log(`[DEBUG] Received coordinates:`, { lat, lon });

    // Step 2: Get nearby stations using mapq/nearby endpoint
    console.log('🔍 Fetching nearby stations with mapq/nearby...');
    const nearbyUrl = `https://api.waqi.info/mapq/nearby/?latlng=${lat},${lon}&token=${AQICN_API_KEY}`;
    const nearbyResponse = await fetch(nearbyUrl);

    if (!nearbyResponse.ok) {
      console.error(`❌ AQICN mapq/nearby API failed:`, nearbyResponse.status, nearbyResponse.statusText);
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ Live air quality data unavailable, please check back later.',
        code: 'NEARBY_API_FAILED'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nearbyData = await nearbyResponse.json();
    console.log(`📊 Nearby stations response status: ${nearbyData.status}`);
    
    if (nearbyData.status !== 'ok' || !nearbyData.data || nearbyData.data.length === 0) {
      console.error(`❌ No nearby stations found:`, nearbyData.status);
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ No air quality monitoring stations found for this location.',
        code: 'NO_STATIONS_FOUND'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stations: AQICNStation[] = nearbyData.data;
    console.log(`📋 Found ${stations.length} nearby stations`);
    stations.forEach((s, idx) => {
      console.log(`[DEBUG] Station #${idx + 1}:`, {
        uid: s.uid,
        name: s.station?.name,
        geo: s.station?.geo,
        country: s.station?.country,
        aqi: s.aqi
      });
    });

    // Step 3: Compute distances server-side and filter candidates
    const candidates: StationCandidate[] = stations
      .map(s => {
        // Extract station coordinates from various possible fields
        let sLat: number | null = null;
        let sLon: number | null = null;
        
        if (s.station && s.station.geo && Array.isArray(s.station.geo) && s.station.geo.length >= 2) {
          sLat = s.station.geo[0];
          sLon = s.station.geo[1];
        }
        
        // Parse AQI value
        let aqiValue = 0;
        if (typeof s.aqi === 'number') {
          aqiValue = s.aqi;
        } else if (typeof s.aqi === 'string' && s.aqi !== '-' && !isNaN(Number(s.aqi))) {
          aqiValue = Number(s.aqi);
        }
        
        const computedDistance = (sLat !== null && sLon !== null) ? 
          haversineKm(lat, lon, sLat, sLon) : Infinity;
          
        return {
          uid: s.uid,
          name: s.station?.name || `Station ${s.uid}`,
          sLat: sLat || 0,
          sLon: sLon || 0,
          computedDistance,
          aqi: aqiValue,
          country: s.station?.country,
          raw: s
        };
      })
      .filter(c => {
        // Filter out invalid candidates
            const isValid = Number.isFinite(c.computedDistance) &&
                           c.computedDistance < 10000 && // Defensive max distance
                           c.aqi >= 0; // Accept AQI of 0 or higher
                       
        if (!isValid) {
          console.log(`⚠️ Skipping invalid candidate: ${c.name} (distance: ${c.computedDistance}km, aqi: ${c.aqi})`);
        }
        
        return isValid;
      })
// (removed duplicate/erroneous isValid assignment)
    candidates.forEach((c, idx) => {
      console.log(`  ${idx + 1}. ${c.name} - Distance: ${c.computedDistance.toFixed(2)}km, AQI: ${c.aqi}, UID: ${c.uid}`);
    });

    if (candidates.length === 0) {
      console.error('❌ No valid station candidates found after filtering');
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ No valid air quality monitoring stations found for this location.',
        code: 'NO_VALID_CANDIDATES'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Country detection for better station selection
    const userCountry = await detectCountry(lat, lon);
    
    // Step 5: Select primary and fallback stations with country preference
    let primary = candidates[0];
    let fallback = candidates.length > 1 ? candidates[1] : null;
    
    // If primary station is too far or in different country, try to find better options
    if (primary.computedDistance > CONFIG.MAX_ACCEPTABLE_DISTANCE || 
        (userCountry !== 'UNKNOWN' && primary.country && primary.country !== userCountry)) {
      
      // Look for stations in the same country
      const sameCountryStations = candidates.filter(c => 
        userCountry !== 'UNKNOWN' && c.country && c.country === userCountry
      );
      
      if (sameCountryStations.length > 0) {
        console.log(`🌍 Found ${sameCountryStations.length} stations in user's country (${userCountry})`);
        primary = sameCountryStations[0];
        fallback = sameCountryStations.length > 1 ? sameCountryStations[1] : candidates[1];
      }
    }
    
    const selectionReason = primary.computedDistance > CONFIG.MAX_ACCEPTABLE_DISTANCE ? 
        `Primary selected: nearest available at ${primary.computedDistance.toFixed(1)}km (>1000km threshold)` :
      `Primary selected: nearest within ${primary.computedDistance.toFixed(1)}km`;
      
    const fallbackReason = fallback ? 
      `; Fallback selected: next nearest at ${fallback.computedDistance.toFixed(1)}km` : 
      '; No fallback available';
    
      console.log(`� Station selection: ${selectionReason}${fallbackReason}`);
    
    // Step 6: Fetch detailed data from primary station
    console.log(`🔍 Fetching detailed data from primary station: ${primary.name} (UID: ${primary.uid})`);
    
    const primaryUrl = `https://api.waqi.info/feed/@${primary.uid}/?token=${AQICN_API_KEY}`;
    const primaryResponse = await fetch(primaryUrl);
    
    if (!primaryResponse.ok) {
      console.warn(`⚠️ Primary station fetch failed, trying fallback...`);
      
      if (fallback) {
        console.log(`🔍 Trying fallback station: ${fallback.name} (UID: ${fallback.uid})`);
        const fallbackUrl = `https://api.waqi.info/feed/@${fallback.uid}/?token=${AQICN_API_KEY}`;
        const fallbackResponse = await fetch(fallbackUrl);
        
        if (fallbackResponse.ok) {
          primary = fallback; // Use fallback as primary
          const fallbackData: AQICNResponse = await fallbackResponse.json();
          
          if (fallbackData.status === 'ok' && fallbackData.data && fallbackData.data.aqi > 0) {
            console.log(`✅ Fallback station successful: ${primary.name}`);
          } else {
            console.error('❌ Fallback station also returned invalid data');
            return new Response(JSON.stringify({ 
              error: true, 
              message: '⚠️ Live air quality data unavailable, please check back later.',
              code: 'ALL_STATIONS_FAILED'
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.error('❌ Both primary and fallback stations failed');
          return new Response(JSON.stringify({ 
            error: true, 
            message: '⚠️ Live air quality data unavailable, please check back later.',
            code: 'ALL_STATIONS_FAILED'
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        console.error('❌ Primary station failed and no fallback available');
        return new Response(JSON.stringify({ 
          error: true, 
          message: '⚠️ Live air quality data unavailable, please check back later.',
          code: 'PRIMARY_FAILED_NO_FALLBACK'
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const primaryData: AQICNResponse = await primaryResponse.json();
      
      if (primaryData.status !== 'ok' || !primaryData.data || primaryData.data.aqi === 0) {
        console.warn(`⚠️ Primary station returned invalid data (AQI: ${primaryData.data?.aqi})`);
        
        // Try fallback if available
        if (fallback) {
          console.log(`🔍 Trying fallback due to invalid primary data: ${fallback.name} (UID: ${fallback.uid})`);
          const fallbackUrl = `https://api.waqi.info/feed/@${fallback.uid}/?token=${AQICN_API_KEY}`;
          const fallbackResponse = await fetch(fallbackUrl);
          
          if (fallbackResponse.ok) {
            const fallbackData: AQICNResponse = await fallbackResponse.json();
            
            if (fallbackData.status === 'ok' && fallbackData.data && fallbackData.data.aqi > 0) {
              console.log(`✅ Fallback station successful due to invalid primary: ${fallback.name}`);
              primary = fallback; // Use fallback as primary for processing
              // Continue to final processing with valid fallback data
            } else {
              console.error('❌ Fallback station also returned invalid data');
              return new Response(JSON.stringify({ 
                error: true, 
                message: '⚠️ Live air quality data unavailable for this location, please try a different area.',
                code: 'ALL_STATIONS_INVALID'
              }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            console.error('❌ Fallback station request failed');
            return new Response(JSON.stringify({ 
              error: true, 
              message: '⚠️ Live air quality data unavailable for this location, please try a different area.',
              code: 'FALLBACK_REQUEST_FAILED'
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          console.error('❌ Primary station returned invalid data and no fallback available');
        }
        
        return new Response(JSON.stringify({ 
          error: true, 
          message: '⚠️ Live air quality data unavailable for this location, please try a different area.',
          code: 'INVALID_AQI_DATA'
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Final fetch for the selected station
    const finalUrl = `https://api.waqi.info/feed/@${primary.uid}/?token=${AQICN_API_KEY}`;
    const finalResponse = await fetch(finalUrl);
    const finalData: AQICNResponse = await finalResponse.json();
    
    if (finalData.status !== 'ok' || !finalData.data) {
      throw new Error('Final station fetch failed');
    }

    // Process and clean the data
    const aqi = Math.min(500, Math.round(finalData.data.aqi));
    const city = finalData.data.city.name || primary.name;
    const timestamp = new Date().toISOString();
    const chosenType = fallback && primary.uid === fallback.uid ? 'fallback' : 'primary';

    console.log(`✅ AQICN API Success - Station: ${primary.name}, Location: ${city}, AQI: ${aqi}, Distance: ${primary.computedDistance.toFixed(2)}km`);
    
    // Extract pollutant data
    const pollutants = {
      pm25: extractPollutantValue(finalData.data.iaqi.pm25),
      pm10: extractPollutantValue(finalData.data.iaqi.pm10),
      no2: extractPollutantValue(finalData.data.iaqi.no2),
      so2: extractPollutantValue(finalData.data.iaqi.so2),
      co: extractPollutantValue(finalData.data.iaqi.co),
      o3: extractPollutantValue(finalData.data.iaqi.o3),
    };

    // Environmental data
    const environmental = {
      temperature: extractPollutantValue(finalData.data.iaqi.t),
      humidity: extractPollutantValue(finalData.data.iaqi.h),
      pressure: extractPollutantValue(finalData.data.iaqi.p),
    };

    // Determine dominant pollutant
    let dominantPollutant = finalData.data.dominentpol || 'unknown';
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

    // Create comprehensive response with metadata
    const response = {
      aqi,
      city,
      stationUid: primary.uid,
      stationName: primary.name,
      stationLat: primary.sLat,
      stationLon: primary.sLon,
      computedDistanceKm: Number(primary.computedDistance.toFixed(2)),
      dominantPollutant,
      pollutants,
      environmental,
      timestamp,
      dataSource: 'AQICN',
      meta: {
        chosen: chosenType,
        userCountry,
        selectionReason: `${selectionReason}${fallbackReason}`,
        candidates: candidates.slice(0, 5).map(c => ({
          uid: c.uid,
          name: c.name,
          sLat: c.sLat,
          sLon: c.sLon,
          computedDistance: Number(c.computedDistance.toFixed(2)),
          country: c.country
        })),
        processingTime: Date.now() - startTime
      }
    };

    console.log(`✅ [DataSourceValidator] dataSource: 'AQICN' - Station: ${primary.name}, AQI: ${aqi}, Distance: ${primary.computedDistance.toFixed(2)}km, UID: ${primary.uid}`);
    console.log(`📋 Response meta:`, {
      chosen: chosenType,
      userCountry,
      candidatesCount: candidates.length,
      processingTime: `${Date.now() - startTime}ms`
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in fetchAQI function:', error);
    return new Response(JSON.stringify({ 
      error: true, 
      message: '⚠️ Live air quality data unavailable, please check back later.',
      code: 'INTERNAL_ERROR',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});