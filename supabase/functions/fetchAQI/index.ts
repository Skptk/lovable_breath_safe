// fetchAQI edge function
// Reads pre-collected OpenWeatherMap data from global_environmental_data and returns
// the nearest useful record for the requesting coordinates.
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

interface CandidateRecord {
  record: GlobalEnvironmentalDataRecord;
  distanceKm: number;
}

interface SelectionResult {
  candidate: CandidateRecord | undefined;
  strategy: 'nearest-acceptable' | 'best-available' | 'none';
}

interface QueryBody {
  lat?: number;
  lon?: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
        console.log(`Detected country: ${country} for coordinates ${lat}, ${lon}`);
        return country;
      }
    }
  } catch (error) {
    console.warn(`Reverse geocoding failed for ${lat}, ${lon}: ${error instanceof Error ? error.message : String(error)}`);
  }

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

const MAX_FETCHED_ROWS = 200;
const MAX_RECORD_AGE_MINUTES = 8 * 60; // 8 hours
const SCHEDULED_COLUMNS =
  'id, city_name, country, latitude, longitude, aqi, pm25, pm10, no2, so2, co, o3, temperature, humidity, wind_speed, wind_direction, wind_gust, air_pressure, visibility, weather_condition, feels_like_temperature, sunrise_time, sunset_time, data_source, collection_timestamp, is_active';

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

  return dominantKey ? POLLUTANT_LABELS[dominantKey] : 'unknown';
}

function buildPollutantPayload(record: GlobalEnvironmentalDataRecord) {
  return {
    pm25: isFiniteNumber(record.pm25) ? record.pm25 : null,
    pm10: isFiniteNumber(record.pm10) ? record.pm10 : null,
    no2: isFiniteNumber(record.no2) ? record.no2 : null,
    so2: isFiniteNumber(record.so2) ? record.so2 : null,
    co: isFiniteNumber(record.co) ? record.co : null,
    o3: isFiniteNumber(record.o3) ? record.o3 : null,
  };
}

function buildEnvironmentalPayload(record: GlobalEnvironmentalDataRecord) {
  return {
    temperature: isFiniteNumber(record.temperature) ? record.temperature : null,
    humidity: isFiniteNumber(record.humidity) ? record.humidity : null,
    pressure: isFiniteNumber(record.air_pressure) ? record.air_pressure : null,
    windSpeed: isFiniteNumber(record.wind_speed) ? record.wind_speed : null,
    windDirection: isFiniteNumber(record.wind_direction) ? record.wind_direction : null,
    windGust: isFiniteNumber(record.wind_gust) ? record.wind_gust : null,
    visibility: isFiniteNumber(record.visibility) ? record.visibility : null,
    weatherCondition: record.weather_condition,
    feelsLikeTemperature: isFiniteNumber(record.feels_like_temperature)
      ? record.feels_like_temperature
      : null,
    sunriseTime: record.sunrise_time,
    sunsetTime: record.sunset_time,
  };
}

function buildCandidateList(
  records: GlobalEnvironmentalDataRecord[],
  lat: number,
  lon: number,
): CandidateRecord[] {
  return records
    .map((record) => ({
      record,
      distanceKm: haversineKm(lat, lon, record.latitude, record.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function isCandidateRecord(record: unknown): record is GlobalEnvironmentalDataRecord {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const candidate = record as Partial<GlobalEnvironmentalDataRecord>;
  return (
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    typeof candidate.aqi === 'number' &&
    Number.isFinite(candidate.aqi) &&
    typeof candidate.collection_timestamp === 'string' &&
    candidate.collection_timestamp.length > 0
  );
}

function sanitizeRecord(record: GlobalEnvironmentalDataRecord): GlobalEnvironmentalDataRecord {
  return {
    ...record,
    aqi: Number.isFinite(record.aqi) ? record.aqi : MIN_ACCEPTABLE_AQI,
    pm25: isFiniteNumber(record.pm25) ? record.pm25 : null,
    pm10: isFiniteNumber(record.pm10) ? record.pm10 : null,
    no2: isFiniteNumber(record.no2) ? record.no2 : null,
    so2: isFiniteNumber(record.so2) ? record.so2 : null,
    co: isFiniteNumber(record.co) ? record.co : null,
    o3: isFiniteNumber(record.o3) ? record.o3 : null,
    temperature: isFiniteNumber(record.temperature) ? record.temperature : null,
    humidity: isFiniteNumber(record.humidity) ? record.humidity : null,
    wind_speed: isFiniteNumber(record.wind_speed) ? record.wind_speed : null,
    wind_direction: isFiniteNumber(record.wind_direction) ? record.wind_direction : null,
    wind_gust: isFiniteNumber(record.wind_gust) ? record.wind_gust : null,
    air_pressure: isFiniteNumber(record.air_pressure) ? record.air_pressure : null,
    visibility: isFiniteNumber(record.visibility) ? record.visibility : null,
    feels_like_temperature: isFiniteNumber(record.feels_like_temperature)
      ? record.feels_like_temperature
      : null,
  };
}

function selectBestCandidate(candidates: CandidateRecord[]): SelectionResult {
  if (!candidates.length) {
    return { candidate: undefined, strategy: 'none' };
  }

  // Always prefer the nearest scheduled record so results align with scheduled-data-collection output.
  return { candidate: candidates[0], strategy: 'nearest-active' };
}

function buildCandidateMeta(candidates: CandidateRecord[]) {
  return candidates.slice(0, 5).map((candidate) => ({
    id: candidate.record.id,
    city: candidate.record.city_name,
    country: candidate.record.country,
    aqi: candidate.record.aqi,
    computedDistance: Number(candidate.distanceKm.toFixed(2)),
  }));
}

function buildResponsePayload(
  candidate: CandidateRecord,
  lat: number,
  lon: number,
  userCountry: string,
  strategy: SelectionResult['strategy'],
  candidates: CandidateRecord[],
  startedAt: number,
) {
  const locationLabel = candidate.record.country
    ? `${candidate.record.city_name}, ${candidate.record.country}`
    : candidate.record.city_name;

  const pollutants = buildPollutantPayload(candidate.record);
  const environmental = buildEnvironmentalPayload(candidate.record);
  const candidateMeta = buildCandidateMeta(candidates);

  return {
    aqi: candidate.record.aqi,
    city: locationLabel,
    stationUid: candidate.record.id,
    stationName: locationLabel,
    stationLat: candidate.record.latitude,
    stationLon: candidate.record.longitude,
    computedDistanceKm: Number(candidate.distanceKm.toFixed(2)),
    dominantPollutant: computeDominantPollutant(candidate.record),
    pollutants,
    environmental,
    timestamp: candidate.record.collection_timestamp,
    dataSource: 'OpenWeatherMap (Scheduled)',
    scheduledMeta: {
      id: candidate.record.id,
      collectionTimestamp: candidate.record.collection_timestamp,
      dataSource: candidate.record.data_source ?? 'OpenWeatherMap',
    },
    location: locationLabel,
    country: candidate.record.country,
    coordinates: {
      user: { lat, lon },
      station: { lat: candidate.record.latitude, lon: candidate.record.longitude },
    },
    meta: {
      chosen: 'scheduled-collection',
      selectionStrategy: strategy,
      userCountry,
      selectionReason: 'Nearest scheduled OpenWeatherMap record',
      candidates: candidateMeta,
      dataAgeMinutes: Math.floor(
        (Date.now() - new Date(candidate.record.collection_timestamp).getTime()) / 60000,
      ),
      processingTime: Date.now() - startedAt,
    },
  };
}

serve(async (req: Request) => {
  const startTime = Date.now();
  console.log('=== FETCHAQI USING SCHEDULED DATA STARTED ===');
  console.log(` Request timestamp: ${new Date().toISOString()}`);
  console.log(` Request method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase environment variables missing');
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
    const body = (await req.json().catch(() => ({}))) as QueryBody;
    const { lat, lon } = body;

    console.log('Request body:', {
      lat,
      lon,
      origin: 'fetchAQI-scheduled',
      timestamp: new Date().toISOString(),
    });

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      console.error('Missing or invalid coordinates:', { lat, lon });
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Valid coordinates are required for air quality data.',
          code: 'INVALID_COORDINATES',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.error('Coordinates out of valid range:', { lat, lon });
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Coordinates must be valid latitude (-90 to 90) and longitude (-180 to 180).',
          code: 'INVALID_RANGE',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Looking up scheduled OpenWeatherMap AQI data nearest to ${lat}, ${lon}`);

    const { data: records, error } = await supabase
      .from('global_environmental_data')
      .select(SCHEDULED_COLUMNS)
      .eq('is_active', true)
      .order('collection_timestamp', { ascending: false })
      .limit(MAX_FETCHED_ROWS);

    if (error) {
      console.error('Failed to fetch scheduled AQI records:', error);
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Scheduled AQI data unavailable. Please try again later.',
          code: 'SCHEDULED_DATA_FETCH_FAILED',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const now = Date.now();
    const activeRecords = (records ?? [])
      .filter(isCandidateRecord)
      .map(sanitizeRecord)
      .filter((record) => {
        const collectedAt = new Date(record.collection_timestamp).getTime();
        const ageMinutes = (now - collectedAt) / 60000;
        return Number.isFinite(ageMinutes) && ageMinutes <= MAX_RECORD_AGE_MINUTES;
      });

    console.log('Candidate scheduled AQI records:', {
      fetched: records?.length ?? 0,
      usable: activeRecords.length,
      stale: (records ?? []).length - activeRecords.length,
      limit: MAX_FETCHED_ROWS,
      maxAgeMinutes: MAX_RECORD_AGE_MINUTES,
    });

    if (!activeRecords.length) {
      console.warn('No active scheduled AQI records found');
      return new Response(
        JSON.stringify({
          error: true,
          message: 'No scheduled AQI data available. Please check back later.',
          code: 'NO_SCHEDULED_DATA',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const candidates = buildCandidateList(activeRecords, lat, lon);
    const { candidate, strategy } = selectBestCandidate(candidates);

    if (!candidate) {
      console.error('No scheduled AQI candidate met selection requirements');
      return new Response(
        JSON.stringify({
          error: true,
          message: 'Unable to determine nearest air quality station.',
          code: 'NO_NEAREST_RECORD',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userCountry = await detectCountry(lat, lon);
    const responsePayload = buildResponsePayload(
      candidate,
      lat,
      lon,
      userCountry,
      strategy,
      candidates,
      startTime,
    );

    console.log(
      `Scheduled OpenWeatherMap data success - City: ${responsePayload.city}, AQI: ${responsePayload.aqi}, Distance: ${responsePayload.computedDistanceKm}km (strategy: ${strategy})`,
    );

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in fetchAQI scheduled handler:', message);

    return new Response(
      JSON.stringify({
        error: true,
        message: 'Live air quality data unavailable, please check back later.',
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