import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const GET: APIRoute = async ({ url }) => {
    try {
        // Only allow in development mode
        if (import.meta.env.PROD) {
            return new Response(
                JSON.stringify({ error: 'This endpoint is only available in development mode' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const pageName = url.searchParams.get('page');

        if (!pageName) {
            return new Response(
                JSON.stringify({ error: 'Missing page parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build the file path
        const filePath = path.join(process.cwd(), 'src', 'content', 'pages', `${pageName}.json`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return new Response(
                JSON.stringify({ error: 'Page not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Read the file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        console.log(`[API] Loaded page data from: ${filePath}`);

        return new Response(
            JSON.stringify(data),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('[API] Error loading page:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to load page' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
