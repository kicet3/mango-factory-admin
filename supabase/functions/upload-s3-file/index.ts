// Import the required modules
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate presigned URL request received');

    // Get request data
    const { fileName, folder = 'uploads' } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'No fileName provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION');
    const bucketName = Deno.env.get('AWS_S3_BUCKET_NAME');

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !bucketName) {
      return new Response(
        JSON.stringify({ error: 'AWS credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = `${folder}/${uniqueFileName}`;

    console.log(`Generating presigned URL for: ${fileName} as ${filePath}`);

    // AWS Signature Version 4 signing process for presigned URL
    const service = 's3';
    const region = awsRegion;
    const host = `${bucketName}.s3.${region}.amazonaws.com`;
    
    const now = new Date();
    const dateStamp = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const expiresIn = 3600; // 1 hour

    // Create canonical request for presigned URL with proper CORS headers
    const method = 'PUT';
    const canonicalUri = `/${filePath}`;
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${awsAccessKeyId}/${dateStamp}/${region}/${service}/aws4_request`,
      'X-Amz-Date': timeStamp,
      'X-Amz-Expires': expiresIn.toString(),
      'X-Amz-SignedHeaders': 'host'
    });

    const canonicalQueryString = queryParams.toString();
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      timeStamp,
      credentialScope,
      await sha256(new TextEncoder().encode(canonicalRequest))
    ].join('\n');

    // Calculate signature
    const signingKey = await getSignatureKey(awsSecretAccessKey, dateStamp, region, service);
    const signature = await hmacSha256(signingKey, stringToSign);

    // Add signature to query parameters
    queryParams.set('X-Amz-Signature', signature);

    const presignedUrl = `https://${host}${canonicalUri}?${queryParams.toString()}`;

    console.log('Presigned URL generated successfully');

    const response = {
      success: true,
      presignedUrl: presignedUrl,
      filePath: filePath,
      fileName: uniqueFileName,
      originalName: fileName,
      corsHeaders: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, POST, GET',
        'Access-Control-Allow-Headers': 'Content-Type, x-amz-date, authorization, x-amz-security-token'
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in upload-s3-file function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to calculate SHA256 hash
async function sha256(data: Uint8Array | string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to calculate HMAC-SHA256
async function hmacSha256(key: Uint8Array, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to generate AWS Signature Version 4 signing key
async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmacSha256(hexToUint8Array(kDate), regionName);
  const kService = await hmacSha256(hexToUint8Array(kRegion), serviceName);
  const kSigning = await hmacSha256(hexToUint8Array(kService), 'aws4_request');
  return hexToUint8Array(kSigning);
}

// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hexString: string): Uint8Array {
  const result = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return result;
}