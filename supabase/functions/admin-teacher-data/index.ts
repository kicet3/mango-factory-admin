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

  try {
    console.log('Admin teacher data request received');
    
    // Verify admin authentication first
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
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

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    console.log('Auth check - User:', user?.id, 'Error:', authError);
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user is an admin (service role bypasses RLS)
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('Admin check - User ID:', user.id, 'Admin data:', adminUser, 'Error:', adminError);
    
    if (adminError) {
      console.error('Admin check error:', adminError);
      return new Response(
        JSON.stringify({ error: 'Database error during admin check' }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    if (!adminUser) {
      console.log('User is not an admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log('Admin access verified for user:', user.id);

    const { statusFilter } = await req.json();
    console.log('Status filter:', statusFilter);

    // Get teacher_info data using service role (bypasses RLS)
    const { data: teacherData, error: teacherError } = await supabaseAdmin
      .from('teacher_info')
      .select('*');

    if (teacherError) {
      console.error('Error fetching teacher data:', teacherError);
      throw teacherError;
    }

    console.log('Teacher data fetched:', teacherData?.length, 'records');

    // Get auth users via admin API (service role)
    const { data: listRes, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listUsersError) {
      console.error('Error fetching auth users:', listUsersError);
      throw listUsersError;
    }

    const authUsers = listRes?.users ?? [];
    console.log('Auth users fetched:', authUsers.length, 'records');

    const usersMap = new Map(authUsers.map((u: any) => [u.id, {
      user_email: u.email,
      user_name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email ? u.email.split('@')[0] : 'Unknown User')
    }]));

    // Join teacher_info with auth users data
    const joinedData = teacherData
      .map((teacher: any) => {
        const userInfo = usersMap.get(teacher.user_id);
        return {
          ...teacher,
          user_email: userInfo?.user_email || 'Unknown',
          user_name: userInfo?.user_name || 'Unknown User'
        };
      })
      .filter((teacher: any) => {
        if (statusFilter === 'pending') return !teacher.teacher_verified;
        if (statusFilter === 'approved') return teacher.teacher_verified;
        return true;
      });

    console.log('Joined and filtered data:', joinedData.length, 'records');

    return new Response(
      JSON.stringify({ data: joinedData }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Admin teacher data error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});