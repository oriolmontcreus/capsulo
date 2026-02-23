import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colors, intro, outro, step, spinner, success, warn, info, error } from './lib/cli.js';
import { parseSchemaFile, generateDts, type SchemaDefinition } from './lib/schema-parser.js';

// --- Configuration ---
const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const SCHEMA_EXTENSION = '.schema.tsx';

// --- Astro Injection ---

/**
 * Helper function to replace function calls with generic type parameters
 * @param content - The content to search and replace in
 * @param regex - The regex pattern to match function calls
 * @param expectedCall - The expected function call with correct generic
 * @param mainInterfaceName - The interface name to check for in generics
 * @param skipPattern - Optional pattern to skip (e.g., to avoid matching getCMSPropsWithDefaults when looking for getCMSProps)
 * @returns Object with updated content and modified flag
 */
function replaceGenericCall(
    content: string,
    regex: RegExp,
    expectedCall: string,
    mainInterfaceName: string,
    skipPattern?: string
): { content: string; modified: boolean } {
    let newContent = '';
    let lastIndex = 0;
    let modified = false;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const matchStr = match[0];

        // Skip if we have a skipPattern and it matches
        if (skipPattern) {
            const beforeMatch = content.slice(Math.max(0, match.index - 20), match.index);
            if (beforeMatch.includes(skipPattern)) {
                continue;
            }
        }

        // Check if it already has the correct generic type
        if (matchStr.includes(`<${mainInterfaceName}>`)) {
            continue; // Already correct, skip
        }

        // Replace this occurrence
        newContent += content.slice(lastIndex, match.index);
        newContent += expectedCall;
        lastIndex = match.index + matchStr.length;
        modified = true;
    }

    if (lastIndex > 0) {
        newContent += content.slice(lastIndex);
        content = newContent;
    }

    return { content, modified };
}

function updateAstroComponent(dir: string, schemaName: string, dtsFileName: string, allSchemas: SchemaDefinition[]) {
    // 1. Find matching .astro file
    const baseName = schemaName.replace('Schema', ''); // Hero
    const files = fs.readdirSync(dir);

    // Try exact matches first
    let astroFile = files.find(f => f === `${baseName}.astro`); // Hero.astro
    if (!astroFile) {
        astroFile = files.find(f => f.toLowerCase() === `${baseName.toLowerCase()}.astro`);
    }

    if (!astroFile) return;

    const astroPath = path.join(dir, astroFile);
    let content = fs.readFileSync(astroPath, 'utf-8');
    let modified = false;

    // 2. Prepare Import - collect all type names
    const typeNames: string[] = [];
    for (const schema of allSchemas) {
        let typeName = schema.name;
        if (typeName.endsWith('Schema')) {
            typeName = `${typeName}Data`; // HeroSchemaData
        } else {
            typeName = `${typeName}Data`; // CardData
        }
        typeNames.push(typeName);
    }

    const mainInterfaceName = `${schemaName}Data`;

    const importPath = `./${dtsFileName.replace('.ts', '')}`; // ./hero.schema.d
    const importStatement = `import type { ${typeNames.join(', ')} } from '${importPath}';`;

    // 3. Inject or Update Import
    const existingImportRegex = new RegExp(`import\\s+type\\s*\\{[^}]*\\}\\s*from\\s*['"]${importPath.replace(/\./g, '\\.')}['"];?`);
    const existingImportMatch = content.match(existingImportRegex);

    if (existingImportMatch) {
        // Update existing import with all types
        content = content.replace(existingImportRegex, importStatement);
        modified = true;
    } else if (!content.includes(importPath)) {
        if (content.startsWith('---')) {
            // Find insertion point - after last import or at start of frontmatter
            const importsMatch = content.match(/import .*?;/g);
            if (importsMatch) {
                const lastImport = importsMatch[importsMatch.length - 1];
                const lastImportIdx = content.lastIndexOf(lastImport);
                const insertPos = lastImportIdx + lastImport.length;
                content = content.slice(0, insertPos) + '\n' + importStatement + content.slice(insertPos);
            } else {
                // No imports, just put it after ---
                content = content.slice(0, 3) + '\n' + importStatement + content.slice(3);
            }
            modified = true;
        }
    }

    // 4. Remove ": any" type annotations in .map() calls to let TypeScript infer proper types
    // Match patterns like: .map((item: any) => or .map((card: any) =>
    const mapAnyRegex = /\.map\(\s*\((\w+):\s*any\)\s*=>/g;
    if (mapAnyRegex.test(content)) {
        content = content.replace(mapAnyRegex, '.map(($1) =>');
        modified = true;
    }

    // 4. Update Props Interface
    // Use brace counting to find the full block, generally safer
    const startRegex = /export\s+interface\s+Props\s*\{/;
    const propsMatch = content.match(startRegex);

    if (propsMatch) {
        const startIndex = propsMatch.index!;
        const openBraceIndex = startIndex + propsMatch[0].length - 1; // Index of '{' character inside match

        let braceCount = 0;
        let endIndex = -1;

        for (let i = openBraceIndex; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            else if (content[i] === '}') braceCount--;

            if (braceCount === 0) {
                endIndex = i + 1; // Include the closing '}'
                break;
            }
        }

        if (endIndex !== -1) {
            const existingBlock = content.slice(startIndex, endIndex);
            // Only update if not already extending the schema
            if (!existingBlock.includes(`extends ${mainInterfaceName}`)) {
                const newPropsDef = `export interface Props extends ${mainInterfaceName} {}`;
                content = content.slice(0, startIndex) + newPropsDef + content.slice(endIndex);
                modified = true;
            }
        }
    }

    // 5. Update getCMSPropsWithDefaults call to include generic type parameter
    // Match: getCMSPropsWithDefaults(import.meta.url, Astro.props) or getCMSPropsWithDefaults(import.meta.url)
    // Replace with: getCMSPropsWithDefaults<InterfaceName>(...)
    const cmsPropsRegex = /getCMSPropsWithDefaults\s*(?:<[^>]*>)?\s*\(/g;
    const expectedCall = `getCMSPropsWithDefaults<${mainInterfaceName}>(`;

    const result1 = replaceGenericCall(content, cmsPropsRegex, expectedCall, mainInterfaceName);
    content = result1.content;
    if (result1.modified) {
        modified = true;
    }


    // 6. Update getCMSProps call to include generic type parameter (for completeness)
    const cmsPropsSimpleRegex = /getCMSProps\s*(?:<[^>]*>)?\s*\(/g;
    const expectedSimpleCall = `getCMSProps<${mainInterfaceName}>(`;

    const result2 = replaceGenericCall(content, cmsPropsSimpleRegex, expectedSimpleCall, mainInterfaceName, 'getCMSPropsWithDefaults');
    content = result2.content;
    if (result2.modified) {
        modified = true;
    }


    if (modified) {
        fs.writeFileSync(astroPath, content);
        step(`Updated component ${colors.info(astroFile)}`);
    }
}

// --- Run ---

function main() {
    const targetFile = process.argv[2];
    intro('generate-schema-types');

    if (targetFile) {
        step(`Targeting file: ${colors.info(targetFile)}`);
    }

    const s = spinner();
    s.start('Scanning for schemas...');

    let schemaCount = 0;
    let generatedCount = 0;

    function processSchemaFile(fullPath: string, dir: string) {
        schemaCount++;
        try {
            const foundSchemas = parseSchemaFile(fullPath);
            if (foundSchemas.length > 0) {
                const dtsContent = generateDts(foundSchemas);
                const dtsPath = fullPath.replace(/\.tsx$/, '.d.ts');
                const dtsFileName = path.basename(dtsPath);

                fs.writeFileSync(dtsPath, dtsContent);
                generatedCount++;

                // Try to update Astro component
                const mainSchema = foundSchemas.find(s => s.name.endsWith('Schema')) || foundSchemas[0];
                updateAstroComponent(dir, mainSchema.name, dtsFileName, foundSchemas);
            }
        } catch (e) {
            error(`Error parsing ${colors.info(path.basename(fullPath))}: ${e}`);
        }
    }

    function walkDir(dir: string) {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (fullPath.endsWith(SCHEMA_EXTENSION)) {
                processSchemaFile(fullPath, dir);
            }
        }
    }

    if (targetFile) {
        const fullPath = path.resolve(process.cwd(), targetFile);
        if (fs.existsSync(fullPath) && fullPath.endsWith(SCHEMA_EXTENSION)) {
            processSchemaFile(fullPath, path.dirname(fullPath));
        } else {
            s.stop(colors.error('Error: Specified file does not exist or is not a schema file.'));
            process.exit(1);
        }
    } else {
        walkDir(SRC_DIR);
    }

    s.stop('Schema scan complete');

    if (generatedCount > 0) {
        success(`Generated ${colors.info(String(generatedCount))} type definition file(s)`);
    } else if (schemaCount === 0) {
        warn('No schema files found');
    } else {
        info('No new types generated');
    }

    outro('Done!');
    process.exit(0);
}

main();
