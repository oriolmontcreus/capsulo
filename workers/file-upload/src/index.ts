/**
 * Cloudflare Worker for handling R2 file uploads directly
 * This avoids CORS issues by handling uploads through the worker
 */

// Cloudflare R2 types
interface R2Bucket {
    get(key: string): Promise<R2Object | null>;
    put(key: string, value: ArrayBuffer | string, options?: {
        httpMetadata?: {
            contentType?: string;
            contentLanguage?: string;
            contentDisposition?: string;
            contentEncoding?: string;
            cacheControl?: string;
            expires?: Date;
        };
        customMetadata?: Record<string, string>;
    }): Promise<R2Object>;
    delete(key: string): Promise<void>;
}

interface R2Object {
    key: string;
    version: string;
    size: number;
    etag: string;
    httpEtag: string;
    uploaded: Date;
    checksums: R2Checksums;
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    body?: ReadableStream;
}

interface R2Checksums {
    md5?: ArrayBuffer;
    sha1?: ArrayBuffer;
    sha256?: ArrayBuffer;
    sha384?: ArrayBuffer;
    sha512?: ArrayBuffer;
}

interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    expires?: Date;
}

export interface Env {
    CLOUDFLARE_R2_BUCKET: string;
    CLOUDFLARE_R2_ACCESS_KEY_ID: string;
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: string;
    CLOUDFLARE_R2_REGION: string;
    CLOUDFLARE_R2_ENDPOINT?: string;
    CLOUDFLARE_R2_PUBLIC_URL?: string;
    WORKER_URL?: string;
    ALLOWED_ORIGINS?: string;
    // R2 Bucket binding (if configured)
    R2_BUCKET?: R2Bucket;
}

interface UploadRequest {
    fileName: string;
    fileSize: number;
    fileType: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS(request, env);
        }

        const url = new URL(request.url);

        // Handle health check
        if (url.pathname === '/health' && request.method === 'GET') {
            return handleHealthCheck(env);
        }



        // Handle direct file upload
        if (url.pathname === '/upload' && request.method === 'PUT') {
            return handleFileUpload(request, env);
        }

        // Handle file serving (GET /file/path)
        if (url.pathname.startsWith('/file/') && request.method === 'GET') {
            return handleFileServing(request, env, url.pathname.substring(6)); // Remove '/file/' prefix
        }

        // Handle file deletion (DELETE /file/path)
        if (url.pathname.startsWith('/file/') && request.method === 'DELETE') {
            return handleFileDeletion(request, env, url.pathname.substring(6)); // Remove '/file/' prefix
        }

        // Handle presigned URL generation (POST to root)
        if (request.method === 'POST') {
            return handlePresignedUrlRequest(request, env);
        }

        return new Response('Not found', { status: 404 });
    }
};

async function handleHealthCheck(env: Env): Promise<Response> {
    const bucket = env.CLOUDFLARE_R2_BUCKET;
    const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const region = env.CLOUDFLARE_R2_REGION || 'auto';
    const endpoint = env.CLOUDFLARE_R2_ENDPOINT;

    const status = {
        configured: !!(bucket && accessKeyId && secretAccessKey),
        bucket: !!bucket,
        accessKeyId: !!accessKeyId,
        secretAccessKey: !!secretAccessKey,
        region: !!region,
        endpoint: !!endpoint,
        timestamp: new Date().toISOString()
    };

    const httpStatus = status.configured ? 200 : 503;
    const message = status.configured ? 'Worker is properly configured' : 'Worker is missing required R2 credentials';

    return new Response(JSON.stringify({
        status: message,
        configured: status.configured,
        details: status
    }), {
        status: httpStatus,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

async function handlePresignedUrlRequest(request: Request, env: Env): Promise<Response> {
    try {
        const body: UploadRequest = await request.json();
        const { fileName, fileSize, fileType } = body;

        if (!fileName || !fileSize || !fileType) {
            return new Response('Missing required fields: fileName, fileSize, fileType', { status: 400 });
        }

        // Generate unique file path
        const filePath = generateFilePath(fileName, fileType);

        // Return worker upload URL instead of presigned URL
        const uploadUrl = `${new URL(request.url).origin}/upload`;

        const response = {
            uploadUrl,
            filePath,
            publicUrl: getPublicUrl(env, filePath),
            expiresIn: 3600,
            // Include metadata for the upload
            uploadHeaders: {
                'X-File-Path': filePath,
                'X-File-Type': fileType
            }
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...getCORSHeaders(request, env)
            }
        });

    } catch (error) {
        console.error('Error generating upload URL:', error);
        return new Response('Internal server error', {
            status: 500,
            headers: getCORSHeaders(request, env)
        });
    }
}

async function handleFileServing(request: Request, env: Env, filePath: string): Promise<Response> {
    try {
        // Try using R2 binding first if available
        if (env.R2_BUCKET) {
            const object = await env.R2_BUCKET.get(filePath);

            if (!object) {
                return new Response('File not found', {
                    status: 404,
                    headers: getCORSHeaders(request, env)
                });
            }

            const headers = {
                'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
                'Content-Length': object.size.toString(),
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                ...getCORSHeaders(request, env)
            };

            return new Response(object.body, { headers });
        }

        // Fallback: redirect to direct R2 URL (if bucket is public)
        const publicUrl = getPublicUrl(env, filePath);
        return Response.redirect(publicUrl, 302);

    } catch (error) {
        console.error('Error serving file:', error);
        return new Response('Error serving file', {
            status: 500,
            headers: getCORSHeaders(request, env)
        });
    }
}

async function handleFileDeletion(request: Request, env: Env, filePath: string): Promise<Response> {
    try {
        // Delete from R2
        const deleteResult = await deleteFromR2(env, filePath);

        if (!deleteResult.success) {
            console.error('Delete failed:', deleteResult.error);
            return new Response(`Delete failed: ${deleteResult.error}`, {
                status: 500,
                headers: getCORSHeaders(request, env)
            });
        }

        const response = {
            success: true,
            message: 'File deleted successfully',
            filePath
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...getCORSHeaders(request, env)
            }
        });

    } catch (error) {
        console.error('Error deleting file:', error);
        return new Response('Delete failed', {
            status: 500,
            headers: getCORSHeaders(request, env)
        });
    }
}

async function handleFileUpload(request: Request, env: Env): Promise<Response> {
    try {
        // Get file metadata from headers
        const filePath = request.headers.get('X-File-Path');
        const fileType = request.headers.get('X-File-Type');

        if (!filePath || !fileType) {
            return new Response('Missing file metadata headers', {
                status: 400,
                headers: getCORSHeaders(request, env)
            });
        }

        // Get file data
        const fileData = await request.arrayBuffer();

        if (!fileData || fileData.byteLength === 0) {
            return new Response('No file data received', {
                status: 400,
                headers: getCORSHeaders(request, env)
            });
        }

        // Upload to R2 using direct approach
        const uploadResult = await uploadToR2Direct(env, filePath, fileData, fileType);

        if (!uploadResult.success) {
            console.error('Upload failed:', uploadResult.error);
            return new Response(`Upload failed: ${uploadResult.error}`, {
                status: 500,
                headers: getCORSHeaders(request, env)
            });
        }

        const response = {
            success: true,
            url: getPublicUrl(env, filePath),
            filePath,
            size: fileData.byteLength
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                ...getCORSHeaders(request, env)
            }
        });

    } catch (error) {
        console.error('Error uploading file:', error);
        return new Response('Upload failed', {
            status: 500,
            headers: getCORSHeaders(request, env)
        });
    }
}

async function uploadToR2Direct(env: Env, filePath: string, fileData: ArrayBuffer, contentType: string): Promise<{ success: boolean, error?: string }> {
    try {
        // Try using R2 binding first if available
        if (env.R2_BUCKET) {
            await env.R2_BUCKET.put(filePath, fileData, {
                httpMetadata: {
                    contentType: contentType
                }
            });
            return { success: true };
        }

        // Fallback to AWS SDK approach with corrected signature
        return await uploadToR2WithAWS(env, filePath, fileData, contentType);
    } catch (error) {
        console.error('R2 upload error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function deleteFromR2(env: Env, filePath: string): Promise<{ success: boolean, error?: string }> {
    try {
        // Try using R2 binding first if available
        if (env.R2_BUCKET) {
            await env.R2_BUCKET.delete(filePath);
            return { success: true };
        }

        // Fallback to AWS SDK approach
        return await deleteFromR2WithAWS(env, filePath);
    } catch (error) {
        console.error('R2 delete error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function deleteFromR2WithAWS(env: Env, filePath: string): Promise<{ success: boolean, error?: string }> {
    try {
        const region = env.CLOUDFLARE_R2_REGION || 'auto';
        const bucket = env.CLOUDFLARE_R2_BUCKET;
        const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

        // Check if all required credentials are present
        if (!bucket || !accessKeyId || !secretAccessKey) {
            const missing = [];
            if (!bucket) missing.push('CLOUDFLARE_R2_BUCKET');
            if (!accessKeyId) missing.push('CLOUDFLARE_R2_ACCESS_KEY_ID');
            if (!secretAccessKey) missing.push('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

            return {
                success: false,
                error: `Missing R2 credentials: ${missing.join(', ')}. Please configure these as worker secrets using: wrangler secret put <SECRET_NAME>`
            };
        }

        // Use custom endpoint if provided, otherwise use default R2 endpoint
        let host: string;
        let url: string;

        if (env.CLOUDFLARE_R2_ENDPOINT) {
            const endpointUrl = new URL(env.CLOUDFLARE_R2_ENDPOINT);
            host = endpointUrl.host;
            url = `${env.CLOUDFLARE_R2_ENDPOINT}/${filePath}`;
        } else {
            host = `${bucket}.r2.cloudflarestorage.com`;
            url = `https://${host}/${filePath}`;
        }

        const now = new Date();
        const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

        // Create canonical request for DELETE
        const method = 'DELETE';
        const uri = `/${filePath}`;
        const queryString = '';
        // Headers must be in alphabetical order
        const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${timestamp}\n`;
        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        const payloadHash = 'UNSIGNED-PAYLOAD';

        const canonicalRequest = [
            method,
            uri,
            queryString,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');

        // Create string to sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${dateString}/${region}/s3/aws4_request`;
        const canonicalRequestHash = await sha256(canonicalRequest);

        const stringToSign = [
            algorithm,
            timestamp,
            credentialScope,
            canonicalRequestHash
        ].join('\n');

        // Generate signing key and signature
        const signingKey = await getSigningKey(secretAccessKey, dateString, region, 's3');
        const signature = await hmacSha256Hex(signingKey, stringToSign);

        // Create authorization header
        const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        // Make the delete request
        const deleteResponse = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Host': host,
                'X-Amz-Content-Sha256': payloadHash,
                'X-Amz-Date': timestamp,
                'Authorization': authorization
            }
        });

        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error('R2 delete failed:', {
                status: deleteResponse.status,
                statusText: deleteResponse.statusText,
                error: errorText,
                url,
                headers: Object.fromEntries(deleteResponse.headers.entries())
            });
            return { success: false, error: `R2 delete failed: ${deleteResponse.status} ${errorText}` };
        }

        return { success: true };

    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function uploadToR2WithAWS(env: Env, filePath: string, fileData: ArrayBuffer, contentType: string): Promise<{ success: boolean, error?: string }> {
    try {
        const region = env.CLOUDFLARE_R2_REGION || 'auto';
        const bucket = env.CLOUDFLARE_R2_BUCKET;
        const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
        const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

        // Check if all required credentials are present
        if (!bucket || !accessKeyId || !secretAccessKey) {
            const missing = [];
            if (!bucket) missing.push('CLOUDFLARE_R2_BUCKET');
            if (!accessKeyId) missing.push('CLOUDFLARE_R2_ACCESS_KEY_ID');
            if (!secretAccessKey) missing.push('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

            return {
                success: false,
                error: `Missing R2 credentials: ${missing.join(', ')}. Please configure these as worker secrets using: wrangler secret put <SECRET_NAME>`
            };
        }

        // Use custom endpoint if provided, otherwise use default R2 endpoint
        let host: string;
        let url: string;

        if (env.CLOUDFLARE_R2_ENDPOINT) {
            const endpointUrl = new URL(env.CLOUDFLARE_R2_ENDPOINT);
            host = endpointUrl.host;
            url = `${env.CLOUDFLARE_R2_ENDPOINT}/${filePath}`;
        } else {
            host = `${bucket}.r2.cloudflarestorage.com`;
            url = `https://${host}/${filePath}`;
        }

        const now = new Date();
        const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

        // Create canonical request
        const method = 'PUT';
        const uri = `/${filePath}`;
        const queryString = '';
        // Headers must be in alphabetical order
        const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${timestamp}\n`;
        const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
        const payloadHash = 'UNSIGNED-PAYLOAD';

        const canonicalRequest = [
            method,
            uri,
            queryString,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');

        // Create string to sign
        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${dateString}/${region}/s3/aws4_request`;
        const canonicalRequestHash = await sha256(canonicalRequest);

        const stringToSign = [
            algorithm,
            timestamp,
            credentialScope,
            canonicalRequestHash
        ].join('\n');

        // Generate signing key and signature
        const signingKey = await getSigningKey(secretAccessKey, dateString, region, 's3');
        const signature = await hmacSha256Hex(signingKey, stringToSign);

        // Create authorization header
        const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        // Make the upload request
        const uploadResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                'Host': host,
                'X-Amz-Content-Sha256': payloadHash,
                'X-Amz-Date': timestamp,
                'Authorization': authorization
            },
            body: fileData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('R2 upload failed:', {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                error: errorText,
                url,
                headers: Object.fromEntries(uploadResponse.headers.entries())
            });
            return { success: false, error: `R2 upload failed: ${uploadResponse.status} ${errorText}` };
        }

        return { success: true };

    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

function generateFilePath(fileName: string, fileType: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const sanitizedName = sanitizeFileName(fileName);
    const fileCategory = getFileCategory(fileType);
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `cms-uploads/${fileCategory}/${year}/${month}/${timestamp}-${randomId}-${sanitizedName}`;
}

// AWS v4 signature helper functions
async function sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
    const signature = await hmacSha256(key, message);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretAccessKey: string, dateString: string, region: string, service: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();

    const kDate = await hmacSha256(encoder.encode(`AWS4${secretAccessKey}`).buffer, dateString);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    const kSigning = await hmacSha256(kService, 'aws4_request');

    return kSigning;
}

function getPublicUrl(env: Env, filePath: string): string {
    // If we have a custom public URL (R2.dev subdomain), use it
    if (env.CLOUDFLARE_R2_PUBLIC_URL) {
        return `${env.CLOUDFLARE_R2_PUBLIC_URL}/${filePath}`;
    }

    // If we have a custom endpoint, use it directly
    if (env.CLOUDFLARE_R2_ENDPOINT) {
        return `${env.CLOUDFLARE_R2_ENDPOINT}/${filePath}`;
    }

    // Default: use the R2.dev public URL (you should set this as an environment variable)
    return `https://pub-778f9cca88fe4e77a7390d4fccc06ec1.r2.dev/${filePath}`;
}

function sanitizeFileName(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
}

function getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'documents';
    return 'other';
}

function handleCORS(request: Request, env: Env): Response {
    return new Response(null, {
        status: 200,
        headers: getCORSHeaders(request, env)
    });
}

function getCORSHeaders(request: Request, env: Env): Record<string, string> {
    const origin = request.headers.get('Origin');
    const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4321', 'http://localhost:4322'];

    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-File-Path, X-File-Type',
        'Access-Control-Max-Age': '86400'
    };

    // For development, allow localhost origins
    if (origin && (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:'))) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    return headers;
}