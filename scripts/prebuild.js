import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, outro, success, colors, formatPathSync } from './lib/cli.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files to modify
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

intro('prebuild');

let updatedCount = 0;

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
        success(`Updated ${formatPathSync(filePath)}`);
        updatedCount++;
    }
});

outro(`Set ${colors.info(`prerender = true`)} for ${colors.info(updatedCount)} files`);
