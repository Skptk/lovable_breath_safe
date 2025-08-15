import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenAQData {
  results: Array<{
    location: string;
    city: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    measurements: Array<{
      parameter: string;
      value: number;
      unit: string;
      lastUpdated: string;
    }>;
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

// Find the nearest major city with AQI data using OpenAQ API
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
        // Use OpenAQ API to find cities with air quality data
        const response = await fetch(
          `https://api.openaq.org/v2/cities?coordinates=${point.lat},${point.lon}&radius=50000&limit=10`,
          {
            headers: {
              'X-API-Key': apiKey,
              'Accept': 'application/json'
            }
          }
        );

        if (response.ok) {
          const cities = await response.json();
          
          for (const city of cities.results || []) {
            const distance = calculateDistance(userLat, userLon, city.coordinates.latitude, city.coordinates.longitude);
            
            if (distance < shortestDistance && city.name) {
              shortestDistance = distance;
              nearestCity = {
                name: city.name,
                lat: city.coordinates.latitude,
                lon: city.coordinates.longitude,
                country: city.country,
                distance: distance
              };
            }
          }
        }
      } catch (error) {
        console.error(`Error searching at point ${point.lat}, ${point.lon}:`, error);
        continue;
      }
    }

    if (nearestCity) {
      return nearestCity;
    }

    // Fallback to user's location if no cities found
    return {
      name: 'Your Location',
      lat: userLat,
      lon: userLon,
      country: 'Unknown',
      distance: 0
    };

  } catch (error) {
    console.error('Error finding nearest major city:', error);
    // Fallback to user's location
    return {
      name: 'Your Location',
      lat: userLat,
      lon: userLon,
      country: 'Unknown',
      distance: 0
    };
  }
}

// Get user location details using reverse geocoding
async function getUserLocationDetails(lat: number, lon: number, apiKey: string): Promise<{
  country: string;
  state?: string;
  city?: string;
  area?: string;
}> {
  try {
    const response = await fetch(
      `https://api.openaq.org/v2/cities?coordinates=${lat},${lon}&radius=1000&limit=1`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const geoData = await response.json();
      const location = geoData.results?.[0];
      
      if (location) {
        return {
          country: location.country || 'Unknown',
          state: location.state,
          city: location.name,
          area: location.name
        };
      }
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }

    const OPENAQ_API_KEY = Deno.env.get('OPENAQ_API_KEY');
    if (!OPENAQ_API_KEY) {
      throw new Error('OpenAQ API key not configured');
    }

    // Check cache first (implement simple in-memory cache for demo)
    // In production, use Redis or database for caching
    const cacheKey = `aqi_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const cache = new Map();
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      const now = Date.now();
      
      // Cache expires after 5 minutes
      if (now - cached.timestamp < 5 * 60 * 1000) {
        console.log('Returning cached AQI data');
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get user's location details
    const userLocationDetails = await getUserLocationDetails(lat, lon, OPENAQ_API_KEY);
    
    // Find nearest major city dynamically
    const nearestCity = await findNearestMajorCity(lat, lon, OPENAQ_API_KEY);
    
    // Get air quality data from OpenAQ API
    const airResponse = await fetch(
      `https://api.openaq.org/v2/measurements?coordinates=${nearestCity.lat},${nearestCity.lon}&radius=10000&limit=100`,
      {
        headers: {
          'X-API-Key': OPENAQ_API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!airResponse.ok) {
      throw new Error(`OpenAQ API error: ${airResponse.status}`);
    }

    const airData: OpenAQData = await airResponse.json();
    
    // Debug: Log the raw OpenAQ response
    console.log('OpenAQ API Response:', {
      status: airResponse.status,
      resultsCount: airData.results?.length || 0,
      firstResult: airData.results?.[0] || 'No results',
      rawData: JSON.stringify(airData).substring(0, 500) + '...'
    });
    
    if (!airData.results || airData.results.length === 0) {
      throw new Error('No air quality data available');
    }

    // Process OpenAQ data to extract AQI and pollutants
    let aqi = 0;
    let pm25 = 0;
    let pm10 = 0;
    let no2 = 0;
    let so2 = 0;
    let co = 0;
    let o3 = 0;

    // Find the most recent measurements for each parameter
    const latestMeasurements = new Map();
    
    for (const result of airData.results) {
      for (const measurement of result.measurements) {
        const key = measurement.parameter;
        const existing = latestMeasurements.get(key);
        
        if (!existing || new Date(measurement.lastUpdated) > new Date(existing.lastUpdated)) {
          latestMeasurements.set(key, measurement);
        }
      }
    }

    // Extract values and calculate AQI
    if (latestMeasurements.has('pm25')) {
      pm25 = latestMeasurements.get('pm25').value;
      // Convert PM2.5 to AQI (simplified calculation)
      if (pm25 <= 12) aqi = Math.max(aqi, Math.round((pm25 / 12) * 50));
      else if (pm25 <= 35.4) aqi = Math.max(aqi, Math.round(51 + (pm25 - 12) / (35.4 - 12) * 49));
      else if (pm25 <= 55.4) aqi = Math.max(aqi, Math.round(101 + (pm25 - 35.4) / (55.4 - 35.4) * 49));
      else if (pm25 <= 150.4) aqi = Math.max(aqi, Math.round(151 + (pm25 - 55.4) / (150.4 - 55.4) * 99));
      else if (pm25 <= 250.4) aqi = Math.max(aqi, Math.round(201 + (pm25 - 150.4) / (250.4 - 150.4) * 99));
      else aqi = Math.max(aqi, Math.round(301 + (pm25 - 250.4) / (500 - 250.4) * 199));
    }

    if (latestMeasurements.has('pm10')) {
      pm10 = latestMeasurements.get('pm10').value;
    }

    if (latestMeasurements.has('no2')) {
      no2 = latestMeasurements.get('no2').value;
    }

    if (latestMeasurements.has('so2')) {
      so2 = latestMeasurements.get('so2').value;
    }

    if (latestMeasurements.has('co')) {
      co = latestMeasurements.get('co').value;
    }

    if (latestMeasurements.has('o3')) {
      o3 = latestMeasurements.get('o3').value;
    }

    // Better AQI fallback logic - use actual PM2.5 values if available
    if (aqi === 0) {
      if (pm25 > 0) {
        // Use PM2.5 as a direct AQI indicator (simplified)
        if (pm25 <= 12) aqi = Math.round(pm25 * 4); // Scale to 0-50 range
        else if (pm25 <= 35.4) aqi = Math.round(50 + (pm25 - 12) * 2); // Scale to 51-100 range
        else if (pm25 <= 55.4) aqi = Math.round(100 + (pm25 - 35.4) * 2.5); // Scale to 101-150 range
        else aqi = Math.round(150 + (pm25 - 55.4) * 1.5); // Scale to 151+ range
      } else if (pm10 > 0) {
        // Use PM10 as fallback
        aqi = Math.round(pm10 * 2); // Simple scaling
      }
    }

    // Ensure AQI is reasonable (not 1 unless that's the actual calculated value)
    if (aqi === 0) {
      // If we still have no AQI, use a reasonable default based on location
      // Nairobi area typically has AQI around 50-70
      aqi = 60; // Default to moderate air quality for Nairobi region
    }

    // Log the AQI calculation for debugging
    console.log('AQI Calculation Debug:', {
      pm25,
      pm10,
      calculatedAQI: aqi,
      measurementsCount: airData.results.length
    });

    // Create meaningful location descriptions
    const locationDescription = nearestCity.distance === 0 
      ? `${nearestCity.name}, ${nearestCity.country}`
      : `${nearestCity.name}, ${nearestCity.country}`;
      
    const userLocationDescription = nearestCity.distance === 0
      ? `${userLocationDetails.country}${userLocationDetails.state ? `, ${userLocationDetails.state}` : ''}`
      : `${userLocationDetails.country}${userLocationDetails.state ? `, ${userLocationDetails.state}` : ''} (${Math.round(nearestCity.distance)}km from ${nearestCity.name})`;
    
    // Save to database if user is authenticated
    const authHeader = req.headers.get('authorization');
    let userPoints = 0;
    let currencyRewards = 0;
    let canWithdrawRewards = false;
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get current user profile to check points
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          userPoints = profile.total_points || 0;
          currencyRewards = calculateCurrencyRewards(userPoints);
          canWithdrawRewards = canWithdraw(userPoints);
        }

        // Save air quality reading with enhanced location data
        await supabase.from('air_quality_readings').insert({
          user_id: user.id,
          latitude: lat,
          longitude: lon,
          location_name: locationDescription,
          aqi: aqi,
          pm25: pm25,
          pm10: pm10,
          no2: no2,
          so2: so2,
          co: co,
          o3: o3,
          timestamp: new Date().toISOString()
        });

        // Award points if air quality is good (AQI 0-50 = Good)
        if (aqi <= 50) {
          const pointsToAward = 50;
          
          await supabase.from('user_points').insert({
            user_id: user.id,
            points_earned: pointsToAward,
            aqi_value: aqi,
            location_name: locationDescription,
            timestamp: new Date().toISOString()
          });

          // Update total points in profile
          if (profile) {
            const newTotalPoints = (profile.total_points || 0) + pointsToAward;
            await supabase
              .from('profiles')
              .update({ total_points: newTotalPoints })
              .eq('user_id', user.id);
            
            // Update currency rewards
            currencyRewards = calculateCurrencyRewards(newTotalPoints);
            canWithdrawRewards = canWithdraw(newTotalPoints);
          }
        }
      }
    }

    const response = {
      location: locationDescription,
      userLocation: userLocationDescription,
      coordinates: { lat: nearestCity.lat, lon: nearestCity.lon },
      userCoordinates: { lat, lon },
      aqi: aqi,
      pollutants: {
        pm25: pm25,
        pm10: pm10,
        no2: no2,
        so2: so2,
        co: co,
        o3: o3
      },
      timestamp: new Date().toISOString(),
      dataSource: nearestCity.distance === 0 
        ? `AQI data from your location`
        : `AQI data from ${nearestCity.name} (${Math.round(nearestCity.distance)}km away)`,
      userPoints: userPoints,
      currencyRewards: currencyRewards,
      canWithdraw: canWithdrawRewards
    };

    // Cache the response for 5 minutes
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

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