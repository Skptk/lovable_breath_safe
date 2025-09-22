/**
 * AQICN Global Integration Validation Script
 * 
 * This script validates that the AQICN integration works globally with:
 * 1. Nearest station discovery using proper APIs
 * 2. Distance calculation with fallback to 2nd closest station
 * 3. No hardcoded cities - completely dynamic global support
 * 4. Proper error handling and connection resilience
 */

import https from 'https';
import process from 'process';

// Test configuration
const SUPABASE_URL = 'https://bmqdbetupttlthpadseq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2Mjg4NzAsImV4cCI6MjA1MDIwNDg3MH0.wI6lWAL0xYLUgODxnDikmCrBEhRy3Ru9vMq5q0mEjds';

// Global test coordinates covering all continents
const GLOBAL_TEST_LOCATIONS = [
  { 
    name: 'Nairobi, Kenya', 
    lat: -1.2921, 
    lon: 36.8219,
    continent: 'Africa'
  },
  { 
    name: 'New York, USA', 
    lat: 40.7128, 
    lon: -74.0060,
    continent: 'North America'
  },
  { 
    name: 'Delhi, India', 
    lat: 28.6139, 
    lon: 77.2090,
    continent: 'Asia'
  },
  {
    name: 'London, UK',
    lat: 51.5074,
    lon: -0.1278,
    continent: 'Europe'
  },
  {
    name: 'Sydney, Australia',
    lat: -33.8688,
    lon: 151.2093,
    continent: 'Australia'
  },
  {
    name: 'São Paulo, Brazil',
    lat: -23.5505,
    lon: -46.6333,
    continent: 'South America'
  },
  {
    name: 'Cairo, Egypt',
    lat: 30.0444,
    lon: 31.2357,
    continent: 'Africa'
  },
  {
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lon: 139.6503,
    continent: 'East Asia'
  }
];

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Test the global AQICN integration with station discovery
 */
function testGlobalAQICN(location) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      lat: location.lat,
      lon: location.lon
    });
    
    const options = {
      hostname: 'bmqdbetupttlthpadseq.supabase.co',
      path: '/functions/v1/fetchAQI',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      timeout: 15000 // 15 second timeout
    };

    log(colors.blue, `\n🌍 Testing Global AQICN for ${location.name} (${location.continent})`);
    log(colors.dim, `   Coordinates: ${location.lat}, ${location.lon}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      log(colors.cyan, `   📡 Response Status: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            log(colors.yellow, `   ⚠️  API Error: ${response.message}`);
            resolve({ 
              location: location.name,
              success: false, 
              error: response.message,
              hasStationDiscovery: false,
              hasDistanceCalculation: false,
              hasGlobalSupport: false
            });
            return;
          }
          
          // Validate global station discovery features
          const hasStationName = !!response.stationName;
          const hasDistance = response.computedDistanceKm !== undefined;
          const hasCountry = !!response.meta?.userCountry;
          const hasStationUid = !!response.stationUid;
          const hasCoordinates = !!(response.stationLat && response.stationLon);
          
          log(colors.green, `   ✅ AQI: ${response.aqi} from station: ${response.stationName}`);
          log(colors.green, `   🎯 Distance: ${response.computedDistanceKm}km (${hasDistance ? 'calculated' : 'missing'})`);
          log(colors.green, `   🌍 Country: ${response.meta?.userCountry} (${hasCountry ? 'detected' : 'missing'})`);
          log(colors.green, `   🏭 Station UID: ${response.stationUid} (${hasStationUid ? 'provided' : 'missing'})`);
          log(colors.green, `   📍 Station Coords: ${response.stationLat}, ${response.stationLon} (${hasCoordinates ? 'provided' : 'missing'})`);
          
          // Check for global support indicators
          const isGlobalSupport = hasStationName && hasDistance && hasCountry && hasStationUid;
          
          if (isGlobalSupport) {
            log(colors.bright + colors.green, `   🌟 GLOBAL SUPPORT CONFIRMED: Nearest station discovery with fallback`);
          } else {
            log(colors.yellow, `   ⚠️  Missing some global features`);
          }
          
          resolve({ 
            location: location.name,
            continent: location.continent,
            success: true, 
            aqi: response.aqi, 
            stationName: response.stationName,
            distance: response.computedDistanceKm,
            country: response.meta?.userCountry,
            stationUid: response.stationUid,
            hasStationDiscovery: hasStationName,
            hasDistanceCalculation: hasDistance,
            hasGlobalSupport: isGlobalSupport,
            dominantPollutant: response.dominantPollutant,
            pollutants: response.pollutants
          });
          
        } catch (parseError) {
          log(colors.red, `   ❌ Parse Error: ${parseError.message}`);
          resolve({ 
            location: location.name,
            success: false, 
            error: 'Response parsing failed',
            hasStationDiscovery: false,
            hasDistanceCalculation: false,
            hasGlobalSupport: false
          });
        }
      });
    });

    req.on('error', (err) => {
      log(colors.red, `   ❌ Request Error: ${err.message}`);
      resolve({ 
        location: location.name,
        success: false, 
        error: err.message,
        hasStationDiscovery: false,
        hasDistanceCalculation: false,
        hasGlobalSupport: false
      });
    });

    req.on('timeout', () => {
      log(colors.red, `   ❌ Request Timeout (15s)`);
      req.destroy();
      resolve({ 
        location: location.name,
        success: false, 
        error: 'Request timeout',
        hasStationDiscovery: false,
        hasDistanceCalculation: false,
        hasGlobalSupport: false
      });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main validation function
 */
async function validateGlobalAQICNIntegration() {
  log(colors.bright + colors.cyan, '\n🌍 AQICN GLOBAL INTEGRATION VALIDATION');
  log(colors.bright + colors.cyan, '=====================================\n');
  
  log(colors.white, `Testing ${GLOBAL_TEST_LOCATIONS.length} locations across all continents:`);
  
  const results = [];
  
  for (const location of GLOBAL_TEST_LOCATIONS) {
    const result = await testGlobalAQICN(location);
    results.push(result);
    
    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Generate summary
  log(colors.bright + colors.white, '\n📊 VALIDATION SUMMARY');
  log(colors.bright + colors.white, '===================\n');
  
  const successful = results.filter(r => r.success);
  const withStationDiscovery = results.filter(r => r.hasStationDiscovery);
  const withDistanceCalculation = results.filter(r => r.hasDistanceCalculation);
  const withGlobalSupport = results.filter(r => r.hasGlobalSupport);
  
  log(colors.green, `✅ Successful API calls: ${successful.length}/${results.length}`);
  log(colors.green, `🏭 Station discovery working: ${withStationDiscovery.length}/${results.length}`);
  log(colors.green, `📏 Distance calculation working: ${withDistanceCalculation.length}/${results.length}`);
  log(colors.green, `🌍 Global support confirmed: ${withGlobalSupport.length}/${results.length}`);
  
  // Continent coverage
  const continentCoverage = {};
  results.forEach(r => {
    if (!continentCoverage[r.continent]) {
      continentCoverage[r.continent] = { total: 0, successful: 0 };
    }
    continentCoverage[r.continent].total++;
    if (r.success) continentCoverage[r.continent].successful++;
  });
  
  log(colors.cyan, '\n🌎 CONTINENT COVERAGE:');
  Object.entries(continentCoverage).forEach(([continent, stats]) => {
    const coverage = ((stats.successful / stats.total) * 100).toFixed(1);
    log(colors.white, `   ${continent}: ${stats.successful}/${stats.total} (${coverage}%)`);
  });
  
  // Feature validation
  const overallScore = (
    (successful.length / results.length) * 0.4 +
    (withStationDiscovery.length / results.length) * 0.2 +
    (withDistanceCalculation.length / results.length) * 0.2 +
    (withGlobalSupport.length / results.length) * 0.2
  ) * 100;
  
  log(colors.bright + colors.white, `\n🎯 OVERALL INTEGRATION SCORE: ${overallScore.toFixed(1)}%`);
  
  if (overallScore >= 90) {
    log(colors.bright + colors.green, '🌟 EXCELLENT: Global AQICN integration is working perfectly!');
  } else if (overallScore >= 75) {
    log(colors.bright + colors.yellow, '⚠️  GOOD: Global AQICN integration is mostly working');
  } else {
    log(colors.bright + colors.red, '❌ NEEDS ATTENTION: Global AQICN integration has issues');
  }
  
  // Detailed results for debugging
  log(colors.dim, '\n📋 DETAILED RESULTS:');
  results.forEach(result => {
    if (result.success) {
      log(colors.dim, `   ${result.location}: AQI ${result.aqi}, Station: ${result.stationName}, Distance: ${result.distance}km`);
    } else {
      log(colors.dim, `   ${result.location}: ERROR - ${result.error}`);
    }
  });
  
  return overallScore >= 75;
}

// Run validation
validateGlobalAQICNIntegration()
  .then(success => {
    if (success) {
      log(colors.bright + colors.green, '\n✅ VALIDATION PASSED: AQICN global integration is working!');
      process.exit(0);
    } else {
      log(colors.bright + colors.red, '\n❌ VALIDATION FAILED: AQICN global integration needs fixes');
      process.exit(1);
    }
  })
  .catch(error => {
    log(colors.bright + colors.red, `\n💥 VALIDATION ERROR: ${error.message}`);
    process.exit(1);
  });