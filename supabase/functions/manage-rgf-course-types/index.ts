import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin permissions
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .single()

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { raw_generation_format_id, course_type_ids, mode = 'replace' } = await req.json()

    if (!raw_generation_format_id) {
      return new Response(
        JSON.stringify({ error: 'raw_generation_format_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result;
    
    if (mode === 'replace') {
      // Delete existing mappings
      await supabase
        .from('raw_generation_format_course_type_map')
        .delete()
        .eq('raw_generation_format_id', raw_generation_format_id)

      // Insert new mappings if any
      if (course_type_ids && course_type_ids.length > 0) {
        const mappings = course_type_ids.map((course_type_id: number) => ({
          raw_generation_format_id,
          course_type_id
        }))

        const { error: insertError } = await supabase
          .from('raw_generation_format_course_type_map')
          .insert(mappings)

        if (insertError) {
          console.error('Insert error:', insertError)
          throw insertError
        }
      }

      result = {
        raw_generation_format_id,
        course_type_ids: course_type_ids || [],
        affected: course_type_ids ? course_type_ids.length : 0
      }
    } else if (mode === 'append') {
      // Get existing mappings
      const { data: existing } = await supabase
        .from('raw_generation_format_course_type_map')
        .select('course_type_id')
        .eq('raw_generation_format_id', raw_generation_format_id)

      const existingIds = existing?.map(item => item.course_type_id) || []
      const newIds = course_type_ids?.filter((id: number) => !existingIds.includes(id)) || []

      if (newIds.length > 0) {
        const mappings = newIds.map((course_type_id: number) => ({
          raw_generation_format_id,
          course_type_id
        }))

        await supabase
          .from('raw_generation_format_course_type_map')
          .insert(mappings)
      }

      result = {
        raw_generation_format_id,
        course_type_ids: [...existingIds, ...newIds],
        affected: newIds.length
      }
    } else if (mode === 'delete') {
      if (course_type_ids && course_type_ids.length > 0) {
        await supabase
          .from('raw_generation_format_course_type_map')
          .delete()
          .eq('raw_generation_format_id', raw_generation_format_id)
          .in('course_type_id', course_type_ids)
      }

      result = {
        raw_generation_format_id,
        course_type_ids: [],
        affected: course_type_ids ? course_type_ids.length : 0
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error managing RGF course types:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})