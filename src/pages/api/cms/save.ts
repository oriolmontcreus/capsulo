import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { savePageToGitHub } from '@/lib/cms-storage';

// Disable prerendering for dev mode - build script will change this to true
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

        const contentType = request.headers.get('content-type');
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
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON in request body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { pageName, data, githubToken, commitMessage } = body;

        if (!pageName || !data) {
            return new Response(
                JSON.stringify({ error: 'Missing pageName or data' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build the file path and save locally
        const filePath = path.join(process.cwd(), 'src', 'content', 'pages', `${pageName}.json`);
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[API] Saved page data to: ${filePath}`);

        // Sync to GitHub if token is provided
        let syncResult = { githubSynced: false, draftBranch: null as string | null };
        if (githubToken) {
            console.log(`[API Save Debug] Syncing ${pageName} to GitHub with token present`);
            console.log(`[API Save Debug] Data being synced:`, JSON.stringify(data).substring(0, 500) + '...');
            try {
                const branch = await savePageToGitHub(pageName, data, githubToken, commitMessage);
                console.log(`[API Save Debug] Successfully synced to branch: ${branch}`);
                syncResult = { githubSynced: true, draftBranch: branch };
            } catch (error: any) {
                console.warn(`[GitHub Sync] Failed to sync ${pageName}: ${error.message}`);
                // Continue as local save succeeded
            }
        } else {
            console.log(`[API Save Debug] No GitHub token, skipping sync for ${pageName}`);
        }

        return new Response(
            JSON.stringify({ success: true, ...syncResult }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('[API] Error saving page:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to save page' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
