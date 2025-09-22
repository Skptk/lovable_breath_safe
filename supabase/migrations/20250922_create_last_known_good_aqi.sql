-- Migration: Create persistent table for last-known-good AQI station per location
CREATE TABLE IF NOT EXISTS last_known_good_aqi (
    id SERIAL PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    station_uid INTEGER NOT NULL,
    station_name TEXT NOT NULL,
    station_lat DOUBLE PRECISION NOT NULL,
    station_lon DOUBLE PRECISION NOT NULL,
    aqi INTEGER NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lat, lon)
);

-- Index for fast lookup by coordinates
CREATE INDEX IF NOT EXISTS idx_last_known_good_aqi_lat_lon ON last_known_good_aqi (lat, lon);
