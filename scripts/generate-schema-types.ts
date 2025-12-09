
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

function parseSchemaFile(filePath: string): SchemaDefinition[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
    );

    const schemas: SchemaDefinition[] = [];

    function visit(node: ts.Node) {
        if (ts.isVariableStatement(node)) {
            const declarationList = node.declarationList;
            for (const declaration of declarationList.declarations) {
                if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
                    const init = declaration.initializer;
                    // Case 1: Direct Array Literal
                    if (ts.isArrayLiteralExpression(init)) {
                        const varName = declaration.name.getText();
                        if (varName.endsWith('Schema')) {
                            console.log(`Found direct array schema: ${varName}`);
                            const fields = parseFields(init);
                            schemas.push({ name: varName, fields });
                        }
                    }
                    // Case 2: createSchema('Name', [ ... ])
                    else if (ts.isCallExpression(init)) {
                        let isCreateSchema = false;
                        // Simplistic check for createSchema identifier
                        if (ts.isIdentifier(init.expression) && init.expression.text === 'createSchema') {
                            isCreateSchema = true;
                        }
                        // Also handle references? For now stick to strict name check.

                        if (isCreateSchema && init.arguments.length >= 2) {
                            // 2nd argument is the array
                            const arg2 = init.arguments[1];
                            if (ts.isArrayLiteralExpression(arg2)) {
                                const varName = declaration.name.getText();
                                console.log(`Found createSchema call: ${varName}`);
                                const fields = parseFields(arg2);
                                schemas.push({ name: varName, fields });
                            }
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return schemas;
}

function parseFields(arrayLiteral: ts.ArrayLiteralExpression): FieldDefinition[] {
    const fields: FieldDefinition[] = [];

    arrayLiteral.elements.forEach(element => {
        if (ts.isCallExpression(element)) {
            parseFieldCall(element, fields);
        } else if (ts.isPropertyAccessExpression(element)) {
            // Chained call result, often we see the end of chain
            if (ts.isCallExpression(element.expression)) {
                parseFieldCall(element.expression, fields);
            }
        }
        // Actually, typescript AST for a chained call `Input().label()`:
        // The top node IS a CallExpression (the call to .label())
        // Its expression is a PropertyAccessExpression (.label)
        // Whose expression is a CallExpression (Input())
    });

    return fields;
}

function parseFieldCall(callExpr: ts.CallExpression, fields: FieldDefinition[]) {
    // We walk up the chain (which is actually down into the nested expressions)
    // `current` starts at the outer-most call

    let current: ts.Expression = callExpr;

    // Safety break
    let depth = 0;
    while (depth < 50) {
        depth++;

        if (ts.isCallExpression(current)) {
            const expr = current.expression;

            if (ts.isPropertyAccessExpression(expr)) {
                // It is a method call like .tab(...) or .label(...)
                const methodName = expr.name.text;

                if (methodName === 'tab' && current.arguments.length >= 2) {
                    const arg2 = current.arguments[1];
                    if (ts.isArrayLiteralExpression(arg2)) {
                        // Recurse into tabs
                        const subFields = parseFields(arg2);
                        fields.push(...subFields);
                    }
                }

                // Move deeper
                current = expr.expression;
            } else if (ts.isIdentifier(expr)) {
                // Root call: Input(...)
                const functionName = expr.text;
                handleFieldOrLayout(functionName, current.arguments, fields);
                break; // Done with this chain
            } else {
                break; // Unknown structure
            }
        } else {
            break;
        }
    }
}

function handleFieldOrLayout(functionName: string, args: ts.NodeArray<ts.Expression>, fields: FieldDefinition[]) {
    if (args.length === 0) return;

    if (ts.isStringLiteral(args[0])) {
        const fieldName = args[0].text;

        // Handle Repeater
        let type = 'any';

        if (functionName === 'Repeater') {
            type = 'any[]';
            // If we wanted to be fancy, we could parse the 2nd arg schema
        } else {
            type = getFieldType(functionName);
        }

        fields.push({ name: fieldName, type });
    }
}

function getFieldType(typeFn: string): string {
    switch (typeFn) {
        case 'Input':
        case 'Textarea':
        case 'RichEditor':
        case 'ColorPicker':
        case 'DateField':
            return 'string';
        case 'Switch':
            return 'boolean';
        case 'Select':
            return 'string';
        case 'FileUpload':
            return 'string';
        default:
            return 'any';
    }
}

// --- Generation ---

function generateDts(schemas: SchemaDefinition[]): string {
    const lines: string[] = [];
    lines.push('// Auto-generated by scripts/generate-schema-types.ts');
    lines.push('');

    for (const schema of schemas) {
        const interfaceName = `${schema.name}Data`;
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
                    const schemas = parseSchemaFile(fullPath);
                    if (schemas.length > 0) {
                        const dtsContent = generateDts(schemas);
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
