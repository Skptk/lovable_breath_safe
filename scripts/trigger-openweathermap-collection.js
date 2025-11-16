#!/usr/bin/env node

/**
 * Trigger OpenWeatherMap Data Collection
 * 
 * This script manually triggers the scheduled data collection to fetch
 * fresh data from OpenWeatherMap API for all cities.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to invoke Edge Function
function invokeEdgeFunction(functionName, body = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/functions/v1/${functionName}`);
    
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Check current database state
async function checkDatabase() {
  console.log('\n📊 Checking current database state...\n');
  
  const { data, error } = await supabase
    .from('global_environmental_data')
    .select('*')
    .eq('is_active', true)
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
    console.log(`  Data Source: ${record.data_source}`);
    console.log(`  Collection Time: ${record.collection_timestamp}`);
    console.log('');
  });
}

// Trigger data collection
async function triggerCollection() {
  console.log('🚀 Triggering OpenWeatherMap data collection...\n');
  
  try {
    const response = await invokeEdgeFunction('scheduled-data-collection', {
      manual: false
    });
    
    if (response.status === 200) {
      console.log('✅ Data collection successful!');
      console.log(`📊 Cities processed: ${response.data.cities_processed}`);
      console.log(`📅 Timestamp: ${response.data.timestamp}`);
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('⚠️ Errors:', response.data.errors);
      }
      return true;
    } else {
      console.error('❌ Data collection failed');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Error triggering collection:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 OpenWeatherMap Data Collection Trigger\n');
  console.log('='.repeat(50));
  
  // Check current state
  await checkDatabase();
  
  console.log('\n' + '='.repeat(50));
  console.log('🔄 Triggering new data collection...\n');
  
  // Trigger collection
  const success = await triggerCollection();
  
  if (success) {
    console.log('\n⏰ Waiting 5 seconds for data to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Checking database after collection...\n');
    
    // Check again
    await checkDatabase();
    
    console.log('\n✅ Done! Check your app to see the new data.');
  } else {
    console.log('\n❌ Collection failed. Check Supabase logs for details.');
    console.log('💡 Make sure OPENWEATHERMAP_API_KEY is set in Supabase environment variables.');
  }
}

main().catch(console.error);

