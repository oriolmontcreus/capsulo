/**
 * Vite Plugin: CMS Preview
 * 
 * Enables live preview of CMS drafts without disk writes.
 * - Stores draft data in Node.js memory
 * - Exposes POST endpoint to receive drafts from admin panel
 * - Triggers HMR full-reload when drafts are updated
 * 
 * DEV ONLY: This plugin is for development use only.
 */

import type { Plugin, ViteDevServer } from 'vite';
import type { PageData, GlobalData } from './form-builder';
import type { IncomingMessage, ServerResponse } from 'http';

// ============================================================================
// IN-MEMORY STORES (accessible from cms-loader.ts)
// ============================================================================

// Use globalThis to ensure state is shared between Vite plugin process and SSR process
const GLOBAL_STORE_KEY = '__CAPSULO_PREVIEW_STORE__';
const GLOBAL_GLOBALS_KEY = '__CAPSULO_PREVIEW_GLOBALS__';
const GLOBAL_ACTIVE_KEY = '__CAPSULO_PREVIEW_ACTIVE__';

const globalRef = globalThis as any;

if (!globalRef[GLOBAL_STORE_KEY]) {
    globalRef[GLOBAL_STORE_KEY] = new Map<string, PageData>();
}
if (!globalRef[GLOBAL_GLOBALS_KEY]) {
    globalRef[GLOBAL_GLOBALS_KEY] = { data: null };
}
if (!globalRef[GLOBAL_ACTIVE_KEY]) {
    globalRef[GLOBAL_ACTIVE_KEY] = new Set<string>();
}

/** In-memory store for page drafts (pageId -> PageData) */
export const previewStore = globalRef[GLOBAL_STORE_KEY] as Map<string, PageData>;

/** In-memory store for globals draft */
export const globalsPreviewStore = globalRef[GLOBAL_GLOBALS_KEY] as { data: GlobalData | null };

/** Flag to indicate preview mode is active for a given page */
export const previewActivePages = globalRef[GLOBAL_ACTIVE_KEY] as Set<string>;

// ============================================================================
// REQUEST BODY PARSER
// ============================================================================

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

// ============================================================================
// VITE PLUGIN
// ============================================================================

export function cmsPreviewPlugin(): Plugin {
    let server: ViteDevServer | null = null;

    return {
        name: 'capsulo-cms-preview',

        // Only apply in dev mode
        apply: 'serve',

        configureServer(devServer) {
            server = devServer;

            // Add middleware for preview endpoints
            devServer.middlewares.use(async (req, res, next) => {
                // Only handle our preview endpoints
                if (!req.url?.startsWith('/__capsulo_preview')) {
                    return next();
                }

                // Enable CORS for admin panel
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                // Handle preflight
                if (req.method === 'OPTIONS') {
                    res.statusCode = 204;
                    res.end();
                    return;
                }

                try {
                    // POST /__capsulo_preview - Store draft and trigger HMR
                    if (req.method === 'POST' && req.url === '/__capsulo_preview') {
                        const body = await parseJsonBody(req) as {
                            type: 'page' | 'globals';
                            pageId?: string;
                            data: PageData | GlobalData;
                        };

                        if (body.type === 'page' && body.pageId) {
                            previewStore.set(body.pageId, body.data as PageData);
                            previewActivePages.add(body.pageId);
                            console.log(`[capsulo-preview] Preview data stored for page: ${body.pageId}`);
                        } else if (body.type === 'globals') {
                            globalsPreviewStore.data = body.data as GlobalData;
                            console.log(`[capsulo-preview] Preview data stored for globals`);
                        }

                        // Trigger custom HMR event
                        if (server) {
                            server.ws.send({
                                type: 'custom',
                                event: 'capsulo:preview-update'
                            });
                        }

                        sendJson(res, 200, { success: true });
                        return;
                    }

                    // GET /__capsulo_preview/status - Check preview status
                    if (req.method === 'GET' && req.url === '/__capsulo_preview/status') {
                        sendJson(res, 200, {
                            pages: Array.from(previewActivePages),
                            hasGlobals: globalsPreviewStore.data !== null
                        });
                        return;
                    }

                    // DELETE /__capsulo_preview - Clear all preview data
                    if (req.method === 'DELETE' && req.url === '/__capsulo_preview') {
                        previewStore.clear();
                        globalsPreviewStore.data = null;
                        previewActivePages.clear();
                        console.log(`[capsulo-preview] All preview data cleared`);

                        if (server) {
                            server.ws.send({
                                type: 'custom',
                                event: 'capsulo:preview-update'
                            });
                        }

                        sendJson(res, 200, { success: true });
                        return;
                    }

                    // DELETE /__capsulo_preview/:pageId - Clear specific page preview
                    const clearPageMatch = req.url.match(/^\/__capsulo_preview\/clear\/(.+)$/);
                    if (req.method === 'DELETE' && clearPageMatch) {
                        const pageId = decodeURIComponent(clearPageMatch[1]);
                        previewStore.delete(pageId);
                        previewActivePages.delete(pageId);
                        console.log(`[capsulo-preview] Preview data cleared for page: ${pageId}`);

                        if (server) {
                            server.ws.send({
                                type: 'custom',
                                event: 'capsulo:preview-update'
                            });
                        }

                        sendJson(res, 200, { success: true });
                        return;
                    }

                    // Not found
                    sendJson(res, 404, { error: 'Not found' });
                } catch (error) {
                    console.error('[capsulo-preview] Error:', error);
                    sendJson(res, 500, { error: 'Internal server error' });
                }
            });
        }
    };
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
}
