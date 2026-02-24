#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const getCapsuloDir = () => {
  const dirArgIndex = process.argv.indexOf('--dir');
  if (dirArgIndex !== -1) return process.argv[dirArgIndex + 1];

  const cwd = process.cwd();

  // Smart directory resolution: checking for the capsules folder
  if (fsSync.existsSync(path.join(cwd, 'src', 'components', 'capsules'))) return cwd;
  if (fsSync.existsSync(path.join(cwd, 'app', 'src', 'components', 'capsules')))
    return path.join(cwd, 'app');
  if (fsSync.existsSync(path.join(cwd, 'web', 'src', 'components', 'capsules')))
    return path.join(cwd, 'web');

  return cwd;
};

const CAPSULO_PROJECT_PATH = path.resolve(getCapsuloDir());
const VITE_DEV_SERVER_PORT = 4321;

/**
 * Two-level schema cache, built once per MCP session and invalidated by create_component.
 *
 * validCapsules  — lowercased capsule folder names (e.g. "hero", "feature-section")
 * fieldsBySchema — maps lowercase schemaName → Set of valid field keys parsed from the .schema.tsx source
 *
 * Cost after warm-up: O(fields) Set.has() lookups — effectively free.
 */
interface SchemaCache {
  validCapsules: Set<string>;
  fieldsBySchema: Map<string, Set<string>>;
}

let schemaCache: SchemaCache | null = null;

function invalidateSchemaCache() {
  schemaCache = null;
}

/**
 * Extracts all field keys from a schema .tsx source file.
 *
 * Every field builder follows the pattern: PascalCaseName('fieldKey', ...)
 * e.g. Input('subtitle'), Textarea('ctaButton'), FileUpload('media')
 *
 * Layout wrappers (Grid, Tabs, Repeater items) either take an object literal
 * or nothing as their first arg, so they are never captured.
 */
function extractFieldKeysFromSchema(source: string): Set<string> {
  const keys = new Set<string>();
  // Match: any PascalCase identifier followed by an opening paren and then a quoted string
  const FIELD_RE = /\b[A-Z][a-zA-Z]+\(\s*['"]([a-zA-Z0-9_-]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = FIELD_RE.exec(source)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

const server = new Server(
  { name: 'capsulo-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_schemas',
        description:
          'Lists all available Capsulo component schemas. Crucial for understanding what props and validation rules a component requires before writing a page.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_live_page',
        description:
          "Reads a page's actual live data, getting the exact version the user is looking at (including unsaved drafts). Always use this before editing a page instead of reading the JSON file directly.",
        inputSchema: {
          type: 'object',
          properties: {
            pageName: { type: 'string', description: "Name of the page (e.g., 'index', 'about')" },
          },
          required: ['pageName'],
        },
      },
      {
        name: 'write_live_page',
        description:
          "Writes data directly to a page's JSON file AND updates the live dev server preview instantly.",
        inputSchema: {
          type: 'object',
          properties: {
            pageName: { type: 'string' },
            content: { type: 'object', description: 'The full JSON PageData object' },
          },
          required: ['pageName', 'content'],
        },
      },
      {
        name: 'create_component',
        description:
          'Creates a new Capsulo component (React, Astro, etc) and its schema file instantly via the CLI.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'PascalCase name of the component (e.g. HeroSection)',
            },
            framework: {
              type: 'string',
              enum: ['astro', 'react', 'preact', 'solid', 'svelte', 'vue', 'alpine'],
            },
          },
          required: ['name', 'framework'],
        },
      },
      {
        name: 'run_doctor',
        description:
          'Runs the Capsulo project audit (Doctor) to check for schema/data consistency.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

async function getLivePreviewData(pageName: string) {
  try {
    const res = await fetch(
      `http://localhost:${VITE_DEV_SERVER_PORT}/__capsulo_preview/data?page=${pageName}`
    );
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Server might be down
  }
  return null;
}

async function pushLivePreviewData(pageName: string, content: any) {
  try {
    await fetch(`http://localhost:${VITE_DEV_SERVER_PORT}/__capsulo_preview/ai-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: pageName,
        data: content,
      }),
    });
  } catch (e) {
    // Server down
  }
}

/**
 * Two-level page reconciliation:
 *
 * LEVEL 1 — Component pruning
 *   Any component whose schemaName has no matching capsule folder on disk is
 *   dropped entirely (the capsule was deleted).
 *
 * LEVEL 2 — Field pruning
 *   For each surviving component, its `data` object is diffed against the
 *   field keys currently defined in its .schema.tsx file. Any key that no
 *   longer exists in the schema (old field that was removed) is stripped.
 *   This is the main fix for IndexedDB stale-field pollution.
 *
 * Both levels use the in-process SchemaCache so repeated calls are free.
 *
 * Returns:
 *   cleanData        — fully sanitised page object
 *   removedComponents — schemaNames of components that were completely dropped
 *   removedFields     — "schemaName.fieldKey" strings that were stripped
 */
async function reconcilePageData(pageData: any): Promise<{
  cleanData: any;
  removedComponents: string[];
  removedFields: string[];
}> {
  const capsulesPath = path.join(CAPSULO_PROJECT_PATH, 'src/components/capsules');

  // ── Build cache if needed ────────────────────────────────────────────────
  if (!schemaCache) {
    const cache: SchemaCache = {
      validCapsules: new Set<string>(),
      fieldsBySchema: new Map<string, Set<string>>(),
    };

    try {
      const folders = await fs.readdir(capsulesPath);

      await Promise.all(
        folders.map(async (folder) => {
          const folderLower = folder.toLowerCase();
          cache.validCapsules.add(folderLower);

          // Read the .schema.tsx source and extract valid field keys
          const schemaFilePath = path.join(capsulesPath, folder, `${folder}.schema.tsx`);
          try {
            const source = await fs.readFile(schemaFilePath, 'utf-8');
            cache.fieldsBySchema.set(folderLower, extractFieldKeysFromSchema(source));
          } catch (_) {
            // Schema file missing — allow all fields (no field-level pruning for this capsule)
            cache.fieldsBySchema.set(folderLower, new Set());
          }
        })
      );

      schemaCache = cache;
    } catch (_) {
      // Cannot read capsules directory — skip reconciliation entirely
      return { cleanData: pageData, removedComponents: [], removedFields: [] };
    }
  }

  // ── Level 1: Component pruning ───────────────────────────────────────────
  const originalComponents: any[] = pageData.components ?? [];
  const removedComponents: string[] = [];
  const removedFields: string[] = [];

  const validComponents = originalComponents.filter((c: any) => {
    if (!c.schemaName) {
      removedComponents.push('(unnamed)');
      return false;
    }
    if (!schemaCache!.validCapsules.has(c.schemaName.toLowerCase())) {
      removedComponents.push(c.schemaName);
      return false;
    }
    return true;
  });

  // ── Level 2: Field pruning ───────────────────────────────────────────────
  const cleanComponents = validComponents.map((c: any) => {
    const folderKey = c.schemaName.toLowerCase();
    const validFields = schemaCache!.fieldsBySchema.get(folderKey);

    // If we have no field info for this schema, return component untouched
    if (!validFields || validFields.size === 0) return c;

    const cleanData: Record<string, any> = {};
    for (const [key, value] of Object.entries(c.data ?? {})) {
      if (validFields.has(key)) {
        cleanData[key] = value;
      } else {
        removedFields.push(`${c.schemaName}.${key}`);
      }
    }

    return { ...c, data: cleanData };
  });

  return {
    cleanData: { ...pageData, components: cleanComponents },
    removedComponents,
    removedFields,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_schemas': {
        const capsulesPath = path.join(CAPSULO_PROJECT_PATH, 'src/components/capsules');
        try {
          const folders = await fs.readdir(capsulesPath);
          const result = [];

          for (const folder of folders) {
            const schemaPath = path.join(capsulesPath, folder, `${folder}.schema.tsx`);
            try {
              const content = await fs.readFile(schemaPath, 'utf-8');
              result.push({ capsule: folder, schemaSource: content });
            } catch (e) {}
          }
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Error reading capsules: ${e}` }],
          };
        }
      }

      case 'read_live_page': {
        const pageName = (args as any).pageName;
        const filePath = path.join(CAPSULO_PROJECT_PATH, `src/content/pages/${pageName}.json`);

        // 1. Get data from live previewStore first, fallback to disk
        let pageData: any = await getLivePreviewData(pageName);
        if (!pageData) {
          try {
            pageData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          } catch (e) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Page not found: ${pageName}` }],
            };
          }
        }

        // 2. Reconcile against valid capsule schemas on disk
        const { cleanData, removedComponents, removedFields } = await reconcilePageData(pageData);

        // 3. If anything was stale, heal disk + previewStore automatically
        const totalRemoved = removedComponents.length + removedFields.length;
        if (totalRemoved > 0) {
          await fs.writeFile(filePath, JSON.stringify(cleanData, null, 2));
          await pushLivePreviewData(pageName, cleanData);

          const lines: string[] = ['[capsulo-mcp] ⚠️  Stale data auto-removed:'];
          if (removedComponents.length > 0)
            lines.push(
              `  • Dropped components (no capsule folder): ${removedComponents.join(', ')}`
            );
          if (removedFields.length > 0)
            lines.push(`  • Stripped stale fields (not in schema): ${removedFields.join(', ')}`);
          lines.push('Disk and live preview updated with clean data.\n');
          lines.push(JSON.stringify(cleanData, null, 2));

          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        // No stale data — return as-is
        return { content: [{ type: 'text', text: JSON.stringify(pageData, null, 2) }] };
      }

      case 'write_live_page': {
        const { pageName, content } = args as any;
        const filePath = path.join(CAPSULO_PROJECT_PATH, `src/content/pages/${pageName}.json`);

        // Reconcile before writing — prevent stale data from ever being persisted
        const { cleanData, removedComponents, removedFields } = await reconcilePageData(content);

        await fs.writeFile(filePath, JSON.stringify(cleanData, null, 2));
        await pushLivePreviewData(pageName, cleanData);

        const totalRemoved = removedComponents.length + removedFields.length;
        const notice =
          totalRemoved > 0
            ? `\n⚠️  Auto-cleaned before write — removed ${removedComponents.length} component(s), ${removedFields.length} stale field(s).`
            : '';

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated ${pageName}.json and pushed to live preview.${notice}`,
            },
          ],
        };
      }

      case 'create_component': {
        const { name, framework } = args as any;
        return new Promise((resolve) => {
          const child = spawn(
            'npx',
            ['tsx', 'scripts/make-component.ts', '--name', name, '--framework', framework],
            { cwd: CAPSULO_PROJECT_PATH }
          );
          let output = '';
          child.stdout.on('data', (data) => (output += data.toString()));
          child.stderr.on('data', (data) => (output += data.toString()));
          child.on('close', (code) => {
            if (code === 0) {
              // Invalidate schema cache so the new capsule is immediately valid
              invalidateSchemaCache();
              resolve({
                content: [
                  {
                    type: 'text',
                    text: `Component ${name} created successfully!\n\nLogs:\n${output}`,
                  },
                ],
              });
            } else {
              resolve({
                isError: true,
                content: [{ type: 'text', text: `Creation failed with code ${code}:\n${output}` }],
              });
            }
          });
        });
      }

      case 'run_doctor': {
        return new Promise((resolve) => {
          const child = spawn('npx', ['tsx', 'scripts/doctor.ts'], { cwd: CAPSULO_PROJECT_PATH });
          let output = '';
          child.stdout.on('data', (data) => (output += data.toString()));
          child.stderr.on('data', (data) => (output += data.toString()));
          child.on('close', (code) => {
            resolve({ content: [{ type: 'text', text: output }] });
          });
        });
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return { isError: true, content: [{ type: 'text', text: error.message }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
