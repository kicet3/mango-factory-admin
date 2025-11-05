import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log('Image tag all request from user:', user.id);

    // Get backend URL and JWT token
    const backendUrl = Deno.env.get('BACKEND_URL');
    const backendJwtToken = Deno.env.get('BACKEND_JWT_TOKEN');

    if (!backendUrl || !backendJwtToken) {
      throw new Error('Backend configuration missing');
    }

    // Clean up the backend URL to remove trailing slashes
    const cleanBackendUrl = backendUrl.trim().replace(/\/+$/, '');

    // Call backend API
    const response = await fetch(`${cleanBackendUrl}/image/tag_all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${backendJwtToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', errorText);
      throw new Error(`Backend API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Tag all completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in image-tag-all function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
