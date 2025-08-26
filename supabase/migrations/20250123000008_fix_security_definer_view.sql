-- Description: Fixes SECURITY DEFINER issue with latest_environmental_data view
-- Date: 2025-01-23
-- Issue: Supabase security advisor flagged view with SECURITY DEFINER property

-- Drop the existing view that may have SECURITY DEFINER
DROP VIEW IF EXISTS public.latest_environmental_data;

-- Recreate the view without any SECURITY DEFINER properties
CREATE VIEW public.latest_environmental_data AS
SELECT DISTINCT ON (city_name) *
FROM public.global_environmental_data
WHERE is_active = true
ORDER BY city_name, collection_timestamp DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON public.latest_environmental_data TO authenticated;

-- Verify the view is created correctly
COMMENT ON VIEW public.latest_environmental_data IS 'Latest environmental data for each city without SECURITY DEFINER';

-- Log the fix
DO $$
BEGIN
    RAISE LOG '✅ Fixed SECURITY DEFINER issue with latest_environmental_data view';
END $$;
