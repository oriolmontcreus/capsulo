import path from 'path';
import fs from 'fs/promises';
import { intro, outro, spinner, colors, p } from './lib/cli.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
    intro('Rename CMS Component');

    const baseDir = path.resolve(process.cwd(), 'src/components/capsulo');
    const folders = await fs.readdir(baseDir, { withFileTypes: true });
    const componentFolders = folders.filter(f => f.isDirectory()).map(f => f.name);

    if (componentFolders.length === 0) {
        p.log.error('No components found in src/components/capsulo');
        return;
    }

    const oldKebabName = await p.select({
        message: 'Which component do you want to rename?',
        options: componentFolders.map(name => ({ value: name, label: name })),
    });

    if (typeof oldKebabName !== 'string') return;

    const newPascalName = await p.text({
        message: 'What is the new name (PascalCase)?',
        placeholder: 'e.g. HeroSection, ContactForm',
        validate(value: string) {
            if (value.length === 0) return 'Name is required!';
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) return 'Name must be PascalCase';
        },
    });

    if (typeof newPascalName !== 'string') return;

    const newKebabName = newPascalName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // Try to guess old Pascal Name if it's not strictly formatted
    // We'll read the schema file if it exists to get the actual name from createSchema
    let oldPascalName = oldKebabName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');

    const oldDir = path.join(baseDir, oldKebabName);
    const newDir = path.join(baseDir, newKebabName);

    if (oldKebabName === newKebabName) {
        p.log.warn('Name is the same, skipping.');
        return;
    }

    // Check if target exists
    try {
        await fs.access(newDir);
        p.log.error(`Target directory ${newKebabName} already exists!`);
        return;
    } catch {
        // Safe to proceed
    }

    const s = spinner();
    s.start('Renaming files...');

    // 1. Move the directory
    await fs.rename(oldDir, newDir);

    // 2. Rename files inside
    const files = await fs.readdir(newDir);
    for (const file of files) {
        const oldFilePath = path.join(newDir, file);
        let newFile = file;

        // Custom logic for known patterns
        if (file === `${oldKebabName}.schema.tsx`) {
            newFile = `${newKebabName}.schema.tsx`;
        } else if (file === `${oldKebabName}.schema.d.ts`) {
            newFile = `${newKebabName}.schema.d.ts`;
        } else if (file.toLowerCase().includes(oldKebabName.toLowerCase())) {
            // covers Hero.astro, hero.schema.tsx, etc.
            newFile = file.replaceAll(oldKebabName, newKebabName);
            // also try to replace Pascal case if it was capitalized (like Hero.astro)
            newFile = newFile.replaceAll(oldPascalName, newPascalName);
        }

        const newFilePath = path.join(newDir, newFile);
        if (oldFilePath !== newFilePath) {
            await fs.rename(oldFilePath, newFilePath);
        }

        // 3. Update file CONTENT inside the component folder
        if (newFile.endsWith('.tsx') || newFile.endsWith('.astro') || newFile.endsWith('.ts')) {
            let content = await fs.readFile(newFilePath, 'utf-8');
            content = content.replaceAll(oldPascalName, newPascalName);
            content = content.replaceAll(oldKebabName, newKebabName);
            await fs.writeFile(newFilePath, content);
        }
    }

    s.message('Updating global imports...');

    // 4. Update GLOBAL usages in src
    await updateGlobalUsages(oldKebabName, newKebabName, oldPascalName, newPascalName);

    s.message('Re-generating types...');

    // 5. Run type generation for the NEW component name
    const newSchemaPath = path.join(newDir, `${newKebabName}.schema.tsx`);
    const schemaFileRelative = path.relative(process.cwd(), newSchemaPath);

    try {
        await execAsync(`npx tsx scripts/generate-schema-types.ts ${schemaFileRelative}`);
    } catch (error) {
        // Silently continue, generate-schema-types usually logs its own errors
    }

    s.stop(colors.success(`Successfully renamed ${oldKebabName} to ${newKebabName}`));
    outro('Done!');
}

async function updateGlobalUsages(oldKebab: string, newKebab: string, oldPascal: string, newPascal: string) {
    const srcDir = path.resolve(process.cwd(), 'src');

    // Patterns to look for
    const oldImportPath = `@/components/capsulo/${oldKebab}/`;
    const newImportPath = `@/components/capsulo/${newKebab}/`;

    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip the components/capsulo folder as we already handled it
                if (fullPath.includes(`components${path.sep}capsulo`)) continue;
                await walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (['.astro', '.tsx', '.ts', '.svelte', '.vue'].includes(ext)) {
                    let content = await fs.readFile(fullPath, 'utf-8');
                    let modified = false;

                    // Replace import paths
                    if (content.includes(oldImportPath)) {
                        content = content.replaceAll(oldImportPath, newImportPath);
                        modified = true;
                    }

                    // Replace Component tags/usage (PascalCase)
                    // We check for <OldPascal and </OldPascal to be safe
                    if (content.includes(`<${oldPascal}`) || content.includes(`</${oldPascal}>`) || content.includes(`{${oldPascal}}`)) {
                        content = content.replaceAll(`<${oldPascal}`, `<${newPascal}`);
                        content = content.replaceAll(`</${oldPascal}>`, `</${newPascal}>`);
                        content = content.replaceAll(`{${oldPascal}}`, `{${newPascal}}`);
                        modified = true;
                    }

                    if (modified) {
                        await fs.writeFile(fullPath, content);
                    }
                }
            }
        }
    }

    await walk(srcDir);
}

main().catch(console.error);
