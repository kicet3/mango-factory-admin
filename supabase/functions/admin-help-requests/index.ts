import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Admin help requests data request received');

  try {
    // Extract and validate authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create client with proper auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log(`Auth check - User: ${user?.id} Error: ${authError}`);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create service role client for admin operations
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseServiceRole
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log(`Admin check - User ID: ${user.id} Admin data: ${JSON.stringify(adminData)} Error: ${adminError}`);

    if (adminError || !adminData?.is_approved) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Admin access verified for user: ${user.id}`);

    // Fetch help requests with related data using service role
    const { data: helpRequestsData, error: helpRequestsError } = await supabaseServiceRole
      .from('help_requests')
      .select(`
        *,
        help_request_types (
          help_request_type_id,
          help_request_type_name,
          help_request_type_desc
        )
      `)
      .order('updated_at', { ascending: false });

    if (helpRequestsError) {
      console.error('Error fetching help requests:', helpRequestsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch help requests' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Help requests data fetched: ${helpRequestsData?.length || 0} records`);

    return new Response(
      JSON.stringify({ data: helpRequestsData || [] }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})