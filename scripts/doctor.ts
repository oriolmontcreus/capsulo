import { intro, outro, colors, p, step, success, warn, info } from './lib/cli.js';
import path from 'path';
import fs from 'fs/promises';

async function main() {
    intro('Capsulo Doctor Audit');

    await runDoctor();

    outro('Doctor audit complete.');
}

async function runDoctor() {
    step('Running Capsulo Health Check...');
    const baseDir = path.resolve(process.cwd(), 'src/components/capsulo');

    try {
        const folders = await fs.readdir(baseDir, { withFileTypes: true });

        const issues: { folderName: string, type: 'missing_schema' | 'missing_types' | 'missing_component' | 'empty_folder', path: string }[] = [];
        const emptyFolders: string[] = [];

        for (const folder of folders) {
            if (!folder.isDirectory()) continue;

            const folderName = folder.name;
            const dir = path.join(baseDir, folderName);
            const files = await fs.readdir(dir);

            // Filter out system files like .DS_Store
            const realFiles = files.filter(f => !f.startsWith('.'));

            if (realFiles.length === 0) {
                issues.push({ folderName, type: 'empty_folder', path: dir });
                emptyFolders.push(folderName);
                continue;
            }

            // 1. Check for schema
            if (!files.includes(`${folderName}.schema.tsx`)) {
                issues.push({ folderName, type: 'missing_schema', path: dir });
            }

            // 2. Check for type def
            if (!files.includes(`${folderName}.schema.d.ts`)) {
                issues.push({ folderName, type: 'missing_types', path: dir });
            }

            // 3. Check for component file
            const hasComponent = files.some(f => ['.astro', '.tsx', '.jsx', '.svelte', '.vue'].some(ext => f.endsWith(ext)));
            if (!hasComponent) {
                issues.push({ folderName, type: 'missing_component', path: dir });
            }
        }

        if (issues.length === 0) {
            success('Everything looks perfect! Your CMS is healthy.');
            return;
        }

        // Display issues
        for (const issue of issues) {
            switch (issue.type) {
                case 'empty_folder':
                    warn(`[${issue.folderName}] ${colors.dim('Folder is empty (likely a deleted component).')}`);
                    break;
                case 'missing_schema':
                    warn(`[${issue.folderName}] Missing ${issue.folderName}.schema.tsx`);
                    break;
                case 'missing_types':
                    warn(`[${issue.folderName}] Missing ${issue.folderName}.schema.d.ts ${colors.dim('(Run "npm run types" to fix)')}`);
                    break;
                case 'missing_component':
                    warn(`[${issue.folderName}] No frontend component file found (.astro, .tsx, etc)`);
                    break;
            }
        }

        info(`Found ${issues.length} potential consistency issues.`);

        // Propose changes for empty folders
        if (emptyFolders.length > 0) {
            const shouldWipe = await p.confirm({
                message: `Found ${emptyFolders.length} empty folders. Would you like to wipe them?`,
                initialValue: false,
            });

            if (p.isCancel(shouldWipe)) return;

            if (shouldWipe) {
                const s = p.spinner();
                s.start('Wiping empty folders...');
                for (const folderName of emptyFolders) {
                    const dir = path.join(baseDir, folderName);
                    await fs.rm(dir, { recursive: true, force: true });
                }
                s.stop('Empty folders wiped successfully!');
            }
        }

        // Propose running types if missing types
        const missingTypes = issues.filter(i => i.type === 'missing_types');
        if (missingTypes.length > 0) {
            const shouldRunTypes = await p.confirm({
                message: `Some components are missing type definitions. Run type generation now?`,
                initialValue: true,
            });

            if (p.isCancel(shouldRunTypes)) return;

            if (shouldRunTypes) {
                const { spawn } = await import('child_process');
                await new Promise<void>((resolve, reject) => {
                    const child = spawn('npx', ['tsx', 'scripts/generate-schema-types.ts'], {
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
        }

    } catch (err) {
        p.log.error(`Doctor failed: ${err}`);
    }
}

main().catch(console.error);
