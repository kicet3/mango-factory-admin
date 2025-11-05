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
    const { raw_generation_format_id, use_v2, analysis_endpoint } = await req.json();

    if (!raw_generation_format_id) {
      throw new Error('raw_generation_format_id is required');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the raw generation format data
    const { data: rawFormat, error: fetchError } = await supabase
      .from('raw_generation_formats')
      .select('*')
      .eq('raw_generation_format_id', raw_generation_format_id)
      .single();

    if (fetchError) {
      console.error('Error fetching raw format:', fetchError);
      throw new Error('Failed to fetch generation format data');
    }

    // Check if generation_formats record already exists
    const { data: existingFormat, error: checkError } = await supabase
      .from('generation_formats')
      .select('generation_format_id')
      .eq('raw_generation_format_id', raw_generation_format_id)
      .single();

    // Update or create the generation_formats record with status = 1 (생성 요청)
    if (existingFormat && !checkError) {
      console.log(`Updating existing generation_format record: ${existingFormat.generation_format_id}`);
      const { error: updateError } = await supabase
        .from('generation_formats')
        .update({
          generation_status_type_id: 1
        })
        .eq('generation_format_id', existingFormat.generation_format_id);
      
      if (updateError) {
        console.error('Error updating generation_format:', updateError);
      }
    } else if (checkError?.code === 'PGRST116') {
      console.log(`Creating new generation_format record for raw_generation_format_id: ${raw_generation_format_id}`);
      const { error: insertError } = await supabase
        .from('generation_formats')
        .insert({
          raw_generation_format_id,
          generation_status_type_id: 1,
          generation_format_desc: rawFormat.raw_generation_format_name || 'AI Analysis in progress'
        });
      
      if (insertError) {
        console.error('Error inserting generation_format:', insertError);
      }
    }

    // Build endpoint from secret or override
    const backendBaseUrl = Deno.env.get('BACKEND_URL');
    if (!backendBaseUrl) {
      throw new Error('BACKEND_URL is not configured');
    }
    const endpoint = analysis_endpoint || `${backendBaseUrl}/data/generate/generation_format`;
    console.log(`Starting AI analysis for generation format ID: ${raw_generation_format_id}`);
    console.log(`Using analysis endpoint: ${endpoint}`);

    // Build request body
    const requestBody: any = { raw_generation_format_id };
    if (use_v2) {
      requestBody.use_v2 = true;
    }

    // Call the external AI analysis service
    const analysisResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('BACKEND_JWT_TOKEN')}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis service responded with status: ${analysisResponse.status}`);
    }

    const analysisResult = await analysisResponse.json();
    console.log(`AI analysis${use_v2 ? ' V2' : ''} completed successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'AI analysis started successfully',
      analysis_result: analysisResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-generation-format function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});