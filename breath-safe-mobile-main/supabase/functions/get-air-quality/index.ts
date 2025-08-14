import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirQualityData {
  coord: {
    lon: number;
    lat: number;
  };
  list: Array<{
    main: {
      aqi: number;
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
    dt: number;
  }>;
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

    const OPENWEATHERMAP_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
    if (!OPENWEATHERMAP_API_KEY) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    // Get location name from reverse geocoding
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`
    );
    const geoData = await geoResponse.json();
    const locationName = geoData[0]?.name || 'Unknown Location';

    // Get air pollution data
    const airResponse = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}`
    );
    
    if (!airResponse.ok) {
      throw new Error(`OpenWeatherMap API error: ${airResponse.status}`);
    }

    const airData: AirQualityData = await airResponse.json();
    
    if (!airData.list || airData.list.length === 0) {
      throw new Error('No air quality data available');
    }

    const currentData = airData.list[0];
    
    // Save to database if user is authenticated
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Save air quality reading
        await supabase.from('air_quality_readings').insert({
          user_id: user.id,
          latitude: lat,
          longitude: lon,
          location_name: locationName,
          aqi: currentData.main.aqi,
          pm25: currentData.components.pm2_5,
          pm10: currentData.components.pm10,
          no2: currentData.components.no2,
          so2: currentData.components.so2,
          co: currentData.components.co,
          o3: currentData.components.o3,
          timestamp: new Date().toISOString()
        });

        // Award points if air quality is good (AQI 1 = Good)
        if (currentData.main.aqi === 1) {
          const pointsToAward = 50; // 10 points per minute for 5 minutes
          
          await supabase.from('user_points').insert({
            user_id: user.id,
            points_earned: pointsToAward,
            aqi_value: currentData.main.aqi,
            location_name: locationName,
            timestamp: new Date().toISOString()
          });

          // Update total points in profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('total_points')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ total_points: (profile.total_points || 0) + pointsToAward })
              .eq('user_id', user.id);
          }
        }
      }
    }

    const response = {
      location: locationName,
      coordinates: { lat, lon },
      aqi: currentData.main.aqi,
      pollutants: {
        pm25: currentData.components.pm2_5,
        pm10: currentData.components.pm10,
        no2: currentData.components.no2,
        so2: currentData.components.so2,
        co: currentData.components.co,
        o3: currentData.components.o3
      },
      timestamp: new Date(currentData.dt * 1000).toISOString()
    };

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