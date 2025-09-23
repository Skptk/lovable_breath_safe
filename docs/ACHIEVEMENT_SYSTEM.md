# Achievement System

This document outlines how the achievement system works in the application, including how achievements are tracked, unlocked, and displayed to users.

## Overview

The achievement system is designed to reward users for engaging with the app and improving their air quality awareness. Achievements are unlocked based on various criteria such as reading counts, streaks, and air quality metrics.

## Database Schema

### Tables

#### `achievements`
- `id`: Unique identifier for the achievement
- `name`: Name of the achievement
- `description`: Description of what the achievement is for
- `icon`: Icon to display with the achievement
- `category`: Category of achievement (reading, streak, quality, milestone, special)
- `points_reward`: Number of points awarded when unlocked
- `criteria_type`: Type of criteria needed to unlock (count, streak, quality, points, custom)
- `criteria_value`: Target value needed to unlock
- `criteria_unit`: Unit of measurement for the criteria (days, readings, points, etc.)
- `is_active`: Whether the achievement is currently active
- `created_at`: When the achievement was created
- `updated_at`: When the achievement was last updated

#### `user_achievements`
- `id`: Unique identifier for the user's achievement progress
- `user_id`: Reference to the user
- `achievement_id`: Reference to the achievement
- `progress`: Current progress towards the achievement
- `max_progress`: Target progress needed to unlock
- `unlocked`: Whether the achievement has been unlocked
- `unlocked_at`: When the achievement was unlocked (NULL if not unlocked)
- `earned_at`: When the achievement was actually earned (NULL if not earned)
- `created_at`: When the record was created
- `updated_at`: When the record was last updated

## Achievement Initialization

When a new user signs up:

1. A profile is created in the `profiles` table
2. User settings are initialized in the `user_settings` table
3. A `user_points` record is created with 0 points
4. Records are created in `user_achievements` for all active achievements with:
   - `progress = 0`
   - `unlocked = false`
   - `unlocked_at = NULL`
   - `earned_at = NULL`

## Achievement Unlocking

Achievements are checked and unlocked in the following scenarios:

1. When a user completes an air quality reading
2. When a user's streak is updated
3. When a user's points are updated
4. When manually triggered from the rewards page

The `check_achievements()` function is responsible for updating progress and unlocking achievements when criteria are met.

## Key Functions

### `check_achievements(p_user_id UUID)`

This function:
1. Checks if the user has any activity
2. Updates progress for all achievement types
3. Unlocks achievements where progress >= max_progress
4. Sets timestamps for when achievements are unlocked

### `update_points_achievements()`

A trigger function that updates points-based achievements when a user's points change.

## Testing Achievements

To test the achievement system:

1. Create a new test user
2. Verify the user starts with 0 achievements unlocked
3. Perform actions to trigger achievement progress
4. Check that achievements unlock only when their criteria are met

## Common Issues

### New Users Getting All Achievements Immediately

**Symptom**: New users see all achievements as unlocked when they first sign up.

**Cause**: This can happen if the `check_achievements` function is called during user initialization before any activity is recorded.

**Solution**: The `check_achievements` function now checks for user activity before updating or unlocking any achievements.

### Achievements Not Unlocking

**Symptom**: Users complete actions but don't receive achievements.

**Possible Causes**:
1. The achievement criteria haven't been met
2. The `check_achievements` function isn't being called
3. There's an error in the achievement criteria

**Troubleshooting**:
1. Check the user's progress in the `user_achievements` table
2. Verify the achievement criteria in the `achievements` table
3. Check the application logs for errors

## Best Practices

1. **Idempotency**: All achievement checks should be idempotent (safe to run multiple times)
2. **Performance**: Batch achievement checks when possible to reduce database load
3. **User Experience**: Provide clear feedback when achievements are unlocked
4. **Testing**: Test all achievement criteria with new users to ensure they unlock as expected
