import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildDiscardedMediaJsonForPublish,
    DISCARDED_MEDIA_REPO_PATH,
    parseDiscardedMediaFile,
} from '@/lib/cms/discarded-media';
import { batchCommitChanges } from '@/lib/cms-storage';
import type { PageData, GlobalData } from '@/lib/form-builder';

// Disable prerendering for dev mode - build script will change this to true
export const prerender = false;

interface BatchSaveRequest {
    pages: Array<{ pageName: string; data: PageData }>;
    globals?: GlobalData;
    commitMessage: string;
    githubToken?: string;
}

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

        let body: BatchSaveRequest;
        try {
            body = JSON.parse(text);
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid JSON in request body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { pages, globals, commitMessage, githubToken } = body;

        if (!pages || !Array.isArray(pages)) {
            return new Response(
                JSON.stringify({ error: 'Missing or invalid pages array' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!commitMessage) {
            return new Response(
                JSON.stringify({ error: 'Missing commitMessage' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[API Batch Save] Saving ${pages.length} pages and globals: ${globals ? 'yes' : 'no'}`);

        // Define the base directory for page content files
        const pagesBaseDir = path.join(process.cwd(), 'src', 'content', 'pages');
        const discardedAbsPath = path.join(process.cwd(), DISCARDED_MEDIA_REPO_PATH);
        const globalsAbsPath = path.join(process.cwd(), 'src', 'content', 'globals.json');

        const discardedJson = await buildDiscardedMediaJsonForPublish({
            changes: { pages, globals },
            getBaselinePage: async (fileName) => {
                const filePath = path.join(pagesBaseDir, `${fileName}.json`);
                if (!fs.existsSync(filePath)) return null;
                return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PageData;
            },
            getBaselineGlobals: async () => {
                if (!fs.existsSync(globalsAbsPath)) return null;
                return JSON.parse(fs.readFileSync(globalsAbsPath, 'utf-8')) as GlobalData;
            },
            getExistingDiscarded: async () => {
                if (!fs.existsSync(discardedAbsPath)) return null;
                return parseDiscardedMediaFile(JSON.parse(fs.readFileSync(discardedAbsPath, 'utf-8')));
            },
        });

        // Validate and sanitize page name to prevent path traversal
        const validatePageName = (pageName: string): { valid: boolean; sanitized?: string; error?: string } => {
            // Check for null bytes
            if (pageName.includes('\0')) {
                return { valid: false, error: 'Page name contains null bytes' };
            }

            // Check for path separators
            if (pageName.includes('/') || pageName.includes('\\') || pageName.includes('..')) {
                return { valid: false, error: 'Page name contains invalid path characters' };
            }

            // Whitelist pattern: only alphanumeric, hyphens, and underscores
            const safePattern = /^[a-z0-9-_]+$/i;
            if (!safePattern.test(pageName)) {
                return { valid: false, error: 'Page name contains invalid characters' };
            }

            // Map special names
            const sanitized = pageName === 'home' ? 'index' : pageName;

            // Double-check the resolved path stays within the base directory
            const resolvedPath = path.resolve(pagesBaseDir, `${sanitized}.json`);
            const normalizedBase = path.normalize(pagesBaseDir + path.sep);
            if (!resolvedPath.startsWith(normalizedBase)) {
                return { valid: false, error: 'Resolved path escapes base directory' };
            }

            return { valid: true, sanitized };
        };

        // Save all pages locally
        for (const { pageName, data } of pages) {
            const validation = validatePageName(pageName);
            if (!validation.valid) {
                return new Response(
                    JSON.stringify({ error: `Invalid page name "${pageName}": ${validation.error}` }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const filePath = path.join(pagesBaseDir, `${validation.sanitized}.json`);
            const dirPath = path.dirname(filePath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`[API Batch Save] Saved page: ${filePath}`);
        }

        // Save globals locally if provided
        if (globals) {
            const dirPath = path.dirname(globalsAbsPath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(globalsAbsPath, JSON.stringify(globals, null, 2), 'utf-8');
            console.log(`[API Batch Save] Saved globals: ${globalsAbsPath}`);
        }

        {
            const dirPath = path.dirname(discardedAbsPath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
            fs.writeFileSync(discardedAbsPath, discardedJson, 'utf-8');
            console.log(`[API Batch Save] Saved discarded media list: ${discardedAbsPath}`);
        }

        // Sync all to GitHub in a single atomic commit if token is provided
        let syncResult = { githubSynced: false };
        if (githubToken) {
            console.log(`[API Batch Save] Syncing to GitHub with atomic batch commit`);
            try {
                await batchCommitChanges({ pages, globals }, commitMessage, githubToken, {
                    discardedMediaJsonContent: discardedJson,
                });
                console.log(`[API Batch Save] Successfully synced to GitHub`);
                syncResult = { githubSynced: true };
            } catch (error: any) {
                console.warn(`[API Batch Save] Failed to sync to GitHub: ${error.message}`);
                // Continue as local save succeeded
            }
        } else {
            console.log(`[API Batch Save] No GitHub token, skipping sync`);
        }

        return new Response(
            JSON.stringify({ success: true, ...syncResult }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('[API Batch Save] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to batch save' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
