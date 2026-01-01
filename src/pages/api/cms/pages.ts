import type { APIRoute } from 'astro';
import componentManifest from 'virtual:component-manifest';

// Disable prerendering for dev mode
export const prerender = false;

interface PageInfo {
    id: string;
    name: string;
    path: string;
}

/**
 * API endpoint to get list of available pages with CMS components.
 * 
 * GET /api/cms/pages
 * → { pages: [{ id, name, path }, ...] }
 */
export const GET: APIRoute = async () => {
    try {
        // Only allow in development mode
        if (import.meta.env.PROD) {
            return new Response(
                JSON.stringify({ error: 'This endpoint is only available in development mode' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get pages from component manifest (keys are page IDs)
        const pageIds = Object.keys(componentManifest).filter(
            (id) => componentManifest[id] && componentManifest[id].length > 0
        );

        // Build page info from manifest keys
        const pages: PageInfo[] = pageIds.map((id) => {
            // Convert ID to display name
            let name = id;
            if (id === 'index') {
                name = 'Home';
            } else {
                // Convert kebab-case or snake_case to Title Case
                name = id
                    .split(/[-_]/)
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            return {
                id,
                name,
                path: id === 'index' ? '/' : `/${id}`,
            };
        });

        // Sort by name
        pages.sort((a, b) => a.name.localeCompare(b.name));

        console.log(`[API] Returning ${pages.length} pages from manifest`);

        return new Response(
            JSON.stringify({ pages }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: unknown) {
        console.error('[API] Error getting pages:', error);
        let errorMessage = 'Failed to get pages';
        if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = (error as { message: string }).message;
        }
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
