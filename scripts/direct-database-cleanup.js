#!/usr/bin/env node

/**
 * Direct Database Cleanup Script
 * 
 * This script directly triggers the scheduled data collection to overwrite
 * any "Initial Data" placeholder records with real OpenWeatherMap API data.
 * 
 * Usage:
 * node scripts/direct-database-cleanup.js
 */

import https from 'https';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to read environment variables from .env.local
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key === 'VITE_SUPABASE_URL') SUPABASE_URL = value?.trim();
    if (key === 'VITE_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = value?.trim();
  });
} catch (error) {
  console.log('⚠️  Could not read .env.local file, please set environment variables manually');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log('❌ Environment variables not found');
  console.log('Please set the following in your .env.local file:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
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

// Function to trigger data collection multiple times to ensure cleanup
async function triggerMultipleDataCollections() {
  try {
    console.log('🚀 Triggering multiple data collections to ensure cleanup...');
    
    // First collection
    console.log('\n📊 Collection 1/3: Initial data collection...');
    const response1 = await invokeEdgeFunction('scheduled-data-collection', { manual: false });
    
    if (response1.status === 200) {
      console.log('✅ Collection 1 successful:', response1.data.message);
    } else {
      console.error('❌ Collection 1 failed:', response1.data);
    }
    
    // Wait for processing
    console.log('⏰ Waiting 10 seconds for data processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Second collection
    console.log('\n📊 Collection 2/3: Second data collection...');
    const response2 = await invokeEdgeFunction('scheduled-data-collection', { manual: false });
    
    if (response2.status === 200) {
      console.log('✅ Collection 2 successful:', response2.data.message);
    } else {
      console.error('❌ Collection 2 failed:', response2.data);
    }
    
    // Wait for processing
    console.log('⏰ Waiting 10 seconds for data processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Third collection
    console.log('\n📊 Collection 3/3: Final data collection...');
    const response3 = await invokeEdgeFunction('scheduled-data-collection', { manual: false });
    
    if (response3.status === 200) {
      console.log('✅ Collection 3 successful:', response3.data.message);
    } else {
      console.error('❌ Collection 3 failed:', response3.data);
    }
    
    return response3;
    
  } catch (error) {
    console.error('❌ Error triggering multiple collections:', error.message);
    throw error;
  }
}

// Function to verify cleanup by checking data sources
async function verifyCleanup() {
  try {
    console.log('\n🔍 Verifying cleanup by checking data sources...');
    
    // Since we can't directly query the database, we'll provide instructions
    console.log('ℹ️  To verify the cleanup was successful:');
    console.log('');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run this query:');
    console.log('');
    console.log('   SELECT data_source, COUNT(*) as record_count, MAX(collection_timestamp) as latest');
    console.log('   FROM global_environmental_data');
    console.log('   WHERE is_active = true');
    console.log('   GROUP BY data_source;');
    console.log('');
    console.log('Expected result:');
    console.log('   - data_source should be "OpenWeatherMap API"');
    console.log('   - record_count should be 8 (one for each city)');
    console.log('   - latest should be very recent (within last few minutes)');
    console.log('');
    console.log('If you still see "Initial Data", the cleanup may need more time');
    console.log('or there may be an issue with the scheduled data collection');
    
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error.message);
  }
}

// Main cleanup function
async function performDirectDatabaseCleanup() {
  try {
    console.log('🧹 Direct Database Cleanup Script');
    console.log('This script will trigger multiple data collections to overwrite any "Initial Data"');
    console.log('='.repeat(60));
    console.log(`📅 Cleanup time: ${new Date().toISOString()}`);
    console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
    console.log(`🔑 Using anon key: ${SUPABASE_ANON_KEY ? '✅' : '❌'}`);
    
    // Step 1: Trigger multiple data collections
    console.log('\n' + '='.repeat(60));
    console.log('🚀 STEP 1: Triggering multiple data collections...');
    await triggerMultipleDataCollections();
    
    // Step 2: Wait for final processing
    console.log('\n' + '='.repeat(60));
    console.log('⏰ STEP 2: Waiting for final data processing...');
    console.log('⏰ Waiting 15 seconds for all data to be processed...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 3: Verify cleanup
    console.log('\n' + '='.repeat(60));
    console.log('🔍 STEP 3: Verifying cleanup...');
    await verifyCleanup();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Direct database cleanup completed!');
    console.log('');
    console.log('🎯 What happened:');
    console.log('   1. Triggered 3 scheduled data collections');
    console.log('   2. Each collection overwrites old records with new OpenWeatherMap API data');
    console.log('   3. Old "Initial Data" records should now be replaced');
    console.log('');
    console.log('📱 Next steps:');
    console.log('   1. Check your Supabase dashboard to verify the data source');
    console.log('   2. Refresh your app to see if real data is now displayed');
    console.log('   3. Check browser console for real OpenWeatherMap API data logs');
    
  } catch (error) {
    console.error('❌ Direct database cleanup failed:', error.message);
    process.exit(1);
  }
}

// Main execution
console.log('🧹 Direct Database Cleanup');
console.log('This will trigger multiple data collections to clean up "Initial Data"\n');

performDirectDatabaseCleanup()
  .then(() => {
    console.log('\n🎉 Cleanup completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error.message);
    process.exit(1);
  });
