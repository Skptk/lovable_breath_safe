-- Add duplicate prevention index
-- This migration improves query performance to help prevent future duplicates

-- Add simple index on user_id and timestamp to improve query performance
CREATE INDEX IF NOT EXISTS idx_air_quality_readings_user_timestamp 
ON air_quality_readings (user_id, timestamp);
