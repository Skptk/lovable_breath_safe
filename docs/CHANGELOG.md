# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2025-09-23

### Fixed
- **Achievement System**: Fixed issue where new users were getting all achievements immediately upon registration
  - Modified achievement initialization to ensure new users start with zero achievements
  - Updated `check_achievements` function to only unlock achievements after user activity
  - Added activity checks to prevent premature achievement unlocking
  - Improved error handling and logging
  - Added comprehensive documentation for the achievement system

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

### Technical Details
- **Root Cause**: The `user_settings` table has a foreign key constraint referencing `profiles(user_id)`, but the code was attempting to insert into `user_settings` before the profile record existed.
- **Solution**: 
  1. Created `handle_new_user()` function to handle profile creation
  2. Created `initialize_user_data()` function to handle all other initializations after profile creation
  3. Set up proper trigger dependencies to ensure correct execution order
  4. Added comprehensive error handling and logging

### Testing
- Verify that new user signup works without foreign key constraint violations
- Check that all user-related records are created in the correct order
- Confirm that the initialization is idempotent (can be safely retried)
