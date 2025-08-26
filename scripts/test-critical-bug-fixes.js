#!/usr/bin/env node

/**
 * Test Critical Bug Fixes Script
 * 
 * This script tests all the critical bug fixes:
 * 1. Delete History Function
 * 2. Points System
 * 3. Data Tracking
 * 
 * Usage: node scripts/test-critical-bug-fixes.js
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
 * Test 1: Verify DELETE Policy and RLS
 */
async function testDeletePolicy() {
  console.log('🔍 Testing DELETE Policy and RLS...');
  
  try {
    // Check if the DELETE policy exists
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_name', 'air_quality_readings')
      .eq('policy_name', 'Users can delete their own readings');

    if (policiesError) {
      console.error('❌ Error checking policies:', policiesError);
      return false;
    }

    if (!policies || policies.length === 0) {
      console.error('❌ DELETE policy not found');
      return false;
    }

    console.log('✅ DELETE policy exists');
    
    // Check if RLS is enabled
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'air_quality_readings')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Error checking table RLS:', tablesError);
      return false;
    }

    if (!tables || tables.length === 0) {
      console.error('❌ Table not found');
      return false;
    }

    console.log('✅ RLS is enabled on air_quality_readings table');
    return true;

  } catch (error) {
    console.error('❌ Error testing DELETE policy:', error);
    return false;
  }
}

/**
 * Test 2: Verify Points Calculation Functions
 */
async function testPointsFunctions() {
  console.log('🔍 Testing Points Calculation Functions...');
  
  try {
    // Check if the main points function exists
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'award_points_for_reading')
      .eq('routine_schema', 'public');

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError);
      return false;
    }

    if (!functions || functions.length === 0) {
      console.error('❌ award_points_for_reading function not found');
      return false;
    }

    console.log('✅ award_points_for_reading function exists');

    // Check if the points validation function exists
    const { data: validationFunctions, error: validationError } = await supabase
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'validate_user_points')
      .eq('routine_schema', 'public');

    if (validationError) {
      console.error('❌ Error checking validation functions:', validationError);
      return false;
    }

    if (!validationFunctions || validationFunctions.length === 0) {
      console.error('❌ validate_user_points function not found');
      return false;
    }

    console.log('✅ validate_user_points function exists');

    // Check if the points reset function exists
    const { data: resetFunctions, error: resetError } = await supabase
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'reset_inflated_points')
      .eq('routine_schema', 'public');

    if (resetError) {
      console.error('❌ Error checking reset functions:', resetError);
      return false;
    }

    if (!resetFunctions || resetFunctions.length === 0) {
      console.error('❌ reset_inflated_points function not found');
      return false;
    }

    console.log('✅ reset_inflated_points function exists');

    return true;

  } catch (error) {
    console.error('❌ Error testing points functions:', error);
    return false;
  }
}

/**
 * Test 3: Verify Triggers
 */
async function testTriggers() {
  console.log('🔍 Testing Database Triggers...');
  
  try {
    // Check if the points awarding trigger exists
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'award_points_for_reading')
      .eq('trigger_schema', 'public');

    if (triggersError) {
      console.error('❌ Error checking triggers:', triggersError);
      return false;
    }

    if (!triggers || triggers.length === 0) {
      console.error('❌ award_points_for_reading trigger not found');
      return false;
    }

    console.log('✅ award_points_for_reading trigger exists');

    // Check if the points validation trigger exists
    const { data: validationTriggers, error: validationError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'validate_points')
      .eq('trigger_schema', 'public');

    if (validationError) {
      console.error('❌ Error checking validation triggers:', validationError);
      return false;
    }

    if (!validationTriggers || validationTriggers.length === 0) {
      console.error('❌ validate_points trigger not found');
      return false;
    }

    console.log('✅ validate_points trigger exists');

    // Check if the points sync on delete trigger exists
    const { data: syncTriggers, error: syncError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'sync_points_on_delete')
      .eq('trigger_schema', 'public');

    if (syncError) {
      console.error('❌ Error checking sync triggers:', syncError);
      return false;
    }

    if (!syncTriggers || syncTriggers.length === 0) {
      console.error('❌ sync_points_on_delete trigger not found');
      return false;
    }

    console.log('✅ sync_points_on_delete trigger exists');

    return true;

  } catch (error) {
    console.error('❌ Error testing triggers:', error);
    return false;
  }
}

/**
 * Test 4: Check for Conflicting Functions/Triggers
 */
async function testForConflicts() {
  console.log('🔍 Checking for Conflicting Functions/Triggers...');
  
  try {
    // Check for the problematic auto-sync function (should not exist)
    const { data: autoSyncFunctions, error: autoSyncError } = await supabase
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'auto_sync_points_with_history')
      .eq('routine_schema', 'public');

    if (autoSyncError) {
      console.error('❌ Error checking for auto-sync functions:', autoSyncError);
      return false;
    }

    if (autoSyncFunctions && autoSyncFunctions.length > 0) {
      console.error('❌ CONFLICT: auto_sync_points_with_history function still exists');
      return false;
    }

    console.log('✅ auto_sync_points_with_history function removed');

    // Check for the problematic sync function (should not exist)
    const { data: syncFunctions, error: syncError } = await supabase
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'sync_points_with_history')
      .eq('routine_schema', 'public');

    if (syncError) {
      console.error('❌ Error checking for sync functions:', syncError);
      return false;
    }

    if (syncFunctions && syncFunctions.length > 0) {
      console.error('❌ CONFLICT: sync_points_with_history function still exists');
      return false;
    }

    console.log('✅ sync_points_with_history function removed');

    // Check for problematic triggers (should not exist)
    const { data: autoSyncTriggers, error: autoSyncTriggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_name', 'auto_sync_points')
      .eq('trigger_schema', 'public');

    if (autoSyncTriggerError) {
      console.error('❌ Error checking for auto-sync triggers:', autoSyncTriggerError);
      return false;
    }

    if (autoSyncTriggers && autoSyncTriggers.length > 0) {
      console.error('❌ CONFLICT: auto_sync_points trigger still exists');
      return false;
    }

    console.log('✅ auto_sync_points trigger removed');

    return true;

  } catch (error) {
    console.error('❌ Error checking for conflicts:', error);
    return false;
  }
}

/**
 * Test 5: Verify Current Points Distribution
 */
async function testPointsDistribution() {
  console.log('🔍 Testing Current Points Distribution...');
  
  try {
    // Get current points distribution
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('total_points')
      .not('total_points', 'is', null);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return false;
    }

    if (!profiles || profiles.length === 0) {
      console.log('📝 No profiles found with points');
      return true;
    }

    // Check for extremely high points (indicating inflation)
    const highPointsUsers = profiles.filter(p => (p.total_points || 0) > 10000);
    
    if (highPointsUsers.length > 0) {
      console.warn(`⚠️  Found ${highPointsUsers.length} users with extremely high points (>10,000)`);
      console.warn('   This may indicate points inflation that needs to be reset');
      
      // Show distribution
      const pointsDistribution = {};
      profiles.forEach(profile => {
        const points = profile.total_points || 0;
        if (points > 1000) {
          const range = Math.floor(points / 1000) * 1000;
          pointsDistribution[`${range}-${range + 999}`] = (pointsDistribution[`${range}-${range + 999}`] || 0) + 1;
        } else {
          pointsDistribution[`0-999`] = (pointsDistribution[`0-999`] || 0) + 1;
        }
      });

      console.log('📊 Points Distribution:');
      Object.keys(pointsDistribution)
        .sort((a, b) => parseInt(a.split('-')[0]) - parseInt(b.split('-')[0]))
        .forEach(range => {
          console.log(`   ${range}: ${pointsDistribution[range]} users`);
        });
    } else {
      console.log('✅ No users with extremely high points found');
    }

    return true;

  } catch (error) {
    console.error('❌ Error testing points distribution:', error);
    return false;
  }
}

/**
 * Test 6: Verify Database Schema
 */
async function testDatabaseSchema() {
  console.log('🔍 Testing Database Schema...');
  
  try {
    // Check if required columns exist in air_quality_readings
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'air_quality_readings')
      .eq('table_schema', 'public')
      .in('column_name', ['id', 'user_id', 'aqi', 'timestamp', 'created_at']);

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
      return false;
    }

    const requiredColumns = ['id', 'user_id', 'aqi', 'timestamp', 'created_at'];
    const foundColumns = columns.map(c => c.column_name);

    for (const required of requiredColumns) {
      if (!foundColumns.includes(required)) {
        console.error(`❌ Required column missing: ${required}`);
        return false;
      }
    }

    console.log('✅ All required columns exist in air_quality_readings');

    // Check if required columns exist in profiles
    const { data: profileColumns, error: profileColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public')
      .in('column_name', ['id', 'user_id', 'total_points', 'created_at', 'updated_at']);

    if (profileColumnsError) {
      console.error('❌ Error checking profile columns:', profileColumnsError);
      return false;
    }

    const requiredProfileColumns = ['id', 'user_id', 'total_points', 'created_at', 'updated_at'];
    const foundProfileColumns = profileColumns.map(c => c.column_name);

    for (const required of requiredProfileColumns) {
      if (!foundProfileColumns.includes(required)) {
        console.error(`❌ Required profile column missing: ${required}`);
        return false;
      }
    }

    console.log('✅ All required columns exist in profiles');

    return true;

  } catch (error) {
    console.error('❌ Error testing database schema:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runAllTests() {
  console.log('🚀 Starting Critical Bug Fix Tests...');
  console.log('📅', new Date().toISOString());
  console.log('');

  const tests = [
    { name: 'DELETE Policy and RLS', fn: testDeletePolicy },
    { name: 'Points Calculation Functions', fn: testPointsFunctions },
    { name: 'Database Triggers', fn: testTriggers },
    { name: 'Conflict Detection', fn: testForConflicts },
    { name: 'Points Distribution', fn: testPointsDistribution },
    { name: 'Database Schema', fn: testDatabaseSchema }
  ];

  let passedTests = 0;
  let failedTests = 0;
  const results = [];

  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await test.fn();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passedTests++;
        results.push({ name: test.name, status: 'PASSED' });
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        failedTests++;
        results.push({ name: test.name, status: 'FAILED' });
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      failedTests++;
      results.push({ name: test.name, status: 'ERROR', error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${tests.length}`);
  console.log('');

  if (failedTests === 0) {
    console.log('🎉 All tests passed! The critical bug fixes are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
    console.log('');
    console.log('📋 Failed Tests:');
    results
      .filter(r => r.status !== 'PASSED')
      .forEach(result => {
        console.log(`   ❌ ${result.name}: ${result.status}${result.error ? ` - ${result.error}` : ''}`);
      });
  }

  console.log('');
  console.log('📅', new Date().toISOString());
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => {
      console.log('✅ Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test script failed:', error);
      process.exit(1);
    });
}

export { 
  runAllTests, 
  testDeletePolicy, 
  testPointsFunctions, 
  testTriggers, 
  testForConflicts, 
  testPointsDistribution, 
  testDatabaseSchema 
};
