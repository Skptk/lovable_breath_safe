#!/usr/bin/env node

/**
 * AQICN API Test Script
 * 
 * This script helps test the AQICN API integration before deploying.
 * Run this to verify your AQICN API key works correctly.
 */

import https from 'https';
import process from 'process';

// Configuration - UPDATE THESE VALUES
const AQICN_API_KEY = process.env.AQICN_API_KEY || 'api_key_here'; // Get from https://aqicn.org/data-platform/token/
const TEST_COORDINATES = [
  { name: 'Nairobi, Kenya', lat: -1.2921, lon: 36.8219 },
  { name: 'Mombasa, Kenya', lat: -4.0435, lon: 39.6682 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060 }, // For comparison
];

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
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Test AQICN API for a specific location
async function testAQICNLocation(location) {
  const url = `https://api.waqi.info/feed/geo:${location.lat};${location.lon}/?token=${AQICN_API_KEY}`;
  
  try {
    log(colors.blue, `\n🌍 Testing ${location.name}...`);
    log(colors.cyan, `   URL: ${url.replace(AQICN_API_KEY, 'YOUR_API_KEY')}`);
    
    const response = await fetchData(url);
    
    if (response.status !== 'ok') {
      log(colors.red, `   ❌ API Error: ${response.data || response.status}`);
      return false;
    }
    
    const data = response.data;
    log(colors.green, `   ✅ Success! Station: ${data.city.name}`);
    log(colors.yellow, `   📊 AQI: ${data.aqi} (${getAQICategory(data.aqi)})`);
    log(colors.cyan, `   🌡️  Pollutants available:`);
    
    // Display available pollutants
    const pollutants = data.iaqi || {};
    Object.keys(pollutants).forEach(pollutant => {
      const value = pollutants[pollutant].v;
      const unit = getPollutantUnit(pollutant);
      log(colors.cyan, `      ${pollutant.toUpperCase()}: ${value}${unit}`);
    });
    
    log(colors.cyan, `   ⏰ Last Update: ${data.time.s}`);
    log(colors.cyan, `   📍 Coordinates: [${data.city.geo[0]}, ${data.city.geo[1]}]`);
    
    return true;
    
  } catch (error) {
    log(colors.red, `   ❌ Error: ${error.message}`);
    return false;
  }
}

// Get AQI category for display
function getAQICategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

// Get pollutant units for display
function getPollutantUnit(pollutant) {
  const units = {
    'pm25': ' μg/m³',
    'pm10': ' μg/m³',
    'o3': ' μg/m³',
    'no2': ' μg/m³',
    'so2': ' μg/m³',
    'co': ' mg/m³',
    't': '°C',
    'h': '%',
    'p': ' hPa',
    'w': ' m/s',
    'wd': '°'
  };
  return units[pollutant] || '';
}

// Main test function
async function runTests() {
  log(colors.bold + colors.green, '🚀 AQICN API Test Script');
  log(colors.bold + colors.green, '=========================\n');
  
  // Check if API key is configured
  if (AQICN_API_KEY === 'your_aqicn_api_key_here') {
    log(colors.red, '❌ Please set AQICN_API_KEY environment variable or update it in this script!');
    log(colors.yellow, '   Option 1: Set environment variable: export AQICN_API_KEY=your_key');
    log(colors.yellow, '   Option 2: Update AQICN_API_KEY variable in this script');
    log(colors.yellow, '   Get your API key from: https://aqicn.org/data-platform/token/');
    process.exit(1);
  }
  
  log(colors.cyan, `🔑 API Key: ${AQICN_API_KEY.substring(0, 8)}...`);
  log(colors.cyan, `🎯 Testing ${TEST_COORDINATES.length} locations\n`);
  
  let successCount = 0;
  let totalCount = TEST_COORDINATES.length;
  
  // Test each location
  for (const location of TEST_COORDINATES) {
    const success = await testAQICNLocation(location);
    if (success) successCount++;
    
    // Add delay between requests to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  log(colors.bold + colors.blue, '\n📋 Test Summary:');
  log(colors.green, `   ✅ Successful: ${successCount}/${totalCount}`);
  log(colors.red, `   ❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    log(colors.bold + colors.green, '\n🎉 All tests passed! AQICN API is working correctly.');
    log(colors.green, '   You can now use this API key in your Supabase environment variables.');
    log(colors.cyan, '   Environment variable name: AQICN_API_KEY');
  } else {
    log(colors.bold + colors.red, '\n⚠️  Some tests failed. Please check:');
    log(colors.yellow, '   1. Your API key is correct and active');
    log(colors.yellow, '   2. You have not exceeded rate limits');
    log(colors.yellow, '   3. The AQICN service is available');
  }
  
  log(colors.cyan, '\n📚 Next Steps:');
  log(colors.cyan, '   1. Add AQICN_API_KEY to your Supabase project environment variables');
  log(colors.cyan, '   2. Deploy the updated Edge Function');
  log(colors.cyan, '   3. Test the data collection manually');
  log(colors.cyan, '   4. Monitor the system for improved data quality');
}

// Run the tests
runTests().catch(error => {
  log(colors.red, '💥 Script failed:', error.message);
  process.exit(1);
});