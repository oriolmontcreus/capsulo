import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { GitHubAPI } from '@/lib/github-api';

// Disable prerendering for dev mode - build script will change this to true
export const prerender = false;

const DRAFT_BRANCH = 'cms-draft';

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

        const { pageName, data, githubToken } = body;

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
        let githubSynced = false;
        if (githubToken) {
            try {
                const github = new GitHubAPI(githubToken);
                // Ensure draft branch exists
                const exists = await github.checkBranchExists(DRAFT_BRANCH);
                if (!exists) {
                    const mainBranch = await github.getMainBranch();
                    await github.createBranch(DRAFT_BRANCH, mainBranch);
                    console.log(`[API] Created draft branch: ${DRAFT_BRANCH}`);
                }
                // Commit the file
                const content = JSON.stringify(data, null, 2);
                await github.commitFile(`src/content/pages/${pageName}.json`, content, `Update ${pageName} via CMS`, DRAFT_BRANCH);
                githubSynced = true;
                console.log(`[API] Synced page to GitHub: ${DRAFT_BRANCH}`);
            } catch (githubError: any) {
                console.warn(`[API] GitHub sync failed: ${githubError.message}`);
            }
        }

        return new Response(
            JSON.stringify({ success: true, githubSynced, draftBranch: githubSynced ? DRAFT_BRANCH : null }),
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
