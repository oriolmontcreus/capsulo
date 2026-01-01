import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files to restore
const files = [
    path.join(__dirname, '../src/pages/api/cms/save.ts'),
    path.join(__dirname, '../src/pages/api/cms/load.ts'),
    path.join(__dirname, '../src/pages/api/cms/globals/save.ts'),
    path.join(__dirname, '../src/pages/api/cms/globals/load.ts'),
    path.join(__dirname, '../src/pages/api/cms/pages.ts'),
    path.join(__dirname, '../src/pages/api/cms/changes.ts'),
    path.join(__dirname, '../src/pages/api/cms/commit-sha.ts'),
    path.join(__dirname, '../src/pages/admin/[...all].astro')
];

console.log('[Postbuild] Restoring prerender = false for dev mode...');

files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');

        if (filePath.includes('[...all].astro')) {
            content = content.replace(
                'export const prerender = true;\nexport function getStaticPaths() { return [{ params: { all: undefined } }]; }',
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
        console.log(`[Postbuild] Restored ${path.basename(filePath)}`);
    }
});

console.log('[Postbuild] Done!');
