# Air Quality Edge Function - Enhanced Version

## Overview
This edge function collects air quality data from OpenAQ API and provides real-time air quality information with enhanced error handling, caching, and monitoring.

## Recent Improvements (Latest Update)

### 1. **Smart Caching System**
- **Cache Duration**: 5 minutes for successful API responses
- **Cache Size**: Maximum 100 entries with automatic cleanup
- **Cache Key**: Based on rounded coordinates to reduce fragmentation
- **Benefits**: 
  - Reduces API calls for repeated requests
  - Improves response times
  - Reduces load on OpenAQ API

### 2. **Enhanced Error Tracking & Alerting**
- **Failure Tracking**: Monitors API failures by endpoint
- **Consecutive Failure Detection**: Alerts after 3+ consecutive failures
- **Rate-based Alerts**: Alerts after 5+ failures for any endpoint
- **Alert Throttling**: Maximum 1 alert per 15 minutes
- **Alert Format**: 🚨 ALERT messages with detailed failure information

### 3. **Improved Location Detection**
- **Multiple Fallback Strategies**: Grid search + reverse geocoding
- **Better Country Detection**: Uses country name when available
- **Enhanced City Identification**: More accurate location naming
- **Fallback Chain**: Multiple API endpoints for better coverage

### 4. **Performance Optimizations**
- **Early Cache Returns**: Check cache before API calls
- **Reduced API Calls**: Cache successful responses
- **Smart Fallbacks**: Use cached data when APIs fail
- **Memory Management**: Automatic cache cleanup

## API Endpoints Used
1. **Primary**: OpenAQ v3 measurements
2. **Secondary**: OpenAQ v3 locations  
3. **Fallback**: OpenAQ v2 measurements
4. **Location**: OpenAQ v2 cities (reverse geocoding)

## Error Handling Strategy
- **Graceful Degradation**: Always return data (API or fallback)
- **Multiple Retry Paths**: 3 different API endpoints
- **Fallback Values**: Nairobi region defaults when APIs fail
- **User Experience**: App remains functional despite API issues

## Monitoring & Alerts
The function now provides comprehensive monitoring:
- API failure rates by endpoint
- Consecutive failure tracking
- Automatic alerting for system issues
- Detailed logging for debugging

## Cache Configuration
```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum entries
```

## Usage
The function automatically:
1. Checks cache for recent requests
2. Falls back to cached data when APIs fail
3. Tracks and alerts on API failures
4. Provides consistent user experience

## Benefits
- **Reduced API Costs**: Fewer calls to OpenAQ
- **Better Performance**: Faster responses for cached data
- **Improved Reliability**: Graceful handling of API failures
- **Better Monitoring**: Proactive alerting for issues
- **Enhanced UX**: Consistent data availability
