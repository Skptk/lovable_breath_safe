#!/usr/bin/env node

/**
 * Test Supabase Edge Function for AQICN Integration
 * 
 * This script tests the scheduled-data-collection Edge Function
 * to verify AQICN integration is working correctly.
 */

import https from 'https';
import process from 'process';

// Configuration
const SUPABASE_URL = 'https://bmqdbetupttlthpadseq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

// Helper function to make HTTPS requests
function makeRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testEdgeFunction() {
  log(colors.bold + colors.blue, '🚀 Testing Supabase Edge Function');
  log(colors.blue, '=====================================\n');

  if (SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
    log(colors.red, '❌ Please set SUPABASE_ANON_KEY environment variable!');
    log(colors.yellow, '   You can find this in your Supabase project settings.');
    return;
  }

  const testUrl = `${SUPABASE_URL}/functions/v1/scheduled-data-collection`;
  
  try {
    log(colors.cyan, '🔍 Testing Edge Function:', testUrl);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    const postData = JSON.stringify({
      manual: true,
      city: 'Nairobi'
    });

    const result = await makeRequest(testUrl, options, postData);
    
    log(colors.green, '📡 Response Status:', result.status);
    log(colors.cyan, '📄 Response Data:');
    console.log(JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.success) {
      log(colors.bold + colors.green, '\n✅ SUCCESS! Edge Function is working correctly');
      
      if (result.data.data && result.data.data.data_source === 'AQICN + OpenWeatherMap API') {
        log(colors.green, '🎉 AQICN integration is active!');
        log(colors.green, `📊 AQI: ${result.data.data.aqi}`);
        log(colors.green, `🌍 City: ${result.data.data.city_name}`);
      } else {
        log(colors.yellow, '⚠️  Still using legacy data source');
        log(colors.yellow, '   Data source:', result.data.data?.data_source || 'Unknown');
      }
    } else {
      log(colors.red, '❌ Edge Function test failed');
      if (result.data.error) {
        log(colors.red, '   Error:', result.data.error);
      }
    }

  } catch (error) {
    log(colors.red, '💥 Test failed:', error.message);
  }
}

async function testFullCollection() {
  log(colors.bold + colors.blue, '\n🔄 Testing Full Data Collection');
  log(colors.blue, '===================================\n');

  const testUrl = `${SUPABASE_URL}/functions/v1/scheduled-data-collection`;
  
  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };

    const postData = JSON.stringify({
      manual: true
    });

    log(colors.cyan, '🚀 Triggering full data collection for all cities...');
    
    const result = await makeRequest(testUrl, options, postData);
    
    log(colors.green, '📡 Response Status:', result.status);
    log(colors.cyan, '📄 Response Data:');
    console.log(JSON.stringify(result.data, null, 2));

    if (result.status === 200 && result.data.success) {
      log(colors.bold + colors.green, '\n✅ Full data collection completed successfully!');
      log(colors.green, `📊 Cities processed: ${result.data.cities_processed || 'Unknown'}`);
      log(colors.green, `⏰ Timestamp: ${result.data.timestamp}`);
    } else {
      log(colors.red, '❌ Full data collection failed');
    }

  } catch (error) {
    log(colors.red, '💥 Full collection test failed:', error.message);
  }
}

async function runTests() {
  log(colors.bold + colors.cyan, '🧪 SUPABASE EDGE FUNCTION TEST');
  log(colors.cyan, '================================\n');

  await testEdgeFunction();
  await testFullCollection();

  log(colors.cyan, '\n📚 Next Steps:');
  log(colors.cyan, '1. If tests pass, AQICN integration is working!');
  log(colors.cyan, '2. Check your app - console logs should show "AQICN + OpenWeatherMap API"');
  log(colors.cyan, '3. Monitor data quality and accuracy improvements');
  log(colors.cyan, '4. The system will automatically collect data every 15 minutes');
}

// Run the tests
runTests().catch(error => {
  log(colors.red, '💥 Script failed:', error.message);
  process.exit(1);
});