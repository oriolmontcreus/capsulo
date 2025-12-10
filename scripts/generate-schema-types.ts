
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

// --- Configuration ---
const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const SCHEMA_EXTENSION = '.schema.tsx';

// --- Types ---
interface FieldDefinition {
    name: string;
    type: string;
    isOptional?: boolean;
    isRequired?: boolean;
    hasDefaultValue?: boolean;
}

interface SchemaDefinition {
    name: string;
    fields: FieldDefinition[];
}

// --- Main Parsing Logic ---

// We need a way to collect extra schemas (like Repeater items) found during parsing
let collectedSchemas: SchemaDefinition[] = [];

function parseSchemaFile(filePath: string): SchemaDefinition[] {
    collectedSchemas = []; // Reset for this file

    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
    );

    function visit(node: ts.Node) {
        if (ts.isVariableStatement(node)) {
            const declarationList = node.declarationList;
            for (const declaration of declarationList.declarations) {
                if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
                    const init = declaration.initializer;
                    // Case 1: Direct Array Literal: export const HeroSchema = [...]
                    if (ts.isArrayLiteralExpression(init)) {
                        const varName = declaration.name.getText();
                        if (varName.endsWith('Schema')) {
                            console.log(`Found direct array schema: ${varName}`);
                            const fields = parseFields(init);
                            collectedSchemas.push({ name: varName, fields });
                        }
                    }
                    // Case 2: createSchema('Name', [ ... ])
                    else if (ts.isCallExpression(init)) {
                        let isCreateSchema = false;
                        // Simplistic check for createSchema identifier
                        if (ts.isIdentifier(init.expression) && init.expression.text === 'createSchema') {
                            isCreateSchema = true;
                        }

                        if (isCreateSchema && init.arguments.length >= 2) {
                            // 2nd argument is the array
                            const arg2 = init.arguments[1];
                            if (ts.isArrayLiteralExpression(arg2)) {
                                const varName = declaration.name.getText();
                                console.log(`Found createSchema call: ${varName}`);
                                const fields = parseFields(arg2);
                                collectedSchemas.push({ name: varName, fields });
                            }
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return collectedSchemas;
}

function parseFields(arrayLiteral: ts.ArrayLiteralExpression): FieldDefinition[] {
    const fields: FieldDefinition[] = [];

    arrayLiteral.elements.forEach(element => {
        if (ts.isCallExpression(element)) {
            parseFieldCall(element, fields);
        } else if (ts.isPropertyAccessExpression(element)) {
            if (ts.isCallExpression(element.expression)) {
                parseFieldCall(element.expression, fields);
            }
        }
    });

    return fields;
}

function parseFieldCall(callExpr: ts.CallExpression, fields: FieldDefinition[]) {
    // We walk up the chain to find the Root call (Input) and any modifiers (.itemName, .tab, etc)

    let current: ts.Expression = callExpr;
    let rootFunctionName = '';
    let rootArgs: ts.NodeArray<ts.Expression> | null = null;

    // Modifiers we care about
    let itemName: string | null = null;
    let subTabFields: FieldDefinition[] = [];
    let isRequired = false;
    let hasDefaultValue = false;

    // Walk the chain "up" (from outermost .method() down to Input())
    let depth = 0;
    while (depth < 50) {
        depth++;

        if (ts.isCallExpression(current)) {
            const expr = current.expression;

            if (ts.isPropertyAccessExpression(expr)) {
                // Method call: .label(), .options(), .itemName()
                const methodName = expr.name.text;

                // Detect .required() modifier
                if (methodName === 'required') {
                    isRequired = true;
                }

                // Detect .defaultValue() modifier
                if (methodName === 'defaultValue') {
                    hasDefaultValue = true;
                }

                // Repeater .itemName('Card')
                if (methodName === 'itemName' && current.arguments.length > 0) {
                    if (ts.isStringLiteral(current.arguments[0])) {
                        itemName = current.arguments[0].text;
                    }
                }

                // Tabs .tab('Name', [ ... ])
                if (methodName === 'tab' && current.arguments.length >= 2) {
                    const arg2 = current.arguments[1];
                    if (ts.isArrayLiteralExpression(arg2)) {
                        const extracted = parseFields(arg2);
                        subTabFields.push(...extracted);
                    }
                }

                // Grid .contains([ ... ])
                if (methodName === 'contains' && current.arguments.length >= 1) {
                    const arg1 = current.arguments[0];
                    if (ts.isArrayLiteralExpression(arg1)) {
                        const extracted = parseFields(arg1);
                        subTabFields.push(...extracted);
                    }
                }

                current = expr.expression;
            } else if (ts.isIdentifier(expr)) {
                // Root call: Input(...)
                rootFunctionName = expr.text;
                rootArgs = current.arguments;
                break;
            } else {
                break;
            }
        } else {
            // Handle unwrapped PropertyAccess (unlikely if we start from CallExpression but possible)
            if (ts.isPropertyAccessExpression(current)) {
                current = current.expression;
            } else {
                break;
            }
        }
    }

    // Ensure we process if we found a root function
    if (rootFunctionName) {
        // Handle Layouts containing fields (Tabs)
        if (subTabFields.length > 0) {
            fields.push(...subTabFields);
        }

        // Handle Fields - check if 1st arg is a string (name)
        if (rootArgs && rootArgs.length > 0 && ts.isStringLiteral(rootArgs[0])) {
            const fieldName = rootArgs[0].text;
            let type = 'any';

            if (rootFunctionName === 'Repeater') {
                // Check if we have 2nd arg (fields array) AND an itemName
                // Note: Repeater(name, [fields])
                if (itemName && rootArgs.length >= 2 && ts.isArrayLiteralExpression(rootArgs[1])) {
                    // Extract sub-schema
                    const subFields = parseFields(rootArgs[1]);
                    const subInterfaceName = `${itemName}Data`; // e.g. CardData

                    // Add to global collected schemas
                    collectedSchemas.push({
                        name: itemName, // Will look for Card -> CardData
                        fields: subFields
                    });

                    type = `${subInterfaceName}[]`;
                } else if (rootArgs.length >= 2 && ts.isArrayLiteralExpression(rootArgs[1])) {
                    // Anonymous repeater?
                    type = 'any[]';
                } else {
                    type = 'any[]';
                }
            } else {
                type = getFieldType(rootFunctionName);
            }

            fields.push({ name: fieldName, type, isRequired, hasDefaultValue });
        }
    }
}

function getFieldType(typeFn: string): string {
    switch (typeFn) {
        case 'Input':
        case 'Textarea':
        case 'RichEditor':
        case 'ColorPicker':
        case 'Select':
        case 'FileUpload':
            return 'string';
        case 'Switch':
            return 'boolean';
        case 'DateField':
            return 'Date';
        default:
            return 'any';
    }
}

// --- Generation ---

function generateDts(schemas: SchemaDefinition[]): string {
    const lines: string[] = [];
    lines.push('// Auto-generated by scripts/generate-schema-types.ts');
    lines.push('');

    const uniqueSchemas = new Set<string>();

    for (const schema of schemas) {
        // Construct interface name. 
        // Logic:
        // - Top level: 'HeroSchema' -> 'HeroSchemaData'
        // - Repeater item: 'Card' -> 'CardData'

        let interfaceName = schema.name;
        if (interfaceName.endsWith('Schema')) {
            interfaceName = `${interfaceName}Data`;
        } else {
            interfaceName = `${interfaceName}Data`;
        }

        if (uniqueSchemas.has(interfaceName)) continue;
        uniqueSchemas.add(interfaceName);

        lines.push(`export interface ${interfaceName} {`);
        for (const field of schema.fields) {
            // Field is required (no ?) if it has .required() OR .defaultValue()
            // This ensures the component can rely on the value being present
            const isOptional = !field.isRequired && !field.hasDefaultValue;
            const optionalMarker = isOptional ? '?' : '';
            lines.push(`    ${field.name}${optionalMarker}: ${field.type};`);
        }
        lines.push('}');
        lines.push('');
    }

    return lines.join('\n');
}

// --- Astro Injection ---

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

    const mainInterfaceName = schemaName.endsWith('Schema')
        ? `${schemaName}Data`
        : `${schemaName}Data`;

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

    // Find all matches and replace only those without the correct generic
    let newContent = '';
    let lastIndex = 0;
    let match2: RegExpExecArray | null;

    while ((match2 = cmsPropsRegex.exec(content)) !== null) {
        const matchStr = match2[0];
        // Check if it already has the correct generic type
        if (matchStr.includes(`<${mainInterfaceName}>`)) {
            continue; // Already correct, skip
        }

        // Replace this occurrence
        newContent += content.slice(lastIndex, match2.index);
        newContent += expectedCall;
        lastIndex = match2.index + matchStr.length;
        modified = true;
    }

    if (lastIndex > 0) {
        newContent += content.slice(lastIndex);
        content = newContent;
    }

    // 6. Update getCMSProps call to include generic type parameter (for completeness)
    const cmsPropsSimpleRegex = /getCMSProps\s*(?:<[^>]*>)?\s*\(/g;
    const expectedSimpleCall = `getCMSProps<${mainInterfaceName}>(`;

    newContent = '';
    lastIndex = 0;
    let match3: RegExpExecArray | null;

    while ((match3 = cmsPropsSimpleRegex.exec(content)) !== null) {
        const matchStr = match3[0];
        // Skip if it's actually getCMSPropsWithDefaults
        const beforeMatch = content.slice(Math.max(0, match3.index - 20), match3.index);
        if (beforeMatch.includes('getCMSPropsWithDefaults')) {
            continue;
        }
        // Check if it already has the correct generic type
        if (matchStr.includes(`<${mainInterfaceName}>`)) {
            continue; // Already correct, skip
        }

        // Replace this occurrence
        newContent += content.slice(lastIndex, match3.index);
        newContent += expectedSimpleCall;
        lastIndex = match3.index + matchStr.length;
        modified = true;
    }

    if (lastIndex > 0) {
        newContent += content.slice(lastIndex);
        content = newContent;
    }

    if (modified) {
        fs.writeFileSync(astroPath, content);
        console.log(`Updated Astro component for: ${astroFile}`);
    }
}

// --- Run ---

function main() {
    console.log('Scanning for schemas...');

    function walkDir(dir: string) {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (fullPath.endsWith(SCHEMA_EXTENSION)) {
                console.log(`Parsing ${file}...`);
                try {
                    const foundSchemas = parseSchemaFile(fullPath);
                    if (foundSchemas.length > 0) {
                        const dtsContent = generateDts(foundSchemas);
                        const dtsPath = fullPath.replace(/\.tsx$/, '.d.ts');
                        const dtsFileName = path.basename(dtsPath);

                        fs.writeFileSync(dtsPath, dtsContent);
                        console.log(`Generated ${dtsPath}`);

                        // Try to update Astro component
                        const mainSchema = foundSchemas.find(s => s.name.endsWith('Schema')) || foundSchemas[0];
                        updateAstroComponent(dir, mainSchema.name, dtsFileName, foundSchemas);
                    }
                } catch (e) {
                    console.error(`Error parsing ${file}:`, e);
                }
            }
        }
    }

    walkDir(SRC_DIR);
}

main();
