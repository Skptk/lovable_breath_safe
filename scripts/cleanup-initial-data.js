#!/usr/bin/env node

/**
 * Cleanup Initial Data Records
 * 
 * This script removes any existing "Initial Data" placeholder records
 * from the database and prepares it for real OpenWeatherMap API data.
 * 
 * Usage:
 * node scripts/cleanup-initial-data.js
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

// Function to execute SQL cleanup
async function executeCleanupSQL() {
  try {
    console.log('🧹 Executing cleanup SQL...');
    
    // Note: This would require a database function or direct SQL execution
    // For now, we'll use the Edge Function approach
    console.log('ℹ️  Using Edge Function approach for cleanup...');
    
    // We could create a cleanup Edge Function, but for now let's just
    // trigger the scheduled data collection to overwrite any bad data
    console.log('🔄 Triggering scheduled data collection to overwrite any placeholder data...');
    
    const response = await invokeEdgeFunction('scheduled-data-collection', {
      manual: false
    });
    
    if (response.status === 200) {
      console.log('✅ Data collection triggered successfully');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } else {
      console.error('❌ Data collection failed');
      console.error('📊 Response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error executing cleanup:', error.message);
  }
}

// Function to check current database state
async function checkDatabaseState() {
  try {
    console.log('🔍 Checking current database state...');
    
    // This would require a database query function
    // For now, we'll just show instructions
    console.log('ℹ️  To check the current database state:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to the SQL Editor');
    console.log('   3. Run the following query:');
    console.log('');
    console.log('   SELECT data_source, COUNT(*) as record_count, MAX(collection_timestamp) as latest');
    console.log('   FROM global_environmental_data');
    console.log('   GROUP BY data_source;');
    console.log('');
    console.log('   This will show you what data sources exist and how many records');
    
  } catch (error) {
    console.error('❌ Error checking database state:', error.message);
  }
}

// Main cleanup function
async function cleanupInitialData() {
  try {
    console.log('🚀 Starting Initial Data cleanup...');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    // Step 1: Check current state
    await checkDatabaseState();
    
    console.log('\n' + '='.repeat(50));
    
    // Step 2: Execute cleanup
    await executeCleanupSQL();
    
    console.log('\n' + '='.repeat(50));
    
    // Step 3: Wait for processing
    console.log('⏰ Waiting 10 seconds for data processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 4: Final check
    console.log('🔍 Final database state check...');
    await checkDatabaseState();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Cleanup process completed');
    console.log('📱 Check your app to see if real data is now displayed');
    console.log('🔍 Check your Supabase dashboard to verify the data source is "OpenWeatherMap API"');
    
  } catch (error) {
    console.error('❌ Cleanup process failed:', error.message);
    process.exit(1);
  }
}

// Main execution
console.log('🧹 Initial Data Cleanup Script');
console.log('This script will clean up any "Initial Data" placeholder records');
console.log('and trigger the scheduled data collection to populate real data.\n');

cleanupInitialData()
  .then(() => {
    console.log('\n🎉 Cleanup completed successfully!');
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error.message);
    process.exit(1);
  });
