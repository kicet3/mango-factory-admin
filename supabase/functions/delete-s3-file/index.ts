const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteRequest {
  filePath: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Delete S3 file request received')

    const { filePath }: DeleteRequest = await req.json()

    if (!filePath) {
      console.error('File path is required')
      return new Response(
        JSON.stringify({ success: false, error: 'File path is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const awsRegion = Deno.env.get('AWS_REGION')
    const awsS3BucketName = Deno.env.get('AWS_S3_BUCKET_NAME')

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !awsS3BucketName) {
      console.error('Missing AWS credentials')
      return new Response(
        JSON.stringify({ success: false, error: 'AWS credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Deleting file: ${filePath}`)

    // Create delete request URL
    const s3Url = `https://${awsS3BucketName}.s3.${awsRegion}.amazonaws.com/${filePath}`
    
    // AWS Signature Version 4 signing process for DELETE request
    const method = 'DELETE'
    const service = 's3'
    const algorithm = 'AWS4-HMAC-SHA256'
    
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '')
    const dateStamp = amzDate.substring(0, 8)
    
    // Create canonical request
    const canonicalUri = `/${filePath}`
    const canonicalQuerystring = ''
    const payloadHash = await sha256('')
    const canonicalHeaders = `host:${awsS3BucketName}.s3.${awsRegion}.amazonaws.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    
    // Create string to sign
    const credentialScope = `${dateStamp}/${awsRegion}/${service}/aws4_request`
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`
    
    // Calculate signature
    const signingKey = await getSignatureKey(awsSecretAccessKey, dateStamp, awsRegion, service)
    const signature = await hmacSha256(signingKey, stringToSign)
    
    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    console.log(`Making S3 delete request to: ${s3Url}`)

    // Make the DELETE request to S3
    const deleteResponse = await fetch(s3Url, {
      method: 'DELETE',
      headers: {
        'Authorization': authorizationHeader,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
      },
    })

    if (deleteResponse.ok || deleteResponse.status === 404) {
      console.log('S3 file deleted successfully')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'File deleted successfully',
          filePath: filePath
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      const errorText = await deleteResponse.text()
      console.error('S3 delete failed:', deleteResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `S3 delete failed: ${deleteResponse.status}`,
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Delete error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(key: Uint8Array, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const kDate = await hmacSha256Raw(new TextEncoder().encode('AWS4' + key), dateStamp)
  const kRegion = await hmacSha256Raw(kDate, regionName)
  const kService = await hmacSha256Raw(kRegion, serviceName)
  const kSigning = await hmacSha256Raw(kService, 'aws4_request')
  return kSigning
}

async function hmacSha256Raw(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  
  return new Uint8Array(signature)
}