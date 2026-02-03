import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, outro, colors } from './lib/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files to restore
const files = [
    path.join(__dirname, '../src/pages/api/cms/save.ts'),
    path.join(__dirname, '../src/pages/api/cms/load.ts'),
    path.join(__dirname, '../src/pages/api/cms/batch-save.ts'),
    path.join(__dirname, '../src/pages/api/cms/globals/save.ts'),
    path.join(__dirname, '../src/pages/api/cms/globals/load.ts'),
    path.join(__dirname, '../src/pages/api/cms/pages.ts'),
    path.join(__dirname, '../src/pages/api/cms/changes.ts'),
    path.join(__dirname, '../src/pages/api/cms/commit-sha.ts'),
    path.join(__dirname, '../src/pages/admin/[...all].astro')
];

intro('postbuild');

const restoredFiles = [];

files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');

        if (path.basename(filePath) === '[...all].astro') {
            content = content.replace(
                /export const prerender = true;\s*export function getStaticPaths\(\)\s*\{\s*return\s*\[.*?\];\s*\}/,
                'export const prerender = false;'
            );
        } else {
            // Replace prerender = true with prerender = false
            content = content.replace(
                /export const prerender = true;/g,
                'export const prerender = false;'
            );
        }

        fs.writeFileSync(filePath, content, 'utf-8');
        restoredFiles.push(path.basename(filePath));
    }
});

// Compact output: show files inline
console.log(`│  ${colors.dim('Files:')} ${restoredFiles.map(f => colors.info(f)).join(colors.dim(', '))}`);

outro(`Set ${colors.info('prerender = false')} for ${colors.info(restoredFiles.length)} files`);
