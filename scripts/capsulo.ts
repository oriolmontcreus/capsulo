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
                await runInteractive('scripts/doctor.ts');
                break;
            case 'types':
                await runInteractive('scripts/generate-schema-types.ts');
                outro('Operation complete!');
                break;
        }
    } catch (err) {
        if (err instanceof Error && err.message.includes('Exit code')) {
            // Silently handle exit codes as they usually mean the child process already logged the error or was cancelled
        } else {
            p.log.error(`Error: ${err}`);
        }
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

main().catch(console.error);
