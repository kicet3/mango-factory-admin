import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const isAllowedOrigin = (origin: string) => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const host = url.host;
    return origin === 'http://localhost:5173'
      || origin === 'http://localhost:3000'
      || host === 'mangofactory.co.kr'
      || host === 'www.mangofactory.co.kr'
      || host.endsWith('.mangofactory.co.kr')
      || host.endsWith('.lovableproject.com')
      || host.endsWith('.sandbox.lovable.dev')
      || host.endsWith('.lovable.app')
      || host.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

serve(async (req) => {
  console.log('Secure download request received');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const origin = req.headers.get('Origin') || '';
  if (origin && !isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Authenticated user ID:', user.id);

    const { filePath, fileType } = await req.json();
    console.log('Requested file path:', filePath, 'type:', fileType);

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: 'File path is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const validPath = /^[a-zA-Z0-9/_\.-]{1,300}$/.test(filePath) && !filePath.includes('..') && !filePath.startsWith('/') && !filePath.endsWith('/');
    if (!validPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Authorization check based on file type
    if (fileType === 'teacher-verification') {
      // Check if user is authorized to access this verification document
      const { data: teacherInfo, error: teacherError } = await supabaseClient
        .from('teacher_info')
        .select('user_id, teacher_verification_file_path')
        .eq('teacher_verification_file_path', filePath)
        .single();

      if (teacherError || !teacherInfo) {
        console.log('Teacher verification file not found or error:', teacherError);
        return new Response(
          JSON.stringify({ success: false, error: 'File not found or access denied' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if user owns this file or is approved admin
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      
      if (teacherInfo.user_id !== user.id && !isApprovedAdmin) {
        console.log('Access denied - not owner or admin');
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (fileType === 'personal-photo') {
      // Check if user is authorized to access this personal photo
      // Personal photos are stored in personal_photos/{user_id}/ format
      const pathMatch = filePath.match(/^personal_photos\/([^\/]+)\//);
      if (!pathMatch) {
        console.log('Invalid personal photo path format:', filePath);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid file path format' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const fileUserId = pathMatch[1];
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      
      if (fileUserId !== user.id && !isApprovedAdmin) {
        console.log('Access denied - not owner or admin for personal photo');
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (filePath.startsWith('image_contents/')) {
      // For image_contents files, check admin access only
      console.log('Checking admin access for image_contents file:', filePath);
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      
      if (!isApprovedAdmin) {
        console.log('Access denied - admin access required for image_contents');
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Admin access granted for user:', user.id);
    } else {
      // For other file types, check if user has access via generation_responses
      console.log('Checking generation_responses for file:', filePath);
      const { data: generationData, error: genError } = await supabaseClient
        .from('generation_responses')
        .select('user_id')
        .eq('output_path', filePath)
        .single();

      console.log('Generation data query result:', generationData, 'error:', genError);

      if (genError || !generationData) {
        console.log('Generation file not found or error:', genError);
        return new Response(
          JSON.stringify({ success: false, error: 'File not found or access denied' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if user owns this file or is approved admin
      const { data: isApprovedAdmin } = await supabaseClient.rpc('is_approved_admin_user');
      console.log('User ID:', user.id, 'File owner ID:', generationData.user_id, 'Is admin:', isApprovedAdmin);
      
      if (generationData.user_id !== user.id && !isApprovedAdmin) {
        console.log('Access denied - not owner or admin');
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Access granted for user:', user.id);
    }

    // Get AWS credentials from environment
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION');
    const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing AWS configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create presigned URL for download
    const presignedUrl = await createPresignedUrl(
      bucketName,
      filePath,
      accessKeyId,
      secretAccessKey,
      region
    );

    console.log('Generated secure presigned URL for user:', user.id);

    // Return the download URL to the client
    const filename = filePath.split('/').pop() || 'download';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        downloadUrl: presignedUrl,
        filename: filename
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Secure download error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createPresignedUrl(
  bucketName: string, 
  objectKey: string, 
  accessKeyId: string, 
  secretAccessKey: string, 
  region: string,
  expirationSeconds: number = 300 // 5 minutes
): Promise<string> {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeString = date.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
  
  const credentialScope = `${dateString}/${region}/s3/aws4_request`;
  const host = `${bucketName}.s3.${region}.amazonaws.com`;
  
  // Query parameters for presigned URL
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': timeString,
    'X-Amz-Expires': expirationSeconds.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  // Create canonical request
  const canonicalRequest = [
    'GET',
    `/${objectKey}`,
    queryParams.toString(),
    `host:${host}`,
    '',
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // Create string to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timeString,
    credentialScope,
    await sha256(canonicalRequest)
  ].join('\n');

  // Calculate signature
  const signature = await calculateSignature(secretAccessKey, dateString, region, stringToSign);
  
  // Add signature to query parameters
  queryParams.set('X-Amz-Signature', signature);
  
  return `https://${host}/${objectKey}?${queryParams.toString()}`;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

async function calculateSignature(secretKey: string, date: string, region: string, stringToSign: string): Promise<string> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), date);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256(kSigning, stringToSign);
  
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
}