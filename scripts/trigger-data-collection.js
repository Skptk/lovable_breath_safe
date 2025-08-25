#!/usr/bin/env node

/**
 * Manual Trigger for Scheduled Data Collection
 * 
 * This script manually triggers the scheduled data collection Edge Function
 * to populate the database with real OpenWeatherMap API data, replacing
 * any "Initial Data" placeholder records.
 * 
 * Usage:
 * node scripts/trigger-data-collection.js [city]
 * 
 * Examples:
 * - node scripts/trigger-data-collection.js                    # Collect data for all cities
 * - node scripts/trigger-data-collection.js Nairobi           # Collect data for specific city
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅' : '❌');
  console.error('\nPlease check your .env.local file');
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

// Main function to trigger data collection
async function triggerDataCollection(city = null) {
  try {
    console.log('🚀 Triggering scheduled data collection...');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    if (city) {
      console.log(`🌍 Collecting data for city: ${city}`);
      const response = await invokeEdgeFunction('scheduled-data-collection', {
        manual: true,
        city: city
      });
      
      if (response.status === 200) {
        console.log('✅ Data collection successful for', city);
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.error('❌ Data collection failed for', city);
        console.error('📊 Response:', JSON.stringify(response.data, null, 2));
      }
    } else {
      console.log('🌍 Collecting data for all cities...');
      const response = await invokeEdgeFunction('scheduled-data-collection', {
        manual: false
      });
      
      if (response.status === 200) {
        console.log('✅ Data collection successful for all cities');
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.error('❌ Data collection failed for all cities');
        console.error('📊 Response:', JSON.stringify(response.data, null, 2));
      }
    }
    
    console.log('\n⏰ Waiting 5 seconds for data to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🔍 Checking database status...');
    await checkDatabaseStatus();
    
  } catch (error) {
    console.error('❌ Error triggering data collection:', error.message);
    process.exit(1);
  }
}

// Function to check database status
async function checkDatabaseStatus() {
  try {
    console.log('📊 Checking current database records...');
    
    // This would require a database query function
    // For now, we'll just show a message
    console.log('ℹ️  To verify the data was collected, check your Supabase dashboard');
    console.log('ℹ️  Look for records in the global_environmental_data table');
    console.log('ℹ️  Data source should be "OpenWeatherMap API" not "Initial Data"');
    
  } catch (error) {
    console.error('❌ Error checking database status:', error.message);
  }
}

// Main execution
const city = process.argv[2];

if (city) {
  console.log(`🎯 Manual trigger for city: ${city}`);
} else {
  console.log('🌍 Manual trigger for all cities');
}

triggerDataCollection(city)
  .then(() => {
    console.log('\n✅ Data collection trigger completed');
    console.log('📱 Check your app to see if real data is now displayed');
  })
  .catch((error) => {
    console.error('\n❌ Data collection trigger failed:', error.message);
    process.exit(1);
  });
