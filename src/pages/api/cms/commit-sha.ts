import type { APIRoute } from 'astro';
import { GitHubAPI } from '@/lib/github-api';

// Disable prerendering for dev mode
export const prerender = false;

/**
 * API endpoint to get the latest commit SHA from the main branch.
 * Used by the CMS cache system to check if cached data is stale.
 * 
 * GET /api/cms/commit-sha
 * Returns: { sha: string, branch: string, timestamp: string }
 */
export const GET: APIRoute = async ({ request }) => {
    try {
        // Only allow in development mode
        if (import.meta.env.PROD) {
            return new Response(
                JSON.stringify({ error: 'This endpoint is only available in development mode' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Extract token from Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'Not authenticated', hint: 'Please log in' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix

        const github = new GitHubAPI(token);
        const mainBranch = await github.getMainBranch();

        // Get the latest commit from the main branch
        const commits = await github.getCommits(mainBranch, 1, 1);

        if (commits.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No commits found on main branch' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const latestCommit = commits[0];

        return new Response(
            JSON.stringify({
                sha: latestCommit.sha,
                branch: mainBranch,
                timestamp: new Date().toISOString()
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    // Allow client to cache for 30 seconds to reduce API calls
                    'Cache-Control': 'private, max-age=30'
                }
            }
        );

    } catch (error: any) {
        console.error('[API] Error fetching commit SHA:', error);
        return new Response(
            JSON.stringify('Failed to fetch commit SHA'),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
