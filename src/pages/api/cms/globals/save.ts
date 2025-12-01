import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

// Disable prerendering for dev mode - build script will change this to true
// DO NOT manually change this value - it's managed by prebuild/postbuild scripts
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        // Only allow in development mode
        if (import.meta.env.PROD) {
            return new Response(
                JSON.stringify({ error: 'This endpoint is only available in development mode' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check if request has a body
        const contentType = request.headers.get('content-type');
        console.log('[API] Received Content-Type:', contentType);
        console.log('[API] All headers:', Object.fromEntries(request.headers.entries()));

        if (!contentType || !contentType.includes('application/json')) {
            return new Response(
                JSON.stringify({ error: 'Content-Type must be application/json' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const text = await request.text();
        if (!text || text.trim() === '') {
            return new Response(
                JSON.stringify({ error: 'Request body is empty' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        let body;
        try {
            body = JSON.parse(text);
        } catch (parseError) {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON in request body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { data } = body;

        if (!data) {
            return new Response(
                JSON.stringify({ error: 'Missing data' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build the file path
        const filePath = path.join(process.cwd(), 'src', 'content', 'globals.json');

        // Ensure directory exists
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write the file with proper handling of undefined values
        // JSON.stringify will omit undefined values, which is what we want
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        console.log(`[API] Saved global variables data to: ${filePath}`);

        return new Response(
            JSON.stringify({ success: true, message: 'Global variables saved successfully' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('[API] Error saving global variables:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to save global variables' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

