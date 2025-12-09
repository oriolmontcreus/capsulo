
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

    // Walk the chain "up" (from outermost .method() down to Input())
    let depth = 0;
    while (depth < 50) {
        depth++;

        if (ts.isCallExpression(current)) {
            const expr = current.expression;

            if (ts.isPropertyAccessExpression(expr)) {
                // Method call: .label(), .options(), .itemName()
                const methodName = expr.name.text;

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

            fields.push({ name: fieldName, type });
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
            lines.push(`    ${field.name}?: ${field.type};`);
        }
        lines.push('}');
        lines.push('');
    }

    return lines.join('\n');
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
                        fs.writeFileSync(dtsPath, dtsContent);
                        console.log(`Generated ${dtsPath}`);
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
