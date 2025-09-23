# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-09-23

### Fixed

- **DevTools**: Improved stability and type safety of development tools
  - Fixed TypeScript errors in DevToolsWrapper component
  - Added proper error handling for memory debug tools
  - Improved type safety throughout the component
  - Added development-only initialization for memory tools
  - Added cleanup to prevent memory leaks

- **TypeScript Build**: Resolved TypeScript errors in `withRenderLogging` HOC
  - Fixed type safety issues in `renderOptimization.ts`
  - Replaced JSX with `React.createElement` to avoid transformation issues
  - Added proper display name for better debugging
  - Improved generic type handling for the HOC component
- **Achievement System**: Fixed issue where new users were getting all achievements immediately upon registration
  - Modified achievement initialization to ensure new users start with zero achievements
  - Updated `check_achievements` function to only unlock achievements after user activity
  - Added activity checks to prevent premature achievement unlocking
  - Improved error handling and logging
  - Added comprehensive documentation for the achievement system
  - Added `progress > 0` check to prevent unlocking achievements with zero progress
  - Fixed `update_points_achievements` function to respect the zero progress rule
  - Enhanced `update_user_progress_on_reading` to only update achievements when there's actual progress
  - Improved the achievement checking logic to be more efficient and reliable

- **Signup Flow**: Resolved foreign key constraint violation during user registration by implementing a proper initialization sequence:
  - Ensured `profiles` record is created before related records (`user_settings`, `user_points`)
  - Restructured the initialization process into clear, sequential steps
  - Added proper error handling and conflict resolution
  - Improved documentation for database triggers and functions

### Migration
- Added migration `20250923083136_fix_signup_initialization_order.sql` that:
  - Drops and recreates the user initialization triggers and functions
  - Implements a two-step initialization process
  - Adds proper error handling and conflict resolution
  - Includes documentation comments for better maintainability

- Added migration `20250923090600_fix_immediate_achievement_unlock.sql` that:
  - Fixes the `update_points_achievements` function to prevent unlocking achievements with zero progress
  - Ensures achievements are only unlocked when there's actual progress

- Added migration `20250923090700_fix_reading_achievement_unlock.sql` that:
  - Updates the `update_user_progress_on_reading` function to prevent unlocking achievements with zero progress
  - Only updates achievements when there's actual reading activity

- Added migration `20250923090800_fix_check_achievements_function.sql` that:
  - Updates the `check_achievements` function to enforce the zero progress rule
  - Improves the achievement checking logic to be more efficient and reliable

### Technical Details
- **Root Cause**: The `user_settings` table has a foreign key constraint referencing `profiles(user_id)`, but the code was attempting to insert into `user_settings` before the profile record existed.
- **Solution**: 
  1. Created `handle_new_user()` function to handle profile creation
  2. Created `initialize_user_data()` function to handle all other initializations after profile creation
  3. Set up proper trigger dependencies to ensure correct execution order
  4. Added comprehensive error handling and logging

### Testing
- **Signup Flow**:
  - Verify that new user signup works without foreign key constraint violations
  - Check that all user-related records are created in the correct order
  - Confirm that the initialization is idempotent (can be safely retried)

- **Achievement System**:
  - Verify that new users start with zero achievements unlocked
  - Confirm that achievements are only unlocked after the corresponding user activity:
    - Reading count achievements after submitting air quality readings
    - Quality achievements after recording good air quality readings (AQI ≤ 50)
    - Streak achievements after maintaining a streak of activity
    - Points achievements after earning points through activities
  - Test that achievements are not unlocked with zero progress
  - Verify that the system correctly handles edge cases (e.g., reset streaks, multiple achievements unlocking at once)
  - Confirm that the achievement progress is updated correctly after each relevant action
