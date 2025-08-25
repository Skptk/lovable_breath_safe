# Server-Side Data Collection System

## Overview

This document describes the new server-side data collection system that replaces the problematic client-side 15-minute refresh loops. The system automatically collects environmental data every 15 minutes on the server and stores it in the database for all users to access.

## Problem Solved

### Previous Issues
- **Client-side API calls every 15 minutes** causing performance problems
- **Rate limiting** from external APIs affecting user experience
- **Inconsistent data updates** depending on user activity
- **Resource waste** from multiple users making duplicate API calls
- **Poor user experience** during API failures or slow responses

### New Solution
- **Server-side data collection** every 15 minutes regardless of user activity
- **Centralized data storage** in database for instant access
- **Eliminated client-side API calls** - users fetch from stored data
- **Consistent data updates** for all users simultaneously
- **Better performance** and reduced resource usage

## System Architecture

### 1. Scheduled Data Collection Edge Function
**Location**: `supabase/functions/scheduled-data-collection/`

**Purpose**: Automatically collects environmental data from OpenWeatherMap APIs every 15 minutes

**Features**:
- Collects data for 8 major Kenyan cities
- Comprehensive environmental metrics (AQI, weather, pollutants)
- Automatic error handling and fallback strategies
- Database storage with proper indexing

**Cities Covered**:
- Nairobi, Mombasa, Kisumu, Nakuru
- Eldoret, Thika, Kakamega, Kisii

### 2. Database Storage
**Table**: `global_environmental_data`

**Structure**:
- City information (name, country, coordinates)
- Environmental metrics (AQI, PM2.5, PM10, NO2, SO2, CO, O3)
- Weather data (temperature, humidity, wind, pressure, visibility)
- Collection metadata (timestamp, source, active status)

**Key Features**:
- Only one active record per city (latest data)
- Comprehensive indexing for fast queries
- RLS policies for secure access
- Automatic data aging and cleanup

### 3. Client-Side Data Access
**Hook**: `useGlobalEnvironmentalData`

**Purpose**: Fetches environmental data from stored database records instead of external APIs

**Features**:
- Location-based nearest city data
- City-specific data retrieval
- All cities data access
- Automatic refresh every 15 minutes
- Error handling and fallback strategies

## Implementation Details

### Edge Function Configuration

#### Environment Variables Required
```bash
OPENWEATHERMAP_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Manual Trigger
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduled-data-collection \
  -H "Content-Type: application/json" \
  -d '{"manual": true, "city": "Nairobi"}'
```

### Database Functions

#### Get Nearest Environmental Data
```sql
SELECT * FROM get_nearest_environmental_data(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_max_distance_km DECIMAL DEFAULT 50
);
```

#### Get All Active Environmental Data
```sql
SELECT * FROM get_all_active_environmental_data();
```

### Client-Side Usage

#### Basic Usage
```typescript
import { useGlobalEnvironmentalData } from '@/hooks/useGlobalEnvironmentalData';

const { data, isLoading, error, refetch } = useGlobalEnvironmentalData({
  latitude: userLat,
  longitude: userLng,
  maxDistanceKm: 50
});
```

#### City-Specific Data
```typescript
const { data, isLoading } = useGlobalEnvironmentalData({
  cityName: 'Nairobi'
});
```

#### All Cities Data
```typescript
const { allCitiesData, isLoading } = useGlobalEnvironmentalData();
```

## Data Flow

### 1. Scheduled Collection (Every 15 Minutes)
```
GitHub Actions Cron → Edge Function → OpenWeatherMap APIs → Database Storage
```

### 2. User Data Access
```
User Login → useGlobalEnvironmentalData Hook → Database Query → Instant Data Display
```

### 3. Data Updates
```
Server Collection → Database Update → Real-time Notification → Client Refresh
```

## Benefits

### Performance Improvements
- **Instant data access** - no more API call delays
- **Reduced client-side processing** - data already processed and stored
- **Better caching** - centralized caching strategy
- **Faster page loads** - data available immediately

### Reliability Enhancements
- **Consistent data updates** - every 15 minutes regardless of user activity
- **Better error handling** - server-side error management
- **Fallback strategies** - multiple data sources and error recovery
- **Data persistence** - no data loss during client failures

### User Experience
- **Smooth interactions** - no more loading delays
- **Real-time updates** - data refreshes automatically
- **Offline support** - cached data available when offline
- **Consistent experience** - same data for all users

### Resource Optimization
- **Reduced API calls** - single collection instead of multiple user calls
- **Better rate limit management** - controlled server-side API usage
- **Efficient caching** - shared data across all users
- **Reduced bandwidth** - no duplicate data transfers

## Migration Guide

### For Existing Components

#### Before (Client-side API calls)
```typescript
// Old approach - direct API calls
const { data, isLoading } = useAirQuality(); // Calls external APIs
```

#### After (Server-side data)
```typescript
// New approach - database queries
const { data, isLoading } = useGlobalEnvironmentalData({
  latitude: userLat,
  longitude: userLng
});
```

### Component Updates Required

1. **AirQualityDashboard**: Now uses `useGlobalEnvironmentalData`
2. **WeatherStats**: Fetches from stored environmental data
3. **BackgroundManager**: Uses centralized data instead of individual API calls
4. **Any component using external weather/air quality APIs**

### Backward Compatibility
- **Existing data structures** maintained
- **API interfaces** remain the same
- **Component props** unchanged
- **User experience** improved without breaking changes

## Monitoring and Maintenance

### Health Checks
- **Edge Function logs** - monitor collection success/failure
- **Database performance** - track query performance and storage
- **API rate limits** - monitor external API usage
- **Data freshness** - ensure data is collected every 15 minutes

### Troubleshooting
- **Collection failures** - check Edge Function logs and API keys
- **Data staleness** - verify GitHub Actions cron job execution
- **Performance issues** - monitor database query performance
- **User complaints** - check data availability and freshness

### Scaling Considerations
- **Additional cities** - easily add more cities to the collection
- **Data retention** - implement data archiving for historical analysis
- **Performance optimization** - add more database indexes as needed
- **Geographic expansion** - extend coverage to other regions

## Security Considerations

### Data Access
- **RLS policies** - users can only access public environmental data
- **Service role access** - Edge Function uses service role for data insertion
- **API key protection** - keys stored in Supabase environment variables
- **User isolation** - personal data remains private and secure

### API Security
- **Rate limiting** - controlled API usage to prevent abuse
- **Error handling** - no sensitive information exposed in error messages
- **Input validation** - all inputs validated before processing
- **Secure storage** - data encrypted at rest and in transit

## Future Enhancements

### Planned Features
- **Machine learning** - predictive air quality modeling
- **Advanced analytics** - historical trend analysis and forecasting
- **Multi-region support** - expand beyond Kenya to other countries
- **Real-time alerts** - push notifications for poor air quality

### Technical Improvements
- **Advanced caching** - Redis integration for better performance
- **Data compression** - optimize storage and transfer
- **API diversification** - multiple data sources for redundancy
- **Performance monitoring** - real-time system health metrics

## Conclusion

The server-side data collection system successfully addresses the client-side refresh issues while providing significant improvements in performance, reliability, and user experience. By centralizing data collection and storage, the system eliminates the need for individual users to make API calls while ensuring consistent, up-to-date environmental data is always available.

This architecture provides a solid foundation for future enhancements and scaling while maintaining the existing user interface and experience.
