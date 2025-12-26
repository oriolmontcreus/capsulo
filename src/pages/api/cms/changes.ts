import type { APIRoute } from 'astro';
import { GitHubAPI } from '@/lib/github-api';

// Disable prerendering for dev mode
export const prerender = false;

const DRAFT_BRANCH = 'cms-draft';

/**
 * API endpoint to get page content from specific branches for comparison
 * Used by the Changes Viewer to fetch "old" (main) and "new" (draft) data
 */
export const GET: APIRoute = async ({ url, request }) => {
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

        const pageName = url.searchParams.get('page');
        const branchParam = url.searchParams.get('branch');

        if (!pageName) {
            return new Response(
                JSON.stringify({ error: 'Missing page parameter' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!branchParam || !['main', 'draft'].includes(branchParam)) {
            return new Response(
                JSON.stringify({ error: 'Invalid branch. Use "main" or "draft"' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const github = new GitHubAPI(token);
        const filePath = `src/content/pages/${pageName}.json`;

        // Determine branch
        let branch: string;
        if (branchParam === 'draft') {
            const exists = await github.checkBranchExists(DRAFT_BRANCH);
            if (!exists) {
                return new Response(
                    JSON.stringify({ data: null, message: 'Draft branch does not exist yet' }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                );
            }
            branch = DRAFT_BRANCH;
        } else {
            branch = await github.getMainBranch();
        }

        const data = await github.getFileContent(filePath, branch);

        return new Response(
            JSON.stringify({ data, branch, page: pageName }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[API] Error fetching changes:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to fetch changes' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
