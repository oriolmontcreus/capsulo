/**
 * Vite Plugin: Schema Types Generator
 * Watches .schema.tsx files and automatically regenerates .schema.d.ts files
 * during development mode.
 */

import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { parseSchemaFile, generateDts } from '../../scripts/lib/schema-parser.ts';
import { colors, success } from '../../scripts/lib/cli.js';

const SCHEMA_EXTENSION = '.schema.tsx';

// Debounce map: filePath -> timeoutId
const debounceTimers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 100;

export function schemaTypesPlugin(): Plugin {
    let isDev = false;
    let projectRoot = '';

    return {
        name: 'vite-plugin-schema-types',

        configResolved(config) {
            isDev = config.command === 'serve';
            projectRoot = config.root;
        },

        buildStart() {
            // In dev mode, do an initial scan to ensure all types are up-to-date
            if (isDev) {
                regenerateAllSchemaTypes(projectRoot);
            }
        },

        configureServer(server) {
            if (!isDev) return;

            const watcher = server.watcher;

            // Watch for schema file changes
            watcher.on('change', (filePath) => {
                if (filePath.endsWith(SCHEMA_EXTENSION)) {
                    debouncedRegenerate(filePath);
                }
            });

            // Watch for new schema files
            watcher.on('add', (filePath) => {
                if (filePath.endsWith(SCHEMA_EXTENSION)) {
                    debouncedRegenerate(filePath);
                }
            });

            // Watch for deleted schema files - remove corresponding .d.ts
            watcher.on('unlink', (filePath) => {
                if (filePath.endsWith(SCHEMA_EXTENSION)) {
                    const dtsPath = filePath.replace(/\.tsx$/, '.d.ts');
                    if (fs.existsSync(dtsPath)) {
                        try {
                            fs.unlinkSync(dtsPath);
                            console.log(`${colors.dim('[schema-types]')} Removed: ${colors.info(path.basename(dtsPath))}`);
                        } catch (err) {
                            // Ignore deletion errors
                        }
                    }
                }
            });
        },
    };

    function debouncedRegenerate(filePath: string) {
        // Clear existing timer for this file
        const existingTimer = debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new debounced timer
        const timer = setTimeout(() => {
            debounceTimers.delete(filePath);
            regenerateSchemaTypes(filePath);
        }, DEBOUNCE_MS);

        debounceTimers.set(filePath, timer);
    }

    function regenerateSchemaTypes(schemaPath: string) {
        try {
            const schemas = parseSchemaFile(schemaPath);
            if (schemas.length > 0) {
                const dtsContent = generateDts(schemas);
                const dtsPath = schemaPath.replace(/\.tsx$/, '.d.ts');

                // Only write if content changed
                const existingContent = fs.existsSync(dtsPath)
                    ? fs.readFileSync(dtsPath, 'utf-8')
                    : '';

                if (existingContent !== dtsContent) {
                    fs.writeFileSync(dtsPath, dtsContent);
                    console.log(`${colors.dim('[schema-types]')} Regenerated: ${colors.info(path.basename(dtsPath))}`);
                }
            }
        } catch (err) {
            // Log error but don't crash the dev server
            const message = err instanceof Error ? err.message : String(err);
            console.error(`${colors.error('[schema-types]')} Error processing ${path.basename(schemaPath)}: ${message}`);
        }
    }

    function regenerateAllSchemaTypes(root: string) {
        const srcDir = path.join(root, 'src');
        let regenerated = 0;

        function walkDir(dir: string) {
            if (!fs.existsSync(dir)) return;

            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    walkDir(fullPath);
                } else if (fullPath.endsWith(SCHEMA_EXTENSION)) {
                    try {
                        const schemas = parseSchemaFile(fullPath);
                        if (schemas.length > 0) {
                            const dtsContent = generateDts(schemas);
                            const dtsPath = fullPath.replace(/\.tsx$/, '.d.ts');

                            // Only write if content changed
                            const existingContent = fs.existsSync(dtsPath)
                                ? fs.readFileSync(dtsPath, 'utf-8')
                                : '';

                            if (existingContent !== dtsContent) {
                                fs.writeFileSync(dtsPath, dtsContent);
                                regenerated++;
                            }
                        }
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        console.error(`${colors.error('[schema-types]')} Error: ${path.basename(fullPath)}: ${message}`);
                    }
                }
            }
        }

        walkDir(srcDir);

        if (regenerated > 0) {
            success(`[schema-types] Regenerated ${colors.info(String(regenerated))} stale type file(s)`);
        }
    }
}
