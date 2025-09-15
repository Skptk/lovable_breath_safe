// Test script for verifying AQICN station selection fixes
console.log('🧪 Testing AQICN Station Selection Fixes');

// Test coordinates
const testCases = [
  {
    name: 'Nairobi, Kenya',
    lat: -1.2841,
    lon: 36.8155,
    expectedCountry: 'KE',
    expectedStationInCountry: true
  },
  {
    name: 'Kigali, Rwanda', 
    lat: -1.9536,
    lon: 30.0605,
    expectedCountry: 'RW',
    expectedStationInCountry: true
  },
  {
    name: 'Remote Location (should use global fallback)',
    lat: 0.0,
    lon: 0.0,
    expectedCountry: 'UNKNOWN',
    expectedStationInCountry: false
  }
];

async function testStationSelection(testCase) {
  console.log(`\n📍 Testing: ${testCase.name}`);
  console.log(`   Coordinates: ${testCase.lat}, ${testCase.lon}`);
  
  try {
    // This would be the API call to test - replace with actual Netlify URL
    const response = await fetch('https://yourapp.netlify.app/.netlify/functions/fetchAQI', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: testCase.lat,
        lon: testCase.lon
      })
    });
    
    if (!response.ok) {
      console.log(`   ❌ HTTP Error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`   ❌ API Error: ${data.message}`);
      return;
    }
    
    // Validate response structure
    console.log(`   ✅ Response received`);
    console.log(`   📊 AQI: ${data.aqi}`);
    console.log(`   🏢 Station: ${data.stationName}`);
    console.log(`   📏 Distance: ${data.computedDistanceKm}km`);
    console.log(`   🆔 Station UID: ${data.stationUid}`);
    console.log(`   🌍 Country: ${data.meta?.userCountry || 'Unknown'}`);
    
    // Validation checks
    const checks = {
      hasValidAQI: data.aqi > 0,
      hasStationName: !!data.stationName,
      hasValidDistance: data.computedDistanceKm >= 0,
      hasStationUID: !!data.stationUid,
      distanceReasonable: data.computedDistanceKm < 1000, // Less than 1000km
      hasMetadata: !!data.meta,
      hasCandidates: data.meta?.candidates?.length > 0
    };
    
    console.log(`   ✅ Validation Results:`);
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`      ${passed ? '✅' : '❌'} ${check}`);
    });
    
    // Test-specific validation
    if (testCase.expectedStationInCountry && data.meta?.userCountry) {
      const countryMatch = data.meta.userCountry === testCase.expectedCountry;
      console.log(`      ${countryMatch ? '✅' : '❌'} Country detection: ${data.meta.userCountry} ${countryMatch ? 'matches' : 'does not match'} expected ${testCase.expectedCountry}`);
    }
    
    console.log(`   📊 Debug Info:`);
    console.log(`      Selection: ${data.meta?.chosen || 'unknown'}`);
    console.log(`      Reason: ${data.meta?.selectionReason || 'Not provided'}`);
    console.log(`      Candidates: ${data.meta?.candidates?.length || 0}`);
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

// Instructions for manual testing
console.log(`
🧪 AQICN Station Selection Test Suite

To test the fixes:

1. Wait for Netlify deployment to complete (check GitHub Actions)
2. Replace 'yourapp.netlify.app' with your actual Netlify URL
3. Run this script in browser console or Node.js
4. Check for:
   - ✅ No more distance = 0.0 errors for different cities
   - ✅ Station UIDs are present
   - ✅ Computed distances are accurate (Haversine)
   - ✅ Primary/fallback selection works
   - ✅ Country detection and preference works
   - ✅ DataSourceValidator shows station details

Expected Results:
- Nairobi: Should get Kenyan station, distance > 0
- Kigali: Should get Rwandan station, distance > 0  
- Remote: Should get nearest global station or error

Test in Browser Console:
1. Open your deployed app
2. Open browser dev tools (F12)
3. Go to Console tab
4. Check for logs like:
   "✅ [DataSourceValidator] dataSource: 'AQICN' - Station: StationName, AQI: X, Distance: Y.Zkm, uid: 12345"

Realtime Testing:
1. Go to Profile page
2. Check console for no duplicate subscription logs
3. Check WebSocket doesn't repeatedly disconnect/reconnect
4. Look for: "🔔 [SimpleRealtimeContext] Subscribing to notifications for user: ..."
`);

export { testCases, testStationSelection };