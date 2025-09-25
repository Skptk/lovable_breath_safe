-- Create a new migration file: 20250923080000_fix_user_signup_constraint_issues.sql

-- Drop the existing trigger and function to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a new, simplified handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize user points (safe insert)
  INSERT INTO public.user_points (user_id, total_points)
  SELECT NEW.id, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.user_points WHERE user_id = NEW.id);
  
  -- Initialize user settings (safe insert)
  INSERT INTO public.user_settings (user_id)
  SELECT NEW.id
  WHERE NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = NEW.id);
  
  -- Initialize user achievements (safe insert)
  INSERT INTO public.user_achievements (user_id, achievement_id, progress, max_progress, unlocked, unlocked_at, earned_at)
  SELECT 
    NEW.id, 
    a.id, 
    0 as progress, 
    a.criteria_value as max_progress,
    false as unlocked,
    NULL as unlocked_at,
    NULL as earned_at
  FROM public.achievements a
  WHERE NOT EXISTS (
    SELECT 1 
    FROM public.user_achievements ua 
    WHERE ua.user_id = NEW.id AND ua.achievement_id = a.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the version table for migration tracking if available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
  ) THEN
    INSERT INTO public.schema_migrations (version, description)
    VALUES ('20250923080000', 'Fixed user signup constraint issues by removing ON CONFLICT clauses')
    ON CONFLICT (version) DO NOTHING;
  END IF;
END $$;