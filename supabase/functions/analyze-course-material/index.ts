import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { raw_course_material_id, analysis_endpoint } = await req.json();

    if (!raw_course_material_id) {
      throw new Error('raw_course_material_id is required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the raw course material data
    const { data: rawMaterial, error: fetchError } = await supabase
      .from('raw_course_materials')
      .select('*')
      .eq('raw_course_material_id', raw_course_material_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching raw material:', fetchError);
      throw new Error('Failed to fetch course material data');
    }

    // Build endpoint from secret or override
    const backendBaseUrl = Deno.env.get('BACKEND_URL');
    if (!backendBaseUrl) {
      throw new Error('BACKEND_URL is not configured');
    }
    const endpoint = analysis_endpoint || `${backendBaseUrl}/data/generate/course_material`;
    console.log(`Starting AI analysis for course material ID: ${raw_course_material_id}`);
    console.log(`Using analysis endpoint: ${endpoint}`);

    // Call the external AI analysis service
    const analysisResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('BACKEND_JWT_TOKEN')}`,
      },
      body: JSON.stringify({
        raw_course_material_id
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis service responded with status: ${analysisResponse.status}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log('AI analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'AI analysis started successfully',
      analysis_result: analysisResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-course-material function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});