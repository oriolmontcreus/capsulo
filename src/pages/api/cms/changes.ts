import type { APIRoute } from 'astro';
import { GitHubServerAPI } from '@/lib/github-server';

// Disable prerendering for dev mode
export const prerender = false;

/**
 * API endpoint to get page content from specific branches for comparison
 * Used by the Changes Viewer to fetch "old" (main) and "new" (draft) data
 * 
 * Query params:
 *   - page: Page name (required)
 *   - branch: Branch name - 'main' or 'draft' (required)
 *   - token: GitHub token (required)
 */
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
        const branchParam = url.searchParams.get('branch');
        const token = url.searchParams.get('token');

        if (!pageName) {
            return new Response(
                JSON.stringify({ error: 'Missing page parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!branchParam || !['main', 'draft'].includes(branchParam)) {
            return new Response(
                JSON.stringify({ error: 'Missing or invalid branch parameter. Use "main" or "draft"' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check if token is provided
        if (!token) {
            return new Response(
                JSON.stringify({
                    error: 'GitHub token not provided',
                    hint: 'Please log in to the CMS first'
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const github = new GitHubServerAPI(token);
        const filePath = `src/content/pages/${pageName}.json`;

        // Determine which branch to fetch from
        let branch: string;
        if (branchParam === 'draft') {
            // Check if draft branch exists
            const draftBranch = GitHubServerAPI.getDraftBranch();
            const draftExists = await github.checkBranchExists(draftBranch);
            if (!draftExists) {
                return new Response(
                    JSON.stringify({
                        data: null,
                        message: 'Draft branch does not exist yet',
                        branch: draftBranch
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            branch = draftBranch;
        } else {
            branch = await github.getMainBranch();
        }

        // Fetch file content from the branch
        const data = await github.getFileContent(filePath, branch);

        return new Response(
            JSON.stringify({
                data,
                branch,
                page: pageName
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[API] Error fetching changes data:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to fetch changes data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
