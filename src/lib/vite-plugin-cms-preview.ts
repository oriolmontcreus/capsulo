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
import { info, colors } from '../../scripts/lib/cli.js';
import isEqual from 'lodash/isEqual.js';

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

const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit for preview data

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
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
            const body = (await parseJsonBody(req)) as {
              type: 'page' | 'globals' | 'all';
              pageId?: string;
              data?: PageData | GlobalData;
              pageData?: PageData;
              globalData?: GlobalData;
            };

            if (body.type === 'page' && body.pageId && body.data) {
              const existing = previewStore.get(body.pageId);
              if (!isEqual(existing, body.data)) {
                previewStore.set(body.pageId, body.data as PageData);
                previewActivePages.add(body.pageId);
                console.log(`${colors.success('»')} Preview updated: ${colors.info(body.pageId)}`);

                if (server) {
                  server.ws.send({
                    type: 'custom',
                    event: 'capsulo:preview-update',
                  });
                }
              }
            } else if (body.type === 'globals' && body.data) {
              const existing = globalsPreviewStore.data;
              if (!isEqual(existing, body.data)) {
                globalsPreviewStore.data = body.data as GlobalData;
                console.log(`${colors.success('»')} Preview updated: ${colors.info('globals')}`);

                if (server) {
                  server.ws.send({
                    type: 'custom',
                    event: 'capsulo:preview-update',
                  });
                }
              }
            } else if (body.type === 'all') {
              const updates = [];
              if (body.pageId && body.pageData) {
                const existing = previewStore.get(body.pageId);
                if (!isEqual(existing, body.pageData)) {
                  previewStore.set(body.pageId, body.pageData);
                  previewActivePages.add(body.pageId);
                  updates.push(body.pageId);
                }
              }
              if (body.globalData) {
                const existing = globalsPreviewStore.data;
                if (!isEqual(existing, body.globalData)) {
                  globalsPreviewStore.data = body.globalData;
                  updates.push('globals');
                }
              }

              if (updates.length > 0) {
                console.log(
                  `${colors.success('»')} Preview updated: ${colors.info(updates.join(' + '))}`
                );

                // Trigger custom HMR event only if something actually changed
                if (server) {
                  server.ws.send({
                    type: 'custom',
                    event: 'capsulo:preview-update',
                  });
                }
              }
            }

            sendJson(res, 200, { success: true });
            return;
          }

          // GET /__capsulo_preview/status - Check preview status
          if (req.method === 'GET' && req.url === '/__capsulo_preview/status') {
            sendJson(res, 200, {
              pages: Array.from(previewActivePages),
              hasGlobals: globalsPreviewStore.data !== null,
            });
            return;
          }

          // GET /__capsulo_preview/data?page=xyz or ?globals=true - Get live data for MCP
          if (req.method === 'GET' && req.url?.startsWith('/__capsulo_preview/data')) {
            const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const pageId = url.searchParams.get('page');
            const wantGlobals = url.searchParams.get('globals') === 'true';

            if (wantGlobals) {
              if (globalsPreviewStore.data) {
                sendJson(res, 200, globalsPreviewStore.data);
              } else {
                sendJson(res, 404, { error: 'No live globals data' });
              }
              return;
            }

            if (pageId) {
              const pageData = previewStore.get(pageId);
              if (pageData) {
                sendJson(res, 200, pageData);
              } else {
                sendJson(res, 404, { error: `No live data for page: ${pageId}` });
              }
              return;
            }

            sendJson(res, 400, { error: 'Missing page or globals parameter' });
            return;
          }

          // DELETE /__capsulo_preview - Clear all preview data
          if (req.method === 'DELETE' && req.url === '/__capsulo_preview') {
            previewStore.clear();
            globalsPreviewStore.data = null;
            previewActivePages.clear();
            info('All preview data cleared');

            if (server) {
              server.ws.send({
                type: 'custom',
                event: 'capsulo:preview-update',
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
            info(`Preview data cleared for page: ${pageId}`);

            if (server) {
              server.ws.send({
                type: 'custom',
                event: 'capsulo:preview-update',
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
    },
  };
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}
