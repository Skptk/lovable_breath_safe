#!/usr/bin/env node

/**
 * Reset Inflated Points Script
 * 
 * This script resets all user points to reasonable values based on their actual
 * air quality readings, fixing the points inflation issue.
 * 
 * Usage: node scripts/reset-inflated-points.js
 * 
 * Requirements:
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 * - Node.js with fetch support
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Calculate points for a single AQI reading
 */
function calculatePointsForAQI(aqi) {
  if (aqi <= 50) return 20;      // Good air quality bonus
  if (aqi <= 100) return 15;     // Moderate air quality
  if (aqi <= 150) return 10;     // Unhealthy for sensitive groups
  return 5;                       // Still earn points for checking
}

/**
 * Reset points for a single user based on their actual readings
 */
async function resetUserPoints(userId) {
  try {
    console.log(`🔄 Processing user: ${userId}`);
    
    // Get all air quality readings for this user
    const { data: readings, error: readingsError } = await supabase
      .from('air_quality_readings')
      .select('id, aqi, location_name, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (readingsError) {
      console.error(`❌ Error fetching readings for user ${userId}:`, readingsError);
      return { success: false, error: readingsError.message };
    }

    if (!readings || readings.length === 0) {
      console.log(`📝 User ${userId} has no readings, setting points to 0`);
      
      // Update profile to 0 points
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_points: 0, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) {
        console.error(`❌ Error updating profile for user ${userId}:`, updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, points: 0, readings: 0 };
    }

    // Calculate total points based on actual readings
    const totalPoints = readings.reduce((sum, reading) => {
      return sum + calculatePointsForAQI(reading.aqi);
    }, 0);

    console.log(`📊 User ${userId}: ${readings.length} readings = ${totalPoints} points`);

    // Update profile with correct points
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        total_points: totalPoints, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`❌ Error updating profile for user ${userId}:`, updateError);
      return { success: false, error: updateError.message };
    }

    // Clear existing user_points records for this user
    const { error: deleteError } = await supabase
      .from('user_points')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error(`❌ Error clearing user_points for user ${userId}:`, deleteError);
      // Don't fail the whole operation for this
    }

    // Recreate user_points records based on actual readings
    const pointsRecords = readings.map(reading => ({
      user_id: userId,
      points_earned: calculatePointsForAQI(reading.aqi),
      aqi_value: reading.aqi,
      location_name: reading.location_name,
      timestamp: reading.timestamp,
      created_at: reading.timestamp
    }));

    if (pointsRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('user_points')
        .insert(pointsRecords);

      if (insertError) {
        console.error(`❌ Error inserting user_points for user ${userId}:`, insertError);
        // Don't fail the whole operation for this
      } else {
        console.log(`✅ Recreated ${pointsRecords.length} points records for user ${userId}`);
      }
    }

    return { 
      success: true, 
      points: totalPoints, 
      readings: readings.length 
    };

  } catch (error) {
    console.error(`❌ Unexpected error processing user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to reset all user points
 */
async function resetAllUserPoints() {
  console.log('🚀 Starting points reset process...');
  console.log('📅', new Date().toISOString());
  console.log('');

  try {
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, total_points, email')
      .order('total_points', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      process.exit(1);
    }

    if (!profiles || profiles.length === 0) {
      console.log('📝 No user profiles found');
      return;
    }

    console.log(`👥 Found ${profiles.length} user profiles`);
    console.log('');

    // Show current points distribution
    console.log('📊 Current Points Distribution:');
    const pointsDistribution = {};
    profiles.forEach(profile => {
      const points = profile.total_points || 0;
      pointsDistribution[points] = (pointsDistribution[points] || 0) + 1;
    });

    Object.keys(pointsDistribution)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .forEach(points => {
        console.log(`   ${points} points: ${pointsDistribution[points]} users`);
      });
    console.log('');

    // Process each user
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const profile of profiles) {
      const result = await resetUserPoints(profile.user_id);
      results.push({
        userId: profile.user_id,
        email: profile.email,
        oldPoints: profile.total_points || 0,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Add small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Show summary
    console.log('');
    console.log('📋 Reset Summary:');
    console.log(`✅ Successful: ${successCount} users`);
    console.log(`❌ Failed: ${errorCount} users`);
    console.log('');

    // Show detailed results for users with significant point changes
    console.log('📈 Users with Significant Point Changes:');
    results
      .filter(r => r.success && Math.abs(r.oldPoints - r.points) > 100)
      .sort((a, b) => Math.abs(b.oldPoints - b.points) - Math.abs(a.oldPoints - a.points))
      .slice(0, 10)
      .forEach(result => {
        const change = result.points - result.oldPoints;
        const changeText = change > 0 ? `+${change}` : change.toString();
        console.log(`   ${result.email || result.userId}: ${result.oldPoints} → ${result.points} (${changeText})`);
      });

    // Show final points distribution
    console.log('');
    console.log('📊 Final Points Distribution:');
    const finalDistribution = {};
    results
      .filter(r => r.success)
      .forEach(result => {
        const points = result.points || 0;
        finalDistribution[points] = (finalDistribution[points] || 0) + 1;
      });

    Object.keys(finalDistribution)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .slice(0, 10)
      .forEach(points => {
        console.log(`   ${points} points: ${finalDistribution[points]} users`);
      });

    console.log('');
    console.log('🎉 Points reset process completed!');
    console.log('📅', new Date().toISOString());

  } catch (error) {
    console.error('❌ Fatal error during points reset:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  resetAllUserPoints()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { resetAllUserPoints, resetUserPoints, calculatePointsForAQI };
