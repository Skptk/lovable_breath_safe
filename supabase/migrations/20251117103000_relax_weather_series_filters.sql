-- Update get_weather_series to include rows with any weather metric, not just temperature
CREATE OR REPLACE FUNCTION public.get_weather_series(
  p_user_id UUID,
  p_start_ts TIMESTAMP WITH TIME ZONE,
  p_end_ts TIMESTAMP WITH TIME ZONE,
  p_desired_points INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_data JSONB;
  v_total_count BIGINT;
  v_available_metrics TEXT[];
  v_result JSONB;
  v_bin_size_seconds BIGINT;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only access your own weather data';
  END IF;

  SELECT COUNT(*) INTO v_total_count
  FROM public.air_quality_readings
  WHERE user_id = p_user_id
    AND timestamp >= p_start_ts
    AND timestamp <= p_end_ts
    AND (
      temperature IS NOT NULL OR
      humidity IS NOT NULL OR
      wind_speed IS NOT NULL OR
      wind_gust IS NOT NULL OR
      air_pressure IS NOT NULL OR
      rain_probability IS NOT NULL
    );

  SELECT ARRAY_AGG(metric_name) INTO v_available_metrics
  FROM (
    SELECT 'temperature' as metric_name
    WHERE EXISTS (
      SELECT 1 FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND temperature IS NOT NULL
    )
    UNION ALL
    SELECT 'humidity'
    WHERE EXISTS (
      SELECT 1 FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND humidity IS NOT NULL
    )
    UNION ALL
    SELECT 'windSpeed'
    WHERE EXISTS (
      SELECT 1 FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND wind_speed IS NOT NULL
    )
    UNION ALL
    SELECT 'windGust'
    WHERE EXISTS (
      SELECT 1 FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND wind_gust IS NOT NULL
    )
    UNION ALL
    SELECT 'precipitation'
    WHERE EXISTS (
      SELECT 1 FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND rain_probability IS NOT NULL
    )
    UNION ALL
    SELECT 'airPressure'
    WHERE EXISTS (
      SELECT 1 FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND air_pressure IS NOT NULL
    )
  ) metrics;

  IF v_available_metrics IS NULL OR array_length(v_available_metrics, 1) = 0 THEN
    RETURN jsonb_build_object(
      'raw', '[]'::jsonb,
      'totalCount', 0,
      'availableMetrics', '[]'::jsonb
    );
  END IF;

  IF p_desired_points IS NOT NULL AND p_desired_points > 0 AND v_total_count > p_desired_points THEN
    v_bin_size_seconds := EXTRACT(EPOCH FROM (p_end_ts - p_start_ts)) / p_desired_points;

    IF v_bin_size_seconds < 3600 THEN
      v_bin_size_seconds := 3600;
    ELSIF v_bin_size_seconds < 21600 THEN
      v_bin_size_seconds := 21600;
    ELSIF v_bin_size_seconds < 86400 THEN
      v_bin_size_seconds := 86400;
    ELSE
      v_bin_size_seconds := (CEIL(v_bin_size_seconds / 86400)::BIGINT) * 86400;
    END IF;

    WITH time_buckets AS (
      SELECT 
        to_timestamp(
          FLOOR(EXTRACT(EPOCH FROM timestamp) / v_bin_size_seconds) * v_bin_size_seconds
        )::TIMESTAMP WITH TIME ZONE as bucket_start,
        AVG(temperature) as temperature,
        AVG(humidity) as humidity,
        AVG(wind_speed) as wind_speed,
        AVG(wind_direction) as wind_direction,
        AVG(wind_gust) as wind_gust,
        AVG(air_pressure) as air_pressure,
        AVG(rain_probability) as rain_probability,
        MAX(id) as id,
        MAX(location_name) as location_name,
        MAX(timestamp) as max_timestamp
      FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND (
          temperature IS NOT NULL OR
          humidity IS NOT NULL OR
          wind_speed IS NOT NULL OR
          wind_gust IS NOT NULL OR
          air_pressure IS NOT NULL OR
          rain_probability IS NOT NULL
        )
      GROUP BY bucket_start
      ORDER BY bucket_start
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'timestamp', max_timestamp,
        'location_name', location_name,
        'temperature', temperature,
        'humidity', humidity,
        'wind_speed', wind_speed,
        'wind_direction', wind_direction,
        'wind_gust', wind_gust,
        'air_pressure', air_pressure,
        'rain_probability', rain_probability
      )
    ) INTO v_raw_data
    FROM (
      SELECT id, max_timestamp, location_name, temperature, humidity, wind_speed, wind_direction, wind_gust, air_pressure, rain_probability
      FROM time_buckets
      ORDER BY max_timestamp
    ) ordered_buckets;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', id,
        'timestamp', timestamp,
        'location_name', location_name,
        'temperature', temperature,
        'humidity', humidity,
        'wind_speed', wind_speed,
        'wind_direction', wind_direction,
        'wind_gust', wind_gust,
        'air_pressure', air_pressure,
        'rain_probability', rain_probability
      )
    ) INTO v_raw_data
    FROM (
      SELECT 
        id,
        timestamp,
        location_name,
        temperature,
        humidity,
        wind_speed,
        wind_direction,
        wind_gust,
        air_pressure,
        rain_probability
      FROM public.air_quality_readings
      WHERE user_id = p_user_id
        AND timestamp >= p_start_ts
        AND timestamp <= p_end_ts
        AND (
          temperature IS NOT NULL OR
          humidity IS NOT NULL OR
          wind_speed IS NOT NULL OR
          wind_gust IS NOT NULL OR
          air_pressure IS NOT NULL OR
          rain_probability IS NOT NULL
        )
      ORDER BY timestamp
    ) readings;
  END IF;

  v_result := jsonb_build_object(
    'raw', COALESCE(v_raw_data, '[]'::jsonb),
    'totalCount', v_total_count,
    'availableMetrics', COALESCE(to_jsonb(v_available_metrics), '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

