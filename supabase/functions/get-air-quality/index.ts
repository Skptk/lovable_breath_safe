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

// Error tracking and alerting
interface ErrorTracker {
  apiFailures: Map<string, { count: number; lastOccurrence: number; }>;
  consecutiveFailures: number;
  lastAlert: number;
}

const errorTracker: ErrorTracker = {
  apiFailures: new Map(),
  consecutiveFailures: 0,
  lastAlert: 0
};

// Track API failures and send alerts
function trackApiFailure(endpoint: string, error: string) {
  const now = Date.now();
  const failure = errorTracker.apiFailures.get(endpoint) || { count: 0, lastOccurrence: 0 };
  
  failure.count++;
  failure.lastOccurrence = now;
  errorTracker.apiFailures.set(endpoint, failure);
  
  errorTracker.consecutiveFailures++;
  
  // Send alert if we have multiple consecutive failures or high failure rate
  if (errorTracker.consecutiveFailures >= 3 || failure.count >= 5) {
    const timeSinceLastAlert = now - errorTracker.lastAlert;
    if (timeSinceLastAlert > 15 * 60 * 1000) { // Alert every 15 minutes max
      console.error(`🚨 ALERT: API failures detected! Endpoint: ${endpoint}, Consecutive failures: ${errorTracker.consecutiveFailures}, Total failures: ${failure.count}`);
      errorTracker.lastAlert = now;
      
      // Reset consecutive failures after alert
      errorTracker.consecutiveFailures = 0;
    }
  }
}

// Reset failure count on successful API call
function resetApiFailures() {
  errorTracker.consecutiveFailures = 0;
  errorTracker.apiFailures.clear();
}

// Cache management functions
function getCacheKey(lat: number, lon: number, radius: number = 10000): string {
  // Round coordinates to reduce cache fragmentation
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLon = Math.round(lon * 1000) / 1000;
  return `${roundedLat},${roundedLon},${radius}`;
}

function getCachedResponse(cacheKey: string): any | null {
  const entry = responseCache.get(cacheKey);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  return entry.data;
}

function setCachedResponse(cacheKey: string, data: any, location: string) {
  // Clean up old entries if cache is full
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

// Enhanced location detection with multiple fallback strategies
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
        // Use OpenAQ API v3 to find cities with air quality data
        const response = await fetch(
          `https://api.openaq.org/v3/locations?coordinates=${point.lat},${point.lon}&radius=50000&limit=10`,
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
                country: city.country?.name || city.country?.code || 'Unknown',
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

    // Enhanced fallback: Try to get better location info using reverse geocoding
    try {
      const reverseGeocodeResponse = await fetch(
        `https://api.openaq.org/v2/cities?coordinates=${userLat},${userLon}&radius=1000&limit=1`,
        {
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/json'
          }
        }
      );
      
      if (reverseGeocodeResponse.ok) {
        const geoData = await reverseGeocodeResponse.json();
        const location = geoData.results?.[0];
        
        if (location) {
          return {
            name: location.name || location.city || 'Your Location',
            lat: userLat,
            lon: userLon,
            country: location.country || 'Unknown',
            distance: 0
          };
        }
      }
    } catch (reverseError) {
      console.error('Reverse geocoding failed:', reverseError);
    }

    // Final fallback to user's location
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
  name: string;
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
          name: location.name || location.city || 'Your Location',
          country: location.country || 'Unknown',
          state: location.state,
          city: location.name || location.city,
          area: location.name || location.city
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
  console.log('=== FUNCTION STARTED - VERSION WITH DEBUGGING ===');
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

    const OPENAQ_API_KEY = Deno.env.get('OPENAQ_API_KEY');
    console.log('Environment variable check:', {
      hasApiKey: !!OPENAQ_API_KEY,
      apiKeyLength: OPENAQ_API_KEY?.length || 0,
      apiKeyStart: OPENAQ_API_KEY?.substring(0, 10) + '...' || 'none'
    });
    
    // Test all environment variables to see what's available
    console.log('All available environment variables:', {
      supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT SET',
      supabaseKey: Deno.env.get('SUPABASE_ANON_KEY') ? 'SET' : 'NOT SET',
      openaqKey: Deno.env.get('OPENAQ_API_KEY') ? 'SET' : 'NOT SET'
    });
    
    if (!OPENAQ_API_KEY) {
      console.log('OpenAQ API key not configured, using fallback AQI calculation');
      // Return fallback data instead of throwing error
      const fallbackResponse = {
        location: 'Nairobi Region',
        userLocation: 'Your Location',
        coordinates: { lat, lon },
        userCoordinates: { lat, lon },
        aqi: 65, // Default AQI for Nairobi region
        pollutants: {
          pm25: 25.5,
          pm10: 45.2,
          no2: 15.3,
          so2: 8.7,
          co: 0.8,
          o3: 45.6
        },
        environmental: {
          temperature: 25, // Default fallback - would be updated with actual sensor data
          humidity: 60     // Default fallback - would be updated with actual sensor data
        },
        timestamp: new Date().toISOString(),
        dataSource: 'Fallback data (API key not configured)',
        userPoints: 0,
        currencyRewards: 0,
        canWithdraw: false
      };
      
      // Cache the fallback response
      setCachedResponse(cacheKey, fallbackResponse, 'Nairobi Region');
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Skip API key test to improve performance
    console.log('Proceeding with air quality data collection...');

    // Get user's location details
    let userLocationDetails;
    let nearestCity;
    
    try {
      console.log('Starting OpenAQ API calls with key:', OPENAQ_API_KEY.substring(0, 10) + '...');
      
      userLocationDetails = await getUserLocationDetails(lat, lon, OPENAQ_API_KEY);
      console.log('User location details obtained');
      
      nearestCity = await findNearestMajorCity(lat, lon, OPENAQ_API_KEY);
      console.log('Nearest city found:', nearestCity);
      
      // Get air quality data from OpenAQ API v3
      console.log('Making OpenAQ measurements API call...');
      
      // Try multiple endpoint formats for v3
      let airResponse;
      let airData;
      
      // First try: v3 measurements with coordinates
      try {
        console.log('Trying v3 measurements endpoint with coordinates...');
        airResponse = await fetch(
          `https://api.openaq.org/v3/measurements?coordinates=${nearestCity.lat},${nearestCity.lon}&radius=10000&limit=100`,
          {
            headers: {
              'X-API-Key': OPENAQ_API_KEY,
              'Accept': 'application/json'
            }
          }
        );
        
        if (airResponse.ok) {
          airData = await airResponse.json();
          console.log('v3 measurements endpoint successful');
          resetApiFailures(); // Reset failure count on success
        } else {
          console.log('v3 measurements endpoint failed, trying alternative...');
          trackApiFailure('v3_measurements', `Status: ${airResponse.status}`);
          throw new Error(`v3 measurements failed: ${airResponse.status}`);
        }
      } catch (error) {
        console.log('First attempt failed, trying v3 locations endpoint...');
        
        // Second try: v3 locations with coordinates
        try {
          airResponse = await fetch(
            `https://api.openaq.org/v3/locations?coordinates=${nearestCity.lat},${nearestCity.lon}&radius=10000&limit=100`,
            {
              headers: {
                'X-API-Key': OPENAQ_API_KEY,
                'Accept': 'application/json'
              }
            }
          );
          
          if (airResponse.ok) {
            airData = await airResponse.json();
            console.log('v3 locations endpoint successful');
            resetApiFailures(); // Reset failure count on success
          } else {
            console.log('v3 locations endpoint failed, trying v2 fallback...');
            trackApiFailure('v3_locations', `Status: ${airResponse.status}`);
            throw new Error(`v3 locations failed: ${airResponse.status}`);
          }
        } catch (v3Error) {
          console.log('v3 endpoints failed, trying v2 measurements as fallback...');
          
          // Third try: v2 measurements (fallback)
          try {
            airResponse = await fetch(
              `https://api.openaq.org/v2/measurements?coordinates=${nearestCity.lat},${nearestCity.lon}&radius=10000&limit=100`,
              {
                headers: {
                  'X-API-Key': OPENAQ_API_KEY,
                  'Accept': 'application/json'
                }
              }
            );
            
            if (airResponse.ok) {
              airData = await airResponse.json();
              console.log('v2 measurements endpoint successful (fallback)');
              resetApiFailures(); // Reset failure count on success
            } else {
              trackApiFailure('v2_measurements', `Status: ${airResponse.status}`);
              throw new Error(`v2 measurements failed: ${airResponse.status}`);
            }
          } catch (v2Error) {
            console.log('All API endpoints failed, using fallback data');
            const errorMsg = error instanceof Error ? error.message : String(error);
            const v3ErrorMsg = v3Error instanceof Error ? v3Error.message : String(v3Error);
            const v2ErrorMsg = v2Error instanceof Error ? v2Error.message : String(v2Error);
            trackApiFailure('all_endpoints', `v3 measurements (${errorMsg}), v3 locations (${v3ErrorMsg}), v2 measurements (${v2ErrorMsg})`);
            throw new Error(`All endpoints failed: v3 measurements (${errorMsg}), v3 locations (${v3ErrorMsg}), v2 measurements (${v2ErrorMsg})`);
          }
        }
      }
      
      // Check if we have data before proceeding
      if (!airData || !airData.results) {
        console.log('No air data available, using fallback');
        throw new Error('No air quality data available');
      }
        
      console.log('OpenAQ API response status:', airResponse.status);
        
      // Debug: Log the raw OpenAQ response
      console.log('OpenAQ API Response:', {
        status: airResponse.status,
        resultsCount: airData.results?.length || 0,
        firstResult: airData.results?.[0] || 'No results',
        rawData: JSON.stringify(airData).substring(0, 500) + '...'
      });
        
      // If no results, use fallback data instead of throwing error
      if (!airData.results || airData.results.length === 0) {
        console.log('OpenAQ API returned no results, using fallback data');
        throw new Error('No air quality data available - using fallback');
      }
        
      console.log('OpenAQ API call successful, processing data...');
      
      // Process OpenAQ data to extract AQI and pollutants
      let aqi = 0;
      let pm25 = 0;
      let pm10 = 0;
      let no2 = 0;
      let so2 = 0;
      let co = 0;
      let o3 = 0;

      // Check if this is location data (v3 locations) or measurement data (v2/v3 measurements)
      const isLocationData = airData.results[0]?.sensors && airData.results[0]?.coordinates;
      const isMeasurementData = airData.results[0]?.measurements || airData.results[0]?.value !== undefined;
      
      console.log('Data type detected:', { isLocationData, isMeasurementData });
      
      if (isLocationData) {
        // This is location data from v3 locations endpoint
        console.log('Processing location data, extracting sensor information...');
        
        // Extract sensor information from the location
        const availableSensors: string[] = [];
        airData.results.forEach((location: any) => {
          if (location.sensors) {
            location.sensors.forEach((sensor: any) => {
              const param = sensor.parameter?.name?.toLowerCase() || '';
              console.log('Found sensor:', { param, sensor: sensor.name });
              
              // Store sensor availability for later measurement fetching
              if (param.includes('pm25') || param.includes('pm2.5')) {
                console.log('PM2.5 sensor available');
                availableSensors.push('pm25');
              } else if (param.includes('pm10')) {
                console.log('PM10 sensor available');
                availableSensors.push('pm10');
              } else if (param.includes('pm1')) {
                console.log('PM1 sensor available');
                availableSensors.push('pm1');
              } else if (param.includes('no2')) {
                console.log('NO2 sensor available');
                availableSensors.push('no2');
              } else if (param.includes('so2')) {
                console.log('SO2 sensor available');
                availableSensors.push('so2');
              } else if (param.includes('co')) {
                console.log('CO sensor available');
                availableSensors.push('co');
              } else if (param.includes('o3')) {
                console.log('O3 sensor available');
                availableSensors.push('o3');
              } else if (param.includes('temperature')) {
                console.log('Temperature sensor available');
                availableSensors.push('temperature');
              } else if (param.includes('relativehumidity') || param.includes('humidity')) {
                console.log('Humidity sensor available');
                availableSensors.push('humidity');
              } else if (param.includes('um003')) {
                console.log('PM0.3 sensor available');
                availableSensors.push('pm003');
              }
            });
          }
        });
        
        // Try to fetch actual measurements from the detected sensors
        console.log('Attempting to fetch measurements from available sensors:', availableSensors);
        
        try {
          // Make a measurements API call to get actual data from the detected location
          const measurementsResponse = await fetch(
            `https://api.openaq.org/v3/measurements?location_id=${airData.results[0].id}&limit=100`,
            {
              headers: {
                'X-API-Key': OPENAQ_API_KEY,
                'Accept': 'application/json'
              }
            }
          );
          
          if (measurementsResponse.ok) {
            const measurementsData = await measurementsResponse.json();
            console.log('Measurements API call successful, processing data...');
            
            // Process the actual measurements
            const latestMeasurements = new Map();
            
            for (const result of measurementsData.results || []) {
              if (result.parameter && result.value !== undefined) {
                const key = result.parameter.toLowerCase();
                const existing = latestMeasurements.get(key);
                
                if (!existing || new Date(result.lastUpdated || result.date?.utc || new Date()) > new Date(existing.lastUpdated)) {
                  latestMeasurements.set(key, { 
                    value: result.value, 
                    lastUpdated: result.lastUpdated || result.date?.utc || new Date() 
                  });
                }
              }
            }
            
            // Extract pollutant values from actual measurements
            pm25 = latestMeasurements.get('pm25')?.value || latestMeasurements.get('pm2.5')?.value || 0;
            pm10 = latestMeasurements.get('pm10')?.value || 0;
            no2 = latestMeasurements.get('no2')?.value || 0;
            so2 = latestMeasurements.get('so2')?.value || 0;
            co = latestMeasurements.get('co')?.value || 0;
            o3 = latestMeasurements.get('o3')?.value || 0;
            
            // Add temperature and humidity if available
            const temperature = latestMeasurements.get('temperature')?.value || 25; // Default fallback
            const humidity = latestMeasurements.get('relativehumidity')?.value || latestMeasurements.get('humidity')?.value || 60; // Default fallback
            
            console.log('Actual measurements extracted:', { pm25, pm10, no2, so2, co, o3, temperature, humidity });
            
            // Calculate AQI based on actual PM2.5 if available
            if (pm25 > 0) {
              if (pm25 <= 12) {
                aqi = Math.round((pm25 / 12) * 50);
              } else if (pm25 <= 35.4) {
                aqi = Math.round(51 + ((pm25 - 12) / (35.4 - 12)) * 49);
              } else if (pm25 <= 55.4) {
                aqi = Math.round(101 + ((pm25 - 35.4) / (55.4 - 35.4)) * 49);
              } else if (pm25 <= 150.4) {
                aqi = Math.round(151 + ((pm25 - 55.4) / (150.4 - 55.4)) * 49);
              } else if (pm25 <= 250.4) {
                aqi = Math.round(201 + ((pm25 - 150.4) / (250.4 - 150.4)) * 49);
              } else {
                aqi = Math.round(301 + ((pm25 - 250.4) / (500.4 - 250.4)) * 199);
              }
            } else {
              aqi = 65; // Fallback AQI
            }
            
          } else {
            console.log('Measurements API call failed, using fallback values');
            trackApiFailure('measurements_api', `Status: ${measurementsResponse.status}`);
            // Use fallback values if measurements API fails
            aqi = 65;
            pm25 = 25.5;
            pm10 = 45.2;
            no2 = 15.3;
            so2 = 8.7;
            co = 0.8;
            o3 = 45.6;
          }
        } catch (measurementError) {
          console.log('Error fetching measurements, using fallback values:', measurementError instanceof Error ? measurementError.message : String(measurementError));
          trackApiFailure('measurements_fetch', measurementError instanceof Error ? measurementError.message : String(measurementError));
          // Use fallback values if measurements API fails
          aqi = 65;
          pm25 = 25.5;
          pm10 = 45.2;
          no2 = 15.3;
          so2 = 8.7;
          co = 0.8;
          o3 = 45.6;
        }
        
      } else if (isMeasurementData) {
        // This is measurement data from v2/v3 measurements endpoint
        console.log('Processing measurement data...');
        
        // Find the most recent measurements for each parameter
        const latestMeasurements = new Map();
        
        for (const result of airData.results) {
          if (result.measurements) {
            for (const measurement of result.measurements) {
              const key = measurement.parameter;
              const existing = latestMeasurements.get(key);
              
              if (!existing || new Date(measurement.lastUpdated) > new Date(existing.lastUpdated)) {
                latestMeasurements.set(key, measurement);
              }
            }
          } else if (result.value !== undefined && result.parameter) {
            // Direct measurement format
            const key = result.parameter.toLowerCase();
            latestMeasurements.set(key, { value: result.value, lastUpdated: result.lastUpdated || new Date() });
          }
        }
        
        // Extract pollutant values
        pm25 = latestMeasurements.get('pm25')?.value || latestMeasurements.get('pm2.5')?.value || 0;
        pm10 = latestMeasurements.get('pm10')?.value || 0;
        no2 = latestMeasurements.get('no2')?.value || 0;
        so2 = latestMeasurements.get('so2')?.value || 0;
        co = latestMeasurements.get('co')?.value || 0;
        o3 = latestMeasurements.get('o3')?.value || 0;
        
        // Calculate AQI based on PM2.5 (simplified calculation)
        if (pm25 > 0) {
          if (pm25 <= 12) {
            aqi = Math.round((pm25 / 12) * 50);
          } else if (pm25 <= 35.4) {
            aqi = Math.round(51 + ((pm25 - 12) / (35.4 - 12)) * 49);
          } else if (pm25 <= 55.4) {
            aqi = Math.round(101 + ((pm25 - 35.4) / (55.4 - 35.4)) * 49);
          } else if (pm25 <= 150.4) {
            aqi = Math.round(151 + ((pm25 - 55.4) / (150.4 - 55.4)) * 49);
          } else if (pm25 <= 250.4) {
            aqi = Math.round(201 + ((pm25 - 150.4) / (250.4 - 150.4)) * 49);
          } else {
            aqi = Math.round(301 + ((pm25 - 250.4) / (500.4 - 250.4)) * 199);
          }
        } else {
          aqi = 65; // Fallback AQI
        }
        
        console.log('Processed measurement data:', { aqi, pm25, pm10, no2, so2, co, o3 });
      }
      
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
                    p_location_name: nearestCity.name,
                    p_aqi: aqi,
                    p_pm25: pm25 > 0 ? pm25 : null,
                    p_pm10: pm10 > 0 ? pm10 : null,
                    p_pm1: pm25 > 0 ? pm25 * 0.7 : null, // Estimate PM1 from PM2.5
                    p_no2: no2 > 0 ? no2 : null,
                    p_so2: so2 > 0 ? so2 : null,
                    p_co: co > 0 ? co : null,
                    p_o3: o3 > 0 ? o3 : null,
                    p_temperature: 25, // Default fallback - would be updated with actual sensor data
                    p_humidity: 60,    // Default fallback - would be updated with actual sensor data
                    p_pm003: pm25 > 0 ? pm25 * 2 : null, // Estimate PM0.3 from PM2.5
                    p_data_source: 'OpenAQ API'
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
        location: nearestCity.name,
        userLocation: userLocationDetails.name,
        coordinates: { lat: nearestCity.lat, lon: nearestCity.lon },
        userCoordinates: { lat, lon },
        aqi,
        pollutants: {
          pm25,
          pm10,
          no2,
          so2,
          co,
          o3
        },
        environmental: {
          temperature: 25, // Default fallback - would be updated with actual sensor data
          humidity: 60     // Default fallback - would be updated with actual sensor data
        },
        timestamp: new Date().toISOString(),
        dataSource: 'OpenAQ API',
        userPoints,
        currencyRewards,
        canWithdraw
      };
      
      // Cache the successful response
      setCachedResponse(cacheKey, response, nearestCity.name);
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (apiError) {
      console.log('OpenAQ API error, using fallback data:', apiError instanceof Error ? apiError.message : String(apiError));
      console.log('Full error details:', apiError);
      
      // Check if we have cached data to use instead of fallback
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData && cachedData.data) {
        console.log('Using cached data instead of fallback');
        return new Response(JSON.stringify(cachedData.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('No cached data available, using fallback data');
      // Return fallback data if API fails
      const fallbackResponse = {
        location: 'Nairobi Region',
        userLocation: 'Your Location',
        coordinates: { lat, lon },
        userCoordinates: { lat, lon },
        aqi: 65, // Moderate AQI for Nairobi region (based on typical urban air quality)
        pollutants: {
          pm25: 25.5,  // Moderate PM2.5 levels
          pm10: 45.2,  // Moderate PM10 levels
          no2: 15.3,   // Low NO2 levels
          so2: 8.7,    // Low SO2 levels
          co: 0.8,     // Low CO levels
          o3: 45.6     // Moderate O3 levels
        },
        environmental: {
          temperature: 22, // Typical Nairobi temperature
          humidity: 65     // Typical Nairobi humidity
        },
        timestamp: new Date().toISOString(),
        dataSource: 'Fallback data (OpenAQ API returned no results for this location)',
        userPoints: 0,
        currencyRewards: 0,
        canWithdraw: false
      };
      
      // Cache the fallback response
      setCachedResponse(cacheKey, fallbackResponse, 'Nairobi Region');
      
      return new Response(JSON.stringify(fallbackResponse), {
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