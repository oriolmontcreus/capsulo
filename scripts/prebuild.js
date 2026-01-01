import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files to modify
const files = [
    path.join(__dirname, '../src/pages/api/cms/save.ts'),
    path.join(__dirname, '../src/pages/api/cms/load.ts'),
    path.join(__dirname, '../src/pages/api/cms/globals/save.ts'),
    path.join(__dirname, '../src/pages/api/cms/globals/load.ts'),
    path.join(__dirname, '../src/pages/api/cms/pages.ts'),
    path.join(__dirname, '../src/pages/api/cms/changes.ts'),
    path.join(__dirname, '../src/pages/admin/[...all].astro')
];

console.log('[Prebuild] Setting prerender = true for production build...');

files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');

        if (filePath.includes('[...all].astro')) {
            content = content.replace(
                /export const prerender = false;/g,
                'export const prerender = true;\nexport function getStaticPaths() { return [{ params: { all: undefined } }]; }'
            );
        } else {
            content = content.replace(
                /export const prerender = false;/g,
                'export const prerender = true;'
            );
        }

        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[Prebuild] Updated ${path.basename(filePath)}`);
    }
});

console.log('[Prebuild] Done!');
