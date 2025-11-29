/**
 * Vite Plugin: Component Scanner
 * Generates a virtual module with the component manifest at build time
 * Watches for file changes in dev mode to regenerate the manifest
 */

import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Inline type to avoid importing from component-scanner
interface ComponentManifest {
    [pageId: string]: Array<{ schemaKey: string; componentName: string; occurrenceCount: number }>;
}

const VIRTUAL_MODULE_ID = 'virtual:component-manifest';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

/**
 * Recursively find all .astro files in a directory
 */
function findAstroFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Skip admin and api directories
            if (file === 'admin' || file === 'api') {
                continue;
            }
            findAstroFiles(filePath, fileList);
        } else if (file.endsWith('.astro')) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

/**
 * Extract page ID from file path (inline version to avoid imports)
 */
function getPageIdFromPath(filePath: string): string {
    let pageId = filePath
        .replace(/^.*\/pages\//, '')
        .replace(/\.astro$/, '')
        .replace(/\/index$/, '')
        .replace(/^\[locale\]\//, '')
        .replace(/\/\[locale\]\//, '/');

    if (!pageId || pageId === '[locale]' || pageId === '') {
        return 'index';
    }

    return pageId;
}

/**
 * Parse an .astro file to extract component imports and usage counts (inline version)
 */
function parseAstroFile(fileContent: string, filePath?: string): {
    imports: Map<string, string>;
    usageCounts: Map<string, number>;
} {
    const imports = new Map<string, string>();
    const usageCounts = new Map<string, number>();

    const frontmatterMatch = fileContent.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        return { imports, usageCounts };
    }

    const frontmatter = frontmatterMatch[1];
    const templateSection = fileContent.slice(frontmatterMatch[0].length);

    // Parse imports
    const importRegex = /import\s+(\w+)\s+from\s+['"]([@\.].*?)['"]/g;
    let importMatch;

    while ((importMatch = importRegex.exec(frontmatter)) !== null) {
        const componentName = importMatch[1];
        const importPath = importMatch[2];

        if (importPath.startsWith('@/components/capsulo/')) {
            imports.set(componentName, importPath);
        }
    }

    // Count component usage
    const componentTagRegex = /<(\w+)(?:\s|\/|>)/g;
    let tagMatch;

    while ((tagMatch = componentTagRegex.exec(templateSection)) !== null) {
        const tagName = tagMatch[1];

        if (imports.has(tagName)) {
            usageCounts.set(tagName, (usageCounts.get(tagName) || 0) + 1);
        }
    }

    return { imports, usageCounts };
}

/**
 * Get all available schemas without importing them (reads schema files directly)
 */
function getAvailableSchemaKeys(projectRoot: string): Map<string, string> {
    const schemaKeys = new Map<string, string>(); // folderName -> schemaKey

    try {
        const capsuloDir = path.join(projectRoot, 'src', 'components', 'capsulo');

        if (!fs.existsSync(capsuloDir)) {
            return schemaKeys;
        }

        const folders = fs.readdirSync(capsuloDir, { withFileTypes: true });

        for (const folder of folders) {
            if (!folder.isDirectory()) continue;

            const folderName = folder.name;
            const schemaPath = path.join(capsuloDir, folderName, `${folderName}.schema.tsx`);

            if (fs.existsSync(schemaPath)) {
                // Read schema file to extract the key
                const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

                // Extract the key from createSchema() call
                // Pattern: createSchema('Name', [...], 'description', 'key', ...)
                const keyMatch = schemaContent.match(/createSchema\s*\([^,]+,\s*\[[^\]]*\][^,]*,[^,]*,\s*['"]([^'"]+)['"]/);

                if (keyMatch) {
                    const schemaKey = keyMatch[1];
                    schemaKeys.set(folderName, schemaKey);
                } else {
                    // Fallback: use folder name as key
                    schemaKeys.set(folderName, folderName);
                }
            }
        }
    } catch (error) {
        console.error('[Component Scanner] Error reading schema keys:', error);
    }

    return schemaKeys;
}

/**
 * Scan a single page file for components (inline version)
 */
function scanPageComponents(
    filePath: string,
    fileContent: string,
    schemaKeys: Map<string, string>
): Array<{ schemaKey: string; componentName: string; occurrenceCount: number }> {
    const { imports, usageCounts } = parseAstroFile(fileContent, filePath);
    const components: Array<{ schemaKey: string; componentName: string; occurrenceCount: number }> = [];

    for (const [componentName, importPath] of imports.entries()) {
        // Extract folder name from import path
        const pathMatch = importPath.match(/@\/components\/capsulo\/([^\/]+)\//);
        if (!pathMatch) {
            console.log(`[Component Scanner] ✗ No folder match for: ${importPath}`);
            continue;
        }

        const folderName = pathMatch[1];
        const schemaKey = schemaKeys.get(folderName);

        if (schemaKey) {
            const occurrenceCount = usageCounts.get(componentName) || 0;

            if (occurrenceCount > 0) {
                components.push({
                    schemaKey,
                    componentName,
                    occurrenceCount,
                });
            }
        }
    }

    return components;
}

/**
 * Scan all pages manually using fs instead of import.meta.glob
 * This avoids SSR module loading issues during config evaluation
 */
function scanAllPagesManually(projectRoot: string): ComponentManifest {
    const manifest: ComponentManifest = {};

    try {
        // Get available schema keys first
        const schemaKeys = getAvailableSchemaKeys(projectRoot);

        if (schemaKeys.size === 0) {
            console.warn('[Component Scanner] No schemas found in src/components/capsulo/');
            return manifest;
        }

        // Find all .astro page files
        const pagesDir = path.join(projectRoot, 'src', 'pages');

        if (!fs.existsSync(pagesDir)) {
            console.warn('[Component Scanner] Pages directory not found:', pagesDir);
            return manifest;
        }

        const pageFiles = findAstroFiles(pagesDir);

        for (const filePath of pageFiles) {
            // Skip pages with dynamic parameters other than [locale]
            if (/\[(?!locale\])[^\]]+\]/.test(filePath)) {
                continue;
            }

            // Read file content
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Get page ID from relative path
            const relativePath = path.relative(pagesDir, filePath);
            const pageId = getPageIdFromPath('/src/pages/' + relativePath.replace(/\\/g, '/'));

            // Scan for components
            const components = scanPageComponents(filePath, fileContent, schemaKeys);

            // Only add to manifest if components were found
            if (components.length > 0) {
                manifest[pageId] = components;
            }
        }
    } catch (error) {
        console.error('[Component Scanner] Error scanning pages manually:', error);
    }

    return manifest;
}

export function componentScannerPlugin(): Plugin {
    let manifest: ComponentManifest | null = null;
    let isDev = false;
    let projectRoot = '';

    return {
        name: 'vite-plugin-component-scanner',

        configResolved(config) {
            isDev = config.command === 'serve';
            projectRoot = config.root;
        },

        buildStart() {
            // Generate manifest at build start using manual file reading
            try {
                manifest = scanAllPagesManually(projectRoot);
            } catch (error) {
                console.error('[Component Scanner] Error scanning pages:', error);
                manifest = {};
            }
        },

        configureServer(server) {
            if (!isDev) return;

            // Watch for changes in pages and component schemas
            const watcher = server.watcher;

            watcher.on('change', (filePath) => {
                // Regenerate manifest if page or schema files change
                if (
                    filePath.includes('/src/pages/') && filePath.endsWith('.astro') ||
                    filePath.includes('/src/components/capsulo/') && filePath.endsWith('.schema.tsx')
                ) {
                    try {
                        manifest = scanAllPagesManually(projectRoot);

                        // Invalidate the virtual module to trigger HMR
                        const module = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
                        if (module) {
                            server.moduleGraph.invalidateModule(module);
                        }

                        // Trigger a full page reload (since we accepted refresh is needed)
                        server.ws.send({
                            type: 'full-reload',
                            path: '*',
                        });
                    } catch (error) {
                        console.error('[Component Scanner] Error regenerating manifest:', error);
                    }
                }
            });
        },

        resolveId(id) {
            if (id === VIRTUAL_MODULE_ID) {
                return RESOLVED_VIRTUAL_MODULE_ID;
            }
        },

        load(id) {
            if (id === RESOLVED_VIRTUAL_MODULE_ID) {
                if (!manifest) {
                    // Fallback: generate manifest if not already generated
                    manifest = scanAllPagesManually(projectRoot);
                }

                // Return the manifest as a JavaScript module
                return `export default ${JSON.stringify(manifest, null, 2)};`;
            }
        },
    };
}
