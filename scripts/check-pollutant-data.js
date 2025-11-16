/**
 * Diagnostic script to check pollutant data in database and AQICN API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const aqicnApiKey = process.env.AQICN_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n📊 Checking database records...\n');
  
  // Check both active and inactive records
  const { data, error } = await supabase
    .from('global_environmental_data')
    .select('*')
    .order('collection_timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ No active records found in database');
    return;
  }

  console.log(`✅ Found ${data.length} active records:\n`);
  
  data.forEach((record, index) => {
    console.log(`Record ${index + 1}: ${record.city_name}, ${record.country}`);
    console.log(`  AQI: ${record.aqi}`);
    console.log(`  PM2.5: ${record.pm25 ?? 'NULL'}`);
    console.log(`  PM10: ${record.pm10 ?? 'NULL'}`);
    console.log(`  NO2: ${record.no2 ?? 'NULL'}`);
    console.log(`  SO2: ${record.so2 ?? 'NULL'}`);
    console.log(`  CO: ${record.co ?? 'NULL'}`);
    console.log(`  O3: ${record.o3 ?? 'NULL'}`);
    console.log(`  Collection Time: ${record.collection_timestamp}`);
    console.log(`  Data Source: ${record.data_source}`);
    console.log('');
  });
}

async function testAQICNAPI() {
  if (!aqicnApiKey) {
    console.log('⚠️ AQICN_API_KEY not found, skipping API test');
    return;
  }

  console.log('\n🌍 Testing AQICN API for Nairobi...\n');
  
  const nairobi = { name: 'Nairobi', lat: -1.2921, lon: 36.8219 };
  const url = `https://api.waqi.info/feed/geo:${nairobi.lat};${nairobi.lon}/?token=${aqicnApiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'ok') {
      console.error('❌ AQICN API error:', data);
      return;
    }

    console.log('✅ AQICN API Response:');
    console.log(`  Station: ${data.data.city.name}`);
    console.log(`  AQI: ${data.data.aqi}`);
    console.log(`  Dominant Pollutant: ${data.data.dominentpol || 'N/A'}`);
    console.log('\n  Available pollutants in iaqi:');
    
    const iaqi = data.data.iaqi || {};
    const pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
    
    pollutants.forEach(pollutant => {
      if (iaqi[pollutant]) {
        console.log(`    ✅ ${pollutant.toUpperCase()}: ${iaqi[pollutant].v} µg/m³`);
      } else {
        console.log(`    ❌ ${pollutant.toUpperCase()}: NOT AVAILABLE`);
      }
    });
    
    console.log('\n  All iaqi keys:', Object.keys(iaqi).join(', '));
    console.log('\n  Full iaqi object:', JSON.stringify(iaqi, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing AQICN API:', error);
  }
}

async function main() {
  await checkDatabase();
  await testAQICNAPI();
}

main().catch(console.error);

