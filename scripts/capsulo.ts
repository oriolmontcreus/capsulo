import { intro, outro, colors, p } from './lib/cli.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    intro('Capsulo CLI Suite');

    const choice = await p.select({
        message: 'What would you like to do?',
        options: [
            { value: 'create', label: 'Create new component', hint: 'npm run make:component' },
            { value: 'rename', label: 'Rename existing component', hint: 'Renames folders and files' },
            { value: 'audit', label: 'Run project audit (Doctor)', hint: 'Check for consistency' },
            { value: 'types', label: 'Regenerate all types', hint: 'npm run types' },
            { value: 'exit', label: 'Exit' },
        ],
    });

    if (!choice || choice === 'exit') {
        outro('Goodbye!');
        return;
    }

    try {
        switch (choice) {
            case 'create':
                await runInteractive('scripts/make-component.ts');
                break;
            case 'rename':
                await runInteractive('scripts/rename-component.ts');
                break;
            case 'audit':
                await runDoctor();
                break;
            case 'types':
                await runInteractive('scripts/generate-schema-types.ts');
                outro('Operation complete!');
                break;
        }
    } catch (err) {
        p.log.error(`Error: ${err}`);
    }
}

function runInteractive(scriptPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn('npx', ['tsx', scriptPath], {
            stdio: 'inherit',
            shell: true
        });

        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Exit code ${code}`));
        });

        child.on('error', reject);
    });
}

/**
 * Basic Doctor implementation to check console consistency
 */
async function runDoctor() {
    p.log.step('Running Capsulo Health Check...');
    const baseDir = path.resolve(process.cwd(), 'src/components/capsulo');
    const folders = await fs.readdir(baseDir, { withFileTypes: true });

    let issues = 0;
    for (const folder of folders) {
        if (!folder.isDirectory()) continue;

        const folderName = folder.name;
        const dir = path.join(baseDir, folderName);
        const files = await fs.readdir(dir);

        // 1. Check for schema
        if (!files.includes(`${folderName}.schema.tsx`)) {
            p.log.warn(`[${folderName}] Missing ${folderName}.schema.tsx`);
            issues++;
        }

        // 2. Check for type def
        if (!files.includes(`${folderName}.schema.d.ts`)) {
            p.log.warn(`[${folderName}] Missing ${folderName}.schema.d.ts (Run types)`);
            issues++;
        }

        // 3. Check for component file
        const hasComponent = files.some(f => f.endsWith('.astro') || f.endsWith('.tsx') || f.endsWith('.svelte') || f.endsWith('.vue'));
        if (!hasComponent) {
            p.log.warn(`[${folderName}] No frontend component file found (.astro, .tsx, etc)`);
            issues++;
        }
    }

    if (issues === 0) {
        p.log.success('Everything looks perfect! Your CMS is healthy.');
    } else {
        p.log.info(`Found ${issues} potential consistency issues.`);
    }

    outro('Doctor audit complete.');
}

// Since we want interactivity, we actually should use spawn or dynamic import 
// But dynamic import only works if scripts export a main.
// For now, let's keep it simple and suggest running commands directly if interactivity fails.

main().catch(console.error);
