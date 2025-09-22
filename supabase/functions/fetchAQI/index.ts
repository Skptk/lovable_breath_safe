// Comprehensive global city lookup table for AQICN city slugs
const CITY_LOOKUP_TABLE = [
  { name: 'Nairobi', slug: 'nairobi', lat: -1.2921, lon: 36.8219 },
  { name: 'New York', slug: 'newyork', lat: 40.7128, lon: -74.0060 },
  { name: 'London', slug: 'london', lat: 51.5074, lon: -0.1278 },
  { name: 'Delhi', slug: 'delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Tokyo', slug: 'tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'São Paulo', slug: 'saopaulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Beijing', slug: 'beijing', lat: 39.9042, lon: 116.4074 },
  { name: 'Paris', slug: 'paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Los Angeles', slug: 'losangeles', lat: 34.0522, lon: -118.2437 },
  { name: 'Cairo', slug: 'cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Moscow', slug: 'moscow', lat: 55.7558, lon: 37.6173 },
  { name: 'Sydney', slug: 'sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Mexico City', slug: 'mexicocity', lat: 19.4326, lon: -99.1332 },
  { name: 'Istanbul', slug: 'istanbul', lat: 41.0082, lon: 28.9784 },
  { name: 'Johannesburg', slug: 'johannesburg', lat: -26.2041, lon: 28.0473 },
  { name: 'Toronto', slug: 'toronto', lat: 43.6532, lon: -79.3832 },
  { name: 'Bangkok', slug: 'bangkok', lat: 13.7563, lon: 100.5018 },
  { name: 'Singapore', slug: 'singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Lagos', slug: 'lagos', lat: 6.5244, lon: 3.3792 },
  { name: 'Cape Town', slug: 'capetown', lat: -33.9249, lon: 18.4241 },
  { name: 'Buenos Aires', slug: 'buenosaires', lat: -34.6037, lon: -58.3816 },
  { name: 'Berlin', slug: 'berlin', lat: 52.52, lon: 13.405 },
  { name: 'Madrid', slug: 'madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', slug: 'rome', lat: 41.9028, lon: 12.4964 },
  { name: 'Seoul', slug: 'seoul', lat: 37.5665, lon: 126.9780 },
  { name: 'Jakarta', slug: 'jakarta', lat: -6.2088, lon: 106.8456 },
  { name: 'Hong Kong', slug: 'hongkong', lat: 22.3193, lon: 114.1694 },
  { name: 'Dubai', slug: 'dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Riyadh', slug: 'riyadh', lat: 24.7136, lon: 46.6753 },
  { name: 'Kuala Lumpur', slug: 'kualalumpur', lat: 3.139, lon: 101.6869 },
  // ...add more as needed for global coverage
];

function findNearestCity(lat: number, lon: number) {
  let minDist = Infinity;
  let nearest = null;
  for (const city of CITY_LOOKUP_TABLE) {
    const d = haversineKm(lat, lon, city.lat, city.lon);
    if (d < minDist) {
      minDist = d;
      nearest = city;
    }
  }
  return nearest;
}
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
    if (error instanceof Error) {
      console.warn(`⚠️ Reverse geocoding failed for ${lat}, ${lon}:`, error.message);
    } else {
      console.warn(`⚠️ Reverse geocoding failed for ${lat}, ${lon}:`, error);
    }
  }
  
  // Fallback to IP-based detection could be added here
  console.log(`🌍 Country detection failed, using default`);
  return 'UNKNOWN';
}

// Helper function to safely extract AQICN pollutant values
function extractPollutantValue(pollutant: { v: number } | undefined): number | null {
  return pollutant?.v ? Math.round(pollutant.v * 10) / 10 : null; // Round to 1 decimal
}

serve(async (req: Request) => {
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
    let stations: AQICNStation[] = [];
    let usedFallback = false;
    let nearbyData: any = null;
    let country = '';
    let status = '';
    let searchData: any = null;

    const nearbyResponse = await fetch(nearbyUrl);
    if (nearbyResponse.ok) {
      nearbyData = await nearbyResponse.json();
      status = nearbyData.status;
      console.log(`📊 Nearby stations response status: ${status}`);
      if (status === 'ok' && nearbyData.data && nearbyData.data.length > 0) {
        stations = nearbyData.data;
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
      }
    }

    // Fallback: If /mapq/nearby fails or returns no stations, try /search/?keyword=country
    if (!stations.length) {
      usedFallback = true;
      country = await detectCountry(lat, lon);
      console.log(`🔍 Fallback: Fetching stations with /search/?keyword=${country}`);
      const searchUrl = `https://api.waqi.info/search/?token=${AQICN_API_KEY}&keyword=${country}`;
      const searchResponse = await fetch(searchUrl);
      if (searchResponse.ok) {
        searchData = await searchResponse.json();
        if (searchData.status === 'ok' && searchData.data && searchData.data.length > 0) {
          stations = searchData.data;
          console.log(`📋 Fallback found ${stations.length} stations in country search`);
          stations.forEach((s, idx) => {
            console.log(`[DEBUG] Fallback Station #${idx + 1}:`, {
              uid: s.uid,
              name: s.station?.name,
              geo: s.station?.geo,
              country: s.station?.country,
              aqi: s.aqi
            });
          });
        } else {
          console.error(`❌ Fallback /search/ found no stations:`, searchData.status);
        }
      } else {
        console.error(`❌ Fallback /search/ API failed:`, searchResponse.status, searchResponse.statusText);
      }
    }

    if (!stations.length) {
      // Final fallback: try direct geo lookup for the user's coordinates
      console.log('🌍 Final fallback: trying direct /feed/geo:lat;lon/ for user coordinates');
      const directUrl = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQICN_API_KEY}`;
      const directResponse = await fetch(directUrl);
      if (directResponse.ok) {
        const directData = await directResponse.json();
        if (directData.status === 'ok' && directData.data) {
          console.log('✅ Final fallback succeeded: direct geo AQI data found');
          // Return the direct AQI data in the same format as other responses
          const aqi = Math.min(500, Math.round(directData.data.aqi));
          const city = directData.data.city?.name || 'Unknown Location';
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
            aqi,
            city,
            stationName: city,
            distance: '0.0',
            country: await detectCountry(lat, lon),
            dominantPollutant: directData.data.dominentpol || 'unknown',
            pollutants,
            environmental,
            timestamp: new Date().toISOString(),
            dataSource: 'AQICN',
            coordinates: {
              user: { lat, lon },
              station: { lat: directData.data.city?.geo?.[0] || lat, lon: directData.data.city?.geo?.[1] || lon }
            },
            meta: {
              fallback: 'direct-geo',
              processingTime: Date.now() - startTime
            }
          };
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // If even direct fails, try nearest city in lookup table
      console.log('🌍 Final fallback: trying nearest city in global lookup table');
      const nearestCity = findNearestCity(lat, lon);
      if (nearestCity) {
        const cityUrl = `https://api.waqi.info/feed/${nearestCity.slug}/?token=${AQICN_API_KEY}`;
        const cityResponse = await fetch(cityUrl);
        if (cityResponse.ok) {
          const cityData = await cityResponse.json();
          if (cityData.status === 'ok' && cityData.data) {
            console.log(`✅ Final fallback succeeded: AQI data found for nearest city: ${nearestCity.name}`);
            const aqi = Math.min(500, Math.round(cityData.data.aqi));
            const city = cityData.data.city?.name || nearestCity.name;
            const pollutants = {
              pm25: extractPollutantValue(cityData.data.iaqi.pm25),
              pm10: extractPollutantValue(cityData.data.iaqi.pm10),
              no2: extractPollutantValue(cityData.data.iaqi.no2),
              so2: extractPollutantValue(cityData.data.iaqi.so2),
              co: extractPollutantValue(cityData.data.iaqi.co),
              o3: extractPollutantValue(cityData.data.iaqi.o3),
            };
            const environmental = {
              temperature: extractPollutantValue(cityData.data.iaqi.t),
              humidity: extractPollutantValue(cityData.data.iaqi.h),
              pressure: extractPollutantValue(cityData.data.iaqi.p),
            };
            const response = {
              aqi,
              city,
              stationName: city,
              distance: haversineKm(lat, lon, nearestCity.lat, nearestCity.lon).toFixed(2),
              country: await detectCountry(lat, lon),
              dominantPollutant: cityData.data.dominentpol || 'unknown',
              pollutants,
              environmental,
              timestamp: new Date().toISOString(),
              dataSource: 'AQICN',
              coordinates: {
                user: { lat, lon },
                station: { lat: nearestCity.lat, lon: nearestCity.lon }
              },
              meta: {
                fallback: 'city-lookup',
                city: nearestCity.slug,
                processingTime: Date.now() - startTime
              }
            };
            return new Response(JSON.stringify(response), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      // If all fallbacks fail, return error
      return new Response(JSON.stringify({ 
        error: true, 
        message: '⚠️ No air quality monitoring stations found for this location.',
        code: usedFallback ? 'NO_STATIONS_FOUND_SEARCH' : 'NO_STATIONS_FOUND_NEARBY'
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
  details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});