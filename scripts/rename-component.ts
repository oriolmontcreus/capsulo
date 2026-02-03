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

    // Attempt to find the "old" Pascal name by looking at common file names in the folder
    const oldDir = path.join(baseDir, oldKebabName);
    const oldFiles = await fs.readdir(oldDir);

    // Find the main component file to get the correct Pascal casing if possible
    let oldPascalName = oldKebabName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    const mainFile = oldFiles.find(f =>
        (f.endsWith('.astro') || f.endsWith('.tsx') || f.endsWith('.jsx') || f.endsWith('.svelte') || f.endsWith('.vue')) &&
        !f.includes('.schema')
    );
    if (mainFile) {
        oldPascalName = path.basename(mainFile, path.extname(mainFile));
    }

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
    s.start('Preparing rename...');

    // 1. Rename files inside FIRST while old directory structure is there (to avoid confusion)
    // Actually, moving the directory first is usually safer for fs-promises.
    await fs.rename(oldDir, newDir);

    s.message('Renaming component files...');

    const files = await fs.readdir(newDir);
    for (const file of files) {
        const oldFilePath = path.join(newDir, file);
        let newFile = file;

        if (file.toLowerCase().includes(oldKebabName.toLowerCase())) {
            newFile = file.replaceAll(oldKebabName, newKebabName);
            newFile = newFile.replaceAll(oldPascalName, newPascalName);
        } else if (file.startsWith(oldPascalName)) {
            newFile = file.replaceAll(oldPascalName, newPascalName);
        }

        const newFilePath = path.join(newDir, newFile);
        if (oldFilePath !== newFilePath) {
            await fs.rename(oldFilePath, newFilePath);
        }

        // 3. Update file CONTENT inside the component folder
        if (['.tsx', '.jsx', '.astro', '.ts', '.svelte', '.vue'].some(ext => newFile.endsWith(ext))) {
            let content = await fs.readFile(newFilePath, 'utf-8');
            content = content.replaceAll(oldPascalName, newPascalName);
            content = content.replaceAll(oldKebabName, newKebabName);
            await fs.writeFile(newFilePath, content);
        }
    }

    s.message('Updating global usages and imports...');

    // 4. Update GLOBAL usages in src
    await updateGlobalUsages(oldKebabName, newKebabName, oldPascalName, newPascalName);

    s.message('Refreshing types...');

    // 5. Run type generation for the NEW component name
    const newSchemaPath = path.join(newDir, `${newKebabName}.schema.tsx`);
    const schemaFileRelative = path.relative(process.cwd(), newSchemaPath);

    try {
        await execAsync(`npx tsx scripts/generate-schema-types.ts ${schemaFileRelative}`);
    } catch (error) {
        // Silently continue
    }

    s.stop(colors.success(`Successfully renamed ${colors.info(oldKebabName)} (${colors.info(oldPascalName)}) to ${colors.info(newKebabName)} (${colors.info(newPascalName)})`));
    outro('Done!');
}

async function updateGlobalUsages(oldKebab: string, newKebab: string, oldPascal: string, newPascal: string) {
    const srcDir = path.resolve(process.cwd(), 'src');

    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (fullPath.includes(`components${path.sep}capsulo`)) continue;
                await walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (['.astro', '.tsx', '.jsx', '.ts', '.svelte', '.vue'].includes(ext)) {
                    let content = await fs.readFile(fullPath, 'utf-8');
                    let modified = false;

                    // 1. Replace import paths with filename included
                    // Matches: '@/components/capsulo/hero/Hero.astro' or '@/components/capsulo/hero/hero.schema'
                    const pathRegex = new RegExp(`@/components/capsulo/${oldKebab}/`, 'g');
                    if (pathRegex.test(content)) {
                        content = content.replace(pathRegex, `@/components/capsulo/${newKebab}/`);
                        // Also replace the filename part if it was PascalCase
                        content = content.replaceAll(`${oldKebab}/`, `${newKebab}/`); // redundant but safe
                        content = content.replaceAll(`${oldPascal}.`, `${newPascal}.`);
                        modified = true;
                    }

                    // 2. Replace Component tags and identifiers in imports
                    // Matches: <Hero, </Hero>, {Hero}, import Hero from, type HeroSchemaData
                    const identifierPatterns = [
                        { from: `<${oldPascal}`, to: `<${newPascal}` },
                        { from: `</${oldPascal}>`, to: `</${newPascal}>` },
                        { from: `{${oldPascal}}`, to: `{${newPascal}}` },
                        { from: `import ${oldPascal}`, to: `import ${newPascal}` },
                        { from: `type ${oldPascal}`, to: `type ${newPascal}` },
                        { from: `export interface ${oldPascal}`, to: `export interface ${newPascal}` },
                    ];

                    for (const pattern of identifierPatterns) {
                        if (content.includes(pattern.from)) {
                            content = content.replaceAll(pattern.from, pattern.to);
                            modified = true;
                        }
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
