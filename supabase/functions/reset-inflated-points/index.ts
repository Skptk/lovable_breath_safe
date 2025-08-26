import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Starting points reset process...')

    // Step 1: Get all users with their current points
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, points, created_at')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    console.log(`📊 Found ${profiles.length} users to process`)

    let totalPointsReset = 0
    let usersProcessed = 0
    let usersWithInflatedPoints = 0

    // Step 2: Process each user
    for (const profile of profiles) {
      const userId = profile.id
      const currentPoints = profile.points || 0
      
      // Get user's actual air quality readings count
      const { data: readings, error: readingsError } = await supabase
        .from('air_quality_readings')
        .select('id, aqi, timestamp')
        .eq('user_id', userId)

      if (readingsError) {
        console.error(`❌ Error fetching readings for user ${userId}:`, readingsError.message)
        continue
      }

      // Calculate realistic points based on actual readings
      let realisticPoints = 0
      let maxPoints = 0

      for (const reading of readings) {
        // Award 5-20 points per reading based on AQI quality
        let pointsForReading = 5 // Base points
        
        if (reading.aqi <= 50) {
          pointsForReading = 20 // Excellent air quality
        } else if (reading.aqi <= 100) {
          pointsForReading = 15 // Good air quality
        } else if (reading.aqi <= 150) {
          pointsForReading = 10 // Moderate air quality
        } else {
          pointsForReading = 5 // Poor air quality
        }
        
        realisticPoints += pointsForReading
        maxPoints = Math.max(maxPoints, pointsForReading)
      }

      // Apply 10,000 point cap
      realisticPoints = Math.min(realisticPoints, 10000)

      // Check if points need resetting
      if (currentPoints > realisticPoints + 100) { // Allow small variance
        usersWithInflatedPoints++
        const pointsDifference = currentPoints - realisticPoints
        
        // Update user's points
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            points: realisticPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error(`❌ Failed to update points for user ${userId}:`, updateError.message)
        } else {
          totalPointsReset += pointsDifference
          console.log(`✅ User ${userId}: ${currentPoints} → ${realisticPoints} points (reset: ${pointsDifference})`)
        }
      } else {
        console.log(`ℹ️ User ${userId}: ${currentPoints} points (no reset needed)`)
      }

      usersProcessed++
    }

    // Step 3: Reset any inflated achievement points
    console.log('🔄 Resetting achievement points...')
    
    const { error: achievementResetError } = await supabase
      .from('user_achievements')
      .update({ 
        points_awarded: 0,
        updated_at: new Date().toISOString()
      })
      .gt('points_awarded', 0)

    if (achievementResetError) {
      console.error('❌ Error resetting achievement points:', achievementResetError.message)
    } else {
      console.log('✅ Achievement points reset')
    }

    // Step 4: Summary
    const summary = {
      success: true,
      message: 'Points reset completed successfully',
      stats: {
        totalUsers: profiles.length,
        usersProcessed,
        usersWithInflatedPoints,
        totalPointsReset,
        timestamp: new Date().toISOString()
      }
    }

    console.log('🎉 Points reset process completed!')
    console.log('📊 Summary:', JSON.stringify(summary, null, 2))

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Points reset failed:', error.message)
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
