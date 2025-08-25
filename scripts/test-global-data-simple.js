#!/usr/bin/env node

/**
 * Simple Test for Global Environmental Data
 * 
 * This script tests what data is being returned from the database
 * to identify where the "Initial Data" is coming from.
 * 
 * Usage:
 * node scripts/test-global-data-simple.js
 */

import https from 'https';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs'; // Added missing import for fs

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to read environment variables from .env.local
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

try {
  // Simple file read without external dependencies
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse environment variables
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key === 'VITE_SUPABASE_URL') SUPABASE_URL = value?.trim();
    if (key === 'VITE_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = value?.trim();
  });
} catch (error) {
  console.log('⚠️  Could not read .env.local file, please set environment variables manually');
}

// If environment variables are not set, prompt user
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('❌ Environment variables not found');
  console.log('Please set the following in your .env.local file:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.log('');
  console.log('Or run this script with the variables set:');
  console.log('VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key node scripts/test-global-data-simple.js');
  process.exit(1);
}

// Function to make HTTP request to Supabase Edge Function
function invokeEdgeFunction(functionName, body = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: `/functions/v1/${functionName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
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

// Function to test the database function directly
async function testDatabaseFunction() {
  try {
    console.log('🔍 Testing database function: get_all_active_environmental_data');
    
    const response = await invokeEdgeFunction('get-all-active-environmental-data', {});
    
    if (response.status === 200) {
      console.log('✅ Database function call successful');
      console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`📈 Found ${response.data.length} records`);
        
        // Check data sources
        const dataSources = [...new Set(response.data.map(item => item.data_source))];
        console.log('🏷️  Data sources found:', dataSources);
        
        // Check for Initial Data
        const initialDataRecords = response.data.filter(item => 
          item.data_source === 'Initial Data' || 
          item.data_source.toLowerCase().includes('initial')
        );
        
        if (initialDataRecords.length > 0) {
          console.log('🚨 Found Initial Data records:');
          initialDataRecords.forEach(record => {
            console.log(`   - ${record.city_name}: ${record.data_source} (AQI: ${record.aqi})`);
          });
        } else {
          console.log('✅ No Initial Data records found');
        }
        
        // Check for OpenWeatherMap API data
        const openWeatherMapRecords = response.data.filter(item => 
          item.data_source === 'OpenWeatherMap API'
        );
        
        if (openWeatherMapRecords.length > 0) {
          console.log('✅ Found OpenWeatherMap API records:');
          openWeatherMapRecords.forEach(record => {
            console.log(`   - ${record.city_name}: ${record.data_source} (AQI: ${record.aqi}, Timestamp: ${record.collection_timestamp})`);
          });
        } else {
          console.log('⚠️  No OpenWeatherMap API records found');
        }
        
      } else {
        console.log('⚠️  No data returned from database function');
      }
    } else {
      console.error('❌ Database function call failed');
      console.error('📊 Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing database function:', error.message);
  }
}

// Function to test the scheduled data collection
async function testScheduledDataCollection() {
  try {
    console.log('\n🔍 Testing scheduled data collection...');
    
    const response = await invokeEdgeFunction('scheduled-data-collection', {
      manual: false
    });
    
    if (response.status === 200) {
      console.log('✅ Scheduled data collection successful');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.error('❌ Scheduled data collection failed');
      console.error('📊 Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing scheduled data collection:', error.message);
  }
}

// Main test function
async function testGlobalEnvironmentalData() {
  try {
    console.log('🧪 Testing Global Environmental Data Hook');
    console.log('='.repeat(50));
    console.log(`📅 Test time: ${new Date().toISOString()}`);
    console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
    console.log(`🔑 Using anon key: ${SUPABASE_ANON_KEY ? '✅' : '❌'}`);
    
    // Test 1: Database function
    await testDatabaseFunction();
    
    // Test 2: Scheduled data collection
    await testScheduledDataCollection();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 Analysis Summary:');
    console.log('');
    console.log('If you see "Initial Data" in the database function results,');
    console.log('then the issue is in the database itself, not the hook.');
    console.log('');
    console.log('If you see "OpenWeatherMap API" data, then the hook is');
    console.log('working correctly and the issue is elsewhere.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check the database function results above');
    console.log('2. Run the SQL query in Supabase dashboard');
    console.log('3. Trigger scheduled data collection if needed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Main execution
console.log('🧪 Global Environmental Data Hook Test (Simple)');
console.log('This script will test what data the hook is actually returning\n');

testGlobalEnvironmentalData()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
