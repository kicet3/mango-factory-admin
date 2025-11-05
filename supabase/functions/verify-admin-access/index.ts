import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Admin access verification request received (deploy v2)');
    
    const { accessCode } = await req.json();
    
    if (!accessCode) {
      console.log('No access code provided');
      return new Response(
        JSON.stringify({ valid: false, error: 'Access code is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const adminAccessCode = Deno.env.get('ADMIN_ACCESS_CODE');
    
    if (!adminAccessCode) {
      console.error('ADMIN_ACCESS_CODE environment variable not set');
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const isValid = accessCode === adminAccessCode;
    console.log('Access code validation result:', isValid);

    return new Response(
      JSON.stringify({ valid: isValid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in verify-admin-access function:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});