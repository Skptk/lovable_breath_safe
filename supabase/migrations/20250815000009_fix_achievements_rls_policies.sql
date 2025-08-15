-- Fix missing INSERT policies for user_achievements and user_streaks
-- This migration adds the missing INSERT policies that are needed for users to initialize their achievements

-- Add INSERT policy for user_achievements
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add INSERT policy for user_streaks  
CREATE POLICY "Users can insert their own streaks" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also add a more permissive policy for the service role to handle bulk operations
CREATE POLICY "Service role can insert achievements for any user" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert streaks for any user" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Ensure the function can run with proper permissions
GRANT EXECUTE ON FUNCTION public.initialize_user_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_user_achievements(UUID) TO service_role;

-- Add comment explaining the fix
COMMENT ON POLICY "Users can insert their own achievements" ON public.user_achievements IS 'Allows users to insert their own achievement progress records';
COMMENT ON POLICY "Users can insert their own streaks" ON public.user_streaks IS 'Allows users to insert their own streak records';
