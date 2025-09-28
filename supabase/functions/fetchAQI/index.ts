import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
        };
        
interface GlobalEnvironmentalDataRecord {
  id: string;
    city_name: string;
      country: string | null;
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
                                                data_source: string | null;
                                                  collection_timestamp: string;
                                                    is_active: boolean;
                                                    }
                                                    
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
  }
  
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
    const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
                  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  }
                  
async function detectCountry(lat: number, lon: number): Promise<string> {
  try {
      const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
                  { headers: { 'User-Agent': 'BreathSafe-AirQuality/1.0 (ScheduledData)' } },
                      );
                      
    if (response.ok) {
          const data = await response.json();
                const country = data.address?.country_code?.toUpperCase();
                      if (country) {
                              console.log(` Detected country: ${country} for coordinates ${lat}, ${lon}`);
                                      return country;
                                            }
                                                }
                                                  } catch (error) {
                                                      const message = error instanceof Error ? error.message : String(error);
                                                          console.warn(` Reverse geocoding failed for ${lat}, ${lon}:`, message);
                                                            }
                                                            
  console.log(' Country detection failed, using default');
    return 'UNKNOWN';
    }
    
function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
  }
  
const POLLUTANT_LABELS: Record<string, string> = {
  pm25: 'PM2.5',
    pm10: 'PM10',
      no2: 'NO2',
        so2: 'SO2',
          co: 'CO',
            o3: 'O3',
            };
            
function computeDominantPollutant(record: GlobalEnvironmentalDataRecord): string {
  let dominantKey: keyof typeof POLLUTANT_LABELS | null = null;
    let highest = -Infinity;
    
  (Object.keys(POLLUTANT_LABELS) as (keyof typeof POLLUTANT_LABELS)[]).forEach((key) => {
      const value = record[key];
          if (isFiniteNumber(value) && value > highest) {
                highest = value;
                      dominantKey = key;
                          }
                            });
                            
  if (dominantKey) {
      return POLLUTANT_LABELS[dominantKey];
        }
        
  return 'unknown';
  }
  
serve(async (req: Request) => {
  const startTime = Date.now();
    console.log('
=== FETCHAQI USING SCHEDULED DATA STARTED ===');
      console.log(` Request timestamp: ${new Date().toISOString()}`);
        console.log(` Request method: ${req.method}`);
        
  if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
        }
        
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(' Supabase environment variables missing');
          return new Response(
                JSON.stringify({
                        error: true,
                                message: 'Supabase configuration missing',
                                        code: 'SUPABASE_CONFIG_MISSING',
                                              }),
                                                    {
                                                            status: 500,
                                                                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                          },
                                                                              );
                                                                                }
                                                                                
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
      const body = await req.json().catch(() => ({}));
          const { lat, lon } = body as { lat?: number; lon?: number };
          
    console.log(' Request body:', { lat, lon, origin: 'fetchAQI-scheduled', timestamp: new Date().toISOString() });
    
    if (typeof lat !== 'number' || typeof lon !== 'number') {
          console.error(' Missing or invalid coordinates:', { lat, lon });
                return new Response(
                        JSON.stringify({
                                  error: true,
                                            message: ' Valid coordinates are required for air quality data.',
                                                      code: 'INVALID_COORDINATES',
                                                              }),
                                                                      {
                                                                                status: 400,
                                                                                          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                                                  },
                                                                                                        );
                                                                                                            }
                                                                                                            
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error(' Coordinates out of valid range:', { lat, lon });
                return new Response(
                        JSON.stringify({
                                  error: true,
                                            message: ' Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).',
                                                      code: 'INVALID_RANGE',
                                                              }),
                                                                      {
                                                                                status: 400,
                                                                                          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                                                  },
                                                                                                        );
                                                                                                            }
                                                                                                            
    console.log(` Looking up scheduled AQI data nearest to ${lat}, ${lon}`);
    
    const { data: records, error } = await supabase
          .from('global_environmental_data')
                .select('*')
                      .eq('is_active', true);
                      
    if (error) {
          console.error(' Failed to fetch scheduled AQI records:', error);
                return new Response(
                        JSON.stringify({
                                  error: true,
                                            message: ' Scheduled AQI data unavailable. Please try again later.',
                                                      code: 'SCHEDULED_DATA_FETCH_FAILED',
                                                              }),
                                                                      {
                                                                                status: 503,
                                                                                          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                                                  },
                                                                                                        );
                                                                                                            }
                                                                                                            
    const activeRecords = (records ?? []).filter(
          (record): record is GlobalEnvironmentalDataRecord =>
                  record && typeof record.latitude === 'number' && typeof record.longitude === 'number',
                      );
                      
    if (!activeRecords.length) {
          console.warn(' No active scheduled AQI records found');
                return new Response(
                        JSON.stringify({
                                  error: true,
                                            message: ' No scheduled AQI data available. Please check back later.',
                                                      code: 'NO_SCHEDULED_DATA',
                                                              }),
                                                                      {
                                                                                status: 503,
                                                                                          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                                                  },
                                                                                                        );
                                                                                                            }
                                                                                                            
    const candidates = activeRecords
          .map((record) => ({
                  record,
                          distance: haversineKm(lat, lon, record.latitude, record.longitude),
                                }))
                                      .sort((a, b) => a.distance - b.distance);
                                      
    const nearest = candidates[0];
    
    if (!nearest) {
          console.error(' Unable to determine nearest scheduled AQI record');
                return new Response(
                        JSON.stringify({
                                  error: true,
                                            message: ' Unable to determine nearest air quality station.',
                                                      code: 'NO_NEAREST_RECORD',
                                                              }),
                                                                      {
                                                                                status: 503,
                                                                                          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                                                  },
                                                                                                        );
                                                                                                            }
                                                                                                            
    const userCountry = await detectCountry(lat, lon);
        const dominantPollutant = computeDominantPollutant(nearest.record);
        
    const pollutants = {
          pm25: isFiniteNumber(nearest.record.pm25) ? nearest.record.pm25 : null,
                pm10: isFiniteNumber(nearest.record.pm10) ? nearest.record.pm10 : null,
                      no2: isFiniteNumber(nearest.record.no2) ? nearest.record.no2 : null,
                            so2: isFiniteNumber(nearest.record.so2) ? nearest.record.so2 : null,
                                  co: isFiniteNumber(nearest.record.co) ? nearest.record.co : null,
                                        o3: isFiniteNumber(nearest.record.o3) ? nearest.record.o3 : null,
                                            };
                                            
    const environmental = {
          temperature: isFiniteNumber(nearest.record.temperature) ? nearest.record.temperature : null,
                humidity: isFiniteNumber(nearest.record.humidity) ? nearest.record.humidity : null,
                      pressure: isFiniteNumber(nearest.record.air_pressure) ? nearest.record.air_pressure : null,
                            windSpeed: isFiniteNumber(nearest.record.wind_speed) ? nearest.record.wind_speed : null,
                                  windDirection: isFiniteNumber(nearest.record.wind_direction) ? nearest.record.wind_direction : null,
                                        windGust: isFiniteNumber(nearest.record.wind_gust) ? nearest.record.wind_gust : null,
                                              visibility: isFiniteNumber(nearest.record.visibility) ? nearest.record.visibility : null,
                                                    weatherCondition: nearest.record.weather_condition,
                                                          feelsLikeTemperature: isFiniteNumber(nearest.record.feels_like_temperature)
                                                                  ? nearest.record.feels_like_temperature
                                                                          : null,
                                                                                sunriseTime: nearest.record.sunrise_time,
                                                                                      sunsetTime: nearest.record.sunset_time,
                                                                                          };
                                                                                          
    const candidateMeta = candidates.slice(0, 5).map((candidate) => ({
          id: candidate.record.id,
                city: candidate.record.city_name,
                      country: candidate.record.country,
                            computedDistance: Number(candidate.distance.toFixed(2)),
                                }));
                                
    const responsePayload = {
          aqi: nearest.record.aqi,
                city: nearest.record.city_name,
                      stationUid: nearest.record.id,
                            stationName: nearest.record.city_name,
                                  stationLat: nearest.record.latitude,
                                        stationLon: nearest.record.longitude,
                                              computedDistanceKm: Number(nearest.distance.toFixed(2)),
                                                    dominantPollutant,
                                                          pollutants,
                                                                environmental,
                                                                      timestamp: nearest.record.collection_timestamp,
                                                                            dataSource: nearest.record.data_source ?? 'AQICN',
                                                                                  country: nearest.record.country,
                                                                                        coordinates: {
                                                                                                user: { lat, lon },
                                                                                                        station: { lat: nearest.record.latitude, lon: nearest.record.longitude },
                                                                                                              },
                                                                                                                    meta: {
                                                                                                                            chosen: 'scheduled-collection',
                                                                                                                                    userCountry,
                                                                                                                                            selectionReason: `Nearest scheduled data city within ${Number(nearest.distance.toFixed(2))}km`,
                                                                                                                                                    candidates: candidateMeta,
                                                                                                                                                            dataAgeMinutes: Math.floor((Date.now() - new Date(nearest.record.collection_timestamp).getTime()) / 60000),
                                                                                                                                                                    processingTime: Date.now() - startTime,
                                                                                                                                                                          },
                                                                                                                                                                              };
                                                                                                                                                                              
    console.log(
          ` Scheduled AQI data success - City: ${responsePayload.city}, AQI: ${responsePayload.aqi}, Distance: ${responsePayload.computedDistanceKm}km`,
              );
              
    return new Response(JSON.stringify(responsePayload), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                        console.error(' Error in fetchAQI scheduled handler:', message);
                            return new Response(
                                  JSON.stringify({
                                          error: true,
                                                  message: ' Live air quality data unavailable, please check back later.',
                                                          code: 'INTERNAL_ERROR',
                                                                  details: message,
                                                                        }),
                                                                              {
                                                                                      status: 500,
                                                                                              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                                                                                                    },
                                                                                                        );
                                                                                                          }
                                                                                                          });
                                                                                                          