/**
 * Enhanced AQICN Test Script
 * 
 * Tests the new enhanced AQICN integration with:
 * 1. Global station discovery
 * 2. Intelligent fallback mechanisms
 * 3. Distance-based station selection
 * 4. Comprehensive error handling
 */

import https from 'https';
import process from 'process';

// Test configuration
const SUPABASE_URL = 'https://bmqdbetupttlthpadseq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2Mjg4NzAsImV4cCI6MjA1MDIwNDg3MH0.wI6lWAL0xYLUgODxnDikmCrBEhRy3Ru9vMq5q0mEjds';

// Test coordinates for global coverage
const TEST_LOCATIONS = [
  { 
    name: 'Nairobi, Kenya', 
    lat: -1.2921, 
    lon: 36.8219,
    expectedCountry: 'KE'
  },
  { 
    name: 'New York, USA', 
    lat: 40.7128, 
    lon: -74.0060,
    expectedCountry: 'US'
  },
  { 
    name: 'Delhi, India', 
    lat: 28.6139, 
    lon: 77.2090,
    expectedCountry: 'IN'
  },
  {
    name: 'London, UK',
    lat: 51.5074,
    lon: -0.1278,
    expectedCountry: 'GB'
  },
  {
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lon: 139.6503,
    expectedCountry: 'JP'
  },
  {
    name: 'São Paulo, Brazil',
    lat: -23.5505,
    lon: -46.6333,
    expectedCountry: 'BR'
  }
];

// Colors for console output
const colors = {
  green: '\\x1b[32m',
  red: '\\x1b[31m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  cyan: '\\x1b[36m',
  magenta: '\\x1b[35m',
  reset: '\\x1b[0m',
  bold: '\\x1b[1m',
  dim: '\\x1b[2m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

/**
 * Test the enhanced AQICN Edge Function
 */
function testEnhancedAQICN(location) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      lat: location.lat,
      lon: location.lon
    });
    
    const options = {
      hostname: 'bmqdbetupttlthpadseq.supabase.co',
      path: '/functions/v1/enhanced-aqicn',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      timeout: 15000 // 15 second timeout
    };

    log(colors.blue, `\n🌍 Testing Enhanced AQICN for ${location.name}...`);
    log(colors.dim, `   Coordinates: ${location.lat}, ${location.lon}`);
    log(colors.dim, `   Expected Country: ${location.expectedCountry}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      log(colors.cyan, `   📡 Status Code: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          const results = {
            location: location.name,
            success: false,
            hasStationDiscovery: false,
            hasIntelligentFallback: false,
            hasGlobalSupport: false,
            hasDistanceCalculation: false,
            validAQI: false,
            error: null,
            response: response
          };
          
          if (response.error) {
            log(colors.yellow, `   ⚠️  API returned error: ${response.message}`);
            results.error = response.message;
            resolve(results);
            return;
          }
          
          // Validate enhanced features
          if (response.stationName) {
            results.hasStationDiscovery = true;
            log(colors.green, `   🎯 Station Discovery: ${response.stationName}`);
          }
          
          if (response.distance) {
            results.hasDistanceCalculation = true;
            log(colors.green, `   📏 Distance Calculation: ${response.distance}km`);
          }
          
          if (response.country) {
            results.hasGlobalSupport = true;
            log(colors.green, `   🌎 Global Support: ${response.country}`);
          }
          
          if (response.aqi && response.aqi > 0) {
            results.validAQI = true;
            log(colors.green, `   📊 Valid AQI: ${response.aqi}`);
          }
          
          // Check for intelligent fallback (if coordinates exist)
          if (response.coordinates && response.coordinates.station) {
            results.hasIntelligentFallback = true;
            log(colors.green, `   🔄 Intelligent Fallback: Station coordinates available`);
          }
          
          if (response.dominantPollutant) {
            log(colors.cyan, `   🏭 Dominant Pollutant: ${response.dominantPollutant}`);
          }
          
          if (response.pollutants) {
            const pollutantCount = Object.values(response.pollutants).filter(v => v !== null).length;
            log(colors.cyan, `   📈 Pollutants Available: ${pollutantCount}/6`);
          }
          
          if (response.environmental) {
            const envCount = Object.values(response.environmental).filter(v => v !== null).length;
            log(colors.cyan, `   🌡️  Environmental Data: ${envCount}/3`);
          }
          
          // Overall success check
          results.success = results.hasStationDiscovery && 
                           results.hasDistanceCalculation && 
                           results.hasGlobalSupport && 
                           results.validAQI;
          
          if (results.success) {
            log(colors.bold + colors.green, `   ✅ Enhanced AQICN test PASSED for ${location.name}`);
          } else {
            log(colors.bold + colors.yellow, `   ⚠️  Enhanced AQICN test PARTIALLY PASSED for ${location.name}`);
          }
          
          resolve(results);
          
        } catch (error) {
          log(colors.red, `   ❌ JSON Parse Error: ${error.message}`);
          log(colors.dim, `   Raw Response: ${data}`);
          resolve({
            location: location.name,
            success: false,
            error: error.message,
            response: null
          });
        }
      });
    });
    
    req.on('error', (error) => {
      log(colors.red, `   ❌ Request Error: ${error.message}`);
      resolve({
        location: location.name,
        success: false,
        error: error.message,
        response: null
      });
    });
    
    req.on('timeout', () => {
      log(colors.red, `   ⏰ Request Timeout`);
      req.destroy();
      resolve({
        location: location.name,
        success: false,
        error: 'Request timeout',
        response: null
      });
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Test the original AQICN function for comparison
 */
function testOriginalAQICN(location) {
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
      timeout: 10000
    };

    log(colors.blue, `\n🔄 Testing Original AQICN for ${location.name}...`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            log(colors.yellow, `   ⚠️  Original API error: ${response.message}`);
            resolve({ success: false, error: response.message });
            return;
          }
          
          log(colors.green, `   ✅ Original AQI: ${response.aqi} from ${response.city}`);
          resolve({ success: true, aqi: response.aqi, city: response.city });
          
        } catch (error) {
          log(colors.red, `   ❌ Original API parse error: ${error.message}`);
          resolve({ success: false, error: error.message });
        }
      });
    });
    
    req.on('error', (error) => {
      log(colors.red, `   ❌ Original API request error: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      log(colors.red, `   ⏰ Original API timeout`);
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Generate test summary
 */
function generateSummary(enhancedResults, originalResults) {
  log(colors.bold + colors.blue, '\n📋 ENHANCED AQICN TEST SUMMARY');
  log(colors.blue, '=====================================\n');
  
  const totalTests = enhancedResults.length;
  const successfulEnhanced = enhancedResults.filter(r => r.success).length;
  const successfulOriginal = originalResults.filter(r => r.success).length;
  
  log(colors.green, `✅ Enhanced AQICN Success Rate: ${successfulEnhanced}/${totalTests} (${Math.round(successfulEnhanced/totalTests*100)}%)`);
  log(colors.cyan, `🔄 Original AQICN Success Rate: ${successfulOriginal}/${totalTests} (${Math.round(successfulOriginal/totalTests*100)}%)`);
  
  // Feature analysis
  const featuresAnalysis = {
    stationDiscovery: enhancedResults.filter(r => r.hasStationDiscovery).length,
    distanceCalculation: enhancedResults.filter(r => r.hasDistanceCalculation).length,
    globalSupport: enhancedResults.filter(r => r.hasGlobalSupport).length,
    intelligentFallback: enhancedResults.filter(r => r.hasIntelligentFallback).length
  };
  
  log(colors.magenta, '\n🎯 Enhanced Features Analysis:');
  log(colors.cyan, `   Station Discovery: ${featuresAnalysis.stationDiscovery}/${totalTests} locations`);
  log(colors.cyan, `   Distance Calculation: ${featuresAnalysis.distanceCalculation}/${totalTests} locations`);
  log(colors.cyan, `   Global Support: ${featuresAnalysis.globalSupport}/${totalTests} locations`);
  log(colors.cyan, `   Intelligent Fallback: ${featuresAnalysis.intelligentFallback}/${totalTests} locations`);
  
  // Performance comparison
  log(colors.magenta, '\n⚡ Performance Comparison:');
  enhancedResults.forEach((enhanced, index) => {
    const original = originalResults[index];
    const location = TEST_LOCATIONS[index];
    
    if (enhanced.success && original.success) {
      log(colors.green, `   ${location.name}: Both APIs successful`);
    } else if (enhanced.success && !original.success) {
      log(colors.yellow, `   ${location.name}: Enhanced successful, Original failed`);
    } else if (!enhanced.success && original.success) {
      log(colors.red, `   ${location.name}: Enhanced failed, Original successful`);
    } else {
      log(colors.red, `   ${location.name}: Both APIs failed`);
    }
  });
  
  // Recommendations
  log(colors.bold + colors.magenta, '\n💡 Recommendations:');
  if (successfulEnhanced > successfulOriginal) {
    log(colors.green, '   ✅ Enhanced AQICN shows better global coverage - recommended for deployment');
  } else if (successfulEnhanced === successfulOriginal) {
    log(colors.yellow, '   ⚖️  Both APIs perform similarly - Enhanced provides better features');
  } else {
    log(colors.red, '   ⚠️  Original API performs better - investigate Enhanced AQICN issues');
  }
  
  if (featuresAnalysis.stationDiscovery > totalTests * 0.8) {
    log(colors.green, '   ✅ Station discovery working well across most locations');
  } else {
    log(colors.yellow, '   ⚠️  Station discovery needs improvement for some regions');
  }
  
  if (featuresAnalysis.distanceCalculation > totalTests * 0.8) {
    log(colors.green, '   ✅ Distance calculation functioning properly');
  }
  
  log(colors.cyan, '\n📚 Next Steps:');
  log(colors.cyan, '   1. Deploy Enhanced AQICN function if test results are satisfactory');
  log(colors.cyan, '   2. Update frontend to use enhanced-aqicn endpoint');
  log(colors.cyan, '   3. Monitor production performance and user feedback');
  log(colors.cyan, '   4. Consider fallback to original function for failed regions');
}

/**
 * Main test execution
 */
async function runTests() {
  log(colors.bold + colors.green, '🚀 Enhanced AQICN Global Test Suite');
  log(colors.bold + colors.green, '=====================================\n');
  
  log(colors.cyan, `🎯 Testing ${TEST_LOCATIONS.length} global locations`);
  log(colors.cyan, `📡 Supabase URL: ${SUPABASE_URL}`);
  log(colors.cyan, `🔑 Using provided Supabase key\n`);
  
  const enhancedResults = [];
  const originalResults = [];
  
  // Test each location
  for (const location of TEST_LOCATIONS) {
    try {
      // Test Enhanced AQICN
      const enhancedResult = await testEnhancedAQICN(location);
      enhancedResults.push(enhancedResult);
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test Original AQICN for comparison
      const originalResult = await testOriginalAQICN(location);
      originalResults.push(originalResult);
      
      // Add delay between locations
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      log(colors.red, `💥 Test failed for ${location.name}:`, error.message);
      enhancedResults.push({ location: location.name, success: false, error: error.message });
      originalResults.push({ success: false, error: error.message });
    }
  }
  
  // Generate comprehensive summary
  generateSummary(enhancedResults, originalResults);
}

// Handle script errors
process.on('unhandledRejection', (reason, promise) => {
  log(colors.red, '💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(colors.red, '💥 Uncaught Exception:', error.message);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  log(colors.red, '💥 Test suite failed:', error.message);
  process.exit(1);
});