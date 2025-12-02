import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

// Disable prerendering for dev mode - build script will change this to true
// DO NOT manually change this value - it's managed by prebuild/postbuild scripts
export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        // Only allow in development mode
        if (import.meta.env.PROD) {
            return new Response(
                JSON.stringify({ error: 'This endpoint is only available in development mode' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build the file path
        const filePath = path.join(process.cwd(), 'src', 'content', 'globals.json');

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            // Return empty data structure if file doesn't exist
            return new Response(
                JSON.stringify({ variables: [] }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Read the file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        console.log(`[API] Loaded global variables data from: ${filePath}`);

        return new Response(
            JSON.stringify(data),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: unknown) {
        console.error('[API] Error loading global variables:', error);
        let errorMessage = 'Failed to load global variables';
        if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
            errorMessage = (error as { message: string }).message;
        }
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

