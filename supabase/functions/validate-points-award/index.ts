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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, points, reason, action } = await req.json()

    if (!userId || !points || !reason || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate points amount
    if (points <= 0 || points > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid points amount. Must be between 1 and 1000.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check daily points limit
    const today = new Date().toISOString().split('T')[0]
    const { data: dailyPoints, error: dailyError } = await supabaseClient
      .from('user_points_history')
      .select('points_awarded')
      .eq('user_id', userId)
      .gte('created_at', today)

    if (dailyError) {
      console.error('Error checking daily points:', dailyError)
      return new Response(
        JSON.stringify({ error: 'Failed to check daily points limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const dailyTotal = dailyPoints?.reduce((sum, record) => sum + (record.points_awarded || 0), 0) || 0
    const maxDailyPoints = 1000

    if (dailyTotal + points > maxDailyPoints) {
      return new Response(
        JSON.stringify({ 
          error: `Daily points limit exceeded. You can only earn ${maxDailyPoints - dailyTotal} more points today.`,
          dailyTotal,
          maxDailyPoints,
          remaining: maxDailyPoints - dailyTotal
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if this exact action was already performed today
    const { data: existingAction, error: actionError } = await supabaseClient
      .from('user_points_history')
      .select('id')
      .eq('user_id', userId)
      .eq('action', action)
      .eq('reason', reason)
      .gte('created_at', today)
      .limit(1)

    if (actionError) {
      console.error('Error checking existing action:', actionError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing action' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingAction && existingAction.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'This action has already been performed today',
          action,
          reason
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If validation passes, return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Points award validated',
        dailyTotal: dailyTotal + points,
        maxDailyPoints
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in validate-points-award:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
